#!/usr/bin/env node

const axios = require('axios');

async function testEndpoints() {
  console.log('🧪 Testing different backend endpoints...\n');
  
  const baseURLs = [
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://10.198.33.119:8000', // Your current network IP
  ];
  
  const endpoints = [
    '/health/',
    '/api/',
    '/api/me/',
    '/api/register/',
    '/api/token/',
    '/',
  ];
  
  for (const baseURL of baseURLs) {
    console.log(`\n🔍 Testing base URL: ${baseURL}`);
    console.log('=====================================');
    
    for (const endpoint of endpoints) {
      const url = `${baseURL}${endpoint}`;
      try {
        console.log(`Testing ${endpoint}... `);
        const response = await axios.get(url, { 
          timeout: 3000,
          validateStatus: (status) => true // Accept all status codes
        });
        
        if (response.status === 200) {
          console.log(`✅ SUCCESS! Status: ${response.status}`);
        } else if (response.status === 404) {
          console.log(`⚠️ Not Found (404) - Endpoint doesn't exist`);
        } else if (response.status === 400) {
          console.log(`⚠️ Bad Request (400) - Endpoint exists but needs parameters`);
        } else {
          console.log(`ℹ️ Status: ${response.status}`);
        }
        
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
  }
  
  console.log('\n🎯 Based on the results, we can determine:');
  console.log('1. Which base URLs are accessible');
  console.log('2. Which endpoints exist and are working');
  console.log('3. The best endpoint to use for connectivity testing');
}

// Run the test
testEndpoints().catch(console.error);
