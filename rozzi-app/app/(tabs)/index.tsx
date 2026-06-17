
import React, { useState, useEffect, useRef } from 'react';
import { router, useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
  Animated,
  Keyboard,
  RefreshControl,
  Dimensions,
  BackHandler,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useCustomFonts } from '@/hooks/fonts';
import ProfilePicture from '@/components/ProfilePicture';
import API, { authAPI } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { getBlockedUsers } from '@/utils/blockUser';
import { useChat } from '@/contexts/ChatContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ShareBottomSheet from '@/components/ShareBottomSheet';

// Job types that match Django backend
const jobTags = ['All', 'Full-time', 'Part-time', 'One-time', 'Contract'];

// Interface for job post data from Django backend
interface JobPost {
  id: number;
  title: string;
  description: string;
  salary_min?: number;
  salary_max?: number;
  location: string;
  post_type: string;
  job_type: string;
  sector: string;
  experience_level: string;
  shift_timing: string;
  state: string;
  city: string;
  address: string;
  pincode: string;

  custom_fields?: {
    question: string;
    answer: 'yes' | 'no';
  }[];
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    username: string;
    full_name: string;
    profile_picture?: string;
  } | null;
  status: string;
  applicants_count: number;
  is_remote?: boolean;
  gender_preference?: 'any' | 'male' | 'female';
}

export default function HomeScreen() {
  const [fontsLoaded] = useCustomFonts();
  const { colors, colorScheme } = useAppTheme();
  const styles = React.useMemo(() => getStyles(colors, colorScheme), [colors, colorScheme]);
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { conversations } = useChat();
  const [jobPosts, setJobPosts] = useState<JobPost[]>([]);
  const [allJobPosts, setAllJobPosts] = useState<JobPost[]>([]); // Store all posts for smart ranking
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState('All');
  const [expandedPost, setExpandedPost] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOptionsMenu, setShowOptionsMenu] = useState<number | null>(null);

  // Share sheet states
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [sharingPostData, setSharingPostData] = useState<any>(null);
  const [closingJobId, setClosingJobId] = useState<number | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [jobTypeFilter, setJobTypeFilter] = useState<'all' | 'job' | 'employee' | 'both'>('all');
  const [locationFilter, setLocationFilter] = useState<'all' | 'nearby' | 'others'>('all');
  const [followedUsers, setFollowedUsers] = useState<number[]>([]);
  const [userEngagement, setUserEngagement] = useState<{ [key: number]: number }>({});
  const [blockedUsers, setBlockedUsers] = useState<number[]>([]);
  const [appliedJobs, setAppliedJobs] = useState<number[]>([]); // Track job IDs that user has already applied to
  const [refreshing, setRefreshing] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);

  // User location data for smart post ranking
  const [userLocation, setUserLocation] = useState<{
    city?: string;
    state?: string;
    pincode?: string;
    coordinates?: { latitude: number; longitude: number };
  }>({});

  // User preferences for personalized ranking
  const [userPreferences, setUserPreferences] = useState<{
    preferredJobTypes: string[];
    preferredSectors: string[];
    preferredExperienceLevels: string[];
    salaryRange?: { min: number; max: number };
    remotePreference?: boolean;
  }>({
    preferredJobTypes: [],
    preferredSectors: [],
    preferredExperienceLevels: [],
  });

  // Calculate total unread messages
  const totalUnreadMessages = conversations.reduce((total, conversation) => total + conversation.unread_count, 0);

  // Notification count state
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Animation states for dynamic search bar
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchWidthAnim = useRef(new Animated.Value(120)).current;
  const searchHeightAnim = useRef(new Animated.Value(40)).current;
  const searchPaddingAnim = useRef(new Animated.Value(25)).current;
  const searchBorderRadiusAnim = useRef(new Animated.Value(100)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const searchInputRef = useRef<TextInput>(null);

  // Note: Authentication redirect is handled by AuthContext to avoid navigation conflicts

  // Scroll to top function
  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  // Fetch notification count from backend
  const fetchNotificationCount = async () => {
    if (!isAuthenticated) return;

    try {
      const response = await API.get('/notifications/');
      if (response.data) {
        const notifications = Array.isArray(response.data) ? response.data :
          (response.data.results || []);

        const unreadCount = notifications.filter((n: any) => !n.read).length;
        setUnreadNotifications(unreadCount);
      }
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  };

  // Refresh function for pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Refresh job posts without showing skeleton
      await fetchJobs(true);
      // Refresh followed users
      await fetchFollowedUsers();
      // Refresh notification count
      await fetchNotificationCount();
      // Reset search and filters
      setSearchQuery('');
      setSelectedTag('All');
      setJobTypeFilter('all');
      setLocationFilter('all');
      setExpandedPost(null);
      setShowOptionsMenu(null);
      // Reset animated search bar values to fix position after error->content transition
      searchWidthAnim.setValue(120);
      searchHeightAnim.setValue(40);
      searchPaddingAnim.setValue(25);
      searchBorderRadiusAnim.setValue(100);
      setIsSearchFocused(false);
      // Scroll to top after refresh
      setTimeout(() => scrollToTop(), 100);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Animation functions for dynamic search bar
  const animateSearchExpand = () => {
    Animated.parallel([
      Animated.timing(searchWidthAnim, {
        toValue: 200,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(searchHeightAnim, {
        toValue: 48,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(searchPaddingAnim, {
        toValue: 20,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(searchBorderRadiusAnim, {
        toValue: 24,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const animateSearchCollapse = () => {
    Animated.parallel([
      Animated.timing(searchWidthAnim, {
        toValue: 120,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(searchHeightAnim, {
        toValue: 40,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(searchPaddingAnim, {
        toValue: 25,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(searchBorderRadiusAnim, {
        toValue: 100,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    animateSearchExpand();
  };

  const handleSearchBlur = () => {
    setIsSearchFocused(false);
    animateSearchCollapse();
  };

  const handleSearchSubmit = () => {
    Keyboard.dismiss();
    animateSearchCollapse();
    setIsSearchFocused(false);
  };

  // Safe navigation helper to prevent keyboard flickering
  const handleNavigation = (action: () => void) => {
    if (isSearchFocused) {
      Keyboard.dismiss();
      handleSearchBlur();
      searchInputRef.current?.blur();
      // Short delay to let keyboard start dismissing
      setTimeout(() => {
        action();
      }, 50);
    } else {
      action();
    }
  };

  // Handle hardware back button and keyboard hide for search bar
  useEffect(() => {
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        if (isSearchFocused) {
          handleSearchBlur();
          searchInputRef.current?.blur();
        }
      }
    );

    const backAction = () => {
      if (isSearchFocused) {
        Keyboard.dismiss();
        handleSearchBlur();
        searchInputRef.current?.blur();
        return true; // Prevent default back action
      }
      return false; // Let default back action happen
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => {
      keyboardDidHideListener.remove();
      backHandler.remove();
    };
  }, [isSearchFocused]);

  // Fetch jobs and followed users when authenticated
  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        fetchJobs();
        fetchFollowedUsers();
        fetchUserLocation();
        fetchUserPreferences();
        fetchNotificationCount();
      } else {
        // If not authenticated, ensure loading state is cleared to avoid infinite skeleton
        // Auth gate in _layout.tsx handles the redirect to login
        setLoading(false);
      }
    }
  }, [isAuthenticated, isLoading]);

  // Smart post ranking and loading
  useEffect(() => {
    if (allJobPosts.length > 0) {
      rankAndDisplayPosts();
    }
  }, [allJobPosts, userLocation, userPreferences, followedUsers, userEngagement]);

  // Re-rank posts when filters change
  useEffect(() => {
    if (allJobPosts.length > 0) {
      rankAndDisplayPosts();
    }
  }, [selectedTag, jobTypeFilter, locationFilter, searchQuery]);

  // Smart post ranking and display function
  const rankAndDisplayPosts = () => {
    // Create a copy of all posts for ranking
    const postsToRank = [...allJobPosts];
    console.log('🔄 Ranking posts:', postsToRank.length);
    console.log('🔄 Hire posts to rank:', postsToRank.filter(p => p.post_type === 'hire').length);
    console.log('🔄 Looking posts to rank:', postsToRank.filter(p => p.post_type === 'looking').length);

    // SKIP Client-side scoring - trust backend ranking
    // const scoredPosts = postsToRank.map(post => ({
    //   ...post,
    //   score: calculatePostScore(post)
    // }));
    // const rankedPosts = scoredPosts.sort((a, b) => b.score - a.score);

    // Use backend order directly
    // Assign a dummy score based on index to preserve backend ranking order while satisfying type checks
    const rankedPosts = postsToRank.map((p, i) => ({ ...p, score: 10000 - i }));

    // Apply diversity and variety rules
    const finalPosts = applyDiversityRules(rankedPosts);

    console.log('✅ Final posts after ranking:', finalPosts.length);
    console.log('✅ Hire posts after ranking:', finalPosts.filter(p => p.post_type === 'hire').length);
    console.log('✅ Looking posts after ranking:', finalPosts.filter(p => p.post_type === 'looking').length);

    // Update the displayed posts - this will be the base for filtering
    setJobPosts(finalPosts);
  };

  // Apply diversity rules to prevent echo chambers
  const applyDiversityRules = (rankedPosts: any[]): any[] => {
    const finalPosts: any[] = [];
    const userCounts: { [key: number]: number } = {};
    const postTypeCounts: { [key: string]: number } = {};
    const jobTypeCounts: { [key: string]: number } = {};

    // Ensure we have a good mix of post types
    const hirePosts = rankedPosts.filter(p => p.post_type === 'hire');
    const lookingPosts = rankedPosts.filter(p => p.post_type === 'looking');

    console.log('🎯 Hire posts available:', hirePosts.length);
    console.log('🎯 Looking posts available:', lookingPosts.length);

    // Calculate minimum posts to include from each type
    const minHirePosts = Math.min(3, hirePosts.length); // At least 3 hire posts
    const minLookingPosts = Math.min(2, lookingPosts.length); // At least 2 looking posts
    const totalMinPosts = minHirePosts + minLookingPosts;

    console.log('🎯 Minimum hire posts to include:', minHirePosts);
    console.log('🎯 Minimum looking posts to include:', minLookingPosts);

    // First pass: Ensure minimum representation of each post type
    let hirePostsAdded = 0;
    let lookingPostsAdded = 0;

    for (const post of rankedPosts) {
      if (hirePostsAdded < minHirePosts && post.post_type === 'hire') {
        finalPosts.push(post);
        hirePostsAdded++;
        continue;
      }

      if (lookingPostsAdded < minLookingPosts && post.post_type === 'looking') {
        finalPosts.push(post);
        lookingPostsAdded++;
        continue;
      }

      // If we've added minimum posts, break
      if (hirePostsAdded >= minHirePosts && lookingPostsAdded >= minLookingPosts) {
        break;
      }
    }

    console.log('✅ After minimum inclusion - Hire:', hirePostsAdded, 'Looking:', lookingPostsAdded);

    // Second pass: Add remaining posts with diversity rules
    for (const post of rankedPosts) {
      // Skip if already added in first pass
      if (finalPosts.some(fp => fp.id === post.id)) {
        continue;
      }

      // Check user diversity (max 2 posts per user in first 10 posts)
      const userId = post.user?.id;
      if (userId && userCounts[userId] >= 2 && finalPosts.length < 10) {
        continue; // Skip this post to maintain diversity
      }

      // Check content variety - but don't penalize too harshly
      const postType = post.post_type;
      const jobType = post.job_type;

      if (postTypeCounts[postType] >= 6 || jobTypeCounts[jobType] >= 6) {
        // Too many of this type, reduce priority slightly
        post.score *= 0.9; // Less harsh penalty
      }

      // Add post to final list
      finalPosts.push(post);

      // Update counters
      if (userId) userCounts[userId] = (userCounts[userId] || 0) + 1;
      postTypeCounts[postType] = (postTypeCounts[postType] || 0) + 1;
      jobTypeCounts[jobType] = (jobTypeCounts[jobType] || 0) + 1;

      // Limit total posts for performance
      if (finalPosts.length >= 50) {
        break;
      }
    }

    console.log('✅ Final posts after diversity rules:', finalPosts.length);
    console.log('✅ Final hire posts:', finalPosts.filter(p => p.post_type === 'hire').length);
    console.log('✅ Final looking posts:', finalPosts.filter(p => p.post_type === 'looking').length);

    return finalPosts;
  };

  // Refresh feed periodically to keep ranking fresh (like LinkedIn/Instagram)
  useEffect(() => {
    if (!isAuthenticated) return;

    const refreshInterval = setInterval(() => {
      // Recalculate user engagement and refresh feed ranking
      calculateUserEngagement();
      // Refresh notification count
      fetchNotificationCount();
    }, 30 * 60 * 1000); // Refresh every 30 minutes (further reduced)

    return () => clearInterval(refreshInterval);
  }, [isAuthenticated, jobPosts]);

  // Refresh notification count more frequently for real-time updates
  useEffect(() => {
    if (!isAuthenticated) return;

    const notificationInterval = setInterval(() => {
      fetchNotificationCount();
    }, 5 * 60 * 1000); // Refresh every 5 minutes (further reduced)

    return () => clearInterval(notificationInterval);
  }, [isAuthenticated]);



  const fetchJobs = async (isRefreshing = false, retryCount = 0) => {
    if (!isAuthenticated) {
      console.log('Not authenticated, skipping job fetch');
      return;
    }

    if (!isRefreshing) setLoading(true); // Only show skeleton on initial load, not on refresh
    console.log('🚀 fetchJobs started, isAuthenticated:', isAuthenticated, 'retry:', retryCount);

    // Safety timeout — generous to survive Render free-tier cold starts (30-50s)
    const timeoutMs = retryCount === 0 ? 50000 : 55000;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), timeoutMs)
    );

    try {
      console.log('📡 Calling API /jobs/ ...');
      const response: any = await Promise.race([
        API.get('/jobs/'),
        timeoutPromise
      ]);
      console.log('✅ Jobs response received, status:', response.status);

      // Handle different response structures
      let jobsData: JobPost[] = [];
      if (response.data && Array.isArray(response.data)) {
        jobsData = response.data;
      } else if (response.data && Array.isArray(response.data.results)) {
        jobsData = response.data.results;
      } else if (response.data && typeof response.data === 'object') {
        // If it's a single job object, wrap it in an array
        jobsData = [response.data];
      }

      // Filter out closed jobs
      const openJobs = (jobsData || []).filter(job => job.status !== 'Closed');
      console.log('📊 Total open jobs:', openJobs.length);

      setAllJobPosts(openJobs); // Store all posts for smart ranking
      setJobPosts(openJobs);
      setLoading(false);

      // Recalculate user engagement
      setTimeout(() => calculateUserEngagement(), 100);

      // Fetch applied jobs in background
      API.get('/applications/')
        .then(appliedResponse => {
          const appliedJobsData = appliedResponse.data?.results || appliedResponse.data || [];
          const appliedJobIds = appliedJobsData.map((app: any) => app.job?.id || app.job_id).filter(Boolean);
          setAppliedJobs(appliedJobIds);
          console.log('✅ Fetched applied jobs:', appliedJobIds.length);
        })
        .catch(appliedError => {
          console.log('❌ Applied jobs error:', appliedError.message);
          setAppliedJobs([]);
        });

      setError(null);
    } catch (error: any) {
      console.error('Error fetching jobs (retry ' + retryCount + '):', error?.message);

      // Auto-retry once on failure (handles Render cold start waking up)
      if (retryCount < 1) {
        console.log('🔄 Auto-retrying after cold start delay...');
        // Wait 3s then retry — gives server time to fully wake up
        await new Promise(resolve => setTimeout(resolve, 3000));
        return fetchJobs(isRefreshing, retryCount + 1);
      }

      // After retry exhausted, show error
      if (error.request) {
        console.log('Network error - backend might not be running');
        setError('Unable to reach server. The server may be starting up — please try again in a moment.');
        setJobPosts([]);
      } else if (error.response) {
        setError(`Server error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`);
        setJobPosts([]);
      } else {
        setError('An unexpected error occurred while fetching jobs.');
        setJobPosts([]);
      }
    } finally {
      setLoading(false);
    }
  };



  // Fetch user location data from ID card for smart post ranking
  const fetchUserLocation = async () => {
    if (!isAuthenticated || !user) return;

    try {
      // Try to get user's primary ID card for location data
      const idCardResponse = await API.get('/id-cards/');
      if (idCardResponse.status === 200 && idCardResponse.data) {
        const idCards = Array.isArray(idCardResponse.data) ? idCardResponse.data :
          idCardResponse.data.results || [];

        // Find the primary ID card
        const primaryCard = idCards.find((card: any) => card.is_primary) || idCards[0];

        if (primaryCard) {
          setUserLocation({
            city: primaryCard.city,
            state: primaryCard.state,
            pincode: primaryCard.pincode,
            // Note: coordinates would need to be added to ID card model
          });
        }
      }
    } catch (error) {
      console.log('Could not fetch user location from ID card:', error);
      // Continue without location data
    }
  };

  // Fetch user preferences for personalized ranking
  const fetchUserPreferences = async () => {
    if (!isAuthenticated || !user) return;

    try {
      // Try to get user profile for preferences
      const profileResponse = await API.get('/me/');
      if (profileResponse.status === 200 && profileResponse.data) {
        const profile = profileResponse.data;

        // Extract preferences from profile data
        setUserPreferences({
          preferredJobTypes: profile.preferred_job_types || [],
          preferredSectors: profile.preferred_sectors || [],
          preferredExperienceLevels: profile.preferred_experience_levels || [],
          salaryRange: profile.salary_range,
          remotePreference: profile.remote_preference,
        });
      }
    } catch (error) {
      console.log('Could not fetch user preferences:', error);
      // Continue with default preferences
    }
  };

  // Fetch followed users for filtering posts
  const fetchFollowedUsers = async () => {
    if (!isAuthenticated) return;

    try {
      // Get followed users
      const followedResponse = await API.get('/users/followed/');
      if (followedResponse.status === 200 && followedResponse.data) {
        setFollowedUsers(followedResponse.data.followed_users || []);
      }

      // Get blocked users
      try {
        const users = await getBlockedUsers();

        if (users && users.length > 0) {
          // Extract user IDs from the blocked users array
          const userIds = users.map((user: any) =>
            typeof user === 'object' && user.id ? user.id : user
          );
          setBlockedUsers(userIds);
        } else {
          setBlockedUsers([]);
        }
      } catch (blockedError) {
        console.warn('Could not fetch blocked users, continuing without them:', blockedError);
        // Set empty array to prevent undefined errors
        setBlockedUsers([]);
      }

      // Get user engagement data (this can be enhanced later with actual analytics)
      // For now, we'll calculate basic engagement from existing posts
      calculateUserEngagement();

    } catch (error) {
      console.error('Error fetching followed users:', error);
      // If the endpoint doesn't exist yet, we'll handle it gracefully
      setFollowedUsers([]);
      setBlockedUsers([]);
    }
  };

  // Calculate user engagement scores based on their posts' performance
  const calculateUserEngagement = () => {
    const engagement: { [key: number]: number } = {};

    jobPosts.forEach(post => {
      if (post.user?.id) {
        if (!engagement[post.user.id]) {
          engagement[post.user.id] = 0;
        }

        // Calculate engagement based on post performance
        let userScore = 0;

        // Posts with more applicants indicate higher user engagement
        if (post.applicants_count > 0) {
          userScore += post.applicants_count * 5;
        }

        // Users with more posts get higher engagement scores
        userScore += 10;

        // Posts with complete information get higher scores
        if (post.salary_min && post.salary_max) userScore += 15;
        if (post.description && post.description.length > 100) userScore += 10;
        if (post.city && post.state) userScore += 10;

        engagement[post.user.id] += userScore;
      }
    });

    setUserEngagement(engagement);
  };

  // Enhanced post ranking algorithm (Instagram/LinkedIn style)
  const calculatePostScore = (post: JobPost): number => {
    let score = 0;

    // 1. TIME-BASED SCORING (Instagram style freshness)
    const now = new Date();
    const postTime = new Date(post.created_at);
    const hoursSinceCreation = (now.getTime() - postTime.getTime()) / (1000 * 60 * 60);
    const daysSinceCreation = hoursSinceCreation / 24;

    // Exponential time decay (Instagram style)
    const timeDecay = Math.exp(-daysSinceCreation / 7); // 7-day half-life
    score += timeDecay * 200;

    // Freshness boost for very recent posts
    if (hoursSinceCreation < 2) score += 100;      // First 2 hours
    else if (hoursSinceCreation < 6) score += 75;  // First 6 hours
    else if (hoursSinceCreation < 24) score += 50; // First day
    else if (daysSinceCreation < 3) score += 25;   // First 3 days

    // 2. SOCIAL CONNECTION BOOST (LinkedIn style)
    if (post.user?.id && followedUsers.includes(post.user.id)) {
      score += 500; // Massive boost for followed users (highest priority)
    }

    // 3. LOCATION-BASED RELEVANCE (Smart local matching)
    if (userLocation.pincode && post.pincode === userLocation.pincode) {
      score += 300; // Exact pincode match (highest local priority)
    } else if (userLocation.city && post.city === userLocation.city) {
      score += 250; // Same city
    } else if (userLocation.state && post.state === userLocation.state) {
      score += 200; // Same state
    } else if (userLocation.city && post.city &&
      userLocation.city.toLowerCase() === post.city.toLowerCase()) {
      score += 200; // Case-insensitive city match
    } else if (userLocation.state && post.state &&
      userLocation.state.toLowerCase() === post.state.toLowerCase()) {
      score += 150; // Case-insensitive state match
    }

    // 4. ENGAGEMENT METRICS (Instagram style popularity)
    if (post.applicants_count > 0) {
      // Logarithmic scaling to prevent gaming
      const engagementScore = Math.min(Math.log(post.applicants_count + 1) * 40, 200);
      score += engagementScore;
    }

    // 5. CONTENT QUALITY SCORING
    // Description length and quality
    if (post.description) {
      if (post.description.length > 200) score += 40;
      else if (post.description.length > 100) score += 30;
      else if (post.description.length > 50) score += 20;
    }

    // Salary transparency
    if (post.salary_min && post.salary_max) score += 35;
    else if (post.salary_min || post.salary_max) score += 20;

    // Complete location information
    if (post.city && post.state && post.pincode) score += 25;
    else if (post.city && post.state) score += 20;
    else if (post.city || post.state) score += 15;

    // 6. JOB TYPE AND MARKET DEMAND
    if (post.post_type === 'hire') score += 30;      // Hiring posts
    else if (post.post_type === 'looking') score += 25; // Looking posts

    if (post.job_type === 'Full-time') score += 20;
    else if (post.job_type === 'Contract') score += 18;
    else if (post.job_type === 'Part-time') score += 15;
    else if (post.job_type === 'One-time') score += 12;

    // Remote work preference
    if (post.is_remote) score += 30;

    // 6.5. PERSONALIZATION BASED ON USER PREFERENCES
    // Job type preference matching
    if (userPreferences.preferredJobTypes.includes(post.job_type)) {
      score += 50; // Strong preference match
    }

    // Sector preference matching
    if (userPreferences.preferredSectors.includes(post.sector)) {
      score += 40; // Sector preference match
    }

    // Experience level preference matching
    if (userPreferences.preferredExperienceLevels.includes(post.experience_level)) {
      score += 35; // Experience level preference match
    }

    // Salary range preference matching
    if (userPreferences.salaryRange && post.salary_min && post.salary_max) {
      const postAvgSalary = (post.salary_min + post.salary_max) / 2;
      const userMinSalary = userPreferences.salaryRange.min;
      const userMaxSalary = userPreferences.salaryRange.max;

      if (postAvgSalary >= userMinSalary && postAvgSalary <= userMaxSalary) {
        score += 45; // Salary preference match
      } else if (postAvgSalary >= userMinSalary * 0.8 && postAvgSalary <= userMaxSalary * 1.2) {
        score += 25; // Close salary match
      }
    }

    // Remote work preference matching
    if (userPreferences.remotePreference !== undefined) {
      if (userPreferences.remotePreference === post.is_remote) {
        score += 30; // Remote preference match
      }
    }

    // 7. USER REPUTATION AND TRUST
    if (post.user?.id && userEngagement[post.user.id]) {
      const reputationBoost = Math.min(userEngagement[post.user.id] * 3, 100);
      score += reputationBoost;
    }

    // 8. CONTENT RICHNESS
    if (post.custom_fields && post.custom_fields.length > 0) {
      score += post.custom_fields.length * 5; // More custom fields = better
    }

    // 9. SECTOR RELEVANCE
    if (post.sector === 'Professional') score += 20;
    else if (post.sector === 'Local') score += 15;

    // 10. EXPERIENCE LEVEL MATCHING
    if (post.experience_level) {
      if (post.experience_level.includes('Entry') || post.experience_level.includes('Fresher')) {
        score += 15; // Entry level jobs are popular
      } else if (post.experience_level.includes('Senior') || post.experience_level.includes('Lead')) {
        score += 20; // Senior positions get attention
      }
    }

    // 11. SHIFT TIMING PREFERENCE
    if (post.shift_timing === 'Day') score += 15;
    else if (post.shift_timing === 'Night') score += 10;
    else if (post.shift_timing === 'Flexible') score += 20;

    // 12. ANTI-GAMING MEASURES
    // Penalize posts that might be trying to game the system
    if (post.applicants_count > 100) {
      score -= Math.min((post.applicants_count - 100) * 0.5, 50); // Diminishing returns
    }

    // 13. DIVERSITY BOOST (Prevent echo chambers)
    // Boost posts from different users to ensure variety
    const userPostCount = jobPosts.filter(p => p.user?.id === post.user?.id).length;
    if (userPostCount > 3) {
      score -= (userPostCount - 3) * 10; // Penalize users with too many posts
    }

    // 14. CONTENT VARIETY BOOST
    // Boost different types of content to keep feed interesting
    const recentPostTypes = jobPosts.slice(0, 5).map(p => p.post_type);
    const recentJobTypes = jobPosts.slice(0, 5).map(p => p.job_type);

    if (!recentPostTypes.includes(post.post_type)) {
      score += 20; // New post type variety
    }
    if (!recentJobTypes.includes(post.job_type)) {
      score += 15; // New job type variety
    }

    return Math.round(score);
  };

  // Track user interactions to improve future feed ranking
  const trackUserInteraction = (post: JobPost, action: 'view' | 'apply' | 'contact' | 'share') => {
    if (!post.user?.id) return;

    // Update user engagement based on interactions
    setUserEngagement(prev => {
      const newEngagement = { ...prev };
      if (!newEngagement[post.user!.id!]) {
        newEngagement[post.user!.id!] = 0;
      }

      // Different actions have different weights
      switch (action) {
        case 'view':
          newEngagement[post.user!.id!] += 1;
          break;
        case 'apply':
          newEngagement[post.user!.id!] += 10;
          break;
        case 'contact':
          newEngagement[post.user!.id!] += 8;
          break;
        case 'share':
          newEngagement[post.user!.id!] += 5;
          break;
      }

      return newEngagement;
    });
  };

  // Enhanced search with scoring system for better relevance
  const getSearchScore = (post: JobPost, query: string): number => {
    if (!query.trim()) return 0;

    // Clean search term by removing special characters and symbols
    const cleanSearchTerm = query.toLowerCase().trim().replace(/[-_.,!@#$%^&*()+=]/g, ' ');
    const searchTerm = cleanSearchTerm.replace(/\s+/g, ' ').trim();

    if (!searchTerm) return 0;

    let score = 0;

    // Exact matches get highest scores
    if (post.title.toLowerCase() === searchTerm) score += 100;
    if (post.city?.toLowerCase() === searchTerm) score += 90;
    if (post.state?.toLowerCase() === searchTerm) score += 85;
    if (post.pincode === searchTerm) score += 80;

    // Contains matches get good scores
    if (post.title.toLowerCase().includes(searchTerm)) score += 70;
    if (post.description.toLowerCase().includes(searchTerm)) score += 50;
    if (post.location.toLowerCase().includes(searchTerm)) score += 60;
    if (post.city?.toLowerCase().includes(searchTerm)) score += 55;
    if (post.state?.toLowerCase().includes(searchTerm)) score += 50;
    if (post.pincode?.includes(searchTerm)) score += 45;
    if (post.sector?.toLowerCase().includes(searchTerm)) score += 40;
    if (post.job_type?.toLowerCase().includes(searchTerm)) score += 35;
    if (post.experience_level?.toLowerCase().includes(searchTerm)) score += 30;

    // Partial word matches with cleaned words
    const words = searchTerm.split(' ').filter(word => word.length > 2);
    words.forEach(word => {
      if (post.title.toLowerCase().includes(word)) score += 25;
      if (post.description.toLowerCase().includes(word)) score += 15;
      if (post.location.toLowerCase().includes(word)) score += 20;
      if (post.city?.toLowerCase().includes(word)) score += 18;
      if (post.state?.toLowerCase().includes(word)) score += 15;
    });

    // Skills matching (if available in custom fields or other properties)
    // Note: Skills are not directly available in the current JobPost interface
    // This can be enhanced when skills data is available

    return score;
  };

  // Calculate distance between two locations (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Helper function to check if user has already applied to a job
  const hasAppliedToJob = (jobId: number): boolean => {
    return appliedJobs.includes(jobId);
  };




  // Filter posts based on selected tag, search query, job type, and location
  const filteredPosts = (jobPosts || []).filter(post => {
    // Filter out posts from blocked users
    if (post.user?.id && Array.isArray(blockedUsers) && blockedUsers.includes(post.user.id)) {
      return false;
    }

    const matchesTag = selectedTag === 'All' || post.job_type === selectedTag;

    // Enhanced search matching
    let matchesSearch = true;
    let searchScore = 0;

    if (searchQuery.trim()) {
      // Clean the search query to remove symbols
      const cleanQuery = searchQuery.trim().replace(/[-_.,!@#$%^&*()+=]/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanQuery) {
        searchScore = getSearchScore(post, cleanQuery);
        matchesSearch = searchScore > 0; // Show posts with any relevance
      }
    }

    // Job type filter
    let matchesJobType = true;
    if (jobTypeFilter !== 'all') {
      if (jobTypeFilter === 'job') {
        matchesJobType = post.post_type === 'hire';
      } else if (jobTypeFilter === 'employee') {
        matchesJobType = post.post_type === 'looking';
      } else if (jobTypeFilter === 'both') {
        matchesJobType = true; // Show both types
      }
    }

    // Location filter (simplified - you can enhance this with actual location logic)
    let matchesLocation = true;
    if (locationFilter !== 'all') {
      if (locationFilter === 'nearby') {
        // For now, consider posts with city/state as "nearby"
        // You can enhance this with actual GPS coordinates later
        matchesLocation = !!(post.city || post.state);
      } else if (locationFilter === 'others') {
        // Posts without specific city/state
        matchesLocation = !(post.city || post.state);
      }
    }

    return matchesTag && matchesSearch && matchesJobType && matchesLocation;
  }).sort((a, b) => {
    // Use sophisticated scoring algorithm for feed ranking
    const scoreA = calculatePostScore(a);
    const scoreB = calculatePostScore(b);

    // Primary sorting by algorithm score
    if (scoreA !== scoreB) {
      return scoreB - scoreA; // Higher score first
    }

    // Secondary sorting by search relevance when searching
    if (searchQuery.trim()) {
      const cleanQuery = searchQuery.trim().replace(/[-_.,!@#$%^&*()+=]/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanQuery) {
        const searchScoreA = getSearchScore(a, cleanQuery);
        const searchScoreB = getSearchScore(b, cleanQuery);
        return searchScoreB - searchScoreA; // Highest search score first
      }
    }

    // Final fallback: Creation date (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handlePostPress = (postId: number) => {
    setExpandedPost(expandedPost === postId ? null : postId);
    setShowOptionsMenu(null); // Close options menu when expanding/collapsing post

    // Track post view interaction for feed ranking
    const post = jobPosts.find(p => p.id === postId);
    if (post) {
      trackUserInteraction(post, 'view');
    }
  };

  const handleApply = (post: JobPost) => {
    // Check if free user reached the application limit
    const remaining = user?.profile?.remaining_applications ?? 3;
    if (user?.profile?.subscription_plan === 'free' && remaining <= 0) {
      Alert.alert(
        'Daily Limit Reached',
        'You have used your 3 daily job applications on the Free plan. Upgrade to Seeker 29 or Recruiter 99 to unlock unlimited applications!',
        [
          {
            text: 'Upgrade Now',
            onPress: () => router.push('/subscription'),
          },
          {
            text: 'Maybe Later',
            style: 'cancel',
          },
        ]
      );
      return;
    }

    // Navigate to job application screen
    router.push({
      pathname: '/job-application',
      params: {
        jobId: post.id.toString(),
        jobTitle: post.title,
        isLookingPost: 'false',
        posterName: post.user?.full_name || post.user?.username || 'Unknown User'
      }
    });

    // Track user interaction for feed ranking
    trackUserInteraction(post, 'apply');
  };

  const handleContact = (post: JobPost) => {
    // Navigate to hire request screen (same component, different mode)
    router.push({
      pathname: '/job-application',
      params: {
        jobId: post.id.toString(),
        jobTitle: post.title,
        isLookingPost: 'true',
        posterName: post.user?.full_name || post.user?.username || 'Unknown User'
      }
    });

    // Track user interaction for feed ranking
    trackUserInteraction(post, 'contact');
  };

  const formatSalary = (min?: number, max?: number, jobType?: string) => {
    if (!min && !max) return 'Salary not specified';
    const suffix = jobType?.toLowerCase() === 'one-time' ? '' : '/month';
    if (min && max) return `₹${min.toLocaleString()}-${max.toLocaleString()}${suffix}`;
    if (min) return `₹${min.toLocaleString()}${suffix}`;
    if (max) return `₹${max.toLocaleString()}${suffix}`;
    return 'Salary not specified';
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();

      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return 'Recently';
      }

      const diffTime = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      const diffMinutes = Math.floor(diffTime / (1000 * 60));

      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays === 1) return '1 day ago';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
      return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`;
    } catch (error) {
      return 'Recently';
    }
  };

  const handleCloseApplications = async (jobId: number) => {
    try {
      console.log('handleCloseApplications called for job:', jobId);
      setClosingJobId(jobId);

      // Find the post to check if user data exists
      const post = jobPosts.find(p => p.id === jobId);
      const isCreator = post ? isPostCreator(post) : false;

      const message = isCreator
        ? 'Are you sure you want to close applications for this job? Users will no longer be able to apply, and the post will be hidden from the home screen.'
        : `TEST MODE: This would close applications for job ID ${jobId}. ${!post?.user ? '(Post has no user data)' : '(You are not the creator)'}`;

      Alert.alert(
        'Close Applications',
        message,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              setClosingJobId(null);
              setShowOptionsMenu(null);
            },
          },
          {
            text: isCreator ? 'Close Applications' : 'Test Close',
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('Attempting to close job:', jobId);

                if (isCreator) {
                  // Real API call for creator
                  await API.patch(`/jobs/${jobId}/`, { status: 'Closed' });

                  // Update the local state to remove the closed job
                  setJobPosts(prevPosts => prevPosts.filter(post => post.id !== jobId));
                  setShowOptionsMenu(null);
                  setClosingJobId(null);

                  Alert.alert('Success', 'Applications have been closed and the job post is no longer visible to other users.');
                } else {
                  // Test mode for non-creators
                  console.log('Test mode: Would close job', jobId);
                  setShowOptionsMenu(null);
                  setClosingJobId(null);
                  Alert.alert('Test Complete', 'This was a test. In real mode, only job creators can close applications.');
                }
              } catch (error) {
                console.error('Error closing applications:', error);
                Alert.alert('Error', `Failed to close applications: ${(error as any)?.message || 'Unknown error'}`);
                setClosingJobId(null);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error in handleCloseApplications:', error);
      Alert.alert('Error', `Error in close function: ${(error as any)?.message || 'Unknown error'}`);
      setClosingJobId(null);
    }
  };

  const handleSharePost = (post: JobPost) => {
    try {
      console.log('handleSharePost called for job:', post.id);

      // Track share interaction for feed ranking
      trackUserInteraction(post, 'share');

      setSharingPostData({
        id: post.id,
        title: post.title,
        description: post.description,
        creatorName: post.user?.full_name || post.user?.username
      });
      setShareSheetVisible(true);
    } catch (error) {
      console.error('Error sharing post:', error);
      setShowOptionsMenu(null);
    }
  };

  const handleReportPost = (postId: number) => {
    if (!isAuthenticated || !user) {
      Alert.alert('Authentication Required', 'Please log in to report posts.');
      return;
    }

    Alert.alert(
      'Report Post',
      'Are you sure you want to report this post? This will help us maintain a safe and appropriate community.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setShowOptionsMenu(null),
        },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement actual reporting functionality
            console.log('Reporting post:', postId);
            Alert.alert('Report Submitted', 'Thank you for your report. We will review it shortly.');
            setShowOptionsMenu(null);
          },
        },
      ]
    );
  };

  const isPostCreator = (post: JobPost) => {
    // If post doesn't have user info, we can't determine ownership
    if (!post.user || !user) {
      console.log('isPostCreator: Missing user data for post', post.id, {
        hasPostUser: !!post.user,
        hasCurrentUser: !!user
      });
      return false;
    }

    const isCreator = user.id === post.user.id;
    console.log('isPostCreator check for post', post.id, ':', {
      currentUser: { id: user.id, username: user.username },
      postUser: { id: post.user.id, username: post.user.username },
      isCreator
    });
    return isCreator;
  };

  if (!fontsLoaded) {
    return null;
  }



  // Authentication is now handled by ProtectedRoute wrapper

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.brandBackground }]}>
        {/* Top Bar */}
        <View style={[styles.topBar, { backgroundColor: colors.brandBackground, paddingTop: Math.max(insets.top + 6, 30) }]}>
          <View style={styles.leftContainer}>
            <Text style={[styles.appName, { color: '#fff', fontFamily: 'Outfit-ExtraBold' }]}>Rozzi</Text>
          </View>
          <View style={styles.centerContainer}>
            <View style={[styles.searchContainer, { backgroundColor: colors.card, width: 120, height: 40, paddingHorizontal: 25, borderRadius: 100 }]}>
              <Ionicons name="search" size={16} color="#fff" />
              <View style={[styles.searchInput, { backgroundColor: 'transparent', flex: 1, marginLeft: 2 }]} />
            </View>
          </View>
          <View style={styles.rightContainer}>
            <View style={styles.iconButton} />
            <View style={styles.iconButton} />
            <View style={styles.iconButton} />
          </View>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Skeleton Tags */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsContainer} contentContainerStyle={styles.tagsContent}>
            {[1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={[styles.tag, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={{ width: 40, height: 16, backgroundColor: colors.card, borderRadius: 8 }} />
              </View>
            ))}
          </ScrollView>

          {/* Skeleton Job Posts */}
          <View style={[styles.postsContainer, { paddingBottom: 100 + insets.bottom + 20 }]}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={[styles.postCard, { backgroundColor: colors.card }]}>
                {/* Skeleton Header */}
                <View style={styles.postHeader}>
                  <View style={styles.profileSection}>
                    <View style={[styles.profileImage, { backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: 24, width: 48, height: 48 }]} />
                    <View style={styles.profileInfo}>
                      <View style={{ width: 120, height: 16, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: 8, marginBottom: 4 }} />
                      <View style={{ width: 80, height: 16, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: 6 }} />
                    </View>
                  </View>
                  <View style={styles.headerActions}>
                    <View style={{ width: 20, height: 20, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: 10 }} />
                  </View>
                </View>

                {/* Skeleton Job Title */}
                <View style={styles.jobTitleContainer}>
                  <View style={{ width: '80%', height: 20, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: 10, marginBottom: 8 }} />
                  <View style={{ width: '60%', height: 16, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: 8 }} />
                </View>

                {/* Skeleton Job Details */}
                <View style={styles.jobDetailsContainer}>
                  <View style={styles.detailRow}>
                    <View style={styles.inlineDetailItem}>
                      <View style={{ width: 16, height: 16, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: 8 }} />
                      <View style={{ width: '70%', height: 14, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: 7 }} />
                    </View>
                    <View style={styles.inlineDetailItem}>
                      <View style={{ width: 16, height: 16, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: 8 }} />
                      <View style={{ width: '70%', height: 14, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: 7 }} />
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <View style={styles.inlineDetailItem}>
                      <View style={{ width: 16, height: 16, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: 8 }} />
                      <View style={{ width: '70%', height: 14, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: 7 }} />
                    </View>
                    <View style={styles.inlineDetailItem}>
                      <View style={{ width: 16, height: 16, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: 8 }} />
                      <View style={{ width: '70%', height: 14, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: 7 }} />
                    </View>
                  </View>
                </View>

                {/* Skeleton Description */}
                <View style={{ marginBottom: 8 }}>
                  <View style={{ width: '100%', height: 14, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: 7, marginBottom: 6 }} />
                  <View style={{ width: '85%', height: 14, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: 7 }} />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Skeleton Bottom Navigation */}
        <View style={styles.bottomNavContainer}>
          <View style={styles.bottomNavCapsule}>
            <View style={[styles.navItem, styles.activeNavItem]} />
            <View style={[styles.postButton, { backgroundColor: colors.cardAlt }]} />
            <View style={styles.navItem} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.brandBackground }]}>
      {/* Top Bar - Same color as container */}
      <View style={[styles.topBar, { backgroundColor: colors.brandBackground, paddingTop: Math.max(insets.top + 6, 30) }]}>
        <View style={styles.leftContainer}>
          <Text style={[styles.appName, { color: colorScheme === 'dark' ? '#fff' : colors.primary, fontFamily: 'Outfit-ExtraBold' }]}>Rozzi</Text>
        </View>

        <Animated.View
          style={[
            styles.centerContainer,
            {
              transform: [{ scale: isSearchFocused ? 1.02 : 1 }],
            }
          ]}
        >
          <Animated.View
            style={[
              styles.searchContainer,
              {
                backgroundColor: colorScheme === 'dark'
                  ? (isSearchFocused ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.2)')
                  : (isSearchFocused ? '#ffffff' : 'rgba(0, 0, 0, 0.05)'),
                width: searchWidthAnim,
                height: searchHeightAnim,
                paddingHorizontal: searchPaddingAnim,
                borderRadius: searchBorderRadiusAnim,
                shadowColor: isSearchFocused ? '#000' : 'transparent',
                shadowOffset: { width: 0, height: isSearchFocused ? 4 : 0 },
                shadowOpacity: isSearchFocused ? 0.15 : 0,
                shadowRadius: isSearchFocused ? 8 : 0,
                elevation: isSearchFocused ? 8 : 0,
                borderWidth: isSearchFocused ? 1 : 0,
                borderColor: colorScheme === 'dark'
                  ? (isSearchFocused ? 'rgba(255, 255, 255, 0.3)' : 'transparent')
                  : (isSearchFocused ? colors.primary : 'transparent'),
              }
            ]}
          >
            <Animated.View style={{ transform: [{ scale: isSearchFocused ? 1.1 : 1 }], justifyContent: 'center' }}>
              <Ionicons
                name="search"
                size={isSearchFocused ? 18 : 16}
                color={colorScheme === 'dark' ? '#fff' : (isSearchFocused ? colors.primary : colors.textSecondary)}
              />
            </Animated.View>
            <TextInput
              ref={searchInputRef}
              style={[
                styles.searchInput,
                {
                  color: colorScheme === 'dark' ? '#fff' : colors.text,
                  fontSize: isSearchFocused ? 16 : 14,
                  fontWeight: isSearchFocused ? '500' : '400',
                  paddingVertical: 0,
                  textAlignVertical: 'center',
                }
              ]}
              placeholder="Search jobs..."
              placeholderTextColor={colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.45)'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
              blurOnSubmit={true}
            />
          </Animated.View>
        </Animated.View>

        <View style={styles.rightContainer}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => handleNavigation(() => router.push('/find-users'))}
          >
            <Ionicons name="person-add-outline" size={25} color={colorScheme === 'dark' ? '#fff' : colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => handleNavigation(() => setShowFilterModal(true))}
          >
            <Ionicons name="filter" size={25} color={colorScheme === 'dark' ? '#fff' : colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => handleNavigation(() => router.push('/inbox'))}
          >
            <Ionicons name="mail-outline" size={25} color={colorScheme === 'dark' ? '#fff' : colors.primary} />
            {/* Message badge (top right) */}
            {totalUnreadMessages > 0 && (
              <View style={styles.messageBadge}>
                <Text style={styles.messageBadgeText}>{totalUnreadMessages}</Text>
              </View>
            )}
            {/* Notification badge (bottom right) */}
            {unreadNotifications > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadNotifications}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <View style={[styles.errorCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[
              styles.errorIconContainer, 
              { backgroundColor: colorScheme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)' }
            ]}>
              <Ionicons 
                name={error.toLowerCase().includes('network') || error.toLowerCase().includes('unable') || error.toLowerCase().includes('timed out') ? 'wifi-outline' : 'alert-circle-outline'} 
                size={36} 
                color={colors.error} 
              />
            </View>
            
            <Text style={[styles.errorTitle, { color: colors.text }]}>
              {error.toLowerCase().includes('network') || error.toLowerCase().includes('unable') || error.toLowerCase().includes('timed out') ? 'No Connection' : 'Something Went Wrong'}
            </Text>
            <Text style={[styles.errorMessage, { color: colors.textSecondary, marginBottom: 24 }]}>
              {error.toLowerCase().includes('network') || error.toLowerCase().includes('unable') || error.toLowerCase().includes('timed out')
                ? 'Please check your internet connection and try again.'
                : "We're having trouble loading jobs right now. Please try again."}
            </Text>

            <TouchableOpacity
              style={[styles.errorButton, { backgroundColor: colors.primary }]}
              onPress={onRefresh}
              activeOpacity={0.8}
            >
              <Text style={styles.errorButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          setShowScrollToTop(offsetY > 200);
        }}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6b46c1', '#8b5cf6']}
            title="Pull to refresh"
            titleColor="#6b46c1"
          />
        }
      >
        {/* Job Tags */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tagsContainer}
          contentContainerStyle={styles.tagsContent}
        >
          {jobTags.map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[
                styles.tag,
                selectedTag === tag && { backgroundColor: colors.primary }
              ]}
              onPress={() => setSelectedTag(tag)}
            >
              <Text style={[
                styles.tagText,
                { color: selectedTag === tag ? '#fff' : colors.text }
              ]}>
                {tag}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Job Posts */}
        <View style={[styles.postsContainer, { paddingBottom: 100 + insets.bottom + 20 }]}>
          {filteredPosts.length === 0 ? (
            refreshing ? (
              // Show skeleton loading during refresh
              <View style={[styles.postsContainer, { paddingBottom: 100 + insets.bottom + 20 }]}>
                {[1, 2, 3].map((i) => (
                  <View key={i} style={[styles.postCard, { backgroundColor: colors.card }]}>
                    {/* Skeleton Header */}
                    <View style={styles.postHeader}>
                      <View style={styles.profileSection}>
                        <View style={[styles.profileImage, { backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: 24, width: 48, height: 48 }]} />
                        <View style={styles.profileInfo}>
                          <View style={{ width: 120, height: 16, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: 8, marginBottom: 4 }} />
                          <View style={{ width: 80, height: 16, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: 6 }} />
                        </View>
                      </View>
                      <View style={styles.headerActions}>
                        <View style={{ width: 20, height: 20, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: 10 }} />
                      </View>
                    </View>

                    {/* Skeleton Job Title */}
                    <View style={styles.jobTitleContainer}>
                      <View style={{ width: '80%', height: 20, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: 10, marginBottom: 8 }} />
                      <View style={{ width: '60%', height: 16, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: 8 }} />
                    </View>

                    {/* Skeleton Job Details */}
                    <View style={styles.jobDetailsContainer}>
                      <View style={styles.detailRow}>
                        <View style={styles.inlineDetailItem}>
                          <View style={{ width: 16, height: 16, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: 8 }} />
                          <View style={{ width: '70%', height: 14, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: 7 }} />
                        </View>
                        <View style={styles.inlineDetailItem}>
                          <View style={{ width: 16, height: 16, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: 8 }} />
                          <View style={{ width: '70%', height: 14, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: 7 }} />
                        </View>
                      </View>
                      <View style={styles.detailRow}>
                        <View style={styles.inlineDetailItem}>
                          <View style={{ width: 16, height: 16, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: 8 }} />
                          <View style={{ width: '70%', height: 14, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: 7 }} />
                        </View>
                        <View style={styles.inlineDetailItem}>
                          <View style={{ width: 16, height: 16, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: 8 }} />
                          <View style={{ width: '70%', height: 14, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: 7 }} />
                        </View>
                      </View>
                    </View>

                    {/* Skeleton Description */}
                    <View style={{ marginBottom: 8 }}>
                      <View style={{ width: '100%', height: 14, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: 7, marginBottom: 6 }} />
                      <View style={{ width: '85%', height: 14, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: 7 }} />
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyStateIconContainer}>
                  <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
                </View>
                <Text style={styles.emptyStateText}>
                  {searchQuery.trim() ? 'No matching jobs found' : 'No jobs available'}
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  {searchQuery.trim()
                    ? "Try adjusting your search or filters to find what you're looking for."
                    : 'Check back later or try adjusting your filters.'
                  }
                </Text>
              </View>
            )
          ) : (
            filteredPosts.map((post, index) => {
              // Check if this is a "looking" post using the post_type field
              const isLookingPost = post.post_type === 'looking';

              return (
                <Pressable
                  key={post.id}
                  style={[
                    styles.postCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border
                    },
                    expandedPost === post.id && styles.expandedCard
                  ]}
                  onPress={() => handlePostPress(post.id)}
                >
                  {/* Header with user info and options */}
                  <View style={styles.postHeader}>
                    <View style={styles.profileSection}>
                      <TouchableOpacity
                        style={styles.profileImage}
                        onPress={() => {
                          if (post.user) {
                            if (isPostCreator(post)) {
                              router.push('/my-profile');
                            } else {
                              router.push(`/user-profile?userId=${post.user.id}`);
                            }
                          }
                        }}
                      >
                        <ProfilePicture
                          size={48}
                          showLongPress={false}
                          imageUrl={post.user?.profile_picture}
                          noBorder={true}
                        />
                      </TouchableOpacity>
                      <View style={styles.profileInfo}>
                        <TouchableOpacity
                          style={{ alignSelf: 'flex-start' }}
                          onPress={() => {
                            if (post.user) {
                              if (isPostCreator(post)) {
                                router.push('/my-profile');
                              } else {
                                router.push(`/user-profile?userId=${post.user.id}`);
                              }
                            }
                          }}
                        >
                          <Text style={[styles.userName, { color: colors.text }]}>
                            {post.user?.full_name || post.user?.username || 'Unknown User'}
                          </Text>
                          {isLookingPost && (
                            <Text style={styles.userType}>Looking for work</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.headerActions}>
                      {isLookingPost && (
                        <View style={styles.lookingBadge}>
                          <Text style={styles.lookingBadgeText}>Looking</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.moreButton}
                        onPress={() => {
                          console.log('Three dots clicked for post:', post.id);
                          setShowOptionsMenu(showOptionsMenu === post.id ? null : post.id);
                        }}
                      >
                        <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                      {showOptionsMenu === post.id && (
                        <View style={styles.optionsMenu}>
                          {/* Share option - available for all posts */}
                          <TouchableOpacity
                            style={styles.optionItem}
                            onPress={() => {
                              handleSharePost(post);
                              setShowOptionsMenu(null);
                            }}
                          >
                            <Ionicons name="share-outline" size={20} color="#3b7280" />
                            <Text style={styles.optionTextShare}>Share</Text>
                          </TouchableOpacity>

                          {/* Close Applications option - only for post creators */}
                          {isPostCreator(post) && (
                            <TouchableOpacity
                              style={styles.optionItem}
                              onPress={() => {
                                handleCloseApplications(post.id);
                                setShowOptionsMenu(null);
                              }}
                              disabled={closingJobId === post.id}
                            >
                              <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
                              <Text style={styles.optionText}>
                                {closingJobId === post.id ? 'Closing...' : 'Close Applications'}
                              </Text>
                            </TouchableOpacity>
                          )}

                          {/* Report option - for other users' posts */}
                          {!isPostCreator(post) && (
                            <TouchableOpacity
                              style={styles.optionItem}
                              onPress={() => handleReportPost(post.id)}
                            >
                              <Ionicons name="flag-outline" size={20} color="#f59e0b" />
                              <Text style={styles.optionText}>Report</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Job Title - Clean and minimal */}
                  <View style={styles.jobTitleContainer}>
                    <Text style={[styles.jobTitleMain, { color: colors.text }]}>
                      {post.title}
                    </Text>
                  </View>

                  {/* Job details with grid lines - minimal design */}
                  <View style={styles.jobDetailsContainer}>
                    {/* First row - Salary and Location */}
                    <View style={styles.detailRow}>
                      <View style={styles.inlineDetailItem}>
                        <Ionicons name="cash-outline" size={16} color="#059669" />
                        <Text style={[styles.detailText, { color: colors.textSecondary }]} numberOfLines={2}>
                          {formatSalary(post.salary_min, post.salary_max, post.job_type)}
                        </Text>
                      </View>
                      <View style={styles.inlineDetailItem}>
                        <Ionicons name="location-outline" size={16} color="#ef4444" />
                        <Text style={[styles.detailText, { color: colors.textSecondary }]} numberOfLines={2}>
                          {post.location || `${post.city ? post.city + ', ' : ''}${post.state || 'Location not specified'}`}
                        </Text>
                      </View>
                    </View>

                    {/* Second row - Job Type and Experience */}
                    <View style={styles.detailRow}>
                      <View style={styles.inlineDetailItem}>
                        <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                        <Text style={[styles.detailText, { color: colors.textSecondary }]} numberOfLines={1}>
                          {post.job_type}
                        </Text>
                      </View>
                      <View style={styles.inlineDetailItem}>
                        <Ionicons name="briefcase-outline" size={16} color={colors.textSecondary} />
                        <Text style={[styles.detailText, { color: colors.textSecondary }]} numberOfLines={1}>
                          {post.experience_level || 'not mentioned'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Enhanced description for hire posts */}
                  <View style={[
                    styles.descriptionContainer,
                    !isLookingPost && [styles.hireDescriptionContainer, { backgroundColor: colors.cardAlt }]
                  ]}>
                    <Text style={[
                      styles.description,
                      { color: colors.textSecondary },
                      !isLookingPost && styles.hireDescription,
                      !isLookingPost && { color: colors.text }
                    ]} numberOfLines={expandedPost === post.id ? undefined : 2}>
                      {post.description}
                    </Text>
                  </View>

                  {/* Expanded content */}
                  {expandedPost === post.id && (
                    <View style={styles.expandedContent}>
                      {/* Additional Job Details - Only info not shown in main card */}
                      <View style={styles.expandedDetailsSection}>
                        <Text style={[styles.expandedSectionTitle, { color: colors.text }]}>Additional Details</Text>
                        <View style={styles.detailsGrid}>
                          <View style={[styles.detailItem, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Sector</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>{post.sector || 'Professional'}</Text>
                          </View>
                          <View style={[styles.detailItem, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Shift Timing</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>{post.shift_timing || 'not mentioned'}</Text>
                          </View>
                          <View style={[styles.detailItem, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Posted</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(post.created_at)}</Text>
                          </View>
                          {!isLookingPost && (
                            <View style={[styles.detailItem, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Applicants</Text>
                              <Text style={[styles.detailValue, { color: colors.text }]}>{post.applicants_count}</Text>
                            </View>
                          )}
                          {post.is_remote && (
                            <View style={[styles.detailItem, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Remote Work</Text>
                              <Text style={[styles.detailValue, { color: colors.text }]}>Available</Text>
                            </View>
                          )}
                          {(post.address || post.pincode) && (
                            <View style={[styles.detailItem, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Complete Address</Text>
                              <Text style={[styles.detailValue, { color: colors.text }]}>
                                {post.address && `${post.address}, `}{post.city && `${post.city}, `}{post.state}{post.pincode && ` - ${post.pincode}`}
                              </Text>
                            </View>
                          )}
                          {post.gender_preference && post.gender_preference !== 'any' && (
                            <View style={[styles.detailItem, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Gender Preference</Text>
                              <Text style={[styles.detailValue, { color: colors.text }]}>
                                {post.gender_preference === 'male' ? 'Male' : 'Female'}
                              </Text>
                            </View>
                          )}
                          {post.gender_preference === 'any' && (
                            <View style={[styles.detailItem, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Gender Preference</Text>
                              <Text style={[styles.detailValue, { color: colors.text }]}>Any</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Action button */}
                      <TouchableOpacity
                        style={[
                          styles.applyButton,
                          isLookingPost && styles.contactButton,
                          hasAppliedToJob(post.id) && styles.appliedButton
                        ]}
                        onPress={() => isLookingPost ? handleContact(post) : handleApply(post)}
                        disabled={hasAppliedToJob(post.id)}
                      >
                        <Text style={[
                          styles.applyButtonText,
                          hasAppliedToJob(post.id) && styles.appliedButtonText
                        ]}>
                          {isLookingPost
                            ? 'Contact'
                            : hasAppliedToJob(post.id)
                              ? 'Applied'
                              : 'Apply Now'
                          }
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>
      )}



      {/* Bottom Navigation */}
      <View style={styles.bottomNavContainer}>
        <View style={styles.bottomNavCapsule}>
          <TouchableOpacity
            style={[styles.navItem, styles.activeNavItem]}
            onPress={scrollToTop}
            activeOpacity={0.7}
            delayPressIn={0}
          >
            <Feather
              name="home"
              size={26}
              color={colors.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.replace('/(tabs)/post')}
            activeOpacity={0.7}
            delayPressIn={0}
          >
            <View style={styles.postButton}>
              <Feather name="plus-circle" size={26} color={'#fff'} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.push('/my-profile')}
            activeOpacity={0.7}
            delayPressIn={0}
          >
            <Feather
              name="user"
              size={26}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filter & Sort</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterContent} showsVerticalScrollIndicator={false}>
              {/* Job Type Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Job Type</Text>
                <View style={styles.filterOptions}>
                  {[
                    { key: 'all', label: 'All Types', icon: 'grid-outline' },
                    { key: 'job', label: 'Job Posts', icon: 'briefcase-outline' },
                    { key: 'employee', label: 'Looking for Work', icon: 'person-outline' },
                    { key: 'both', label: 'Both', icon: 'layers-outline' }
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.filterOption,
                        jobTypeFilter === option.key && styles.filterOptionActive
                      ]}
                      onPress={() => setJobTypeFilter(option.key as any)}
                    >
                      <Ionicons
                        name={option.icon as any}
                        size={20}
                        color={jobTypeFilter === option.key ? '#8b5cf6' : '#6b7280'}
                      />
                      <Text style={[
                        styles.filterOptionText,
                        jobTypeFilter === option.key && styles.filterOptionTextActive
                      ]}>
                        {option.label}
                      </Text>
                      {jobTypeFilter === option.key && (
                        <Ionicons name="checkmark" size={18} color="#8b5cf6" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Location Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Location</Text>
                <View style={styles.filterOptions}>
                  {[
                    { key: 'all', label: 'All Locations', icon: 'globe-outline' },
                    { key: 'nearby', label: 'Nearby', icon: 'location-outline' },
                    { key: 'others', label: 'Other Cities', icon: 'map-outline' }
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.filterOption,
                        locationFilter === option.key && styles.filterOptionActive
                      ]}
                      onPress={() => setLocationFilter(option.key as any)}
                    >
                      <Ionicons
                        name={option.icon as any}
                        size={20}
                        color={locationFilter === option.key ? '#8b5cf6' : '#6b7280'}
                      />
                      <Text style={[
                        styles.filterOptionText,
                        locationFilter === option.key && styles.filterOptionTextActive
                      ]}>
                        {option.label}
                      </Text>
                      {locationFilter === option.key && (
                        <Ionicons name="checkmark" size={18} color="#8b5cf6" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Filter Actions */}
              <View style={styles.filterActions}>
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={() => {
                    setJobTypeFilter('all');
                    setLocationFilter('all');
                  }}
                >
                  <Text style={styles.resetButtonText}>Reset All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.filterApplyButton}
                  onPress={() => setShowFilterModal(false)}
                >
                  <Text style={styles.filterApplyButtonText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ShareBottomSheet
        visible={shareSheetVisible}
        onClose={() => setShareSheetVisible(false)}
        shareType="post"
        data={sharingPostData || {}}
      />
    </View>
  );
}

const getStyles = (colors: any, colorScheme: 'light' | 'dark') => StyleSheet.create({
  container: {
    flex: 1,
    minHeight: Dimensions.get('window').height,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorCard: {
    width: '90%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
  },
  errorIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: 'Outfit-Bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  errorButton: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    shadowColor: '#6b46c1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  errorButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 6,
  },
  leftContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 0,
    // Dimensions are now controlled by animated values
  },
  searchInput: {
    flex: 1,
    marginLeft: 6, // Increased slightly for better spacing from the icon
    fontSize: 12,
    paddingVertical: 0,
  },
  appName: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  topIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  tagsContainer: {
    paddingVertical: 16,
  },
  tagsContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.textSecondary,
    backgroundColor: colors.card,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  postsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  postCard: {
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  expandedCard: {
    marginBottom: 20,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImage: {
    marginRight: 12,
  },
  profileInfo: {
    flexShrink: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  userType: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
    marginTop: 2,
  },
  jobTitleContainer: {
    marginBottom: 16,
  },
  jobTitleMain: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 24,
  },
  moreButton: {
    padding: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lookingBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  lookingBadgeText: {
    color: '#4f46e5',
    fontSize: 12,
    fontWeight: '600',
  },
  lookingPostCard: {
    borderColor: '#0ea5e9',
    borderWidth: 2,
  },
  lookingUserName: {
    color: '#0ea5e9',
  },
  lookingJobTitle: {
    color: '#0ea5e9',
  },
  lookingSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  jobDetailsContainer: {
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  jobDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 16,
  },
  detailText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
    flexWrap: 'wrap',
    marginLeft: 6,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4b5563',
    marginBottom: 8,
  },
  lookingDescription: {
    color: '#0ea5e9',
  },
  descriptionContainer: {
    marginBottom: 16,
  },
  hireDescriptionContainer: {
    padding: 16,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  hireDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
    fontWeight: '500',
  },

  expandedContent: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  expandedDetailsSection: {
    marginBottom: 20,
  },
  expandedSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 16,
  },
  detailItem: {
    flex: 1,
    minWidth: '45%',
    maxWidth: '48%',
    backgroundColor: colors.cardAlt,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    lineHeight: 18,
    flexShrink: 1,
  },
  inlineDetailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    flex: 1,
    paddingVertical: 2,
  },



  applyButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  contactButton: {
    backgroundColor: '#4f46e5',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  appliedButton: {
    backgroundColor: '#e0e7ff',
    opacity: 0.7,
  },
  appliedButtonText: {
    color: '#4f46e5',
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bottomNavCapsule: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colorScheme === 'dark' ? 'rgba(20, 16, 33, 0.92)' : 'rgba(245, 243, 255, 0.92)',
    borderRadius: 50,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginHorizontal: 12,
    minWidth: 280,
    height: 64,
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? 'rgba(139, 92, 246, 0.25)' : 'rgba(107, 70, 193, 0.15)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: colorScheme === 'dark' ? 0.22 : 0.12,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    width: 48,
    borderRadius: 24,
    padding: 8,
  },

  bottomText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  activeNavItem: {
    backgroundColor: colorScheme === 'dark' ? 'rgba(139, 92, 246, 0.20)' : 'rgba(107, 70, 193, 0.12)',
    borderRadius: 24,
  },

  postButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  navText: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
    marginTop: 20,
    marginBottom: 20,
  },
  emptyStateIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.cardAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },

  authNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  authNoticeText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
  authNoticeButton: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  authNoticeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  locationDetailsContainer: {
    marginTop: 10,
    marginBottom: 16,
  },
  locationDetailsLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  locationDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  locationDetailItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.cardAlt,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationDetailItemLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  locationDetailValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  optionsMenu: {
    position: 'absolute',
    top: 30,
    right: 0,
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
    minWidth: 160,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 6,
  },
  optionText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
  },
  optionTextShare: {
    marginLeft: 8,
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  // Filter Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModal: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  filterModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  filterContent: {
    maxHeight: 400,
  },
  closeButton: {
    padding: 4,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.textSecondary,
    backgroundColor: colors.cardAlt,
    minWidth: '45%',
    justifyContent: 'center',
    gap: 8,
  },
  filterOptionActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterOptionTextActive: {
    color: '#ffffff',
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.textSecondary,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterApplyButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
  },
  filterApplyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  messageBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  messageBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  notificationBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollToTopButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },

});

