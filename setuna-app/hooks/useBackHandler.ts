import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

interface UseBackHandlerOptions {
  onBackPress?: () => boolean | void;
  preventDefault?: boolean;
  targetRoute?: string;
}

export const useBackHandler = (options: UseBackHandlerOptions = {}) => {
  const { onBackPress, preventDefault = false, targetRoute } = options;
  const { isAuthenticated, isLoggingOut } = useAuth();

  useEffect(() => {
    const backAction = () => {
      // If we're logging out, don't handle back navigation
      if (isLoggingOut) {
        return true;
      }

      // If custom handler is provided, use it
      if (onBackPress) {
        const result = onBackPress();
        if (result === true) {
          return true; // Prevent default
        }
        if (result === false) {
          return false; // Allow default
        }
      }

      // If preventDefault is true, prevent back navigation
      if (preventDefault) {
        return true;
      }

      // If not authenticated, redirect to login
      if (!isAuthenticated) {
        setTimeout(() => {
          router.replace('/login' as any);
        }, 0);
        return true;
      }

      // If targetRoute is specified, navigate to it
      if (targetRoute) {
        setTimeout(() => {
          router.replace(targetRoute as any);
        }, 0);
        return true;
      }

      // Default behavior - go back
      router.back();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [onBackPress, preventDefault, targetRoute, isAuthenticated, isLoggingOut]);

  return null;
}; 