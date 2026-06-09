import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Share,
  Modal,
  Keyboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useCustomFonts } from '@/hooks/fonts';
import { router, useFocusEffect } from 'expo-router';
import ProfilePicture from '@/components/ProfilePicture';
import { useBackHandler } from '@/hooks/useBackHandler';
import { useAuth } from '@/contexts/AuthContext';
import API from '@/utils/api';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ShareBottomSheet from '@/components/ShareBottomSheet';

// Comprehensive job skills for both technical and non-technical local jobs
const JOB_SKILLS_SUGGESTIONS = [
  // Programming Languages & Technologies
  'Python', 'JavaScript', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift',
  'Kotlin', 'TypeScript', 'React', 'Angular', 'Vue.js', 'Node.js', 'Django', 'Flask',
  'Spring Boot', 'Laravel', 'Express.js', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis',
  'Docker', 'Kubernetes', 'AWS', 'Azure', 'Google Cloud', 'Firebase', 'Git', 'GitHub',

  // Technical Skills
  'Software Development', 'Web Development', 'Mobile Development', 'Data Analysis', 'Machine Learning',
  'Artificial Intelligence', 'Cybersecurity', 'Cloud Computing', 'DevOps', 'Database Management',
  'Network Administration', 'System Administration', 'UI/UX Design', 'Graphic Design', 'Digital Marketing',
  'Content Writing', 'SEO', 'Social Media Management', 'Video Editing', 'Photography',
  'Architecture', 'Civil Engineering', 'Mechanical Engineering', 'Electrical Engineering', 'Chemical Engineering',
  'Project Management', 'Business Analysis', 'Financial Analysis', 'Accounting', 'Human Resources',
  'Sales', 'Customer Service', 'Teaching', 'Training', 'Consulting', 'Data Science', 'Statistics',
  'Product Management', 'Agile Development', 'Scrum Master', 'Quality Assurance', 'Testing',
  'API Development', 'Microservices', 'Blockchain', 'IoT Development', 'Game Development',

  // Non-Technical Local Job Skills
  'Driving', 'Delivery', 'Transportation', 'Logistics', 'Warehouse Management', 'Forklift Operation',
  'Retail Sales', 'Shop Keeping', 'Cashier', 'Inventory Management', 'Stock Management', 'Customer Support',
  'Gardening', 'Landscaping', 'Housekeeping', 'Cleaning', 'Maintenance', 'Janitorial Services',
  'Cooking', 'Food Preparation', 'Baking', 'Catering', 'Restaurant Service', 'Barista', 'Bartending',
  'Construction', 'Carpentry', 'Plumbing', 'Electrical Work', 'Painting', 'Roofing', 'Masonry',
  'Welding', 'Machining', 'Fabrication', 'Assembly', 'Quality Control', 'CNC Operation',
  'Healthcare', 'Nursing', 'Caregiving', 'Medical Assistance', 'Pharmacy', 'Medical Transcription',
  'Beauty Services', 'Hair Styling', 'Makeup', 'Spa Services', 'Massage Therapy', 'Nail Art',
  'Fitness Training', 'Personal Training', 'Yoga Instruction', 'Sports Coaching', 'Recreation', 'Swimming',
  'Security', 'Event Management', 'Tourism', 'Travel Planning', 'Language Translation', 'Interpreting',
  'Legal Assistance', 'Administrative Support', 'Reception', 'Data Entry', 'Typing', 'Transcription',
  'Art & Craft', 'Music', 'Dance', 'Theater', 'Entertainment', 'Photography', 'Videography',
  'Agriculture', 'Farming', 'Animal Care', 'Veterinary Support', 'Forestry', 'Horticulture',
  'Fishing', 'Mining', 'Oil & Gas', 'Renewable Energy', 'Environmental Services', 'Waste Management',
  'Pet Care', 'Dog Walking', 'Pet Grooming', 'House Sitting', 'Babysitting', 'Elder Care',
  'Laundry Services', 'Dry Cleaning', 'Tailoring', 'Shoe Repair', 'Jewelry Making', 'Pottery',
  'Bicycle Repair', 'Auto Repair', 'Motorcycle Repair', 'Appliance Repair', 'Computer Repair',
  'Phone Repair', 'Electronics Repair', 'Watch Repair', 'Clock Repair', 'Musical Instrument Repair'
];

// Profile cache keys - now user-specific
const getProfileCacheKey = (userId: string) => `user_profile_cache_${userId}`;
const getProfileCacheTimestampKey = (userId: string) => `user_profile_cache_timestamp_${userId}`;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

interface ProfileData {
  name: string;
  username: string;
  bio: string;
  skills: string[];
  profilePicture: string | null;
}



// Global variable to persist scroll position across unmounts (since Profile is a Stack screen)
let globalProfileScrollY = 0;

export default function MyProfileScreen() {
  const [fontsLoaded] = useCustomFonts();
  const { colors, colorScheme } = useAppTheme();
  const styles = React.useMemo(() => getStyles(colors, colorScheme), [colors, colorScheme]);
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, isLoading, updateUserData } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [isLoadingFromCache, setIsLoadingFromCache] = useState(false); // Start as false to eliminate loading delay

  // Initialize userInfo with auth user data immediately to prevent flicker
  const [userInfo, setUserInfo] = useState<ProfileData>(() => ({
    name: user?.full_name || "",
    username: user?.username || "",
    bio: user?.profile?.bio || "",
    skills: user?.profile?.skills || [],
    profilePicture: user?.profile?.profile_picture || user?.profile_picture || null,
  }));
  const [editableSkills, setEditableSkills] = useState<string[]>(() => user?.profile?.skills || []);
  const [newSkill, setNewSkill] = useState('');

  const skillsSectionRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);


  // Cache management functions
  const saveProfileToCache = async (profileData: ProfileData) => {
    try {
      if (!user?.id) return; // Only cache if we have a valid user ID
      const cacheKey = getProfileCacheKey(user.id.toString());
      const timestampKey = getProfileCacheTimestampKey(user.id.toString());
      await AsyncStorage.setItem(cacheKey, JSON.stringify(profileData));
      await AsyncStorage.setItem(timestampKey, Date.now().toString());
      console.log(`Profile cached for user ${user.id}`);
    } catch (error) {
      console.error('Error saving profile to cache:', error);
    }
  };

  const loadProfileFromCache = async (): Promise<ProfileData | null> => {
    try {
      if (!user?.id) return null; // Only load cache if we have a valid user ID
      const cacheKey = getProfileCacheKey(user.id.toString());
      const timestampKey = getProfileCacheTimestampKey(user.id.toString());

      const cachedData = await AsyncStorage.getItem(cacheKey);
      const cacheTimestamp = await AsyncStorage.getItem(timestampKey);

      if (cachedData && cacheTimestamp) {
        const timestamp = parseInt(cacheTimestamp, 10);
        const isExpired = Date.now() - timestamp > CACHE_DURATION;

        if (!isExpired) {
          console.log(`Loading cached profile for user ${user.id}`);
          return JSON.parse(cachedData);
        } else {
          // Cache expired, clear it
          await AsyncStorage.removeItem(cacheKey);
          await AsyncStorage.removeItem(timestampKey);
          console.log(`Cache expired for user ${user.id}, cleared`);
        }
      }
    } catch (error) {
      console.error('Error loading profile from cache:', error);
    }
    return null;
  };

  // Initialize profile data immediately (synchronous approach)
  const initializeProfile = async () => {
    // Only clear caches explicitly when switching accounts, not on mount.
    // Setting initial loading to false immediately to prevent delay


    // Set initial loading to false immediately to prevent delay
    setIsLoadingFromCache(false);

    // First set basic user data if available
    if (user?.full_name || user?.username) {
      setUserInfo(prev => ({
        ...prev,
        name: user.full_name || prev.name,
        username: user.username || prev.username,
      }));
    }

    // Then try to load from cache and update if available
    loadProfileFromCache().then(cachedProfile => {
      if (cachedProfile) {
        // Only update if the cached data is actually different and better
        setUserInfo(prev => ({
          name: cachedProfile.name || prev.name,
          username: cachedProfile.username || prev.username,
          bio: cachedProfile.bio || prev.bio,
          skills: cachedProfile.skills || prev.skills,
          profilePicture: cachedProfile.profilePicture || prev.profilePicture,
        }));
        setEditableSkills(cachedProfile.skills || []);
        setProfileLoaded(true);
        console.log('Profile enhanced from cache');
      }
    });
  };

  const updateCacheAndState = async (newData: Partial<ProfileData>) => {
    const updatedProfile = { ...userInfo, ...newData };
    setUserInfo(updatedProfile);
    setEditableSkills(updatedProfile.skills);
    await saveProfileToCache(updatedProfile);
  };

  // Clear all profile caches to ensure fresh data
  const clearAllProfileCaches = async () => {
    try {
      // Get all keys that match profile cache pattern
      const allKeys = await AsyncStorage.getAllKeys();
      const profileCacheKeys = allKeys.filter(key =>
        key.includes('user_profile_cache_') || key.includes('user_profile_cache_timestamp_')
      );

      if (profileCacheKeys.length > 0) {
        await AsyncStorage.multiRemove(profileCacheKeys);
        console.log(`Cleared ${profileCacheKeys.length} profile cache keys`);
      }
    } catch (error) {
      console.error('Error clearing all profile caches:', error);
    }
  };

  // Handle profile picture change
  const handleProfilePictureChange = async (imageUrl: string) => {
    try {
      // Optimistic update - update cache and UI immediately
      await updateCacheAndState({ profilePicture: imageUrl });

      // Update the backend in background
      const updateData = {
        profile_picture: imageUrl
      };

      const response = await API.put('/me/', updateData);

      if (response.status === 200) {
        console.log('Profile picture updated successfully');

        // Show success message
        if (imageUrl) {
          Alert.alert('Success', 'Profile picture updated successfully!');
        } else {
          Alert.alert('Success', 'Profile picture removed successfully!');
        }
      }
    } catch (error: any) {
      console.error('Error updating profile picture:', error);

      // Revert cache and state on error
      await updateCacheAndState({ profilePicture: userInfo.profilePicture });

      Alert.alert(
        'Update Failed',
        error.response?.data?.message || 'Failed to update profile picture. Please try again.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  // Share profile function
  const handleShareProfile = async () => {
    try {
      const shareMessage = `Check out ${userInfo.name}'s profile on Rozzi!\n\nUsername: @${userInfo.username}\nBio: ${userInfo.bio}\n\nConnect with them on our platform!`;

      await Share.share({
        message: shareMessage,
        title: `${userInfo.name}'s Profile`,
      });
      setShowShareModal(false);
    } catch (error) {
      console.error('Error sharing profile:', error);
    }
  };

  const handleCopyProfileLink = async () => {
    try {
      const profileLink = `https://rozzi.app/profile/${userInfo.username}`;
      // For now, we'll just show an alert since we don't have clipboard access
      Alert.alert(
        'Profile Link',
        profileLink,
        [
          { text: 'OK', style: 'default' }
        ]
      );
      setShowShareModal(false);
    } catch (error) {
      console.error('Error copying link:', error);
    }
  };

  // Reset profile state when user changes (new login) — track previous ID to avoid reset on first mount
  const prevUserIdRef = useRef<number | null>(user?.id ?? null);
  useEffect(() => {
    if (!user) return;

    // Only reset when switching to a *different* account, not on first mount
    if (prevUserIdRef.current !== null && prevUserIdRef.current !== user.id) {
      console.log(`User switched from ${prevUserIdRef.current} to ${user.id}`);
      setUserInfo({
        name: user.full_name || "",
        username: user.username || "",
        bio: user.profile?.bio || "",
        skills: user.profile?.skills || [],
        profilePicture: user.profile?.profile_picture || user.profile_picture || null,
      });
      setEditableSkills(user.profile?.skills || []);
      setProfileLoaded(false);
      clearAllProfileCaches();
    }

    prevUserIdRef.current = user.id;
    initializeProfile().catch(console.error);
  }, [user?.id]); // Only trigger when user ID changes

  // Note: Authentication redirect is handled by AuthContext to avoid navigation conflicts

  // Update user info when user data becomes available (includes profile data from auth context)
  useEffect(() => {
    if (user) {
      setUserInfo(prev => ({
        ...prev,
        name: user.full_name || prev.name || "",
        username: user.username || prev.username || "",
        bio: user.profile?.bio || prev.bio || "",
        skills: (user.profile?.skills && user.profile.skills.length > 0) ? user.profile.skills : prev.skills,
        profilePicture: user.profile?.profile_picture || user.profile_picture || prev.profilePicture,
      }));
      if (user.profile?.skills && user.profile.skills.length > 0) {
        setEditableSkills(user.profile.skills);
      }

      // Only fetch from API if we haven't loaded profile data yet
      if (!profileLoaded && !isLoadingFromCache) {
        fetchUserProfile();
      }
    }
  }, [user, profileLoaded, isLoadingFromCache]);

  // Add focus effect to refresh data only when cache is stale
  useFocusEffect(
    React.useCallback(() => {
      const refreshIfStale = async () => {
        if (!user || isLoadingFromCache) return;

        // Check if cache is stale
        if (user?.id) {
          const timestampKey = getProfileCacheTimestampKey(user.id.toString());
          const cacheTimestamp = await AsyncStorage.getItem(timestampKey);
          if (cacheTimestamp) {
            const timestamp = parseInt(cacheTimestamp, 10);
            const isStale = Date.now() - timestamp > CACHE_DURATION;

            if (isStale) {
              console.log('Cache is stale, refreshing profile data...');
              fetchUserProfile();
            }
          } else if (!profileLoaded) {
            // No cache exists, fetch data
            fetchUserProfile();
          }
        }
      };

      refreshIfStale();
    }, [user, profileLoaded, isLoadingFromCache])
  );

  // Scroll position is now restored via contentOffset prop on ScrollView
  // (no useEffect + setTimeout needed — no visible jump)

  // Use custom back handler hook - MUST be called before any conditional returns
  useBackHandler({
    onBackPress: () => {
      if (isEditing) {
        Alert.alert(
          'Discard Changes',
          'Are you sure you want to discard your changes?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Discard',
              style: 'destructive',
              onPress: () => {
                setIsEditing(false);
                // Reset form data back to original values
                setUserInfo({
                  name: user?.full_name || "No Name",
                  username: user?.username || "No Username",
                  bio: userInfo.bio || "",
                  skills: userInfo.skills || [],
                  profilePicture: userInfo.profilePicture || null,
                });
                setEditableSkills(userInfo.skills || []);
                setNewSkill('');
              }
            },
          ]
        );
        return true;
      }
      return false;
    }
  });

  // Auto-scroll to skills section when keyboard opens - MUST be called before any conditional returns
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      if (isEditing && scrollViewRef.current) {
        scrollViewRef.current?.scrollTo({
          y: 400, // Adjust this value based on your layout
          animated: true,
        });
      }
    });

    return () => {
      keyboardDidShowListener?.remove();
    };
  }, [isEditing]);

  // Auto-scroll when suggestions appear - MUST be called before any conditional returns
  useEffect(() => {
    if (newSkill.length > 0 && isEditing && scrollViewRef.current) {
      scrollViewRef.current?.scrollTo({
        y: 600, // Scroll more to ensure suggestions are fully visible
        animated: true,
      });
    }
  }, [newSkill, isEditing]);



  const fetchUserProfile = async () => {
    try {
      const response = await API.get('/me/');
      if (response.status === 200 && response.data) {
        const profileData = response.data;
        const fullName = profileData.full_name || `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || user?.full_name || "No Name";

        const newProfileData: ProfileData = {
          name: fullName,
          username: profileData.username || user?.username || "No Username",
          bio: profileData.profile?.bio || userInfo.bio,
          skills: profileData.profile?.skills || userInfo.skills,
          profilePicture: profileData.profile?.profile_picture || userInfo.profilePicture,
        };

        // Check if data actually changed before updating
        const hasChanged = JSON.stringify(userInfo) !== JSON.stringify(newProfileData);
        if (hasChanged) {
          setUserInfo(newProfileData);
          setEditableSkills(newProfileData.skills);

          // Save to cache for future instant loading
          await saveProfileToCache(newProfileData);
          console.log('Profile updated and cached:', newProfileData);
        }

        setProfileLoaded(true);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setProfileLoaded(true); // Mark as loaded even on error to prevent infinite retries
    }
  };

  // All hooks must be called before any conditional returns
  if (!fontsLoaded) {
    return null;
  }



  // Show loading while checking authentication
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.brandBackground }]}>
        <Text style={[styles.loadingText, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>Loading profile...</Text>
      </View>
    );
  }

  // Don't render anything if not authenticated
  if (!isAuthenticated) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.brandBackground }]}>
        <Text style={[styles.loadingText, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>Redirecting to login...</Text>
      </View>
    );
  }

  // Safety check for when user is null
  if (!user) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.brandBackground }]}>
        <Text style={[styles.loadingText, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>Loading user data...</Text>
      </View>
    );
  }








  const handleSave = async () => {
    try {

      const updateData: any = {
        first_name: userInfo.name.split(' ')[0] || userInfo.name,
        last_name: userInfo.name.split(' ').slice(1).join(' ') || '',
        bio: userInfo.bio,
        skills: editableSkills
      };


      await proceedWithUpdate(updateData);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  // Helper function to proceed with the actual update
  const proceedWithUpdate = async (updateData: any) => {
    try {
      // Update user profile in backend
      const response = await API.put('/me/', updateData);

      if (response.status === 200) {
        // Update local state with new data
        setUserInfo(prev => ({
          ...prev,
          skills: editableSkills
        }));
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully!');

        // Update cache and state with saved data
        const updatedProfileData = {
          name: updateData.first_name + ' ' + updateData.last_name,
          username: updateData.username || userInfo.username,
          bio: updateData.bio || userInfo.bio,
          skills: updateData.skills || userInfo.skills,
          profilePicture: userInfo.profilePicture,
        };
        await updateCacheAndState(updatedProfileData);



        // Refresh profile data from backend
        await fetchUserProfile();
      } else {
        Alert.alert('Error', 'Failed to update profile. Please try again.');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);

      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !editableSkills.includes(newSkill.trim())) {
      setEditableSkills(prev => [...prev, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const addSkillFromSuggestion = (suggestedSkill: string) => {
    if (suggestedSkill && !editableSkills.includes(suggestedSkill)) {
      setEditableSkills(prev => [...prev, suggestedSkill]);
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setEditableSkills(prev => prev.filter(skill => skill !== skillToRemove));
  };

  // Handle back button when editing
  const handleBackPress = () => {
    if (isEditing) {
      Alert.alert(
        'Discard Changes',
        'Are you sure you want to discard your changes?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              handleCancelEdit();
            }
          },
        ]
      );
      return true;
    }
    return false;
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset form data back to original values
    setUserInfo({
      name: user?.full_name || "No Name",
      username: user?.username || "No Username",
      bio: userInfo.bio || "",
      skills: userInfo.skills || [],
      profilePicture: userInfo.profilePicture || null,
    });
    setEditableSkills(userInfo.skills || []);
    setNewSkill('');
  };

  const scrollToSkillsSection = () => {
    if (skillsSectionRef.current && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: 400, // Adjust this value based on your layout
          animated: true,
        });
      }, 100);
    }
  };

  const scrollToSuggestions = () => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: 600, // Scroll more to ensure suggestions are fully visible
          animated: true,
        });
      }, 150);
    }
  };


  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.brandBackground }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { backgroundColor: colors.brandBackground }]}>
        {/* Top Bar */}
        <View style={[styles.topBar, { backgroundColor: colors.brandBackground, paddingTop: Math.max(insets.top + 6, 30) }]}>
          <View style={styles.leftContainer}>
            <Text style={[styles.appName, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>Rozzi</Text>
          </View>

          <View style={styles.centerContainer}>
            {/* Center container can be used for search or other elements if needed */}
          </View>

          <View style={styles.rightContainer}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => {
                setIsEditing(!isEditing);
              }}
            >
              <Feather name="edit-3" size={24} color={colorScheme === 'dark' ? '#fff' : '#000'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => router.push('/settings')}
            >
              <Feather name="settings" size={24} color={colorScheme === 'dark' ? '#fff' : '#000'} />
            </TouchableOpacity>
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom + 20 }]}
            contentOffset={{ x: 0, y: globalProfileScrollY }}
            scrollEventThrottle={16}
            onScroll={(event) => {
              globalProfileScrollY = event.nativeEvent.contentOffset.y;
            }}
          >
            {/* Profile Info */}
            <View style={[styles.profileSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.profileImageContainer}>
                <ProfilePicture
                  size={120}
                  userId={user?.id?.toString() || "current-user"}
                  imageUrl={userInfo.profilePicture || undefined}
                  onImageChange={handleProfilePictureChange}
                  noBorder={false}
                />
              </View>

              {isEditing ? (
                <View style={[styles.modernEditContainer, { backgroundColor: colors.card }]}>
                  <View style={styles.editField}>
                    <Text style={[styles.editLabel, { color: colors.text }]}>Name</Text>
                    <TextInput
                      style={[styles.modernInput, { backgroundColor: colors.cardAlt, color: colors.text, borderColor: colors.border }]}
                      value={userInfo.name}
                      onChangeText={(text) => setUserInfo(prev => ({ ...prev, name: text }))}
                      placeholder="Enter your name"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  <View style={styles.editField}>
                    <Text style={[styles.editLabel, { color: colors.text }]}>Username</Text>
                    <View style={[styles.usernameDisplayContainer, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                      <Text style={styles.usernamePrefix}>@</Text>
                      <Text style={[styles.usernameDisplayText, { color: colors.text }]}>
                        {userInfo.username || "username"}
                      </Text>
                    </View>
                    <Text style={styles.usernameNoteText}>
                      Username is permanent and cannot be changed
                    </Text>
                  </View>

                  <View style={styles.editField}>
                    <Text style={[styles.editLabel, { color: colors.text }]}>Bio</Text>
                    <TextInput
                      style={[styles.modernInput, styles.bioInput, { backgroundColor: colors.cardAlt, color: colors.text, borderColor: colors.border }]}
                      value={userInfo.bio}
                      onChangeText={(text) => setUserInfo(prev => ({ ...prev, bio: text }))}
                      placeholder="Tell us about yourself..."
                      placeholderTextColor={colors.textSecondary}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.modernUserInfo}>
                  <Text style={[styles.modernUserName, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>
                    {userInfo.name || "Your Name"}
                  </Text>
                  <TouchableOpacity onPress={() => setShowShareModal(true)}>
                    <Text style={[styles.modernUsername, { color: colorScheme === 'dark' ? '#d1d5db' : '#4b5563' }]}>
                      @{userInfo.username || "username"}
                    </Text>
                  </TouchableOpacity>
                  <View style={[styles.widerBioContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.modernBio, { color: colors.text }]}>
                      {userInfo.bio || "Add your bio here..."}
                    </Text>
                  </View>
                </View>
              )}

              {/* Skills Section - Hidden when editing */}
              {!isEditing && (
                <View style={styles.skillsSection}>
                  <Text style={[styles.skillsLabel, { color: colors.text }]}>
                    <Ionicons name="bulb-outline" size={20} color="#8b5cf6" style={{ marginRight: 8 }} />
                    Skills
                  </Text>
                  {editableSkills.length > 0 ? (
                    <View style={styles.skillsContainer}>
                      <View style={styles.skillsGrid}>
                        {editableSkills.map((skill: string, index: number) => (
                          <View key={index} style={[styles.skillTag, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                            <Text style={[styles.skillText, { color: colors.text }]}>
                              {skill}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : (
                    <View style={[styles.emptySkillsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Ionicons name="school-outline" size={24} color={colorScheme === 'dark' ? '#9ca3af' : '#9ca3af'} />
                      <Text style={[styles.emptySkillsTitle, { color: colors.text }]}>No Skills Added</Text>
                      <Text style={[styles.emptySkillsSubtitle, { color: colors.textSecondary }]}>Add your skills to showcase your expertise</Text>
                      <TouchableOpacity
                        style={styles.addSkillsButton}
                        onPress={() => setIsEditing(true)}
                      >
                        <Text style={styles.addSkillsButtonText}>Add Skills</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* Divider Line */}
              {!isEditing && (
                <View style={styles.divider} />
              )}

              {/* Skills Section - Edit Mode */}
              {isEditing && (
                <View ref={skillsSectionRef} style={styles.skillsSection}>
                  <Text style={[styles.skillsLabel, { color: colors.text }]}>
                    <Ionicons name="bulb-outline" size={20} color="#8b5cf6" style={{ marginRight: 8 }} />
                    Skills
                  </Text>
                  <View style={styles.skillsContainer}>
                    <View style={styles.skillsGrid}>
                      {editableSkills.map((skill: string, index: number) => (
                        <View key={index} style={[styles.skillTag, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                          <Text style={[styles.skillText, { color: colors.text }]}>
                            {skill}
                          </Text>
                          <TouchableOpacity
                            style={styles.removeSkillButton}
                            onPress={() => removeSkill(skill)}
                          >
                            <Ionicons name="close" size={10} color="#ffffff" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                    <View style={[styles.addSkillContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="search" size={16} color={colors.textSecondary} style={styles.searchIcon} />
                        <TextInput
                          style={[styles.addSkillInput, { color: colors.text }]}
                          placeholder="Type to search skills..."
                          placeholderTextColor={colors.textSecondary}
                          value={newSkill}
                          onChangeText={(text) => {
                            setNewSkill(text);
                            if (text.length > 0) {
                              scrollToSuggestions();
                            }
                          }}
                          onSubmitEditing={addSkill}
                          onFocus={scrollToSkillsSection}
                        />
                      </View>
                      <TouchableOpacity
                        style={[styles.addSkillButton, { backgroundColor: colors.cardAlt }]}
                        onPress={addSkill}
                        disabled={!newSkill.trim()}
                      >
                        <Ionicons name="add" size={18} color={newSkill.trim() ? "#6b46c1" : "#d1d5db"} />
                      </TouchableOpacity>
                    </View>

                    {/* Skills Suggestions */}
                    {newSkill.length > 0 && (
                      <View style={[styles.suggestionsWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.suggestionsLabel, { color: colors.text }]}>Suggestions:</Text>
                        <View style={[styles.suggestionsContainer, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.suggestionsScrollView}
                            contentContainerStyle={styles.suggestionsContent}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="none"
                          >
                            {JOB_SKILLS_SUGGESTIONS
                              .filter(skill =>
                                skill.toLowerCase().includes(newSkill.toLowerCase()) &&
                                !editableSkills.includes(skill)
                              )
                              .slice(0, 12)
                              .map((suggestedSkill, index) => (
                                <TouchableOpacity
                                  key={index}
                                  style={[styles.skillSuggestion, { backgroundColor: colors.card, borderColor: colors.border }]}
                                  onPress={() => addSkillFromSuggestion(suggestedSkill)}
                                >
                                  <Text style={[styles.skillSuggestionText, { color: colors.text }]} numberOfLines={1}>
                                    {suggestedSkill}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                          </ScrollView>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>



            {/* Modern Action Buttons Section - Hidden when editing */}
            {!isEditing && (
              <View style={[styles.modernActionSection, { marginTop: 24 }]}>
                <View style={styles.modernButtonsGrid}>
                  <TouchableOpacity
                    style={[styles.modernActionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => router.push('/applied-jobs')}
                    delayPressIn={0}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.buttonIconContainer, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                      <Feather name="briefcase" size={24} color="#3b82f6" />
                    </View>
                    <Text style={[styles.modernButtonText, { color: colors.text }]}>Applied Jobs</Text>
                    <Text style={[styles.modernButtonSubtext, { color: colors.textSecondary }]}>View applications</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modernActionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => router.push('/posted-jobs')}
                    delayPressIn={0}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.buttonIconContainer, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                      <Feather name="plus-square" size={24} color="#10b981" />
                    </View>
                    <Text style={[styles.modernButtonText, { color: colors.text }]}>Posted Jobs</Text>
                    <Text style={[styles.modernButtonSubtext, { color: colors.textSecondary }]}>Manage postings</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modernActionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => router.push('/subscription')}
                    delayPressIn={0}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.buttonIconContainer, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                      <Feather name="star" size={24} color="#f59e0b" />
                    </View>
                    <Text style={[styles.modernButtonText, { color: colors.text }]}>Premium</Text>
                    <Text style={[styles.modernButtonSubtext, { color: colors.textSecondary }]}>Upgrade plan</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modernActionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => router.push('/resume')}
                    delayPressIn={0}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.buttonIconContainer, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                      <Feather name="file-text" size={24} color="#8b5cf6" />
                    </View>
                    <Text style={[styles.modernButtonText, { color: colors.text }]}>Resume</Text>
                    <Text style={[styles.modernButtonSubtext, { color: colors.textSecondary }]}>Manage CV</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Save/Cancel Buttons (only when editing) */}
        {isEditing && (
          <View style={styles.editButtonsContainer}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
              onPress={handleCancelEdit}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom Navigation - Hidden during editing */}
        {!isEditing && (
          <View style={styles.bottomNavContainer}>
            <View style={styles.bottomNavCapsule}>
              <TouchableOpacity
                style={styles.navItem}
                onPress={() => router.back()}
                activeOpacity={0.7}
                delayPressIn={0}
              >
                <Feather
                  name="home"
                  size={26}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => router.push('/(tabs)/post')}
                activeOpacity={0.7}
                delayPressIn={0}
              >
                <View style={styles.postButton}>
                  <Feather name="plus-circle" size={26} color={'#fff'} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navItem, styles.activeNavItem]}
                onPress={() => { }} // Already on profile, no action needed
                activeOpacity={0.7}
                delayPressIn={0}
              >
                <Feather
                  name="user"
                  size={26}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Share Profile Modal */}
        <ShareBottomSheet
          visible={showShareModal}
          onClose={() => setShowShareModal(false)}
          shareType="profile"
          data={{
            id: user.id,
            username: userInfo.username,
            name: userInfo.name
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors: any, colorScheme: 'light' | 'dark') => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.brandBackground,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 6,
    backgroundColor: colors.brandBackground,
  },
  leftContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
  },
  rightContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
  },
  appName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.text,
  },
  iconButton: {
    padding: 4,
  },
  settingsButton: {
    padding: 4,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
    alignItems: 'center',
  },
  profileSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginHorizontal: 20,
    borderRadius: 24,
    marginTop: 16,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
    overflow: 'hidden',
    width: '90%',
    alignSelf: 'center',
  },
  profileImageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    width: '100%',
    alignSelf: 'center',
    padding: 8,
    borderRadius: 50,
    backgroundColor: colors.cardAlt,
  },

  modernUserInfo: {
    marginBottom: 16,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8,
  },
  modernUserName: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
    marginTop: 12,
    marginBottom: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  modernUsername: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 8,
    textShadowColor: 'rgba(107, 70, 193, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  usernameEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },
  usernameEditContainerAvailable: {
    borderColor: '#059669',
    backgroundColor: '#f0fdf4',
  },
  usernameEditContainerUnavailable: {
    borderColor: '#dc2626',
    backgroundColor: colors.cardAlt,
  },
  usernameEditContainerDisabled: {
    borderColor: colors.textSecondary,
    backgroundColor: colors.cardAlt,
    opacity: 0.6,
  },
  usernameLimitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 8,
  },
  usernameLimitText: {
    fontSize: 13,
    color: '#92400e',
    fontWeight: '500',
  },

  usernamePrefix: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
    marginRight: 4,
  },
  usernameInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  usernameDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  usernameDisplayText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
    marginLeft: 4,
  },
  usernameNoteText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },

  widerBioContainer: {
    backgroundColor: colors.cardAlt,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 8,
    width: '95%',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
  },
  modernBio: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '500',
  },
  modernEditContainer: {
    marginTop: 8,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  editField: {
    marginBottom: 16,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  modernInput: {
    fontSize: 16,
    color: colors.text,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.cardAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modernSkillsSection: {
    marginTop: 12,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
  },
  skillsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modernSkillsLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 8,
  },
  modernSkillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'flex-start',
  },
  modernSkillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    maxWidth: '100%',
    flexShrink: 1,
  },
  modernSkillText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginRight: 6,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  skillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3b82f6',
  },
  skillsSection: {
    marginTop: 8,
    width: '100%',
    marginBottom: 6,
  },
  skillsLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'left',
    flexDirection: 'row',
    alignItems: 'center',
  },
  skillsContainer: {
    flexDirection: 'column',
    gap: 12,
    width: '100%',
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillTag: {
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    position: 'relative',
    marginRight: 6,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  skillText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptySkillsContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: colors.cardAlt,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  emptySkillsIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptySkillsTitle: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySkillsSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  addSkillsButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 16,
  },
  addSkillsButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  removeSkillButton: {
    position: 'absolute',
    right: -6,
    top: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  addSkillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    marginRight: 8,
  },
  addSkillInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 4,
    paddingHorizontal: 0,
    fontWeight: '500',
  },
  addSkillButton: {
    padding: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#000',
    marginVertical: 20,
    marginHorizontal: 16,
  },
  modernActionSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modernButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  modernActionButton: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 12,
  },
  buttonIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  modernButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  modernButtonSubtext: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
  editButtonsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.cardAlt,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.textSecondary,
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#8b5cf6',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
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

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.brandBackground,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  shareModalContainer: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  shareModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  shareModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  closeModalButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.cardAlt,
  },
  shareOptions: {
    gap: 16,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  shareIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  shareOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  shareOptionSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  // Skills Suggestions Styles
  suggestionsWrapper: {
    marginTop: 16,
    paddingHorizontal: 4,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 9999,
  },
  suggestionsContainer: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  skillsSuggestionsContainer: {
    marginTop: 12,
    paddingHorizontal: 4,
    zIndex: 9999,
    elevation: 9999,
    position: 'relative',
  },
  suggestionsLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  suggestionsScrollView: {
    maxHeight: 100,
    zIndex: 9999,
    elevation: 9999,
  },
  suggestionsContent: {
    paddingRight: 16,
    paddingLeft: 4,
  },
  skillSuggestion: {
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    minWidth: 100,
    maxWidth: 200,
    flexShrink: 0,
    borderLeftWidth: 3,
    borderLeftColor: '#8b5cf6',
  },
  skillSuggestionText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
}); 
