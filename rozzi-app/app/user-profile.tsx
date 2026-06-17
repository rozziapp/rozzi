import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCustomFonts } from '@/hooks/fonts';
import { router, useLocalSearchParams } from 'expo-router';
import { useBackHandler } from '@/hooks/useBackHandler';
import ProfilePicture from '@/components/ProfilePicture';
import API from '@/utils/api';
import { useBlockUser } from '@/hooks/useBlockUser';
import { useChat } from '@/contexts/ChatContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ShareBottomSheet from '@/components/ShareBottomSheet';

interface UserProfile {
  id: number;
  username: string;
  full_name: string;
  profile_picture?: string;
  profile?: {
    bio?: string;
    skills?: string[];
  };
  created_at: string;
  job_count: number;
  application_count: number;
}

export default function UserProfileScreen() {
  const { colors, colorScheme } = useAppTheme();
  const { user } = useAuth();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useCustomFonts();
  const { userId } = useLocalSearchParams();
  const userIdString = Array.isArray(userId) ? userId[0] : userId;
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { blockUser } = useBlockUser();
  const { createOrGetConversation } = useChat();

  // Handle back button - navigate to previous screen
  useBackHandler({
    targetRoute: '/(tabs)'
  });

  useEffect(() => {
    if (userIdString) {
      fetchUserProfile();
      fetchUserPosts();
      checkFollowStatus();
      checkBlockStatus();
    }
  }, [userIdString]);

  const fetchUserProfile = async () => {
    if (!userIdString) return;

    try {
      setLoading(true);
      setError(null);

      const response = await API.get(`/users/${userIdString}/profile/`);

      if (response.status === 200 && response.data) {
        setUserProfile(response.data);
      } else {
        setError('Failed to load user profile');
      }
    } catch (error: any) {
      console.error('Error fetching user profile:', error);

      if (error.response?.status === 404) {
        setError('User not found');
      } else if (error.response?.status === 400) {
        setError('Cannot view your own profile here. Use the profile tab instead.');
      } else {
        setError('Failed to load user profile. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    if (!userIdString) return;

    try {
      const response = await API.get(`/jobs/?user=${userIdString}`);

      if (response.status === 200 && response.data && response.data.results) {
        // Filter to only show open jobs and looking posts
        const posts = response.data.results.filter((post: any) => {
          // Compare against resolved numeric profile ID, or username, or original param
          const matchesUser =
            (userProfile && post.user?.id === userProfile.id) ||
            post.user?.id == userIdString ||
            post.user?.username === userIdString;
          return post.status === 'Open' &&
            (post.post_type === 'hire' || post.post_type === 'looking') &&
            matchesUser;
        });

        setUserPosts(posts);
      }
    } catch (error: any) {
      console.error('Error fetching user posts:', error);
      setUserPosts([]);
    }
  };

  const checkFollowStatus = async () => {
    if (!userIdString) return;

    try {
      const response = await API.get(`/users/${userIdString}/follow-status/`);

      if (response.status === 200 && response.data) {
        setIsFollowing(response.data.is_following);
      }
    } catch (error: any) {
      console.error('Error checking follow status:', error);
      setIsFollowing(false);
    }
  };

  const checkBlockStatus = async () => {
    if (!userIdString) return;

    try {
      console.log(`🔄 Checking block status for user: ${userIdString}`);
      const response = await API.get(`/users/${userIdString}/block-status/`);

      if (response.status === 200 && response.data) {
        const isBlockedStatus = response.data.is_blocked;
        console.log(`✅ Block status received: ${isBlockedStatus}`);
        setIsBlocked(isBlockedStatus);
      } else {
        console.warn('⚠️ Unexpected block status response:', response.status, response.data);
        setIsBlocked(false);
      }
    } catch (error: any) {
      console.error('❌ Error checking block status:', error);
      if (error.response?.status === 404) {
        console.log('ℹ️ User not found, setting block status to false');
      } else if (error.response?.status === 401) {
        console.log('ℹ️ Unauthorized, setting block status to false');
      }
      setIsBlocked(false);
    }
  };

  const handleFollow = async () => {
    if (!userIdString || followLoading) return;

    // Prevent following blocked users
    if (isBlocked) {
      Alert.alert('Cannot Follow', 'You cannot follow a user you have blocked.');
      return;
    }

    try {
      setFollowLoading(true);

      // Both follow and unfollow use POST - the backend handles the logic
      const response = await API.post(`/users/${userIdString}/follow/`);

      if (response.status === 200 || response.status === 201) {
        // Update the follow status based on backend response
        setIsFollowing(response.data.is_following);
      }
    } catch (error: any) {
      console.error('Error handling follow:', error);

      // Handle specific blocking errors
      if (error.response?.data?.error) {
        const errorMessage = error.response.data.error;
        if (errorMessage.includes('blocked')) {
          Alert.alert('Cannot Follow', errorMessage);
          // Refresh block status
          checkBlockStatus();
          return;
        }
      }

      const action = isFollowing ? 'unfollow' : 'follow';
      Alert.alert('Error', `Failed to ${action} user. Please try again.`);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!userProfile) return;

    // Check if user is blocked before allowing message
    if (isBlocked) {
      Alert.alert('Cannot Send Message', 'You cannot send messages to a user you have blocked.');
      return;
    }

    try {
      // Create or get existing conversation
      const conversation = await createOrGetConversation(userProfile.id.toString());

      if (conversation) {
        // Navigate to chat with conversation details
        router.push(`/chat?conversationId=${conversation.id}&userId=${userProfile.id}`);
      } else {
        Alert.alert('Error', 'Unable to start conversation. Please try again.');
      }
    } catch (error: any) {
      console.error('Error starting conversation:', error);

      // Handle specific blocking errors
      if (error.response?.data?.error) {
        const errorMessage = error.response.data.error;
        if (errorMessage.includes('blocked')) {
          Alert.alert('Cannot Send Message', errorMessage);
          // Refresh block status
          checkBlockStatus();
          return;
        }
      }

      Alert.alert('Error', 'Unable to start conversation. Please try again.');
    }
  };

  const handleOpenBlockModal = () => {
    setShowOptionsModal(true);
  };

  const handleBlockUser = async () => {
    if (!userIdString || blockLoading) return;

    try {
      setBlockLoading(true);
      setShowOptionsModal(false);

      console.log(`🔄 Starting block/unblock operation for user: ${userProfile?.username} (ID: ${userIdString})`);
      console.log(`🔄 Current block status: ${isBlocked}`);

      // Use the new blocking system that works offline
      const success = await blockUser({ userId: userIdString, username: userProfile?.username || 'User' });

      if (success) {
        // Toggle the block status
        const newBlockStatus = !isBlocked;
        setIsBlocked(newBlockStatus);

        console.log(`✅ Block status updated successfully: ${newBlockStatus}`);

        // Show success message
        const action = newBlockStatus ? 'blocked' : 'unblocked';
        Alert.alert('Success', `User has been ${action} successfully.`);

        // Refresh the block status from the server to ensure consistency
        setTimeout(() => {
          checkBlockStatus();
        }, 500);
      } else {
        console.error('❌ Block/unblock operation failed');
        Alert.alert('Error', 'Failed to block/unblock user. Please try again.');
      }
    } catch (error: any) {
      console.error('Error handling block:', error);
      const action = isBlocked ? 'unblock' : 'block';
      Alert.alert('Error', `Failed to ${action} user. Please try again.`);
    } finally {
      setBlockLoading(false);
    }
  };

  const handleReportUser = () => {
    setShowOptionsModal(false);
    Alert.alert('Report User', 'User reporting functionality will be implemented soon!');
  };

  const handleShare = () => {
    if (userProfile) {
      setShareSheetVisible(true);
    }
  };



  if (!fontsLoaded) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text style={styles.errorTitle}>Error Loading Profile</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchUserProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!userProfile) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="person-outline" size={64} color={colors.textSecondary} />
        <Text style={styles.errorTitle}>Profile Not Found</Text>
        <Text style={styles.errorMessage}>The user profile you're looking for doesn't exist.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 6, 30) }]}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerShareButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBlockButton} onPress={handleOpenBlockModal}>
            <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <View style={styles.profileImageContainer}>
              <ProfilePicture
                size={120}
                showLongPress={false}
                imageUrl={userProfile.profile_picture}
                noBorder={false}
              />
            </View>

            <Text style={styles.userName}>{userProfile.full_name}</Text>
            <Text style={styles.userUsername}>@{userProfile.username}</Text>

            {/* Bio Section - Show bio if available, placeholder if not */}
            <View style={styles.bioContainer}>
              {userProfile.profile?.bio && userProfile.profile.bio.trim() !== '' ? (
                <Text style={styles.userBio}>{userProfile.profile.bio}</Text>
              ) : (
                <View style={styles.noBioContainer}>
                  <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
                  <Text style={styles.noBioText}>No bio added yet</Text>
                </View>
              )}
            </View>

            {/* Block Status Indicator */}
            {isBlocked && (
              <View style={styles.blockedStatusContainer}>
                <Ionicons name="ban-outline" size={20} color="#ef4444" />
                <Text style={styles.blockedStatusText}>
                  You have blocked this user. They cannot see your profile or send you messages.
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.followButton,
                  isFollowing && styles.followingButton,
                  isBlocked && styles.blockedButton
                ]}
                onPress={handleFollow}
                disabled={followLoading || isBlocked}
              >
                {followLoading ? (
                  <ActivityIndicator size="small" color={isFollowing ? "#8b5cf6" : "#8b5cf6"} />
                ) : (
                  <Ionicons
                    name={isFollowing ? "checkmark-circle" : "add-circle-outline"}
                    size={20}
                    color={isFollowing ? "#8b5cf6" : "#8b5cf6"}
                  />
                )}
                <Text style={[
                  styles.followButtonText,
                  isFollowing && styles.followingButtonText
                ]}>
                  {isBlocked ? 'Blocked' : (isFollowing ? 'Following' : 'Follow')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.messageButton,
                  isBlocked && styles.blockedMessageButton
                ]}
                onPress={handleMessage}
                disabled={isBlocked}
              >
                <Ionicons name="chatbubble-outline" size={20} color={isBlocked ? "#9ca3af" : "#fff"} />
                <Text style={[
                  styles.messageButtonText,
                  isBlocked && styles.blockedMessageButtonText
                ]}>
                  {isBlocked ? 'Blocked' : 'Message'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Skills Section - Enhanced with better conditional rendering */}
        <View style={styles.skillsSection}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="bulb-outline" size={20} color="#8b5cf6" style={{ marginRight: 8 }} />
            Skills & Expertise
          </Text>



          {userProfile.profile?.skills && Array.isArray(userProfile.profile.skills) && userProfile.profile.skills.length > 0 && userProfile.profile.skills.some((skill: string) => skill && skill.trim() !== '') ? (
            <View style={styles.skillsList}>
              {userProfile.profile.skills.filter((skill: string) => skill && skill.trim() !== '').map((skill, index) => (
                <View key={index} style={styles.skillTag}>
                  <Ionicons name="checkmark-circle" size={16} color="#10b981" style={{ marginRight: 6 }} />
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noSkillsContainer}>
              <Ionicons name="school-outline" size={24} color={colors.textSecondary} />
              <Text style={styles.noSkillsText}>No skills added yet</Text>
              <Text style={styles.noSkillsSubtext}>This user hasn't added their skills yet</Text>
            </View>
          )}
        </View>



        {/* User Posts Section */}
        {userPosts.length > 0 && (
          <View style={styles.postsSection}>
            <Text style={styles.sectionTitle}>Posts by {userProfile.full_name}</Text>
            {userPosts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.postCard}
                onPress={() => {
                  const isLookingPost = post.post_type === 'looking';
                  if (!isLookingPost) {
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
                  }
                  router.push(`/job-application?jobId=${post.id}&jobTitle=${post.title}&isLookingPost=${isLookingPost}&posterName=${userProfile.full_name}`);
                }}
              >
                <View style={styles.postHeader}>
                  <View style={styles.postTypeBadge}>
                    <Text style={styles.postTypeText}>
                      {post.post_type === 'hire' ? 'Hiring' : 'Looking'}
                    </Text>
                  </View>
                  <Text style={styles.postTime}>
                    {new Date(post.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.postTitle}>{post.title}</Text>
                <Text style={styles.postDescription} numberOfLines={2}>
                  {post.description}
                </Text>
                <View style={styles.postFooter}>
                  <View style={styles.postLocation}>
                    <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.postLocationText} numberOfLines={1}>{post.location}</Text>
                  </View>
                  {post.salary_min && post.salary_max && (
                    <View style={styles.postSalary}>
                      <Ionicons name="cash-outline" size={16} color={colors.textSecondary} />
                      <Text style={styles.postSalaryText} numberOfLines={1}>
                        ₹{post.salary_min.toLocaleString()} - ₹{post.salary_max.toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>

              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* No Posts Message */}
        {userPosts.length === 0 && (
          <View style={styles.noPostsContainer}>
            <Ionicons name="briefcase-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.noPostsTitle}>No Posts Yet</Text>
            <Text style={styles.noPostsMessage}>
              This user hasn't posted any jobs or looking posts yet.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Modern Options Modal */}
      <Modal
        visible={showOptionsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsModal(false)}
        >
          <View style={styles.optionsModal}>
            <View style={styles.optionsHeader}>
              <Text style={styles.optionsTitle}>Options</Text>
              <TouchableOpacity
                onPress={() => setShowOptionsModal(false)}
                style={styles.closeOptionsButton}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.optionItem}
              onPress={handleBlockUser}
              disabled={blockLoading}
            >
              {blockLoading ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <Ionicons name="ban-outline" size={20} color="#ef4444" />
              )}
              <Text style={styles.optionTextDestructive}>
                {isBlocked ? 'Unblock User' : 'Block User'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionItem}
              onPress={handleReportUser}
            >
              <Ionicons name="flag-outline" size={20} color="#ef4444" />
              <Text style={styles.optionTextDestructive}>Report User</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => setShowOptionsModal(false)}
            >
              <Ionicons name="close-circle-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.optionTextCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {userProfile && (
        <ShareBottomSheet
          visible={shareSheetVisible}
          onClose={() => setShareSheetVisible(false)}
          shareType="profile"
          data={{
            id: userProfile.id,
            username: userProfile.username,
            name: userProfile.full_name
          }}
        />
      )}
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.brandBackground,
  },
  header: {
    backgroundColor: colors.brandBackground,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 6,
  },
  headerBackButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  headerShareButton: {
    padding: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBlockButton: {
    padding: 4,
  },
  headerSpacer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: colors.card,
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
  profileHeader: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8,
  },
  bioContainer: {
    marginBottom: 16,
    width: '100%',
    maxWidth: 300,
  },
  noBioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.cardAlt,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  noBioText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  userName: {
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
  userUsername: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 18,
    textShadowColor: 'rgba(107, 70, 193, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  userBio: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
    maxWidth: 300,
    backgroundColor: colors.cardAlt,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  blockedStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 8,
  },
  blockedStatusText: {
    flex: 1,
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '500',
    lineHeight: 20,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  followButtonText: {
    color: '#8b5cf6',
    fontSize: 16,
    fontWeight: '600',
  },
  followingButton: {
    backgroundColor: colors.cardAlt,
    borderColor: colors.textSecondary,
    shadowColor: colors.textSecondary,
  },
  followingButtonText: {
    color: colors.textSecondary,
  },
  blockedButton: {
    backgroundColor: colors.cardAlt,
    borderColor: '#fecaca',
    shadowColor: '#fca5a5',
  },
  blockedMessageButton: {
    backgroundColor: colors.cardAlt,
    shadowColor: colors.textSecondary,
  },
  blockedMessageButtonText: {
    color: colors.textSecondary,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skillsSection: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  skillsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  skillTag: {
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
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
  },
  noSkillsContainer: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    gap: 12,
    backgroundColor: colors.cardAlt,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  noSkillsText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 12,
    marginBottom: 4,
  },
  noSkillsSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.brandBackground,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.brandBackground,
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    maxWidth: 300,
  },
  retryButton: {
    backgroundColor: colors.brandBackground,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: colors.textSecondary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  postsSection: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  postCard: {
    backgroundColor: colors.cardAlt,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  postTypeBadge: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  postTypeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  postTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  postDescription: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 12,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  postLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    minWidth: 0,
  },
  postLocationText: {
    fontSize: 12,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  postSalary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    minWidth: 0,
  },
  postSalaryText: {
    fontSize: 12,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  noPostsContainer: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 32,
    marginHorizontal: 20,
    marginTop: 20,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noPostsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  noPostsMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 250,
  },

  // Options Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsModal: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    width: '90%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  optionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  closeOptionsButton: {
    padding: 4,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    gap: 12,
  },
  optionTextDestructive: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ef4444',
  },
  optionTextCancel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
  },

}); 
