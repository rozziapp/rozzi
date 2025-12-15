import AsyncStorage from '@react-native-async-storage/async-storage';

export const clearAllTokens = async () => {
  try {
    // First get all AsyncStorage keys to find profile cache keys
    const allKeys = await AsyncStorage.getAllKeys();
    
    // Find all profile cache keys (they start with 'user_profile_cache_')
    const profileCacheKeys = allKeys.filter(key => 
      key.startsWith('user_profile_cache_') || key.startsWith('user_profile_cache_timestamp_')
    );
    
    // Standard auth keys to clear
    const authKeys = [
      'authToken',
      'refreshToken', 
      'user',
      'access_token',
      'refresh_token'
    ];
    
    // Combine all keys to clear
    const keysToRemove = [...authKeys, ...profileCacheKeys];
    
    await AsyncStorage.multiRemove(keysToRemove);
    console.log('All tokens and profile cache cleared successfully');
    console.log('Cleared keys:', keysToRemove);
    return true;
  } catch (error) {
    console.error('Error clearing tokens:', error);
    return false;
  }
};

export const checkStoredTokens = async () => {
  try {
    const authToken = await AsyncStorage.getItem('authToken');
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    const user = await AsyncStorage.getItem('user');
    
    console.log('Stored tokens:');
    console.log('- authToken:', authToken ? 'exists' : 'not found');
    console.log('- refreshToken:', refreshToken ? 'exists' : 'not found');
    console.log('- user:', user ? 'exists' : 'not found');
    
    return { authToken, refreshToken, user };
  } catch (error) {
    console.error('Error checking tokens:', error);
    return null;
  }
};
