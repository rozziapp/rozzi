#!/usr/bin/env node

const os = require('os');

function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
      if (interface.family === 'IPv4' && !interface.internal) {
        addresses.push({
          name: name,
          address: interface.address,
          netmask: interface.netmask,
          family: interface.family
        });
      }
    }
  }
  
  return addresses;
}

function displayIPAddresses() {
  console.log('🔍 Finding your local IP addresses...\n');
  
  const addresses = getLocalIPAddress();
  
  if (addresses.length === 0) {
    console.log('❌ No local IP addresses found');
    return;
  }
  
  console.log('📱 Available local IP addresses:');
  console.log('=====================================');
  
  addresses.forEach((addr, index) => {
    console.log(`${index + 1}. ${addr.name}: ${addr.address}`);
  });
  
  console.log('\n💡 For your React Native app, you typically want:');
  console.log('   - iOS Simulator: localhost or 127.0.0.1');
  console.log('   - Android Emulator: 10.0.2.2');
  console.log('   - Physical Device: One of the IP addresses above');
  
  console.log('\n🚀 Your Django backend should be accessible at:');
  addresses.forEach(addr => {
    console.log(`   http://${addr.address}:8000`);
  });
  
  console.log('\n📝 To test if your backend is running, try:');
  console.log(`   curl http://${addresses[0]?.address || 'localhost'}:8000/health/`);
  
  console.log('\n✅ The app will now automatically detect the correct IP address!');
}

// Run the script
displayIPAddresses();
