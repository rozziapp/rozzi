// Simple script to clear message storage
// Run this in your React Native app console or add it temporarily to your app

// Method 1: Clear all storage (nuclear option)
// AsyncStorage.clear();

// Method 2: Clear only message-related keys (recommended)
async function clearMessageStorage() {
  try {
    // Get all keys
    const allKeys = await AsyncStorage.getAllKeys();
    console.log('📋 Total keys found:', allKeys.length);
    
    // Find message-related keys
    const messageKeys = allKeys.filter(key => key.startsWith('messages_'));
    console.log('📨 Message keys found:', messageKeys);
    
    if (messageKeys.length > 0) {
      // Remove only message keys
      await AsyncStorage.multiRemove(messageKeys);
      console.log('✅ Message storage cleared');
    } else {
      console.log('✅ No message storage found');
    }
    
    // Verify
    const remainingKeys = await AsyncStorage.getAllKeys();
    const remainingMessageKeys = remainingKeys.filter(key => key.startsWith('messages_'));
    console.log('📊 Remaining message keys:', remainingMessageKeys.length);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the function
clearMessageStorage();
