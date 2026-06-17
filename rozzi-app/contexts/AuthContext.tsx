import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useRouter } from 'expo-router';
import API, { setUnauthorizedCallback } from '@/utils/api';
import { clearAllTokens, checkStoredTokens } from '@/utils/clearTokens';

interface UserProfileData {
  bio?: string;
  skills?: string[];
  profile_picture?: string;
  subscription_plan?: 'free' | 'seeker_29' | 'recruiter_99';
  is_premium?: boolean;
  subscription_active?: boolean;
  daily_applications_count?: number;
  last_application_reset?: string;
  active_hire_count?: number;
  active_looking_count?: number;
  max_active_hire_posts?: number;
  max_active_looking_posts?: number;
  daily_applications_limit?: number;
  remaining_hire_posts?: number;
  remaining_looking_posts?: number;
  remaining_applications?: number;
}

interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  profile_picture?: string;
  profile?: UserProfileData;
}

interface AuthResult {
  success: boolean;
  new_user?: boolean;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isLoggingOut: boolean;
  loginWithGoogle: (token: string) => Promise<AuthResult>;
  setUsername: (username: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  updateUserData: (userData: Partial<User>) => Promise<void>;
  reloadUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const mountedRef = useRef(true);

  const isAuthenticated = !!token && !!user;

  useEffect(() => {
    mountedRef.current = true;
    checkAuthStatus();

    // Register callback for unauthorized events (401 session expiration)
    setUnauthorizedCallback(() => {
      console.log('Session expired - performing automatic logout');
      logout();
    });

    // Cleanup function to track when component unmounts
    return () => {
      mountedRef.current = false;
      // Ensure we clean up any pending operations
      setIsLoggingOut(false);
      setUnauthorizedCallback(null);
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      // First, check what tokens are stored
      await checkStoredTokens();

      const storedToken = await AsyncStorage.getItem('authToken');
      const storedUser = await AsyncStorage.getItem('user');

      if (storedToken && storedUser) {
        // Optimistically restore cached session immediately so UI renders instantly
        console.log('⚡ Optimistically restoring cached session...');
        setToken(storedToken);
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          setUser(null);
        }
        setIsLoading(false); // UI goes to home screen immediately!

        // Now verify the session in the background
        try {
          console.log('📡 Running background session verification...');
          const response = await API.get('/me/', {
            timeout: 5000,
          });

          if (response.status === 200) {
            const freshUser = response.data;
            setUser(freshUser);
            await AsyncStorage.setItem('user', JSON.stringify(freshUser));
            console.log('✅ Background token verification succeeded, profile updated');
          } else {
            console.log('❌ Background token check failed with status:', response.status);
            // This is an error status, clear tokens and logout
            await logout();
          }
        } catch (tokenError: any) {
          const isAuthError = tokenError.response && (tokenError.response.status === 401 || tokenError.response.status === 403);
          
          if (isAuthError) {
            console.log('❌ Background token check failed with auth error. Logging out.');
            await logout();
          } else {
            console.log('⚠️ Background token check failed due to network/server issue. Keeping cached session.');
          }
        }
      } else {
        console.log('No stored tokens found');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      await clearAllTokens();
      setToken(null);
      setUser(null);
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (googleToken: string): Promise<AuthResult> => {
    try {
      console.log('Sending Google token to backend...');
      const response = await API.post('/auth/google/', {
        token: googleToken,
      });

      const data = response.data;
      console.log('Google Auth Response:', data);

      if (response.status === 200 && data.access) {
        // Store the access token
        await AsyncStorage.setItem('authToken', data.access);

        // Store refresh token if available
        if (data.refresh) {
          await AsyncStorage.setItem('refreshToken', data.refresh);
        }

        // If it's a new user, we might not have full user data or we might need to complete registration
        // logic is handled by the caller based on data.new_user

        if (data.user) {
          await AsyncStorage.setItem('user', JSON.stringify(data.user));
          setUser(data.user);
        }

        // For new users, user data might not be in the response yet.
        // We need to fetch it so that isAuthenticated becomes true.
        if (!data.user && data.new_user) {
          try {
            const profileResponse = await API.get('/me/');
            if (profileResponse.status === 200 && profileResponse.data) {
              await AsyncStorage.setItem('user', JSON.stringify(profileResponse.data));
              setUser(profileResponse.data);
            }
          } catch (profileError) {
            console.warn('Could not fetch profile for new user:', profileError);
          }
        }

        setToken(data.access);

        // Return result so component can decide to redirect to Home or Choose Username
        return {
          success: true,
          new_user: data.new_user,
          name: data.name
        };
      } else {
        return { success: false };
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      throw new Error(error.response?.data?.error || 'Google login failed');
    }
  };

  const setUsername = async (username: string): Promise<boolean> => {
    try {
      const response = await API.post('/auth/set-username/', { username });
      const data = response.data;

      if (response.status === 200 && data.access) {
        await AsyncStorage.setItem('authToken', data.access);
        if (data.refresh) await AsyncStorage.setItem('refreshToken', data.refresh);
        if (data.user) {
          await AsyncStorage.setItem('user', JSON.stringify(data.user));
          setUser(data.user);
        }
        setToken(data.access);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Set username error', error);
      throw new Error(error.response?.data?.error || 'Failed to set username');
    }
  };

  const logout = async () => {
    if (isLoggingOut) return;

    console.log('🔄 Starting logout process...');
    setIsLoggingOut(true);

    // Clear authentication data immediately
    setToken(null);
    setUser(null);

    try {
      await clearAllTokens();
      console.log('✅ Tokens cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing tokens:', error);
    }

    // Use a small delay to ensure state is updated
    setTimeout(() => {
      setIsLoggingOut(false);
      console.log('🧭 Redirecting to login...');
      router.replace('/login');
    }, 100);
  };

  const updateUserData = async (userData: Partial<User>) => {
    try {
      if (user) {
        const updatedUser = { ...user, ...userData };
        setUser(updatedUser);

        // Update stored user data
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        console.log('User data updated in AuthContext:', updatedUser);
      }
    } catch (error) {
      console.error('Error updating user data:', error);
    }
  };

  const reloadUserProfile = async () => {
    try {
      const response = await API.get('/me/');
      if (response.status === 200 && response.data) {
        // Response.data is the User details, including the updated profile field.
        await AsyncStorage.setItem('user', JSON.stringify(response.data));
        setUser(response.data);
        console.log('✅ User profile reloaded successfully');
      }
    } catch (error) {
      console.error('Error reloading user profile:', error);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated,
    isLoggingOut,
    loginWithGoogle,
    setUsername,
    logout,
    checkAuthStatus,
    updateUserData,
    reloadUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
