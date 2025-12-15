import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCustomFonts } from '@/hooks/fonts';
import { router } from 'expo-router';
import { useBackHandler } from '@/hooks/useBackHandler';
import { useBlockUser } from '@/hooks/useBlockUser';
import { CachedImage } from '@/components/CachedImage';

interface BlockedUser {
  id: string;
  username: string;
  fullName: string;
  blockedAt: string;
  reason?: string;
  profilePicture?: string | null;
}

export default function BlockedUsersScreen() {
  const [fontsLoaded] = useCustomFonts();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const { getBlockedUsersList, unblockUser: unblockUserUtil } = useBlockUser();

  // Handle back button
  useBackHandler({
    targetRoute: '/settings'
  });

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    try {
      setLoading(true);
      const users = await getBlockedUsersList();
      
      if (users && users.length > 0) {
        setBlockedUsers(users);
      } else {
        setBlockedUsers([]);
      }
    } catch (error) {
      console.error('Error fetching blocked users:', error);
      setBlockedUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblockUser = async (userId: string, username: string) => {
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await unblockUserUtil(userId);
              if (success) {
                setBlockedUsers(prev => prev.filter(user => user.id !== userId));
                Alert.alert('Success', `${username} has been unblocked.`);
              } else {
                Alert.alert('Error', 'Failed to unblock user. Please try again.');
              }
            } catch (error) {
              console.error('Error unblocking user:', error);
              Alert.alert('Error', 'Failed to unblock user. Please try again.');
            }
          }
        }
      ]
    );
  };

  const filteredBlockedUsers = blockedUsers.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!fontsLoaded) {
    return null;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Blocked Users</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search blocked users..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading blocked users...</Text>
          </View>
        ) : filteredBlockedUsers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyStateTitle}>
              {searchQuery ? 'No users found' : 'No Blocked Users'}
            </Text>
            <Text style={styles.emptyStateSubtitle}>
              {searchQuery 
                ? 'Try adjusting your search terms'
                : 'You haven\'t blocked any users yet.'
              }
            </Text>
          </View>
        ) : (
          <View style={styles.blockedUsersList}>
            {filteredBlockedUsers.map((user) => (
              <View key={user.id} style={styles.blockedUserItem}>
                <View style={styles.userInfo}>
                  <View style={styles.userAvatar}>
                    {user.profilePicture ? (
                      <CachedImage
                        source={{ uri: user.profilePicture }}
                        style={styles.avatarImage}
                        contentFit="cover"
                        placeholder={
                          <View style={styles.avatarPlaceholder}>
                            <Ionicons name="person" size={24} color="#6b7280" />
                          </View>
                        }
                      />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Ionicons name="person" size={24} color="#6b7280" />
                      </View>
                    )}
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>{user.fullName}</Text>
                    <Text style={styles.userUsername}>@{user.username}</Text>
                    <Text style={styles.blockedDate}>
                      Blocked on {formatDate(user.blockedAt)}
                    </Text>
                    {user.reason && (
                      <Text style={styles.blockReason}>
                        Reason: {user.reason}
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.unblockButton}
                  onPress={() => handleUnblockUser(user.id, user.username)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="checkmark-circle-outline" size={20} color="#10b981" />
                  <Text style={styles.unblockText}>Unblock</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
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
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    backgroundColor: '#B0AAD9',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  blockedUsersList: {
    gap: 12,
  },
  blockedUserItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  blockedDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 2,
  },
  blockReason: {
    fontSize: 12,
    color: '#ef4444',
    fontStyle: 'italic',
  },
  unblockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  unblockText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

