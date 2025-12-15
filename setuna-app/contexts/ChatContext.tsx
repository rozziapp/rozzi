import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '@/utils/api';
import { useAuth } from './AuthContext';

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

interface Conversation {
  id: string;
  participants: Array<{
    id: string;
    username: string;
    full_name: string;
    profile_picture?: string;
  }>;
  other_participant: {
    id: string;
    username: string;
    full_name: string;
    profile_picture?: string;
  } | null;
  last_message: Message | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

interface ChatContextType {
  // State
  conversations: Conversation[];
  currentMessages: Message[];
  isConnected: boolean;
  isLoading: boolean;
  currentConversationId: string | null;

  // Actions
  sendMessage: (recipientId: string, content: string) => Promise<void>;
  joinConversation: (conversationId: string) => Promise<void>;
  leaveConversation: () => void;
  fetchConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  loadInitialMessages: (conversationId: string) => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
  createOrGetConversation: (recipientId: string) => Promise<Conversation | null>;
  refreshConversations: () => Promise<void>;
  refreshMessages: (conversationId: string) => Promise<void>;
  manualRefreshMessages: (conversationId: string) => Promise<void>;
  // Removed recoverMessageState - was causing infinite loops
  updateMessageStatus: (messageId: string, status: string) => void;
  syncMessages: () => Promise<void>;
  confirmMessageDelivery: (messageId: string) => Promise<void>;
  markMessageAsRead: (messageId: string) => Promise<void>;
  smartSync: () => Promise<void>;
  backgroundMessageCheck: () => Promise<void>;
  forceRefreshMessages: (conversationId: string) => Promise<void>;
}

const defaultContextValue: ChatContextType = {
  conversations: [],
  currentMessages: [],
  isConnected: false,
  isLoading: false,
  currentConversationId: null,
  sendMessage: async () => { },
  joinConversation: async () => { },
  leaveConversation: () => { },
  fetchConversations: async () => { },
  loadMessages: async () => { },
  loadInitialMessages: async () => { },
  markAsRead: async () => { },
  createOrGetConversation: async () => null,
  refreshConversations: async () => { },
  refreshMessages: async () => { },
  manualRefreshMessages: async () => { },
  // Removed recoverMessageState - was causing infinite loops
  updateMessageStatus: () => { },
  syncMessages: async () => { },
  confirmMessageDelivery: async () => { },
  markMessageAsRead: async () => { },
  smartSync: async () => { },
  backgroundMessageCheck: async () => { },
  forceRefreshMessages: async () => { },
};

const ChatContext = createContext<ChatContextType>(defaultContextValue);

export const useChat = () => {
  const context = useContext(ChatContext);
  return context;
};

interface ChatProviderProps {
  children: React.ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  // Use refs to prevent infinite loops
  const currentConversationIdRef = useRef<string | null>(null);
  const currentMessagesRef = useRef<Message[]>([]);

  // Update refs when state changes
  useEffect(() => {
    currentConversationIdRef.current = currentConversationId;
  }, [currentConversationId]);

  useEffect(() => {
    currentMessagesRef.current = currentMessages;
  }, [currentMessages]);

  // Helper function to safely compare user IDs
  const isSameUser = (id1: any, id2: any): boolean => {
    return String(id1) === String(id2);
  };

  // Helper function to validate message structure
  const validateMessage = (msg: any): Message | null => {
    if (!msg || typeof msg !== 'object') return null;

    // Check if message has required fields
    if (!msg.id || !msg.content || !msg.sender) return null;

    // Ensure sender has required fields
    if (!msg.sender.id || !msg.sender.username) return null;

    return {
      id: String(msg.id),
      content: String(msg.content),
      sender: {
        id: String(msg.sender.id),
        username: String(msg.sender.username),
        full_name: String(msg.sender.full_name || msg.sender.username),
        profile_picture: msg.sender.profile_picture || undefined,
      },
      conversation: String(msg.conversation || ''),
      is_read: Boolean(msg.is_read),
      created_at: msg.created_at || new Date().toISOString(),
      time_ago: msg.time_ago || 'Just now',
      message_status: msg.message_status || 'sent'
    };
  };

  // Fetch conversations with proper error handling
  const fetchConversations = useCallback(async (): Promise<void> => {
    try {
      console.log('📞 Fetching conversations...');
      const response = await API.get('/conversations/');
      const data = Array.isArray(response.data) ? response.data :
        response.data?.results || response.data?.data || [];

      // Validate and filter conversations
      const validConversations = data.filter((conv: any) =>
        conv && conv.id && conv.participants && Array.isArray(conv.participants)
      );

      setConversations(validConversations);
      console.log(`✅ Loaded ${validConversations.length} conversations`);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      setConversations([]);
    }
  }, []);

  // Refresh conversations (for pull-to-refresh)
  const refreshConversations = useCallback(async (): Promise<void> => {
    await fetchConversations();
  }, [fetchConversations]);

  // Load messages from storage for a conversation
  const loadMessagesFromStorage = useCallback(async (conversationId: string): Promise<Message[]> => {
    try {
      const storedMessages = await AsyncStorage.getItem(`messages_${conversationId}`);
      if (storedMessages) {
        const parsedMessages = JSON.parse(storedMessages);
        const validMessages = parsedMessages
          .map((msg: any) => validateMessage(msg))
          .filter(Boolean);
        console.log(`📱 Loaded ${validMessages.length} messages from storage for conversation ${conversationId}`);
        return validMessages;
      }
    } catch (storageError) {
      console.error('Failed to load messages from storage:', storageError);
    }
    return [];
  }, []);

  // Load initial messages from cache
  const loadInitialMessages = useCallback(async (conversationId: string): Promise<void> => {
    if (!conversationId) return;

    try {
      const cachedMessages = await loadMessagesFromStorage(conversationId);
      if (cachedMessages.length > 0) {
        setCurrentMessages(cachedMessages);
      }
    } catch (storageError) {
      console.error('Failed to load cached messages:', storageError);
    }
  }, [loadMessagesFromStorage]);

  // Load messages with proper persistence - SERVER AS SOURCE OF TRUTH
  const loadMessages = useCallback(async (conversationId: string): Promise<void> => {
    if (!conversationId) return;

    try {
      setIsLoading(true);

      // Load messages from server FIRST (server is source of truth)
      const response = await API.get(`/conversations/${conversationId}/messages/`);
      const data = Array.isArray(response.data) ? response.data : [];

      // Validate server messages
      const validServerMessages: Message[] = [];
      for (const msg of data) {
        const validMsg = validateMessage(msg);
        if (validMsg) {
          validServerMessages.push(validMsg);
        }
      }

      console.log(`📡 Loaded ${validServerMessages.length} messages from server for conversation ${conversationId}`);

      // Server messages are the source of truth - use them directly
      if (validServerMessages.length > 0) {
        // Sort messages by creation time
        validServerMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        // Remove any optimistic messages before setting server messages
        const cleanServerMessages = validServerMessages.filter(msg => !msg.id.startsWith('temp_'));

        // Set server messages directly
        setCurrentMessages(cleanServerMessages);

        // Save server messages to storage for offline access
        await AsyncStorage.setItem(`messages_${conversationId}`, JSON.stringify(cleanServerMessages));
        console.log(`💾 Saved ${cleanServerMessages.length} clean server messages to storage`);
      } else {
        // No server messages, clear current messages
        setCurrentMessages([]);
        await AsyncStorage.setItem(`messages_${conversationId}`, JSON.stringify([]));
        console.log(`🗑️ No server messages found, cleared storage for conversation ${conversationId}`);
      }

    } catch (error) {
      console.error('Failed to load messages from server:', error);

      // Use cached messages as fallback only if server fails
      try {
        const cachedMessages = await loadMessagesFromStorage(conversationId);
        // Remove optimistic messages from cached messages too
        const cleanCachedMessages = cachedMessages.filter(msg => !msg.id.startsWith('temp_'));
        setCurrentMessages(cleanCachedMessages);
        console.log(`📱 Using ${cleanCachedMessages.length} clean cached messages as fallback`);
      } catch (storageError) {
        setCurrentMessages([]);
        console.log('❌ No cached messages available, showing empty chat');
      }
    } finally {
      setIsLoading(false);
    }
  }, [loadMessagesFromStorage]);

  // Refresh messages for a specific conversation
  const refreshMessages = useCallback(async (conversationId: string): Promise<void> => {
    if (!conversationId) return;

    try {
      console.log(`🔄 Refreshing messages for conversation ${conversationId}`);
      await loadMessages(conversationId);
    } catch (error) {
      console.error('Failed to refresh messages:', error);
    }
  }, [loadMessages]);

  // Manual refresh messages (for pull-to-refresh or manual sync) - NO LOADING STATE
  const manualRefreshMessages = useCallback(async (conversationId: string): Promise<void> => {
    if (!conversationId) return;

    try {
      console.log(`🔄 Manual refresh requested for conversation ${conversationId}`);

      // Silent refresh without loading state
      const response = await API.get(`/conversations/${conversationId}/messages/`);
      const data = Array.isArray(response.data) ? response.data :
        response.data?.results || response.data?.data || [];

      const validServerMessages: Message[] = [];
      for (const msg of data) {
        const validMsg = validateMessage(msg);
        if (validMsg) {
          validServerMessages.push(validMsg);
        }
      }

      // Update messages silently
      if (validServerMessages.length > 0) {
        validServerMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        setCurrentMessages(validServerMessages);

        // Save to storage
        try {
          await AsyncStorage.setItem(`messages_${conversationId}`, JSON.stringify(validServerMessages));
        } catch (storageError) {
          console.error('Failed to save refreshed messages:', storageError);
        }
      }

      console.log('✅ Manual refresh completed silently');
    } catch (error) {
      console.error('Failed to manually refresh messages:', error);
    }
  }, []);

  // Update message status function
  const updateMessageStatus = useCallback((messageId: string, status: string) => {
    setCurrentMessages(prev =>
      prev.map(msg =>
        msg.id === messageId
          ? { ...msg, message_status: status as any }
          : msg
      )
    );
  }, []);

  // Handle message read status updates
  const markMessageAsRead = useCallback(async (messageId: string): Promise<void> => {
    if (!messageId) return;

    try {
      // Update message status to read
      updateMessageStatus(messageId, 'read');

      // Save updated status to storage
      if (currentConversationIdRef.current) {
        const updatedMessages = currentMessagesRef.current.map(msg =>
          msg.id === messageId ? { ...msg, message_status: 'read' } : msg
        );

        try {
          await AsyncStorage.setItem(`messages_${currentConversationIdRef.current}`, JSON.stringify(updatedMessages));
          console.log(`💾 Message read status saved: ${messageId} -> read`);
        } catch (storageError) {
          console.error('Failed to save read status:', storageError);
        }
      }

      console.log(`✅ Message marked as read: ${messageId}`);
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  }, [updateMessageStatus]);

  // Handle message delivery confirmation
  const confirmMessageDelivery = useCallback(async (messageId: string): Promise<void> => {
    if (!messageId) return;

    try {
      // Update message status to delivered
      updateMessageStatus(messageId, 'delivered');

      // Save updated status to storage
      if (currentConversationIdRef.current) {
        const updatedMessages = currentMessagesRef.current.map(msg =>
          msg.id === messageId ? { ...msg, message_status: 'delivered' } : msg
        );

        try {
          await AsyncStorage.setItem(`messages_${currentConversationIdRef.current}`, JSON.stringify(updatedMessages));
          console.log(`💾 Message delivery status saved: ${messageId} -> delivered`);
        } catch (storageError) {
          console.error('Failed to save delivery status:', storageError);
        }
      }

      console.log(`✅ Message delivery confirmed: ${messageId}`);
    } catch (error) {
      console.error('Failed to confirm message delivery:', error);
    }
  }, [updateMessageStatus]);

  // Send message - SIMPLE APPROACH LIKE WHATSAPP (no optimistic messages)
  const sendMessage = useCallback(async (recipientId: string, content: string): Promise<void> => {
    if (!recipientId || !content.trim()) return;

    // Check if user is authenticated
    if (!user?.id) {
      console.error('❌ User not authenticated, cannot send message');
      throw new Error('User not authenticated');
    }

    try {
      console.log(`📤 Sending message to ${recipientId}: ${content}`);

      // Send message to backend
      const response = await API.post('/messages/send/', {
        recipient_id: recipientId,
        content: content.trim()
      });

      console.log('📡 Server response:', response.data);
      console.log('📊 Response status:', response.status);

      // Check if message was sent successfully
      if (response.status === 201 || response.data?.success || response.data?.id) {
        console.log('✅ Message sent successfully');

        // Get the actual message from response
        let serverMessage: Message;

        if (response.data?.data && validateMessage(response.data.data)) {
          serverMessage = validateMessage(response.data.data)!;
          console.log('📨 Using server message data:', serverMessage);
        } else if (response.data && validateMessage(response.data)) {
          serverMessage = validateMessage(response.data)!;
          console.log('📨 Using direct response data:', serverMessage);
        } else {
          // Create a proper message from response
          serverMessage = {
            id: response.data?.id || `msg_${Date.now()}`,
            content: content.trim(),
            sender: {
              id: user?.id?.toString() || '',
              username: user?.username || '',
              full_name: user?.full_name || user?.username || '',
              profile_picture: user?.profile_picture || '',
            },
            conversation: currentConversationIdRef.current || '',
            is_read: false,
            created_at: response.data?.created_at || new Date().toISOString(),
            time_ago: 'Just now',
            message_status: 'sent',
          };
          console.log('📨 Created message from response data:', serverMessage);
        }

        // Add the new message to the current messages
        setCurrentMessages(prev => {
          const newMessages = [...prev, serverMessage];
          console.log(`📝 Added new message. Total count: ${newMessages.length}`);
          return newMessages;
        });

        // Update conversations list
        await fetchConversations();

        // Save updated messages to storage
        if (currentConversationIdRef.current) {
          try {
            const updatedMessages = [...currentMessagesRef.current, serverMessage];
            await AsyncStorage.setItem(`messages_${currentConversationIdRef.current}`, JSON.stringify(updatedMessages));
            console.log('💾 Saved updated messages to storage');
          } catch (storageError) {
            console.error('Failed to save updated messages:', storageError);
          }
        }

        // Simple refresh like WhatsApp - no loading spinner
        try {
          await fetchConversations();
          console.log('🔄 Refreshed conversations to ensure receiver visibility');

          // Also refresh messages to ensure receiver sees the new message immediately
          if (currentConversationIdRef.current) {
            setTimeout(async () => {
              try {
                // Silent refresh without loading state
                const response = await API.get(`/conversations/${currentConversationIdRef.current}/messages/`);
                const data = Array.isArray(response.data) ? response.data : [];

                const validServerMessages: Message[] = [];
                for (const msg of data) {
                  const validMsg = validateMessage(msg);
                  if (validMsg) {
                    validServerMessages.push(validMsg);
                  }
                }

                if (validServerMessages.length > 0) {
                  validServerMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                  setCurrentMessages(validServerMessages);
                  console.log('🔄 Messages refreshed silently to ensure receiver visibility');
                }
              } catch (error) {
                console.log('Silent message refresh failed:', error);
              }
            }, 500);
          }
        } catch (error) {
          console.error('Failed to refresh conversations:', error);
        }

      } else {
        throw new Error(`Server returned unexpected response: ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      throw error;
    }
  }, [user, fetchConversations]);

  // Mark messages as read (with duplicate prevention) (FIXED - removed user check)
  const markAsRead = useCallback(async (conversationId: string): Promise<void> => {
    if (!conversationId) return;

    try {
      await API.post(`/conversations/${conversationId}/mark-read/`);
      console.log('✅ Messages marked as read');

      // Update local state using function form
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  }, []); // REMOVED user dependency

  // Join conversation with instant message loading
  const joinConversation = useCallback(async (conversationId: string) => {
    if (!conversationId) return;

    try {
      console.log(`🔄 Joining conversation ${conversationId}`);
      setCurrentConversationId(conversationId);

      // Load messages directly from server for instant display (no cache delay)
      await loadMessages(conversationId);

      console.log(`✅ Joined conversation ${conversationId}`);
    } catch (error) {
      console.error('Failed to join conversation:', error);
      throw error;
    }
  }, [loadMessages]);

  // Leave conversation with state preservation
  const leaveConversation = useCallback(() => {
    console.log('🚪 Leaving conversation, preserving messages in storage');

    if (currentConversationIdRef.current && currentMessagesRef.current.length > 0) {
      try {
        AsyncStorage.setItem(`messages_${currentConversationIdRef.current}`, JSON.stringify(currentMessagesRef.current));
        console.log(`💾 Preserved ${currentMessagesRef.current.length} messages for conversation ${currentConversationIdRef.current}`);
      } catch (storageError) {
        console.error('Failed to preserve messages:', storageError);
      }
    }

    setCurrentConversationId(null);
    console.log('✅ Left conversation, messages preserved in storage');
  }, []); // No dependencies to prevent infinite loops

  // Create or get conversation
  const createOrGetConversation = useCallback(async (recipientId: string): Promise<Conversation | null> => {
    if (!recipientId) return null;

    try {
      const response = await API.post('/conversations/create/', {
        recipient_id: recipientId
      });

      const conversationData = response.data?.data || response.data;
      if (!conversationData?.id) {
        console.error('Invalid conversation response:', response.data);
        return null;
      }

      // Refresh conversations list
      await fetchConversations();

      return conversationData;
    } catch (error) {
      console.error('Failed to create/get conversation:', error);
      return null;
    }
  }, [fetchConversations]);

  // REMOVED recoverMessageState - it was causing infinite loops

  // Sync messages for current conversation
  const syncMessages = useCallback(async (): Promise<void> => {
    if (!currentConversationIdRef.current) return;

    try {
      console.log(`🔄 Syncing messages for conversation ${currentConversationIdRef.current}`);
      await loadMessages(currentConversationIdRef.current);
    } catch (error) {
      console.error('Failed to sync messages:', error);
    }
  }, [loadMessages]);

  // Force refresh messages to ensure receiver visibility
  const forceRefreshMessages = useCallback(async (conversationId: string): Promise<void> => {
    if (!conversationId) return;

    try {
      console.log(`🔄 Force refreshing messages for conversation ${conversationId}`);

      // Clear current messages and reload from server
      setCurrentMessages([]);
      await loadMessages(conversationId);

      console.log(`✅ Force refresh completed for conversation ${conversationId}`);
    } catch (error) {
      console.error('Failed to force refresh messages:', error);
    }
  }, [loadMessages]);

  // Smart sync - load messages and update UI
  const smartSync = useCallback(async (): Promise<void> => {
    if (!currentConversationIdRef.current) return;

    try {
      console.log(`🔄 Syncing messages for conversation ${currentConversationIdRef.current}`);
      await loadMessages(currentConversationIdRef.current);
    } catch (error) {
      console.error('Failed to sync messages:', error);
    }
  }, [loadMessages]);

  // Background message check - silently updates UI without loading state
  const backgroundMessageCheck = useCallback(async (): Promise<void> => {
    if (!currentConversationIdRef.current) return;

    try {
      // Check for new messages silently (no loading state)
      const response = await API.get(`/conversations/${currentConversationIdRef.current}/messages/`);
      const data = Array.isArray(response.data) ? response.data :
        response.data?.results || response.data?.data || [];

      const validServerMessages: Message[] = [];
      for (const msg of data) {
        const validMsg = validateMessage(msg);
        if (validMsg) {
          validServerMessages.push(validMsg);
        }
      }

      // Check if there are new messages
      const currentMessageIds = new Set(currentMessagesRef.current.map(msg => msg.id));
      const newMessages = validServerMessages.filter(msg => !currentMessageIds.has(msg.id));

      if (newMessages.length > 0) {
        console.log(`🆕 Background check found ${newMessages.length} new messages, updating UI silently`);

        // Update UI immediately with new messages (no loading state)
        const updatedMessages = [...currentMessagesRef.current, ...newMessages];
        updatedMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        setCurrentMessages(updatedMessages);

        // Save updated messages to storage
        try {
          await AsyncStorage.setItem(`messages_${currentConversationIdRef.current}`, JSON.stringify(updatedMessages));
          console.log(`💾 Saved ${updatedMessages.length} updated messages to storage`);
        } catch (storageError) {
          console.error('Failed to save updated messages:', storageError);
        }

        // Also refresh conversations to update unread counts
        await fetchConversations();
      }

    } catch (error) {
      // Silent fail for background checks
      console.log('Background message check failed (silent):', error instanceof Error ? error.message : String(error));
    }
  }, [currentConversationIdRef.current, fetchConversations]);

  // Initialize
  React.useEffect(() => {
    const initializeChat = async () => {
      if (user && isAuthenticated) {
        await fetchConversations();
        setIsConnected(true);

        // More frequent refresh for better real-time updates
        const conversationRefreshInterval = setInterval(async () => {
          try {
            await fetchConversations();
          } catch (error) {
            console.log('Background refresh error:', error);
          }
        }, 15000); // Refresh every 15 seconds for better real-time updates

        // Message check interval for active conversations
        const messageCheckInterval = setInterval(async () => {
          if (currentConversationIdRef.current) {
            try {
              await backgroundMessageCheck();
            } catch (error) {
              console.log('Message check error:', error);
            }
          }
        }, 10000); // Check for new messages every 10 seconds

        console.log('✅ Chat initialized with frequent updates');

        // Cleanup intervals on unmount
        return () => {
          clearInterval(conversationRefreshInterval);
          clearInterval(messageCheckInterval);
          console.log('🧹 Chat intervals cleaned up');
        };
      } else {
        setConversations([]);
        setCurrentMessages([]);
        setCurrentConversationId(null);
        setIsConnected(false);
      }
    };

    initializeChat();
  }, [user, isAuthenticated, fetchConversations, backgroundMessageCheck]);

  // REMOVED: Temporary cleanup function - no longer needed

  // Ensure messages are synced when app comes to foreground (silently)
  React.useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active' && currentConversationIdRef.current) {
        console.log('📱 App became active, syncing messages silently...');
        // Small delay to ensure app is fully active, then sync without loading state
        setTimeout(async () => {
          try {
            // Silent sync without loading state
            const response = await API.get(`/conversations/${currentConversationIdRef.current}/messages/`);
            const data = Array.isArray(response.data) ? response.data :
              response.data?.results || response.data?.data || [];

            const validServerMessages: Message[] = [];
            for (const msg of data) {
              const validMsg = validateMessage(msg);
              if (validMsg) {
                validServerMessages.push(validMsg);
              }
            }

            // Update messages silently if there are changes
            if (validServerMessages.length !== currentMessagesRef.current.length) {
              validServerMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
              setCurrentMessages(validServerMessages);
              console.log('📱 Messages synced silently on app activation');
            }
          } catch (error) {
            console.log('Silent sync failed on app activation:', error);
          }
        }, 1000);
      }
    };

    // Listen for app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, []); // No dependencies to prevent unnecessary re-renders

  const value: ChatContextType = {
    conversations,
    currentMessages,
    isConnected,
    isLoading,
    currentConversationId,
    sendMessage,
    joinConversation,
    leaveConversation,
    fetchConversations,
    loadMessages,
    loadInitialMessages,
    markAsRead,
    createOrGetConversation,
    refreshConversations,
    refreshMessages,
    manualRefreshMessages,
    updateMessageStatus,
    syncMessages,
    confirmMessageDelivery,
    markMessageAsRead,
    smartSync,
    backgroundMessageCheck,
    forceRefreshMessages,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};