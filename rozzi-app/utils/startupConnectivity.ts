import { testConnectivity, getWorkingBackendURL } from './connectivity';
import { getAlternativeBackendURLs } from './env';

interface ConnectivityResult {
  isConnected: boolean;
  workingURL?: string;
  error?: string;
  suggestions: string[];
}

export const initializeAppConnectivity = async (): Promise<ConnectivityResult> => {
  console.log('🚀 Initializing app connectivity...');
  
  const suggestions: string[] = [];
  
  // Test primary backend URL
  console.log('🚀 Checking backend connectivity...');
  const primaryConnected = await testConnectivity();
  
  if (primaryConnected) {
    console.log('✅ Backend connectivity successful');
    return {
      isConnected: true,
      workingURL: await getWorkingBackendURL(),
      suggestions: []
    };
  }
  
  console.log('❌ Backend connectivity failed');
  
  // Test alternative URLs
  const alternativeURLs = getAlternativeBackendURLs();
  for (const url of alternativeURLs) {
    try {
      console.log(`🔍 Testing alternative URL: ${url}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${url}/health/`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`✅ Found working backend at: ${url}`);
        return {
          isConnected: true,
          workingURL: url,
          suggestions: [`Backend is accessible at ${url}`]
        };
      }
    } catch (error) {
      console.log(`❌ Alternative URL failed: ${url}`);
    }
  }
  
  // Generate helpful suggestions
  suggestions.push('Make sure your Django backend is running:');
  suggestions.push('  cd rozzi-backend');
  suggestions.push('  python manage.py runserver 0.0.0.0:8000');
  suggestions.push('');
  suggestions.push('If the backend is running but still not accessible:');
  suggestions.push('  1. Check Windows Firewall settings');
  suggestions.push('  2. Run: node scripts/update-local-ip.js');
  suggestions.push('  3. Verify your network connection');
  
  return {
    isConnected: false,
    error: 'Unable to connect to backend server',
    suggestions
  };
};

// Function to display connectivity status
export const displayConnectivityStatus = async () => {
  const result = await initializeAppConnectivity();
  
  if (result.isConnected) {
    console.log('✅ Backend connectivity successful');
    console.log(`🔗 Using backend URL: ${result.workingURL}`);
  } else {
    console.log('❌ Backend connectivity failed');
    console.log('💡 Troubleshooting suggestions:');
    result.suggestions.forEach(suggestion => console.log(`   ${suggestion}`));
  }
  
  return result;
};

export default initializeAppConnectivity;