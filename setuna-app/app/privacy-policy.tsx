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

export default function PrivacyPolicyScreen() {
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
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Introduction */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Introduction</Text>
          <Text style={styles.sectionText}>
            At Setuna, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our job marketplace mobile application.
          </Text>
        </View>

        {/* Information We Collect */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Information We Collect</Text>
          <Text style={styles.sectionText}>
            We collect the following types of information:
          </Text>
          <View style={styles.bulletPoints}>
            <Text style={styles.bulletPoint}>• <Text style={styles.boldText}>Account Information:</Text> Name, email, phone number, and profile details</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.boldText}>Profile Information:</Text> Skills, experience, education, resume, and profile picture</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.boldText}>Job Information:</Text> Job postings, applications, and related communications</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.boldText}>Usage Data:</Text> App interactions, search queries, and feature usage</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.boldText}>Device Information:</Text> Device type, operating system, and app version</Text>
          </View>
        </View>

        {/* How We Use Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
          <Text style={styles.sectionText}>
            We use your information to:
          </Text>
          <View style={styles.bulletPoints}>
            <Text style={styles.bulletPoint}>• Provide and maintain the job marketplace service</Text>
            <Text style={styles.bulletPoint}>• Match job seekers with relevant opportunities</Text>
            <Text style={styles.bulletPoint}>• Enable communication between users</Text>
            <Text style={styles.bulletPoint}>• Improve our services and user experience</Text>
            <Text style={styles.bulletPoint}>• Send important notifications and updates</Text>
            <Text style={styles.bulletPoint}>• Ensure platform security and prevent fraud</Text>
          </View>
        </View>

        {/* Information Sharing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Information Sharing and Disclosure</Text>
          <Text style={styles.sectionText}>
            We may share your information in the following circumstances:
          </Text>
          <View style={styles.bulletPoints}>
            <Text style={styles.bulletPoint}>• <Text style={styles.boldText}>With Employers:</Text> When you apply for jobs, relevant information is shared</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.boldText}>With Job Seekers:</Text> Job posting details and employer information</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.boldText}>Service Providers:</Text> Third-party services that help us operate the app</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.boldText}>Legal Requirements:</Text> When required by law or to protect rights</Text>
          </View>
        </View>

        {/* Data Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Data Security</Text>
          <Text style={styles.sectionText}>
            We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes encryption, secure servers, and regular security assessments.
          </Text>
        </View>

        {/* Data Retention */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Data Retention</Text>
          <Text style={styles.sectionText}>
            We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this policy. You may request deletion of your account and associated data at any time.
          </Text>
        </View>

        {/* Your Rights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Your Rights and Choices</Text>
          <Text style={styles.sectionText}>
            You have the right to:
          </Text>
          <View style={styles.bulletPoints}>
            <Text style={styles.bulletPoint}>• Access and review your personal information</Text>
            <Text style={styles.bulletPoint}>• Update or correct inaccurate information</Text>
            <Text style={styles.bulletPoint}>• Request deletion of your data</Text>
            <Text style={styles.bulletPoint}>• Control notification preferences</Text>
            <Text style={styles.bulletPoint}>• Opt out of certain data processing</Text>
          </View>
        </View>

        {/* Cookies and Tracking */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Cookies and Tracking Technologies</Text>
          <Text style={styles.sectionText}>
            We use cookies and similar technologies to enhance your experience, analyze app usage, and provide personalized content. You can control cookie preferences through your device settings.
          </Text>
        </View>

        {/* Third-Party Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Third-Party Services</Text>
          <Text style={styles.sectionText}>
            Our app may contain links to third-party services or integrate with external platforms. We are not responsible for the privacy practices of these third parties. Please review their privacy policies before using their services.
          </Text>
        </View>

        {/* Children's Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Children's Privacy</Text>
          <Text style={styles.sectionText}>
            Our services are not intended for children under 16 years of age. We do not knowingly collect personal information from children under 16. If you believe we have collected such information, please contact us immediately.
          </Text>
        </View>

        {/* International Transfers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. International Data Transfers</Text>
          <Text style={styles.sectionText}>
            Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data in accordance with applicable data protection laws.
          </Text>
        </View>

        {/* Changes to Policy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Changes to This Privacy Policy</Text>
          <Text style={styles.sectionText}>
            We may update this Privacy Policy from time to time. We will notify you of any material changes through the app or email. Your continued use of the app after changes constitutes acceptance of the updated policy.
          </Text>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>13. Contact Us</Text>
          <Text style={styles.sectionText}>
            If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
          </Text>
          <Text style={styles.contactInfo}>Email: setunajobs@gmail.com</Text>
          <Text style={styles.contactInfo}>Support Hours: Monday - Friday, 9:00 AM - 6:00 PM IST</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using the Setuna app, you acknowledge that you have read and understood this Privacy Policy and consent to the collection, use, and disclosure of your information as described herein.
          </Text>
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
  header: {
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  lastUpdatedText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
    marginBottom: 8,
  },
  bulletPoints: {
    marginTop: 8,
    marginLeft: 8,
  },
  bulletPoint: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
    marginBottom: 4,
  },
  boldText: {
    fontWeight: '600',
    color: '#111827',
  },
  contactInfo: {
    fontSize: 15,
    color: '#8b5cf6',
    fontWeight: '500',
    marginTop: 8,
  },
  footer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },
});

