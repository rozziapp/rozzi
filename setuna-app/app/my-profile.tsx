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



export default function MyProfileScreen() {
  const [fontsLoaded] = useCustomFonts();
  const { user, isAuthenticated, isLoading, updateUserData } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [isLoadingFromCache, setIsLoadingFromCache] = useState(false); // Start as false to eliminate loading delay
  const [userInfo, setUserInfo] = useState<ProfileData>({
    name: "",
    username: "",
    bio: "",
    skills: [],
    profilePicture: null,
  });
  const [editableSkills, setEditableSkills] = useState<string[]>([]);
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
    // Clear all profile caches on initialization to ensure fresh data
    await clearAllProfileCaches();
    console.log('Profile caches cleared on initialization');


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
      const shareMessage = `Check out ${userInfo.name}'s profile on Setuna!\n\nUsername: @${userInfo.username}\nBio: ${userInfo.bio}\n\nConnect with them on our platform!`;

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
      const profileLink = `https://setuna.app/profile/${userInfo.username}`;
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

  // Reset profile state when user changes (new login)
  useEffect(() => {
    if (user) {
      console.log(`User changed to: ${user.username} (ID: ${user.id})`);
      // Reset profile state for new user
      setUserInfo({
        name: user.full_name || "",
        username: user.username || "",
        bio: "",
        skills: [],
        profilePicture: null,
      });
      setEditableSkills([]);
      setProfileLoaded(false);

      // Clear all profile caches to ensure fresh data
      clearAllProfileCaches();

      initializeProfile().catch(console.error);
    }
  }, [user?.id]); // Only trigger when user ID changes

  // Initialize profile data immediately on component mount
  useEffect(() => {
    if (user) {
      initializeProfile().catch(console.error);
    }
  }, []);

  // Note: Authentication redirect is handled by AuthContext to avoid navigation conflicts

  // Update user info when user data becomes available
  useEffect(() => {
    if (user) {
      // Update basic user info immediately if we don't have it already
      setUserInfo(prev => ({
        ...prev,
        name: user.full_name || prev.name || "",
        username: user.username || prev.username || "",
      }));

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

  // Initialize profile when component mounts
  useEffect(() => {
    if (user && !profileLoaded) {
      initializeProfile().catch(console.error);
    }
  }, [user, profileLoaded]);

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
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  // Don't render anything if not authenticated
  if (!isAuthenticated) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Redirecting to login...</Text>
      </View>
    );
  }

  // Safety check for when user is null
  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading user data...</Text>
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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.leftContainer}>
            <Text style={styles.appName}>Setuna</Text>
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
              <Feather name="edit-3" size={24} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => router.push('/settings')}
            >
              <Feather name="settings" size={24} color="#000" />
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
            contentContainerStyle={styles.scrollContent}
          >
            {/* Profile Info */}
            <View style={styles.profileSection}>
              <View style={styles.profileImageContainer}>
                <ProfilePicture
                  size={100}
                  userId={user?.id?.toString() || "current-user"}
                  imageUrl={userInfo.profilePicture || undefined}
                  onImageChange={handleProfilePictureChange}
                  noBorder={true}
                />
              </View>

              {isEditing ? (
                <View style={styles.modernEditContainer}>
                  <View style={styles.editField}>
                    <Text style={styles.editLabel}>Name</Text>
                    <TextInput
                      style={styles.modernInput}
                      value={userInfo.name}
                      onChangeText={(text) => setUserInfo(prev => ({ ...prev, name: text }))}
                      placeholder="Enter your name"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>

                  <View style={styles.editField}>
                    <Text style={styles.editLabel}>Username</Text>
                    <View style={styles.usernameDisplayContainer}>
                      <Text style={styles.usernamePrefix}>@</Text>
                      <Text style={styles.usernameDisplayText}>
                        {userInfo.username || "username"}
                      </Text>
                    </View>
                    <Text style={styles.usernameNoteText}>
                      Username is permanent and cannot be changed
                    </Text>
                  </View>

                  <View style={styles.editField}>
                    <Text style={styles.editLabel}>Bio</Text>
                    <TextInput
                      style={[styles.modernInput, styles.bioInput]}
                      value={userInfo.bio}
                      onChangeText={(text) => setUserInfo(prev => ({ ...prev, bio: text }))}
                      placeholder="Tell us about yourself..."
                      placeholderTextColor="#9ca3af"
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.modernUserInfo}>
                  <Text style={styles.modernUserName}>
                    {userInfo.name || "Your Name"}
                  </Text>
                  <TouchableOpacity onPress={() => setShowShareModal(true)}>
                    <Text style={styles.modernUsername}>
                      @{userInfo.username || "username"}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.widerBioContainer}>
                    <Text style={styles.modernBio}>
                      {userInfo.bio || "Add your bio here..."}
                    </Text>
                  </View>
                </View>
              )}

              {/* Skills Section - Hidden when editing */}
              {!isEditing && (
                <View style={styles.skillsSection}>
                  <Text style={styles.skillsLabel}>
                    <Ionicons name="bulb-outline" size={20} color="#8b5cf6" style={{ marginRight: 8 }} />
                    Skills
                  </Text>
                  {editableSkills.length > 0 ? (
                    <View style={styles.skillsContainer}>
                      <View style={styles.skillsGrid}>
                        {editableSkills.map((skill: string, index: number) => (
                          <View key={index} style={styles.skillTag}>
                            <Text style={styles.skillText}>
                              {skill}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : (
                    <View style={styles.emptySkillsContainer}>
                      <Ionicons name="school-outline" size={24} color="#9ca3af" />
                      <Text style={styles.emptySkillsTitle}>No Skills Added</Text>
                      <Text style={styles.emptySkillsSubtitle}>Add your skills to showcase your expertise</Text>
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
                  <Text style={styles.skillsLabel}>
                    <Ionicons name="bulb-outline" size={20} color="#8b5cf6" style={{ marginRight: 8 }} />
                    Skills
                  </Text>
                  <View style={styles.skillsContainer}>
                    <View style={styles.skillsGrid}>
                      {editableSkills.map((skill: string, index: number) => (
                        <View key={index} style={styles.skillTag}>
                          <Text style={styles.skillText}>
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
                    <View style={styles.addSkillContainer}>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="search" size={16} color="#9ca3af" style={styles.searchIcon} />
                        <TextInput
                          style={styles.addSkillInput}
                          placeholder="Type to search skills..."
                          placeholderTextColor="#9ca3af"
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
                        style={styles.addSkillButton}
                        onPress={addSkill}
                        disabled={!newSkill.trim()}
                      >
                        <Ionicons name="add" size={18} color={newSkill.trim() ? "#6b46c1" : "#d1d5db"} />
                      </TouchableOpacity>
                    </View>

                    {/* Skills Suggestions */}
                    {newSkill.length > 0 && (
                      <View style={styles.suggestionsWrapper}>
                        <Text style={styles.suggestionsLabel}>Suggestions:</Text>
                        <View style={styles.suggestionsContainer}>
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
                                  style={styles.skillSuggestion}
                                  onPress={() => addSkillFromSuggestion(suggestedSkill)}
                                >
                                  <Text style={styles.skillSuggestionText} numberOfLines={1}>
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
                    style={styles.modernActionButton}
                    onPress={() => router.push('/applied-jobs')}
                    delayPressIn={0}
                    activeOpacity={0.8}
                  >
                    <View style={styles.buttonIconContainer}>
                      <Feather name="briefcase" size={24} color="#3b82f6" />
                    </View>
                    <Text style={styles.modernButtonText}>Applied Jobs</Text>
                    <Text style={styles.modernButtonSubtext}>View applications</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modernActionButton}
                    onPress={() => router.push('/posted-jobs')}
                    delayPressIn={0}
                    activeOpacity={0.8}
                  >
                    <View style={styles.buttonIconContainer}>
                      <Feather name="plus-square" size={24} color="#10b981" />
                    </View>
                    <Text style={styles.modernButtonText}>Posted Jobs</Text>
                    <Text style={styles.modernButtonSubtext}>Manage postings</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modernActionButton}
                    onPress={() => router.push('/subscription')}
                    delayPressIn={0}
                    activeOpacity={0.8}
                  >
                    <View style={styles.buttonIconContainer}>
                      <Feather name="star" size={24} color="#f59e0b" />
                    </View>
                    <Text style={styles.modernButtonText}>Premium</Text>
                    <Text style={styles.modernButtonSubtext}>Upgrade plan</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modernActionButton}
                    onPress={() => router.push('/resume')}
                    delayPressIn={0}
                    activeOpacity={0.8}
                  >
                    <View style={styles.buttonIconContainer}>
                      <Feather name="file-text" size={24} color="#8b5cf6" />
                    </View>
                    <Text style={styles.modernButtonText}>Resume</Text>
                    <Text style={styles.modernButtonSubtext}>Manage CV</Text>
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
              style={styles.cancelButton}
              onPress={handleCancelEdit}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
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
                onPress={() => router.push('/(tabs)')}
                activeOpacity={0.7}
                delayPressIn={0}
              >
                <Feather
                  name="home"
                  size={26}
                  color={'#ffffff'}
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
                  color={'#ffffff'}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Share Profile Modal */}
        <Modal
          visible={showShareModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowShareModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.shareModalContainer}>
              <View style={styles.shareModalHeader}>
                <Text style={styles.shareModalTitle}>Share Profile</Text>
                <TouchableOpacity
                  onPress={() => setShowShareModal(false)}
                  style={styles.closeModalButton}
                >
                  <Feather name="x" size={24} color="#374151" />
                </TouchableOpacity>
              </View>

              <View style={styles.shareOptions}>
                <TouchableOpacity
                  style={styles.shareOption}
                  onPress={handleShareProfile}
                >
                  <View style={styles.shareIconContainer}>
                    <Feather name="share-2" size={24} color="#3b82f6" />
                  </View>
                  <Text style={styles.shareOptionText}>Share Profile</Text>
                  <Text style={styles.shareOptionSubtext}>Share via apps</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shareOption}
                  onPress={handleCopyProfileLink}
                >
                  <View style={styles.shareIconContainer}>
                    <Feather name="link" size={24} color="#10b981" />
                  </View>
                  <Text style={styles.shareOptionText}>Copy Link</Text>
                  <Text style={styles.shareOptionSubtext}>Copy profile URL</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#B0AAD9',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 6,
    backgroundColor: '#B0AAD9',
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
    color: '#000',
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
    backgroundColor: '#ffffff',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
    marginHorizontal: 20,
    borderRadius: 24,
    marginTop: 16,
    alignItems: 'center',
    shadowColor: '#6b46c1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    position: 'relative',
    overflow: 'hidden',
    width: '90%',
    alignSelf: 'center',
  },
  profileImageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    width: '100%',
    alignSelf: 'center',
    padding: 8,
    borderRadius: 50,
    backgroundColor: 'rgba(107, 70, 193, 0.05)',
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
    color: '#1e293b',
    marginTop: 12,
    marginBottom: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  modernUsername: {
    fontSize: 18,
    color: '#6b46c1',
    fontWeight: '600',
    marginBottom: 8,
    textShadowColor: 'rgba(107, 70, 193, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  usernameEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
  },
  usernameEditContainerAvailable: {
    borderColor: '#059669',
    backgroundColor: '#f0fdf4',
  },
  usernameEditContainerUnavailable: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  usernameEditContainerDisabled: {
    borderColor: '#d1d5db',
    backgroundColor: '#f3f4f6',
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
    color: '#6b7280',
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
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  usernameDisplayText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    marginLeft: 4,
  },
  usernameNoteText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },

  widerBioContainer: {
    backgroundColor: 'rgba(248, 250, 252, 0.95)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 8,
    width: '95%',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(107, 70, 193, 0.15)',
    shadowColor: '#6b46c1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
  },
  modernBio: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '500',
  },
  modernEditContainer: {
    marginTop: 8,
    backgroundColor: '#fff',
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
    color: '#374151',
    marginBottom: 8,
  },
  modernInput: {
    fontSize: 16,
    color: '#111827',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modernSkillsSection: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
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
    color: '#374151',
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
    color: '#475569',
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
    color: '#111827',
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
    backgroundColor: 'rgba(107, 70, 193, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(107, 70, 193, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    position: 'relative',
    marginRight: 6,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#6b46c1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  skillText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    textAlign: 'center',
  },
  emptySkillsContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(248, 250, 252, 0.9)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(107, 70, 193, 0.2)',
    borderStyle: 'dashed',
    marginTop: 8,
    shadowColor: '#6b46c1',
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
    color: '#9ca3af',
    fontWeight: '500',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySkillsSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
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
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
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
    color: '#374151',
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
    backgroundColor: '#ffffff',
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
    backgroundColor: '#ffffff',
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
    color: '#1e293b',
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
    backgroundColor: '#f3f4f6',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    color: '#374151',
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
    backgroundColor: 'rgba(76, 66, 97, 0.9)', // Semi-transparent purple matching theme
    borderRadius: 50,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginHorizontal: 12,
    minWidth: 280,
    height: 64,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)', // White border for contrast
    shadowColor: '#6b46c1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // White background for active state
    borderRadius: 24,
  },

  postButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6b46c1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#B0AAD9',
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
    backgroundColor: '#fff',
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
    color: '#1f2937',
  },
  closeModalButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
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
    backgroundColor: '#fff',
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
    color: '#1f2937',
    flex: 1,
  },
  shareOptionSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  // Skills Suggestions Styles
  suggestionsWrapper: {
    marginTop: 16,
    paddingHorizontal: 4,
    backgroundColor: '#ffffff',
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
    color: '#1f2937',
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
    backgroundColor: '#ffffff',
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
    color: '#374151',
    fontWeight: '600',
    textAlign: 'center',
  },
}); 
