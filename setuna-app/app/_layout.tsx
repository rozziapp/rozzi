import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BackHandler, Platform } from 'react-native';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { ChatProvider } from '@/contexts/ChatContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { initializeAppConnectivity } from '@/utils/startupConnectivity';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Initialize connectivity on app startup
  useEffect(() => {
    const initConnectivity = async () => {
      try {
        console.log('🚀 Initializing app connectivity...');
        const isConnected = await initializeAppConnectivity();

        if (isConnected) {
          console.log('✅ App connectivity initialized successfully');
        } else {
          console.log('⚠️ App connectivity initialization failed - some features may be limited');
        }
      } catch (error) {
        console.error('❌ Failed to initialize connectivity:', error);
      }
    };

    initConnectivity();
  }, []);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      // Root tab screens - prevent app exit, minimize instead
      if (pathname === '/(tabs)' || pathname === '/' || pathname.includes('index')) {
        if (Platform.OS === 'android') {
          // Minimize app instead of exiting
          BackHandler.exitApp();
          return true;
        }
        // On iOS, do nothing (natural behavior)
        return true;
      }

      // Nested screens - navigate back properly
      if (pathname.includes('my-profile')) {
        router.replace('/(tabs)');
        return true;
      }

      if (pathname.includes('user-profile')) {
        router.back();
        return true;
      }

      if (pathname.includes('applied-jobs')) {
        router.replace('/my-profile');
        return true;
      }

      if (pathname.includes('posted-jobs')) {
        router.replace('/my-profile');
        return true;
      }

      if (pathname.includes('resume')) {
        router.replace('/my-profile');
        return true;
      }

      if (pathname.includes('subscription')) {
        router.replace('/my-profile');
        return true;
      }



      // Removed the job-seeking redirect to allow the screen to be accessed

      if (pathname.includes('post')) {
        router.replace('/(tabs)');
        return true;
      }

      // Default fallback - go back
      router.back();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [pathname]);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  // Use a single consistent status bar color across the app
  const statusBarColor = '#B0AAD9';

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <ErrorBoundary>
        <AuthProvider>
          <ChatProvider>
            <NotificationProvider>
              <Stack
                screenOptions={{
                  animation: 'default',
                  gestureEnabled: true,
                  gestureDirection: 'horizontal',
                  headerShown: false,
                }}
              >
                <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none' }} />
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="signup" options={{ headerShown: false }} />
                <Stack.Screen name="my-profile" options={{ headerShown: false, animation: 'none' }} />
                <Stack.Screen name="settings" options={{ headerShown: false }} />
                <Stack.Screen name="notifications" options={{ headerShown: false }} />
                <Stack.Screen name="blocked-users" options={{ headerShown: false }} />
                <Stack.Screen name="permissions" options={{ headerShown: false }} />
                <Stack.Screen name="faqs" options={{ headerShown: false }} />
                <Stack.Screen name="contact-support" options={{ headerShown: false }} />
                <Stack.Screen name="post" options={{ headerShown: false }} />
                <Stack.Screen name="report-bug" options={{ headerShown: false }} />
                <Stack.Screen name="terms-of-service" options={{ headerShown: false }} />
                <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
                <Stack.Screen name="user-profile" options={{ headerShown: false }} />
                <Stack.Screen name="applied-jobs" options={{ headerShown: false }} />
                <Stack.Screen name="posted-jobs" options={{ headerShown: false }} />
                <Stack.Screen name="resume" options={{ headerShown: false }} />
                <Stack.Screen name="subscription" options={{ headerShown: false }} />
                <Stack.Screen name="job-seeking" options={{ headerShown: false }} />
                <Stack.Screen name="chat" options={{ headerShown: false }} />
                <Stack.Screen name="job-details" options={{ headerShown: false }} />
                <Stack.Screen name="job-application" options={{ headerShown: false }} />
                <Stack.Screen name="manage-email-phone" options={{ headerShown: false }} />
                <Stack.Screen name="change-password" options={{ headerShown: false }} />

                <Stack.Screen name="+not-found" />
              </Stack>
              <StatusBar
                style="light"
                backgroundColor={statusBarColor}
                animated={false}
              />
            </NotificationProvider>
          </ChatProvider>
        </AuthProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
