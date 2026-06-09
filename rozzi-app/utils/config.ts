import { getBackendURL } from './env';

// Simple function to get the working backend URL
export const getWorkingURL = async (): Promise<string> => {
  // Just return the working URL directly
  return getBackendURL();
};

// Export for compatibility
export const getBaseURL = getBackendURL;
export const testConnectivity = async () => [];
export const findBestURL = async () => getBackendURL();
