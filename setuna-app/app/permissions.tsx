import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCustomFonts } from '@/hooks/fonts';
import { router } from 'expo-router';
import { useBackHandler } from '@/hooks/useBackHandler';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Permission {
  id: string;
  title: string;
  description: string;
  icon: string;
  isEnabled: boolean;
  isRequired: boolean;
  category: 'location' | 'camera' | 'microphone' | 'storage' | 'contacts' | 'notifications';
  status: 'granted' | 'denied' | 'undetermined' | 'restricted';
}

export default function PermissionsScreen() {
  const [fontsLoaded] = useCustomFonts();
  const [permissions, setPermissions] = useState<Permission[]>([
    {
      id: 'location',
      title: 'Location',
      description: 'Access your location for job recommendations and nearby opportunities',
      icon: 'location-outline',
      isEnabled: false,
      isRequired: false,
      category: 'location',
      status: 'undetermined'
    },
    {
      id: 'camera',
      title: 'Camera',
      description: 'Take photos for your profile and job applications',
      icon: 'camera-outline',
      isEnabled: false,
      isRequired: false,
      category: 'camera',
      status: 'undetermined'
    },
    {
      id: 'microphone',
      title: 'Microphone',
      description: 'Record voice messages and video calls',
      icon: 'mic-outline',
      isEnabled: false,
      isRequired: false,
      category: 'microphone',
      status: 'undetermined'
    },
    {
      id: 'storage',
      title: 'Storage',
      description: 'Save and access files, photos, and documents',
      icon: 'folder-outline',
      isEnabled: false,
      isRequired: false,
      category: 'storage',
      status: 'undetermined'
    },
    {
      id: 'contacts',
      title: 'Contacts',
      description: 'Find and connect with people you know',
      icon: 'people-outline',
      isEnabled: false,
      isRequired: false,
      category: 'contacts',
      status: 'undetermined'
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Receive important updates and alerts',
      icon: 'notifications-outline',
      isEnabled: true,
      isRequired: true,
      category: 'notifications',
      status: 'granted'
    }
  ]);

  // Handle back button
  useBackHandler({
    targetRoute: '/settings'
  });

  useEffect(() => {
    loadPermissions();
    checkCurrentPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      const savedPermissions = await AsyncStorage.getItem('appPermissions');
      if (savedPermissions) {
        const parsed = JSON.parse(savedPermissions);
        setPermissions(prev => prev.map(perm => ({
          ...perm,
          isEnabled: parsed[perm.id]?.isEnabled ?? perm.isEnabled
        })));
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  };

  const savePermissions = async (newPermissions: Permission[]) => {
    try {
      const permissionsToSave = newPermissions.reduce((acc, perm) => {
        acc[perm.id] = { isEnabled: perm.isEnabled };
        return acc;
      }, {} as Record<string, { isEnabled: boolean }>);
      
      await AsyncStorage.setItem('appPermissions', JSON.stringify(permissionsToSave));
    } catch (error) {
      console.error('Error saving permissions:', error);
    }
  };

  const checkCurrentPermissions = async () => {
    // Simulate checking current permissions
    // In a real app, you would check actual device permissions here
    console.log('Checking current permissions...');
  };

  const updatePermissionStatus = (permissionId: string, status: 'granted' | 'denied' | 'undetermined' | 'restricted') => {
    setPermissions(prev => prev.map(perm => 
      perm.id === permissionId 
        ? { ...perm, status: status, isEnabled: status === 'granted' }
        : perm
    ));
  };

  const handlePermissionToggle = async (permissionId: string, value: boolean) => {
    const permission = permissions.find(p => p.id === permissionId);
    if (!permission) return;

    if (permission.isRequired && !value) {
      Alert.alert(
        'Permission Required',
        'This permission is required for the app to function properly.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (value) {
      // Request permission
      const granted = await requestPermission(permission);
      if (granted) {
        const newPermissions: Permission[] = permissions.map(p =>
          p.id === permissionId ? { ...p, isEnabled: true, status: 'granted' as const } : p
        );
        setPermissions(newPermissions);
        await savePermissions(newPermissions);
      }
    } else {
      // Revoke permission
      const newPermissions: Permission[] = permissions.map(p =>
        p.id === permissionId ? { ...p, isEnabled: false, status: 'denied' as const } : p
      );
      setPermissions(newPermissions);
      await savePermissions(newPermissions);
    }
  };

  const requestPermission = async (permission: Permission): Promise<boolean> => {
    switch (permission.category) {
      case 'location':
        return await requestLocationPermission();
      case 'camera':
        return await requestCameraPermission();
      case 'microphone':
        return await requestMicrophonePermission();
      case 'storage':
        return await requestStoragePermission();
      case 'contacts':
        return await requestContactsPermission();
      case 'notifications':
        return await requestNotificationPermission();
      default:
        return false;
    }
  };

  const requestLocationPermission = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      Alert.alert(
        'Location Permission',
        'This app would like to access your location to provide better job recommendations.',
        [
          { text: 'Deny', onPress: () => {
            updatePermissionStatus('location', 'denied');
            resolve(false);
          }},
          { text: 'Allow', onPress: () => {
            updatePermissionStatus('location', 'granted');
            resolve(true);
          }}
        ]
      );
    });
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      Alert.alert(
        'Camera Permission',
        'This app would like to access your camera to take profile photos.',
        [
          { text: 'Deny', onPress: () => {
            updatePermissionStatus('camera', 'denied');
            resolve(false);
          }},
          { text: 'Allow', onPress: () => {
            updatePermissionStatus('camera', 'granted');
            resolve(true);
          }}
        ]
      );
    });
  };

  const requestMicrophonePermission = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      Alert.alert(
        'Microphone Permission',
        'This app would like to access your microphone for voice messages.',
        [
          { text: 'Deny', onPress: () => {
            updatePermissionStatus('microphone', 'denied');
            resolve(false);
          }},
          { text: 'Allow', onPress: () => {
            updatePermissionStatus('microphone', 'granted');
            resolve(true);
          }}
        ]
      );
    });
  };

  const requestStoragePermission = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      Alert.alert(
        'Storage Permission',
        'This app would like to access your storage to save files and photos.',
        [
          { text: 'Deny', onPress: () => {
            updatePermissionStatus('storage', 'denied');
            resolve(false);
          }},
          { text: 'Allow', onPress: () => {
            updatePermissionStatus('storage', 'granted');
            resolve(true);
          }}
        ]
      );
    });
  };

  const requestContactsPermission = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      Alert.alert(
        'Contacts Permission',
        'This app would like to access your contacts to help you connect with people.',
        [
          { text: 'Deny', onPress: () => {
            updatePermissionStatus('contacts', 'denied');
            resolve(false);
          }},
          { text: 'Allow', onPress: () => {
            updatePermissionStatus('contacts', 'granted');
            resolve(true);
          }}
        ]
      );
    });
  };

  const requestNotificationPermission = async (): Promise<boolean> => {
    // Notifications are handled by the notification context
    return true;
  };

  const openSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  const resetAllPermissions = () => {
    Alert.alert(
      'Reset All Permissions',
      'This will reset all permissions to their default state. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            const defaultPermissions: Permission[] = permissions.map(p => ({
              ...p,
              isEnabled: p.isRequired,
              status: p.isRequired ? 'granted' as const : 'undetermined' as const
            }));
            setPermissions(defaultPermissions);
            await savePermissions(defaultPermissions);
            Alert.alert('Success', 'All permissions have been reset.');
          }
        }
      ]
    );
  };

  const getPermissionStatusText = (status: string) => {
    switch (status) {
      case 'granted':
        return 'Granted';
      case 'denied':
        return 'Denied';
      case 'restricted':
        return 'Restricted';
      default:
        return 'Not Determined';
    }
  };

  const getPermissionStatusColor = (status: string) => {
    switch (status) {
      case 'granted':
        return '#10b981';
      case 'denied':
        return '#ef4444';
      case 'restricted':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Permissions</Text>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={resetAllPermissions}
        >
          <Text style={styles.resetButtonText}>Reset All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={24} color="#3b82f6" />
          <Text style={styles.infoText}>
            Manage app permissions to control what data and features the app can access on your device.
          </Text>
        </View>

        <View style={styles.permissionsList}>
          {permissions.map((permission) => (
            <View key={permission.id} style={styles.permissionItem}>
              <View style={styles.permissionHeader}>
                <View style={styles.permissionIcon}>
                  <Ionicons name={permission.icon as any} size={24} color="#6b46c1" />
                </View>
                <View style={styles.permissionInfo}>
                  <View style={styles.permissionTitleRow}>
                    <Text style={styles.permissionTitle}>{permission.title}</Text>
                    {permission.isRequired && (
                      <View style={styles.requiredBadge}>
                        <Text style={styles.requiredText}>Required</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.permissionDescription}>{permission.description}</Text>
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Status: </Text>
                    <Text style={[
                      styles.statusText, 
                      { color: getPermissionStatusColor(permission.status) }
                    ]}>
                      {getPermissionStatusText(permission.status)}
                    </Text>
                  </View>
                </View>
              </View>
              
              <Switch
                value={permission.isEnabled}
                onValueChange={(value) => handlePermissionToggle(permission.id, value)}
                trackColor={{ false: '#e5e7eb', true: '#6b46c1' }}
                thumbColor={permission.isEnabled ? '#fff' : '#f3f4f6'}
                ios_backgroundColor="#e5e7eb"
                disabled={permission.isRequired}
              />
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Required permissions cannot be disabled as they are essential for the app to function properly.
          </Text>
          <TouchableOpacity style={styles.settingsButton} onPress={openSettings}>
            <Text style={styles.settingsButtonText}>Open Device Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#B0AAD9',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    backgroundColor: '#B0AAD9',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  resetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  infoCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  permissionsList: {
    gap: 12,
    marginBottom: 24,
  },
  permissionItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  permissionHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  permissionIcon: {
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    borderRadius: 12,
    padding: 8,
    marginRight: 12,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  requiredBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requiredText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ef4444',
  },
  permissionDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  settingsButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    alignItems: 'center',
  },
  settingsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

