// Subscription utility functions

export type SubscriptionPlan = 'free' | 'job-seeker' | 'recruiter-plus' | 'recruiter-pro';

export interface SubscriptionFeatures {
  // Job posting limits
  maxJobPosts: number;
  maxJobApplies: number;
  
  // Premium features
  canBulkDownloadResumes: boolean;
  canSelectMultipleApplicants: boolean;
  canViewUserProfiles: boolean;
  hasAdvancedFiltering: boolean;
  
  // Access levels
  hasFullPlatformAccess: boolean;
}

// Mock storage for testing (in real app, this would be AsyncStorage or API)
let currentPlan: SubscriptionPlan = 'free';

// Get current user's subscription plan (mock implementation)
export const getCurrentSubscriptionPlan = (): SubscriptionPlan => {
  // In a real app, this would fetch from API/AsyncStorage
  return currentPlan;
};

// Set subscription plan (for testing purposes)
export const setSubscriptionPlan = (plan: SubscriptionPlan): void => {
  currentPlan = plan;
  console.log(`🔄 Subscription plan changed to: ${getPlanDisplayName(plan)}`);
  
  // Log available features for debugging
  const features = getSubscriptionFeatures(plan);
  console.log(`📋 Available features:`, {
    bulkDownload: features.canBulkDownloadResumes,
    multiSelect: features.canSelectMultipleApplicants,
    viewProfiles: features.canViewUserProfiles,
    advancedFiltering: features.hasAdvancedFiltering
  });
};

// Get features available for a subscription plan
export const getSubscriptionFeatures = (plan: SubscriptionPlan): SubscriptionFeatures => {
  switch (plan) {
    case 'free':
      return {
        maxJobPosts: 1,
        maxJobApplies: 3,
        canBulkDownloadResumes: false,
        canSelectMultipleApplicants: false,
        canViewUserProfiles: false,
        hasAdvancedFiltering: false,
        hasFullPlatformAccess: false,
      };
      
    case 'job-seeker':
      return {
        maxJobPosts: 7,
        maxJobApplies: -1, // unlimited
        canBulkDownloadResumes: false,
        canSelectMultipleApplicants: false,
        canViewUserProfiles: false,
        hasAdvancedFiltering: false,
        hasFullPlatformAccess: false,
      };
      
    case 'recruiter-plus':
      return {
        maxJobPosts: 12,
        maxJobApplies: -1, // unlimited
        canBulkDownloadResumes: false,
        canSelectMultipleApplicants: false, // single selection only
        canViewUserProfiles: true,
        hasAdvancedFiltering: true,
        hasFullPlatformAccess: false,
      };
      
    case 'recruiter-pro':
      return {
        maxJobPosts: 30,
        maxJobApplies: -1, // unlimited
        canBulkDownloadResumes: true,
        canSelectMultipleApplicants: true,
        canViewUserProfiles: true,
        hasAdvancedFiltering: true,
        hasFullPlatformAccess: true,
      };
      
    default:
      return getSubscriptionFeatures('free');
  }
};

// Get current user's subscription features
export const getCurrentSubscriptionFeatures = (): SubscriptionFeatures => {
  const currentPlan = getCurrentSubscriptionPlan();
  return getSubscriptionFeatures(currentPlan);
};

// Check if user has access to a specific feature
export const hasFeatureAccess = (feature: keyof SubscriptionFeatures): boolean => {
  const features = getCurrentSubscriptionFeatures();
  return features[feature] as boolean;
};

// Get plan name for display
export const getPlanDisplayName = (plan: SubscriptionPlan): string => {
  switch (plan) {
    case 'free':
      return 'Free Plan';
    case 'job-seeker':
      return 'Job Seeker Plan';
    case 'recruiter-plus':
      return 'Recruiter Plus';
    case 'recruiter-pro':
      return 'Recruiter Pro';
    default:
      return 'Unknown Plan';
  }
};

// Get upgrade suggestions for locked features
export const getUpgradeMessage = (feature: keyof SubscriptionFeatures): string => {
  switch (feature) {
    case 'canBulkDownloadResumes':
      return 'Upgrade to Recruiter Pro to download all resumes at once!';
    case 'canSelectMultipleApplicants':
      return 'Upgrade to Recruiter Pro to hire multiple applicants at once!';
    case 'canViewUserProfiles':
      return 'Upgrade to Recruiter Plus or Pro to view detailed user profiles!';
    case 'hasAdvancedFiltering':
      return 'Upgrade to Recruiter Plus or Pro for advanced filtering options!';
    default:
      return 'Upgrade your plan to unlock this premium feature!';
  }
};
