import { getBackendURL, getIPsToTry, ENV_CONFIG } from './env';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Store the working URL in memory to avoid constant lookups
let cachedWorkingURL: string | null = null;
const WORKING_URL_CACHE_KEY = '@working_backend_url';

// Mutex: prevent multiple concurrent scans from running in parallel
let scanInProgress: Promise<string | null> | null = null;

// Find a working backend URL by testing all candidates
export const findWorkingBackendURL = async (): Promise<string | null> => {
  // If a scan is already running, wait for it instead of starting another
  if (scanInProgress) {
    console.log('⏳ Backend scan already in progress, waiting for result...');
    return scanInProgress;
  }

  // Start the actual scan and store the promise
  scanInProgress = _doFindWorkingBackendURL();

  try {
    return await scanInProgress;
  } finally {
    scanInProgress = null;
  }
};

// Internal scan logic (only one runs at a time thanks to the mutex above)
const _doFindWorkingBackendURL = async (): Promise<string | null> => {
  // 1. Check in-memory cache first
  if (cachedWorkingURL) return cachedWorkingURL;

  console.log('🔍 Starting backend discovery...');

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

  // 3. Scan all candidate IPs concurrently
  const candidates = getIPsToTry();
  const { BACKEND_PORT } = ENV_CONFIG.development;

  console.log(`📡 Scanning ${candidates.length} candidate IPs in parallel...`);

  try {
    const workingURL = await Promise.any(
      candidates.map(async (ip) => {
        const baseURL = `http://${ip}:${BACKEND_PORT}`;
        const isWorking = await checkEndpoint(baseURL);
        if (isWorking) {
          return baseURL;
        }
        throw new Error(`IP ${ip} not responsive`);
      })
    );

    console.log(`✅ Found working backend at: ${workingURL}`);
    cachedWorkingURL = workingURL;
    await AsyncStorage.setItem(WORKING_URL_CACHE_KEY, workingURL).catch(e => console.error('Failed to cache URL:', e));
    return workingURL;
  } catch (aggregateError) {
    console.log('❌ Could not find any working backend URL');
  }
  // Clear the stale cached URL
  await AsyncStorage.removeItem(WORKING_URL_CACHE_KEY);
  cachedWorkingURL = null;
  return null;
};

// Function to clear stale cached URL
export const clearCachedURL = async (): Promise<void> => {
  cachedWorkingURL = null;
  await AsyncStorage.removeItem(WORKING_URL_CACHE_KEY);
  console.log('🧹 Cleared cached backend URL');
};

// Helper to check a specific base URL
const checkEndpoint = async (baseURL: string): Promise<boolean> => {
  const testUrl = `${baseURL}/api/health/`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5s timeout for fast scanning

    const response = await fetch(testUrl, {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response.ok || response.status === 404;
  } catch (error) {
    return false;
  }
};

// Get the current working backend URL (or default if none found yet)
// Uses in-memory cache when available to avoid triggering scans on every request
export const getWorkingBackendURL = async (): Promise<string> => {
  // Fast path: return cached URL without scanning
  if (cachedWorkingURL) {
    return `${cachedWorkingURL}/api`;
  }

  // Slow path: need to discover
  const foundURL = await findWorkingBackendURL();

  if (foundURL) {
    return `${foundURL}/api`;
  }

  // Fallback to default from env
  return getBackendURL();
};

export const testConnectivity = async (): Promise<boolean> => {
  return (await findWorkingBackendURL()) !== null;
};

export const isBackendAccessible = testConnectivity;
