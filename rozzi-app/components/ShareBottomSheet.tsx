import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Share,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useChat } from '@/contexts/ChatContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import ProfilePicture from './ProfilePicture';
import API from '@/utils/api';
import { router } from 'expo-router';


const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ShareBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  shareType: 'profile' | 'post';
  data: {
    id?: string | number; // Post ID or User ID
    username?: string;    // User handle (for profile)
    name?: string;        // Full name (for profile)
    title?: string;       // Post title (for post)
    description?: string; // Post description (for post)
    creatorName?: string; // Creator name (for post)
  };
}

export default function ShareBottomSheet({ visible, onClose, shareType, data }: ShareBottomSheetProps) {
  const { colors, colorScheme } = useAppTheme();
  const styles = React.useMemo(() => getStyles(colors, colorScheme), [colors, colorScheme]);
  const { conversations = [], sendMessage, createOrGetConversation } = useChat();

  // Internal view state: 'options' | 'send_message'
  const [currentView, setCurrentView] = useState<'options' | 'send_message'>('options');
  
  // Send message states
  const [searchQuery, setSearchQuery] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]); // recipient user IDs
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [sendingMessages, setSendingMessages] = useState(false);

  // TODO: Replace with actual Play Store URL once published
  // e.g. https://play.google.com/store/apps/details?id=com.rozzi.app
  const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.rozzi.app';

  // Rich share text (LinkedIn/Instagram-style)
  const getShareText = () => {
    if (shareType === 'profile') {
      return `👤 ${data.name || 'Someone amazing'} is on Rozzi!\n\n` +
        `@${data.username || ''}\n\n` +
        `Check out their profile and connect with them on Rozzi.\n\n` +
        `📲 Download Rozzi: ${PLAY_STORE_URL}\n\n` +
        `#Rozzi #Networking #Hiring`;
    } else {
      const desc = data.description ? `\n📝 ${data.description.slice(0, 100)}${data.description.length > 100 ? '...' : ''}` : '';
      return `💼 Job Opportunity: "${data.title || 'New Position'}"\n\n` +
        `Posted by ${data.creatorName || 'a recruiter'} on Rozzi.${desc}\n\n` +
        `Interested? Download the Rozzi app to apply!\n\n` +
        `📲 Download Rozzi: ${PLAY_STORE_URL}\n\n` +
        `#Rozzi #Jobs #Hiring #Opportunity`;
    }
  };

  // Reset states when modal visibility changes
  useEffect(() => {
    if (visible) {
      setCurrentView('options');
      setSearchQuery('');
      setSelectedContacts([]);
      setSearchResults([]);
      
      // Pre-fill in-chat message (concise for DMs)
      if (shareType === 'profile') {
        setCustomMessage(`Hey! Check out ${data.name || 'this person'}'s profile on Rozzi 👤\n@${data.username || ''}`);
      } else {
        setCustomMessage(`Hey! Found this job on Rozzi that might interest you 💼\n"${data.title || 'Job'}" — posted by ${data.creatorName || 'a recruiter'}`);
      }
    }
  }, [visible, shareType, data]);

  // Handle Search for Users to send message
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        performUserSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const performUserSearch = async (query: string) => {
    try {
      setSearchingUsers(true);
      const response = await API.get(`/users/search/?q=${encodeURIComponent(query.trim())}`);
      const users = response.data?.results || response.data || [];
      setSearchResults(users);
    } catch (error) {
      console.error('Error searching users in share:', error);
      setSearchResults([]);
    } finally {
      setSearchingUsers(false);
    }
  };

  // Option Action handlers
  const handleCopyLink = async () => {
    try {
      // Dynamic require to avoid Metro bundler crash if expo-clipboard isn't installed
      const ClipboardModule = require('expo-clipboard');
      await ClipboardModule.setStringAsync(getShareText());
      Alert.alert('Copied!', 'Share text has been copied to your clipboard.');
      onClose();
    } catch (error) {
      console.error('Clipboard fallback - showing text for manual copy:', error);
      // Graceful fallback: show the text so user can long-press to copy
      Alert.alert(
        'Copy this text',
        getShareText(),
        [
          { text: 'OK', onPress: () => onClose() },
          { text: 'Share Instead', onPress: () => handleNativeShare() },
        ]
      );
    }
  };

  const handleNativeShare = async () => {
    try {
      const shareText = getShareText();
        
      await Share.share({
        message: shareText,
        title: shareType === 'profile' ? `${data.name}'s Profile — Rozzi` : `${data.title} — Rozzi`,
      });
      onClose();
    } catch (error) {
      console.error('Error in native share:', error);
    }
  };


  const toggleContactSelection = (userId: string) => {
    setSelectedContacts(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const handleSendMessages = async () => {
    if (selectedContacts.length === 0) return;
    
    try {
      setSendingMessages(true);
      
      // Send message to each selected contact
      for (const recipientId of selectedContacts) {
        // Ensure conversation exists or initialize it
        const conversation = await createOrGetConversation(recipientId);
        if (conversation) {
          await sendMessage(recipientId, customMessage.trim());
        }
      }
      
      Alert.alert('Success', 'Shared successfully in messages!');
      onClose();
    } catch (error) {
      console.error('Error sending share message:', error);
      Alert.alert('Error', 'Failed to send messages. Please try again.');
    } finally {
      setSendingMessages(false);
    }
  };

  // Get contact candidates (recent chats + search results)
  const getContacts = () => {
    if (searchQuery.trim().length >= 2) {
      return searchResults;
    }
    
    // Map existing conversations to user objects
    return conversations
      .map((c: any) => c.other_participant)
      .filter(Boolean);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.dismissArea} onPress={onClose} />
        
        <View style={[styles.sheetContainer, { backgroundColor: colors.card }]}>
          {/* Accent indicator drag bar */}
          <View style={[styles.dragBar, { backgroundColor: colors.border }]} />

          {currentView === 'options' ? (
            /* ── VIEW 1: SHARE OPTIONS ── */
            <View>
              <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Share</Text>
                <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.cardAlt }]}>
                  <Feather name="x" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.optionsList}>
                <TouchableOpacity style={styles.optionItem} onPress={() => setCurrentView('send_message')}>
                  <View style={[styles.iconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                    <Feather name="send" size={22} color="#3b82f6" />
                  </View>
                  <View style={styles.optionDetails}>
                    <Text style={[styles.optionText, { color: colors.text }]}>Send in a message</Text>
                    <Text style={[styles.optionSubtext, { color: colors.textSecondary }]}>Share with your contacts directly</Text>
                  </View>
                </TouchableOpacity>


                <TouchableOpacity style={styles.optionItem} onPress={handleCopyLink}>
                  <View style={[styles.iconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                    <Feather name="copy" size={22} color="#10b981" />
                  </View>
                  <View style={styles.optionDetails}>
                    <Text style={[styles.optionText, { color: colors.text }]}>Copy to clipboard</Text>
                    <Text style={[styles.optionSubtext, { color: colors.textSecondary }]}>Copy share text to paste anywhere</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.optionItem} onPress={handleNativeShare}>
                  <View style={[styles.iconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                    <Feather name="share-2" size={22} color="#f59e0b" />
                  </View>
                  <View style={styles.optionDetails}>
                    <Text style={[styles.optionText, { color: colors.text }]}>Share via...</Text>
                    <Text style={[styles.optionSubtext, { color: colors.textSecondary }]}>WhatsApp, Instagram, and more</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* ── VIEW 2: SEND IN A MESSAGE ── */
            <View style={styles.sendMessageView}>
              <View style={styles.header}>
                <TouchableOpacity onPress={() => setCurrentView('options')} style={[styles.backButton, { backgroundColor: colors.cardAlt }]}>
                  <Ionicons name="arrow-back" size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Send in message</Text>
                <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.cardAlt }]}>
                  <Feather name="x" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Message Input Box */}
              <View style={[styles.messageInputContainer, { borderColor: colors.border }]}>
                <TextInput
                  style={[styles.messageInput, { color: colors.text }]}
                  multiline
                  numberOfLines={3}
                  value={customMessage}
                  onChangeText={setCustomMessage}
                  placeholder="Add a message..."
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* Contact Search */}
              <View style={[styles.searchBox, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                <Ionicons name="search" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Search people..."
                  placeholderTextColor={colors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {/* Contacts List */}
              <ScrollView style={styles.contactsScroll} showsVerticalScrollIndicator={false}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  {searchQuery.trim().length >= 2 ? 'Search Results' : 'Recent Chats'}
                </Text>
                
                {searchingUsers ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : getContacts().length === 0 ? (
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No people found. Try another search.
                  </Text>
                ) : (
                  getContacts().map((contact: any) => {
                    const isSelected = selectedContacts.includes(contact.id.toString());
                    return (
                      <TouchableOpacity
                        key={contact.id}
                        style={[
                          styles.contactRow,
                          isSelected && [styles.selectedContactRow, { backgroundColor: colors.cardAlt }]
                        ]}
                        onPress={() => toggleContactSelection(contact.id.toString())}
                      >
                        <ProfilePicture
                          size={40}
                          showLongPress={false}
                          imageUrl={contact.profile_picture}
                          noBorder={true}
                        />
                        <View style={styles.contactDetails}>
                          <Text style={[styles.contactName, { color: colors.text }]}>
                            {contact.full_name || contact.username}
                          </Text>
                          <Text style={[styles.contactUsername, { color: colors.textSecondary }]}>
                            @{contact.username}
                          </Text>
                        </View>
                        <View style={[
                          styles.checkbox,
                          { borderColor: isSelected ? colors.primary : colors.border },
                          isSelected && { backgroundColor: colors.primary }
                        ]}>
                          {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>

              {/* Footer Actions */}
              <View style={[styles.footer, { borderTopColor: colors.border }]}>
                <Text style={[styles.selectedCount, { color: colors.textSecondary }]}>
                  {selectedContacts.length} selected
                </Text>
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    { backgroundColor: selectedContacts.length > 0 ? colors.primary : colors.border },
                    selectedContacts.length === 0 && { opacity: 0.6 }
                  ]}
                  onPress={handleSendMessages}
                  disabled={selectedContacts.length === 0 || sendingMessages}
                >
                  {sendingMessages ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.sendButtonText}>Send</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors: any, colorScheme: 'light' | 'dark') => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: SCREEN_HEIGHT * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  dragBar: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsList: {
    gap: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionDetails: {
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionSubtext: {
    fontSize: 13,
    marginTop: 2,
  },
  
  // Send message layout
  sendMessageView: {
    height: SCREEN_HEIGHT * 0.65,
  },
  messageInputContainer: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    minHeight: 60,
  },
  messageInput: {
    fontSize: 14,
    textAlignVertical: 'top',
    padding: 0,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 8,
  },
  contactsScroll: {
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 30,
    fontSize: 14,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 6,
  },
  selectedContactRow: {
    // Background dynamic
  },
  contactDetails: {
    flex: 1,
    marginLeft: 12,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
  },
  contactUsername: {
    fontSize: 12,
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: 1,
  },
  selectedCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  sendButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 80,
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
