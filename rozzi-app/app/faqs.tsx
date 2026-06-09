import React, { useState } from 'react';
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

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  {
    id: '1',
    question: 'How do I create a job posting?',
    answer: 'Go to the Post tab, choose between "Hire" or "Looking for work", fill in the required details, and tap "Post Job". Make sure to include all necessary information like job description, salary range, and location.',
    category: 'Job Posting'
  },
  {
    id: '2',
    question: 'How can I apply for a job?',
    answer: 'Browse available jobs in the Explore tab, tap on a job that interests you, and use the "Apply" button. You can also save jobs for later by tapping the bookmark icon.',
    category: 'Job Application'
  },
  {
    id: '3',
    question: 'How do I block or unblock a user?',
    answer: 'Visit the user\'s profile and tap the "Block User" button. To unblock, go to Settings > Privacy & Security > Blocked Users, find the user, and tap "Unblock".',
    category: 'Privacy & Security'
  },
  {
    id: '4',
    question: 'How do I change my profile picture?',
    answer: 'Go to My Profile tab, tap the edit icon, and select "Change Profile Picture". You can choose from your camera roll or take a new photo.',
    category: 'Profile Management'
  },
  {
    id: '5',
    question: 'How do I update my skills?',
    answer: 'In My Profile, tap the edit icon, scroll to the Skills section, and tap the plus icon to add new skills or tap existing skills to remove them.',
    category: 'Profile Management'
  },
  {
    id: '6',
    question: 'How can I contact a user?',
    answer: 'Visit the user\'s profile and tap the "Message" button to start a conversation. You can also view your conversations in the Inbox tab.',
    category: 'Communication'
  },
  {
    id: '7',
    question: 'How do I report inappropriate content?',
    answer: 'Tap the three dots menu on any post or profile, select "Report", choose the reason, and submit. Our team will review the report within 24 hours.',
    category: 'Safety & Reporting'
  },
  {
    id: '8',
    question: 'How do I change my password?',
    answer: 'Go to Settings > Account > Change Password, enter your current password, then your new password twice to confirm.',
    category: 'Account Security'
  },
  {
    id: '9',
    question: 'What should I do if I forgot my password?',
    answer: 'On the login screen, tap "Forgot Password?" and enter your email address. You\'ll receive a reset link to create a new password.',
    category: 'Account Security'
  },
  {
    id: '10',
    question: 'How do I delete my account?',
    answer: 'Go to Settings > Account > Delete Account. Please note that this action is irreversible and will permanently remove all your data.',
    category: 'Account Management'
  },
  {
    id: '11',
    question: 'How do I save a job for later?',
    answer: 'When viewing a job, tap the bookmark icon in the top right corner. You can view all saved jobs in the My Profile tab under "Saved Jobs".',
    category: 'Job Application'
  },
  {
    id: '12',
    question: 'Can I edit my job posting after publishing?',
    answer: 'Yes, go to My Profile > Posted Jobs, find the job you want to edit, tap the three dots menu, and select "Edit". You can modify most details except the job ID.',
    category: 'Job Posting'
  },
  {
    id: '13',
    question: 'How do I know if someone applied to my job?',
    answer: 'You\'ll receive a notification when someone applies. You can also check all applications in My Profile > Posted Jobs > [Job Title] > Applications.',
    category: 'Job Posting'
  },
  {
    id: '14',
    question: 'What should I include in my job application?',
    answer: 'Make sure to include a compelling cover letter, relevant experience, and any portfolio links. Tailor your application to match the job requirements.',
    category: 'Job Application'
  },
  {
    id: '15',
    question: 'How do I update my resume?',
    answer: 'Go to My Profile > Resume, tap the edit icon, and update your information. You can also upload a new PDF resume file.',
    category: 'Profile Management'
  },
  {
    id: '16',
    question: 'How do I manage my notifications?',
    answer: 'Go to Settings > Notifications to customize which notifications you receive. You can toggle job alerts, messages, and application updates.',
    category: 'Account Management'
  },
  {
    id: '17',
    question: 'Can I use the app without an internet connection?',
    answer: 'Some features like viewing saved jobs and your profile work offline, but you\'ll need internet to post jobs, apply, or send messages.',
    category: 'App Usage'
  },
  {
    id: '18',
    question: 'How do I search for specific jobs?',
    answer: 'Use the search bar in the Explore tab. You can search by job title, company, location, or keywords. Use filters to narrow down results.',
    category: 'Job Application'
  },
  {
    id: '19',
    question: 'What payment methods are accepted for premium features?',
    answer: 'We accept all major credit cards, debit cards, and digital wallets like PayPal. Payment is processed securely through our payment partners.',
    category: 'Billing & Subscriptions'
  },
  {
    id: '20',
    question: 'How do I cancel my subscription?',
    answer: 'Go to Settings > Subscription > Manage Subscription, then tap "Cancel Subscription". Your premium features will remain active until the end of your billing period.',
    category: 'Billing & Subscriptions'
  }
];

export default function FAQsScreen() {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useCustomFonts();
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Handle back button
  useBackHandler({
    targetRoute: '/settings'
  });

  const categories = ['All', ...Array.from(new Set(faqData.map(faq => faq.category)))];

  const filteredFAQs = selectedCategory === 'All' 
    ? faqData 
    : faqData.filter(faq => faq.category === selectedCategory);

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

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
        <Text style={styles.title}>Frequently Asked Questions</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Welcome Message */}
      <View style={styles.welcomeMessage}>
        <Ionicons name="help-circle" size={32} color="#8b5cf6" />
        <Text style={styles.welcomeText}>Find answers to common questions</Text>
      </View>

      {/* Category Filter */}
      <View style={styles.categorySection}>
        <Text style={styles.categoryTitle}>Browse by Category</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoryContainer}
          contentContainerStyle={styles.categoryContent}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.categoryButtonActive
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[
                styles.categoryText,
                selectedCategory === category && styles.categoryTextActive
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* FAQs List */}
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.resultsText}>
          {filteredFAQs.length} question{filteredFAQs.length !== 1 ? 's' : ''} found
        </Text>
        
        {filteredFAQs.map((faq) => (
          <View key={faq.id} style={styles.faqItem}>
            <TouchableOpacity
              style={styles.faqQuestion}
              onPress={() => toggleFAQ(faq.id)}
              activeOpacity={0.7}
            >
              <View style={styles.questionContent}>
                <Text style={styles.questionText}>{faq.question}</Text>
                <View style={styles.categoryTag}>
                  <Text style={styles.categoryTagText}>{faq.category}</Text>
                </View>
              </View>
              <View style={styles.expandIcon}>
                <Ionicons
                  name={expandedFAQ === faq.id ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#8b5cf6"
                />
              </View>
            </TouchableOpacity>
            
            {expandedFAQ === faq.id && (
              <View style={styles.faqAnswer}>
                <Text style={styles.answerText}>{faq.answer}</Text>
                <View style={styles.answerFooter}>
                  <Ionicons name="information-circle" size={16} color={colors.textSecondary} />
                  <Text style={styles.answerFooterText}>Tap to collapse</Text>
                </View>
              </View>
            )}
          </View>
        ))}
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
  welcomeMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.cardAlt,
  },
  welcomeText: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 8,
    fontWeight: '500',
  },
  categorySection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  categoryContainer: {
    backgroundColor: colors.cardAlt,
    borderRadius: 12,
  },
  categoryContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.cardAlt,
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryButtonActive: {
    backgroundColor: colors.cardAlt,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  categoryTextActive: {
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  resultsText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  faqItem: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  questionContent: {
    flex: 1,
    marginRight: 16,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 8,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryTagText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  expandIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  faqAnswer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: 'rgba(249, 250, 251, 0.8)',
  },
  answerText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  answerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  answerFooterText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 6,
    fontStyle: 'italic',
  },
});

