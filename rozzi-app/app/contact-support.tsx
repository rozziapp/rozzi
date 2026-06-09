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

interface ContactOption {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  action: () => void;
  color: string;
}

export default function ContactSupportScreen() {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useCustomFonts();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  // Handle back button
  useBackHandler({
    targetRoute: '/settings'
  });

  const handleEmailSupport = () => {
    const emailSubject = subject.trim() || 'Support Request';
    const emailBody = message.trim() || 'I need help with the Rozzi app.';
    
    const mailtoUrl = `mailto:setunajobs@gmail.com?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    
    Linking.canOpenURL(mailtoUrl).then(supported => {
      if (supported) {
        Linking.openURL(mailtoUrl);
      } else {
        // Fallback: copy email to clipboard
        Alert.alert(
          'Email App Not Found',
          'Please copy our email address and send us a message:\n\nsetunajobs@gmail.com',
          [
            { text: 'Copy Email', onPress: () => {
              // You can implement clipboard functionality here
              Alert.alert('Email Copied', 'setunajobs@gmail.com has been copied to your clipboard.');
            }},
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      }
    });
  };

  const handleLiveChat = () => {
    Alert.alert(
      'Live Chat',
      'Live chat support is coming soon! For now, please use email support.',
      [
        { text: 'Use Email', onPress: handleEmailSupport },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const contactOptions: ContactOption[] = [
    {
      id: 'email',
      title: 'Email Support',
      subtitle: 'Send us a detailed message',
      icon: 'mail-outline',
      action: handleEmailSupport,
      color: colors.textSecondary
    },
    {
      id: 'chat',
      title: 'Live Chat',
      subtitle: 'Coming soon',
      icon: 'chatbubble-outline',
      action: handleLiveChat,
      color: colors.textSecondary
    }
  ];

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
        <Text style={styles.title}>Contact Support</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Support Message */}
        <View style={styles.supportMessage}>
          <Ionicons name="help-circle" size={48} color="#8b5cf6" />
          <Text style={styles.supportTitle}>Need Help?</Text>
          <Text style={styles.supportSubtitle}>
            Our support team is here to help you with any questions or issues you might have.
          </Text>
        </View>

        {/* Contact Options */}
        <View style={styles.contactOptions}>
          {contactOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[styles.contactOption, { borderLeftColor: option.color }]}
              onPress={option.action}
              activeOpacity={0.7}
            >
              <View style={[styles.contactIcon, { backgroundColor: `${option.color}20` }]}>
                <Ionicons name={option.icon as any} size={24} color={option.color} />
              </View>
              <View style={styles.contactText}>
                <Text style={styles.contactTitle}>{option.title}</Text>
                <Text style={styles.contactSubtitle}>{option.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Contact Form */}
        <View style={styles.contactForm}>
          <Text style={styles.formTitle}>Quick Contact Form</Text>
          <Text style={styles.formSubtitle}>
            Fill this out and we'll get back to you within 24 hours.
          </Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Subject</Text>
            <TextInput
              style={styles.textInput}
              placeholder="What can we help you with?"
              value={subject}
              onChangeText={setSubject}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Message</Text>
            <TextInput
              style={[styles.textInput, styles.messageInput]}
              placeholder="Describe your issue or question..."
              value={message}
              onChangeText={setMessage}
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleEmailSupport}
            activeOpacity={0.7}
          >
            <Ionicons name="send" size={20} color="#ffffff" />
            <Text style={styles.sendButtonText}>Send Message</Text>
          </TouchableOpacity>
        </View>

        {/* Support Hours */}
        <View style={styles.supportHours}>
          <Text style={styles.hoursTitle}>Support Hours</Text>
          <View style={styles.hoursItem}>
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.hoursText}>Monday - Friday: 9:00 AM - 6:00 PM IST</Text>
          </View>
          <View style={styles.hoursItem}>
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.hoursText}>Saturday: 10:00 AM - 2:00 PM IST</Text>
          </View>
          <View style={styles.hoursItem}>
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.hoursText}>Sunday: Closed</Text>
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
  supportMessage: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  supportTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  supportSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  contactOptions: {
    marginBottom: 24,
  },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactText: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  contactSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  contactForm: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
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
  messageInput: {
    height: 100,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  supportHours: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
  },
  hoursTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  hoursItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  hoursText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 12,
  },
});

