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
import { useAuth } from '@/contexts/AuthContext';

export default function ManageEmailPhoneScreen() {
  const [fontsLoaded] = useCustomFonts();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Handle back button
  useBackHandler({
    targetRoute: '/settings'
  });

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  if (!fontsLoaded) {
    return null;
  }

  const handleSave = async () => {
    if (!email.trim() || !phone.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement API call to update email and phone
      // await updateUserProfile({ email, phone });
      
      Alert.alert(
        'Success',
        'Your contact information has been updated successfully',
        [
          {
            text: 'OK',
            onPress: () => {
              setIsEditing(false);
              setIsLoading(false);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error updating contact info:', error);
      Alert.alert('Error', 'Failed to update contact information. Please try again.');
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (isEditing) {
      // Reset to original values
      if (user) {
        setEmail(user.email || '');
        setPhone(user.phone || '');
      }
      setIsEditing(false);
    } else {
      router.back();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={handleCancel}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Information</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setIsEditing(!isEditing)}
        >
          <Text style={styles.editButtonText}>
            {isEditing ? 'Cancel' : 'Edit'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          {/* Email Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Email Address</Text>
            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <Ionicons name="mail-outline" size={20} color="#6b46c1" />
              </View>
              <TextInput
                style={[styles.input, !isEditing && styles.disabledInput]}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email address"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={isEditing}
              />
            </View>
            <Text style={styles.helpText}>
              This email will be used for account notifications and login
            </Text>
          </View>

          {/* Phone Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Phone Number</Text>
            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <Ionicons name="call-outline" size={20} color="#6b46c1" />
              </View>
              <TextInput
                style={[styles.input, !isEditing && styles.disabledInput]}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter your phone number"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                editable={isEditing}
              />
            </View>
            <Text style={styles.helpText}>
              This phone number will be used for account verification
            </Text>
          </View>

          {/* Save Button */}
          {isEditing && (
            <TouchableOpacity
              style={[styles.saveButton, isLoading && styles.disabledButton]}
              onPress={handleSave}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.saveButtonText}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Security Note */}
          <View style={styles.securityNote}>
            <View style={styles.securityIcon}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#059669" />
            </View>
            <View style={styles.securityText}>
              <Text style={styles.securityTitle}>Security Note</Text>
              <Text style={styles.securityDescription}>
                Your contact information is encrypted and secure. We will never share your personal details with third parties.
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
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b46c1',
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
  disabledInput: {
    color: '#6b7280',
  },
  helpText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  saveButton: {
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
  saveButtonText: {
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

