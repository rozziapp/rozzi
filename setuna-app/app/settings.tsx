import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCustomFonts } from '@/hooks/fonts';
import { router } from 'expo-router';
import { useBackHandler } from '@/hooks/useBackHandler';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';

const { width } = Dimensions.get('window');

interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  type: 'toggle' | 'navigate' | 'action';
  value?: boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
  color?: string;
}

interface SettingSection {
  id: string;
  title: string;
  icon: string;
  items: SettingItem[];
  isCollapsed?: boolean;
}

export default function SettingsScreen() {
  const [fontsLoaded] = useCustomFonts();
  const { logout } = useAuth();
  const { notificationSettings, updateNotificationSettings, unreadCount, notifications } = useNotifications();

  // Safety check for notification settings
  const safeNotificationSettings = notificationSettings || {};
  const safeUnreadCount = unreadCount || 0;

  // Calculate non-message notification count (exclude messages from notification count)
  const nonMessageNotifications = notifications?.filter(n => n.type !== 'message') || [];
  const nonMessageUnreadCount = nonMessageNotifications.filter(n => !n.isRead).length;
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set(['account', 'notifications', 'privacy-security', 'app-preferences', 'help-support', 'about']));
  const [settings, setSettings] = useState({
    locationPermission: true,
    cameraPermission: true,
    theme: 'system' as 'light' | 'dark' | 'system',
    language: 'English',
  });

  // Handle back button
  useBackHandler({
    targetRoute: '/my-profile'
  });

  if (!fontsLoaded) {
    return null;
  }



  const toggleSection = (sectionId: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(sectionId)) {
      newCollapsed.delete(sectionId);
    } else {
      newCollapsed.add(sectionId);
    }
    setCollapsedSections(newCollapsed);
  };

  const handleSettingToggle = (settingKey: string, value: boolean) => {
    try {
      if (settingKey in safeNotificationSettings) {
        // Handle notification settings
        updateNotificationSettings({ [settingKey]: value });
      } else {
        // Handle other settings
        setSettings(prev => ({ ...prev, [settingKey]: value }));
      }
    } catch (error) {
      console.error('Error toggling setting:', error);
    }
  };

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    setSettings(prev => ({ ...prev, theme }));
  };

  const handleLanguageChange = (language: string) => {
    setSettings(prev => ({ ...prev, language }));
  };

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    // Prevent multiple logout attempts
    if (isLoggingOut) {
      return;
    }

    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            console.log('🔴 Logout button pressed in settings');
            logout();
          }
        }
      ]
    );
  };



  const allSettings: SettingSection[] = [
    {
      id: 'account',
      title: 'Account',
      icon: 'person-outline',
      items: [
        {
          id: 'email-phone',
          title: 'Manage Email & Phone',
          subtitle: 'Update your contact information',
          icon: 'mail-outline',
          type: 'navigate',
          onPress: () => router.push('/manage-email-phone'),
        },
        {
          id: 'change-password',
          title: 'Change Password',
          subtitle: 'Update your account password',
          icon: 'lock-closed-outline',
          type: 'navigate',
          onPress: () => router.push('/change-password'),
        },

      ],
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: 'notifications-outline',
      items: [

        {
          id: 'all-notifications',
          title: 'All Notifications',
          subtitle: 'Enable or disable all notifications',
          icon: 'notifications-off-outline',
          type: 'toggle',
          value: safeNotificationSettings.allNotifications || false,
          onToggle: (value) => handleSettingToggle('allNotifications', value),
        },
        {
          id: 'push-notifications',
          title: 'Push Notifications',
          subtitle: 'Receive notifications on your device',
          icon: 'phone-portrait-outline',
          type: 'toggle',
          value: safeNotificationSettings.pushNotifications || false,
          onToggle: (value) => handleSettingToggle('pushNotifications', value),
        },
        {
          id: 'job-alerts',
          title: 'Job Alerts',
          subtitle: 'Get notified about new job opportunities',
          icon: 'briefcase-outline',
          type: 'toggle',
          value: safeNotificationSettings.jobAlerts || false,
          onToggle: (value) => handleSettingToggle('jobAlerts', value),
        },
        {
          id: 'new-applicants',
          title: 'New Applicants',
          subtitle: 'Notifications for new job applications',
          icon: 'people-outline',
          type: 'toggle',
          value: safeNotificationSettings.newApplicants || false,
          onToggle: (value) => handleSettingToggle('newApplicants', value),
        },
        {
          id: 'profile-views',
          title: 'Profile Views',
          subtitle: 'When someone views your profile',
          icon: 'eye-outline',
          type: 'toggle',
          value: safeNotificationSettings.profileViews || false,
          onToggle: (value) => handleSettingToggle('profileViews', value),
        },
        {
          id: 'application-updates',
          title: 'Application Updates',
          subtitle: 'Status changes for your applications',
          icon: 'refresh-outline',
          type: 'toggle',
          value: safeNotificationSettings.applicationUpdates || false,
          onToggle: (value) => handleSettingToggle('applicationUpdates', value),
        },
      ],
    },
    {
      id: 'privacy-security',
      title: 'Privacy & Security',
      icon: 'shield-outline',
      items: [
        {
          id: 'blocked-users',
          title: 'Blocked Users',
          subtitle: 'Manage your blocked users list',
          icon: 'ban-outline',
          type: 'navigate',
          onPress: () => router.push('/blocked-users'),
        },
        {
          id: 'permissions',
          title: 'Permissions',
          subtitle: 'Location, camera, and other permissions',
          icon: 'settings-outline',
          type: 'navigate',
          onPress: () => router.push('/permissions'),
        },
      ],
    },
    {
      id: 'app-preferences',
      title: 'App Preferences',
      icon: 'phone-portrait-outline',
      items: [
        {
          id: 'language',
          title: 'Language',
          subtitle: settings.language,
          icon: 'language-outline',
          type: 'navigate',
          onPress: () => {
            Alert.alert(
              'Language',
              'Select your preferred language',
              [
                { text: 'English', onPress: () => handleLanguageChange('English') },
                { text: 'Hindi', onPress: () => handleLanguageChange('Hindi') },
                { text: 'Cancel', style: 'cancel' },
              ]
            );
          },
        },
        {
          id: 'theme',
          title: 'Theme',
          subtitle: settings.theme === 'system' ? 'System Default' : settings.theme === 'light' ? 'Light' : 'Dark',
          icon: 'color-palette-outline',
          type: 'navigate',
          onPress: () => {
            Alert.alert(
              'Theme',
              'Choose your preferred theme',
              [
                { text: 'Light', onPress: () => handleThemeChange('light') },
                { text: 'Dark', onPress: () => handleThemeChange('dark') },
                { text: 'System Default', onPress: () => handleThemeChange('system') },
                { text: 'Cancel', style: 'cancel' },
              ]
            );
          },
        },
        {
          id: 'app-version',
          title: 'App Version',
          subtitle: 'Version 1.0.0',
          icon: 'information-circle-outline',
          type: 'navigate',
          onPress: () => Alert.alert('App Version', 'Version 1.0.0\nBuild 2024.1.1'),
        },
      ],
    },
    {
      id: 'help-support',
      title: 'Help & Support',
      icon: 'help-circle-outline',
      items: [
        {
          id: 'faqs',
          title: 'FAQs',
          subtitle: 'Frequently asked questions',
          icon: 'help-circle-outline',
          type: 'navigate',
          onPress: () => router.push('/faqs'),
        },
        {
          id: 'contact-support',
          title: 'Contact Support',
          subtitle: 'Get help from our support team',
          icon: 'chatbubble-outline',
          type: 'navigate',
          onPress: () => router.push('/contact-support'),
        },
        {
          id: 'report-bug',
          title: 'Report a Bug',
          subtitle: 'Help us improve by reporting issues',
          icon: 'bug-outline',
          type: 'navigate',
          onPress: () => router.push('/report-bug'),
        },
      ],
    },
    {
      id: 'about',
      title: 'About',
      icon: 'information-circle-outline',
      items: [
        {
          id: 'terms-of-service',
          title: 'Terms of Service',
          subtitle: 'Read our terms and conditions',
          icon: 'document-text-outline',
          type: 'navigate',
          onPress: () => router.push('/terms-of-service'),
        },
        {
          id: 'privacy-policy',
          title: 'Privacy Policy',
          subtitle: 'How we handle your data',
          icon: 'shield-outline',
          type: 'navigate',
          onPress: () => router.push('/privacy-policy'),
        },
      ],
    },
  ];

  const filteredSettings = useMemo(() => {
    if (!searchQuery.trim()) return allSettings;

    return allSettings.map(section => ({
      ...section,
      items: section.items.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    })).filter(section => section.items.length > 0);
  }, [searchQuery, allSettings]);

  const renderSettingItem = (item: SettingItem) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.settingItem, item.color && { borderLeftColor: item.color, borderLeftWidth: 3 }]}
      onPress={item.onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingItemLeft}>
        <View style={[styles.settingIcon, item.color && { backgroundColor: `${item.color}20` }]}>
          <Ionicons
            name={item.icon as any}
            size={20}
            color={item.color || '#6b46c1'}
          />
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, item.color && { color: item.color }]}>
            {item.title}
          </Text>
          {item.subtitle && (
            <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
          )}
        </View>
      </View>

      {item.type === 'toggle' ? (
        <Switch
          value={item.value}
          onValueChange={item.onToggle}
          trackColor={{ false: '#e5e7eb', true: '#6b46c1' }}
          thumbColor={item.value ? '#fff' : '#f3f4f6'}
          ios_backgroundColor="#e5e7eb"
        />
      ) : (
        <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
      )}
    </TouchableOpacity>
  );

  const renderSection = (section: SettingSection) => (
    <View key={section.id} style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleSection(section.id)}
        activeOpacity={0.7}
      >
        <View style={styles.sectionHeaderLeft}>
          <View style={styles.sectionIcon}>
            <Ionicons name={section.icon as any} size={20} color="#6b46c1" />
          </View>
          <Text style={styles.sectionTitle}>{section.title}</Text>
        </View>
        <Ionicons
          name={collapsedSections.has(section.id) ? 'chevron-down' : 'chevron-up'}
          size={16}
          color="#6b7280"
        />
      </TouchableOpacity>

      {!collapsedSections.has(section.id) && (
        <View style={styles.sectionContent}>
          {section.items.map(renderSettingItem)}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/my-profile')}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search settings..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Settings Sections */}
        {filteredSettings.map(renderSection)}

        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={[styles.logoutButton, isLoggingOut && styles.logoutButtonDisabled]}
            onPress={handleLogout}
            activeOpacity={0.7}
            disabled={isLoggingOut}
          >
            <View style={styles.logoutButtonContent}>
              <View style={styles.logoutIcon}>
                {isLoggingOut ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                )}
              </View>
              <Text style={styles.logoutText}>
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </Text>
            </View>
            {!isLoggingOut && (
              <Ionicons name="chevron-forward" size={16} color="#ef4444" />
            )}
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
    borderBottomWidth: 0,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    borderRadius: 10,
    padding: 8,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  sectionContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    borderRadius: 10,
    padding: 8,
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  logoutSection: {
    marginTop: 32,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutButtonDisabled: {
    opacity: 0.7,
  },
  logoutButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutIcon: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 10,
    padding: 8,
    marginRight: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
});

