#!/usr/bin/env node

const axios = require('axios');

async function testBackend() {
  console.log('🧪 Testing backend connectivity directly...\n');
  
  const testURLs = [
    'http://localhost:8000/health/',
    'http://127.0.0.1:8000/health/',
    'http://0.0.0.0:8000/health/',
  ];
  
  console.log('🔍 Testing local URLs:');
  console.log('========================');
  
  for (const url of testURLs) {
    try {
      console.log(`Testing ${url}... `);
      const response = await axios.get(url, { timeout: 5000 });
      console.log(`✅ SUCCESS! Status: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data)}`);
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('❌ Connection refused - Backend not running');
      } else if (error.code === 'ENOTFOUND') {
        console.log('❌ Host not found');
      } else if (error.code === 'ETIMEDOUT') {
        console.log('❌ Timeout - Backend not responding');
      } else {
        console.log(`❌ Error: ${error.message}`);
      }
    }
  }
  
  console.log('\n🔧 If all tests failed, check:');
  console.log('1. Is Django backend running? (python manage.py runserver 0.0.0.0:8000)');
  console.log('2. Is port 8000 free? (netstat -an | findstr :8000)');
  console.log('3. Is firewall blocking port 8000?');
  console.log('4. Try: curl http://localhost:8000/health/');
}

// Run the test
testBackend().catch(console.error);
