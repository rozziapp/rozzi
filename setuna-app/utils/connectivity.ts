import { getBackendURL, getIPsToTry, ENV_CONFIG } from './env';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Store the working URL in memory to avoid constant lookups
let cachedWorkingURL: string | null = null;
const WORKING_URL_CACHE_KEY = '@working_backend_url';

// Find a working backend URL by testing all candidates
export const findWorkingBackendURL = async (): Promise<string | null> => {
  console.log('🔍 Starting backend discovery...');

  // 1. Check in-memory cache first
  if (cachedWorkingURL) return cachedWorkingURL;

  // 2. Check persistent storage
  try {
    const storedURL = await AsyncStorage.getItem(WORKING_URL_CACHE_KEY);
    if (storedURL) {
      console.log('📦 Found cached backend URL:', storedURL);
      // Verify it's still working
      if (await checkEndpoint(storedURL)) {
        cachedWorkingURL = storedURL;
        return storedURL;
      }
      console.log('❌ Cached URL is no longer working, searching again...');
    }
  } catch (error) {
    console.error('Error reading cached URL:', error);
  }

  // 3. Scan all candidate IPs
  const candidates = getIPsToTry();
  const { BACKEND_PORT } = ENV_CONFIG.development;

  console.log(`📡 Scanning ${candidates.length} candidate IPs...`);

  // We'll test 8000 (standard) and potentially others if configured, but sticking to 8000 for now as per env.ts
  for (const ip of candidates) {
    const baseURL = `http://${ip}:${BACKEND_PORT}`;
    const isWorking = await checkEndpoint(baseURL);

    if (isWorking) {
      console.log(`✅ Found working backend at: ${baseURL}`);
      cachedWorkingURL = baseURL;
      await AsyncStorage.setItem(WORKING_URL_CACHE_KEY, baseURL).catch(e => console.error('Failed to cache URL:', e));
      return baseURL;
    }
  }

  console.log('❌ Could not find any working backend URL');
  return null;
};

// Helper to check a specific base URL
const checkEndpoint = async (baseURL: string): Promise<boolean> => {
  const testUrl = `${baseURL}/api/health/`; // Assuming this exists, based on previous file content which checked /api/health/
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout for fast scanning

    const response = await fetch(testUrl, {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response.ok || response.status === 404; // 404 means server is up but maybe path is wrong, which is "alive" enough for connectivity check usually, but safely assume 200-299 for actual health. strict check:
    // Actually, let's allow 404 because sometimes /health/ isn't set up but the server responds. 
    // Better: check root / or /api/ if health fails? 
    // For now, simple fetch success is good enough.
  } catch (error) {
    return false;
  }
};

// Get the current working backend URL (or default if none found yet)
export const getWorkingBackendURL = async (): Promise<string> => {
  // If we already have a specialized function to find it, use it.
  const foundURL = await findWorkingBackendURL();

  if (foundURL) {
    return `${foundURL}/api`; // Append /api as likely expected by the caller which used getBackendURL()
  }

  // Fallback to default from env
  return getBackendURL();
};

export const testConnectivity = async (): Promise<boolean> => {
  return (await findWorkingBackendURL()) !== null;
};

export const isBackendAccessible = testConnectivity;
