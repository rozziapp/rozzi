const os = require('os');
const fs = require('fs');
const path = require('path');

// Function to get the current local IP address
function getCurrentIP() {
  const interfaces = os.networkInterfaces();
  
  // Look for the first non-internal IPv4 address
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  
  return null;
}

// Function to update the env.ts file with the current IP
function updateEnvFile(currentIP) {
  const envPath = path.join(__dirname, '..', 'utils', 'env.ts');
  
  try {
    let content = fs.readFileSync(envPath, 'utf8');
    
    // Update the iOS simulator IP
    content = content.replace(
      /return '10\.114\.119\.119';/g,
      `return '${currentIP}';`
    );
    
    // Update the fallback IP
    content = content.replace(
      /return '10\.114\.119\.119'; \/\/ Your actual network IP/g,
      `return '${currentIP}'; // Your actual network IP`
    );
    
    // Update the fallback in commonIPs array
    content = content.replace(
      /'10\.97\.171\.119', \/\/ Your previous working IP as fallback/g,
      `'${currentIP}', // Your current working IP as fallback`
    );
    
    fs.writeFileSync(envPath, content, 'utf8');
    console.log(`✅ Updated env.ts with current IP: ${currentIP}`);
    
  } catch (error) {
    console.error('❌ Error updating env.ts:', error.message);
  }
}

// Main execution
const currentIP = getCurrentIP();

if (currentIP) {
  console.log(`🔍 Found current IP address: ${currentIP}`);
  updateEnvFile(currentIP);
  
  console.log('\n📱 Now you can:');
  console.log('1. Start your Django backend: cd rozzi-backend && py manage.py runserver 0.0.0.0:8000');
  console.log('2. Start your React Native app: cd rozzi-app && npm start');
  console.log(`3. Your app will connect to: http://${currentIP}:8000/api`);
  
} else {
  console.log('❌ Could not determine current IP address');
  console.log('Please check your network connection and try again');
}

