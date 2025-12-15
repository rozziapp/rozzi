import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, isLoggingOut } = useAuth();

  // If logging out, show nothing
  if (isLoggingOut) {
    return null;
  }

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6b46c1" />
      </View>
    );
  }

  // If not authenticated, redirect to login and show nothing
  if (!isAuthenticated) {
    // Use setTimeout to avoid React hook conflicts
    setTimeout(() => {
      router.replace('/login');
    }, 0);
    return null;
  }

  // User is authenticated, show protected content
  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#B0AAD9',
  },
});
