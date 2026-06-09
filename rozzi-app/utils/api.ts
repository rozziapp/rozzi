import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBackendURL } from './env';
import { getWorkingBackendURL, clearCachedURL } from './connectivity';

// Create API instance with dynamic backend URL
const createAPIInstance = (baseURL: string) => {
  return axios.create({
    baseURL,
    timeout: 15000, // 15s timeout — fail fast instead of hanging
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/plain, */*',
    },
    validateStatus: (status) => {
      return status >= 200 && status < 500; // Accept 2xx and 4xx responses
    },
  });
};

// Global API instance that will be updated dynamically
let API = createAPIInstance(getBackendURL());

// Function to update API base URL
const updateAPIBaseURL = async (newURL: string) => {
  console.log('🔄 Updating API base URL to:', newURL);
  API = createAPIInstance(newURL);

  // Re-add interceptors
  setupInterceptors();
};

// Setup interceptors for the API instance
const setupInterceptors = () => {
  // Add request interceptor for authentication
  // NOTE: We no longer scan for working URLs here — that was causing
  // a full 9-IP scan on every single request. The URL is resolved once
  // at startup and only re-scanned on failure in the response interceptor.
  API.interceptors.request.use(
    async (config) => {
      try {
        // Get token from AsyncStorage
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log(`🔑 Using auth token: ${token.substring(0, 20)}...`);
        } else {
          console.log('⚠️ No auth token found in AsyncStorage');
        }

        console.log(`Making ${config.method?.toUpperCase()} request to: ${config.baseURL}${config.url}`);
        return config;
      } catch (error) {
        console.error('Request interceptor error:', error);
        return config;
      }
    },
    (error) => {
      console.error('Request interceptor error:', error);
      return Promise.reject(error);
    }
  );

  // Add response interceptor for error handling and token refresh
  API.interceptors.response.use(
    (response) => {
      return response;
    },
    async (error) => {
      const originalRequest = error.config;

      // If the error is 401 and we haven't tried to refresh the token yet
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          // Get refresh token from AsyncStorage
          const refreshToken = await AsyncStorage.getItem('refreshToken');

          if (refreshToken) {
            console.log('Attempting to refresh expired token...');
            const workingURL = await getWorkingBackendURL();
            const response = await axios.post(`${workingURL}/token/refresh/`, {
              refresh: refreshToken
            });

            const { access } = response.data;

            // Store the new access token
            await AsyncStorage.setItem('authToken', access);
            console.log('Token refreshed successfully');

            // Update the original request with the new token
            originalRequest.headers.Authorization = `Bearer ${access}`;

            // Retry the original request
            return API(originalRequest);
          } else {
            console.log('No refresh token available - cannot refresh expired token');
          }
        } catch (refreshError) {
          // If refresh fails, clear tokens 
          await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'user']);
          console.log('Token refresh failed - tokens cleared');
        }
      }

      // Handle network errors — single retry with URL re-discovery
      const isNetworkError = !error.response && error.request;
      if (isNetworkError && !originalRequest._retryNetwork) {
        originalRequest._retryNetwork = true;
        console.log('🌐 Network error, clearing cached URL and retrying once...');

        try {
          // Clear the stale cached URL so we scan fresh
          await clearCachedURL();
          const newURL = await getWorkingBackendURL();
          originalRequest.baseURL = newURL;
          console.log('🔄 Retrying with discovered URL:', newURL);
          return API(originalRequest);
        } catch (retryError) {
          console.log('❌ Retry after URL re-discovery also failed');
        }
      }

      // Log errors concisely
      if (error.response) {
        console.warn('API Error:', error.response.status, error.config?.url);
      } else if (error.request) {
        console.warn('Network Error:', error.config?.url, '- backend may not be running');
      } else {
        console.warn('API Error:', error.message);
      }
      return Promise.reject(error);
    }
  );
};

// Initialize interceptors
setupInterceptors();

// Export the API instance
export default API;

// Authentication helper functions
export const authAPI = {
  // Register a new user
  register: async (userData: {
    username: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  }) => {
    const response = await API.post('/register/', userData);
    return response.data;
  },

  // Login user
  login: async (credentials: { username: string; password: string }) => {
    const response = await API.post('/token/', credentials);
    const { access, refresh } = response.data;

    // Store tokens (use authToken key to match AuthContext)
    await AsyncStorage.setItem('authToken', access);
    await AsyncStorage.setItem('refreshToken', refresh);

    return response.data;
  },

  // Get user profile
  getProfile: async () => {
    const response = await API.get('/me/');
    return response.data;
  },

  // Check if user is authenticated
  isAuthenticated: async () => {
    const token = await AsyncStorage.getItem('authToken');
    return !!token;
  },

  // Logout user
  logout: async () => {
    await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'user']);
  }
};

// ID Card API functions
export const idCardAPI = {
  // Get all ID cards for current user
  getIDCards: async () => {
    const response = await API.get('/id-cards/');
    return response.data;
  },

  // Upload photo for ID card
  uploadPhoto: async (photoData: string) => {
    console.log('=== UPLOAD PHOTO API CALL ===');
    console.log('Photo data type:', typeof photoData);
    console.log('Photo data length:', photoData.length);

    try {
      const response = await API.post('/upload-photo/', { photo: photoData });
      console.log('✅ Photo upload API call successful:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Photo upload API call failed:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      throw error;
    }
  },

  // Create a new ID card
  createIDCard: async (idCardData: {
    photo?: string;
    name: string;
    gender: string;
    date_of_birth: string;
    nationality: string;
    address: string;
    phone_number?: string;
    skills: string[];
    is_primary?: boolean;
  }) => {
    const response = await API.post('/id-cards/', idCardData);
    return response.data;
  },

  // Update an ID card
  updateIDCard: async (id: number, idCardData: {
    photo?: string;
    name?: string;
    gender?: string;
    date_of_birth?: string;
    nationality?: string;
    address?: string;
    phone_number?: string;
    skills?: string[];
    is_primary?: boolean;
  }) => {
    const response = await API.put(`/id-cards/${id}/`, idCardData);
    return response.data;
  },

  // Delete an ID card
  deleteIDCard: async (id: number) => {
    const response = await API.delete(`/id-cards/${id}/`);
    return response.data;
  }
};

// Resume File API functions
export const resumeAPI = {
  // Get all resume files for current user
  getResumeFiles: async () => {
    const response = await API.get('/resume-files/');
    return response.data;
  },

  // Upload resume file to Cloudinary
  uploadResumeFile: async (fileData: string, fileName: string) => {
    console.log('=== UPLOAD RESUME FILE TO CLOUDINARY ===');
    console.log('File name:', fileName);
    console.log('API URL:', '/upload-resume/');

    try {
      const response = await API.post('/upload-resume/', {
        file: fileData,
        file_name: fileName
      });
      console.log('✅ Resume file upload to Cloudinary successful:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Resume file upload to Cloudinary failed:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      throw error;
    }
  },

  // Create a new resume file
  createResumeFile: async (resumeData: {
    file_name: string;
    file_url: string;
    file_size: number;
    is_default?: boolean;
  }) => {
    console.log('=== CREATE RESUME FILE API CALL ===');
    console.log('Sending data:', resumeData);
    console.log('API URL:', '/resume-files/');

    try {
      const response = await API.post('/resume-files/', resumeData);
      // Check for error status (validateStatus allows 4xx through without throwing)
      if (response.status >= 400) {
        console.error('❌ Resume file API returned error status:', response.status, response.data);
        const errorMsg = response.data?.file_url?.[0] || response.data?.error || response.data?.detail || 'Failed to save resume';
        throw new Error(errorMsg);
      }
      console.log('✅ Resume file API call successful:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Resume file API call failed:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      throw error;
    }
  },

  // Update a resume file
  updateResumeFile: async (id: number, resumeData: {
    file_name?: string;
    file_url?: string;
    file_size?: number;
    is_default?: boolean;
  }) => {
    const response = await API.put(`/resume-files/${id}/`, resumeData);
    // Check for error status (validateStatus allows 4xx through without throwing)
    if (response.status >= 400) {
      console.error('❌ Resume file update returned error status:', response.status, response.data);
      const errorMsg = response.data?.file_url?.[0] || response.data?.error || response.data?.detail || 'Failed to update resume';
      throw new Error(errorMsg);
    }
    return response.data;
  },

  // Delete a resume file
  deleteResumeFile: async (id: number) => {
    const response = await API.delete(`/resume-files/${id}/`);
    return response.data;
  }
};

// Job Preferences API functions
export const jobPreferencesAPI = {
  // Get job preferences (looking posts) for current user
  getJobPreferences: async () => {
    const response = await API.get('/jobs/my-preferences/');
    return response.data;
  }
};

// Hire Request API functions
export const hireRequestAPI = {
  // Create a new hire request
  createHireRequest: async (jobId: number, message?: string) => {
    const response = await API.post('/hire-requests/', {
      job_id: jobId,
      message: message || ''
    });
    return response.data;
  },

  // Get all hire requests for current user (both sent and received)
  getAllHireRequests: async () => {
    const response = await API.get('/hire-requests/all/');
    return response.data;
  },

  // Get hire requests received by current user (as a job seeker)
  getReceivedHireRequests: async () => {
    const response = await API.get('/hire-requests/received/');
    return response.data;
  },

  // Get hire requests sent by current user (as a recruiter)
  getSentHireRequests: async () => {
    const response = await API.get('/hire-requests/sent/');
    return response.data;
  },

  // Update hire request status
  updateHireRequest: async (requestId: number, status: string) => {
    const response = await API.put(`/hire-requests/${requestId}/`, { status });
    return response.data;
  }
};
