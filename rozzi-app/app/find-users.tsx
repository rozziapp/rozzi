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
import { useAppTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface User {
  id: number;
  username: string;
  full_name: string;
  profile_picture?: string;
  bio?: string;
  skills?: string[];
}

export default function FindUsersScreen() {
  const { colors, colorScheme } = useAppTheme();
  const s = React.useMemo(() => getStyles(colors, colorScheme), [colors, colorScheme]);
  const insets = useSafeAreaInsets();
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

  if (!fontsLoaded) {
    return null;
  }

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    if (!isAuthenticated || !user) {
      Alert.alert('Authentication Required', 'Please log in to search for users.');
      return;
    }

    try {
      setLoading(true);
      const searchUrl = `/users/search/?q=${encodeURIComponent(query.trim())}`;
      const response = await API.get(searchUrl);
      
      if (response.data && response.data.results && Array.isArray(response.data.results)) {
        const filteredResults = response.data.results.filter((userResult: User) => userResult.id !== user?.id);
        setSearchResults(filteredResults);
      } else if (response.data && Array.isArray(response.data)) {
        const filteredResults = response.data.filter((userResult: User) => userResult.id !== user?.id);
        setSearchResults(filteredResults);
      } else {
        setSearchResults([]);
      }
    } catch (error: any) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Real-time search with debouncing
  const handleSearchInputChange = (text: string) => {
    setSearchQuery(text);
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // If query is empty, clear results immediately
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }
    
    // Set new timeout for search (300ms delay)
    const timeout = setTimeout(() => {
      handleSearch(text);
    }, 300);
    
    setSearchTimeout(timeout);
  };

  const handleUserPress = (userResult: User) => {
    // Add to viewed users history (avoid duplicates)
    const updatedViewedUsers = [userResult, ...viewedUsers.filter(u => u.id !== userResult.id)].slice(0, 10);
    setViewedUsers(updatedViewedUsers);
    saveVisitedProfiles(updatedViewedUsers);
    
    // Navigate using username handle (like Instagram/LinkedIn)
    router.push(`/user-profile?userId=${userResult.username}`);
  };

  const handleViewedUserPress = (viewedUser: User) => {
    // Navigate using username handle (like Instagram/LinkedIn)
    router.push(`/user-profile?userId=${viewedUser.username}`);
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

  // ── User Card ──
  const renderUserCard = (userResult: User) => (
    <TouchableOpacity
      key={userResult.id}
      style={s.userCard}
      onPress={() => handleUserPress(userResult)}
      activeOpacity={0.7}
    >
      <View style={s.userCardRow}>
        <ProfilePicture
          size={48}
          showLongPress={false}
          imageUrl={userResult.profile_picture}
          noBorder={true}
        />
        <View style={s.userCardInfo}>
          <Text style={s.userCardName} numberOfLines={1}>
            {userResult.full_name || 'No Name'}
          </Text>
          <Text style={s.userCardUsername} numberOfLines={1}>
            @{userResult.username}
          </Text>
          {userResult.bio && (
            <Text style={s.userCardBio} numberOfLines={2}>
              {userResult.bio}
            </Text>
          )}
        </View>
        <View style={s.chevronWrap}>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </View>
      </View>
      
      {userResult.skills && userResult.skills.length > 0 && (
        <View style={s.skillsRow}>
          {userResult.skills.slice(0, 3).map((skill, index) => (
            <View key={index} style={s.skillPill}>
              <Text style={s.skillPillText}>{skill}</Text>
            </View>
          ))}
          {userResult.skills.length > 3 && (
            <Text style={s.moreSkills}>
              +{userResult.skills.length - 3}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  // ── MAIN RENDER ──
  return (
    <KeyboardAvoidingView 
      style={s.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: Math.max(insets.top + (Platform.OS === 'ios' ? 10 : 14), Platform.OS === 'ios' ? 54 : 38) }]}>
        <TouchableOpacity 
          style={s.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Find People</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Search Bar ── */}
      <View style={s.searchWrap}>
        <View style={s.searchBar}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={s.searchInput}
            placeholder="Search by name or username..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearchInputChange}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            editable={isAuthenticated}
          />
          {loading && (
            <ActivityIndicator size="small" color="#7C3AED" style={{ marginRight: 4 }} />
          )}
          {searchQuery.length > 0 && !loading && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              setSearchResults([]);
              if (searchTimeout) {
                clearTimeout(searchTimeout);
                setSearchTimeout(null);
              }
            }}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={s.scrollView} showsVerticalScrollIndicator={false}>
        {/* ── Search Results ── */}
        {searchResults.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
            </Text>
            {searchResults.map(renderUserCard)}
          </View>
        )}

        {/* ── Recently Viewed (when no search) ── */}
        {viewedUsers.length > 0 && searchResults.length === 0 && !loading && (
          <View style={s.section}>
            <View style={s.sectionHeaderRow}>
              <Text style={s.sectionLabel}>Recently Viewed</Text>
              <TouchableOpacity onPress={clearViewedUsers}>
                <Text style={s.clearBtn}>Clear All</Text>
              </TouchableOpacity>
            </View>
            {viewedUsers.map((viewedUser) => (
              <View key={viewedUser.id} style={s.recentCard}>
                <TouchableOpacity
                  style={s.recentContent}
                  onPress={() => handleViewedUserPress(viewedUser)}
                  activeOpacity={0.7}
                >
                  <ProfilePicture
                    size={42}
                    showLongPress={false}
                    imageUrl={viewedUser.profile_picture}
                    noBorder={true}
                  />
                  <View style={s.recentInfo}>
                    <Text style={s.recentName} numberOfLines={1}>
                      {viewedUser.full_name || 'No Name'}
                    </Text>
                    <Text style={s.recentUsername} numberOfLines={1}>
                      @{viewedUser.username}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.removeBtn}
                  onPress={() => removeVisitedProfile(viewedUser.id)}
                >
                  <Ionicons name="close" size={14} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* ── Compact Recently Viewed (when search results shown) ── */}
        {viewedUsers.length > 0 && searchResults.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabelSmall}>Recently Viewed</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {viewedUsers.slice(0, 5).map((viewedUser) => (
                <TouchableOpacity
                  key={viewedUser.id}
                  style={s.compactItem}
                  onPress={() => handleViewedUserPress(viewedUser)}
                >
                  <ProfilePicture
                    size={48}
                    showLongPress={false}
                    imageUrl={viewedUser.profile_picture}
                    noBorder={true}
                  />
                  <Text style={s.compactName} numberOfLines={1}>
                    {viewedUser.full_name || viewedUser.username}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── No Results ── */}
        {searchQuery.trim() && searchResults.length === 0 && !loading && (
          <View style={s.emptyWrap}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="search-outline" size={36} color={colors.primary} />
            </View>
            <Text style={s.emptyTitle}>No users found</Text>
            <Text style={s.emptySub}>
              Try a different name or username
            </Text>
          </View>
        )}

        {/* ── Initial State ── */}
        {!searchQuery.trim() && searchResults.length === 0 && !loading && viewedUsers.length === 0 && (
          <View style={s.emptyWrap}>
            {!isAuthenticated ? (
              <>
                <View style={[s.emptyIconWrap, { backgroundColor: colors.cardAlt }]}>
                  <Ionicons name="lock-closed-outline" size={36} color="#EF4444" />
                </View>
                <Text style={s.emptyTitle}>Authentication Required</Text>
                <Text style={s.emptySub}>
                  Please log in to search for users
                </Text>
              </>
            ) : (
              <>
                <View style={s.emptyIconWrap}>
                  <Ionicons name="people-outline" size={36} color={colors.primary} />
                </View>
                <Text style={s.emptyTitle}>Find People</Text>
                <Text style={s.emptySub}>
                  Search by name or username to connect and explore profiles
                </Text>
              </>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── STYLES ──────────────────────────────────────────────────────────

const getStyles = (colors: any, colorScheme: 'light' | 'dark') => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },

  // ── Search ──
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: colors.text,
  },

  // ── Sections ──
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  sectionLabelSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  clearBtn: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },

  // ── User Card ──
  userCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: colorScheme === 'dark' ? 0 : 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: colorScheme === 'dark' ? 0 : 2,
      },
    }),
  },
  userCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userCardInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  userCardName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  userCardUsername: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  userCardBio: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 4,
  },
  chevronWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 6,
  },
  skillPill: {
    backgroundColor: colorScheme === 'dark' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(107, 70, 193, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  skillPillText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  moreSkills: {
    fontSize: 12,
    color: colors.textSecondary,
    alignSelf: 'center',
    fontWeight: '500',
  },

  // ── Recent Cards ──
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: colorScheme === 'dark' ? 0 : 0.03,
        shadowRadius: 4,
      },
      android: {
        elevation: colorScheme === 'dark' ? 0 : 1,
      },
    }),
  },
  recentContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  recentName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  recentUsername: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },

  // ── Compact viewed ──
  compactItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 64,
  },
  compactName: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },

  // ── Empty states ──
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colorScheme === 'dark' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(107, 70, 193, 0.08)',
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
    maxWidth: 260,
  },
});
