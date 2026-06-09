#!/usr/bin/env node

const os = require('os');
const fs = require('fs');
const path = require('path');

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

function updateEnvFile(newIP) {
  const envFilePath = path.join(__dirname, '..', 'utils', 'env.ts');
  
  try {
    let content = fs.readFileSync(envFilePath, 'utf8');
    
    // Update the LOCAL_IP in the getLocalIPAddress function
    const updatedContent = content.replace(
      /return 'localhost';/g,
      `return '${newIP}';`
    );
    
    fs.writeFileSync(envFilePath, updatedContent);
    console.log(`✅ Updated env.ts with new IP: ${newIP}`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to update env.ts:', error.message);
    return false;
  }
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
  
  // Use the first non-localhost IP address
  const primaryIP = addresses.find(addr => 
    !addr.address.startsWith('127.') && 
    !addr.address.startsWith('169.254.')
  );
  
  if (primaryIP) {
    console.log(`\n🎯 Primary IP address: ${primaryIP.address}`);
    console.log(`   This will be used for your React Native app`);
    
    // Update the env.ts file
    if (updateEnvFile(primaryIP.address)) {
      console.log('\n🚀 Your app configuration has been updated!');
      console.log(`   Backend will now use: http://${primaryIP.address}:8000/api`);
    }
  } else {
    console.log('\n⚠️ No suitable IP address found for external access');
    console.log('   You may need to check your network configuration');
  }
  
  console.log('\n💡 For your React Native app:');
  console.log('   - iOS Simulator: localhost or 127.0.0.1');
  console.log('   - Android Emulator: 10.0.2.2');
  console.log('   - Physical Device: One of the IP addresses above');
  
  console.log('\n📝 To test if your backend is running, try:');
  if (primaryIP) {
    console.log(`   curl http://${primaryIP.address}:8000/health/`);
  }
  
  console.log('\n✅ The app will now automatically detect the correct IP address!');
}

// Run the script
displayIPAddresses();
