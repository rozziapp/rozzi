#!/usr/bin/env node

/**
 * Simple Connectivity Test Script
 * Tests basic network connectivity to the backend
 */

const API_BASE = 'http://10.231.22.119:8000/api';

async function testConnectivity() {
  console.log('🧪 Testing Backend Connectivity...\n');
  
  try {
    // Test 1: Basic HTTP request
    console.log('1️⃣ Testing basic HTTP request...');
    const response = await fetch(`${API_BASE}/health/`);
    console.log(`✅ Health check response: ${response.status} ${response.statusText}`);
    
    // Test 2: Test with headers
    console.log('\n2️⃣ Testing with proper headers...');
    const response2 = await fetch(`${API_BASE}/health/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    console.log(`✅ Headers test response: ${response2.status} ${response2.statusText}`);
    
    // Test 3: Test conversations endpoint (should return 401 for unauthorized)
    console.log('\n3️⃣ Testing conversations endpoint (expecting 401)...');
    const response3 = await fetch(`${API_BASE}/conversations/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    console.log(`✅ Conversations test response: ${response3.status} ${response3.statusText}`);
    
    if (response3.status === 401) {
      console.log('✅ Expected 401 (Authentication required) - Backend is working!');
    }
    
    console.log('\n🎉 All connectivity tests passed! Backend is accessible.');
    
  } catch (error) {
    console.error('\n❌ Connectivity test failed:', error.message);
    
    if (error.message.includes('fetch')) {
      console.log('\n💡 This might be a Node.js fetch issue. Try using curl instead:');
      console.log('curl -v http://10.231.22.119:8000/api/health/');
    }
    
    if (error.message.includes('Network Error')) {
      console.log('\n🌐 Network Error detected. Possible causes:');
      console.log('- Backend server not running');
      console.log('- Firewall blocking connection');
      console.log('- Wrong IP address');
      console.log('- Network configuration issue');
    }
  }
}

// Run the test
testConnectivity().catch(console.error);


