import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '@/utils/api';
import { useAuth } from './AuthContext';

// ============================================
// STABLE CHAT CONTEXT - Like WhatsApp/LinkedIn
// ============================================

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
  pending?: boolean; // Mark optimistic messages
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
  conversations: Conversation[];
  currentMessages: Message[];
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  hasMoreMessages: boolean;
  currentConversationId: string | null;
  fetchConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  sendMessage: (recipientId: string, content: string) => Promise<void>;
  joinConversation: (conversationId: string) => Promise<void>;
  leaveConversation: () => void;
  markAsRead: (conversationId: string) => Promise<void>;
  createOrGetConversation: (recipientId: string) => Promise<Conversation | null>;
  refreshMessages: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Refs
  const currentConversationIdRef = useRef<string | null>(null);
  const isSendingRef = useRef(false);

  // In-memory message cache - persists while app is in memory (like Instagram)
  const messageCacheRef = useRef<Map<string, Message[]>>(new Map());

  useEffect(() => {
    currentConversationIdRef.current = currentConversationId;
  }, [currentConversationId]);

  // ============================================
  // VALIDATE MESSAGE
  // ============================================
  const validateMessage = useCallback((msg: any): Message | null => {
    if (!msg || !msg.id || !msg.content || !msg.sender?.id) return null;
    return {
      id: String(msg.id),
      content: String(msg.content),
      sender: {
        id: String(msg.sender.id),
        username: String(msg.sender.username || ''),
        full_name: String(msg.sender.full_name || msg.sender.username || ''),
        profile_picture: msg.sender.profile_picture,
      },
      conversation: String(msg.conversation || ''),
      is_read: Boolean(msg.is_read),
      created_at: msg.created_at || new Date().toISOString(),
      time_ago: msg.time_ago || 'Just now',
      pending: false,
    };
  }, []);

  // ============================================
  // FETCH CONVERSATIONS
  // ============================================
  const fetchConversations = useCallback(async (): Promise<void> => {
    try {
      const response = await API.get('/conversations/');
      const data = Array.isArray(response.data) ? response.data :
        response.data?.results || response.data?.data || [];
      setConversations(data.filter((c: any) => c?.id && c?.participants));
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  }, []);

  // ============================================
  // LOAD MESSAGES FROM SERVER
  // ============================================
  const loadMessages = useCallback(async (conversationId: string, backgroundRefresh = false): Promise<void> => {
    if (!conversationId) return;

    // Don't load while sending (would clear optimistic message)
    if (isSendingRef.current) {
      console.log('⏸️ Skipping load - send in progress');
      return;
    }

    // Only show loading spinner if no cached data exists (first-ever open)
    if (!backgroundRefresh) {
      const hasCached = messageCacheRef.current.has(conversationId);
      if (!hasCached) {
        setIsLoading(true);
      }
    }

    try {
      const response = await API.get(`/conversations/${conversationId}/messages/`);
      let data: any[] = [];
      let nextUrl: string | null = null;

      if (response.data && response.data.results) {
        data = response.data.results;
        nextUrl = response.data.next;
      } else if (Array.isArray(response.data)) {
        data = response.data;
      } else if (response.data && response.data.data) {
        data = response.data.data;
      }

      setNextPageUrl(nextUrl);

      const messages = data
        .map(validateMessage)
        .filter((m): m is Message => m !== null)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      // Preserve pending and existing messages
      setCurrentMessages(prev => {
        const pending = prev.filter(m => m.pending);
        const serverIds = new Set(messages.map(m => m.id));
        
        // Merge with existing older messages if background refresh, otherwise load fresh page
        const existingOlder = backgroundRefresh 
          ? prev.filter(m => !serverIds.has(m.id)) 
          : [];

        const uniquePending = pending.filter(p => !serverIds.has(p.id));
        const merged = [...existingOlder, ...messages, ...uniquePending];
        merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        // Update in-memory cache
        messageCacheRef.current.set(conversationId, merged);
        return merged;
      });

      // Also persist to AsyncStorage for cold-start fallback
      await AsyncStorage.setItem(`messages_${conversationId}`, JSON.stringify(messages));
    } catch (error) {
      console.error('Failed to load messages:', error);
      // Try AsyncStorage cache only if we have nothing in memory
      if (!messageCacheRef.current.has(conversationId)) {
        try {
          const cached = await AsyncStorage.getItem(`messages_${conversationId}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            setCurrentMessages(parsed);
            messageCacheRef.current.set(conversationId, parsed);
          }
        } catch { }
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [validateMessage]);

  // ============================================
  // SEND MESSAGE - STABLE APPROACH
  // ============================================
  const sendMessage = useCallback(async (recipientId: string, content: string): Promise<void> => {
    if (!recipientId || !content.trim() || !user?.id) return;

    const messageContent = content.trim();
    const tempId = `temp_${Date.now()}`;

    // Mark as sending
    isSendingRef.current = true;

    // Create optimistic message
    const optimisticMessage: Message = {
      id: tempId,
      content: messageContent,
      sender: {
        id: String(user.id),
        username: user.username || '',
        full_name: user.full_name || user.username || '',
        profile_picture: user.profile_picture,
      },
      conversation: currentConversationIdRef.current || '',
      is_read: false,
      created_at: new Date().toISOString(),
      time_ago: 'Just now',
      pending: true,
    };

    // Add immediately
    setCurrentMessages(prev => {
      const updated = [...prev, optimisticMessage];
      // Update cache with optimistic message
      if (currentConversationIdRef.current) {
        messageCacheRef.current.set(currentConversationIdRef.current, updated);
      }
      return updated;
    });
    console.log('✨ Optimistic message added:', tempId);

    try {
      const response = await API.post('/messages/send/', {
        recipient_id: recipientId,
        content: messageContent
      });

      if (response.status === 201 || response.data?.id) {
        // Replace optimistic with real message
        const realMessage = validateMessage(response.data);

        if (realMessage) {
          setCurrentMessages(prev => {
            const updated = prev.map(m => m.id === tempId ? { ...realMessage, pending: false } : m);
            // Update cache
            if (currentConversationIdRef.current) {
              messageCacheRef.current.set(currentConversationIdRef.current, updated);
            }
            return updated;
          });
          console.log('✅ Replaced with real message:', realMessage.id);
        } else {
          // Mark as confirmed even if we can't parse response
          setCurrentMessages(prev => {
            const updated = prev.map(m => m.id === tempId ? { ...m, pending: false } : m);
            if (currentConversationIdRef.current) {
              messageCacheRef.current.set(currentConversationIdRef.current, updated);
            }
            return updated;
          });
          console.log('⚠️ Could not parse real message, kept optimistic');
        }
        fetchConversations();
      } else {
        console.log('❌ Unexpected response status:', response.status);
        throw new Error('Server did not confirm');
      }
    } catch (error: any) {
      console.error('❌ =================================');
      console.error('❌ MESSAGE SEND FAILED');
      console.error('❌ Error type:', error?.constructor?.name);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Response status:', error?.response?.status);
      console.error('❌ Response data:', JSON.stringify(error?.response?.data, null, 2));
      console.error('❌ Full error:', error);
      console.error('❌ =================================');

      // Remove optimistic message on failure
      setCurrentMessages(prev => prev.filter(m => m.id !== tempId));
      console.error('❌ Removed optimistic message:', tempId);
      throw error;
    } finally {
      isSendingRef.current = false;
    }
  }, [user, validateMessage, fetchConversations]);

  // ============================================
  // JOIN CONVERSATION
  // ============================================
  const joinConversation = useCallback(async (conversationId: string): Promise<void> => {
    if (!conversationId) return;

    setCurrentConversationId(conversationId);

    // Check in-memory cache first (Instagram-like instant load)
    const cachedMessages = messageCacheRef.current.get(conversationId);
    if (cachedMessages && cachedMessages.length > 0) {
      // Show cached messages instantly - no loading spinner
      setCurrentMessages(cachedMessages);
      console.log('⚡ Loaded from cache:', cachedMessages.length, 'messages');
      // Fetch fresh data in the background
      loadMessages(conversationId, true);
    } else {
      // No cache - clear and load fresh (shows loading spinner)
      setCurrentMessages([]);
      await loadMessages(conversationId);
    }
  }, [loadMessages]);

  // ============================================
  // LEAVE CONVERSATION
  // ============================================
  const leaveConversation = useCallback(() => {
    // Don't clear messages from cache - just reset the current view
    setCurrentConversationId(null);
    setCurrentMessages([]);
    setNextPageUrl(null);
    setIsLoadingMore(false);
  }, []);

  // ============================================
  // LOAD MORE (PAGINATED) MESSAGES
  // ============================================
  const loadMoreMessages = useCallback(async (): Promise<void> => {
    if (!nextPageUrl || isLoadingMore || !currentConversationId) return;

    setIsLoadingMore(true);
    console.log('🔄 Loading more messages from:', nextPageUrl);

    try {
      // API client uses relative URLs. If nextPageUrl is absolute, extract path + query
      let url = nextPageUrl;
      const urlObj = nextPageUrl.split('/api');
      if (urlObj.length > 1) {
        url = urlObj[1];
      }

      const response = await API.get(url);
      let data: any[] = [];
      let nextUrl: string | null = null;

      if (response.data && response.data.results) {
        data = response.data.results;
        nextUrl = response.data.next;
      } else if (Array.isArray(response.data)) {
        data = response.data;
      }

      setNextPageUrl(nextUrl);

      const newMessages = data
        .map(validateMessage)
        .filter((m): m is Message => m !== null);

      setCurrentMessages(prev => {
        const serverIds = new Set(prev.map(m => m.id));
        const uniqueNew = newMessages.filter(m => !serverIds.has(m.id));
        const merged = [...prev, ...uniqueNew];
        merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        if (currentConversationId) {
          messageCacheRef.current.set(currentConversationId, merged);
        }
        return merged;
      });
      console.log('✅ Loaded', newMessages.length, 'older messages successfully');
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextPageUrl, isLoadingMore, currentConversationId, validateMessage]);

  // ============================================
  // MARK AS READ
  // ============================================
  const markAsRead = useCallback(async (conversationId: string): Promise<void> => {
    if (!conversationId) return;
    try {
      await API.post(`/conversations/${conversationId}/mark-read/`);
      setConversations(prev =>
        prev.map(c => c.id === conversationId ? { ...c, unread_count: 0 } : c)
      );
    } catch { }
  }, []);

  // ============================================
  // CREATE OR GET CONVERSATION
  // ============================================
  const createOrGetConversation = useCallback(async (recipientId: string): Promise<Conversation | null> => {
    if (!recipientId) return null;
    try {
      const response = await API.post('/conversations/create/', { recipient_id: recipientId });
      const data = response.data?.data || response.data;
      if (data?.id) {
        await fetchConversations();
        return data;
      }
    } catch { }
    return null;
  }, [fetchConversations]);

  // ============================================
  // REFRESH MESSAGES
  // ============================================
  const refreshMessages = useCallback(async (): Promise<void> => {
    if (currentConversationIdRef.current && !isSendingRef.current) {
      setIsRefreshing(true);
      await loadMessages(currentConversationIdRef.current);
    }
  }, [loadMessages]);

  // ============================================
  // INITIALIZE
  // ============================================
  useEffect(() => {
    if (user && isAuthenticated) {
      fetchConversations();
    } else {
      setConversations([]);
      setCurrentMessages([]);
      setCurrentConversationId(null);
    }
  }, [user, isAuthenticated, fetchConversations]);

  // ============================================
  // CONVERSATION POLLING (for unread counts)
  // ============================================
  useEffect(() => {
    if (!user || !isAuthenticated) return;
    const interval = setInterval(fetchConversations, 15000);
    return () => clearInterval(interval);
  }, [user, isAuthenticated, fetchConversations]);

  // ============================================
  // MESSAGE POLLING (when in conversation)
  // ============================================
  useEffect(() => {
    if (!currentConversationId) return;

    console.log('🔄 Starting message polling for conversation:', currentConversationId);

    const interval = setInterval(async () => {
      // Skip if sending
      if (isSendingRef.current) {
        console.log('⏸️ Polling skipped - send in progress');
        return;
      }

      try {
        const response = await API.get(`/conversations/${currentConversationIdRef.current}/messages/`);
        let data: any[] = [];
        
        if (response.data && response.data.results) {
          data = response.data.results;
        } else if (Array.isArray(response.data)) {
          data = response.data;
        }

        console.log('🔄 POLLING: Raw server data count:', data.length);

        const serverMessages = data
          .map(validateMessage)
          .filter((m): m is Message => m !== null)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        console.log('🔄 POLLING: Valid messages count:', serverMessages.length);

        setCurrentMessages(prev => {
          // Keep pending messages (optimistic updates)
          const pending = prev.filter(m => m.pending);
          const serverIds = new Set(serverMessages.map(m => m.id));

          // Merge polled messages with existing ones in state to preserve older paginated history
          const existingOlder = prev.filter(m => !serverIds.has(m.id));
          const stillPending = pending.filter(p => !serverIds.has(p.id));
          const merged = [...existingOlder, ...serverMessages, ...stillPending];
          merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

          // Check if anything actually changed
          const changed = prev.length !== merged.length ||
            prev.some((msg, idx) => msg.id !== merged[idx]?.id || msg.is_read !== merged[idx]?.is_read);

          if (changed) {
            if (currentConversationIdRef.current) {
              messageCacheRef.current.set(currentConversationIdRef.current, merged);
            }
            return merged;
          }
          return prev;
        });
      } catch (err) {
        console.error('🔄 POLLING ERROR:', err);
      }
    }, 5000);

    return () => {
      console.log('🛑 Stopping message polling');
      clearInterval(interval);
    };
  }, [currentConversationId, validateMessage]);

  return (
    <ChatContext.Provider value={{
      conversations,
      currentMessages,
      isLoading,
      isRefreshing,
      isLoadingMore,
      hasMoreMessages: !!nextPageUrl,
      currentConversationId,
      fetchConversations,
      loadMessages,
      loadMoreMessages,
      sendMessage,
      joinConversation,
      leaveConversation,
      markAsRead,
      createOrGetConversation,
      refreshMessages,
    }}>
      {children}
    </ChatContext.Provider>
  );
};