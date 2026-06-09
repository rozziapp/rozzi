import API from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BlockUserParams {
  userId: string;
  username: string;
}

interface BlockUserResponse {
  success: boolean;
  is_blocked: boolean;
  message?: string;
}

interface LocalBlockedUser {
  id: string;
  username: string;
  fullName: string;
  blockedAt: string;
  reason?: string;
  profilePicture?: string | null;
}

const BLOCKED_USERS_STORAGE_KEY = 'localBlockedUsers';

/**
 * Get blocked users from local storage
 */
const getLocalBlockedUsers = async (): Promise<LocalBlockedUser[]> => {
  try {
    const stored = await AsyncStorage.getItem(BLOCKED_USERS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading local blocked users:', error);
    return [];
  }
};

/**
 * Save blocked users to local storage
 */
const saveLocalBlockedUsers = async (users: LocalBlockedUser[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(BLOCKED_USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (error) {
    console.error('Error saving local blocked users:', error);
  }
};

/**
 * Block or unblock a user
 * @param params - User ID and username
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export const blockUser = async ({ userId, username }: BlockUserParams): Promise<boolean> => {
  try {
    console.log(`🔄 Attempting to block/unblock user: ${username} (ID: ${userId})`);
    
    // First try to use the backend API
    const response = await API.post(`/users/${userId}/block/`);
    
    console.log(`📡 API Response Status: ${response.status}`);
    console.log(`📡 API Response Data:`, response.data);
    
    if (response.status === 200 || response.status === 201) {
      const data: any = response.data;
      
      // Backend returns is_blocked field directly, no success field
      if (data.hasOwnProperty('is_blocked')) {
        console.log(`✅ User ${username} ${data.is_blocked ? 'blocked' : 'unblocked'} successfully via API`);
        
        // Update local storage
        const localUsers = await getLocalBlockedUsers();
        if (data.is_blocked) {
          // Add to local blocked users with more details
          const newBlockedUser: LocalBlockedUser = {
            id: userId,
            username,
            fullName: username, // We'll update this later if we have more info
            blockedAt: new Date().toISOString(),
            reason: 'Blocked via app'
          };
          localUsers.push(newBlockedUser);
          await saveLocalBlockedUsers(localUsers);
          console.log(`💾 Updated local storage: User ${username} added to blocked list`);
        } else {
          // Remove from local blocked users
          const filteredUsers = localUsers.filter(user => user.id !== userId);
          await saveLocalBlockedUsers(filteredUsers);
          console.log(`💾 Updated local storage: User ${username} removed from blocked list`);
        }
        
        return true;
      } else {
        console.error('❌ Block user failed via API: Unexpected response format', data);
        return false;
      }
    }
    
    console.error('❌ Block user failed via API: Unexpected status code', response.status);
    return false;
  } catch (error: any) {
    console.warn('❌ API blocking failed, using local fallback:', error);
    
    // Fallback to local blocking
    try {
      const localUsers = await getLocalBlockedUsers();
      const isCurrentlyBlocked = localUsers.some(user => user.id === userId);
      
      if (isCurrentlyBlocked) {
        // Unblock locally
        const filteredUsers = localUsers.filter(user => user.id !== userId);
        await saveLocalBlockedUsers(filteredUsers);
        console.log(`✅ User ${username} unblocked locally`);
      } else {
        // Block locally - try to get more user details first
        let fullName = username;
        let profilePicture = null;
        
        try {
          const userDetails = await fetchUserDetails(userId);
          if (userDetails) {
            fullName = userDetails.full_name || userDetails.username || username;
            profilePicture = userDetails.profile_picture || null;
          }
        } catch (detailError) {
          console.warn('Could not fetch user details for local storage, using basic info');
        }
        
        const newBlockedUser: LocalBlockedUser = {
          id: userId,
          username,
          fullName,
          blockedAt: new Date().toISOString(),
          reason: 'Blocked locally (API unavailable)'
        };
        localUsers.push(newBlockedUser);
        await saveLocalBlockedUsers(localUsers);
        console.log(`✅ User ${username} blocked locally with details: ${fullName}`);
      }
      
      return true;
    } catch (localError) {
      console.error('❌ Local blocking also failed:', localError);
      return false;
    }
  }
};

/**
 * Check if a user is blocked
 * @param userId - User ID to check
 * @returns Promise<boolean> - true if blocked, false otherwise
 */
export const isUserBlocked = async (userId: string): Promise<boolean> => {
  try {
    // First try backend
    const response = await API.get(`/users/${userId}/block-status/`);
    
    if (response.status === 200) {
      return response.data.is_blocked || false;
    }
    
    return false;
  } catch (error) {
    console.warn('❌ API block status check failed, using local fallback:', error);
    
    // Fallback to local check
    try {
      const localUsers = await getLocalBlockedUsers();
      return localUsers.some(user => user.id === userId);
    } catch (localError) {
      console.error('❌ Local block status check failed:', localError);
      return false;
    }
  }
};

/**
 * Fetch user details by ID
 * @param userId - User ID to fetch details for
 * @returns Promise<object> - User details or null if failed
 */
const fetchUserDetails = async (userId: string): Promise<any> => {
  try {
    console.log(`🔍 Fetching user details for ID: ${userId}`);
    const response = await API.get(`/users/${userId}/profile/`);
    if (response.status === 200 && response.data) {
      console.log(`✅ User details fetched successfully for ID ${userId}:`, {
        username: response.data.username,
        full_name: response.data.full_name,
        has_profile_picture: !!response.data.profile_picture
      });
      return response.data;
    }
    console.warn(`⚠️ Unexpected response for user ${userId}:`, response.status, response.data);
    return null;
  } catch (error) {
    console.warn(`❌ Failed to fetch user details for ID ${userId}:`, error);
    return null;
  }
};

/**
 * Get list of blocked users
 * @returns Promise<Array> - Array of blocked users with real details
 */
export const getBlockedUsers = async (): Promise<any[]> => {
  try {
    // First try backend
    const response = await API.get('/users/blocked/');
    
    if (response.status === 200) {
      const data = response.data;
      
      // Backend now returns detailed user information
      if (data && data.blocked_users && Array.isArray(data.blocked_users)) {
        console.log('✅ Retrieved blocked users from API:', data.blocked_users.length);
        
        // Map the detailed user information from backend
        const blockedUsersWithDetails = data.blocked_users.map((user: any) => {
          console.log(`📸 Processing blocked user ${user.username}:`, {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            profile_picture: user.profile_picture,
            blocked_at: user.blocked_at
          });
          
          return {
            id: user.id,
            username: user.username || `User ${user.id}`,
            fullName: user.full_name || user.username || `User ${user.id}`,
            blockedAt: user.blocked_at || new Date().toISOString(),
            reason: 'Blocked via app',
            profilePicture: user.profile_picture || null
          };
        });
        
        console.log('✅ Processed blocked users with details:', blockedUsersWithDetails.length);
        return blockedUsersWithDetails;
        
      } else if (Array.isArray(data)) {
        // Fallback: if response is directly an array (legacy format)
        console.log('✅ Retrieved blocked users from API (legacy array format):', data.length);
        
        // Fetch user details for each blocked user (legacy approach)
        const blockedUsersWithDetails = await Promise.all(
          data.map(async (userId: string) => {
            const userDetails = await fetchUserDetails(userId);
            
            if (userDetails) {
              return {
                id: userId,
                username: userDetails.username || `User ${userId}`,
                fullName: userDetails.full_name || userDetails.username || `User ${userId}`,
                blockedAt: new Date().toISOString(),
                reason: 'Blocked via app',
                profilePicture: userDetails.profile_picture || null
              };
            } else {
              return {
                id: userId,
                username: `User ${userId}`,
                fullName: `User ${userId}`,
                blockedAt: new Date().toISOString(),
                reason: 'Blocked via app',
                profilePicture: null
              };
            }
          })
        );
        
        return blockedUsersWithDetails;
      } else {
        console.warn('Unexpected blocked users response format:', data);
        return [];
      }
    }
    
    return [];
  } catch (error: any) {
    console.warn('❌ API blocked users fetch failed, using local fallback:', error);
    
    // Fallback to local storage
    try {
      const localUsers = await getLocalBlockedUsers();
      console.log('✅ Using local blocked users:', localUsers.length);
      return localUsers;
    } catch (localError) {
      console.error('❌ Local blocked users fetch failed:', localError);
      return [];
    }
  }
};

/**
 * Unblock a user
 * @param userId - User ID to unblock
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export const unblockUser = async (userId: string): Promise<boolean> => {
  try {
    // First try backend
    const response = await API.post(`/users/${userId}/block/`); // Use the same endpoint for toggle
    
    if (response.status === 200 || response.status === 201) {
      const data: any = response.data;
      
      if (data.hasOwnProperty('is_blocked') && !data.is_blocked) {
        console.log('✅ User unblocked successfully via API');
        
        // Update local storage
        const localUsers = await getLocalBlockedUsers();
        const filteredUsers = localUsers.filter(user => user.id !== userId);
        await saveLocalBlockedUsers(filteredUsers);
        
        return true;
      } else {
        console.error('❌ Unblock user failed via API: Unexpected response format', data);
        return false;
      }
    }
    
    return false;
  } catch (error) {
    console.warn('❌ API unblock failed, using local fallback:', error);
    
    // Fallback to local unblock
    try {
      const localUsers = await getLocalBlockedUsers();
      const filteredUsers = localUsers.filter(user => user.id !== userId);
      await saveLocalBlockedUsers(filteredUsers);
      console.log('✅ User unblocked locally');
      return true;
    } catch (localError) {
      console.error('❌ Local unblock failed:', localError);
      return false;
    }
  }
};

/**
 * Check if current user can send messages to another user
 * @param userId - User ID to check
 * @returns Promise<object> - Object with can_send boolean and reason string
 */
export const canSendMessage = async (userId: string): Promise<{ can_send: boolean; reason: string }> => {
  try {
    // First try backend
    const response = await API.get(`/users/${userId}/can-send-message/`);
    
    if (response.status === 200) {
      return response.data;
    }
    
    return { can_send: false, reason: 'Unable to verify message permissions' };
  } catch (error: any) {
    console.warn('❌ API can-send-message check failed, using local fallback:', error);
    
    // Fallback to local check
    try {
      const localUsers = await getLocalBlockedUsers();
      const isBlocked = localUsers.some(user => user.id === userId);
      
      if (isBlocked) {
        return { can_send: false, reason: 'Cannot send messages to blocked users' };
      }
      
      return { can_send: true, reason: 'Messages allowed (local check)' };
    } catch (localError) {
      console.error('❌ Local can-send-message check failed:', localError);
      return { can_send: false, reason: 'Unable to verify message permissions' };
    }
  }
};

/**
 * Get local blocked users count
 */
export const getLocalBlockedUsersCount = async (): Promise<number> => {
  try {
    const localUsers = await getLocalBlockedUsers();
    return localUsers.length;
  } catch (error) {
    console.error('Error getting local blocked users count:', error);
    return 0;
  }
};
