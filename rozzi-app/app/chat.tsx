import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Animated,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCustomFonts } from '@/hooks/fonts';
import ProfilePicture from '@/components/ProfilePicture';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

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
}

export default function ChatScreen() {
  const [fontsLoaded] = useCustomFonts();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { colors, colorScheme } = useAppTheme();
  const s = React.useMemo(() => getStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const {
    currentMessages,
    sendMessage,
    joinConversation,
    leaveConversation,
    conversations,
    isLoading,
    isRefreshing,
    isLoadingMore,
    hasMoreMessages,
    loadMoreMessages,
    markAsRead,
    refreshMessages,
  } = useChat();

  // State
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScreenLoading, setIsScreenLoading] = useState(true);


  // Refs
  const scrollViewRef = useRef<ScrollView>(null);

  // Skeleton pulse animation
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (isLoading && currentMessages.length === 0) {
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
  }, [isLoading, currentMessages.length]);

  // Get params
  const otherUserId = params.userId as string;
  // We no longer rely on userName from params for the header to avoid stale data
  const conversationId = params.conversationId as string;

  // Local state for user details if not in context
  const [otherUser, setOtherUser] = useState<{
    full_name: string;
    username: string;
    profile_picture?: string;
  } | null>(null);

  // Get other user profile from context OR fetch it
  useEffect(() => {
    if (conversations && conversations.length > 0) {
      const conv = conversations.find(c => c.id.toString() === conversationId);
      if (conv?.other_participant) {
        setOtherUser(conv.other_participant);
        return;
      }
    }

    // If not found in context (e.g. deep link or first load), we could fetch it
    // For now, we'll try to use what we have or wait for the conversation to load
  }, [conversations, conversationId]);

  // Validation
  if (!otherUserId || !conversationId) {
    return (
      <View style={[s.container, { backgroundColor: colors.brandBackground }]}>
        <View style={s.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={s.errorTitle}>Invalid Conversation</Text>
          <Text style={s.errorText}>
            Missing required parameters. Please go back and try again.
          </Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => router.back()}>
            <Text style={s.retryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!fontsLoaded) return null;

  // ============================================
  // SINGLE INITIALIZATION - Join conversation
  // ============================================
  useEffect(() => {
    if (!conversationId) return;

    const init = async () => {
      try {
        setIsScreenLoading(true);
        setError(null);
        console.log('🔄 Joining conversation:', conversationId);
        await joinConversation(conversationId);
        await markAsRead(conversationId);
        console.log('✅ Conversation ready');
      } catch (err) {
        console.error('Failed to join conversation:', err);
        setError('Failed to load conversation');
      } finally {
        setIsScreenLoading(false);
      }
    };

    init();

    return () => {
      console.log('🚪 Leaving conversation');
      leaveConversation();
    };
  }, [conversationId]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (currentMessages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [currentMessages.length]);

  // Note: Polling in ChatContext handles real-time updates - no useFocusEffect needed

  // ============================================
  // FORMAT TIME
  // ============================================
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
    } catch {
      return 'Unknown';
    }
  };

  // ============================================
  // CHECK IF OWN MESSAGE
  // ============================================
  const isOwnMessage = (message: Message): boolean => {
    return String(message.sender.id) === String(user?.id);
  };

  // ============================================
  // SEND MESSAGE
  // ============================================
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || isSending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setIsSending(true);
    setError(null);

    try {
      await sendMessage(otherUserId, messageText);

      // Scroll to bottom after sending
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 200);

    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message');
      setNewMessage(messageText); // Restore message
    } finally {
      setIsSending(false);
    }
  }, [newMessage, isSending, sendMessage, otherUserId]);

  // ============================================
  // PULL TO REFRESH
  // ============================================
  const handleRefresh = useCallback(async () => {
    await refreshMessages();
  }, [refreshMessages]);

  // Handle scrolling to top to load older messages
  const handleScroll = useCallback((event: any) => {
    const { y } = event.nativeEvent.contentOffset;
    if (y < 20 && hasMoreMessages && !isLoadingMore && !isLoading && !isRefreshing) {
      loadMoreMessages();
    }
  }, [hasMoreMessages, isLoadingMore, isLoading, isRefreshing, loadMoreMessages]);

  // ============================================
  // RENDER CLICKABLE LINKS IN MESSAGE
  // ============================================
  const URL_REGEX = /(https?:\/\/[^\s]+)/g;

  const renderMessageContent = (text: string, isOwn: boolean) => {
    const parts = text.split(URL_REGEX);
    if (parts.length === 1) {
      // No URLs found, return plain text
      return text;
    }

    return parts.map((part, index) => {
      if (URL_REGEX.test(part)) {
        // Reset lastIndex since we reuse the regex
        URL_REGEX.lastIndex = 0;
        return (
          <Text
            key={index}
            style={{
              color: isOwn ? '#00E5FF' : '#2563eb',
              textDecorationLine: 'underline',
              fontWeight: '600',
            }}
            onPress={() => Linking.openURL(part)}
          >
            {part}
          </Text>
        );
      }
      // Reset lastIndex for next iteration
      URL_REGEX.lastIndex = 0;
      return part;
    });
  };

  // ============================================
  // RENDER MESSAGE
  // ============================================
  const renderMessage = (message: Message) => {
    const isOwn = isOwnMessage(message);

    return (
      <View key={message.id} style={[
        s.msgRow,
        isOwn ? s.msgRowOwn : s.msgRowOther
      ]}>
        <View style={[
          s.msgBubble,
          isOwn ? s.msgBubbleOwn : [s.msgBubbleOther, { backgroundColor: colors.card, borderColor: colors.border }]
        ]}>
          <Text style={[
            s.msgText,
            isOwn ? s.msgTextOwn : s.msgTextOther,
            !isOwn && { color: colors.text }
          ]}>
            {renderMessageContent(message.content, isOwn)}
          </Text>
          <View style={s.msgMeta}>
            <Text style={[
              s.msgTime,
              isOwn ? s.msgTimeOwn : s.msgTimeOther
            ]}>
              {formatTime(message.created_at)}
            </Text>
            {isOwn && (
              <Ionicons
                name={message.is_read ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={message.is_read ? '#A78BFA' : 'rgba(255,255,255,0.5)'}
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  // ============================================
  // ERROR STATE
  // ============================================
  if (error && currentMessages.length === 0) {
    return (
      <View style={[s.container, { backgroundColor: colors.brandBackground }]}>
        <View style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: Math.max(insets.top + (Platform.OS === 'ios' ? 10 : 14), Platform.OS === 'ios' ? 54 : 38) }]}>
          <TouchableOpacity style={[s.backBtn, { backgroundColor: colors.cardAlt }]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={[s.headerName, { color: colors.text }]}>Error</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
        <View style={s.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={s.errorTitle}>Something went wrong</Text>
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity
            style={s.retryBtn}
            onPress={() => {
              setError(null);
              joinConversation(conversationId);
            }}
          >
            <Text style={s.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <KeyboardAvoidingView
      style={[s.container, { backgroundColor: colors.brandBackground }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* ── Header ── */}
      <View style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: Math.max(insets.top + (Platform.OS === 'ios' ? 10 : 14), Platform.OS === 'ios' ? 54 : 38) }]}>
        <TouchableOpacity style={[s.backBtn, { backgroundColor: colors.cardAlt }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={s.headerCenter}
          onPress={() => router.push(`/user-profile?userId=${otherUserId}`)}
          activeOpacity={0.7}
        >
          <ProfilePicture
            size={38}
            userId={otherUserId}
            imageUrl={otherUser?.profile_picture}
            noBorder={true}
          />
          <View style={s.headerInfo}>
            <Text style={[s.headerName, { color: colors.text }]} numberOfLines={1}>
              {otherUser?.full_name || "Loading..."}
            </Text>
            <Text style={[s.headerSub, { color: colors.textSecondary }]}>Tap to view profile</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.moreBtn, { backgroundColor: colors.cardAlt }]}
          onPress={() => setShowOptionsModal(true)}
        >
          <Ionicons name="ellipsis-vertical" size={18} color={colors.icon} />
        </TouchableOpacity>
      </View>

      {/* ── Messages ── */}
      <ScrollView
        ref={scrollViewRef}
        style={s.msgList}
        contentContainerStyle={s.msgListContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#7C3AED']}
            tintColor="#7C3AED"
          />
        }
      >
        {isLoadingMore && (
          <ActivityIndicator 
            size="small" 
            color="#7C3AED" 
            style={{ marginVertical: 12, alignSelf: 'center' }} 
          />
        )}
        {(isScreenLoading || isLoading) && currentMessages.length === 0 ? (
          <Animated.View style={[s.skeletonContainer, { opacity: pulseAnim }]}>
            {/* Bubble 1: Other participant (Left) */}
            <View style={[s.skeletonRow, s.skeletonRowOther]}>
              <View style={[s.skeletonBubble, s.skeletonBubbleOther, { backgroundColor: colors.card, borderColor: colors.border }]} />
            </View>

            {/* Bubble 2: Current user (Right) */}
            <View style={[s.skeletonRow, s.skeletonRowOwn]}>
              <View style={[s.skeletonBubble, s.skeletonBubbleOwn, { backgroundColor: colors.primary, opacity: 0.25 }]} />
            </View>

            {/* Bubble 3: Other participant (Left, short) */}
            <View style={[s.skeletonRow, s.skeletonRowOther]}>
              <View style={[s.skeletonBubble, s.skeletonBubbleOther, s.skeletonBubbleShort, { backgroundColor: colors.card, borderColor: colors.border }]} />
            </View>

            {/* Bubble 4: Current user (Right, medium) */}
            <View style={[s.skeletonRow, s.skeletonRowOwn]}>
              <View style={[s.skeletonBubble, s.skeletonBubbleOwn, s.skeletonBubbleMedium, { backgroundColor: colors.primary, opacity: 0.25 }]} />
            </View>
          </Animated.View>
        ) : currentMessages.length > 0 ? (
          currentMessages.map(renderMessage)
        ) : (
          <View style={s.emptyWrap}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="chatbubble-ellipses-outline" size={40} color="#C4B5FD" />
            </View>
            <Text style={[s.emptyTitle, { color: colors.text }]}>No messages yet</Text>
            <Text style={[s.emptySub, { color: colors.textSecondary }]}>
              Start the conversation by sending a message!
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Error Toast ── */}
      {error && (
        <View style={s.errorToast}>
          <Text style={s.errorToastText}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <Ionicons name="close" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Input Bar ── */}
      <View style={[s.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TextInput
          style={[s.inputField, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={1000}
          onSubmitEditing={handleSendMessage}
          editable={!isSending}
        />

        <TouchableOpacity
          style={[
            s.sendBtn,
            newMessage.trim() && !isSending && s.sendBtnActive
          ]}
          onPress={handleSendMessage}
          disabled={!newMessage.trim() || isSending}
        >
          {isSending ? (
            <ActivityIndicator size={16} color={colors.textSecondary} />
          ) : (
            <Ionicons
              name="send"
              size={18}
              color={newMessage.trim() ? "#FFFFFF" : colors.textSecondary}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* ── Options Modal ── */}
      <Modal
        visible={showOptionsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsModal(false)}
        >
          <View style={[s.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[s.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[s.modalTitle, { color: colors.text }]}>Options</Text>

            <TouchableOpacity
              style={[s.modalOption, { borderBottomColor: colors.border }]}
              onPress={() => {
                setShowOptionsModal(false);
                router.push(`/user-profile?userId=${otherUserId}`);
              }}
            >
              <View style={[s.modalIconWrap, { backgroundColor: 'rgba(124, 58, 237, 0.1)' }]}>
                <Ionicons name="person-outline" size={20} color="#7C3AED" />
              </View>
              <Text style={[s.modalOptionText, { color: colors.text }]}>View Profile</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.modalOption, { borderBottomWidth: 0 }]}
              onPress={() => setShowOptionsModal(false)}
            >
              <View style={[s.modalIconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <Ionicons name="ban-outline" size={20} color="#EF4444" />
              </View>
              <Text style={[s.modalOptionText, { color: '#EF4444' }]}>Block User</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ── STYLES ──────────────────────────────────────────────────────────

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.brandBackground,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 54 : 38,
    paddingBottom: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brandBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 10,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  headerSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  moreBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brandBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Messages ──
  msgList: {
    flex: 1,
  },
  msgListContent: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    paddingBottom: 8,
  },
  msgRow: {
    marginBottom: 6,
    flexDirection: 'row',
    width: '100%',
  },
  msgRowOwn: {
    justifyContent: 'flex-end',
  },
  msgRowOther: {
    justifyContent: 'flex-start',
  },
  msgBubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  msgBubbleOwn: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
    marginLeft: 'auto',
  },
  msgBubbleOther: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
    marginRight: 'auto',
    borderWidth: 1,
    borderColor: colors.border,
  },
  msgText: {
    fontSize: 15,
    lineHeight: 21,
  },
  msgTextOwn: {
    color: '#FFFFFF',
  },
  msgTextOther: {
    color: colors.text,
  },
  msgMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  msgTime: {
    fontSize: 11,
  },
  msgTimeOwn: {
    color: 'rgba(255,255,255,0.65)',
  },
  msgTimeOther: {
    color: colors.textSecondary,
  },

  // ── Loading ──
  loadingWrap: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },

  // ── Skeleton Loader ──
  skeletonContainer: {
    paddingVertical: 16,
    gap: 12,
  },
  skeletonRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 6,
  },
  skeletonRowOwn: {
    justifyContent: 'flex-end',
  },
  skeletonRowOther: {
    justifyContent: 'flex-start',
  },
  skeletonBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    height: 52,
  },
  skeletonBubbleOther: {
    width: '65%',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  skeletonBubbleOwn: {
    width: '55%',
    borderBottomRightRadius: 4,
  },
  skeletonBubbleShort: {
    width: '40%',
  },
  skeletonBubbleMedium: {
    width: '50%',
  },

  // ── Empty state ──
  emptyWrap: {
    padding: 48,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── Input bar ──
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: '#F0EEF6',
  },
  inputField: {
    flex: 1,
    backgroundColor: colors.brandBackground,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: colors.text,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8E8EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendBtnActive: {
    backgroundColor: colors.primary,
  },

  // ── Error ──
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 20,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  errorToast: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorToastText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
});
