import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCustomFonts } from '@/hooks/fonts';
import { router } from 'expo-router';
import ProfilePicture from '@/components/ProfilePicture';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import API from '@/utils/api';
import { useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ConversationsScreen() {
  const { colors, colorScheme } = useAppTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useCustomFonts();
  const { user, isAuthenticated } = useAuth();
  const { 
    conversations, 
    fetchConversations, 
    markAsRead, 
    isLoading: chatLoading,
    createOrGetConversation
  } = useChat();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);


  // Skeleton pulse animation
  const pulseAnim = React.useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (chatLoading) {
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
  }, [chatLoading]);

  const renderConversationSkeleton = () => {
    return (
      <Animated.View style={{ opacity: pulseAnim }}>
        {[1, 2, 3, 4].map((key) => (
          <View key={key} style={[styles.conversationCard, { padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center' }]}>
            {/* Avatar Circle */}
            <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: colors.cardAlt || (colorScheme === 'dark' ? '#334155' : '#e2e8f0'), marginRight: 12 }} />
            {/* Content Lines */}
            <View style={{ flex: 1 }}>
              {/* Title / Name */}
              <View style={{ width: '45%', height: 16, borderRadius: 8, backgroundColor: colors.cardAlt || (colorScheme === 'dark' ? '#334155' : '#e2e8f0'), marginBottom: 8 }} />
              {/* Message excerpt */}
              <View style={{ width: '75%', height: 14, borderRadius: 7, backgroundColor: colors.cardAlt || (colorScheme === 'dark' ? '#334155' : '#e2e8f0') }} />
            </View>
          </View>
        ))}
      </Animated.View>
    );
  };

  useEffect(() => {
    const load = async () => {
      if (isAuthenticated) {
        setIsInitialLoad(true);
        await fetchConversations();
        setIsInitialLoad(false);
      } else {
        setIsInitialLoad(false);
      }
    };
    load();
  }, [isAuthenticated]); // Only run when authentication changes

  // ADDED: Refresh conversations when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        console.log('🔄 Screen focused, refreshing conversations for latest messages');
        fetchConversations();
      }
    }, [isAuthenticated, fetchConversations])
  );

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchConversations();
    } catch (error) {
      console.error('Error refreshing conversations:', error);
    } finally {
      setRefreshing(false);
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

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (userSearchQuery.length >= 2) {
        searchUsers(userSearchQuery);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [userSearchQuery]);

  // Start a new conversation with a user
  const startConversation = async (userId: string, userName: string) => {
    try {
      const conversation = await createOrGetConversation(userId);
      if (conversation) {
        router.push(`/chat?conversationId=${conversation.id}&userId=${userId}&userName=${userName}`);
        setShowNewMessageModal(false);
        setUserSearchQuery('');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      Alert.alert('Error', 'Failed to start conversation. Please try again.');
    }
  };

  const filteredConversations = conversations.filter(conversation => {
    if (!searchQuery) return true;
    
    const otherParticipant = conversation.other_participant;
    const participantName = otherParticipant?.full_name || otherParticipant?.username || '';
    const lastMessageContent = conversation.last_message?.content || '';
    
    return participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           lastMessageContent.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
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
      day: 'numeric'
    });
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + (Platform.OS === 'ios' ? 10 : 14), Platform.OS === 'ios' ? 54 : 38) }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity
          style={styles.newMessageButton}
          onPress={() => setShowNewMessageModal(true)}
        >
          <Ionicons name="add" size={24} color="#6b46c1" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Conversations List */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {(chatLoading || isInitialLoad) && conversations.length === 0 ? (
          renderConversationSkeleton()
        ) : filteredConversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyStateTitle}>No conversations yet</Text>
            <Text style={styles.emptyStateSubtitle}>
              Start a conversation by messaging someone from their profile
            </Text>
            <TouchableOpacity
              style={styles.startConversationButton}
              onPress={() => setShowNewMessageModal(true)}
            >
              <Text style={styles.startConversationButtonText}>Start a Conversation</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredConversations.map((conversation) => {
            const otherParticipant = conversation.other_participant;
            const lastMessage = conversation.last_message;
            
            return (
              <TouchableOpacity 
                key={conversation.id} 
                style={styles.conversationCard}
                onPress={() => {
                  markAsRead(conversation.id);
                  router.push(`/chat?conversationId=${conversation.id}&userId=${otherParticipant?.id}&userName=${otherParticipant?.full_name || otherParticipant?.username}`);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.conversationHeader}>
                  <View style={styles.userImageContainer}>
                    <ProfilePicture 
                      size={50} 
                      userId={otherParticipant?.id}
                      imageUrl={otherParticipant?.profile_picture}
                    />
                    <View style={styles.onlineIndicator} />
                  </View>
                  <View style={styles.conversationContent}>
                    <View style={styles.conversationTop}>
                      <Text style={styles.userName}>
                        {otherParticipant?.full_name || otherParticipant?.username || 'Unknown User'}
                      </Text>
                      <Text style={styles.timeText}>
                        {lastMessage ? formatTime(lastMessage.created_at) : ''}
                      </Text>
                    </View>
                    <Text style={styles.lastMessage} numberOfLines={2}>
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
      </ScrollView>

      {/* New Message Modal */}
      {showNewMessageModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Message</Text>
              <TouchableOpacity 
                onPress={() => setShowNewMessageModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.searchSection}>
                <Text style={styles.sectionTitle}>Search Users</Text>
                <View style={styles.searchInputContainer}>
                  <Ionicons name="search" size={20} color={colors.textSecondary} />
                  <TextInput
                    style={styles.modalSearchInput}
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
                          userId={user.id}
                          imageUrl={user.profile_picture}
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
      )}
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 38,
    paddingBottom: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  newMessageButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  conversationCard: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  conversationHeader: {
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
  conversationContent: {
    flex: 1,
  },
  conversationTop: {
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
  lastMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  unreadBadge: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
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
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  startConversationButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  startConversationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  searchSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
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
    borderTopColor: '#e2e8f0',
  },
  instructionText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: 8,
  },
});

