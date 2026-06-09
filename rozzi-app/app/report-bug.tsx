import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCustomFonts } from '@/hooks/fonts';
import { router } from 'expo-router';
import { useBackHandler } from '@/hooks/useBackHandler';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BugReport {
  title: string;
  description: string;
  steps: string;
  expectedBehavior: string;
  actualBehavior: string;
  deviceInfo: string;
  appVersion: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
}

const bugCategories = [
  'App Crashes',
  'UI/UX Issues',
  'Performance Issues',
  'Login/Authentication',
  'Job Posting',
  'Job Application',
  'Messaging',
  'Profile Management',
  'Notifications',
  'Other'
];

// severityLevels moved inside component

export default function ReportBugScreen() {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useCustomFonts();
  const [bugReport, setBugReport] = useState<BugReport>({
    title: '',
    description: '',
    steps: '',
    expectedBehavior: '',
    actualBehavior: '',
    deviceInfo: '',
    appVersion: '1.0.0',
    severity: 'medium',
    category: 'Other'
  });

  const severityLevels = React.useMemo(() => [
    { value: 'low', label: 'Low', color: colors.textSecondary, description: 'Minor issue, doesn\'t affect functionality' },
    { value: 'medium', label: 'Medium', color: colors.textSecondary, description: 'Noticeable issue, some functionality affected' },
    { value: 'high', label: 'High', color: colors.textSecondary, description: 'Major issue, significant functionality affected' },
    { value: 'critical', label: 'Critical', color: colors.textSecondary, description: 'App unusable, immediate attention required' }
  ], [colors]);

  // Handle back button
  useBackHandler({
    targetRoute: '/settings'
  });

  const updateBugReport = (field: keyof BugReport, value: string | BugReport['severity']) => {
    setBugReport(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitBugReport = () => {
    // Validate required fields
    if (!bugReport.title.trim() || !bugReport.description.trim()) {
      Alert.alert('Missing Information', 'Please fill in the title and description fields.');
      return;
    }

    // Create email content
    const emailSubject = `[BUG REPORT] ${bugReport.title}`;
    const emailBody = `
Bug Report Details:

Title: ${bugReport.title}
Category: ${bugReport.category}
Severity: ${bugReport.severity.toUpperCase()}

Description:
${bugReport.description}

Steps to Reproduce:
${bugReport.steps || 'Not provided'}

Expected Behavior:
${bugReport.expectedBehavior || 'Not provided'}

Actual Behavior:
${bugReport.actualBehavior || 'Not provided'}

Device Information:
${bugReport.deviceInfo || 'Not provided'}

App Version: ${bugReport.appVersion}

---
This bug report was submitted through the Rozzi app.
    `.trim();

    // Send email
    const mailtoUrl = `mailto:setunajobs@gmail.com?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    
    Linking.canOpenURL(mailtoUrl).then(supported => {
      if (supported) {
        Linking.openURL(mailtoUrl);
        Alert.alert(
          'Bug Report Submitted',
          'Thank you for reporting this issue! We\'ll investigate and get back to you soon.',
          [
            { text: 'OK', onPress: () => router.back() }
          ]
        );
      } else {
        Alert.alert(
          'Email App Not Found',
          'Please copy our email address and send us the bug report:\n\nsetunajobs@gmail.com',
          [
            { text: 'Copy Email', onPress: () => {
              Alert.alert('Email Copied', 'setunajobs@gmail.com has been copied to your clipboard.');
            }},
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      }
    });
  };

  const isFormValid = bugReport.title.trim() && bugReport.description.trim();

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + (Platform.OS === 'ios' ? 10 : 14), Platform.OS === 'ios' ? 54 : 38) }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Report a Bug</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Message */}
        <View style={styles.headerMessage}>
          <Ionicons name="bug" size={48} color="#ef4444" />
          <Text style={styles.headerTitle}>Found a Bug?</Text>
          <Text style={styles.headerSubtitle}>
            Help us improve the app by reporting any issues you encounter. Your feedback is valuable!
          </Text>
        </View>

        {/* Bug Report Form */}
        <View style={styles.form}>
          {/* Title */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Bug Title *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Brief description of the issue"
              value={bugReport.title}
              onChangeText={(value) => updateBugReport('title', value)}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Category */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Category</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryContainer}
            >
              {bugCategories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton,
                    bugReport.category === category && styles.categoryButtonActive
                  ]}
                  onPress={() => updateBugReport('category', category)}
                >
                  <Text style={[
                    styles.categoryText,
                    bugReport.category === category && styles.categoryTextActive
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Severity */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Severity Level</Text>
            {severityLevels.map((level) => (
              <TouchableOpacity
                key={level.value}
                style={[
                  styles.severityButton,
                  bugReport.severity === level.value && styles.severityButtonActive,
                  { borderLeftColor: level.color }
                ]}
                onPress={() => updateBugReport('severity', level.value)}
              >
                <View style={styles.severityContent}>
                  <Text style={[
                    styles.severityLabel,
                    bugReport.severity === level.value && styles.severityLabelActive
                  ]}>
                    {level.label}
                  </Text>
                  <Text style={styles.severityDescription}>{level.description}</Text>
                </View>
                {bugReport.severity === level.value && (
                  <Ionicons name="checkmark-circle" size={20} color={level.color} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Description */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Detailed Description *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Describe the bug in detail..."
              value={bugReport.description}
              onChangeText={(value) => updateBugReport('description', value)}
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Steps to Reproduce */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Steps to Reproduce</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="1. Go to...\n2. Tap on...\n3. Then..."
              value={bugReport.steps}
              onChangeText={(value) => updateBugReport('steps', value)}
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Expected vs Actual Behavior */}
          <View style={styles.behaviorContainer}>
            <View style={styles.behaviorInput}>
              <Text style={styles.inputLabel}>Expected Behavior</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="What should happen?"
                value={bugReport.expectedBehavior}
                onChangeText={(value) => updateBugReport('expectedBehavior', value)}
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
            <View style={styles.behaviorInput}>
              <Text style={styles.inputLabel}>Actual Behavior</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="What actually happens?"
                value={bugReport.actualBehavior}
                onChangeText={(value) => updateBugReport('actualBehavior', value)}
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Device Info */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Device Information</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Device model, OS version, etc."
              value={bugReport.deviceInfo}
              onChangeText={(value) => updateBugReport('deviceInfo', value)}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              !isFormValid && styles.submitButtonDisabled
            ]}
            onPress={handleSubmitBugReport}
            activeOpacity={0.7}
            disabled={!isFormValid}
          >
            <Ionicons name="send" size={20} color="#ffffff" />
            <Text style={styles.submitButtonText}>Submit Bug Report</Text>
          </TouchableOpacity>
        </View>

        {/* Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>💡 Tips for Better Bug Reports</Text>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            <Text style={styles.tipText}>Be specific about what you were doing when the bug occurred</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            <Text style={styles.tipText}>Include screenshots if possible</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            <Text style={styles.tipText}>Mention your device and app version</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            <Text style={styles.tipText}>Describe the expected vs actual behavior clearly</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.brandBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 38,
    paddingBottom: 16,
    backgroundColor: colors.brandBackground,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.card,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  headerMessage: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.card,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    paddingVertical: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.cardAlt,
    marginRight: 12,
  },
  categoryButtonActive: {
    backgroundColor: colors.cardAlt,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  categoryTextActive: {
    color: colors.text,
  },
  severityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  severityButtonActive: {
    borderColor: colors.border,
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
  },
  severityContent: {
    flex: 1,
  },
  severityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  severityLabelActive: {
    color: colors.textSecondary,
  },
  severityDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  behaviorContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  behaviorInput: {
    flex: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: colors.textSecondary,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  tipsContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
});

