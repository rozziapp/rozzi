import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  Linking,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCustomFonts } from '@/hooks/fonts';
import { router, useLocalSearchParams } from 'expo-router';
import { useBackHandler } from '@/hooks/useBackHandler';
import { useAuth } from '@/contexts/AuthContext';
import ProfilePicture from '@/components/ProfilePicture';
import API from '@/utils/api';
import { openBrowserAsync } from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { 
  getCurrentSubscriptionFeatures, 
  hasFeatureAccess, 
  getCurrentSubscriptionPlan,
  getUpgradeMessage,
  getPlanDisplayName 
} from '@/utils/subscription';

// Interface for job data
interface JobDetails {
  id: number;
  title: string;
  description: string;
  salary_min?: number;
  salary_max?: number;
  location: string;
  post_type: string;
  job_type: string;
  category: string;
  sector: string;
  experience_level: string;
  shift_timing: string;
  state: string;
  city: string;
  address: string;
  pincode: string;
  skills: string[];
  custom_fields?: {
    question: string;
    answer: 'yes' | 'no';
  }[];
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    username: string;
    full_name: string;
    profile_picture?: string;
  };
  status: string;
  applicants_count: number;
  is_remote?: boolean;
}

// Interface for applicant data
interface Applicant {
  id: number;
  user: {
    id: number;
    username: string;
    full_name: string;
    profile_picture?: string;
  };
  cover_letter: string;
  applied_date: string;
  status: string;
  custom_field_answers?: {
    question: string;
    answer: 'yes' | 'no';
  }[];
  id_card?: {
    id: number;
    name: string;
    gender: string;
    date_of_birth: string;
    nationality: string;
    address: string;
    phone_number?: string;
    skills: string[];
    photo?: string;
    age?: number;
  };
  resume?: {
    id: number;
    file_name: string;
    file_url: string;
    file_size: number;
    uploaded_at: string;
  };
}

// Enhanced time formatting for better readability
const formatTimeDisplay = (createdAt: string): string => {
  const now = new Date();
  const created = new Date(createdAt);
  const diffInMs = now.getTime() - created.getTime();
  
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  
  // For very recent notifications (within last hour), show more precise time
  if (diffInMinutes < 60) {
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 5) {
      return `${diffInMinutes} min ago`;
    } else if (diffInMinutes < 30) {
      return `${diffInMinutes} min ago`;
    } else {
      return `${diffInMinutes} min ago`;
    }
  }
  
  // For today's notifications, show time
  if (diffInDays < 1) {
    if (diffInHours < 2) {
      return `${diffInHours} hour ago`;
    } else {
      return `${diffInHours} hours ago`;
    }
  }
  
  // For older notifications, show date
  if (diffInDays === 1) {
    return 'Yesterday';
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  } else {
    const years = Math.floor(diffInDays / 365);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  }
};

// Function to create local notifications
const createLocalNotification = async (notificationData: {
  recipient: number;
  notification_type: string;
  title: string;
  message: string;
  related_job?: number;
  created_at: string;
  applicant: Applicant; // The applicant receiving the notification
  jobPoster: { // The person who created the job post (hiring)
    id: number;
    username: string;
    full_name: string;
    profile_picture?: string;
  };
}) => {
  try {
    // Get existing notifications from AsyncStorage
    const existingNotifications = await AsyncStorage.getItem('localNotifications');
    const notifications = existingNotifications ? JSON.parse(existingNotifications) : [];
    
    // Calculate real time difference
    const timeAgo = formatTimeDisplay(notificationData.created_at);
    
    // Create new notification with job poster as sender and applicant as recipient
    const newNotification = {
      id: Date.now() + Math.random(), // Simple unique ID
      sender: { // Job poster (person hiring) - this will show in the notification
        id: notificationData.jobPoster.id,
        username: notificationData.jobPoster.username,
        full_name: notificationData.jobPoster.full_name,
        profile_picture: notificationData.jobPoster.profile_picture
      },
      recipient: { // Applicant receiving the notification
        id: notificationData.recipient,
        username: notificationData.applicant.user.username,
        full_name: notificationData.applicant.user.full_name,
        profile_picture: notificationData.applicant.user.profile_picture
      },
      notification_type: notificationData.notification_type,
      title: notificationData.title,
      message: notificationData.message,
      related_job: notificationData.related_job,
      related_application: null,
      related_hire_request: null,
      read: false,
      created_at: notificationData.created_at,
      time_ago: timeAgo
    };
    
    // Add to beginning of array (newest first)
    notifications.unshift(newNotification);
    
    // Store back to AsyncStorage
    await AsyncStorage.setItem('localNotifications', JSON.stringify(notifications));
    
    console.log('✅ Local notification created:', newNotification);
    console.log('👤 Sender (Job Poster):', newNotification.sender);
    console.log('👥 Recipient (Applicant):', newNotification.recipient);
    console.log('⏰ Time ago:', timeAgo);
    return newNotification;
  } catch (error) {
    console.error('❌ Error creating local notification:', error);
    throw error;
  }
};

export default function JobDetailsScreen() {
  const [fontsLoaded] = useCustomFonts();
  const { user, isAuthenticated } = useAuth();
  const params = useLocalSearchParams();
  
  // Get job ID from navigation params
  const jobId = params.jobId as string;
  
  // State management
  const [loading, setLoading] = useState(true);
  const [jobDetails, setJobDetails] = useState<JobDetails | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [filteredApplicants, setFilteredApplicants] = useState<Applicant[]>([]);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [showApplicantModal, setShowApplicantModal] = useState(false);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  
  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'date_asc' | 'date_desc' | 'name_asc' | 'name_desc' | 'status'>('date_desc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'under_review' | 'shortlisted' | 'accepted' | 'rejected'>('all');

  // Premium features state
  const [selectedApplicants, setSelectedApplicants] = useState<Set<number>>(new Set());
  const [showHireModal, setShowHireModal] = useState(false);
  const [showShortlistModal, setShowShortlistModal] = useState(false);
  const [showCloseJobModal, setShowCloseJobModal] = useState(false);
  const [isHiring, setIsHiring] = useState(false);
  const [isShortlisting, setIsShortlisting] = useState(false);
  const [isClosingJob, setIsClosingJob] = useState(false);
  const [downloadingResumes, setDownloadingResumes] = useState(false);
  const [actionType, setActionType] = useState<'hire' | 'shortlist' | null>(null);
  const [hasShortlisted, setHasShortlisted] = useState(false);
  const [resumeFileStatus, setResumeFileStatus] = useState<{[key: string]: 'accessible' | 'inaccessible' | 'checking'}>({});

  // Get subscription features
  const subscriptionFeatures = getCurrentSubscriptionFeatures();
  const currentPlan = getCurrentSubscriptionPlan();

  // Handle back button
  useBackHandler({
    targetRoute: '/posted-jobs'
  });

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated]);

  // Fetch job details and applicants
  useEffect(() => {
    if (jobId && isAuthenticated) {
      fetchJobDetails();
      fetchApplicants();
    }
  }, [jobId, isAuthenticated]);

  // Check if there are already shortlisted applicants and clean up selected applicants
  useEffect(() => {
    if (applicants.length > 0) {
      const hasShortlistedApplicants = applicants.some(app => app.status.toLowerCase() === 'shortlisted');
      setHasShortlisted(hasShortlistedApplicants);
      
      // Remove any accepted applicants from selection since they can't be selected
      const acceptedApplicantIds = applicants
        .filter(app => app.status.toLowerCase() === 'accepted')
        .map(app => app.id);
      
      if (acceptedApplicantIds.length > 0) {
        setSelectedApplicants(prev => {
          const newSelected = new Set(prev);
          acceptedApplicantIds.forEach(id => newSelected.delete(id));
          return newSelected;
        });
      }
    }
  }, [applicants]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/jobs/${jobId}/`);
      setJobDetails(response.data);
    } catch (error) {
      console.error('Error fetching job details:', error);
      Alert.alert('Error', 'Failed to load job details. Please try again.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicants = async () => {
    try {
      setLoadingApplicants(true);
      const response = await API.get(`/jobs/${jobId}/applications/`);
      
      // Handle paginated response
      const applicantsData = response.data?.results || response.data || [];
      setApplicants(applicantsData);
      setFilteredApplicants(applicantsData); // Initialize filtered list
    } catch (error) {
      console.error('Error fetching applicants:', error);
      setApplicants([]);
      setFilteredApplicants([]);
    } finally {
      setLoadingApplicants(false);
    }
  };

  // Filter and sort applicants whenever search, sort, or status filter changes
  useEffect(() => {
    let filtered = [...applicants];

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(applicant => 
        applicant.user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        applicant.user.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(applicant => 
        applicant.status.toLowerCase().replace(' ', '_') === statusFilter
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':
          return new Date(a.applied_date).getTime() - new Date(b.applied_date).getTime();
        case 'date_desc':
          return new Date(b.applied_date).getTime() - new Date(a.applied_date).getTime();
        case 'name_asc':
          return (a.user.full_name || a.user.username).localeCompare(b.user.full_name || b.user.username);
        case 'name_desc':
          return (b.user.full_name || b.user.username).localeCompare(a.user.full_name || a.user.username);
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    setFilteredApplicants(filtered);
  }, [applicants, searchQuery, sortBy, statusFilter]);

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return 'Salary not specified';
    if (min && max) return `₹${min.toLocaleString()}-${max.toLocaleString()}/month`;
    if (min) return `₹${min.toLocaleString()}/month`;
    if (max) return `₹${max.toLocaleString()}/month`;
    return 'Salary not specified';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleViewApplicant = async (applicant: Applicant) => {
    setSelectedApplicant(applicant);
    setShowApplicantModal(true);
    
    // Check file accessibility when modal opens
    if (applicant.resume) {
      setResumeFileStatus(prev => ({ ...prev, [applicant.resume!.file_name]: 'checking' }));
      await checkFileAccessibility(applicant.resume.file_url, applicant.resume.file_name);
    }
  };

  const handleOpenResume = async (resumeUrl: string, fileName: string) => {
    try {
      // Check if it's a local file URL (which causes issues on Android)
      // This prevents the Android FileUriExposedException error
      if (resumeUrl.startsWith('file://')) {
        Alert.alert(
          'Local File Error',
          'This resume file is stored locally and cannot be opened directly.\n\nThis is a security restriction on Android devices. Please use the download option instead or contact the system administrator.',
          [{ text: 'OK' }]
        );
        return;
      }

      // For remote URLs, try to open in browser first
      if (resumeUrl.startsWith('http://') || resumeUrl.startsWith('https://')) {
        try {
          await openBrowserAsync(resumeUrl);
        } catch (browserError) {
          console.error('Error opening resume with WebBrowser:', browserError);
          // Fallback to native Linking
          try {
            const supported = await Linking.canOpenURL(resumeUrl);
            if (supported) {
              await Linking.openURL(resumeUrl);
            } else {
              Alert.alert('Error', 'Cannot open this file. Please check if you have a PDF viewer installed.');
            }
          } catch (linkError) {
            console.error('Error with Linking fallback:', linkError);
            Alert.alert('Error', 'Failed to open resume file. Please check your internet connection.');
          }
        }
      } else {
        Alert.alert('Error', 'Invalid resume URL format.');
      }
    } catch (error) {
      console.error('Error opening resume with WebBrowser:', error);
      // Fallback to native Linking
      try {
        const supported = await Linking.canOpenURL(resumeUrl);
        if (supported) {
          await Linking.openURL(resumeUrl);
        } else {
          Alert.alert('Error', 'Cannot open this file. Please check if you have a PDF viewer installed.');
        }
      } catch (linkError) {
        console.error('Error with Linking fallback:', linkError);
        Alert.alert('Error', 'Failed to open resume file. Please check your internet connection.');
      }
    }
  };

  const getOptimizedCloudinaryUrl = (originalUrl: string, fileName: string) => {
    // Ensure we have the best Cloudinary URL format for downloads
    if (!originalUrl.includes('cloudinary.com')) {
      return originalUrl;
    }
    
    // For PDFs, we need to ensure proper raw upload format and .pdf extension
    let optimizedUrl = originalUrl;
    
    // Convert to raw upload format if not already
    if (!originalUrl.includes('/raw/upload/')) {
      optimizedUrl = originalUrl.replace('/upload/', '/raw/upload/');
    }
    
    // Ensure the URL ends with .pdf for PDF files
    if (fileName.toLowerCase().endsWith('.pdf') && !optimizedUrl.endsWith('.pdf')) {
      // Extract the base URL without query parameters
      const [baseUrl, queryParams] = optimizedUrl.split('?');
      optimizedUrl = `${baseUrl}.pdf${queryParams ? '?' + queryParams : ''}`;
    }
    
    console.log('Optimized Cloudinary URL for PDF:', optimizedUrl);
    return optimizedUrl;
  };

  const buildCloudinaryAttachmentUrl = (originalUrl: string, desiredFileName: string) => {
    if (!originalUrl.includes('cloudinary.com')) return originalUrl;
    
    // First optimize the URL to ensure proper format
    let url = getOptimizedCloudinaryUrl(originalUrl, desiredFileName);
    
    // Parse the Cloudinary URL to insert fl_attachment parameter correctly
    // Cloudinary URL format: https://res.cloudinary.com/cloud_name/resource_type/upload/transformations/version/folder/filename
    const cloudinaryRegex = /https:\/\/res\.cloudinary\.com\/([^\/]+)\/(raw)\/upload\/(.*)/;
    const match = url.match(cloudinaryRegex);
    
    if (!match) {
      console.warn('Could not parse Cloudinary URL:', url);
      return url;
    }
    
    const [, cloudName, resourceType, pathAfterUpload] = match;
    const cleanFileName = desiredFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    // Build the URL with fl_attachment transformation
    const attachmentUrl = `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/fl_attachment:${cleanFileName}/${pathAfterUpload}`;
    
    console.log('Built Cloudinary attachment URL:', attachmentUrl);
    return attachmentUrl;
  };

  const handleDownloadResume = async (resumeUrl: string, fileName: string) => {
    try {
      // Check if it's a local file URL (which causes issues on Android)
      if (resumeUrl.startsWith('file://')) {
        Alert.alert(
          'Local File Error',
          'This resume file is stored locally and cannot be downloaded directly. Please contact the system administrator to access this file.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Validate URL format
      if (!resumeUrl || !resumeUrl.startsWith('http')) {
        Alert.alert(
          'Invalid URL',
          'The resume file URL is not accessible. Please contact support.',
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('Original resume URL:', resumeUrl);
      
      // Show loading message
      Alert.alert(
        'Downloading...',
        'Please wait while we download the PDF to your device.',
        [{ text: 'OK' }]
      );

      // For Cloudinary URLs, optimize for direct download
      let downloadUrl = resumeUrl;
      if (resumeUrl.includes('cloudinary.com')) {
        console.log('Processing Cloudinary URL for direct download');
        downloadUrl = getOptimizedCloudinaryUrl(resumeUrl, fileName);
        console.log('Optimized Cloudinary URL:', downloadUrl);
      }

      // Create a unique filename with timestamp to avoid conflicts
      const timestamp = new Date().getTime();
      const fileExtension = fileName.split('.').pop() || 'pdf';
      const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueFileName = `${cleanFileName}_${timestamp}.${fileExtension}`;
      
      // Get the documents directory path
      const documentsDir = FileSystem.documentDirectory;
      if (!documentsDir) {
        throw new Error('Documents directory not accessible');
      }
      
      const fileUri = `${documentsDir}${uniqueFileName}`;
      
      console.log('Starting download from:', downloadUrl);
      console.log('Downloading to:', fileUri);

      // Download the file directly
      const downloadResult = await FileSystem.downloadAsync(downloadUrl, fileUri);
      console.log('Download result:', downloadResult);
      
      if (downloadResult.status !== 200) {
        // For Cloudinary URLs, provide more specific error information
        if (resumeUrl.includes('cloudinary.com')) {
          if (downloadResult.status === 404) {
            throw new Error('Cloudinary file not found (404) - The PDF file may have been deleted or the Cloudinary ID is incorrect.');
          } else if (downloadResult.status === 403) {
            throw new Error('Cloudinary access denied (403) - The PDF file may be private or require authentication.');
          } else {
            throw new Error(`Cloudinary download failed with status: ${downloadResult.status} - Please try again or contact support.`);
          }
        } else {
          throw new Error(`Download failed with status: ${downloadResult.status}`);
        }
      }
      
      // Check if file was downloaded successfully
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        throw new Error('File download failed - file not found');
      }
      
      console.log('File downloaded successfully:', fileInfo);
      
      // Share the downloaded file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share ${fileName}`,
          UTI: 'com.adobe.pdf'
        });
        
        Alert.alert(
          'Download Complete!',
          `The file "${fileName}" has been downloaded to your device and is ready to share.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Download Complete!',
          `The file "${fileName}" has been downloaded to your device at:\n${fileUri}`,
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      console.error('Download error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Unknown error occurred';
      const errMsg = (error as any)?.message || String(error);
      if (errMsg.includes('404')) {
        errorMessage = 'File not found on server. The resume may have been removed or the link is expired.';
      } else if (errMsg.includes('403')) {
        errorMessage = 'Access denied. You may not have permission to download this file.';
      } else if (errMsg.includes('500')) {
        errorMessage = 'Server error. Please try again later.';
      } else if (errMsg.includes('Network')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else {
        errorMessage = errMsg;
      }
      
      // Provide fallback options
      Alert.alert(
        'Download Failed',
        `Failed to download the file: ${errorMessage}\n\nWould you like to try opening it in your browser instead?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Try Again', onPress: () => handleDownloadResume(resumeUrl, fileName) },
          { 
            text: 'Open in Browser', 
            onPress: async () => {
              try {
                const browserUrl = resumeUrl.includes('cloudinary.com') 
                  ? buildCloudinaryAttachmentUrl(resumeUrl, fileName)
                  : resumeUrl;
                await openBrowserAsync(browserUrl);
              } catch (browserError) {
                Alert.alert('Error', 'Failed to open in browser. Please try again later.');
              }
            }
          }
        ]
      );
    }
  };

  const showResumeOptions = (resumeUrl: string, fileName: string) => {
    Alert.alert(
      'Resume Options',
      `What would you like to do with ${fileName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
        text: '📥 Download to Device',
        onPress: () => handleDownloadResume(resumeUrl, fileName)
        },
        { 
        text: '👁️ View Online',
        onPress: () => handleOpenResume(resumeUrl, fileName)
        },
        { 
        text: '🌐 Open in Browser',
          onPress: async () => {
            try {
              await openBrowserAsync(resumeUrl);
            } catch (error) {
              console.error('Error opening resume with WebBrowser:', error);
              // Fallback to native Linking for system share
              try {
                await Linking.openURL(resumeUrl);
              } catch (linkError) {
                console.error('Error with Linking fallback:', linkError);
                Alert.alert('Error', 'Failed to open resume link.');
              }
            }
          }
        }
      ]
    );
  };

  const checkFileAccessibility = async (resumeUrl: string, fileName: string) => {
    try {
      // For Cloudinary URLs, we assume they are accessible since they're stored in Cloudinary
      if (resumeUrl.includes('cloudinary.com')) {
        console.log('Checking Cloudinary URL accessibility:', resumeUrl);
        
        // Cloudinary URLs are generally accessible, so we'll be more permissive
        // Check for various Cloudinary URL formats
        if (resumeUrl && (
          resumeUrl.includes('res.cloudinary.com') || 
          resumeUrl.includes('cloudinary.com/') ||
          resumeUrl.includes('api.cloudinary.com')
        )) {
          console.log('Cloudinary URL format is valid - marking as accessible');
          setResumeFileStatus(prev => ({ ...prev, [fileName]: 'accessible' }));
          return true;
        } else {
          console.log('Cloudinary URL format is invalid');
          setResumeFileStatus(prev => ({ ...prev, [fileName]: 'inaccessible' }));
          return false;
        }
      } else {
        // For non-Cloudinary URLs, use HEAD request
        try {
          const testResponse = await fetch(resumeUrl, { method: 'HEAD' });
          const status = testResponse.status === 200 ? 'accessible' : 'inaccessible';
          setResumeFileStatus(prev => ({ ...prev, [fileName]: status }));
          return status === 'accessible';
        } catch (headError) {
          // If HEAD request fails, try GET request as fallback
          try {
            const testResponse = await fetch(resumeUrl);
            const status = testResponse.status === 200 ? 'accessible' : 'inaccessible';
            setResumeFileStatus(prev => ({ ...prev, [fileName]: status }));
            return status === 'accessible';
          } catch (getError) {
            console.error('Both HEAD and GET requests failed for non-Cloudinary URL:', getError);
            setResumeFileStatus(prev => ({ ...prev, [fileName]: 'inaccessible' }));
            return false;
          }
        }
      }
    } catch (error) {
      console.error('Error checking file accessibility:', error);
      
      // For Cloudinary URLs, if the check fails, assume they're accessible anyway
      if (resumeUrl.includes('cloudinary.com')) {
        console.log('Cloudinary URL check failed, but assuming accessible based on URL format');
        setResumeFileStatus(prev => ({ ...prev, [fileName]: 'accessible' }));
        return true;
      }
      
      setResumeFileStatus(prev => ({ ...prev, [fileName]: 'inaccessible' }));
      return false;
    }
  };

  const handleDownloadToDevice = async (resumeUrl: string, fileName: string) => {
    try {
      // Check if it's a local file URL (which causes issues on Android)
      if (resumeUrl.startsWith('file://')) {
        Alert.alert(
          'Local File Error',
          'This resume file is stored locally and cannot be downloaded directly. Please contact the system administrator to access this file.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Validate URL format
      if (!resumeUrl || !resumeUrl.startsWith('http')) {
        Alert.alert(
          'Invalid URL',
          'The resume file URL is not accessible. Please contact support.',
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('Original resume URL:', resumeUrl);
      
      // For Cloudinary URLs, optimize and use browser-based download
      if (resumeUrl.includes('cloudinary.com')) {
        console.log('Processing Cloudinary URL for download');
        
        // Get the optimized URL
        const optimizedUrl = getOptimizedCloudinaryUrl(resumeUrl, fileName);
        console.log('Optimized URL:', optimizedUrl);
        
        // Create attachment URL for forced download
        const attachmentUrl = buildCloudinaryAttachmentUrl(optimizedUrl, fileName);
        console.log('Final attachment URL:', attachmentUrl);
        
        // Show loading message
        Alert.alert(
          'Opening Download',
          'Opening the PDF in your browser for download. The file should download automatically or you can save it using the browser menu.',
          [{ text: 'OK' }]
        );

        try {
          await openBrowserAsync(attachmentUrl);
        } catch (browserErr) {
          console.log('Browser open failed, falling back to Linking:', browserErr);
          const supported = await Linking.canOpenURL(attachmentUrl);
          if (supported) {
            await Linking.openURL(attachmentUrl);
          } else {
            throw new Error('Unable to open Cloudinary URL');
          }
        }
        
        return; // Skip FileSystem flow for Cloudinary
      }

      // For non-Cloudinary URLs, test accessibility first
      try {
        console.log('Testing non-Cloudinary URL accessibility...');
        const testResponse = await fetch(resumeUrl, { method: 'HEAD' });
        console.log('URL test response status:', testResponse.status);
        
        if (testResponse.status === 404) {
          throw new Error('File not found (404) - The resume file may have been removed or the link is expired.');
        } else if (testResponse.status === 403) {
          throw new Error('Access denied (403) - You may not have permission to access this file.');
        } else if (testResponse.status >= 400) {
          throw new Error(`Server error (${testResponse.status}) - Please try again later.`);
        }
      } catch (urlTestError) {
        console.error('URL accessibility test failed:', urlTestError);
        const urlTestErrorMessage = (urlTestError as any)?.message || String(urlTestError);
        if (urlTestErrorMessage.includes('404')) {
          throw urlTestError as any;
        }
        // Continue with download attempt for other errors
      }

      // Show loading alert for non-Cloudinary files
      Alert.alert(
        'Downloading...',
        'Please wait while we download the file to your device.',
        [{ text: 'OK' }]
      );

      // Create a unique filename with timestamp to avoid conflicts
      const timestamp = new Date().getTime();
      const fileExtension = fileName.split('.').pop() || 'pdf';
      const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueFileName = `${cleanFileName}_${timestamp}.${fileExtension}`;
      
      // Get the documents directory path
      const documentsDir = FileSystem.documentDirectory;
      if (!documentsDir) {
        throw new Error('Documents directory not accessible');
      }
      
      const fileUri = `${documentsDir}${uniqueFileName}`;
      
      console.log('Starting download from:', resumeUrl);
      console.log('Downloading to:', fileUri);

      // Download the file
      const downloadResult = await FileSystem.downloadAsync(resumeUrl, fileUri);
      console.log('Download result:', downloadResult);
      
      if (downloadResult.status !== 200) {
        throw new Error(`Download failed with status: ${downloadResult.status}`);
      }
      
      // Check if file was downloaded successfully
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        throw new Error('File download failed - file not found');
      }
      
      console.log('File downloaded successfully:', fileInfo);
      
      // Share the downloaded file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share ${fileName}`,
          UTI: 'com.adobe.pdf'
        });
        
        Alert.alert(
          'Download Complete!',
          `The file "${fileName}" has been downloaded to your device and is ready to share.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Download Complete!',
          `The file "${fileName}" has been downloaded to your device at:\n${fileUri}`,
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      console.error('Download error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Unknown error occurred';
      const errMsg = (error as any)?.message || String(error);
      if (errMsg.includes('404')) {
        errorMessage = 'File not found on server. The resume may have been removed or the link is expired.';
      } else if (errMsg.includes('403')) {
        errorMessage = 'Access denied. You may not have permission to download this file.';
      } else if (errMsg.includes('500')) {
        errorMessage = 'Server error. Please try again later.';
      } else if (errMsg.includes('Network')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else {
        errorMessage = errMsg;
      }
      
      Alert.alert(
        'Download Failed',
        `Failed to download the file: ${errorMessage}\n\nPlease try again or contact support if the problem persists.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Try Again', onPress: () => handleDownloadToDevice(resumeUrl, fileName) },
          { text: 'Open in Browser', onPress: () => handleOpenResume(resumeUrl, fileName) }
        ]
      );
    }
  };

  // Premium feature functions
  const handleApplicantSelection = (applicantId: number) => {
    // Find the applicant to check their status
    const applicant = applicants.find(app => app.id === applicantId);
    
    // Prevent selecting already accepted applicants
    if (applicant && applicant.status.toLowerCase() === 'accepted') {
      Alert.alert(
        'Cannot Select',
        'This applicant has already been hired and cannot be selected for further actions.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    const newSelected = new Set(selectedApplicants);
    
    if (newSelected.has(applicantId)) {
      newSelected.delete(applicantId);
    } else {
      // Check subscription limits
      if (!subscriptionFeatures.canSelectMultipleApplicants && newSelected.size >= 1) {
        Alert.alert(
          'Upgrade Required',
          getUpgradeMessage('canSelectMultipleApplicants'),
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade', onPress: () => router.push('/subscription') }
          ]
        );
        return;
      }
      newSelected.add(applicantId);
    }
    
    setSelectedApplicants(newSelected);
  };

  const handleBulkDownloadResumes = async () => {
    if (!subscriptionFeatures.canBulkDownloadResumes) {
      Alert.alert(
        'Upgrade Required',
        getUpgradeMessage('canBulkDownloadResumes'),
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/subscription') }
        ]
      );
      return;
    }

    try {
      setDownloadingResumes(true);
      const resumeUrls = filteredApplicants
        .filter(applicant => applicant.resume)
        .map(applicant => ({
          url: applicant.resume!.file_url,
          name: applicant.resume!.file_name,
          applicant: applicant.user.full_name || applicant.user.username
        }));

      if (resumeUrls.length === 0) {
        Alert.alert('No Resumes', 'No resumes available to download.');
        return;
      }

      // Check for local file URLs that can't be opened
      // This prevents the Android FileUriExposedException error
      const localFiles = resumeUrls.filter(resume => resume.url.startsWith('file://'));
      
      if (localFiles.length > 0) {
        Alert.alert(
          'Local Files Detected',
          `${localFiles.length} resume(s) are stored locally and cannot be opened directly.\n\nThis is a security restriction on Android devices. These files need to be accessed through your backend system or converted to remote URLs.`,
          [{ text: 'OK' }]
        );
        return;
      }

      // Download multiple resumes to device
      Alert.alert(
        'Bulk Download Resumes',
        `This will download ${resumeUrls.length} resume files directly to your device.\n\nEach file will be saved to your device's documents folder and can be shared or moved to other locations.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Download All to Device', onPress: async () => {
            try {
            Alert.alert(
              'Download Started',
                `Downloading ${resumeUrls.length} resumes to your device...\n\nThis may take a few moments depending on file sizes.`,
              [{ text: 'OK' }]
            );
            
              // Download each resume with delay to prevent overwhelming the system
              for (let i = 0; i < resumeUrls.length; i++) {
                const resume = resumeUrls[i];
                try {
                  // Create a unique filename with timestamp to avoid conflicts
                  const timestamp = new Date().getTime() + i;
                  const fileExtension = resume.name.split('.').pop() || 'pdf';
                  const cleanFileName = resume.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                  const uniqueFileName = `${cleanFileName}_${timestamp}.${fileExtension}`;
                  
                  // Get the documents directory path
                  const documentsDir = FileSystem.documentDirectory;
                  if (!documentsDir) {
                    throw new Error('Documents directory not accessible');
                  }
                  
                  const fileUri = `${documentsDir}${uniqueFileName}`;
                  
                  // Download the file
                  const downloadResult = await FileSystem.downloadAsync(resume.url, fileUri);
                  
                  if (downloadResult.status !== 200) {
                    console.log(`Failed to download ${resume.name}: status ${downloadResult.status}`);
                    continue;
                  }
                  
                  // Check if file was downloaded successfully
                  const fileInfo = await FileSystem.getInfoAsync(fileUri);
                  if (!fileInfo.exists) {
                    console.log(`File download failed for ${resume.name}`);
                    continue;
                  }
                  
                  console.log(`Successfully downloaded: ${resume.name}`);
                  
                  // Small delay between downloads
                  await new Promise(resolve => setTimeout(resolve, 500));
                  
                } catch (error) {
                  console.error(`Error downloading ${resume.name}:`, error);
                }
              }
              
              Alert.alert(
                'Download Complete!',
                `All resume files have been downloaded to your device's documents folder.\n\nYou can access them through your device's file manager or share them using the share functionality.`,
                [{ text: 'OK' }]
              );
              
            } catch (error) {
              console.error('Bulk download error:', error);
              Alert.alert(
                'Download Error',
                'Some files may not have downloaded successfully. Please check your device storage and try again.',
                [
                  { text: 'OK' },
                  { text: 'View Failed Downloads', onPress: () => {
                    // Show which files failed to download
                    const failedFiles = resumeUrls.filter((_, index) => {
                      // This is a simplified check - in a real implementation you'd track actual failures
                      return false; // For now, just show the message
                    });
                    if (failedFiles.length > 0) {
                      Alert.alert(
                        'Failed Downloads',
                        `The following files failed to download:\n${failedFiles.map(f => f.name).join('\n')}\n\nYou can try downloading them individually.`,
                        [{ text: 'OK' }]
                      );
                    }
                  }}
                ]
              );
            }
          }}
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to download resumes.');
    } finally {
      setDownloadingResumes(false);
    }
  };

  const handleHireApplicants = async () => {
    if (selectedApplicants.size === 0) {
      Alert.alert('No Selection', 'Please select applicants to hire.');
      return;
    }

    setActionType('hire');
    setShowHireModal(true);
  };

  const handleShortlistApplicants = async () => {
    if (selectedApplicants.size === 0) {
      Alert.alert('No Selection', 'Please select applicants to shortlist.');
      return;
    }

    // Allow shortlisting if user has Pro plan OR if they already have shortlisted applicants
    if (!subscriptionFeatures.canSelectMultipleApplicants && !hasShortlisted) {
      Alert.alert('Upgrade Required', 'You need a Pro plan to shortlist multiple applicants.');
      return;
    }

    if (selectedApplicants.size === 1) {
      Alert.alert('Multiple Selection Required', 'Please select multiple applicants to shortlist.');
      return;
    }

    setActionType('shortlist');
    setShowShortlistModal(true);
  };

  const confirmHireApplicants = async () => {
    try {
      setIsHiring(true);
      
      // Update selected applicants to 'Accepted' status
      const selectedArray = Array.from(selectedApplicants);
      const hirePromises = selectedArray.map(async (applicantId) => {
        return API.patch(`/applications/${applicantId}/update/`, { status: 'Accepted' });
      });

      await Promise.all(hirePromises);

      // Reject all other applicants (not hired)
      const otherApplicants = applicants.filter(app => !selectedApplicants.has(app.id));
      const rejectPromises = otherApplicants.map(async (applicant) => {
        if (applicant.status !== 'Rejected') {
          return API.patch(`/applications/${applicant.id}/update/`, { status: 'Rejected' });
        }
      });

      await Promise.all(rejectPromises);

      // Close the job posting
      await API.patch(`/jobs/${jobId}/update/`, { status: 'Closed' });

      // Create local notifications for all applicants (NOT for the job poster)
      try {
        console.log('🔔 Creating notifications for hiring decision...');
        console.log('👤 Job poster ID:', jobDetails?.user?.id);
        console.log('📝 Selected applicants:', Array.from(selectedApplicants));
        
        // Get job poster ID for filtering
        const jobPosterId = jobDetails?.user?.id;
        
        // Notify hired applicants (EXCLUDE job poster completely)
        const hiredApplicants = applicants.filter(app => 
          selectedApplicants.has(app.id) && app.user.id !== jobPosterId
        );
        console.log('✅ Hired applicants (excluding job poster):', hiredApplicants.map(app => ({ id: app.user.id, name: app.user.full_name })));
        
        for (const applicant of hiredApplicants) {
          console.log(`📨 Sending hire notification to: ${applicant.user.full_name} (ID: ${applicant.user.id})`);
          await createLocalNotification({
            recipient: applicant.user.id,
            notification_type: 'job_hired',
            title: 'Congratulations! You\'ve been hired!',
            message: `You have been hired for the position: ${jobDetails?.title ?? 'this job'}`,
            related_job: Number(jobId),
            created_at: new Date().toISOString(),
            applicant: applicant,
            jobPoster: {
              id: jobDetails?.user?.id || 0,
              username: jobDetails?.user?.username || 'employer',
              full_name: jobDetails?.user?.full_name || 'Employer',
              profile_picture: jobDetails?.user?.profile_picture
            }
          });
        }

        // Notify rejected applicants (EXCLUDE job poster completely)
        const rejectedApplicants = applicants.filter(app => 
          !selectedApplicants.has(app.id) && 
          app.status !== 'Rejected' && 
          app.user.id !== jobPosterId
        );
        console.log('❌ Rejected applicants (excluding job poster):', rejectedApplicants.map(app => ({ id: app.user.id, name: app.user.full_name })));
        
        for (const applicant of rejectedApplicants) {
          console.log(`📨 Sending rejection notification to: ${applicant.user.full_name} (ID: ${applicant.user.id})`);
          await createLocalNotification({
            recipient: applicant.user.id,
            notification_type: 'job_rejected',
            title: 'Application Update',
            message: `Your application for ${jobDetails?.title ?? 'this job'} was not selected.`,
            related_job: Number(jobId),
            created_at: new Date().toISOString(),
            applicant: applicant,
            jobPoster: {
              id: jobDetails?.user?.id || 0,
              username: jobDetails?.user?.username || 'employer',
              full_name: jobDetails?.user?.full_name || 'Employer',
              profile_picture: jobDetails?.user?.profile_picture
            }
          });
        }
      } catch (notificationError) {
        console.error('Error creating local notifications:', notificationError);
        // Don't fail the hiring process if notifications fail
      }

      // Update local state to reflect changes
      setApplicants(prev => prev.map(app => {
        if (selectedApplicants.has(app.id)) {
          return { ...app, status: 'Accepted' };
        } else if (app.status !== 'Rejected') {
          return { ...app, status: 'Rejected' };
        }
        return app;
      }));

      // Reset hasShortlisted state since job is now closed
      setHasShortlisted(false);
      
      Alert.alert(
        'Success!',
        `Successfully hired ${selectedApplicants.size} applicant(s), rejected ${otherApplicants.length} others, and closed the job posting.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );

    } catch (error) {
      console.error('Error hiring applicants:', error);
      Alert.alert('Error', 'Failed to hire applicants. Please try again.');
    } finally {
      setIsHiring(false);
      setShowHireModal(false);
      setSelectedApplicants(new Set());
    }
  };

  const confirmShortlistApplicants = async () => {
    try {
      setIsShortlisting(true);
      
      // Update selected applicants to 'Shortlisted' status
      const selectedArray = Array.from(selectedApplicants);
      const shortlistPromises = selectedArray.map(async (applicantId) => {
        return API.patch(`/applications/${applicantId}/update/`, { status: 'Shortlisted' });
      });

      await Promise.all(shortlistPromises);

      // Reject all other applicants (not shortlisted and not already accepted)
      const otherApplicants = applicants.filter(app => 
        !selectedApplicants.has(app.id) && 
        app.status !== 'Shortlisted' && 
        app.status !== 'Accepted'
      );
      
      const rejectPromises = otherApplicants.map(async (applicant) => {
        if (applicant.status !== 'Rejected') {
          return API.patch(`/applications/${applicant.id}/update/`, { status: 'Rejected' });
        }
      });

      await Promise.all(rejectPromises);

      // Create local notifications for all applicants (NOT for the job poster)
      try {
        console.log('🔔 Creating notifications for shortlisting decision...');
        console.log('👤 Job poster ID:', jobDetails?.user?.id);
        console.log('📝 Selected applicants:', Array.from(selectedApplicants));
        
        // Get job poster ID for filtering
        const jobPosterId = jobDetails?.user?.id;
        
        // Notify shortlisted applicants (EXCLUDE job poster completely)
        const shortlistedApplicants = applicants.filter(app => 
          selectedApplicants.has(app.id) && app.user.id !== jobPosterId
        );
        console.log('⭐ Shortlisted applicants (excluding job poster):', shortlistedApplicants.map(app => ({ id: app.user.id, name: app.user.full_name })));
        
        for (const applicant of shortlistedApplicants) {
          console.log(`📨 Sending shortlist notification to: ${applicant.user.full_name} (ID: ${applicant.user.id})`);
          await createLocalNotification({
            recipient: applicant.user.id,
            notification_type: 'job_shortlisted',
            title: 'Great news! You\'ve been shortlisted!',
            message: `Your application for ${jobDetails?.title ?? 'this job'} has been shortlisted. You\'re one step closer to getting hired!`,
            related_job: Number(jobId),
            created_at: new Date().toISOString(),
            applicant: applicant,
            jobPoster: {
              id: jobDetails?.user?.id || 0,
              username: jobDetails?.user?.username || 'employer',
              full_name: jobDetails?.user?.full_name || 'Employer',
              profile_picture: jobDetails?.user?.profile_picture
            }
          });
        }

        // Notify rejected applicants (EXCLUDE job poster completely)
        const rejectedApplicants = applicants.filter(app => 
          !selectedApplicants.has(app.id) && 
          app.status !== 'Shortlisted' && 
          app.status !== 'Accepted' && 
          app.status !== 'Rejected' && 
          app.user.id !== jobPosterId
        );
        console.log('❌ Rejected applicants (excluding job poster):', rejectedApplicants.map(app => ({ id: app.user.id, name: app.user.full_name })));
        
        for (const applicant of rejectedApplicants) {
          console.log(`📨 Sending rejection notification to: ${applicant.user.full_name} (ID: ${applicant.user.id})`);
          await createLocalNotification({
            recipient: applicant.user.id,
            notification_type: 'job_rejected',
            title: 'Application Update',
            message: `Your application for ${jobDetails?.title ?? 'this job'} was not selected for this round.`,
            related_job: Number(jobId),
            created_at: new Date().toISOString(),
            applicant: applicant,
            jobPoster: {
              id: jobDetails?.user?.id || 0,
              username: jobDetails?.user?.username || 'employer',
              full_name: jobDetails?.user?.full_name || 'Employer',
              profile_picture: jobDetails?.user?.profile_picture
            }
          });
        }
      } catch (notificationError) {
        console.error('Error creating local notifications:', notificationError);
        // Don't fail the shortlisting process if notifications fail
      }

      // Update local state to reflect changes
      setApplicants(prev => prev.map(app => {
        if (selectedApplicants.has(app.id)) {
          return { ...app, status: 'Shortlisted' };
        } else if (app.status !== 'Shortlisted' && app.status !== 'Accepted' && app.status !== 'Rejected') {
          return { ...app, status: 'Rejected' };
        }
        return app;
      }));

      // Set hasShortlisted to true to show both hire and shortlist options
      setHasShortlisted(true);
      
      Alert.alert(
        'Success!',
        `Successfully shortlisted ${selectedApplicants.size} applicant(s) and rejected ${otherApplicants.length} others.`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('Error shortlisting applicants:', error);
      Alert.alert('Error', 'Failed to shortlist applicants. Please try again.');
    } finally {
      setIsShortlisting(false);
      setShowShortlistModal(false);
      setSelectedApplicants(new Set());
    }
  };

  const handleCloseJob = () => {
    setShowCloseJobModal(true);
  };

  const confirmCloseJob = async () => {
    try {
      setIsClosingJob(true);
      
      // Close the job without hiring anyone
      await API.patch(`/jobs/${jobId}/`, { status: 'Closed' });

      Alert.alert(
        'Job Closed',
        'The job posting has been closed. No new applications will be accepted.',
        [{ text: 'OK', onPress: () => router.back() }]
      );

    } catch (error) {
      console.error('Error closing job:', error);
      Alert.alert('Error', 'Failed to close job. Please try again.');
    } finally {
      setIsClosingJob(false);
      setShowCloseJobModal(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return '#f59e0b';
      case 'under review':
        return '#3b82f6';
      case 'shortlisted':
        return '#10b981';
      case 'accepted':
        return '#059669';
      case 'rejected':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  if (!fontsLoaded || loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading job details...</Text>
      </View>
    );
  }

  if (!jobDetails) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.errorText}>Job not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerBackButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Job Information Card */}
        <View style={styles.jobCard}>
          <Text style={styles.jobTitle}>{jobDetails.title}</Text>
          <Text style={styles.jobDescription}>{jobDetails.description}</Text>
          
          <View style={styles.jobInfoGrid}>
            <View style={styles.jobInfoItem}>
              <Ionicons name="cash-outline" size={20} color="#059669" />
              <Text style={styles.jobInfoText}>{formatSalary(jobDetails.salary_min, jobDetails.salary_max)}</Text>
            </View>
            <View style={styles.jobInfoItem}>
              <Ionicons name="location-outline" size={20} color="#ef4444" />
              <Text style={styles.jobInfoText}>{jobDetails.location}</Text>
            </View>
            <View style={styles.jobInfoItem}>
              <Ionicons name="time-outline" size={20} color="#6b7280" />
              <Text style={styles.jobInfoText}>{jobDetails.job_type}</Text>
            </View>
            <View style={styles.jobInfoItem}>
              <Ionicons name="briefcase-outline" size={20} color="#6b7280" />
              <Text style={styles.jobInfoText}>{jobDetails.experience_level}</Text>
            </View>
          </View>

          {/* Job Status */}
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(jobDetails.status) }]}>
              <Text style={styles.statusText}>{jobDetails.status}</Text>
            </View>
            <Text style={styles.applicantsCount}>{jobDetails.applicants_count} applicants</Text>
          </View>
          
          {/* Job Closed Notice */}
          {jobDetails.status.toLowerCase() === 'closed' && (
            <View style={styles.jobClosedNotice}>
              <Ionicons name="information-circle" size={16} color="#6b7280" />
              <Text style={styles.jobClosedText}>
                This job posting is closed. No new applications will be accepted.
              </Text>
            </View>
          )}

          {/* Skills */}
          {jobDetails.skills && jobDetails.skills.length > 0 && (
            <View style={styles.skillsContainer}>
              <Text style={styles.skillsTitle}>Required Skills:</Text>
              <View style={styles.skillsGrid}>
                {jobDetails.skills.map((skill, index) => (
                  <View key={index} style={styles.skillChip}>
                    <Text style={styles.skillText}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Custom Questions - Only show for hire posts (job postings) */}
          {jobDetails.post_type === 'hire' && jobDetails.custom_fields && jobDetails.custom_fields.length > 0 && (
            <View style={styles.customFieldsContainer}>
              <Text style={styles.customFieldsTitle}>Application Questions:</Text>
              {jobDetails.custom_fields.map((field, index) => (
                <Text key={index} style={styles.customFieldText}>• {field.question}</Text>
              ))}
            </View>
          )}
        </View>

        {/* Search and Filter Section */}
        {applicants.length > 0 && (
          <View style={styles.searchFilterCard}>
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color="#6b7280" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search applicants..."
                  placeholderTextColor="#9ca3af"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color="#9ca3af" />
                  </TouchableOpacity>
                ) : null}
              </View>
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => setShowFilters(true)}
              >
                <Ionicons name="options-outline" size={20} color="#8b5cf6" />
                <Text style={styles.filterButtonText}>Filter</Text>
              </TouchableOpacity>
            </View>

            {/* Active Filters Display */}
            <View style={styles.activeFilters}>
              <View style={styles.filterChip}>
                <Ionicons name="swap-vertical" size={14} color="#6b7280" />
                <Text style={styles.filterChipText}>
                  {sortBy === 'date_desc' ? 'Latest First' :
                   sortBy === 'date_asc' ? 'Oldest First' :
                   sortBy === 'name_asc' ? 'Name A-Z' :
                   sortBy === 'name_desc' ? 'Name Z-A' : 'By Status'}
                </Text>
              </View>
              {statusFilter !== 'all' && (
                <View style={[styles.filterChip, styles.statusFilterChip]}>
                  <Text style={styles.filterChipText}>
                    {statusFilter.replace('_', ' ').toUpperCase()}
                  </Text>
                  <TouchableOpacity onPress={() => setStatusFilter('all')}>
                    <Ionicons name="close" size={14} color="#6b7280" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Premium Features Bar */}
        {applicants.length > 0 && (
          <View style={styles.premiumFeaturesCard}>
            <View style={styles.premiumHeader}>
              <View style={styles.subscriptionInfo}>
                <Text style={styles.currentPlanText}>{getPlanDisplayName(currentPlan)}</Text>
                <TouchableOpacity onPress={() => router.push('/subscription')}>
                  <Text style={styles.upgradeLink}>Upgrade</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.premiumActions}>
              {/* Bulk Download Resumes */}
              <TouchableOpacity
                style={[
                  styles.premiumButton,
                  styles.downloadButton,
                  !subscriptionFeatures.canBulkDownloadResumes && styles.premiumButtonDisabled
                ]}
                onPress={handleBulkDownloadResumes}
                disabled={downloadingResumes}
              >
                {downloadingResumes ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons 
                      name="download" 
                      size={16} 
                      color={subscriptionFeatures.canBulkDownloadResumes ? "#fff" : "#9ca3af"} 
                    />
                    <Text style={[
                      styles.premiumButtonText,
                      !subscriptionFeatures.canBulkDownloadResumes && styles.premiumButtonTextDisabled
                    ]}>
                      Download All Resumes
                    </Text>
                    {!subscriptionFeatures.canBulkDownloadResumes && (
                      <Ionicons name="lock-closed" size={14} color="#9ca3af" />
                    )}
                  </>
                )}
              </TouchableOpacity>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                {selectedApplicants.size > 0 && (
                  <>
                    <TouchableOpacity
                      style={[styles.premiumButton, styles.hireButton]}
                      onPress={handleHireApplicants}
                    >
                      <Ionicons name="checkmark-circle" size={16} color="#fff" />
                      <Text style={styles.premiumButtonText}>
                        Hire ({selectedApplicants.size})
                      </Text>
                    </TouchableOpacity>

                    {/* Shortlist button - show for multiple selections or if already shortlisted */}
                    {/* Logic: Show if user has Pro plan OR if they already have shortlisted applicants */}
                    {(subscriptionFeatures.canSelectMultipleApplicants && selectedApplicants.size > 1) || 
                     (hasShortlisted && selectedApplicants.size > 1) ? (
                      <TouchableOpacity
                        style={[styles.premiumButton, styles.shortlistButton]}
                        onPress={handleShortlistApplicants}
                      >
                        <Ionicons name="star" size={16} color="#fff" />
                        <Text style={styles.premiumButtonText}>
                          Shortlist ({selectedApplicants.size})
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </>
                )}

                {/* Close Job button - hide when job is closed or applicants are selected */}
                {/* Logic: Only show if no applicants selected AND job is not already closed */}
                {selectedApplicants.size === 0 && jobDetails.status.toLowerCase() !== 'closed' && (
                  <TouchableOpacity
                    style={[
                      styles.premiumButton, 
                      styles.closeButton,
                      applicants.length === 0 && styles.closeButtonPrimary
                    ]}
                    onPress={handleCloseJob}
                  >
                    <Ionicons name="close-circle" size={16} color="#fff" />
                    <Text style={styles.premiumButtonText}>
                      {applicants.length === 0 ? 'Close Job (No Applicants)' : 'Close Job'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Applicants Section */}
        <View style={styles.applicantsCard}>
          <View style={styles.applicantsHeader}>
            <Text style={styles.applicantsTitle}>
              Applications ({filteredApplicants.length}{applicants.length !== filteredApplicants.length ? ` of ${applicants.length}` : ''})
            </Text>
            {selectedApplicants.size > 0 && (
              <Text style={styles.selectedCount}>
                {selectedApplicants.size} selected
              </Text>
            )}
            {loadingApplicants && <ActivityIndicator size="small" color="#8b5cf6" />}
          </View>

          {applicants.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyStateText}>No applications yet</Text>
              <Text style={styles.emptyStateSubtext}>Applications will appear here when users apply for this job</Text>
            </View>
          ) : filteredApplicants.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyStateText}>No matching applications</Text>
              <Text style={styles.emptyStateSubtext}>Try adjusting your search or filters</Text>
            </View>
          ) : (
                          filteredApplicants.map((applicant) => (
                <View key={applicant.id} style={styles.applicantContainer}>
                  {/* Selection Checkbox - Hidden for accepted applicants */}
                  {applicant.status.toLowerCase() !== 'accepted' && (
                    <TouchableOpacity
                      style={styles.checkboxContainer}
                      onPress={() => handleApplicantSelection(applicant.id)}
                    >
                      <View style={[
                        styles.checkbox,
                        selectedApplicants.has(applicant.id) && styles.checkboxSelected
                      ]}>
                        {selectedApplicants.has(applicant.id) && (
                          <Ionicons name="checkmark" size={14} color="#fff" />
                        )}
                      </View>
                    </TouchableOpacity>
                  )}
                  
                  {/* Spacer for accepted applicants to maintain alignment */}
                  {applicant.status.toLowerCase() === 'accepted' && (
                    <View style={styles.checkboxSpacer}>
                      <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    </View>
                  )}

                                  {/* Applicant Item */}
                  <TouchableOpacity
                    style={[
                      styles.applicantItem,
                      selectedApplicants.has(applicant.id) && styles.applicantItemSelected,
                      applicant.status.toLowerCase() === 'accepted' && styles.applicantItemAccepted
                    ]}
                    onPress={() => handleViewApplicant(applicant)}
                  >
                  <ProfilePicture 
                    size={50} 
                    showLongPress={false} 
                    imageUrl={applicant.user.profile_picture}
                    noBorder={true}
                  />
                  <View style={styles.applicantInfo}>
                    <Text style={styles.applicantName}>{applicant.user.full_name || applicant.user.username}</Text>
                    <Text style={styles.applicantDate}>Applied {formatDate(applicant.applied_date)}</Text>
                    <View style={[styles.applicantStatusBadge, { backgroundColor: getStatusColor(applicant.status) }]}>
                      <Text style={styles.applicantStatusText}>{applicant.status}</Text>
                    </View>
                  </View>
                  <View style={styles.chevronContainer}>
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                  </View>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Applicant Details Modal */}
      <Modal
        visible={showApplicantModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowApplicantModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Application Details</Text>
              <TouchableOpacity onPress={() => setShowApplicantModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {selectedApplicant && (
              <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                {/* Applicant Info */}
                <View style={styles.modalSection}>
                  <View style={styles.applicantHeader}>
                    <ProfilePicture 
                      size={60} 
                      showLongPress={false} 
                      imageUrl={selectedApplicant.user.profile_picture}
                      noBorder={true}
                    />
                    <View style={styles.applicantHeaderInfo}>
                      <Text style={styles.modalApplicantName}>
                        {selectedApplicant.user.full_name || selectedApplicant.user.username}
                      </Text>
                      <Text style={styles.modalApplicantDate}>
                        Applied {formatDate(selectedApplicant.applied_date)}
                      </Text>
                      <View style={[styles.modalStatusBadge, { backgroundColor: getStatusColor(selectedApplicant.status) }]}>
                        <Text style={styles.modalStatusText}>{selectedApplicant.status}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* ID Card */}
                {selectedApplicant.id_card && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>ID Card</Text>
                                         <View style={styles.idCardInfo}>
                       {selectedApplicant.id_card.photo && (
                         <View style={styles.idCardPhotoContainer}>
                           <ProfilePicture 
                             size={80} 
                             showLongPress={false} 
                             imageUrl={selectedApplicant.id_card.photo}
                             noBorder={true}
                           />
                         </View>
                       )}
                       <Text style={styles.idCardField}><Text style={styles.fieldLabel}>Name:</Text> {selectedApplicant.id_card.name}</Text>
                       <Text style={styles.idCardField}><Text style={styles.fieldLabel}>Gender:</Text> {selectedApplicant.id_card.gender}</Text>
                       <Text style={styles.idCardField}><Text style={styles.fieldLabel}>Date of Birth:</Text> {selectedApplicant.id_card.date_of_birth}</Text>
                       <Text style={styles.idCardField}><Text style={styles.fieldLabel}>Age:</Text> {selectedApplicant.id_card.age || 'N/A'} years</Text>
                       <Text style={styles.idCardField}><Text style={styles.fieldLabel}>Nationality:</Text> {selectedApplicant.id_card.nationality}</Text>
                       {selectedApplicant.id_card.phone_number && (
                         <Text style={styles.idCardField}><Text style={styles.fieldLabel}>Phone:</Text> {selectedApplicant.id_card.phone_number}</Text>
                       )}
                       <Text style={styles.idCardField}><Text style={styles.fieldLabel}>Address:</Text> {selectedApplicant.id_card.address}</Text>
                      {selectedApplicant.id_card.skills && selectedApplicant.id_card.skills.length > 0 && (
                        <View style={styles.idCardSkills}>
                          <Text style={styles.fieldLabel}>Skills:</Text>
                          <View style={styles.skillsGrid}>
                            {selectedApplicant.id_card.skills.map((skill, index) => (
                              <View key={index} style={styles.skillChip}>
                                <Text style={styles.skillText}>{skill}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Resume */}
                {selectedApplicant.resume && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Resume</Text>
                    <TouchableOpacity 
                      style={styles.resumeButton}
                      onPress={() => handleDownloadResume(selectedApplicant.resume!.file_url, selectedApplicant.resume!.file_name)}
                    >
                      <View style={styles.resumeIcon}>
                        <Ionicons name="document-text" size={24} color="#ef4444" />
                      </View>
                      <View style={styles.resumeInfo}>
                        <Text style={styles.resumeName}>{selectedApplicant.resume.file_name}</Text>
                        <Text style={styles.resumeSize}>{formatFileSize(selectedApplicant.resume.file_size)}</Text>
                        <Text style={styles.resumeDate}>Uploaded {formatDate(selectedApplicant.resume.uploaded_at)}</Text>
                        {/* Show status based on file accessibility */}
                        {resumeFileStatus[selectedApplicant.resume.file_name] === 'inaccessible' && (
                          <Text style={styles.resumeWarning}>
                            {selectedApplicant.resume.file_url.includes('cloudinary.com') 
                              ? '⚠️ Cloudinary file format issue - contact support'
                              : '⚠️ File not accessible - may have been removed'
                            }
                          </Text>
                        )}
                        {resumeFileStatus[selectedApplicant.resume.file_name] === 'checking' && (
                          <Text style={styles.resumeWarning}>
                            🔍 Checking file accessibility...
                          </Text>
                        )}
                        {resumeFileStatus[selectedApplicant.resume.file_name] === 'accessible' && (
                          <Text style={styles.resumeWarning}>
                            {selectedApplicant.resume.file_url.includes('cloudinary.com')
                              ? '📄 Cloudinary PDF - ready to download'
                              : '📄 File accessible - ready to download'
                            }
                          </Text>
                        )}
                        {!resumeFileStatus[selectedApplicant.resume.file_name] && (
                          <Text style={styles.resumeWarning}>
                            {selectedApplicant.resume.file_url.includes('cloudinary.com')
                              ? '📄 Cloudinary PDF - ready to download'
                              : '⚠️ File status unknown - try downloading to check'
                            }
                          </Text>
                        )}
                      </View>
                      <View style={styles.resumeActions}>
                        <Ionicons name="eye-outline" size={18} color="#8b5cf6" />
                        <Ionicons name="download-outline" size={18} color="#8b5cf6" />
                        <Text style={styles.resumeActionText}>View & Save</Text>
                      </View>
                    </TouchableOpacity>
                    
 
                  </View>
                )}

                {/* Custom Field Answers */}
                {selectedApplicant.custom_field_answers && selectedApplicant.custom_field_answers.length > 0 && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Question Answers</Text>
                    {selectedApplicant.custom_field_answers.map((answer, index) => (
                      <View key={index} style={styles.questionAnswer}>
                        <Text style={styles.questionText}>{answer.question}</Text>
                        <View style={[styles.answerBadge, { backgroundColor: answer.answer === 'yes' ? '#10b981' : '#ef4444' }]}>
                          <Text style={styles.answerText}>{answer.answer}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Cover Letter */}
                {selectedApplicant.cover_letter && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Cover Letter</Text>
                    <Text style={styles.coverLetterText}>{selectedApplicant.cover_letter}</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter & Sort</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterContent} showsVerticalScrollIndicator={false}>
              {/* Sort Options */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Sort By</Text>
                <View style={styles.filterOptions}>
                  {[
                    { key: 'date_desc', label: 'Latest First', icon: 'time' },
                    { key: 'date_asc', label: 'Oldest First', icon: 'time-outline' },
                    { key: 'name_asc', label: 'Name A-Z', icon: 'text' },
                    { key: 'name_desc', label: 'Name Z-A', icon: 'text-outline' },
                    { key: 'status', label: 'By Status', icon: 'flag' },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.filterOption,
                        sortBy === option.key && styles.filterOptionSelected
                      ]}
                      onPress={() => setSortBy(option.key as any)}
                    >
                      <Ionicons 
                        name={option.icon as any} 
                        size={18} 
                        color={sortBy === option.key ? '#8b5cf6' : '#6b7280'} 
                      />
                      <Text style={[
                        styles.filterOptionText,
                        sortBy === option.key && styles.filterOptionTextSelected
                      ]}>
                        {option.label}
                      </Text>
                      {sortBy === option.key && (
                        <Ionicons name="checkmark" size={18} color="#8b5cf6" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Status Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Filter by Status</Text>
                <View style={styles.filterOptions}>
                  {[
                    { key: 'all', label: 'All Applications', count: applicants.length },
                    { key: 'pending', label: 'Pending', count: applicants.filter(a => a.status.toLowerCase() === 'pending').length },
                    { key: 'under_review', label: 'Under Review', count: applicants.filter(a => a.status.toLowerCase() === 'under review').length },
                    { key: 'shortlisted', label: 'Shortlisted', count: applicants.filter(a => a.status.toLowerCase() === 'shortlisted').length },
                    { key: 'accepted', label: 'Accepted', count: applicants.filter(a => a.status.toLowerCase() === 'accepted').length },
                    { key: 'rejected', label: 'Rejected', count: applicants.filter(a => a.status.toLowerCase() === 'rejected').length },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.filterOptionStatus,
                        statusFilter === option.key && styles.filterOptionSelected
                      ]}
                      onPress={() => setStatusFilter(option.key as any)}
                    >
                      <View style={styles.statusFilterContent}>
                        <Text style={[
                          styles.filterOptionText,
                          statusFilter === option.key && styles.filterOptionTextSelected
                        ]}>
                          {option.label}
                        </Text>
                        <Text style={[
                          styles.filterOptionCount,
                          statusFilter === option.key && styles.filterOptionCountSelected
                        ]}>
                          {option.count}
                        </Text>
                      </View>
                      {statusFilter === option.key && (
                        <Ionicons name="checkmark" size={18} color="#8b5cf6" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Filter Actions */}
            <View style={styles.filterActions}>
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => {
                  setSortBy('date_desc');
                  setStatusFilter('all');
                  setSearchQuery('');
                }}
              >
                <Text style={styles.clearFiltersText}>Clear All</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.applyFiltersButton}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.applyFiltersText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Hire Confirmation Modal */}
      <Modal
        visible={showHireModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowHireModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmationModal}>
            <View style={styles.confirmationHeader}>
              <Ionicons name="briefcase" size={48} color="#10b981" />
              <Text style={styles.confirmationTitle}>Hire Applicants</Text>
              <Text style={styles.confirmationMessage}>
                Are you sure you want to hire {selectedApplicants.size} applicant(s)? 
                This will close the job posting and notify the selected candidates.
              </Text>
            </View>

            <View style={styles.selectedApplicantsList}>
              {Array.from(selectedApplicants).map(applicantId => {
                const applicant = applicants.find(a => a.id === applicantId);
                return applicant ? (
                  <View key={applicantId} style={styles.selectedApplicantItem}>
                    <ProfilePicture 
                      size={32} 
                      showLongPress={false} 
                      imageUrl={applicant.user.profile_picture}
                      noBorder={true}
                    />
                    <Text style={styles.selectedApplicantName}>
                      {applicant.user.full_name || applicant.user.username}
                    </Text>
                  </View>
                ) : null;
              })}
            </View>

            <View style={styles.confirmationActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowHireModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={confirmHireApplicants}
                disabled={isHiring}
              >
                {isHiring ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Hire & Close Job</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Shortlist Confirmation Modal */}
      <Modal
        visible={showShortlistModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowShortlistModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmationModal}>
            <View style={styles.confirmationHeader}>
              <Ionicons name="star" size={48} color="#f59e0b" />
              <Text style={styles.confirmationTitle}>Shortlist Applicants</Text>
              <Text style={styles.confirmationMessage}>
                Are you sure you want to shortlist {selectedApplicants.size} applicant(s)? 
                This will reject all other applicants but keep the job posting open. You can then hire from your shortlist or shortlist different applicants.
              </Text>
            </View>

            <View style={styles.selectedApplicantsList}>
              {Array.from(selectedApplicants).map(applicantId => {
                const applicant = applicants.find(a => a.id === applicantId);
                return applicant ? (
                  <View key={applicantId} style={styles.selectedApplicantItem}>
                    <ProfilePicture 
                      size={32} 
                      showLongPress={false} 
                      imageUrl={applicant.user.profile_picture}
                      noBorder={true}
                    />
                    <Text style={styles.selectedApplicantName}>
                      {applicant.user.full_name || applicant.user.username}
                    </Text>
                  </View>
                ) : null;
              })}
            </View>

            <View style={styles.confirmationActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowShortlistModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.confirmButton, styles.shortlistConfirmButton]}
                onPress={confirmShortlistApplicants}
                disabled={isShortlisting}
              >
                {isShortlisting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Shortlist & Reject Others</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Close Job Confirmation Modal */}
      <Modal
        visible={showCloseJobModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCloseJobModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmationModal}>
            <View style={styles.confirmationHeader}>
              <Ionicons name="close-circle" size={48} color="#ef4444" />
              <Text style={styles.confirmationTitle}>Close Job Posting</Text>
              <Text style={styles.confirmationMessage}>
                Are you sure you want to close this job posting without hiring anyone? 
                This action cannot be undone and no new applications will be accepted.
              </Text>
            </View>

            <View style={styles.confirmationActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCloseJobModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.confirmButton, styles.closeConfirmButton]}
                onPress={confirmCloseJob}
                disabled={isClosingJob}
              >
                {isClosingJob ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Close Job</Text>
                )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#B0AAD9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerBackButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  jobCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  jobTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  jobDescription: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 20,
  },
  jobInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  jobInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    minWidth: '45%',
  },
  jobInfoText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
  },
  applicantsCount: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  jobClosedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  jobClosedText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '500',
    flex: 1,
  },
  skillsContainer: {
    marginBottom: 16,
  },
  skillsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },

  customFieldsContainer: {
    marginTop: 16,
  },
  customFieldsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  customFieldText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  applicantsCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  applicantsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  applicantsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 4,
  },
  applicantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    flex: 1,
  },
  applicantInfo: {
    flex: 1,
    marginLeft: 12,
  },
  applicantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  applicantDate: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 6,
  },
  applicantStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  applicantStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
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
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalScrollView: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  applicantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  applicantHeaderInfo: {
    marginLeft: 16,
    flex: 1,
  },
  modalApplicantName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  modalApplicantDate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  modalStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  modalStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
  },

  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  resumeIcon: {
    marginRight: 12,
  },
  resumeInfo: {
    flex: 1,
  },
  resumeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  resumeSize: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  resumeDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  resumeWarning: {
    fontSize: 11,
    color: '#f59e0b',
    fontStyle: 'italic',
    marginTop: 4,
  },

  questionAnswer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    marginRight: 12,
  },
  answerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  answerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
  },
  coverLetterText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
  },
  // Search and Filter Styles
  searchFilterCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  filterButtonText: {
    fontSize: 14,
    color: '#8b5cf6',
    fontWeight: '600',
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusFilterChip: {
    backgroundColor: '#fef3c7',
  },
  filterChipText: {
    fontSize: 12,
    color: '#4f46e5',
    fontWeight: '500',
  },
  // Resume Actions
  resumeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  // Filter Modal Styles
  filterModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  filterContent: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    maxHeight: 400,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  filterOptions: {
    gap: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  filterOptionSelected: {
    backgroundColor: '#f3f4f6',
    borderColor: '#8b5cf6',
  },
  filterOptionText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  filterOptionTextSelected: {
    color: '#8b5cf6',
    fontWeight: '600',
  },
  filterOptionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statusFilterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    marginRight: 12,
  },
  filterOptionCount: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '600',
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 24,
    textAlign: 'center',
  },
  filterOptionCountSelected: {
    backgroundColor: '#8b5cf6',
    color: '#fff',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
    gap: 12,
  },
  clearFiltersButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  clearFiltersText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  applyFiltersButton: {
    flex: 1,
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  applyFiltersText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Premium Features Styles
  premiumFeaturesCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  premiumHeader: {
    marginBottom: 12,
  },
  subscriptionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentPlanText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  upgradeLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  premiumActions: {
    gap: 12,
  },
  premiumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  premiumButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  premiumButtonDisabled: {
    backgroundColor: '#e5e7eb',
  },
  premiumButtonTextDisabled: {
    color: '#9ca3af',
  },
  downloadButton: {
    backgroundColor: '#3b82f6',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  hireButton: {
    backgroundColor: '#10b981',
    flex: 1,
  },
  shortlistButton: {
    backgroundColor: '#f59e0b',
    flex: 1,
  },
  closeButton: {
    backgroundColor: '#ef4444',
    flex: 1,
  },
  closeButtonPrimary: {
    backgroundColor: '#dc2626',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  selectedCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  // Applicant Selection Styles
  applicantContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  checkboxContainer: {
    marginRight: 12,
    padding: 4,
  },
  checkboxSpacer: {
    width: 28, // Same width as checkbox + marginRight
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  applicantItemSelected: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  applicantItemAccepted: {
    opacity: 0.7,
  },
  chevronContainer: {
    paddingLeft: 8,
    paddingRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 24,
  },
  // Confirmation Modal Styles
  confirmationModal: {
    backgroundColor: '#fff',
    borderRadius: 24,
    margin: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  confirmationHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
    marginBottom: 8,
  },
  confirmationMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  selectedApplicantsList: {
    maxHeight: 120,
    marginBottom: 20,
  },
  selectedApplicantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 4,
    gap: 8,
  },
  selectedApplicantName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  confirmationActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeConfirmButton: {
    backgroundColor: '#ef4444',
  },
  shortlistConfirmButton: {
    backgroundColor: '#f59e0b',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // ID Card Styles
  idCardInfo: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  idCardPhotoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  idCardField: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 20,
  },
  fieldLabel: {
    fontWeight: '600',
    color: '#1f2937',
  },
  idCardSkills: {
    marginTop: 12,
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  skillChip: {
    backgroundColor: '#e0e7ff',
    borderColor: '#a5b4fc',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1e40af',
  },
  resumeActionText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#8b5cf6',
    marginTop: 2,
  },
});

