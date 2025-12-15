const API_BASE_URL = 'http://192.168.1.100:8000'; // Update with your backend IP

// Test chat backend functionality
async function testChatBackend() {
  console.log('🧪 Testing Chat Backend...');
  
  try {
    // Test 1: Check if backend is accessible
    console.log('\n1️⃣ Testing backend connectivity...');
    const response = await fetch(`${API_BASE_URL}/api/health/`);
    if (response.ok) {
      console.log('✅ Backend is accessible');
    } else {
      console.log('❌ Backend returned error:', response.status);
    }
  } catch (error) {
    console.log('❌ Backend connection failed:', error.message);
  }
  
  try {
    // Test 2: Check conversations endpoint
    console.log('\n2️⃣ Testing conversations endpoint...');
    const response = await fetch(`${API_BASE_URL}/api/conversations/`);
    console.log('📡 Conversations response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('📊 Conversations data:', data);
    } else {
      console.log('❌ Conversations endpoint failed');
    }
  } catch (error) {
    console.log('❌ Conversations test failed:', error.message);
  }
  
  try {
    // Test 3: Check if there are any block relationships
    console.log('\n3️⃣ Testing block relationships...');
    const response = await fetch(`${API_BASE_URL}/api/blocks/`);
    console.log('📡 Blocks response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('🚫 Blocks data:', data);
      
      if (data.length > 0) {
        console.log('⚠️  Found block relationships that might affect chat:');
        data.forEach(block => {
          console.log(`   - ${block.blocker} blocked ${block.blocked}`);
        });
      } else {
        console.log('✅ No block relationships found');
      }
    } else {
      console.log('❌ Blocks endpoint failed');
    }
  } catch (error) {
    console.log('❌ Blocks test failed:', error.message);
  }
}

// Test message sending (requires authentication)
async function testMessageSending() {
  console.log('\n4️⃣ Testing message sending...');
  console.log('⚠️  This requires authentication - please login first');
  
  // You would need to include authentication headers here
  // const response = await fetch(`${API_BASE_URL}/api/messages/send/`, {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': 'Bearer YOUR_TOKEN'
  //   },
  //   body: JSON.stringify({
  //     recipient_id: 'USER_ID',
  //     content: 'Test message'
  //   })
  // });
}

// Run tests
testChatBackend();
testMessageSending();

console.log('\n📋 Test Summary:');
console.log('- Check backend connectivity');
console.log('- Verify conversations endpoint');
console.log('- Check for block relationships');
console.log('- Test message sending with auth');
