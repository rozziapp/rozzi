import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Pressable,
  Modal,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProfilePicture from '@/components/ProfilePicture';
import { router } from 'expo-router';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import API from '@/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Global variable to persist scroll position across re-renders
let globalInboxScrollY = 0;


// Interface for real notifications from backend
interface Notification {
  id: number;
  sender: {
    id: number;
    username: string;
    full_name: string;
    profile_picture?: string;
  } | null;
  recipient: {
    id: number;
    username: string;
    full_name: string;
    profile_picture?: string;
  };
  notification_type: string;
  title: string;
  message: string;
  related_job?: any;
  related_application?: any;
  related_hire_request?: any;
  read: boolean;
  created_at: string;
  time_ago: string;
}

// Interface for real messages from chat context
interface Message {
  id: string;
  participants: string[];
  lastMessage?: {
    text: string;
    timestamp: Date;
  };
  unreadCount: number;
}

// Utility function to calculate time difference
const calculateTimeAgo = (createdAt: string): string => {
  const now = new Date();
  const created = new Date(createdAt);
  const diffInMs = now.getTime() - created.getTime();

  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} min ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  } else if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
  } else if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
  } else {
    return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
  }
};

// Enhanced time formatting for better readability
const formatTimeDisplay = (createdAt: string): string => {
  const now = new Date();
  const created = new Date(createdAt);
  const diffInMs = now.getTime() - created.getTime();

  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  // For very recent notifications (within last hour), show more precise time
  if (diffInMinutes < 60) {
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 5) {
      return `${diffInMinutes} min ago`;
    } else if (diffInMinutes < 30) {
      return `${diffInMinutes} min ago`;
    } else {
      return `${diffInMinutes} min ago`;
    }
  }

  // For today's notifications, show time
  if (diffInDays < 1) {
    if (diffInHours < 2) {
      return `${diffInHours} hour ago`;
    } else {
      return `${diffInHours} hours ago`;
    }
  }

  // For older notifications, show date
  if (diffInDays === 1) {
    return 'Yesterday';
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  } else {
    const years = Math.floor(diffInDays / 365);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  }
};

export default function InboxScreen() {
  const { colors, colorScheme } = useAppTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const {
    conversations = [],
    fetchConversations,
    markAsRead,
    isLoading: chatLoading,
    createOrGetConversation
  } = useChat();

  // Get current user from auth context
  const { user: currentUser } = useAuth();

  // Calculate total unread messages
  const totalUnreadMessages = conversations.reduce((total, conversation) => total + conversation.unread_count, 0);

  const [activeTab, setActiveTab] = useState<'notifications' | 'messages'>('messages');
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitialMessagesLoad, setIsInitialMessagesLoad] = useState(true);


  const scrollViewRef = useRef<ScrollView>(null);

  // Calculate unread notifications
  const unreadNotificationCount = notifications.filter(n => !n.read).length;

  // New conversation functionality
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  // Notification settings state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [notificationTypes, setNotificationTypes] = useState({
    job_updates: true,      // Combined: job_hired, job_rejected, job_shortlisted
    job_applications: true, // Combined: job_applied, hire_request
    hire_responses: true,   // Combined: hire_accepted, hire_rejected
    social: true,           // Combined: follow, application_status
  });

  // Skeleton pulse animation
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    const shouldAnimate = chatLoading || loading;
    
    if (shouldAnimate) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.8,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    }
    return () => {
      if (animation) {
        animation.stop();
      }
    };
  }, [chatLoading, loading]);

  const renderConversationSkeleton = () => {
    return (
      <Animated.View style={{ opacity: pulseAnim }}>
        {[1, 2, 3, 4].map((key) => (
          <View key={key} style={[styles.messageCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, padding: 16, marginBottom: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }]}>
            {/* Avatar Circle */}
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.cardAlt, marginRight: 12 }} />
            {/* Content Lines */}
            <View style={{ flex: 1 }}>
              {/* Title / Name */}
              <View style={{ width: '45%', height: 16, borderRadius: 8, backgroundColor: colors.cardAlt, marginBottom: 8 }} />
              {/* Message excerpt */}
              <View style={{ width: '75%', height: 14, borderRadius: 7, backgroundColor: colors.cardAlt }} />
            </View>
          </View>
        ))}
      </Animated.View>
    );
  };

  const renderNotificationSkeleton = () => {
    return (
      <Animated.View style={{ opacity: pulseAnim }}>
        {[1, 2, 3, 4].map((key) => (
          <View key={key} style={[styles.notificationCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, padding: 16, marginBottom: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }]}>
            {/* Avatar Circle */}
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.cardAlt, marginRight: 12 }} />
            {/* Content Lines */}
            <View style={{ flex: 1 }}>
              <View style={{ width: '35%', height: 14, borderRadius: 7, backgroundColor: colors.cardAlt, marginBottom: 8 }} />
              <View style={{ width: '90%', height: 14, borderRadius: 7, backgroundColor: colors.cardAlt }} />
            </View>
          </View>
        ))}
      </Animated.View>
    );
  };



  useEffect(() => {
    const load = async () => {
      setIsInitialMessagesLoad(true);
      await fetchConversations();
      setIsInitialMessagesLoad(false);
    };
    load();
    if (currentUser?.id) {
      fetchNotifications();
      loadNotificationPreferences();
    }
  }, [currentUser?.id]);


  // Refresh notifications when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (currentUser?.id) {
        fetchNotifications();
      }
    }, [currentUser?.id])
  );

  // Auto-refresh time calculations every minute for real-time updates
  useEffect(() => {
    if (currentUser?.id && notifications.length > 0) {
      const interval = setInterval(() => {
        setNotifications(prev =>
          prev.map(notification => ({
            ...notification,
            time_ago: formatTimeDisplay(notification.created_at)
          }))
        );
      }, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [currentUser?.id, notifications.length]);

  const fetchNotifications = async () => {
    try {
      // Only show loading if we have no notifications yet, to prevent scroll jumping
      if (notifications.length === 0) {
        setLoading(true);
      }

      // Fetch backend notifications
      let backendNotifications: Notification[] = [];
      try {
        const response = await API.get('/notifications/');
        backendNotifications = response.data.results || response.data || [];

        // Update time_ago for backend notifications to show real-time differences
        if (currentUser?.id) {
          backendNotifications = backendNotifications.map(notification => ({
            ...notification,
            time_ago: formatTimeDisplay(notification.created_at)
          }));
        }
      } catch (error) {
        console.error('Error fetching backend notifications:', error);
        backendNotifications = [];
      }

      // Sort notifications (newest first)
      backendNotifications.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });

      setNotifications(backendNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const markNotificationAsRead = async (notificationId: number) => {
    try {
      // Check if it's a local notification (has decimal in ID)
      if (notificationId.toString().includes('.')) {
        // Local notification - update in AsyncStorage
        const localData = await AsyncStorage.getItem('localNotifications');
        if (localData) {
          const localNotifications = JSON.parse(localData);
          const updatedNotifications = localNotifications.map((notif: any) =>
            notif.id === notificationId ? { ...notif, read: true } : notif
          );
          await AsyncStorage.setItem('localNotifications', JSON.stringify(updatedNotifications));
        }
      } else {
        // Backend notification - update via API
        await API.patch(`/notifications/${notificationId}/`, { read: true });
      }

      // Update local state
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await API.patch('/notifications/mark-all-read/');
      // Update local state
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );
      setShowSettingsModal(false);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Auto-mark notifications as read when tab is opened
  useEffect(() => {
    if (activeTab === 'notifications' && unreadNotificationCount > 0) {
      const timer = setTimeout(() => {
        markAllNotificationsAsRead();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [activeTab, unreadNotificationCount]);

  const toggleNotificationType = (type: string) => {
    const newSettings = {
      ...notificationTypes,
      [type]: !notificationTypes[type as keyof typeof notificationTypes]
    };
    setNotificationTypes(newSettings);
    saveNotificationPreferences(newSettings);
  };

  const saveNotificationPreferences = async (preferences: typeof notificationTypes) => {
    try {
      // Save to AsyncStorage for persistence
      await AsyncStorage.setItem('notificationPreferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving notification preferences:', error);
    }
  };

  const loadNotificationPreferences = async () => {
    try {
      const preferences = await AsyncStorage.getItem('notificationPreferences');
      if (preferences) {
        setNotificationTypes(JSON.parse(preferences));
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchingUsers(true);
      const response = await API.get(`/users/search/?q=${encodeURIComponent(query.trim())}`);
      const users = response.data?.results || response.data || [];
      setSearchResults(users);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setSearchingUsers(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (userSearchQuery.length >= 2) {
        searchUsers(userSearchQuery);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [userSearchQuery]);

  const startConversation = async (userId: string, userName: string) => {
    try {
      const conversation = await createOrGetConversation(userId);
      if (conversation) {
        router.push(`/chat?conversationId=${conversation.id}&userId=${userId}`);
        setShowNewMessageModal(false);
        setUserSearchQuery('');
        setSearchResults([]);
      } else {
        Alert.alert('Error', 'Unable to start conversation. Please try again.');
      }
    } catch (error: any) {
      console.error('Error starting conversation:', error);
      if (error.response?.data?.error) {
        const errorMessage = error.response.data.error;
        if (errorMessage.includes('blocked')) {
          Alert.alert('Cannot Send Message', errorMessage);
          return;
        }
      }
      Alert.alert('Error', 'Failed to start conversation. Please try again.');
    }
  };

  const resetNotificationPreferences = async () => {
    const defaultPreferences = {
      job_updates: true,
      job_applications: true,
      hire_responses: true,
      social: true,
    };
    setNotificationTypes(defaultPreferences);
    await saveNotificationPreferences(defaultPreferences);
    Alert.alert('Success', 'Notification preferences reset to default');
  };

  const getFilteredNotifications = () => {
    return notifications.filter(notification => {
      const notificationType = notification.notification_type;
      if (['job_hired', 'job_rejected', 'job_shortlisted'].includes(notificationType)) {
        return notificationTypes.job_updates;
      } else if (['job_applied', 'hire_request'].includes(notificationType)) {
        return notificationTypes.job_applications;
      } else if (['hire_accepted', 'hire_rejected'].includes(notificationType)) {
        return notificationTypes.hire_responses;
      } else if (['follow', 'application_status'].includes(notificationType)) {
        return notificationTypes.social;
      }
      return true;
    });
  };

  const filteredConversations = (conversations || []).filter(conversation => {
    if (!searchQuery) return true;
    const otherParticipant = conversation.other_participant;
    const participantName = otherParticipant?.full_name || otherParticipant?.username || '';
    const lastMessageContent = conversation.last_message?.content || '';
    return participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lastMessageContent.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const formatTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };



  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'job_hired':
      case 'hire_accepted':
        return '#10b981'; // Green for success
      case 'job_rejected':
      case 'hire_rejected':
        return '#ef4444'; // Red for rejection
      case 'job_shortlisted':
        return '#f59e0b'; // Orange for shortlisted
      case 'job_applied':
      case 'hire_request':
        return '#3b82f6'; // Blue for new requests
      case 'application_status':
        return '#f59e0b'; // Orange for updates
      default:
        return '#6b7280'; // Gray for default
    }
  };



  return (
    <View style={[styles.container, { backgroundColor: colors.brandBackground }]}>
      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.brandBackground, paddingTop: Math.max(insets.top + 6, 30) }]}>
        <View style={styles.leftContainer}>
          <TouchableOpacity
            style={[styles.iconButton, { marginRight: 12 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colorScheme === 'dark' ? '#fff' : '#000'} />
          </TouchableOpacity>
          <Text style={[styles.appName, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>Inbox</Text>
        </View>
        <View style={styles.rightContainer}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowSettingsModal(true)}
          >
            <Ionicons name="settings-outline" size={20} color={colorScheme === 'dark' ? '#fff' : '#000'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Toggle Buttons */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            activeTab === 'messages' && [styles.activeToggleButton, { backgroundColor: colors.card }]
          ]}
          onPress={() => setActiveTab('messages')}
        >
          <Text style={[
            styles.toggleText, { color: colors.textSecondary },
            activeTab === 'messages' && [styles.activeToggleText, { color: colors.primary }]
          ]}>
            Messages
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            activeTab === 'notifications' && [styles.activeToggleButton, { backgroundColor: colors.card }]
          ]}
          onPress={() => setActiveTab('notifications')}
        >
          <Text style={[
            styles.toggleText, { color: colors.textSecondary },
            activeTab === 'notifications' && [styles.activeToggleText, { color: colors.primary }]
          ]}>
            Notifications
          </Text>
          {unreadNotificationCount > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{unreadNotificationCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search Bar for Messages */}
      {activeTab === 'messages' && (
        <>
          {/* New Message Button */}
          <View style={styles.newMessageContainer}>
            <TouchableOpacity
              style={styles.newMessageButton}
              onPress={() => setShowNewMessageModal(true)}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.newMessageButtonText}>New Message</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
            <Ionicons name="search" size={16} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search contacts..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </>
      )}

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentOffset={{ x: 0, y: globalInboxScrollY }}
        scrollEventThrottle={16}
        onScroll={(event) => {
          globalInboxScrollY = event.nativeEvent.contentOffset.y;
        }}
      >
        {activeTab === 'notifications' ? (
          /* Notifications Tab */
          <View style={styles.notificationsContainer}>
            {loading ? (
              renderNotificationSkeleton()
            ) : (!getFilteredNotifications() || getFilteredNotifications().length === 0) ? (
              <View style={styles.emptyState}>
                <View style={[styles.iconContainer, { backgroundColor: colors.brandBackground }]}>
                  <Ionicons name="notifications-off-outline" size={32} color={colors.primary} />
                </View>
                <Text style={styles.emptyStateText}>
                  {notifications.length === 0 ? 'No notifications yet' : 'No notifications match your filters'}
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  {notifications.length === 0
                    ? 'Stay updated with job applications, responses, and professional opportunities'
                    : 'Try adjusting your notification preferences in settings'
                  }
                </Text>
              </View>
            ) : (
              getFilteredNotifications().map((notification) => (
                <Pressable
                  key={notification.id}
                  style={[
                    styles.notificationCard,
                    { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
                    !notification.read && styles.unreadNotification,
                    { borderLeftColor: getNotificationColor(notification.notification_type) }
                  ]}
                  onPress={() => markNotificationAsRead(notification.id)}
                >
                  <View style={styles.notificationHeader}>
                    <TouchableOpacity
                      style={styles.userImage}
                      onPress={() => router.push(`/user-profile?userId=${notification.sender?.id || notification.recipient.id}`)}
                    >
                      <ProfilePicture
                        size={40}
                        showLongPress={false}
                        imageUrl={notification.sender?.profile_picture || notification.recipient.profile_picture}
                        noBorder={true}
                      />
                    </TouchableOpacity>
                    <View style={styles.notificationContent}>
                      <View style={styles.notificationTop}>
                        <TouchableOpacity
                          onPress={() => router.push(`/user-profile?userId=${notification.sender?.id || notification.recipient.id}`)}
                        >
                          <Text style={[styles.userName, { color: getNotificationColor(notification.notification_type) }]}>
                            {notification.sender?.full_name || notification.sender?.username || 'System'}
                          </Text>
                        </TouchableOpacity>
                        <Text style={[styles.timeText, { color: colors.textSecondary }]}>{notification.time_ago}</Text>
                      </View>
                      <Text style={[styles.notificationMessage, { color: colors.text }]}>{notification.message}</Text>
                    </View>

                  </View>
                  {!notification.read && <View style={styles.unreadDot} />}
                </Pressable>
              ))
            )}
          </View>
        ) : (
          /* Messages Tab */
          <View style={styles.messagesContainer}>
            {(chatLoading || isInitialMessagesLoad) && conversations.length === 0 ? (
              renderConversationSkeleton()
            ) : filteredConversations.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={[styles.iconContainer, { backgroundColor: colors.brandBackground }]}>
                  <Ionicons name="chatbubbles-outline" size={32} color={colors.primary} />
                </View>
                <Text style={styles.emptyStateText}>No conversations yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Start a conversation by messaging someone from their profile
                </Text>
              </View>
            ) : (
              filteredConversations.map((conversation) => {
                const otherParticipant = conversation.other_participant;
                const lastMessage = conversation.last_message;

                return (
                  <TouchableOpacity
                    key={conversation.id}
                    style={[styles.messageCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
                    onPress={() => {
                      markAsRead(conversation.id);
                      router.push(`/chat?conversationId=${conversation.id}&userId=${otherParticipant?.id}&userName=${otherParticipant?.full_name || otherParticipant?.username}`);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.messageHeader}>
                      <View style={styles.userImageContainer}>
                        <TouchableOpacity
                          style={styles.userImage}
                          onPress={(e) => {
                            e.stopPropagation();
                            router.push(`/user-profile?userId=${otherParticipant?.id}`);
                          }}
                        >
                          <ProfilePicture
                            size={48}
                            showLongPress={false}
                            userId={otherParticipant?.id}
                            imageUrl={otherParticipant?.profile_picture}
                            noBorder={true}
                          />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.messageContent}>
                        <View style={styles.messageTop}>
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              router.push(`/chat?conversationId=${conversation.id}&userId=${otherParticipant?.id}&userName=${otherParticipant?.full_name || otherParticipant?.username}`);
                            }}
                            style={{ flex: 1, marginRight: 8 }}
                          >
                            <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                              {otherParticipant?.full_name || otherParticipant?.username || 'Unknown User'}
                            </Text>
                          </TouchableOpacity>
                          {lastMessage?.created_at && (
                            <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                              {lastMessage.time_ago || ''}
                            </Text>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.lastMessage,
                            { color: colors.textSecondary },
                            conversation.unread_count > 0 && styles.lastMessageUnread
                          ]}
                          numberOfLines={1}
                        >
                          {lastMessage?.content
                            ? (lastMessage.sender?.id?.toString() === currentUser?.id?.toString()
                                ? `You: ${lastMessage.content}`
                                : lastMessage.content)
                            : 'No messages yet'}
                        </Text>
                      </View>
                      {conversation.unread_count > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadCount}>{conversation.unread_count}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Notification Settings Modal */}
      <Modal
        visible={showSettingsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Notification Settings</Text>
              <TouchableOpacity
                onPress={() => setShowSettingsModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalStats}>
              <Text style={[styles.modalStatsText, { color: colors.textSecondary }]}>
                Showing {getFilteredNotifications().length} of {notifications.length} notifications
              </Text>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {/* Notification Type Filters */}
              <View style={styles.settingsSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Notification Types</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Choose which notifications to display</Text>

                {Object.entries(notificationTypes).map(([type, enabled]) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.settingItem, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                    onPress={() => toggleNotificationType(type)}
                  >
                    <View style={styles.settingItemLeft}>
                      <Ionicons
                        name={enabled ? "checkmark-circle" : "ellipse-outline"}
                        size={24}
                        color={enabled ? "#10b981" : "#9ca3af"}
                      />
                      <Text style={[styles.settingItemText, { color: colors.text }]}>
                        {type === 'job_updates' ? 'Job Updates (Hired/Rejected/Shortlisted)' :
                          type === 'job_applications' ? 'Job Applications & Requests' :
                            type === 'hire_responses' ? 'Hire Responses (Accepted/Rejected)' :
                              type === 'social' ? 'Social & Status Updates' :
                                type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Quick Actions */}
              <View style={styles.settingsSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                  onPress={markAllNotificationsAsRead}
                >
                  <Ionicons name="checkmark-done-circle" size={20} color="#10b981" />
                  <Text style={[styles.actionButtonText, { color: colors.text }]}>Mark All as Read</Text>
                </TouchableOpacity>



                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                  onPress={resetNotificationPreferences}
                >
                  <Ionicons name="refresh-outline" size={20} color="#3b82f6" />
                  <Text style={[styles.actionButtonText, { color: colors.text }]}>Reset to Default</Text>
                </TouchableOpacity>


              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* New Message Modal */}
      <Modal
        visible={showNewMessageModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNewMessageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>New Message</Text>
              <TouchableOpacity
                onPress={() => setShowNewMessageModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalScrollView}>
              {/* User Search */}
              <View style={styles.searchSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Search Users</Text>
                <View style={[styles.searchInputContainer, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                  <Ionicons name="search" size={20} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.modalSearchInput, { color: colors.text }]}
                    placeholder="Search by name or username..."
                    placeholderTextColor={colors.textSecondary}
                    value={userSearchQuery}
                    onChangeText={setUserSearchQuery}
                  />
                </View>
              </View>

              {/* Search Results */}
              {userSearchQuery.length >= 2 && (
                <View style={styles.searchResultsSection}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {searchingUsers ? 'Searching...' : `Results (${searchResults.length})`}
                  </Text>

                  {searchingUsers ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color="#3b82f6" />
                      <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Searching users...</Text>
                    </View>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((user) => (
                      <TouchableOpacity
                        key={user.id}
                        style={[styles.userResultItem, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                        onPress={() => startConversation(user.id, user.full_name || user.username)}
                      >
                        <ProfilePicture
                          size={40}
                          showLongPress={false}
                          imageUrl={user.profile_picture}
                          noBorder={true}
                        />
                        <View style={styles.userResultInfo}>
                          <Text style={[styles.userResultName, { color: colors.text }]}>
                            {user.full_name || user.username}
                          </Text>
                          <Text style={styles.userResultUsername}>
                            @{user.username}
                          </Text>
                        </View>
                        <Ionicons name="chatbubble-outline" size={20} color="#3b82f6" />
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.noResultsText}>No users found</Text>
                  )}
                </View>
              )}

              {/* Instructions */}
              <View style={styles.instructionsSection}>
                <Text style={styles.sectionTitle}>How to start a conversation</Text>
                <Text style={styles.instructionText}>
                  • Search for users by their name or username{'\n'}
                  • Tap on a user to start a conversation{'\n'}
                  • You can also start conversations from user profiles
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 2,
  },
  appName: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  iconButton: {
    padding: 4,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.cardAlt,
    borderRadius: 25,
    marginHorizontal: 16,
    marginVertical: 16,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 21,
    alignItems: 'center',
  },
  activeToggleButton: {
    backgroundColor: colors.card,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  activeToggleText: {
    color: '#8b5cf6',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  notificationsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  notificationCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadNotification: {
    borderLeftWidth: 4,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userImage: {
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  timeText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  notificationMessage: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },

  unreadDot: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b7280',
  },
  messageCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#fff',
  },
  messageContent: {
    flex: 1,
  },
  messageTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  lastMessageUnread: {
    color: colors.text,
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    backgroundColor: colors.card,
    borderRadius: 24,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalStats: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalStatsText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  modalScrollView: {
    padding: 20,
  },
  // Settings styles
  settingsSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingItemText: {
    fontSize: 16,
    color: colors.text,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionButtonText: {
    fontSize: 16,
    color: colors.text,
  },
  newMessageContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#3b82f6',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  newMessageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newMessageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // New Message Modal styles
  searchSection: {
    marginBottom: 24,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardAlt,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalSearchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: colors.text,
  },
  searchResultsSection: {
    marginBottom: 24,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  userResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.cardAlt,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userResultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  userResultUsername: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  noResultsText: {
    textAlign: 'center',
    fontSize: 14,
    color: colors.textSecondary,
    paddingVertical: 20,
  },
  instructionsSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  instructionText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: 8,
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
  tabBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    zIndex: 10,
  },
  tabBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
