#!/usr/bin/env node

/**
 * Clear All Stored Messages Script
 * This script clears only stored messages from AsyncStorage (keeps conversations)
 */

const AsyncStorage = require('@react-native-async-storage/async-storage');

async function clearStoredMessages() {
  console.log('🗑️ Clearing stored messages from AsyncStorage...');
  
  try {
    // Get all keys from AsyncStorage
    const allKeys = await AsyncStorage.getAllKeys();
    console.log(`📋 Found ${allKeys.length} total keys in storage`);
    
    // Filter for message-related keys only
    const messageKeys = allKeys.filter(key => key.startsWith('messages_'));
    console.log(`📨 Found ${messageKeys.length} message storage keys`);
    
    if (messageKeys.length > 0) {
      // Show what will be deleted
      console.log('\n📝 Message keys to be deleted:');
      messageKeys.forEach(key => {
        console.log(`   - ${key}`);
      });
      
      // Delete only message keys
      await AsyncStorage.multiRemove(messageKeys);
      console.log('\n✅ All stored messages cleared from AsyncStorage');
      console.log('   Conversations and other data are kept intact');
    } else {
      console.log('✅ No stored messages found - storage is already clean');
    }
    
    // Verify cleanup
    const remainingKeys = await AsyncStorage.getAllKeys();
    const remainingMessageKeys = remainingKeys.filter(key => key.startsWith('messages_'));
    
    console.log(`\n📊 Storage after cleanup:`);
    console.log(`   - Total keys: ${remainingKeys.length}`);
    console.log(`   - Message keys: ${remainingMessageKeys.length}`);
    
    if (remainingMessageKeys.length === 0) {
      console.log('\n🎉 Message cleanup completed successfully!');
      console.log('   All stored messages have been removed');
      console.log('   Conversations and other data are preserved');
    } else {
      console.log('\n⚠️ Some message keys may still exist');
    }
    
  } catch (error) {
    console.error('❌ Error during storage cleanup:', error);
  }
}

// Run the cleanup
clearStoredMessages().catch(console.error);
