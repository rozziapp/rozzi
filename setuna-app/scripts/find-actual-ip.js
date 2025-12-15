#!/usr/bin/env node

const os = require('os');
const axios = require('axios');

function getLocalIPAddresses() {
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

async function testBackendIP(baseIP, port = 8000) {
  try {
    // Test with the same logic as the connectivity manager
    const url = `http://${baseIP}:${port}/api/register/`;
    const response = await axios.post(url, {
      username: 'test_connectivity',
      email: 'test@test.com',
      password: 'testpass123',
      first_name: 'Test',
      last_name: 'User'
    }, { 
      timeout: 3000,
      validateStatus: (status) => true // Accept all status codes
    });
    
    // If we get a 400 status, it means the endpoint exists and is working
    // (just validation failed, which is expected for our test data)
    if (response.status === 400) {
      return { ip: baseIP, working: true, status: response.status, message: 'Endpoint accessible (validation error expected)' };
    } else if (response.status < 500) {
      return { ip: baseIP, working: true, status: response.status, message: 'Endpoint working' };
    } else {
      return { ip: baseIP, working: false, status: response.status, message: 'Server error' };
    }
  } catch (error) {
    if (error.response && error.response.status === 400) {
      // 400 status means the endpoint exists and is working, just validation failed
      return { ip: baseIP, working: true, status: 400, message: 'Endpoint accessible (validation error expected)' };
    }
    return { ip: baseIP, working: false, error: error.message };
  }
}

async function findWorkingBackendIP() {
  console.log('🔍 Finding your actual network IP address...\n');
  
  // Get your local IP addresses
  const localIPs = getLocalIPAddresses();
  
  if (localIPs.length === 0) {
    console.log('❌ No local IP addresses found');
    return;
  }
  
  console.log('📱 Your local network interfaces:');
  console.log('=====================================');
  
  localIPs.forEach((addr, index) => {
    console.log(`${index + 1}. ${addr.name}: ${addr.address}`);
  });
  
  // Extract network prefix from your local IP
  const primaryIP = localIPs[0];
  const ipParts = primaryIP.address.split('.');
  const networkPrefix = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}`;
  
  console.log(`\n🌐 Network prefix detected: ${networkPrefix}.x`);
  console.log('🔍 Testing common IP addresses in your network...\n');
  
  // Test common IPs in your network
  const ipsToTest = [
    // Your actual IP
    primaryIP.address,
    
    // Common network addresses
    `${networkPrefix}.1`,   // Router/Gateway
    `${networkPrefix}.2`,   // Common device
    `${networkPrefix}.10`,  // Common device
    `${networkPrefix}.20`,  // Common device
    `${networkPrefix}.50`,  // Common device
    `${networkPrefix}.100`, // Common device
    `${networkPrefix}.200`, // Common device
    `${networkPrefix}.254`, // Last usable IP
    
    // Specific IPs from your previous logs
    '10.97.171.119',
    '10.97.171.1',
    '10.97.171.2',
    '10.97.171.10',
    '10.97.171.20',
    '10.97.171.50',
    '10.97.171.100',
    '10.97.171.200',
    '10.97.171.254',
  ];
  
  console.log('🧪 Testing backend connectivity...');
  console.log('=====================================');
  
  const results = [];
  
  for (const ip of ipsToTest) {
    process.stdout.write(`Testing ${ip}... `);
    const result = await testBackendIP(ip);
    results.push(result);
    
    if (result.working) {
      console.log('✅ WORKING!');
    } else {
      console.log('❌ Failed');
    }
  }
  
  // Find working IPs
  const workingIPs = results.filter(r => r.working);
  
  if (workingIPs.length > 0) {
    console.log('\n🎉 Found working backend IPs:');
    console.log('=====================================');
    
    workingIPs.forEach((result, index) => {
      console.log(`${index + 1}. ${result.ip}:8000 - Status: ${result.status}`);
    });
    
    const bestIP = workingIPs[0];
    console.log(`\n🎯 Recommended backend URL: http://${bestIP.ip}:8000/api`);
    
    // Update the env.ts file with the working IP
    updateEnvFile(bestIP.ip);
    
  } else {
    console.log('\n❌ No working backend IPs found');
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Make sure your Django backend is running: python manage.py runserver 0.0.0.0:8000');
    console.log('2. Check if port 8000 is not blocked by firewall');
    console.log('3. Verify you\'re on the same network as your backend');
    console.log('4. Try running: curl http://localhost:8000/health/');
  }
  
  console.log('\n📊 Test Results Summary:');
  console.log('==========================');
  results.forEach(result => {
    const status = result.working ? '✅' : '❌';
    const details = result.working ? `Status: ${result.status}` : `Error: ${result.error}`;
    console.log(`${status} ${result.ip}:8000 - ${details}`);
  });
}

function updateEnvFile(workingIP) {
  const fs = require('fs');
  const path = require('path');
  
  const envFilePath = path.join(__dirname, '..', 'utils', 'env.ts');
  
  try {
    let content = fs.readFileSync(envFilePath, 'utf8');
    
    // Update the getLocalIPAddress function to return the working IP
    const updatedContent = content.replace(
      /return 'localhost';/g,
      `return '${workingIP}';`
    );
    
    fs.writeFileSync(envFilePath, updatedContent);
    console.log(`\n✅ Updated env.ts with working IP: ${workingIP}`);
    console.log('🔄 Restart your app to use the new configuration!');
    
  } catch (error) {
    console.log(`\n⚠️ Could not update env.ts: ${error.message}`);
    console.log(`💡 Manually update the IP in utils/env.ts to: ${workingIP}`);
  }
}

// Run the script
findWorkingBackendIP().catch(console.error);
