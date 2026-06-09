// Environment Configuration
// This file now automatically detects your local IP address

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Cache key for storing detected IP
const IP_CACHE_KEY = '@backend_ip_address';

// Auto-detect the host machine IP from Expo's dev server
// This is the most reliable way — Metro bundler knows the correct IP
const getDevServerIP = (): string | null => {
  try {
    // In Expo Go, hostUri is like "10.246.225.119:8081"
    const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        console.log(`📱 Auto-detected host IP from Expo: ${ip}`);
        return ip;
      }
    }
  } catch (e) {
    console.log('Could not auto-detect dev server IP:', e);
  }
  return null;
};

// Function to get local IP address automatically with fallbacks
const getLocalIPAddress = (): string => {
  // Try auto-detected IP first
  const devServerIP = getDevServerIP();
  if (devServerIP) return devServerIP;

  if (Platform.OS === 'ios') {
    return 'localhost';
  } else if (Platform.OS === 'android') {
    return '10.0.2.2';
  }
  return 'localhost';
};

// Get list of IPs to try in order
export const getIPsToTry = (): string[] => {
  const autoIP = getDevServerIP();
  const platformIP = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

  // Build list with auto-detected IP first (highest priority)
  const ipsToTry = [
    ...(autoIP ? [autoIP] : []),  // Auto-detected from Expo dev server (best)
    platformIP,                    // Platform-specific fallback
    '10.0.2.2',                   // Android emulator default
    'localhost',
    '127.0.0.1',
    '192.168.1.100',
    '192.168.1.5',
    '192.168.0.100',
    '192.168.0.105',
  ];

  // Remove duplicates and filter out empty strings
  return [...new Set(ipsToTry)].filter(Boolean);
};

export const ENV_CONFIG = {
  // Development settings
  development: {
    // Dynamic IP detection
    LOCAL_IP: getLocalIPAddress(),
    NETWORK_IP: getDevServerIP() || 'localhost',

    // Port for your Django backend
    BACKEND_PORT: '8000',

    // API base path
    API_PATH: '/api',

    // Connection timeout
    TIMEOUT: 10000,

    // Retry attempts
    MAX_RETRIES: 3,
  },

  // Production settings
  production: {
    BASE_URL: 'https://your-domain.com',
    API_PATH: '/api',
  }
};

// Function to get the full backend URL for development
export const getBackendURL = (): string => {
  if (__DEV__) {
    const { LOCAL_IP, BACKEND_PORT, API_PATH } = ENV_CONFIG.development;
    return `http://${LOCAL_IP}:${BACKEND_PORT}${API_PATH}`;
  } else {
    const { BASE_URL, API_PATH } = ENV_CONFIG.production;
    return `${BASE_URL}${API_PATH}`;
  }
};

// Function to get the backend base URL without API path (for health checks)
export const getBackendBaseURL = (): string => {
  if (__DEV__) {
    const { LOCAL_IP, BACKEND_PORT } = ENV_CONFIG.development;
    return `http://${LOCAL_IP}:${BACKEND_PORT}`;
  } else {
    const { BASE_URL } = ENV_CONFIG.production;
    return BASE_URL;
  }
};

// Function to get alternative backend URLs for fallback
export const getAlternativeBackendURLs = (): string[] => {
  if (__DEV__) {
    const { BACKEND_PORT, API_PATH } = ENV_CONFIG.development;
    const ipsToTry = getIPsToTry();

    // Generate URLs for all IPs to try
    return ipsToTry.map(ip => `http://${ip}:${BACKEND_PORT}${API_PATH}`);
  }
  return [];
};

// Function to get cached backend IP
export const getCachedBackendIP = async (): Promise<string | null> => {
  try {
    const cachedIP = await AsyncStorage.getItem(IP_CACHE_KEY);
    return cachedIP;
  } catch (error) {
    console.error('Error getting cached IP:', error);
    return null;
  }
};

// Function to cache backend IP
export const cacheBackendIP = async (ip: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(IP_CACHE_KEY, ip);
    console.log(`✅ Cached backend IP: ${ip}`);
  } catch (error) {
    console.error('Error caching IP:', error);
  }
};
// Export individual values for easy access
export const { development, production } = ENV_CONFIG;

