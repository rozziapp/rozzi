import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCustomFonts } from '@/hooks/fonts';
import { router } from 'expo-router';
import { useBackHandler } from '@/hooks/useBackHandler';

const { width } = Dimensions.get('window');

interface PricingPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  isCurrent: boolean;
  isPopular?: boolean;
  buttonText: string;
  buttonAction: () => void;
}

export default function SubscriptionScreen() {
  const [fontsLoaded] = useCustomFonts();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showBillingModal, setShowBillingModal] = useState(false);

  // Handle back button
  useBackHandler({
    targetRoute: '/my-profile'
  });

  if (!fontsLoaded) {
    return null;
  }

  const handlePlanSelection = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleUpgrade = (plan: PricingPlan) => {
    Alert.alert(
      'Confirm Purchase',
      `Are you sure you want to upgrade to ${plan.name} for ${plan.price}/${plan.period}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: () => {
            Alert.alert('Success', `Successfully upgraded to ${plan.name}!`);
            router.replace('/my-profile');
          }
        }
      ]
    );
  };

  const handleCurrentPlan = () => {
    Alert.alert('Current Plan', 'You are already on the Free Plan.');
  };

  const handleBillingAction = (action: string) => {
    setShowBillingModal(false);
    switch (action) {
      case 'view-plan':
        Alert.alert('Current Plan', 'You are on the Free Plan with basic features.');
        break;
      case 'payment-history':
        Alert.alert('Payment History', 'No payment history available for free plan.');
        break;
      case 'manage-payment':
        Alert.alert('Payment Method', 'No payment method set up for free plan.');
        break;
      case 'auto-renew':
        Alert.alert('Auto-Renew', 'Auto-renew is not available for free plan.');
        break;
      case 'cancel':
        Alert.alert('Cancel Subscription', 'No active subscription to cancel.');
        break;
    }
  };

  const pricingPlans: PricingPlan[] = [
    {
      id: 'free',
      name: 'Free Plan',
      price: '₹0',
      period: 'month',
      features: [
        '✅ 3 job applies per day',
        '👀 Limited profile visibility',
        '🎯 Basic access only'
      ],
      isCurrent: true,
      buttonText: 'Current Plan',
      buttonAction: handleCurrentPlan
    },
    {
      id: 'job-seeker',
      name: 'Job Seeker Plan',
      price: '₹49',
      period: 'month',
      features: [
        '🔓 Unlimited job applies',
        '📝 Up to 7 job-seeking posts',
        '📈 Higher visibility to recruiters'
      ],
      isCurrent: false,
      buttonText: 'Upgrade',
      buttonAction: () => handleUpgrade(pricingPlans[1])
    },
    {
      id: 'recruiter-plus',
      name: 'Recruiter Plus',
      price: '₹99',
      period: 'month',
      features: [
        '➕ everything in Job Seeker Plan',
        '📌 12 job posts/month (hiring & seeking)',
        '👤 Access to user profile details',
        '🔍 Advanced resume filtering options'
      ],
      isCurrent: false,
      isPopular: true,
      buttonText: 'Upgrade',
      buttonAction: () => handleUpgrade(pricingPlans[2])
    },
    {
      id: 'recruiter-pro',
      name: 'Recruiter Pro',
      price: '₹299',
      period: 'month',
      features: [
        '➕ everything in Recruiter Plus Plan',
        '🚀 30 job posts/month (hiring/seeking)',
        '🏆 Full access to platform features',
        
      ],
      isCurrent: false,
      buttonText: 'Upgrade',
      buttonAction: () => handleUpgrade(pricingPlans[3])
    }
  ];

  const renderPlanCard = (plan: PricingPlan) => {
    const isSelected = selectedPlan === plan.id;
    
    return (
      <TouchableOpacity
        key={plan.id}
        style={[
          styles.planCard,
          plan.isCurrent && styles.currentPlanCardStyle,
          isSelected && styles.selectedPlanCard,
          plan.isPopular && styles.popularPlanCard
        ]}
        onPress={() => handlePlanSelection(plan.id)}
        activeOpacity={0.8}
      >
        {/* Popular Badge */}
        {plan.isPopular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>Most Popular</Text>
          </View>
        )}

        {/* Current Plan Badge */}
        {plan.isCurrent && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>Current Plan</Text>
          </View>
        )}

        {/* Plan Header */}
        <View style={styles.planHeader}>
          <Text style={[
            styles.planName,
            plan.isCurrent && styles.currentPlanName
          ]}>
            {plan.name}
          </Text>
          <View style={styles.priceContainer}>
            <Text style={[
              styles.price,
              plan.isCurrent && styles.currentPrice
            ]}>
              {plan.price}
            </Text>
            <Text style={[
              styles.period,
              plan.isCurrent && styles.currentPeriod
            ]}>
              /{plan.period}
            </Text>
          </View>
        </View>

        {/* Features List */}
        <View style={styles.featuresContainer}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Text style={[
                styles.featureText,
                plan.isCurrent && styles.currentFeatureText
              ]}>
                {feature}
              </Text>
            </View>
          ))}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            plan.isCurrent && styles.currentActionButton,
            isSelected && styles.selectedActionButton
          ]}
          onPress={plan.buttonAction}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.actionButtonText,
            plan.isCurrent && styles.currentActionButtonText
          ]}>
            {plan.buttonText}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

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
        <Text style={styles.title}>Subscription Plans</Text>
        <TouchableOpacity
          style={styles.billingButton}
          onPress={() => setShowBillingModal(true)}
        >
          <Ionicons name="card-outline" size={20} color="#6b46c1" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.headerCard}>
            <Ionicons name="diamond-outline" size={32} color="#6b46c1" />
            <Text style={styles.headerTitle}>Choose Your Plan</Text>
            <Text style={styles.headerSubtitle}>
              Unlock premium features and boost your job search or recruitment success
            </Text>
          </View>
        </View>

        {/* Current Plan Info */}
        <View style={styles.currentPlanSection}>
          <View style={styles.currentPlanInfoCard}>
            <View style={styles.currentPlanIconContainer}>
              <Ionicons name="star" size={24} color="#6b46c1" />
            </View>
            <View style={styles.currentPlanInfoContent}>
              <Text style={styles.currentPlanInfoTitle}>You're currently on the Free Plan</Text>
              <Text style={styles.currentPlanInfoSubtitle}>
                Enjoy basic features and upgrade anytime to unlock premium benefits
              </Text>
            </View>
          </View>
        </View>

        {/* Pricing Plans */}
        <View style={styles.plansSection}>
          {pricingPlans.map(renderPlanCard)}
        </View>

        {/* Additional Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={24} color="#6b7280" />
            <Text style={styles.infoTitle}>What's included?</Text>
            <Text style={styles.infoText}>
              All plans include basic job search functionality, profile creation, and community access. 
              Premium plans unlock advanced features for better job matching and recruitment success.
            </Text>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Can I cancel anytime?</Text>
            <Text style={styles.faqAnswer}>Yes, you can cancel your subscription at any time with no cancellation fees.</Text>
          </View>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>What payment methods are accepted?</Text>
            <Text style={styles.faqAnswer}>We accept all major credit cards, UPI, and digital wallets.</Text>
          </View>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Is there a free trial?</Text>
            <Text style={styles.faqAnswer}>Yes, all premium plans come with a 7-day free trial period.</Text>
          </View>
        </View>
      </ScrollView>

      {/* Billing Modal */}
      <Modal
        visible={showBillingModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBillingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🧾 Subscription & Billing</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowBillingModal(false)}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.billingOptions}>
              <TouchableOpacity
                style={styles.billingOption}
                onPress={() => handleBillingAction('view-plan')}
              >
                <Ionicons name="information-circle-outline" size={20} color="#6b46c1" />
                <Text style={styles.billingOptionText}>View Current Plan</Text>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.billingOption}
                onPress={() => handleBillingAction('payment-history')}
              >
                <Ionicons name="time-outline" size={20} color="#6b46c1" />
                <Text style={styles.billingOptionText}>Payment History</Text>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.billingOption}
                onPress={() => handleBillingAction('manage-payment')}
              >
                <Ionicons name="card-outline" size={20} color="#6b46c1" />
                <Text style={styles.billingOptionText}>Manage Payment Method</Text>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.billingOption}
                onPress={() => handleBillingAction('auto-renew')}
              >
                <Ionicons name="refresh-outline" size={20} color="#6b46c1" />
                <Text style={styles.billingOptionText}>Auto-Renew Toggle</Text>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.billingOption, styles.cancelOption]}
                onPress={() => handleBillingAction('cancel')}
              >
                <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
                <Text style={[styles.billingOptionText, styles.cancelOptionText]}>Cancel Subscription</Text>
                <Ionicons name="chevron-forward" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    paddingTop: 50,
    paddingBottom: 6,
    backgroundColor: '#B0AAD9',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  headerSection: {
    marginBottom: 24,
  },
  headerCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  currentPlanSection: {
    marginBottom: 24,
  },
  currentPlanCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  currentPlanInfoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(107, 70, 193, 0.2)',
  },
  currentPlanIconContainer: {
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentPlanInfoContent: {
    flex: 1,
  },
  currentPlanInfoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  currentPlanInfoSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  currentPlanText: {
    fontSize: 16,
    color: '#065f46',
    fontWeight: '500',
  },
  currentPlanHighlight: {
    fontWeight: '700',
  },
  plansSection: {
    marginBottom: 32,
  },
  planCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    position: 'relative',
  },
  currentPlanCardStyle: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  selectedPlanCard: {
    borderColor: '#6b46c1',
    borderWidth: 2,
    shadowColor: '#6b46c1',
    shadowOpacity: 0.2,
  },
  popularPlanCard: {
    borderColor: '#f59e0b',
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: 20,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  popularBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  currentBadge: {
    position: 'absolute',
    top: -8,
    right: 20,
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  currentBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  planHeader: {
    marginBottom: 20,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  currentPlanName: {
    color: '#065f46',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 32,
    fontWeight: '800',
    color: '#6b46c1',
  },
  currentPrice: {
    color: '#10b981',
  },
  period: {
    fontSize: 16,
    color: '#6b7280',
    marginLeft: 4,
  },
  currentPeriod: {
    color: '#10b981',
  },
  featuresContainer: {
    marginBottom: 24,
  },
  featureItem: {
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 22,
  },
  currentFeatureText: {
    color: '#065f46',
  },
  actionButton: {
    backgroundColor: '#6b46c1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#6b46c1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  currentActionButton: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
  },
  selectedActionButton: {
    backgroundColor: '#5b35b1',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  currentActionButtonText: {
    color: '#fff',
  },
  infoSection: {
    marginBottom: 32,
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  faqSection: {
    marginBottom: 24,
  },
  faqTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  faqItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  billingButton: {
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  closeModalButton: {
    padding: 4,
  },
  billingOptions: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  billingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  billingOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginLeft: 12,
  },
  cancelOption: {
    marginTop: 8,
  },
  cancelOptionText: {
    color: '#ef4444',
  },
}); 
