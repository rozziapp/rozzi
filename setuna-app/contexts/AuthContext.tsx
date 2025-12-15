import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useRouter } from 'expo-router';
import API from '@/utils/api';
import { clearAllTokens, checkStoredTokens } from '@/utils/clearTokens';

interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  profile_picture?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isLoggingOut: boolean;
  login: (emailOrUsername: string, password: string) => Promise<boolean>;
  signup: (firstName: string, lastName: string, email: string, username: string, password: string, password2?: string) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  updateUserData: (userData: Partial<User>) => Promise<void>;
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
    
    // Cleanup function to track when component unmounts
    return () => {
      mountedRef.current = false;
      // Ensure we clean up any pending operations
      setIsLoggingOut(false);
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      // First, check what tokens are stored
      await checkStoredTokens();
      
      const storedToken = await AsyncStorage.getItem('authToken');
      const storedUser = await AsyncStorage.getItem('user');

      if (storedToken && storedUser) {
        // Test if the token is still valid by making a request
        try {
          const response = await API.get('/me/');
          if (response.status === 200) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            console.log('Token is valid, user authenticated');
          } else {
            // Token is invalid, clear storage and redirect to login
            console.log('Token validation failed, clearing tokens');
            await clearAllTokens();
            setToken(null);
            setUser(null);
            // Only redirect if we're not already on login screen
            if (mountedRef.current) {
              router.replace('/login');
            }
          }
        } catch (tokenError: any) {
          // Check if it's an expired token (expected behavior)
          if (tokenError.response?.status === 401 && 
              tokenError.response?.data?.detail?.includes('Token is expired')) {
            console.log('Token expired during startup - clearing expired tokens');
          } else {
            console.error('Unexpected token validation error:', tokenError);
          }
          // Token is invalid, clear storage - don't redirect here as we're in initialization
          await clearAllTokens();
          setToken(null);
          setUser(null);
        }
      } else {
        console.log('No stored tokens found, redirecting to login');
        // If no stored auth, redirect to login
        if (mountedRef.current) {
          router.replace('/login');
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      // If there's an error, redirect to login
      await clearAllTokens();
      setToken(null);
      setUser(null);
      if (mountedRef.current) {
        router.replace('/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (emailOrUsername: string, password: string): Promise<boolean> => {
    try {
      const response = await API.post('/token/', {
        username: emailOrUsername,
        password: password,
      });

      const data = response.data;

      if (response.status === 200 && data.access) {
        // Store the access token
        await AsyncStorage.setItem('authToken', data.access);
        
        // Store refresh token if available
        if (data.refresh) {
          await AsyncStorage.setItem('refreshToken', data.refresh);
          console.log('Refresh token stored successfully');
        } else {
          console.log('No refresh token received from login');
        }
        
        // Get user profile using the token
        const userResponse = await API.get('/me/');
        const userData = userResponse.data;
        
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        
        setToken(data.access);
        setUser(userData);
        
        // Redirect to home screen after successful login
        router.replace('/(tabs)');
        
        return true;
      } else {
        return false;
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Provide more specific error messages
      if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
        throw new Error('Unable to connect to server. Please check your internet connection and try again.');
      } else if (error.response?.status === 401) {
        throw new Error('Invalid email/username or password. Please check your credentials.');
      } else if (error.response?.status >= 500) {
        throw new Error('Server error. Please try again later.');
      } else {
        throw error; // Re-throw original error for other cases
      }
    }
  };

  const signup = async (firstName: string, lastName: string, email: string, username: string, password: string, password2?: string): Promise<boolean> => {
    try {
      const response = await API.post('/register/', {
        first_name: firstName,
        last_name: lastName,
        email: email,
        username: username,
        password: password,
        password2: password2 || password, // Use password2 if provided, otherwise use password as confirmation
      });

      const data = response.data;

      if (response.status === 201 || response.status === 200) {
        return true;
      } else {
        // Throw error with response data for better error handling
        const error = new Error('Signup failed');
        (error as any).response = { data };
        throw error;
      }
    } catch (error) {
      console.error('Signup error:', error);
      throw error; // Re-throw to let the component handle it
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    try {
      const response = await API.put('/change-password/', {
        old_password: currentPassword,
        new_password: newPassword,
      });

      if (response.status === 200) {
        // Clear tokens and user data after successful password change
        await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'user']);
        setToken(null);
        setUser(null);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Change password error:', error);
      throw error; // Re-throw to let the component handle it
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

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated,
    isLoggingOut,
    login,
    signup,
    changePassword,
    logout,
    checkAuthStatus,
    updateUserData,
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
