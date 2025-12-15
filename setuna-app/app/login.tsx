import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCustomFonts } from '@/hooks/fonts';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

interface LoginForm {
  username: string;
  password: string;
}

export default function LoginScreen() {
  const [fontsLoaded] = useCustomFonts();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState<LoginForm>({
    username: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<LoginForm>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Handle Android back button to minimize app instead of navigation
  useEffect(() => {
    const backAction = () => {
      if (Platform.OS === 'android') {
        BackHandler.exitApp(); // Minimize the app
        return true; // Prevent default back navigation
      }
      return false; // Allow default behavior on other platforms
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginForm> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username/Email/Phone is required';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof LoginForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const success = await login(formData.username, formData.password);
      
      if (success) {
        // Redirect is now handled in AuthContext
        console.log('Login successful, redirecting...');
      } else {
        setErrors({
          username: 'Invalid credentials. Please check your email/username and password.',
        });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.non_field_errors?.[0] || 
                          'Login failed. Please check your credentials.';
      
      setErrors({
        username: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Forgot Password',
      'A password reset link will be sent to your email address.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send Reset Link', onPress: () => {
          Alert.alert('Reset Link Sent', 'Check your email for password reset instructions.');
        }},
      ]
    );
  };

  const handleSignup = () => {
    router.push('/signup');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="briefcase" size={48} color="#6b46c1" />
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your account to continue</Text>
        </View>

        {/* Login Form */}
        <View style={styles.formContainer}>
          {/* Email/Username Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email or Username</Text>
            <View style={[styles.inputContainer, errors.username && styles.inputError]}>
              <Ionicons name="person-outline" size={20} color="#9ca3af" />
              <TextInput
                style={styles.textInput}
                placeholder="Enter your email or username"
                placeholderTextColor="#9ca3af"
                value={formData.username}
                onChangeText={(value) => handleInputChange('username', value)}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
            </View>
            {errors.username && (
              <Text style={styles.errorText}>{errors.username}</Text>
            )}
          </View>

          {/* Password Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={[styles.inputContainer, errors.password && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" />
              <TextInput
                style={styles.textInput}
                placeholder="Enter your password"
                placeholderTextColor="#9ca3af"
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                  size={20} 
                  color="#9ca3af" 
                />
              </TouchableOpacity>
            </View>
            {errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}
          </View>

          {/* Forgot Password Link */}
          <TouchableOpacity style={styles.forgotPasswordLink} onPress={handleForgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={handleSignup}>
              <Text style={styles.signupLink}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#B0AAD9',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.2)',
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  textInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#111827',
  },
  passwordToggle: {
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#6b46c1',
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#6b46c1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#6b46c1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  signupText: {
    fontSize: 14,
    color: '#6b7280',
  },
  signupLink: {
    fontSize: 14,
    color: '#6b46c1',
    fontWeight: '600',
  },
});

