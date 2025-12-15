import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCustomFonts } from '@/hooks/fonts';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import API from '@/utils/api';

const { width, height } = Dimensions.get('window');

interface SignupForm {
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  password: string;
  password2: string;
}

type PasswordStrength = 'weak' | 'medium' | 'strong';

export default function SignupScreen() {
  const [fontsLoaded] = useCustomFonts();
  const { signup } = useAuth();
  
  const [formData, setFormData] = useState<SignupForm>({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    password: '',
    password2: '',
  });
  const [errors, setErrors] = useState<Partial<SignupForm>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>('weak');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);

  // Refs for auto-focus
  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const usernameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  if (!fontsLoaded) {
    return null;
  }

  // Auto-focus on first field when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      firstNameRef.current?.focus();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Check password strength
  const checkPasswordStrength = (password: string): PasswordStrength => {
    if (password.length < 6) return 'weak';
    
    let score = 0;
    if (password.length >= 6) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    if (score <= 2) return 'weak';
    if (score <= 3) return 'medium';
    return 'strong';
  };

  // Proper username availability check
  const checkUsernameAvailability = async (username: string) => {
    if (username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setIsCheckingUsername(true);
    try {
      // Check if username contains only valid characters
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        setUsernameAvailable(false);
        return;
      }

      // For now, we'll use a simple check against common usernames
      // In a real app, you'd have a backend endpoint for this
      const commonUsernames = ['admin', 'test', 'user', 'demo', 'rahul', 'john', 'jane'];
      const isAvailable = !commonUsernames.includes(username.toLowerCase());
      
      setUsernameAvailable(isAvailable);
    } catch (error: any) {
      console.error('Error checking username availability:', error);
      setUsernameAvailable(null);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  // Debounced username check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.username.trim()) {
        checkUsernameAvailability(formData.username);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.username]);

  // Update password strength when password changes
  useEffect(() => {
    setPasswordStrength(checkPasswordStrength(formData.password));
  }, [formData.password]);

  const getPasswordStrengthColor = (strength: PasswordStrength) => {
    switch (strength) {
      case 'weak': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'strong': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getPasswordStrengthText = (strength: PasswordStrength) => {
    switch (strength) {
      case 'weak': return 'Weak';
      case 'medium': return 'Medium';
      case 'strong': return 'Strong';
      default: return '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<SignupForm> = {};

    // Full Name validation
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    } else if (formData.first_name.trim().length < 2) {
      newErrors.first_name = 'First name must be at least 2 characters';
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    } else if (formData.last_name.trim().length < 2) {
      newErrors.last_name = 'Last name must be at least 2 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    } else if (usernameAvailable === false) {
      newErrors.username = 'Username is already taken';
    }

    // Password validation
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm Password validation
    if (!formData.password2.trim()) {
      newErrors.password2 = 'Please confirm your password';
    } else if (formData.password !== formData.password2) {
      newErrors.password2 = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof SignupForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    // Check if user is blocked
    if (isBlocked) {
      Alert.alert('Account Temporarily Blocked', 'Too many failed attempts. Please try again later.');
      return;
    }

    setIsLoading(true);
    setErrors({});
    // Clear username availability status during signup attempt
    setUsernameAvailable(null);

    try {
      console.log('Attempting to register user:', formData);
      
      const success = await signup(formData.first_name, formData.last_name, formData.email, formData.username, formData.password, formData.password2);
      
      if (success) {
        // Reset failed attempts on success
        setFailedAttempts(0);
        
        Alert.alert('Success', 'Account created successfully! Please login.', [
          {
            text: 'OK',
            onPress: () => router.replace('/login'),
          },
        ]);
      } else {
        // Handle signup failure
        setErrors({
          username: 'Signup failed. Please check your information and try again.',
        });
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      
      // Increment failed attempts
      const newFailedAttempts = failedAttempts + 1;
      setFailedAttempts(newFailedAttempts);
      
      // Block user after 3 failed attempts
      if (newFailedAttempts >= 3) {
        setIsBlocked(true);
        setTimeout(() => {
          setIsBlocked(false);
          setFailedAttempts(0);
        }, 30000); // 30 seconds
      }
      
      // Handle validation errors
      if (error.response?.data) {
        const errorData = error.response.data;
        const newErrors: Partial<SignupForm> = {};
        
        if (errorData.username) {
          newErrors.username = Array.isArray(errorData.username) ? errorData.username[0] : errorData.username;
        }
        if (errorData.email) {
          newErrors.email = Array.isArray(errorData.email) ? errorData.email[0] : errorData.email;
        }
        if (errorData.password) {
          newErrors.password = Array.isArray(errorData.password) ? errorData.password[0] : errorData.password;
        }
        if (errorData.password2) {
          newErrors.password2 = Array.isArray(errorData.password2) ? errorData.password2[0] : errorData.password2;
        }
        if (errorData.first_name) {
          newErrors.first_name = Array.isArray(errorData.first_name) ? errorData.first_name[0] : errorData.first_name;
        }
        if (errorData.last_name) {
          newErrors.last_name = Array.isArray(errorData.last_name) ? errorData.last_name[0] : errorData.last_name;
        }
        
        setErrors(newErrors);
      } else if (error.request) {
        // Network error - backend might not be running
        setErrors({
          username: 'Network error: Backend server might not be running. Please try again.',
        });
      } else {
        setErrors({
          username: 'Signup failed. Please try again.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    router.push('/login');
  };

  const handleNextField = (nextRef: React.RefObject<TextInput | null>) => {
    nextRef.current?.focus();
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleLogin}
          >
            <Ionicons name="arrow-back" size={24} color="#6b46c1" />
          </TouchableOpacity>
          <View style={styles.logoContainer}>
            <Ionicons name="person-add" size={48} color="#6b46c1" />
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join us and start your journey</Text>
        </View>

        {/* Signup Form */}
        <View style={styles.formContainer}>
          {/* First Name Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>First Name</Text>
            <View style={[styles.inputContainer, errors.first_name && styles.inputError]}>
              <Ionicons name="person-outline" size={20} color="#9ca3af" />
              <TextInput
                ref={firstNameRef}
                style={styles.textInput}
                placeholder="Enter your first name"
                placeholderTextColor="#9ca3af"
                value={formData.first_name}
                onChangeText={(value) => handleInputChange('first_name', value)}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => handleNextField(lastNameRef)}
              />
            </View>
            {errors.first_name && (
              <Text style={styles.errorText}>{errors.first_name}</Text>
            )}
          </View>

          {/* Last Name Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Last Name</Text>
            <View style={[styles.inputContainer, errors.last_name && styles.inputError]}>
              <Ionicons name="person-outline" size={20} color="#9ca3af" />
              <TextInput
                ref={lastNameRef}
                style={styles.textInput}
                placeholder="Enter your last name"
                placeholderTextColor="#9ca3af"
                value={formData.last_name}
                onChangeText={(value) => handleInputChange('last_name', value)}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => handleNextField(emailRef)}
              />
            </View>
            {errors.last_name && (
              <Text style={styles.errorText}>{errors.last_name}</Text>
            )}
          </View>

          {/* Email Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={[styles.inputContainer, errors.email && styles.inputError]}>
              <Ionicons name="mail-outline" size={20} color="#9ca3af" />
              <TextInput
                ref={emailRef}
                style={styles.textInput}
                placeholder="Enter your email address"
                placeholderTextColor="#9ca3af"
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={() => handleNextField(usernameRef)}
              />
            </View>
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </View>

          {/* Username Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Username</Text>
            <View style={[styles.inputContainer, errors.username && styles.inputError]}>
              <Ionicons name="at-outline" size={20} color="#9ca3af" />
              <TextInput
                ref={usernameRef}
                style={styles.textInput}
                placeholder="Choose a username"
                placeholderTextColor="#9ca3af"
                value={formData.username}
                onChangeText={(value) => handleInputChange('username', value)}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => handleNextField(passwordRef)}
              />
              {isCheckingUsername && (
                <ActivityIndicator size="small" color="#6b46c1" />
              )}
              {usernameAvailable === true && formData.username.length >= 3 && !errors.username && (
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              )}
              {usernameAvailable === false && formData.username.length >= 3 && (
                <Ionicons name="close-circle" size={20} color="#ef4444" />
              )}
            </View>
            {errors.username && (
              <Text style={styles.errorText}>{errors.username}</Text>
            )}
            {usernameAvailable === true && formData.username.length >= 3 && !errors.username && (
              <Text style={styles.successText}>✓ Username is available</Text>
            )}
            {usernameAvailable === false && formData.username.length >= 3 && (
              <Text style={styles.errorText}>✗ Username is already taken</Text>
            )}
          </View>

          {/* Password Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={[styles.inputContainer, errors.password && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" />
              <TextInput
                ref={passwordRef}
                style={styles.textInput}
                placeholder="Create a password"
                placeholderTextColor="#9ca3af"
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => handleNextField(confirmPasswordRef)}
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
            {/* Password Strength Indicator */}
            {formData.password.length > 0 && (
              <View style={styles.passwordStrengthContainer}>
                <View style={styles.passwordStrengthBar}>
                  <View 
                    style={[
                      styles.passwordStrengthFill, 
                      { 
                        width: passwordStrength === 'weak' ? '33%' : 
                               passwordStrength === 'medium' ? '66%' : '100%',
                        backgroundColor: getPasswordStrengthColor(passwordStrength)
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.passwordStrengthText, { color: getPasswordStrengthColor(passwordStrength) }]}>
                  {getPasswordStrengthText(passwordStrength)}
                </Text>
              </View>
            )}
            {errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}
          </View>

          {/* Confirm Password Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <View style={[styles.inputContainer, errors.password2 && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" />
              <TextInput
                ref={confirmPasswordRef}
                style={styles.textInput}
                placeholder="Confirm your password"
                placeholderTextColor="#9ca3af"
                value={formData.password2}
                onChangeText={(value) => handleInputChange('password2', value)}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSignup}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons 
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} 
                  size={20} 
                  color="#9ca3af" 
                />
              </TouchableOpacity>
            </View>
            {errors.password2 && (
              <Text style={styles.errorText}>{errors.password2}</Text>
            )}
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity
            style={[
              styles.signupButton, 
              (isLoading || isBlocked) && styles.signupButtonDisabled
            ]}
            onPress={handleSignup}
            disabled={isLoading || isBlocked}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.signupButtonText}>
                {isBlocked ? 'Please Wait...' : 'Sign Up'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={handleLogin}>
              <Text style={styles.loginLink}>Log in</Text>
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
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    padding: 8,
    zIndex: 1,
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
  successText: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 4,
  },
  passwordStrengthContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordStrengthBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: 3,
  },
  passwordStrengthText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '600',
  },
  signupButton: {
    backgroundColor: '#6b46c1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#6b46c1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 8,
  },
  signupButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
    elevation: 0,
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  loginText: {
    fontSize: 14,
    color: '#6b7280',
  },
  loginLink: {
    fontSize: 14,
    color: '#6b46c1',
    fontWeight: '600',
  },

});

