import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCustomFonts } from '@/hooks/fonts';
import { router, useFocusEffect } from 'expo-router';
import { useBackHandler } from '@/hooks/useBackHandler';
import { useAuth } from '@/contexts/AuthContext';
import ProfilePicture from '@/components/ProfilePicture';
import API from '@/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: number;
  username: string;
  full_name: string;
  profile_picture?: string;
  bio?: string;
  skills?: string[];
}

export default function FindUsersScreen() {
  const [fontsLoaded] = useCustomFonts();
  const { user, isAuthenticated } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewedUsers, setViewedUsers] = useState<User[]>([]);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Load visited profiles from storage on component mount
  useEffect(() => {
    loadVisitedProfiles();
  }, []);

  // Load visited profiles from AsyncStorage
  const loadVisitedProfiles = async () => {
    try {
      if (user?.id) {
        const key = `visited_profiles_${user.id}`;
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          setViewedUsers(parsed);
        }
      }
    } catch (error) {
      console.error('Error loading visited profiles:', error);
    }
  };

  // Save visited profiles to AsyncStorage
  const saveVisitedProfiles = async (profiles: User[]) => {
    try {
      if (user?.id) {
        const key = `visited_profiles_${user.id}`;
        await AsyncStorage.setItem(key, JSON.stringify(profiles));
      }
    } catch (error) {
      console.error('Error saving visited profiles:', error);
    }
  };

  // Debug authentication state
  console.log('🔐 Auth state:', { isAuthenticated, userId: user?.id });

  // Handle back button - navigate to home
  useBackHandler({
    targetRoute: '/(tabs)'
  });

  // Clear search and refresh visited profiles when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      setSearchQuery('');
      setSearchResults([]);
      loadVisitedProfiles(); // Refresh visited profiles
    }, [])
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  // Debug search results state
  useEffect(() => {
    console.log('🔍 Search results state changed:', searchResults.length, 'users');
    if (searchResults.length > 0) {
      console.log('🔍 Current search results:', searchResults.map((u: User) => `${u.username} (ID: ${u.id})`));
    }
  }, [searchResults]);

  if (!fontsLoaded) {
    return null;
  }

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    if (!isAuthenticated || !user) {
      console.log('❌ User not authenticated, cannot search');
      Alert.alert('Authentication Required', 'Please log in to search for users.');
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 Searching for users with query:', query.trim());
      
      // Search for users by username or name
      const searchUrl = `/users/search/?q=${encodeURIComponent(query.trim())}`;
      console.log('🔗 Search URL:', searchUrl);
      console.log('🔗 Full API URL:', `${API.defaults.baseURL}${searchUrl}`);
      
      const response = await API.get(searchUrl);
      console.log('✅ Search response:', response.status, response.data);
      console.log('✅ Response headers:', response.headers);
      
      if (response.data && response.data.results && Array.isArray(response.data.results)) {
        // Filter out the current user from results
        const filteredResults = response.data.results.filter((userResult: User) => userResult.id !== user?.id);
        console.log('👥 Raw results from API:', response.data.results);
        console.log('👥 Current user ID:', user?.id);
        console.log('👥 Filtered results:', filteredResults.length, 'users');
        console.log('👥 Users found:', filteredResults.map((u: User) => `${u.username} (ID: ${u.id})`));
        setSearchResults(filteredResults);
        console.log('✅ Search results set:', filteredResults.length, 'users');
      } else if (response.data && Array.isArray(response.data)) {
        // Fallback for direct array response
        const filteredResults = response.data.filter((userResult: User) => userResult.id !== user?.id);
        console.log('👥 Filtered results (fallback):', filteredResults.length, 'users');
        setSearchResults(filteredResults);
        console.log('✅ Search results set (fallback):', filteredResults.length, 'users');
      } else {
        console.log('⚠️ No valid data in response');
        console.log('⚠️ Response data structure:', response.data);
        setSearchResults([]);
        console.log('❌ Search results cleared - no valid data');
      }
    } catch (error: any) {
      console.error('❌ Error searching users:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      
      if (error.response?.status === 404) {
        setSearchResults([]);
      } else {
        setSearchResults([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Real-time search with debouncing
  const handleSearchInputChange = (text: string) => {
    console.log('📝 Search input changed:', text);
    setSearchQuery(text);
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // If query is empty, clear results immediately
    if (!text.trim()) {
      console.log('🗑️ Clearing results - empty query');
      setSearchResults([]);
      return;
    }
    
    // Set new timeout for search (300ms delay)
    const timeout = setTimeout(() => {
      console.log('⏰ Search timeout triggered for:', text);
      handleSearch(text);
    }, 300);
    
    setSearchTimeout(timeout);
  };

  const handleUserPress = (userId: number) => {
    // Find the user in search results or viewed users
    const userToView = searchResults.find(u => u.id === userId) || viewedUsers.find(u => u.id === userId);
    
    if (userToView) {
      // Add to viewed users history (avoid duplicates)
      const updatedViewedUsers = [userToView, ...viewedUsers.filter(u => u.id !== userId)].slice(0, 10); // Keep last 10 viewed users
      setViewedUsers(updatedViewedUsers);
      saveVisitedProfiles(updatedViewedUsers);
    }
    
    router.push(`/user-profile?userId=${userId}`);
  };

  const handleViewedUserPress = (userId: number) => {
    router.push(`/user-profile?userId=${userId}`);
  };

  const clearViewedUsers = async () => {
    try {
      setViewedUsers([]);
      if (user?.id) {
        const key = `visited_profiles_${user.id}`;
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Error clearing visited profiles:', error);
    }
  };

  const removeVisitedProfile = async (userId: number) => {
    try {
      const updatedProfiles = viewedUsers.filter(u => u.id !== userId);
      setViewedUsers(updatedProfiles);
      saveVisitedProfiles(updatedProfiles);
    } catch (error) {
      console.error('Error removing visited profile:', error);
    }
  };

  const renderUserCard = (userResult: User) => (
    <TouchableOpacity
      key={userResult.id}
      style={styles.userCard}
      onPress={() => handleUserPress(userResult.id)}
    >
      <View style={styles.userCardHeader}>
        <ProfilePicture
          size={48}
          showLongPress={false}
          imageUrl={userResult.profile_picture}
          noBorder={true}
        />
        <View style={styles.userCardInfo}>
          <Text style={styles.userCardName}>
            {userResult.full_name || 'No Name'}
          </Text>
          <Text style={styles.userCardUsername}>
            @{userResult.username}
          </Text>
          {userResult.bio && (
            <Text style={styles.userCardBio} numberOfLines={2}>
              {userResult.bio}
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.viewProfileButton}>
          <Ionicons name="chevron-forward" size={20} color="#8b5cf6" />
        </TouchableOpacity>
      </View>
      
      {userResult.skills && userResult.skills.length > 0 && (
        <View style={styles.skillsContainer}>
          <Text style={styles.skillsLabel}>Skills:</Text>
          <View style={styles.skillsList}>
            {userResult.skills.slice(0, 3).map((skill, index) => (
              <View key={index} style={styles.skillTag}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
            {userResult.skills.length > 3 && (
              <Text style={styles.moreSkillsText}>
                +{userResult.skills.length - 3} more
              </Text>
            )}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerBackButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Users</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#6b7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by username or name..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={handleSearchInputChange}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              editable={isAuthenticated}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => {
                setSearchQuery('');
                setSearchResults([]);
                if (searchTimeout) {
                  clearTimeout(searchTimeout);
                  setSearchTimeout(null);
                }
              }}>
                <Ionicons name="close-circle" size={20} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Loading indicator in search bar */}
          {loading && (
            <View style={styles.searchLoadingIndicator}>
              <ActivityIndicator size="small" color="#8b5cf6" />
            </View>
          )}
          

        </View>

        {/* Recently Viewed Users */}
        {viewedUsers.length > 0 && !loading && (
          <View style={styles.viewedUsersContainer}>
            <View style={styles.viewedUsersHeader}>
              <Text style={styles.viewedUsersTitle}>Recently Viewed</Text>
              <TouchableOpacity onPress={clearViewedUsers}>
                <Text style={styles.clearButton}>Clear All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.viewedUsersList}>
              {viewedUsers.map((viewedUser) => (
                <View key={viewedUser.id} style={styles.viewedUserItem}>
                  <TouchableOpacity
                    style={styles.viewedUserContent}
                    onPress={() => handleViewedUserPress(viewedUser.id)}
                  >
                    <ProfilePicture
                      size={40}
                      showLongPress={false}
                      imageUrl={viewedUser.profile_picture}
                      noBorder={true}
                    />
                    <View style={styles.viewedUserInfo}>
                      <Text style={styles.viewedUserName}>
                        {viewedUser.full_name || 'No Name'}
                      </Text>
                      <Text style={styles.viewedUserUsername}>
                        @{viewedUser.username}
                      </Text>
                      {viewedUser.bio && (
                        <Text style={styles.viewedUserBio} numberOfLines={1}>
                          {viewedUser.bio}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeVisitedProfile(viewedUser.id)}
                  >
                    <Ionicons name="close" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>
              {searchResults.length} user{searchResults.length !== 1 ? 's' : ''} found
            </Text>
            {searchResults.map(renderUserCard)}
          </View>
        )}

        {/* Compact Recently Viewed Users (when search results are shown) */}
        {viewedUsers.length > 0 && searchResults.length > 0 && (
          <View style={styles.compactViewedUsersContainer}>
            <Text style={styles.compactViewedUsersTitle}>Recently Viewed</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.compactViewedUsersList}>
              {viewedUsers.slice(0, 5).map((viewedUser) => (
                <TouchableOpacity
                  key={viewedUser.id}
                  style={styles.compactViewedUserItem}
                  onPress={() => handleViewedUserPress(viewedUser.id)}
                >
                  <ProfilePicture
                    size={48}
                    showLongPress={false}
                    imageUrl={viewedUser.profile_picture}
                    noBorder={true}
                  />
                  <Text style={styles.compactViewedUserName} numberOfLines={1}>
                    {viewedUser.full_name || viewedUser.username}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* No Results */}
        {searchQuery.trim() && searchResults.length === 0 && !loading && (
          <View style={styles.noResultsContainer}>
            <Ionicons name="search-outline" size={48} color="#9ca3af" />
            <Text style={styles.noResultsTitle}>No users found</Text>
            <Text style={styles.noResultsSubtitle}>
              Try searching with a different username or name
            </Text>
          </View>
        )}

        {/* Initial State */}
        {!searchQuery.trim() && searchResults.length === 0 && !loading && (
          <View style={styles.initialStateContainer}>
            {!isAuthenticated ? (
              <>
                <Ionicons name="lock-closed-outline" size={64} color="#ef4444" />
                <Text style={styles.initialStateTitle}>Authentication Required</Text>
                <Text style={styles.initialStateSubtitle}>
                  Please log in to search for users and explore profiles
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="people-outline" size={64} color="#d1d5db" />
                <Text style={styles.initialStateTitle}>Find People</Text>
                <Text style={styles.initialStateSubtitle}>
                  Search for users by their username or full name to connect and explore profiles
                </Text>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#8b5cf6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerBackButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#111827',
  },
  searchLoadingIndicator: {
    marginLeft: 12,
    padding: 4,
  },
  viewedUsersContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  viewedUsersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewedUsersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  clearButton: {
    fontSize: 14,
    color: '#8b5cf6',
    fontWeight: '500',
  },
  viewedUsersList: {
    gap: 8,
  },
  viewedUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  viewedUserContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewedUserInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  viewedUserName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  viewedUserUsername: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  viewedUserBio: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
    fontStyle: 'italic',
  },
  removeButton: {
    padding: 8,
    marginLeft: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  compactViewedUsersContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  compactViewedUsersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  compactViewedUsersList: {
    flexDirection: 'row',
  },
  compactViewedUserItem: {
    alignItems: 'center',
    marginRight: 16,
    minWidth: 60,
  },
  compactViewedUserName: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 60,
  },
  resultsContainer: {
    padding: 16,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userCardInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  userCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  userCardUsername: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  userCardBio: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  viewProfileButton: {
    padding: 4,
  },
  skillsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
  },
  skillsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  skillsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillTag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  skillText: {
    fontSize: 12,
    color: '#374151',
  },
  moreSkillsText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    alignSelf: 'center',
  },
  noResultsContainer: {
    alignItems: 'center',
    padding: 48,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  initialStateContainer: {
    alignItems: 'center',
    padding: 48,
  },
  initialStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  initialStateSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },

});

