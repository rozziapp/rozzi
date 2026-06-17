import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCustomFonts } from '@/hooks/fonts';
import { router } from 'expo-router';
import { useBackHandler } from '@/hooks/useBackHandler';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TermsOfServiceScreen() {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useCustomFonts();

  // Handle back button
  useBackHandler({
    targetRoute: '/settings'
  });

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
        <Text style={styles.title}>Terms of Service</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Introduction */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.sectionText}>
            By accessing and using the Rozzi mobile application ("App"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
          </Text>
        </View>

        {/* Service Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Service Description</Text>
          <Text style={styles.sectionText}>
            Rozzi is a job marketplace platform that connects job seekers with employers. The App allows users to post job opportunities, search for jobs, apply for positions, and communicate with other users.
          </Text>
        </View>

        {/* User Accounts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. User Accounts</Text>
          <Text style={styles.sectionText}>
            You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate and complete information when creating your account.
          </Text>
        </View>

        {/* User Conduct */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. User Conduct</Text>
          <Text style={styles.sectionText}>
            You agree not to use the App to:
          </Text>
          <View style={styles.bulletPoints}>
            <Text style={styles.bulletPoint}>• Post false, misleading, or fraudulent job listings</Text>
            <Text style={styles.bulletPoint}>• Harass, abuse, or discriminate against other users</Text>
            <Text style={styles.bulletPoint}>• Violate any applicable laws or regulations</Text>
            <Text style={styles.bulletPoint}>• Attempt to gain unauthorized access to the App</Text>
            <Text style={styles.bulletPoint}>• Use the App for any illegal or unauthorized purpose</Text>
          </View>
        </View>

        {/* Job Postings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Job Postings</Text>
          <Text style={styles.sectionText}>
            Employers are responsible for the accuracy and legality of job postings. Job postings must comply with all applicable employment laws and regulations. Rozzi reserves the right to remove any job posting that violates these terms.
          </Text>
        </View>

        {/* Job Applications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Job Applications</Text>
          <Text style={styles.sectionText}>
            Job seekers are responsible for the accuracy of their applications and resumes. By applying for a job, you consent to the employer reviewing your application and contacting you regarding the position.
          </Text>
        </View>

        {/* Privacy and Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Privacy and Data Protection</Text>
          <Text style={styles.sectionText}>
            Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the App, to understand our practices regarding the collection and use of your personal information.
          </Text>
        </View>

        {/* Intellectual Property */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Intellectual Property</Text>
          <Text style={styles.sectionText}>
            The App and its original content, features, and functionality are owned by Rozzi and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
          </Text>
        </View>

        {/* Disclaimers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Disclaimers</Text>
          <Text style={styles.sectionText}>
            The App is provided "as is" without warranties of any kind. Rozzi does not guarantee job placement or employment opportunities. Users are responsible for verifying the accuracy of job listings and employer information.
          </Text>
        </View>

        {/* Limitation of Liability */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Limitation of Liability</Text>
          <Text style={styles.sectionText}>
            Rozzi shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the App or any job-related activities.
          </Text>
        </View>

        {/* Termination */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Termination</Text>
          <Text style={styles.sectionText}>
            We may terminate or suspend your account and access to the App immediately, without prior notice, for any reason, including breach of these Terms of Service.
          </Text>
        </View>

        {/* Changes to Terms */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Changes to Terms</Text>
          <Text style={styles.sectionText}>
            We reserve the right to modify these terms at any time. We will notify users of any material changes via the App or email. Continued use of the App after changes constitutes acceptance of the new terms.
          </Text>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>13. Contact Information</Text>
          <Text style={styles.sectionText}>
            If you have any questions about these Terms of Service, please contact us at:
          </Text>
          <Text style={styles.contactInfo}>Email: rozzijobs@gmail.com</Text>
        </View>

        {/* Governing Law */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>14. Governing Law</Text>
          <Text style={styles.sectionText}>
            These Terms of Service shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using the Rozzi app, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
          </Text>
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
  lastUpdated: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  lastUpdatedText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 8,
  },
  bulletPoints: {
    marginTop: 8,
    marginLeft: 8,
  },
  bulletPoint: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 4,
  },
  contactInfo: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 8,
  },
  footer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },
});

