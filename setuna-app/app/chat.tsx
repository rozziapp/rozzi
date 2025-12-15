import React, { useState, useEffect, useRef, useCallback } from 'react';
// @ts-ignore - expo-router types are correctly resolved at runtime
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
  RefreshControl,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCustomFonts } from '@/hooks/fonts';
import ProfilePicture from '@/components/ProfilePicture';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';

const { width, height } = Dimensions.get('window');

interface Message {
  id: string;
  content: string;
  sender: {
    id: string;
    username: string;
    full_name: string;
    profile_picture?: string;
  };
  conversation: string;
  is_read: boolean;
  created_at: string;
  time_ago: string;
  message_status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export default function ChatScreen() {
  const [fontsLoaded] = useCustomFonts();
  const params = useLocalSearchParams();
  const { user } = useAuth();

  const {
    currentMessages,
    sendMessage,
    joinConversation,
    leaveConversation,
    conversations,
    isLoading: chatLoading,
    loadMessages,
    markAsRead,
    updateMessageStatus,
    currentConversationId,
    manualRefreshMessages,
    smartSync,
    forceRefreshMessages,
    backgroundMessageCheck
  } = useChat();

  // State
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Removed isInitialized state - not needed

  // Refs
  const scrollViewRef = useRef<ScrollView>(null);

  // Get params
  const otherUserId = params.userId as string;
  const otherUserName = params.userName as string;
  const conversationId = params.conversationId as string;

  // Get user profile
  const otherUserProfile = conversations?.find(conv =>
    conv.other_participant?.id?.toString() === otherUserId
  )?.other_participant || {
    full_name: otherUserName,
    username: otherUserName,
    profile_picture: undefined,
  };

  // Validation
  if (!otherUserId || !conversationId) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorTitle}>Invalid Conversation</Text>
          <Text style={styles.errorText}>
            Missing required parameters. Please go back and try again.
          </Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => router.back()}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!fontsLoaded) {
    return null;
  }

  // SINGLE INITIALIZATION EFFECT - NO MORE LOOPS
  useEffect(() => {
    if (!conversationId) return;

    const initConversation = async () => {
      try {
        setError(null);
        console.log('🔄 Joining conversation:', conversationId);
        await joinConversation(conversationId);
        console.log('✅ Joined conversation successfully');

        // Debug: Check AsyncStorage for saved messages
        try {
          const storedMessages = await AsyncStorage.getItem(`messages_${conversationId}`);
          if (storedMessages) {
            const parsedMessages = JSON.parse(storedMessages);
            console.log(`💾 Found ${parsedMessages.length} stored messages in AsyncStorage`);
          } else {
            console.log('💾 No stored messages found in AsyncStorage');
          }
        } catch (storageError) {
          console.error('Failed to check AsyncStorage:', storageError);
        }

      } catch (error) {
        console.error('❌ Failed to join conversation:', error);
        setError('Failed to load conversation. Please try again.');
      }
    };

    initConversation();

    return () => {
      console.log('🚪 Leaving conversation');
      leaveConversation();
    };
  }, [conversationId]); // Only depend on conversationId to prevent infinite loops

  // Add effect to preserve messages when component unmounts
  useEffect(() => {
    return () => {
      // Save current messages to storage when leaving the chat
      if (conversationId && currentMessages.length > 0) {
        try {
          AsyncStorage.setItem(`messages_${conversationId}`, JSON.stringify(currentMessages));
          console.log(`💾 Preserved ${currentMessages.length} messages when leaving chat`);
        } catch (storageError) {
          console.error('Failed to preserve messages when leaving chat:', storageError);
        }
      }
    };
  }, [conversationId, currentMessages]);

  // Handle app state changes to preserve messages
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Save messages when app goes to background
        if (conversationId && currentMessages.length > 0) {
          try {
            AsyncStorage.setItem(`messages_${conversationId}`, JSON.stringify(currentMessages));
            console.log(`💾 Preserved ${currentMessages.length} messages when app went to background`);
          } catch (storageError) {
            console.error('Failed to preserve messages when app went to background:', storageError);
          }
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [conversationId, currentMessages]);

  // Handle message retry for failed messages
  const handleMessageRetry = useCallback(async (message: Message) => {
    if (message.message_status !== 'failed') return;

    try {
      setIsLoading(true);
      setError(null);

      // Remove the failed message
      // setCurrentMessages(prev => prev.filter(msg => msg.id !== message.id)); // This line was removed

      // Send the message again
      await sendMessage(otherUserId, message.content);
      console.log('✅ Message retry successful');

    } catch (error) {
      console.error('❌ Message retry failed:', error);
      setError('Failed to retry message. Please try again.');

      // Add the failed message back
      // setCurrentMessages(prev => [...prev, { ...message, message_status: 'failed' }]); // This line was removed
    } finally {
      setIsLoading(false);
    }
  }, [sendMessage, otherUserId]);



  // Handle message delivery status updates
  const handleMessageStatusUpdate = useCallback((messageId: string, status: string) => {
    updateMessageStatus(messageId, status);

    // Update the message in storage
    if (conversationId) {
      const updatedMessages = currentMessages.map((msg: Message) =>
        msg.id === messageId ? { ...msg, message_status: status as any } : msg
      );

      try {
        AsyncStorage.setItem(`messages_${conversationId}`, JSON.stringify(updatedMessages));
        console.log(`💾 Updated message status in storage: ${messageId} -> ${status}`);
      } catch (storageError) {
        console.error('Failed to update message status in storage:', storageError);
      }
    }
  }, [conversationId, currentMessages, updateMessageStatus]);

  // Handle message synchronization when returning to chat
  const handleMessageSync = useCallback(async () => {
    if (!conversationId) return;

    try {
      console.log('🔄 Syncing messages when returning to chat');

      // Use smart sync instead of manual sync
      await smartSync();

      // Mark messages as read
      await markAsRead(conversationId);

      console.log('✅ Message sync completed');
    } catch (error) {
      console.error('Failed to sync messages:', error);
    }
  }, [conversationId, smartSync, markAsRead]);

  // Save messages to storage whenever they change
  useEffect(() => {
    if (conversationId && currentMessages.length > 0) {
      const saveMessages = async () => {
        try {
          await AsyncStorage.setItem(`messages_${conversationId}`, JSON.stringify(currentMessages));
          console.log(`💾 Auto-saved ${currentMessages.length} messages to storage`);
        } catch (storageError) {
          console.error('Failed to auto-save messages:', storageError);
        }
      };

      // Save immediately for important changes
      saveMessages();
    }
  }, [conversationId, currentMessages]);

  // Simple auto-scroll to bottom when messages change
  useEffect(() => {
    if (currentMessages.length > 0 && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [currentMessages.length]);

  // Sync messages when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (conversationId) {
        console.log('📱 Chat screen focused, syncing messages...');
        // Force refresh to ensure receiver sees messages from other users
        forceRefreshMessages(conversationId);
      }
    }, [conversationId, forceRefreshMessages])
  );

  // Handle message persistence when navigating away
  useEffect(() => {
    // Save messages when component unmounts or conversation changes
    return () => {
      if (conversationId && currentMessages.length > 0) {
        try {
          AsyncStorage.setItem(`messages_${conversationId}`, JSON.stringify(currentMessages));
          console.log(`💾 Preserved ${currentMessages.length} messages before unmounting`);
        } catch (storageError) {
          console.error('Failed to preserve messages before unmounting:', storageError);
        }
      }
    };
  }, [conversationId, currentMessages]);

  // REMOVED: Periodic background message check - was causing auto-refresh and scrolling issues

  // Format time for messages
  const formatTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
      if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;

      return date.toLocaleDateString();
    } catch (error) {
      return 'Unknown time';
    }
  };

  // Check if message is from current user
  const isOwnMessage = (message: Message): boolean => {
    // Safely compare user IDs by converting both to strings
    const messageSenderId = String(message.sender.id);
    const currentUserId = String(user?.id);
    return messageSenderId === currentUserId;
  };

  // Simple message sending
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || isLoading) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setIsLoading(true);
    setError(null);

    try {
      await sendMessage(otherUserId, messageText);
      setError(null);

      // Auto-scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message. Please try again.');
      setNewMessage(messageText);
    } finally {
      setIsLoading(false);
    }
  }, [newMessage, isLoading, sendMessage, otherUserId]);

  // Render message with status indicators
  const renderMessage = (message: Message, index: number) => {
    const isOwn = isOwnMessage(message);
    const isTempMessage = message.id.startsWith('temp_');

    return (
      <View key={message.id} style={[
        styles.messageContainer,
        isOwn ? styles.ownMessageContainer : styles.otherMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          isOwn ? styles.ownMessageBubble : styles.otherMessageBubble,
          isTempMessage && styles.sendingMessageBubble,
          message.message_status === 'failed' && styles.failedMessageBubble
        ]}>
          <Text style={[
            styles.messageText,
            isOwn ? styles.ownMessageText : styles.otherMessageText,
            message.message_status === 'failed' && styles.failedMessageText
          ]}>
            {message.content}
          </Text>

          {/* Message status and time */}
          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              isOwn ? styles.ownMessageTime : styles.otherMessageTime
            ]}>
              {formatTime(message.created_at)}
            </Text>

            {/* Status indicators for own messages */}
            {isOwn && (
              <View style={styles.statusContainer}>
                {message.message_status === 'sending' && (
                  <ActivityIndicator size={12} color="#9ca3af" />
                )}
                {message.message_status === 'sent' && (
                  <Ionicons name="checkmark" size={14} color="#9ca3af" />
                )}
                {message.message_status === 'delivered' && (
                  <View style={styles.doubleCheck}>
                    <Ionicons name="checkmark" size={14} color="#9ca3af" />
                    <Ionicons name="checkmark" size={14} color="#9ca3af" style={styles.secondCheck} />
                  </View>
                )}
                {message.message_status === 'read' && (
                  <View style={styles.doubleCheck}>
                    <Ionicons name="checkmark" size={14} color="#6b46c1" />
                    <Ionicons name="checkmark" size={14} color="#6b46c1" style={styles.secondCheck} />
                  </View>
                )}
                {message.message_status === 'failed' && (
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => handleMessageRetry(message)}
                  >
                    <Ionicons name="refresh" size={14} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Render error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.errorHeaderTitle}>Error</Text>
          </View>
          <View style={styles.moreButton} />
        </View>

        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => {
              setError(null);
              joinConversation(conversationId);
            }}
          >
            <Text style={styles.errorButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <TouchableOpacity
            style={styles.userInfo}
            onPress={() => router.push(`/user-profile?userId=${otherUserId}`)}
          >
            <View style={styles.userImageContainer}>
              <ProfilePicture
                size={40}
                userId={otherUserId}
                imageUrl={otherUserProfile?.profile_picture}
                noBorder={true}
              />
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{otherUserProfile?.full_name}</Text>
              {/* REMOVED: Online status completely */}
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => setShowOptionsModal(true)}
        >
          <Ionicons name="ellipsis-vertical" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={chatLoading}
            onRefresh={() => {
              if (conversationId) {
                smartSync();
              }
            }}
            colors={['#6b46c1']}
            tintColor="#6b46c1"
          />
        }
      >
        {chatLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6b46c1" />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : currentMessages && currentMessages.length > 0 ? (
          currentMessages.map((message, index) => renderMessage(message, index))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubble-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyStateTitle}>No messages yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Start the conversation by sending a message!
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor="#9ca3af"
          multiline
          maxLength={1000}
          onSubmitEditing={handleSendMessage}
          editable={!isLoading}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            (!newMessage.trim() || isLoading) && styles.sendButtonDisabled
          ]}
          onPress={handleSendMessage}
          disabled={!newMessage.trim() || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size={16} color="#9ca3af" />
          ) : (
            <Ionicons
              name="send"
              size={20}
              color={newMessage.trim() ? "#6b46c1" : "#d1d5db"}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Options Modal */}
      <Modal
        visible={showOptionsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chat Options</Text>
              <TouchableOpacity
                onPress={() => setShowOptionsModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setShowOptionsModal(false);
                router.push(`/user-profile?userId=${otherUserId}`);
              }}
            >
              <Ionicons name="person-outline" size={24} color="#6b46c1" />
              <Text style={styles.modalOptionText}>View Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalOption, styles.blockOption]}
              onPress={() => {
                setShowOptionsModal(false);
              }}
            >
              <Ionicons name="ban-outline" size={24} color="#ef4444" />
              <Text style={[styles.modalOptionText, styles.blockOptionText]}>Block User</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  // REMOVED: userStatus style - no longer needed
  moreButton: {
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  messageContainer: {
    marginBottom: 12,
    flexDirection: 'row',
    width: '100%',
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
    width: '100%',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
    width: '100%',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  ownMessageBubble: {
    backgroundColor: '#6b46c1',
    borderBottomRightRadius: 6,
    marginLeft: 'auto',
    shadowColor: '#6b46c1',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  otherMessageBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 6,
    marginRight: 'auto',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 4,
  },
  ownMessageText: {
    color: '#ffffff',
  },
  otherMessageText: {
    color: '#111827',
  },
  timeText: {
    fontSize: 12,
    opacity: 0.7,
  },
  ownTimeText: {
    color: '#ffffff',
  },
  otherTimeText: {
    color: '#6b7280',
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    backgroundColor: '#f9fafb',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#f3f4f6',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 16,
  },
  blockOption: {
    borderBottomWidth: 0,
  },
  blockOptionText: {
    color: '#dc2626',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ef4444',
    marginTop: 10,
    marginBottom: 5,
  },
  errorText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorButton: {
    backgroundColor: '#6b46c1',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorHeaderTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  messageStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sendingMessageBubble: {
    backgroundColor: '#f3f4f6', // Light grey background for temporary messages
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doubleCheck: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondCheck: {
    marginLeft: -4, // Adjust spacing between checks
  },
  messageTime: {
    fontSize: 12,
    opacity: 0.7,
  },
  ownMessageTime: {
    color: '#ffffff',
  },
  otherMessageTime: {
    color: '#6b7280',
  },
  retryButton: {
    padding: 4,
  },
  failedMessageBubble: {
    backgroundColor: '#fef2f2', // Light red background for failed messages
    borderColor: '#fecaca',
    borderWidth: 1,
  },
  failedMessageText: {
    color: '#dc2626',
  },
  messageRetryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  retryText: {
    fontSize: 10,
    color: '#ef4444',
    marginLeft: 4,
  },
});
