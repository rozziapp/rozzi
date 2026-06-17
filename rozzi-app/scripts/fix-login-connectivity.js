#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing login connectivity issues...\n');

// Step 1: Update IP configuration
console.log('1. Updating IP configuration...');
try {
  execSync('node scripts/update-local-ip.js', { stdio: 'inherit' });
  console.log('✅ IP configuration updated\n');
} catch (error) {
  console.log('❌ Failed to update IP configuration');
  console.log('   Please run: node scripts/update-local-ip.js\n');
}

// Step 2: Test connectivity
console.log('2. Testing backend connectivity...');
try {
  const { testConnectivity } = require('../utils/connectivity');
  
  testConnectivity().then(isConnected => {
    if (isConnected) {
      console.log('✅ Backend is accessible\n');
    } else {
      console.log('❌ Backend is not accessible\n');
      console.log('📝 Please ensure your Django backend is running:');
      console.log('   cd rozzi-backend');
      console.log('   python manage.py runserver 0.0.0.0:8000\n');
    }
  });
} catch (error) {
  console.log('❌ Failed to test connectivity');
}

// Step 3: Provide troubleshooting steps
console.log('3. Troubleshooting checklist:');
console.log('   ✓ Updated IP configuration');
console.log('   ✓ Updated CORS settings in Django backend');
console.log('   ✓ Improved error handling in the app\n');

console.log('🚀 Next steps:');
console.log('1. Make sure Django backend is running:');
console.log('   cd rozzi-backend');
console.log('   python manage.py runserver 0.0.0.0:8000');
console.log('');
console.log('2. Restart your React Native app');
console.log('');
console.log('3. If you still have issues:');
console.log('   - Check Windows Firewall settings');
console.log('   - Make sure you\'re on the same network');
console.log('   - Try: npm start -- --reset-cache');

console.log('\n✅ Login connectivity fix completed!');

