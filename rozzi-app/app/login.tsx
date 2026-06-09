import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCustomFonts } from '@/hooks/fonts';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import Constants from 'expo-constants';

// Ensure web browser dismisses properly
WebBrowser.maybeCompleteAuthSession();

// Web Client ID from Google Cloud Console
const WEB_CLIENT_ID = '370990896857-t1gnvm3c4n2apfu4ugpr9ccpoae580qd.apps.googleusercontent.com';

// iOS Client ID from Google Cloud Console (Configure this when building for iOS)
const IOS_CLIENT_ID = '';

// Determine if we're running in Expo Go (vs a development/standalone build)
const isExpoGo = Constants.appOwnership === 'expo';

// Redirect URI: uses the custom scheme registered in app.json
// This only works in development builds / standalone — NOT in Expo Go
const EXPO_REDIRECT_URI = makeRedirectUri({ scheme: 'rozziapp' });

console.log('🔑 Google OAuth redirect URI:', EXPO_REDIRECT_URI);
console.log('🔑 Running in Expo Go:', isExpoGo);

export default function LoginScreen() {
  const [fontsLoaded] = useCustomFonts();
  const { loginWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Use Google auth hook (only functional in dev builds, not Expo Go)
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: WEB_CLIENT_ID,
    androidClientId: '370990896857-1mlsie4r8s30jc8753u5tbdcath60pkv.apps.googleusercontent.com',
    iosClientId: IOS_CLIENT_ID || undefined,
    redirectUri: EXPO_REDIRECT_URI,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (id_token) {
        console.log('Got ID token from Google');
        handleGoogleLogin(id_token);
      } else {
        Alert.alert('Error', 'No ID token received from Google');
        setIsLoading(false);
      }
    } else if (response?.type === 'error') {
      console.error('Google auth error:', response.error);
      Alert.alert('Authentication Error', response.error?.message || 'Google sign in failed');
      setIsLoading(false);
    } else if (response?.type === 'cancel' || response?.type === 'dismiss') {
      setIsLoading(false);
    }
  }, [response]);

  const handleRealGoogleSignIn = async () => {
    if (isExpoGo) {
      Alert.alert(
        'Expo Go Limitation',
        'Google Sign-In requires a development build.\n\nUse the "Simulate Login" buttons below for testing, or run:\nnpx expo run:android',
      );
      return;
    }
    setIsLoading(true);
    try {
      await promptAsync();
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      Alert.alert('Error', 'Could not start Google Sign-In: ' + error.message);
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async (token: string) => {
    try {
      const result = await loginWithGoogle(token);
      if (result.success) {
        router.replace('/(tabs)');
      } else {
        Alert.alert('Login Failed', 'Could not authenticate with server');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Login Error', error.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenPrivacyPolicy = async () => {
    try {
      await WebBrowser.openBrowserAsync('https://rozzi.vercel.app/privacy-policy');
    } catch (error) {
      console.error('Failed to open privacy policy:', error);
      Alert.alert('Error', 'Could not open privacy policy link.');
    }
  };

  if (!fontsLoaded) return null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="briefcase" size={48} color="#6b46c1" />
          </View>
          <Text style={styles.title}>Welcome To Rozzi</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        {/* Google Sign-In Button */}
        <TouchableOpacity
          style={[styles.googleButton, (!request || isLoading) && styles.disabledButton]}
          onPress={handleRealGoogleSignIn}
          disabled={!request || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="logo-google" size={24} color="#fff" style={styles.icon} />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {!request && (
          <Text style={styles.loadingText}>Initializing Google Sign-In...</Text>
        )}

        {/* Disclaimer / Terms Link */}
        <Text style={styles.disclaimerText}>
          By continuing, you agree to our{' '}
          <Text style={styles.linkText} onPress={handleOpenPrivacyPolicy}>
            Terms of Service & Privacy Policy
          </Text>
        </Text>

        {/* Mock Login Buttons for Testing (only in development) */}
        {__DEV__ && (
          <>
            <View style={styles.devDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>DEV ONLY</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.mockButton, isLoading && styles.disabledButton]}
              onPress={() => {
                setIsLoading(true);
                handleGoogleLogin(`mock_token_${Date.now()}`);
              }}
              disabled={isLoading}
            >
              <Ionicons name="flask-outline" size={24} color="#6b46c1" style={styles.icon} />
              <Text style={styles.mockButtonText}>Simulate Login (New User)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mockButton, isLoading && styles.disabledButton]}
              onPress={() => {
                setIsLoading(true);
                handleGoogleLogin(`mock_token_existing_${Date.now()}`);
              }}
              disabled={isLoading}
            >
              <Ionicons name="flask-outline" size={24} color="#6b46c1" style={styles.icon} />
              <Text style={styles.mockButtonText}>Simulate Login (Existing)</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#B0AAD9' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 48 },
  logoContainer: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 24, padding: 20, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6 },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6b7280' },
  googleButton: { flexDirection: 'row', backgroundColor: '#DB4437', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 32, alignItems: 'center', width: '100%', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  disabledButton: { opacity: 0.5 },
  icon: { marginRight: 12 },
  googleButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loadingText: { marginTop: 16, color: '#6b7280', fontSize: 12 },
  devDivider: { flexDirection: 'row', alignItems: 'center', marginTop: 32, marginBottom: 16, width: '100%' },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.1)' },
  dividerText: { marginHorizontal: 12, color: '#6b7280', fontSize: 12, fontWeight: '600' },
  mockButton: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24, alignItems: 'center', width: '100%', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2, marginTop: 12 },
  mockButtonText: { color: '#6b46c1', fontSize: 14, fontWeight: '600' },
  disclaimerText: {
    marginTop: 20,
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  linkText: {
    color: '#6b46c1',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
