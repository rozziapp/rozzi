import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Modal,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useCustomFonts } from '@/hooks/fonts';
import { router } from 'expo-router';
import { useBackHandler } from '@/hooks/useBackHandler';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import API from '@/utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

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

interface BillingDetails {
  active_plan: string;
  premium_status: boolean;
  subscription_active: boolean;
  expiry_date: string | null;
  subscription_id: string | null;
  payment_history: Array<{
    payment_id: string;
    amount: number;
    status: string;
    created_at: string;
  }>;
}

export default function SubscriptionScreen() {
  const { colors, colorScheme } = useAppTheme();
  const styles = React.useMemo(() => getStyles(colors, colorScheme), [colors, colorScheme]);
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useCustomFonts();
  const { user, reloadUserProfile } = useAuth();
  
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Razorpay WebView states
  const [showCheckoutWebView, setShowCheckoutWebView] = useState(false);
  const [checkoutHTML, setCheckoutHTML] = useState('');
  
  // Billing modal states
  const [billingDetails, setBillingDetails] = useState<BillingDetails | null>(null);
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);

  // Custom Alert state
  const [customAlert, setCustomAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'confirm';
    buttons: Array<{
      text: string;
      style?: 'default' | 'cancel' | 'destructive';
      onPress?: () => void;
    }>;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    buttons: [],
  });

  const showCustomAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' | 'confirm' = 'info',
    buttons?: Array<{ text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }>
  ) => {
    setCustomAlert({
      visible: true,
      title,
      message,
      type,
      buttons: buttons || [{ text: 'OK' }],
    });
  };

  const currentPlanId = user?.profile?.subscription_plan || 'free';

  // Handle back button
  useBackHandler({
    targetRoute: '/my-profile'
  });

  // Fetch billing details whenever billing modal is opened
  useEffect(() => {
    if (showBillingModal) {
      fetchBillingDetails();
    }
  }, [showBillingModal]);

  const fetchBillingDetails = async () => {
    setIsLoadingBilling(true);
    try {
      const response = await API.get('/payments/me/subscription/');
      if (response.status === 200) {
        setBillingDetails(response.data);
      } else {
        console.error('Failed to fetch billing details:', response.data);
      }
    } catch (error) {
      console.error('Error fetching billing details:', error);
    } finally {
      setIsLoadingBilling(false);
    }
  };

  const handlePlanSelection = (planId: string) => {
    setSelectedPlan(planId);
  };

  // Helper to generate the Razorpay payment client HTML
  const getRazorpayCheckoutHTML = (
    keyId: string,
    subId: string,
    planName: string,
    amount: number,
    email: string,
    name: string,
    phone: string
  ) => {
    const description =
      planName === 'seeker_29'
        ? 'Rozzi Seeker 29 Subscription'
        : 'Rozzi Recruiter 99 Subscription';
        
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        <style>
          body {
            background-color: ${colors.background};
            color: ${colors.text};
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
            text-align: center;
          }
          .loader {
            border: 4px solid ${colors.border};
            border-top: 4px solid #8b5cf6;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          h3 {
            margin-bottom: 8px;
            font-weight: 600;
          }
          p {
            font-size: 14px;
            opacity: 0.8;
          }
        </style>
      </head>
      <body>
        <div>
          <div class="loader"></div>
          <h3>Connecting to Razorpay Secure...</h3>
          <p>Please authorize the subscription in the payment popup.</p>
        </div>
        <script>
          var options = {
            "key": "${keyId}",
            "subscription_id": "${subId}",
            "name": "Rozzi App",
            "description": "${description}",
            "theme": {
              "color": "#6b46c1"
            },
            "prefill": {
              "name": "${name}",
              "email": "${email}",
              "contact": "${phone}"
            },
            "handler": function (response) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                event: 'success',
                data: response
              }));
            },
            "modal": {
              "ondismiss": function() {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  event: 'dismissed'
                }));
              }
            }
          };
          
          var rzp = new Razorpay(options);
          
          rzp.on('payment.failed', function (response) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              event: 'failed',
              data: response.error
            }));
          });
          
          window.onload = function() {
            rzp.open();
          };
        </script>
      </body>
      </html>
    `;
  };

  const handleUpgrade = async (plan: PricingPlan) => {
    showCustomAlert(
      'Confirm Subscription',
      `Subscribe to ${plan.name} for ${plan.price}/${plan.period}? (Charged automatically every month)`,
      'confirm',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Subscribe Now', 
          onPress: async () => {
            setIsUpdating(true);
            try {
              // 1. Create Razorpay Subscription via Backend API
              const response = await API.post('/payments/create-subscription/', {
                plan: plan.id
              });
              
              if (response.status === 201) {
                const { subscription_id, razorpay_key, plan_name, amount } = response.data;
                const email = user?.email || '';
                const name = user?.full_name || user?.username || '';
                const phone = user?.phone || '';
                
                // 2. Generate and open payment WebView
                const html = getRazorpayCheckoutHTML(
                  razorpay_key,
                  subscription_id,
                  plan_name,
                  amount,
                  email,
                  name,
                  phone
                );
                
                setCheckoutHTML(html);
                setShowCheckoutWebView(true);
              } else {
                showCustomAlert('Error', response.data?.error || 'Failed to initialize subscription checkout. Please try again.', 'error');
              }
            } catch (error: any) {
              console.error('Error starting subscription flow:', error);
              showCustomAlert('Error', error.response?.data?.error || 'Could not connect to payment gateway.', 'error');
            } finally {
              setIsUpdating(false);
            }
          }
        }
      ]
    );
  };

  const handleCancelSubscription = () => {
    showCustomAlert(
      'Cancel Subscription',
      'Are you sure you want to cancel your premium subscription? AutoPay will be stopped immediately and premium auto-renewal will end, but you will keep premium benefits until the end of your current billing cycle.',
      'confirm',
      [
        { text: 'Keep Premium', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: async () => {
            setIsUpdating(true);
            setShowBillingModal(false);
            try {
              const response = await API.post('/payments/cancel-subscription/');
              if (response.status === 200) {
                await reloadUserProfile();
                showCustomAlert('Subscription Cancelled', 'Your subscription has been cancelled. You will continue to have premium access until the end of your current billing cycle.', 'success');
              } else {
                showCustomAlert('Error', response.data?.error || 'Failed to cancel subscription.', 'error');
              }
            } catch (error) {
              console.error('Error cancelling subscription:', error);
              showCustomAlert('Error', 'An error occurred while communicating with the cancellation service.', 'error');
            } finally {
              setIsUpdating(false);
            }
          }
        }
      ]
    );
  };

  const handleSyncStatus = async () => {
    setIsUpdating(true);
    try {
      await reloadUserProfile();
      if (showBillingModal) {
        await fetchBillingDetails();
      }
      showCustomAlert('Status Restored', 'Subscription status successfully validated and synced.', 'success');
    } catch (e) {
      showCustomAlert('Error', 'Failed to refresh status. Please try again.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const pricingPlans: PricingPlan[] = [
    {
      id: 'free',
      name: 'Free Plan',
      price: '₹0',
      period: 'month',
      features: [
        '📌 1 active job post',
        '📝 1 active job seeking post',
        '⚡ Apply up to 3 jobs per day',
        '🔄 Daily limit resets at 12:00 AM IST'
      ],
      isCurrent: currentPlanId === 'free',
      buttonText: currentPlanId === 'free' ? 'Current Plan' : 'Select Free',
      buttonAction: () => {} // Free is default
    },
    {
      id: 'seeker_29',
      name: 'Seeker 29',
      price: '₹29',
      period: 'month',
      features: [
        '🔓 Unlimited job applications',
        '📝 Up to 3 active job seeking posts',
        '🚀 40% job-seeking recommendation boost',
        '📌 1 active job post'
      ],
      isCurrent: currentPlanId === 'seeker_29',
      buttonText: currentPlanId === 'seeker_29' ? 'Current Plan' : 'Subscribe Seeker 29',
      buttonAction: () => currentPlanId !== 'seeker_29' && handleUpgrade({ id: 'seeker_29', name: 'Seeker 29', price: '₹29', period: 'month' } as any)
    },
    {
      id: 'recruiter_99',
      name: 'Recruiter 99',
      price: '₹99',
      period: 'month',
      features: [
        '📌 Unlimited active job posts',
        '🚀 40% job-posting recommendation boost',
        '📝 Up to 3 active job seeking posts',
        '🔓 Unlimited job applications',
        '🚀 40% job-seeking recommendation boost'
      ],
      isCurrent: currentPlanId === 'recruiter_99',
      isPopular: true,
      buttonText: currentPlanId === 'recruiter_99' ? 'Current Plan' : 'Subscribe Recruiter 99',
      buttonAction: () => currentPlanId !== 'recruiter_99' && handleUpgrade({ id: 'recruiter_99', name: 'Recruiter 99', price: '₹99', period: 'month' } as any)
    }
  ].filter(plan => {
    // If the user has recruiter_99, hide the seeker_29 option as they don't need a downgrade option here
    if (currentPlanId === 'recruiter_99' && plan.id === 'seeker_29') {
      return false;
    }
    return true;
  });

  if (!fontsLoaded) {
    return null;
  }

  const renderPlanCard = (plan: PricingPlan) => {
    const isSelected = selectedPlan === plan.id;
    const isPendingCancel = plan.isCurrent && plan.id !== 'free' && !user?.profile?.subscription_active;
    
    return (
      <TouchableOpacity
        key={plan.id}
        style={[
          styles.planCard,
          plan.isCurrent && (
            isPendingCancel 
              ? [styles.currentPlanCardStyle, { borderColor: '#f59e0b', backgroundColor: colorScheme === 'dark' ? 'rgba(245, 158, 11, 0.04)' : 'rgba(245, 158, 11, 0.03)' }]
              : styles.currentPlanCardStyle
          ),
          isSelected && styles.selectedPlanCard,
          plan.isPopular && styles.popularPlanCard
        ]}
        onPress={() => handlePlanSelection(plan.id)}
        activeOpacity={0.8}
      >
        {/* Popular Badge */}
        {plan.isPopular && (
          <View style={[
            styles.popularBadge,
            plan.isCurrent && { right: 120 }
          ]}>
            <Text style={styles.popularBadgeText}>Most Popular</Text>
          </View>
        )}

        {/* Current Plan Badge */}
        {plan.isCurrent && (
          isPendingCancel ? (
            <View style={[styles.currentBadge, { backgroundColor: '#f59e0b' }]}>
              <Text style={styles.currentBadgeText}>Ends Soon</Text>
            </View>
          ) : (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>Active Plan</Text>
            </View>
          )
        )}

        {/* Plan Header */}
        <View style={styles.planHeader}>
          <Text style={[
            styles.planName,
            plan.isCurrent && (
              isPendingCancel
                ? [styles.currentPlanName, { color: '#f59e0b' }]
                : styles.currentPlanName
            )
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
        {plan.id !== 'free' && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              plan.isCurrent ? styles.currentActionButton : styles.upgradeActionButton,
              isSelected && !plan.isCurrent && styles.selectedActionButton,
              { overflow: 'hidden', paddingVertical: 0 }
            ]}
            onPress={plan.buttonAction}
            disabled={plan.isCurrent}
            activeOpacity={0.7}
          >
            {plan.isCurrent ? (
              <View style={styles.actionButtonInner}>
                <Text style={styles.currentActionButtonText}>{plan.buttonText}</Text>
              </View>
            ) : (
              <LinearGradient
                colors={['#8b5cf6', '#6b46c1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionButtonGradient}
              >
                <Text style={styles.upgradeActionButtonText}>{plan.buttonText}</Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        style="light"
        backgroundColor={colorScheme === 'dark' ? colors.card : '#6b46c1'}
        animated={true}
      />

      {/* Top Bar */}
      <LinearGradient
        colors={colorScheme === 'dark' ? [colors.card, colors.card] : ['#7c3aed', '#6b46c1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.topBar, { paddingTop: Math.max(insets.top + 6, 50) }]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colorScheme === 'dark' ? colors.text : '#ffffff'} />
        </TouchableOpacity>
        <Text style={styles.title}>Subscription Plans</Text>
        <TouchableOpacity
          style={styles.billingButton}
          onPress={() => setShowBillingModal(true)}
        >
          <Ionicons name="card-outline" size={24} color={colorScheme === 'dark' ? '#9f7aea' : '#ffffff'} />
        </TouchableOpacity>
      </LinearGradient>

      {isUpdating && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6b46c1" />
          <Text style={styles.loadingText}>Updating plan metadata...</Text>
        </View>
      )}

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.headerCard}>
            <Ionicons name="diamond" size={36} color={colors.primary} style={{ marginBottom: 4 }} />
            <Text style={styles.headerTitle}>Choose Your Plan</Text>
            <Text style={styles.headerSubtitle}>
              Unlock recurring premium features and boost your job search or recruitment success automatically.
            </Text>
          </View>
        </View>

        {/* Current Plan Info */}
        <View style={styles.currentPlanSection}>
          <View style={styles.currentPlanInfoCard}>
            <View style={styles.currentPlanIconContainer}>
              <Ionicons name="star" size={24} color={colors.primary} />
            </View>
            <View style={styles.currentPlanInfoContent}>
              <Text style={styles.currentPlanInfoTitle}>
                Active: {currentPlanId === 'free' ? 'Free Plan' : currentPlanId === 'seeker_29' ? 'Seeker 29' : 'Recruiter 99'}
              </Text>
              <Text style={styles.currentPlanInfoSubtitle}>
                {currentPlanId === 'free' 
                  ? 'Enjoy basic features and upgrade anytime to unlock premium benefits.'
                  : 'Recurring premium membership is active. Autopay is configured monthly.'}
              </Text>
            </View>
          </View>
          {currentPlanId !== 'free' && (
            <TouchableOpacity 
              style={styles.manageSubscriptionMainBtn}
              onPress={() => setShowBillingModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="settings-outline" size={16} color={colors.primary} />
              <Text style={styles.manageSubscriptionMainBtnText}>Manage AutoPay & Billing Details</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Pricing Plans */}
        <View style={styles.plansSection}>
          {pricingPlans.map(renderPlanCard)}
        </View>

        {/* Additional Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={24} color={colors.textSecondary} />
            <Text style={styles.infoTitle}>Autopay Recurring Billing</Text>
            <Text style={styles.infoText}>
              All premium upgrades are set up as recurring monthly subscriptions. 
              Payment methods supported include UPI AutoPay (Google Pay, PhonePe, Paytm), Cards, and Netbanking.
              Subscriptions auto-renew every month until cancelled.
            </Text>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Can I cancel my subscription?</Text>
            <Text style={styles.faqAnswer}>Yes. You can cancel your monthly subscription at any time. Simply tap {"\""}Manage AutoPay & Billing Details{"\""} below your active plan (or the card icon at the top right) and press {"\""}Cancel Subscription{"\""}. AutoPay will be stopped immediately.</Text>
          </View>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>What happens when I cancel?</Text>
            <Text style={styles.faqAnswer}>Your premium benefits will stop immediately and you will be downgraded back to the Free plan with appropriate posting limits.</Text>
          </View>
        </View>
      </ScrollView>

      {/* Razorpay Checkout WebView Modal */}
      <Modal
        visible={showCheckoutWebView}
        animationType="slide"
        onRequestClose={() => {
          showCustomAlert('Cancel Payment', 'Are you sure you want to exit checkout?', 'confirm', [
            { text: 'No' },
            { text: 'Yes, Exit', onPress: () => setShowCheckoutWebView(false) }
          ]);
        }}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <LinearGradient
            colors={colorScheme === 'dark' ? [colors.card, colors.card] : ['#7c3aed', '#6b46c1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.topBar, { paddingTop: Math.max(insets.top + 6, 20) }]}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                showCustomAlert('Cancel Payment', 'Are you sure you want to exit checkout?', 'confirm', [
                  { text: 'No' },
                  { text: 'Yes, Exit', onPress: () => setShowCheckoutWebView(false) }
                ]);
              }}
            >
              <Ionicons name="close" size={24} color={colorScheme === 'dark' ? colors.text : '#ffffff'} />
            </TouchableOpacity>
            <Text style={styles.title}>Secure Subscription Checkout</Text>
            <View style={{ width: 24 }} />
          </LinearGradient>
          <WebView
            source={{ html: checkoutHTML }}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onMessage={async (event) => {
              try {
                const res = JSON.parse(event.nativeEvent.data);
                if (res.event === 'success') {
                  setShowCheckoutWebView(false);
                  showCustomAlert('Subscription Activated', 'Payment authenticated successfully! Your premium features are unlocked.', 'success', [
                    {
                      text: 'Awesome',
                      onPress: async () => {
                        setIsUpdating(true);
                        try {
                          await reloadUserProfile();
                        } catch (e) {
                          console.error(e);
                        } finally {
                          setIsUpdating(false);
                        }
                      }
                    }
                  ]);
                } else if (res.event === 'failed') {
                  setShowCheckoutWebView(false);
                  showCustomAlert('Payment Failed', res.data?.description || 'Your transaction could not be completed.', 'error');
                } else if (res.event === 'dismissed') {
                  setShowCheckoutWebView(false);
                }
              } catch (e) {
                console.error('Error handling webview callback:', e);
              }
            }}
            onShouldStartLoadWithRequest={(request) => {
              const { url } = request;
              // Handle native deep linking schemes for UPI apps
              if (!url.startsWith('http://') && !url.startsWith('https://')) {
                Linking.openURL(url).catch((err) => {
                  showCustomAlert('App Not Installed', 'Please make sure the selected payment application is installed on your device.', 'error');
                });
                return false;
              }
              return true;
            }}
            style={{ flex: 1 }}
          />
        </View>
      </Modal>

      {/* Subscription & Billing Details Modal */}
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
              <View style={{ flexDirection: 'row', gap: 14 }}>
                <TouchableOpacity onPress={handleSyncStatus} style={{ padding: 4 }}>
                  <Ionicons name="sync" size={22} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.closeModalButton}
                  onPress={() => setShowBillingModal(false)}
                >
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
            
            {isLoadingBilling ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#6b46c1" />
                <Text style={styles.modalLoadingText}>Loading billing records...</Text>
              </View>
            ) : (
              <ScrollView 
                style={styles.modalScrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
              >
                {/* Active Plan Card */}
                <View style={styles.billingStatusCard}>
                  <Text style={styles.billingStatusLabel}>CURRENT MEMBERSHIP</Text>
                  <Text style={styles.billingStatusValue}>
                    {billingDetails?.active_plan === 'free' ? 'Free Plan' : billingDetails?.active_plan === 'seeker_29' ? 'Seeker 29 (₹29/month)' : 'Recruiter 99 (₹99/month)'}
                  </Text>
                  
                  {billingDetails?.active_plan !== 'free' && (
                    <View style={styles.billingSubDetails}>
                      <View style={styles.subDetailRow}>
                        <Ionicons name="key-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.subDetailText}>Subscription ID: {billingDetails?.subscription_id}</Text>
                      </View>
                      <View style={styles.subDetailRow}>
                        <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.subDetailText}>
                          {billingDetails?.subscription_active ? 'Next Billing Date:' : 'Expires On:'} {formatDate(billingDetails?.expiry_date)}
                        </Text>
                      </View>
                      <View style={styles.subDetailRow}>
                        <Ionicons 
                          name={billingDetails?.subscription_active ? "checkmark-circle" : "close-circle"} 
                          size={14} 
                          color={billingDetails?.subscription_active ? colors.success : "#ef4444"} 
                        />
                        <Text style={[
                          styles.subDetailText, 
                          { color: billingDetails?.subscription_active ? colors.success : "#ef4444", fontWeight: '600' }
                        ]}>
                          {billingDetails?.subscription_active ? "AutoPay Active (Recurring)" : "Cancellation Pending (Expires soon)"}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Cancellation trigger */}
                {billingDetails?.active_plan !== 'free' && billingDetails?.subscription_active && (
                  <TouchableOpacity
                    style={styles.cancelSubscriptionBtn}
                    onPress={handleCancelSubscription}
                  >
                    <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
                    <Text style={styles.cancelSubscriptionBtnText}>Cancel Subscription</Text>
                  </TouchableOpacity>
                )}

                {/* Transaction history logs */}
                <Text style={styles.historySectionTitle}>Payment Timeline</Text>
                {billingDetails?.payment_history && billingDetails.payment_history.length > 0 ? (
                  <View style={styles.historyList}>
                    {billingDetails.payment_history.map((payment, index) => (
                      <View key={payment.payment_id || index} style={styles.historyItem}>
                        <View style={styles.historyItemLeft}>
                          <Text style={styles.historyItemAmount}>₹{payment.amount}</Text>
                          <Text style={styles.historyItemDate}>{formatDate(payment.created_at)}</Text>
                        </View>
                        <View style={styles.historyItemRight}>
                          <View style={[
                            styles.statusBadge, 
                            payment.status === 'captured' || payment.status === 'success' ? styles.statusBadgeSuccess : styles.statusBadgeFailed
                          ]}>
                            <Text style={[
                              styles.statusBadgeText,
                              payment.status === 'captured' || payment.status === 'success' ? styles.statusBadgeTextSuccess : styles.statusBadgeTextFailed
                            ]}>
                              {payment.status === 'captured' || payment.status === 'success' ? 'SUCCESS' : 'FAILED'}
                            </Text>
                          </View>
                          <Text style={styles.historyItemRef}>Ref: {payment.payment_id}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyHistoryCard}>
                    <Ionicons name="receipt-outline" size={28} color={colors.textSecondary} style={{ marginBottom: 8 }} />
                    <Text style={styles.emptyHistoryText}>No past billing invoices recorded.</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Custom Themed Alert Modal */}
      <Modal
        visible={customAlert.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCustomAlert(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertCard}>
            <View style={[
              styles.alertIconBg,
              customAlert.type === 'success' && styles.alertIconBgSuccess,
              customAlert.type === 'error' && styles.alertIconBgError,
              customAlert.type === 'confirm' && styles.alertIconBgConfirm,
            ]}>
              <Ionicons 
                name={
                  customAlert.type === 'success' ? 'checkmark-circle' :
                  customAlert.type === 'error' ? 'close-circle' :
                  customAlert.type === 'confirm' ? 'help-circle' : 'information-circle'
                } 
                size={38} 
                color={
                  customAlert.type === 'success' ? colors.success :
                  customAlert.type === 'error' ? '#ef4444' :
                  colors.primary
                } 
              />
            </View>

            <Text style={styles.alertTitle}>{customAlert.title}</Text>
            <Text style={styles.alertMessage}>{customAlert.message}</Text>

            <View style={[
              styles.alertButtonsContainer,
              customAlert.buttons.length > 2 && { flexDirection: 'column' }
            ]}>
              {customAlert.buttons.map((btn, index) => {
                const isDestructive = btn.style === 'destructive';
                const isCancel = btn.style === 'cancel';
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.alertButton,
                      isDestructive && styles.alertButtonDestructive,
                      isCancel && styles.alertButtonCancel,
                      !isDestructive && !isCancel && styles.alertButtonPrimary,
                      customAlert.buttons.length > 2 && { width: '100%', marginBottom: 8 }
                    ]}
                    onPress={() => {
                      setCustomAlert(prev => ({ ...prev, visible: false }));
                      if (btn.onPress) btn.onPress();
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.alertButtonText,
                      isCancel && styles.alertButtonTextCancel,
                      !isCancel && styles.alertButtonTextPrimary
                    ]}>
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: any, colorScheme: 'light' | 'dark') => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: colorScheme === 'dark' ? colors.card : colors.primary,
    borderBottomWidth: colorScheme === 'dark' ? 1 : 0,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: colorScheme === 'dark' ? 0 : 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: colorScheme === 'dark' ? colors.text : '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  headerSection: {
    marginTop: 16,
    marginBottom: 20,
  },
  headerCard: {
    backgroundColor: colorScheme === 'dark' ? colors.card : 'rgba(107, 70, 193, 0.03)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: colorScheme === 'dark' ? 0.2 : 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? colors.border : 'rgba(107, 70, 193, 0.15)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  currentPlanSection: {
    marginBottom: 20,
  },
  currentPlanInfoCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currentPlanIconContainer: {
    backgroundColor: colorScheme === 'dark' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(107, 70, 193, 0.1)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentPlanInfoContent: {
    flex: 1,
  },
  currentPlanInfoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  currentPlanInfoSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  plansSection: {
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: colorScheme === 'dark' ? 0.2 : 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  currentPlanCardStyle: {
    borderColor: colors.success,
    borderWidth: 2,
    backgroundColor: colorScheme === 'dark' ? 'rgba(52, 211, 153, 0.04)' : 'rgba(16, 185, 129, 0.03)',
  },
  selectedPlanCard: {
    borderColor: colors.primary,
    borderWidth: 2.5,
  },
  popularPlanCard: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 24,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  popularBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  currentBadge: {
    position: 'absolute',
    top: -10,
    right: 24,
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  planHeader: {
    marginBottom: 16,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  currentPlanName: {
    color: colors.success,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
  },
  currentPrice: {
    color: colors.text,
  },
  period: {
    fontSize: 15,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  currentPeriod: {
    color: colors.textSecondary,
  },
  featuresContainer: {
    marginBottom: 20,
  },
  featureItem: {
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 18,
  },
  currentFeatureText: {
    color: colors.text,
  },
  actionButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  upgradeActionButton: {
    backgroundColor: colors.primary,
  },
  selectedActionButton: {
    backgroundColor: colors.tint,
  },
  currentActionButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.success,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  upgradeActionButtonText: {
    color: '#fff',
  },
  currentActionButtonText: {
    color: colors.success,
  },
  infoSection: {
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 6,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  faqSection: {
    marginBottom: 24,
  },
  faqTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 14,
  },
  faqItem: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  faqAnswer: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  billingButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 24,
    maxHeight: '80%',
    minHeight: '40%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  closeModalButton: {
    padding: 4,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
  },
  modalLoading: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  billingStatusCard: {
    backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#f3f4f6',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  billingStatusLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  billingStatusValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  billingSubDetails: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb',
    paddingTop: 10,
  },
  subDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subDetailText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  cancelSubscriptionBtn: {
    backgroundColor: colorScheme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginBottom: 24,
  },
  cancelSubscriptionBtnText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
  },
  historySectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  historyList: {
    gap: 12,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f9fafb',
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyItemLeft: {
    gap: 2,
  },
  historyItemAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  historyItemDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  historyItemRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  historyItemRef: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  statusBadgeFailed: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadgeTextSuccess: {
    color: colors.success,
  },
  statusBadgeTextFailed: {
    color: '#ef4444',
  },
  emptyHistoryCard: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHistoryText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colorScheme === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  actionButtonInner: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  actionButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderRadius: 12,
  },
  manageSubscriptionMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colorScheme === 'dark' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(107, 70, 193, 0.05)',
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(107, 70, 193, 0.12)',
  },
  manageSubscriptionMainBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colorScheme === 'dark' ? '#9f7aea' : colors.primary,
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    width: '85%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: colorScheme === 'dark' ? 0.4 : 0.15,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  alertIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: colorScheme === 'dark' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(107, 70, 193, 0.08)',
  },
  alertIconBgSuccess: {
    backgroundColor: colorScheme === 'dark' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(16, 185, 129, 0.08)',
  },
  alertIconBgError: {
    backgroundColor: colorScheme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)',
  },
  alertIconBgConfirm: {
    backgroundColor: colorScheme === 'dark' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(107, 70, 193, 0.08)',
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  alertButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  alertButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertButtonPrimary: {
    backgroundColor: colors.primary,
  },
  alertButtonCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  alertButtonDestructive: {
    backgroundColor: '#ef4444',
  },
  alertButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  alertButtonTextPrimary: {
    color: '#ffffff',
  },
  alertButtonTextCancel: {
    color: colors.textSecondary,
  },
});
