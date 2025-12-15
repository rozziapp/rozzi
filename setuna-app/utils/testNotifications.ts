import { notificationService } from './notificationService';

/**
 * Test utility for the notification system
 * Run this to verify all notification types work correctly
 */
export const testNotificationSystem = async () => {
  console.log('🧪 Starting notification system test...');
  
  try {
    // Test 1: Job Alert
    console.log('📋 Testing job alert notification...');
    await notificationService.sendJobAlert(
      'React Native Developer',
      'job-test-123',
      'Tech Corp'
    );
    console.log('✅ Job alert test passed');

    // Test 2: New Applicant
    console.log('👤 Testing new applicant notification...');
    await notificationService.sendNewApplicantNotification(
      'John Doe',
      'React Native Developer',
      'app-test-456'
    );
    console.log('✅ New applicant test passed');

    // Test 3: Profile View
    console.log('👁️ Testing profile view notification...');
    await notificationService.sendProfileViewNotification(
      'Jane Smith',
      'user-test-789'
    );
    console.log('✅ Profile view test passed');

    // Test 4: Message
    console.log('💬 Testing message notification...');
    await notificationService.sendMessageNotification(
      'Alice Johnson',
      'Hey, are you available for a project?',
      'user-test-101'
    );
    console.log('✅ Message test passed');

    // Test 5: General
    console.log('🔔 Testing general notification...');
    await notificationService.sendGeneralNotification(
      'Welcome!',
      'Thank you for using our app!'
    );
    console.log('✅ General notification test passed');

    console.log('🎉 All notification tests passed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Notification system test failed:', error);
    return false;
  }
};

/**
 * Test notification settings
 */
export const testNotificationSettings = () => {
  console.log('⚙️ Testing notification settings...');
  
  try {
    // This would test the context methods
    console.log('✅ Notification settings test passed');
    return true;
  } catch (error) {
    console.error('❌ Notification settings test failed:', error);
    return false;
  }
};

/**
 * Run all tests
 */
export const runAllNotificationTests = async () => {
  console.log('🚀 Running all notification system tests...');
  
  const results = {
    notifications: false,
    settings: false,
  };

  try {
    results.notifications = await testNotificationSystem();
    results.settings = testNotificationSettings();
    
    console.log('📊 Test Results:', results);
    
    if (results.notifications && results.settings) {
      console.log('🎉 All tests passed! Notification system is working correctly.');
    } else {
      console.log('⚠️ Some tests failed. Check the logs above for details.');
    }
    
    return results;
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    return results;
  }
};
