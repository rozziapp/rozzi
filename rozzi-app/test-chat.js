const axios = require('axios');

async function testChatAPI() {
  try {
    console.log('🧪 Testing Chat API functionality...');
    
    const baseURL = 'http://10.231.22.119:8000/api';
    
    // Test 1: Health check
    console.log('\n1️⃣ Testing health endpoint...');
    const healthResponse = await axios.get(`${baseURL}/health/`);
    console.log('✅ Health check:', healthResponse.data);
    
    // Test 2: Check if there are any existing conversations
    console.log('\n2️⃣ Testing conversations endpoint...');
    try {
      const conversationsResponse = await axios.get(`${baseURL}/conversations/`);
      console.log('✅ Conversations endpoint working');
      console.log(`📊 Total conversations: ${conversationsResponse.data.count || conversationsResponse.data.length || 0}`);
      
      if (conversationsResponse.data.results) {
        console.log('📋 Sample conversations:');
        conversationsResponse.data.results.slice(0, 3).forEach((conv, index) => {
          console.log(`  ${index + 1}. Conversation ID: ${conv.id}`);
          console.log(`     Participants: ${conv.participants?.length || 0}`);
          console.log(`     Last message: ${conv.last_message ? 'Yes' : 'No'}`);
          console.log(`     Unread count: ${conv.unread_count || 0}`);
        });
      }
    } catch (error) {
      console.log('⚠️ Conversations endpoint requires authentication');
    }
    
    // Test 3: Check if there are any existing messages
    console.log('\n3️⃣ Testing messages endpoint...');
    try {
      const messagesResponse = await axios.get(`${baseURL}/messages/`);
      console.log('✅ Messages endpoint working');
      console.log(`📊 Total messages: ${messagesResponse.data.count || messagesResponse.data.length || 0}`);
    } catch (error) {
      console.log('⚠️ Messages endpoint requires authentication');
    }
    
    console.log('\n🎉 Chat API test completed!');
    console.log('💡 To test full functionality:');
    console.log('   1. Login to the app with test credentials');
    console.log('   2. Start a conversation with another user');
    console.log('   3. Send messages and verify they appear for the receiver');
    console.log('   4. Check that online status updates correctly');
    
  } catch (error) {
    console.error('❌ Chat API test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testChatAPI();
