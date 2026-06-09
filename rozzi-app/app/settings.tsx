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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCustomFonts } from '@/hooks/fonts';
import { router } from 'expo-router';
import { useBackHandler } from '@/hooks/useBackHandler';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAppTheme, ThemeType } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
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
  const { theme, setTheme, colors, colorScheme } = useAppTheme();
  
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  
  const [settings, setSettings] = useState({
    locationPermission: true,
    cameraPermission: true,
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

  const handleThemeChange = (newTheme: ThemeType) => {
    setTheme(newTheme);
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
          onPress: () => setShowLanguageModal(true),
        },
        {
          id: 'theme',
          title: 'Theme',
          subtitle: theme === 'system' ? 'System Default' : theme === 'light' ? 'Light' : 'Dark',
          icon: 'color-palette-outline',
          type: 'navigate',
          onPress: () => setShowThemeModal(true),
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
        <View style={[styles.settingIcon, { backgroundColor: `${item.color || colors.primary}20` }]}>
          <Ionicons
            name={item.icon as any}
            size={20}
            color={item.color || colors.primary}
          />
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: colors.text }, item.color && { color: item.color }]}>
            {item.title}
          </Text>
          {item.subtitle && (
            <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
          )}
        </View>
      </View>

      {item.type === 'toggle' ? (
        <Switch
          value={item.value}
          onValueChange={item.onToggle}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={item.value ? '#fff' : colors.card}
          ios_backgroundColor={colors.border}
        />
      ) : (
        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
      )}
    </TouchableOpacity>
  );

  const renderSection = (section: SettingSection) => (
    <View key={section.id} style={styles.section}>
      <TouchableOpacity
        style={[styles.sectionHeader, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
        onPress={() => toggleSection(section.id)}
        activeOpacity={0.7}
      >
        <View style={styles.sectionHeaderLeft}>
          <View style={[styles.sectionIcon, { backgroundColor: `${colors.primary}15` }]}>
            <Ionicons name={section.icon as any} size={20} color={colors.primary} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
        </View>
        <Ionicons
          name={collapsedSections.has(section.id) ? 'chevron-down' : 'chevron-up'}
          size={16}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {!collapsedSections.has(section.id) && (
        <View style={[styles.sectionContent, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderTopWidth: 0 }]}>
          {section.items.map(renderSettingItem)}
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.brandBackground }]}>
      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.brandBackground, paddingTop: Math.max(insets.top + (Platform.OS === 'ios' ? 6 : 10), Platform.OS === 'ios' ? 50 : 20) }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colorScheme === 'dark' ? '#fff' : '#000'} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search settings..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
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
            style={[
              styles.logoutButton, 
              { backgroundColor: colorScheme === 'dark' ? colors.card : 'rgba(255, 255, 255, 0.95)' },
              isLoggingOut && styles.logoutButtonDisabled
            ]}
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

      {/* Theme Selection Modal */}
      <Modal
        visible={showThemeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowThemeModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Theme</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Choose your preferred theme</Text>
            
            {['light', 'dark', 'system'].map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.modalOption, 
                  theme === t && styles.modalOptionActive, 
                  theme === t && { backgroundColor: `${colors.primary}15`, borderColor: colors.primary }
                ]}
                onPress={() => {
                  handleThemeChange(t as ThemeType);
                  setShowThemeModal(false);
                }}
              >
                <Text style={[
                  styles.modalOptionText, 
                  { color: colors.text }, 
                  theme === t && { color: colors.primary, fontWeight: 'bold' }
                ]}>
                  {t === 'system' ? 'System Default' : t === 'light' ? 'Light' : 'Dark'}
                </Text>
                {theme === t && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowLanguageModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Language</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Select your preferred language</Text>
            
            {['English'].map((l) => (
              <TouchableOpacity
                key={l}
                style={[
                  styles.modalOption, 
                  settings.language === l && styles.modalOptionActive, 
                  settings.language === l && { backgroundColor: `${colors.primary}15`, borderColor: colors.primary }
                ]}
                onPress={() => {
                  handleLanguageChange(l);
                  setShowLanguageModal(false);
                }}
              >
                <Text style={[
                  styles.modalOptionText, 
                  { color: colors.text }, 
                  settings.language === l && { color: colors.primary, fontWeight: 'bold' }
                ]}>
                  {l}
                </Text>
                {settings.language === l && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
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
    borderRadius: 16,
    borderTopLeftRadius: 0,
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
    borderBottomColor: 'rgba(156, 163, 175, 0.2)', // Use semi-transparent gray to work on both themes
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modalOptionActive: {
    borderWidth: 1,
  },
  modalOptionText: {
    fontSize: 16,
  },
});

