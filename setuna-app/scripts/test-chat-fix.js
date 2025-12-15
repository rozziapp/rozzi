#!/usr/bin/env node

/**
 * Chat Functionality Test Script
 * This script tests the chat functionality to identify issues
 */

const API_BASE = 'http://10.231.22.119:8000/api';

// Test user credentials (replace with actual test users)
const TEST_USERS = {
  user1: {
    username: 'testuser1',
    password: 'testpass123',
    token: null
  },
  user2: {
    username: 'testuser2', 
    password: 'testpass123',
    token: null
  }
};

// Helper function to make API calls
async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error || data.message || 'Unknown error'}`);
    }
    
    return { status: response.status, data };
  } catch (error) {
    console.error(`❌ API call failed: ${endpoint}`, error.message);
    throw error;
  }
}

// Test authentication
async function testAuthentication() {
  console.log('🔐 Testing authentication...');
  
  for (const [userKey, user] of Object.entries(TEST_USERS)) {
    try {
      const response = await makeRequest('/auth/login/', {
        method: 'POST',
        body: JSON.stringify({
          username: user.username,
          password: user.password
        })
      });
      
      if (response.data.access) {
        user.token = response.data.access;
        console.log(`✅ ${userKey} authenticated successfully`);
      } else {
        console.log(`❌ ${userKey} authentication failed: No access token`);
      }
    } catch (error) {
      console.log(`❌ ${userKey} authentication failed:`, error.message);
    }
  }
}

// Test conversation creation
async function testConversationCreation() {
  console.log('\n💬 Testing conversation creation...');
  
  if (!TEST_USERS.user1.token || !TEST_USERS.user2.token) {
    console.log('❌ Cannot test conversation creation: Users not authenticated');
    return null;
  }
  
  try {
    const response = await makeRequest('/conversations/create/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_USERS.user1.token}`
      },
      body: JSON.stringify({
        recipient_id: TEST_USERS.user2.id || '2' // Replace with actual user ID
      })
    });
    
    console.log('✅ Conversation created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.log('❌ Conversation creation failed:', error.message);
    return null;
  }
}

// Test message sending
async function testMessageSending(conversationId) {
  console.log('\n📤 Testing message sending...');
  
  if (!TEST_USERS.user1.token || !conversationId) {
    console.log('❌ Cannot test message sending: Missing token or conversation ID');
    return null;
  }
  
  try {
    const response = await makeRequest('/messages/send/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_USERS.user1.token}`
      },
      body: JSON.stringify({
        recipient_id: TEST_USERS.user2.id || '2',
        content: 'Hello! This is a test message from user1 to user2.'
      })
    });
    
    console.log('✅ Message sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.log('❌ Message sending failed:', error.message);
    return null;
  }
}

// Test message retrieval
async function testMessageRetrieval(conversationId) {
  console.log('\n📨 Testing message retrieval...');
  
  if (!TEST_USERS.user2.token || !conversationId) {
    console.log('❌ Cannot test message retrieval: Missing token or conversation ID');
    return null;
  }
  
  try {
    const response = await makeRequest(`/conversations/${conversationId}/messages/`, {
      headers: {
        'Authorization': `Bearer ${TEST_USERS.user2.token}`
      }
    });
    
    console.log('✅ Messages retrieved successfully:', response.data);
    console.log(`📊 Found ${response.data.length || 0} messages`);
    
    if (response.data.length > 0) {
      response.data.forEach((msg, index) => {
        console.log(`   ${index + 1}. ${msg.sender?.username}: ${msg.content}`);
      });
    }
    
    return response.data;
  } catch (error) {
    console.log('❌ Message retrieval failed:', error.message);
    return null;
  }
}

// Test conversation list
async function testConversationList() {
  console.log('\n📋 Testing conversation list...');
  
  if (!TEST_USERS.user1.token) {
    console.log('❌ Cannot test conversation list: User not authenticated');
    return null;
  }
  
  try {
    const response = await makeRequest('/conversations/', {
      headers: {
        'Authorization': `Bearer ${TEST_USERS.user1.token}`
      }
    });
    
    console.log('✅ Conversations retrieved successfully:', response.data);
    console.log(`📊 Found ${response.data.length || 0} conversations`);
    
    if (response.data.length > 0) {
      response.data.forEach((conv, index) => {
        const otherParticipant = conv.other_participant;
        const lastMessage = conv.last_message;
        console.log(`   ${index + 1}. Conversation ${conv.id} with ${otherParticipant?.username || 'Unknown'}`);
        console.log(`      Last message: ${lastMessage?.content || 'No messages'}`);
        console.log(`      Unread count: ${conv.unread_count || 0}`);
      });
    }
    
    return response.data;
  } catch (error) {
    console.log('❌ Conversation list failed:', error.message);
    return null;
  }
}

// Main test function
async function runTests() {
  console.log('🧪 Starting Chat Functionality Tests...\n');
  
  try {
    // Test 1: Authentication
    await testAuthentication();
    
    // Test 2: Conversation list
    const conversations = await testConversationList();
    
    // Test 3: Conversation creation (if needed)
    let conversationId = null;
    if (conversations && conversations.length === 0) {
      const conversation = await testConversationCreation();
      conversationId = conversation?.id || conversation?.data?.id;
    } else if (conversations && conversations.length > 0) {
      conversationId = conversations[0].id;
      console.log(`📱 Using existing conversation: ${conversationId}`);
    }
    
    // Test 4: Message sending
    if (conversationId) {
      const message = await testMessageSending(conversationId);
      
      // Test 5: Message retrieval
      if (message) {
        await testMessageRetrieval(conversationId);
      }
    }
    
    console.log('\n✅ All tests completed!');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testAuthentication,
  testConversationCreation,
  testMessageSending,
  testMessageRetrieval,
  testConversationList,
  runTests
};
