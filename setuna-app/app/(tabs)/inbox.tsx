import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProfilePicture from '@/components/ProfilePicture';
import { router } from 'expo-router';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import API from '@/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';


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

  useEffect(() => {
    fetchConversations();
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
      setLoading(true);
      
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

      // Fetch local notifications
      let localNotifications: any[] = [];
      try {
        const localData = await AsyncStorage.getItem('localNotifications');
        if (localData) {
          localNotifications = JSON.parse(localData);
        }
      } catch (error) {
        console.error('Error fetching local notifications:', error);
        localNotifications = [];
      }

      // Filter local notifications to only show those meant for the current user
      if (currentUser?.id) {
        const totalLocalNotifications = localNotifications.length;
        const originalNotifications = [...localNotifications]; // Keep original for logging
        localNotifications = localNotifications.filter(notification => 
          notification.recipient?.id === currentUser.id
        );
        console.log(`🔍 Filtered local notifications for user ${currentUser.id}: ${localNotifications.length}/${totalLocalNotifications} shown`);
        
        // Log any notifications that were filtered out (for debugging)
        const filteredOut = originalNotifications.filter(notification => 
          notification.recipient?.id !== currentUser.id
        );
        if (filteredOut.length > 0) {
          console.log(`🚫 Filtered out ${filteredOut.length} notifications not meant for current user:`, 
            filteredOut.map(n => ({ id: n.id, recipient: n.recipient?.id, type: n.notification_type }))
          );
        }
        
        // Update time_ago for local notifications to show real-time differences
        localNotifications = localNotifications.map(notification => ({
          ...notification,
          time_ago: formatTimeDisplay(notification.created_at)
        }));
      }

      // Combine and sort notifications (newest first)
      const allNotifications = [...backendNotifications, ...localNotifications];
      allNotifications.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });

      setNotifications(allNotifications);
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

  // Search for users to start conversations with
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

  // Debounced search to avoid too many API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (userSearchQuery.length >= 2) {
        searchUsers(userSearchQuery);
      }
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [userSearchQuery]);

  // Start a new conversation with a user
  const startConversation = async (userId: string, userName: string) => {
    try {
      // Create or get existing conversation
      const conversation = await createOrGetConversation(userId);
      if (conversation) {
        // Navigate to chat screen
        router.push(`/chat?conversationId=${conversation.id}&userId=${userId}&userName=${userName}`);
        setShowNewMessageModal(false);
        setUserSearchQuery('');
        setSearchResults([]);
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
          return;
        }
      }
      
      Alert.alert('Error', 'Failed to start conversation. Please try again.');
    }
  };

  const resetNotificationPreferences = async () => {
    const defaultPreferences = {
      job_updates: true,      // Combined: job_hired, job_rejected, job_shortlisted
      job_applications: true, // Combined: job_applied, hire_request
      hire_responses: true,   // Combined: hire_accepted, hire_rejected
      social: true,           // Combined: follow, application_status
    };
    setNotificationTypes(defaultPreferences);
    await saveNotificationPreferences(defaultPreferences);
    Alert.alert('Success', 'Notification preferences reset to default');
  };



  const getFilteredNotifications = () => {
    return notifications.filter(notification => {
      const notificationType = notification.notification_type;
      
      // Map old notification types to new simplified categories
      if (['job_hired', 'job_rejected', 'job_shortlisted'].includes(notificationType)) {
        return notificationTypes.job_updates;
      } else if (['job_applied', 'hire_request'].includes(notificationType)) {
        return notificationTypes.job_applications;
      } else if (['hire_accepted', 'hire_rejected'].includes(notificationType)) {
        return notificationTypes.hire_responses;
      } else if (['follow', 'application_status'].includes(notificationType)) {
        return notificationTypes.social;
      }
      
      // Default to showing if type doesn't match any category
      return true;
    });
  };

  const filteredConversations = (conversations || []).filter(conversation => {
    if (!searchQuery) return true;
    
    // Filter by participant name or last message content
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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'job_hired':
        return <Ionicons name="checkmark-circle" size={20} color="#10b981" />;
      case 'job_rejected':
        return <Ionicons name="close-circle" size={20} color="#ef4444" />;
      case 'job_shortlisted':
        return <Ionicons name="star" size={20} color="#f59e0b" />;
      case 'job_applied':
        return <Ionicons name="person-add" size={20} color="#3b82f6" />;
      case 'hire_request':
        return <Ionicons name="briefcase" size={20} color="#8b5cf6" />;
      case 'hire_accepted':
        return <Ionicons name="checkmark-circle" size={20} color="#10b981" />;
      case 'hire_rejected':
        return <Ionicons name="close-circle" size={20} color="#ef4444" />;
      case 'follow':
        return <Ionicons name="person-add" size={20} color="#3b82f6" />;
      case 'application_status':
        return <Ionicons name="information-circle" size={20} color="#f59e0b" />;
      default:
        return <Ionicons name="notifications" size={20} color="#6b7280" />;
    }
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
    <View style={[styles.container, { backgroundColor: '#B0AAD9' }]}>
      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: '#B0AAD9' }]}>
        <View style={styles.leftContainer}>
          <Text style={[styles.appName, { color: '#fff' }]}>Inbox</Text>
        </View>
        <View style={styles.rightContainer}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => setShowSettingsModal(true)}
          >
            <Ionicons name="settings-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Toggle Buttons */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            activeTab === 'messages' && styles.activeToggleButton
          ]}
          onPress={() => setActiveTab('messages')}
        >
          <Text style={[
            styles.toggleText,
            activeTab === 'messages' && styles.activeToggleText
          ]}>
            Messages
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            activeTab === 'notifications' && styles.activeToggleButton
          ]}
          onPress={() => setActiveTab('notifications')}
        >
          <Text style={[
            styles.toggleText,
            activeTab === 'notifications' && styles.activeToggleText
          ]}>
            Notifications
          </Text>
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
          
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={16} color="#6b7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search contacts..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {activeTab === 'notifications' ? (
          /* Notifications Tab */
          <View style={styles.notificationsContainer}>
            {loading ? (
              <View style={styles.emptyState}>
                <Ionicons name="refresh" size={48} color="#9ca3af" />
                <Text style={styles.emptyStateText}>Loading notifications...</Text>
              </View>
            ) : (!getFilteredNotifications() || getFilteredNotifications().length === 0) ? (
              <View style={styles.emptyState}>
                <Ionicons name="notifications-off-outline" size={48} color="#9ca3af" />
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
                       <Text style={styles.timeText}>{notification.time_ago}</Text>
                     </View>
                     <Text style={styles.notificationMessage}>{notification.message}</Text>
                   </View>
                   <View style={styles.notificationIcon}>
                     {getNotificationIcon(notification.notification_type)}
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
            {chatLoading ? (
              <View style={styles.emptyState}>
                <Ionicons name="refresh" size={48} color="#9ca3af" />
                <Text style={styles.emptyStateText}>Loading conversations...</Text>
              </View>
            ) : filteredConversations.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={48} color="#9ca3af" />
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
                    style={styles.messageCard}
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
                            size={40} 
                            showLongPress={false} 
                            userId={otherParticipant?.id}
                            imageUrl={otherParticipant?.profile_picture}
                            noBorder={true}
                          />
                        </TouchableOpacity>
                        <View style={styles.onlineIndicator} />
                      </View>
                      <View style={styles.messageContent}>
                        <View style={styles.messageTop}>
                          <TouchableOpacity 
                            onPress={(e) => {
                              e.stopPropagation();
                              router.push(`/chat?conversationId=${conversation.id}&userId=${otherParticipant?.id}&userName=${otherParticipant?.full_name || otherParticipant?.username}`);
                            }}
                          >
                            <Text style={styles.userName}>
                              {otherParticipant?.full_name || otherParticipant?.username || 'Unknown User'}
                            </Text>
                          </TouchableOpacity>
                          <Text style={styles.timeText}>
                            {lastMessage?.time_ago || ''}
                          </Text>
                        </View>
                        <Text style={styles.lastMessage} numberOfLines={1}>
                          {lastMessage?.content || 'No messages yet'}
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
           <View style={styles.modalContent}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Notification Settings</Text>
               <TouchableOpacity 
                 onPress={() => setShowSettingsModal(false)}
                 style={styles.closeButton}
               >
                 <Ionicons name="close" size={24} color="#6b7280" />
               </TouchableOpacity>
             </View>

             <View style={styles.modalStats}>
               <Text style={styles.modalStatsText}>
                 Showing {getFilteredNotifications().length} of {notifications.length} notifications
               </Text>
             </View>

             <ScrollView style={styles.modalScrollView}>
               {/* Notification Type Filters */}
               <View style={styles.settingsSection}>
                 <Text style={styles.sectionTitle}>Notification Types</Text>
                 <Text style={styles.sectionSubtitle}>Choose which notifications to display</Text>
                 
                 {Object.entries(notificationTypes).map(([type, enabled]) => (
                   <TouchableOpacity
                     key={type}
                     style={styles.settingItem}
                     onPress={() => toggleNotificationType(type)}
                   >
                     <View style={styles.settingItemLeft}>
                       <Ionicons 
                         name={enabled ? "checkmark-circle" : "ellipse-outline"} 
                         size={24} 
                         color={enabled ? "#10b981" : "#9ca3af"} 
                       />
                       <Text style={styles.settingItemText}>
                         {type === 'job_updates' ? 'Job Updates (Hired/Rejected/Shortlisted)' :
                          type === 'job_applications' ? 'Job Applications & Requests' :
                          type === 'hire_responses' ? 'Hire Responses (Accepted/Rejected)' :
                          type === 'social' ? 'Social & Status Updates' :
                          type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                       </Text>
                     </View>
                     <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                   </TouchableOpacity>
                 ))}
               </View>

               {/* Quick Actions */}
               <View style={styles.settingsSection}>
                 <Text style={styles.sectionTitle}>Quick Actions</Text>
                 
                 <TouchableOpacity
                   style={styles.actionButton}
                   onPress={markAllNotificationsAsRead}
                 >
                   <Ionicons name="checkmark-done-circle" size={20} color="#10b981" />
                   <Text style={styles.actionButtonText}>Mark All as Read</Text>
                 </TouchableOpacity>



                 <TouchableOpacity
                   style={styles.actionButton}
                   onPress={resetNotificationPreferences}
                 >
                   <Ionicons name="refresh-outline" size={20} color="#3b82f6" />
                   <Text style={styles.actionButtonText}>Reset to Default</Text>
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
           <View style={styles.modalContent}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>New Message</Text>
               <TouchableOpacity 
                 onPress={() => setShowNewMessageModal(false)}
                 style={styles.closeButton}
               >
                 <Ionicons name="close" size={24} color="#6b7280" />
               </TouchableOpacity>
             </View>

             <View style={styles.modalScrollView}>
               {/* User Search */}
               <View style={styles.searchSection}>
                 <Text style={styles.sectionTitle}>Search Users</Text>
                 <View style={styles.searchInputContainer}>
                   <Ionicons name="search" size={20} color="#6b7280" />
                   <TextInput
                     style={styles.modalSearchInput}
                     placeholder="Search by name or username..."
                     placeholderTextColor="#9ca3af"
                     value={userSearchQuery}
                     onChangeText={setUserSearchQuery}
                   />
                 </View>
               </View>

               {/* Search Results */}
               {userSearchQuery.length >= 2 && (
                 <View style={styles.searchResultsSection}>
                   <Text style={styles.sectionTitle}>
                     {searchingUsers ? 'Searching...' : `Results (${searchResults.length})`}
                   </Text>
                   
                   {searchingUsers ? (
                     <View style={styles.loadingContainer}>
                       <ActivityIndicator size="small" color="#3b82f6" />
                       <Text style={styles.loadingText}>Searching users...</Text>
                     </View>
                   ) : searchResults.length > 0 ? (
                     searchResults.map((user) => (
                       <TouchableOpacity
                         key={user.id}
                         style={styles.userResultItem}
                         onPress={() => startConversation(user.id, user.full_name || user.username)}
                       >
                         <ProfilePicture 
                           size={40} 
                           showLongPress={false} 
                           imageUrl={user.profile_picture}
                           noBorder={true}
                         />
                         <View style={styles.userResultInfo}>
                           <Text style={styles.userResultName}>
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

 const styles = StyleSheet.create({
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
     backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
     backgroundColor: '#fff',
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
     backgroundColor: '#fff',
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
     color: '#374151',
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
     backgroundColor: '#fff',
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
     color: '#111827',
   },
   timeText: {
     fontSize: 12,
     color: '#6b7280',
   },
   notificationMessage: {
     fontSize: 14,
     color: '#374151',
     lineHeight: 20,
   },
   notificationIcon: {
     marginLeft: 8,
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
     backgroundColor: '#fff',
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
     color: '#6b7280',
   },
   unreadBadge: {
     backgroundColor: '#3b82f6',
     borderRadius: 10,
     minWidth: 20,
     height: 20,
     alignItems: 'center',
     justifyContent: 'center',
     marginLeft: 8,
   },
   unreadCount: {
     color: '#fff',
     fontSize: 12,
     fontWeight: '600',
   },
   emptyState: {
     alignItems: 'center',
     paddingVertical: 50,
     backgroundColor: '#f8fafc',
     borderRadius: 12,
     marginTop: 20,
     marginBottom: 20,
     borderWidth: 1,
     borderColor: '#e2e8f0',
   },
   emptyStateText: {
     fontSize: 20,
     fontWeight: 'bold',
     color: '#374151',
     marginTop: 15,
   },
   emptyStateSubtext: {
     fontSize: 14,
     color: '#6b7280',
     marginTop: 5,
   },
   // Modal styles
   modalOverlay: {
     flex: 1,
     backgroundColor: 'rgba(0, 0, 0, 0.5)',
     justifyContent: 'flex-end',
   },
   modalContent: {
     backgroundColor: '#fff',
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
     borderBottomColor: '#e5e7eb',
   },
   modalStats: {
     paddingHorizontal: 20,
     paddingVertical: 12,
     backgroundColor: '#f8fafc',
     borderBottomWidth: 1,
     borderBottomColor: '#e5e7eb',
   },
   modalStatsText: {
     fontSize: 14,
     color: '#6b7280',
     textAlign: 'center',
   },
   modalTitle: {
     fontSize: 20,
     fontWeight: 'bold',
     color: '#111827',
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
     color: '#111827',
     marginBottom: 8,
   },
   sectionSubtitle: {
     fontSize: 14,
     color: '#6b7280',
     marginBottom: 20,
   },
   settingItem: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'center',
     paddingVertical: 16,
     paddingHorizontal: 0,
     borderBottomWidth: 1,
     borderBottomColor: '#f3f4f6',
   },
   settingItemLeft: {
     flexDirection: 'row',
     alignItems: 'center',
     gap: 12,
   },
   settingItemText: {
     fontSize: 16,
     color: '#374151',
   },
   actionButton: {
     flexDirection: 'row',
     alignItems: 'center',
     gap: 12,
     paddingVertical: 16,
     paddingHorizontal: 0,
     borderBottomWidth: 1,
     borderBottomColor: '#f3f4f6',
   },
   actionButtonText: {
     fontSize: 16,
     color: '#374151',
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
     backgroundColor: '#f8fafc',
     borderRadius: 12,
     paddingHorizontal: 16,
     paddingVertical: 12,
     borderWidth: 1,
     borderColor: '#e2e8f0',
   },
   modalSearchInput: {
     flex: 1,
     marginLeft: 12,
     fontSize: 16,
     color: '#374151',
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
     color: '#6b7280',
   },
   userResultItem: {
     flexDirection: 'row',
     alignItems: 'center',
     paddingVertical: 12,
     paddingHorizontal: 16,
     backgroundColor: '#f8fafc',
     borderRadius: 12,
     marginBottom: 8,
     borderWidth: 1,
     borderColor: '#e2e8f0',
   },
   userResultInfo: {
     flex: 1,
     marginLeft: 12,
   },
   userResultName: {
     fontSize: 16,
     fontWeight: '600',
     color: '#111827',
   },
   userResultUsername: {
     fontSize: 14,
     color: '#6b7280',
     marginTop: 2,
   },
   noResultsText: {
     textAlign: 'center',
     fontSize: 14,
     color: '#6b7280',
     paddingVertical: 20,
   },
   instructionsSection: {
     marginTop: 24,
     paddingTop: 24,
     borderTopWidth: 1,
     borderTopColor: '#e2e8f0',
   },
   instructionText: {
     fontSize: 14,
     color: '#6b7280',
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
 });
