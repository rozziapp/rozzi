import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router, usePathname, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BackHandler, Platform, LogBox, View, ActivityIndicator, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { ChatProvider } from '@/contexts/ChatContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { initializeAppConnectivity } from '@/utils/startupConnectivity';
import { AppThemeProvider, useAppTheme } from '@/contexts/ThemeContext';
import { setAlertListener } from '@/utils/Alert';

// Suppress React Native Web specific deprecation warnings
// These are web-only warnings that don't affect native iOS/Android functionality
if (Platform.OS === 'web') {
  // Filter console warnings for web-specific deprecation notices
  const originalWarn = console.warn;
  console.warn = (...args) => {
    const message = args[0];
    if (typeof message === 'string') {
      // Suppress shadow and pointerEvents deprecation warnings (web-only)
      if (
        message.includes('shadow') && message.includes('deprecated') ||
        message.includes('pointerEvents') && message.includes('deprecated') ||
        message.includes('textShadow') && message.includes('deprecated')
      ) {
        return; // Suppress this warning
      }
    }
    originalWarn.apply(console, args);
  };
}

// Also suppress in LogBox for mobile (in case any slip through)
LogBox.ignoreLogs([
  'shadow',
  'pointerEvents is deprecated',
  'textShadow',
]);

// ─── Auth Gate Component ───────────────────────────────────────────────
// This prevents ANY protected screen from rendering before auth is resolved.
// Without this, expo-router immediately renders (tabs)/index which fires
// API calls before we know if the user is logged in.
function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return; // Still checking auth — do nothing yet

    const inAuthGroup = segments[0] === 'login';

    if (!isAuthenticated && !inAuthGroup) {
      // Not logged in and trying to access a protected screen → redirect to login
      console.log('🔒 Auth gate: not authenticated, redirecting to login');
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, user, segments]);

  // While auth is loading, show a branded splash screen
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#B0AAD9', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={{ marginTop: 16, color: '#fff', fontSize: 16, fontWeight: '600' }}>Loading...</Text>
      </View>
    );
  }

  return <>{children}</>;
}

// ─── Inner Layout (uses auth context) ──────────────────────────────────
function InnerLayout() {
  const { colorScheme, colors } = useAppTheme();
  const pathname = usePathname();

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    buttons?: any[];
  }>({
    visible: false,
    title: '',
  });

  useEffect(() => {
    setAlertListener((config: any) => {
      setAlertConfig({
        visible: true,
        title: config.title,
        message: config.message,
        buttons: config.buttons,
      });
    });
    return () => {
      setAlertListener(null);
    };
  }, []);

  const buttons = alertConfig.buttons && alertConfig.buttons.length > 0
    ? alertConfig.buttons
    : [{ text: 'OK', onPress: () => {} }];

  const handleButtonPress = (btnOnPress?: () => void) => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
    if (btnOnPress) {
      btnOnPress();
    }
  };

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
        router.back();
        return true;
      }

      if (pathname.includes('user-profile')) {
        router.back();
        return true;
      }

      if (pathname.includes('applied-jobs')) {
        router.back();
        return true;
      }

      if (pathname.includes('posted-jobs')) {
        router.back();
        return true;
      }

      if (pathname.includes('resume')) {
        router.back();
        return true;
      }

      if (pathname.includes('subscription')) {
        router.back();
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

  // Route-aware status bar — post, chat, find-users get light bg, everything else depends on theme
  const isLightPage = 
    pathname?.includes('chat') || 
    pathname?.includes('find-users');
    
  // If it's a specific page, respect its background color, otherwise use the global theme's brandBackground
  const statusBarColor = isLightPage ? colors.background : colors.brandBackground;
  
  // Choose status bar content based on the background color and theme
  // Dark theme usually requires light content status bar, and vice-versa
  const statusBarStyle = colorScheme === 'dark' ? 'light' : 'dark';

  // ChatProvider/NotificationProvider are always mounted to keep the
  // component tree shape stable (prevents remount on auth state change).
  // They already guard their API calls with isAuthenticated checks internally.
  return (
    <ChatProvider>
      <NotificationProvider>
        <Stack
          screenOptions={{
            animation: 'default',
            gestureEnabled: true,
            gestureDirection: 'horizontal',
            headerShown: false,
            contentStyle: { backgroundColor: colors.brandBackground },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="choose-username" options={{ headerShown: false }} />
          <Stack.Screen name="my-profile" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
          <Stack.Screen name="blocked-users" options={{ headerShown: false }} />
          <Stack.Screen name="permissions" options={{ headerShown: false }} />
          <Stack.Screen name="faqs" options={{ headerShown: false }} />
          <Stack.Screen name="contact-support" options={{ headerShown: false }} />
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
          <Stack.Screen name="conversations" options={{ headerShown: false }} />
          <Stack.Screen name="find-users" options={{ headerShown: false }} />

          <Stack.Screen name="+not-found" />
        </Stack>
        
        {/* Global Custom Themed Alert Modal */}
        <Modal
          visible={alertConfig.visible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
        >
          <View style={alertStyles.overlay}>
            <View style={[alertStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[
                alertStyles.iconBg,
                { backgroundColor: colorScheme === 'dark' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(107, 70, 193, 0.08)' }
              ]}>
                <Ionicons 
                  name={getAlertIconName(alertConfig.title, alertConfig.message) as any} 
                  size={38} 
                  color={getAlertIconColor(alertConfig.title, alertConfig.message, colors)} 
                />
              </View>

              <Text style={[alertStyles.title, { color: colors.text }]}>{alertConfig.title}</Text>
              {alertConfig.message ? (
                <Text style={[alertStyles.message, { color: colors.textSecondary }]}>{alertConfig.message}</Text>
              ) : null}

              <View style={[
                alertStyles.buttonsContainer,
                buttons.length > 2 && { flexDirection: 'column' }
              ]}>
                {buttons.map((btn, index) => {
                  const isDestructive = btn.style === 'destructive';
                  const isCancel = btn.style === 'cancel';
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        alertStyles.button,
                        isDestructive && alertStyles.buttonDestructive,
                        isCancel && [alertStyles.buttonCancel, { borderColor: colors.border }],
                        !isDestructive && !isCancel && [alertStyles.buttonPrimary, { backgroundColor: colors.primary }],
                        buttons.length > 2 && { width: '100%', marginBottom: 8 }
                      ]}
                      onPress={() => handleButtonPress(btn.onPress)}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        alertStyles.buttonText,
                        isCancel && { color: colors.textSecondary },
                        !isCancel && { color: '#ffffff' }
                      ]}>
                        {btn.text || 'OK'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>

        <StatusBar
          style={statusBarStyle as any}
          backgroundColor={statusBarColor}
          animated={true}
        />
      </NotificationProvider>
    </ChatProvider>
  );
}

import { SafeAreaProvider } from 'react-native-safe-area-context';

// ─── Root Layout ───────────────────────────────────────────────────────
export default function RootLayout() {
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

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  // We wrap the rest in a component that consumes ThemeContext
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppThemeProvider>
          <ThemeAwareRoot />
        </AppThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ThemeAwareRoot() {
  const { colorScheme, colors } = useAppTheme();
  
  const customTheme = {
    ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(colorScheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.brandBackground,
    },
  };

  return (
    <ThemeProvider value={customTheme}>
      <View style={{ flex: 1, backgroundColor: colors.brandBackground }}>
        <ErrorBoundary>
          <AuthProvider>
            <AuthGate>
              <InnerLayout />
            </AuthGate>
          </AuthProvider>
        </ErrorBoundary>
      </View>
    </ThemeProvider>
  );
}

function getAlertIconName(title: string, message?: string): string {
  const combined = `${title} ${message || ''}`.toLowerCase();
  if (combined.includes('success') || combined.includes('activated') || combined.includes('saved') || combined.includes('completed')) {
    return 'checkmark-circle';
  }
  if (combined.includes('error') || combined.includes('failed') || combined.includes('invalid') || combined.includes('missing') || combined.includes('limit') || combined.includes('warning') || combined.includes('cannot')) {
    return 'warning';
  }
  return 'information-circle';
}

function getAlertIconColor(title: string, message: string | undefined, colors: any): string {
  const combined = `${title} ${message || ''}`.toLowerCase();
  if (combined.includes('success') || combined.includes('activated') || combined.includes('saved') || combined.includes('completed')) {
    return colors.success;
  }
  if (combined.includes('error') || combined.includes('failed') || combined.includes('invalid') || combined.includes('missing') || combined.includes('limit') || combined.includes('warning') || combined.includes('cannot')) {
    return '#ef4444';
  }
  return colors.primary;
}

const alertStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: 24,
    padding: 24,
    width: '85%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
  },
  iconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    // backgroundColor assigned dynamically
  },
  buttonCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  buttonDestructive: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
