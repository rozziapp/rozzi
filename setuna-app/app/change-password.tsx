import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCustomFonts } from '@/hooks/fonts';
import { router } from 'expo-router';
import { useBackHandler } from '@/hooks/useBackHandler';

export default function ChangePasswordScreen() {
  const [fontsLoaded] = useCustomFonts();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Handle back button
  useBackHandler({
    targetRoute: '/settings'
  });

  if (!fontsLoaded) {
    return null;
  }

  const validatePassword = (password: string) => {
    const minLength = 6;
    
    return {
      isValid: password.length >= minLength,
      errors: {
        length: password.length >= minLength,
      }
    };
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New password and confirm password do not match');
      return;
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement API call to change password
      // await changePassword(currentPassword, newPassword);
      
      Alert.alert(
        'Success',
        'Your password has been changed successfully',
        [
          {
            text: 'OK',
            onPress: () => {
              // Clear form and go back
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
              router.back();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error changing password:', error);
      Alert.alert('Error', 'Failed to change password. Please check your current password and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordValidation = validatePassword(newPassword);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          {/* Current Password Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Password</Text>
            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <Ionicons name="lock-closed-outline" size={20} color="#6b46c1" />
              </View>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter your current password"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showCurrentPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                <Ionicons 
                  name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'} 
                  size={20} 
                  color="#6b7280" 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* New Password Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>New Password</Text>
            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <Ionicons name="lock-open-outline" size={20} color="#6b46c1" />
              </View>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter your new password"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                <Ionicons 
                  name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} 
                  size={20} 
                  color="#6b7280" 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Confirm New Password</Text>
            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <Ionicons name="lock-open-outline" size={20} color="#6b46c1" />
              </View>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your new password"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons 
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} 
                  size={20} 
                  color="#6b7280" 
                />
              </TouchableOpacity>
            </View>
            
            {confirmPassword.length > 0 && (
              <View style={styles.matchIndicator}>
                <Ionicons 
                  name={newPassword === confirmPassword ? 'checkmark-circle' : 'close-circle'} 
                  size={16} 
                  color={newPassword === confirmPassword ? '#059669' : '#dc2626'} 
                />
                <Text style={[
                  styles.matchText, 
                  newPassword === confirmPassword && styles.matchTextSuccess
                ]}>
                  {newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                </Text>
              </View>
            )}
          </View>

          {/* Change Password Button */}
          <TouchableOpacity
            style={[
              styles.changeButton, 
              (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim() || !passwordValidation.isValid || newPassword !== confirmPassword) && styles.disabledButton
            ]}
            onPress={handleChangePassword}
            disabled={!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim() || !passwordValidation.isValid || newPassword !== confirmPassword || isLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.changeButtonText}>
              {isLoading ? 'Changing Password...' : 'Change Password'}
            </Text>
          </TouchableOpacity>

          {/* Security Note */}
          <View style={styles.securityNote}>
            <View style={styles.securityIcon}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#059669" />
            </View>
            <View style={styles.securityText}>
              <Text style={styles.securityTitle}>Security Reminder</Text>
              <Text style={styles.securityDescription}>
                Choose a strong password that you don't use elsewhere. After changing your password, you'll need to log in again on all devices.
              </Text>
            </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#B0AAD9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerBackButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  content: {
    paddingTop: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  inputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  eyeButton: {
    padding: 4,
  },

  matchIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  matchText: {
    fontSize: 13,
    color: '#dc2626',
    marginLeft: 8,
  },
  matchTextSuccess: {
    color: '#059669',
  },
  changeButton: {
    backgroundColor: '#6b46c1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  changeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  securityNote: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  securityIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  securityText: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 4,
  },
  securityDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
});

