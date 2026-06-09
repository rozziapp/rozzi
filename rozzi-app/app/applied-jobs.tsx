import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useCustomFonts } from '@/hooks/fonts';
import { router } from 'expo-router';
import API, { hireRequestAPI } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Interface for applied job data from Django backend
interface AppliedJob {
  id: number;
  job: {
    id: number;
    title: string;
    description: string;
    salary_min?: number;
    salary_max?: number;
    location: string;
    job_type: string;
    category: string;
    sector: string;
    user: {
      id: number;
      username: string;
      full_name: string;
      profile_picture?: string;
    };
  };
  applied_date: string;
  status: string;
  cover_letter?: string;
}

// Interface for job preference data from Django backend
interface JobPreference {
  id: number;
  title: string;
  description: string;
  salary_min?: number;
  salary_max?: number;
  location: string;
  job_type: string;
  category: string;
  sector: string;
  experience_level: string;
  created_at: string;
  status: string;
  applicants_count: number;
  user: {
    id: number;
    username: string;
    full_name: string;
    profile_picture?: string;
  };
}

interface Applicant {
  id: number;
  user: {
    id: number;
    username: string;
    full_name: string;
    profile_picture?: string;
  };
  applied_date: string;
  status: string;
  cover_letter?: string;
}

// Interface for hire request data
interface HireRequest {
  id: number;
  job: {
    id: number;
    title: string;
    description: string;
    job_type: string;
    location: string;
    sector: string;
    status: string;
    created_at: string;
  };
  requester: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    full_name: string;
  };
  status: string;
  message: string;
  created_at: string;
}

export default function AppliedJobsScreen() {
  const [fontsLoaded] = useCustomFonts();
  const { user, isAuthenticated, token, reloadUserProfile } = useAuth();
  const { colors, colorScheme } = useAppTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'applied' | 'posted'>('applied');
  const [appliedJobs, setAppliedJobs] = useState<AppliedJob[]>([]);
  const [jobPreferences, setJobPreferences] = useState<JobPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedJobType, setSelectedJobType] = useState('All');
  const [selectedSector, setSelectedSector] = useState('All');
  const [selectedDateRange, setSelectedDateRange] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showApplicants, setShowApplicants] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [selectedJobTitle, setSelectedJobTitle] = useState('');
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

  // Hire request state
  const [hireRequests, setHireRequests] = useState<HireRequest[]>([]);
  const [loadingHireRequests, setLoadingHireRequests] = useState(false);

  // Fetch applied jobs and job preferences from Django backend
  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch applied jobs
      try {
        const appliedResponse = await API.get('/applications/');
        console.log('✅ Fetched applied jobs:', appliedResponse.data?.results?.length || 0);
        setAppliedJobs(appliedResponse.data?.results || []);
      } catch (appliedError: any) {
        console.log('❌ Applied jobs error:', appliedError.response?.status, appliedError.message);
        setAppliedJobs([]);
      }

      // Fetch job preferences (user's own job-seeking posts)
      try {
        const preferencesResponse = await API.get('/jobs/my-preferences/');
        console.log('✅ Fetched job preferences:', preferencesResponse.data?.results?.length || 0);
        let jobPreferencesData = preferencesResponse.data?.results || [];

        // Fetch hire requests to get accurate applicant counts for job-seeking posts
        try {
          const hireRequestsResponse = await API.get('/hire-requests/received/');
          const hireRequests = hireRequestsResponse.data?.results || hireRequestsResponse.data || [];

          // Update applicant count for each job preference based on actual hire requests
          jobPreferencesData = jobPreferencesData.map((job: any) => {
            const jobHireRequests = hireRequests.filter((request: any) =>
              request.job && request.job.id === job.id
            );
            return {
              ...job,
              applicants_count: jobHireRequests.length
            };
          });

          console.log('✅ Updated job preferences with accurate applicant counts');
        } catch (hireError: any) {
          console.log('⚠️ Could not fetch hire requests for applicant count:', hireError.message);
          // Continue with original applicant counts if hire requests can't be fetched
        }

        setJobPreferences(jobPreferencesData);
      } catch (prefError: any) {
        console.log('❌ Job preferences error:', prefError.response?.status, prefError.message);
        setJobPreferences([]);
      }

      // Fetch hire requests for the user's job-seeking posts
      try {
        console.log('🎯 Fetching hire requests for user...');
        const hireRequestsData = await hireRequestAPI.getReceivedHireRequests();
        console.log('✅ Fetched hire requests response:', hireRequestsData);

        // Handle paginated response structure
        const hireRequests = hireRequestsData?.results || hireRequestsData || [];
        console.log('✅ Processed hire requests:', hireRequests.length);

        if (hireRequests.length > 0) {
          console.log('📋 First hire request:', hireRequests[0]);
        }
        setHireRequests(hireRequests);
      } catch (hireError: any) {
        console.log('❌ Hire requests error:', hireError.response?.status, hireError.message);
        if (hireError.response?.data) {
          console.log('📄 Error response data:', hireError.response.data);
        }
        setHireRequests([]);
      }

      setError(null);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      // If backend is not available, use mock data for development
      if (__DEV__) {
        console.log('Using mock data for development due to network error');
        setAppliedJobs([
          {
            id: 1,
            job: {
              id: 1,
              title: 'Frontend Developer',
              description: 'Looking for a skilled frontend developer',
              salary_min: 600000,
              salary_max: 1000000,
              location: 'Mumbai, India',
              job_type: 'Full-time',
              category: 'Full-time',
              sector: 'Professional',
              user: {
                id: 1,
                username: 'techcorp',
                full_name: 'TechCorp Solutions',
                profile_picture: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=150&h=150&fit=crop&crop=face'
              }
            },
            applied_date: '2024-01-15T10:00:00Z',
            status: 'Under Review',
            cover_letter: 'I am excited to apply for this position...'
          }
        ]);
        setJobPreferences([
          {
            id: 1,
            title: 'Looking for React Native Developer role',
            description: 'Experienced React Native developer seeking new opportunities',
            salary_min: 800000,
            salary_max: 1200000,
            location: 'Remote',
            job_type: 'Full-time',
            category: 'Technology',
            sector: 'Professional',
            experience_level: '2-5 years',
            created_at: '2024-01-15T10:00:00Z',
            status: 'Open',
            applicants_count: 1, // Mock data shows 1 applicant
            user: {
              id: 1,
              username: 'developer',
              full_name: 'John Developer',
              profile_picture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
            }
          }
        ]);
      } else {
        setError(error.response?.data?.message || 'Failed to fetch data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'under review':
      case 'pending':
        return '#f59e0b';
      case 'shortlisted':
      case 'accepted':
        return '#10b981';
      case 'rejected':
      case 'declined':
        return '#ef4444';
      case 'active':
        return '#3b82f6';
      case 'closed':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const getRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) === 1 ? '' : 's'} ago`;
    return date.toLocaleDateString();
  };

  const formatSalary = (min?: number, max?: number, jobType?: string) => {
    if (!min && !max) return 'Salary not specified';
    const suffix = jobType?.toLowerCase() === 'one-time' ? '' : '/month';
    if (min && max) return `₹${min.toLocaleString()}-${max.toLocaleString()}${suffix}`;
    if (min) return `₹${min.toLocaleString()}${suffix}`;
    if (max) return `₹${max.toLocaleString()}${suffix}`;
    return 'Salary not specified';
  };

  const fetchApplicants = async (jobId: number, jobTitle: string) => {
    try {
      setLoadingApplicants(true);
      setSelectedJobId(jobId);
      setSelectedJobTitle(jobTitle);

      if (activeTab === 'posted') {
        // For job-seeking posts, fetch hire requests (responses from recruiters)
        try {
          const response = await API.get('/hire-requests/received/');
          const allHireRequests = response.data?.results || response.data || [];

          // Filter hire requests for the specific job-seeking post
          const jobHireRequests = allHireRequests.filter((request: any) =>
            request.job && request.job.id === jobId
          );

          // Transform hire requests to match the Applicant interface
          const transformedApplicants = jobHireRequests.map((request: any) => ({
            id: request.id,
            user: {
              id: request.requester.id,
              username: request.requester.username,
              full_name: request.requester.full_name,
              profile_picture: request.requester.profile_picture
            },
            applied_date: request.created_at,
            status: request.status,
            cover_letter: request.message || 'No message provided'
          }));

          setApplicants(transformedApplicants);
          setShowApplicants(true);
        } catch (error: any) {
          console.error('Error fetching hire requests:', error);
          // For development, use mock data
          if (__DEV__) {
            setApplicants([
              {
                id: 1,
                user: {
                  id: 1,
                  username: 'recruiter_company',
                  full_name: 'TechCorp Solutions',
                  profile_picture: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=150&h=150&fit=crop&crop=face'
                },
                applied_date: '2024-01-15T10:00:00Z',
                status: 'Pending',
                cover_letter: 'We are interested in your React Native skills and would like to discuss a potential opportunity at our company.'
              }
            ]);
            setShowApplicants(true);
          } else {
            setError('Failed to fetch responses');
          }
        }
      } else {
        // For regular job posts, fetch job applications
        try {
          const response = await API.get(`/jobs/${jobId}/applications/`);
          setApplicants(response.data?.results || []);
          setShowApplicants(true);
        } catch (error: any) {
          console.error('Error fetching applicants:', error);
          setApplicants([]);
          setError('Failed to fetch applicants');
        }
      }
    } catch (error: any) {
      console.error('Error fetching applicants:', error);
      setError('Failed to fetch data');
    } finally {
      setLoadingApplicants(false);
    }
  };

  const handleCloseJob = async (jobId: number, jobTitle: string) => {
    Alert.alert(
      'Close Job Seeking Post',
      `Are you sure you want to close "${jobTitle}"? This action cannot be undone and no new responses will be accepted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close Post',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔄 Closing job seeking post:', jobId, jobTitle);

              // Update the job preference status to closed
              // Job preferences are stored in the jobs table with post_type: 'looking'
              const response = await API.patch(`/jobs/${jobId}/update/`, { status: 'Closed' });
              console.log('✅ Close job API response:', response.status);

              // Update local state
              setJobPreferences(prev => prev.map(job =>
                job.id === jobId ? { ...job, status: 'Closed' } : job
              ));

              console.log('✅ Job seeking post closed successfully. Status updated in local state.');
              Alert.alert('Success', 'Job seeking post has been closed successfully.');

              // Note: The post will now be hidden from:
              // 1. Applied jobs screen (filtered by status !== 'Closed')
              // 2. Home screen (filtered by status !== 'Closed' in fetchJobs)
              // 3. User profile screen (filtered by status === 'Open' in fetchUserPosts)

            } catch (error) {
              console.error('❌ Error closing job seeking post:', error);
              Alert.alert('Error', 'Failed to close job seeking post. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleDeleteJobSeeking = async (jobId: number, jobTitle: string) => {
    Alert.alert(
      'Delete Job Seeking Post',
      `Are you sure you want to permanently delete "${jobTitle}"? This will free up a job seeking slot.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔄 Deleting job seeking post:', jobId, jobTitle);
              await API.delete(`/jobs/${jobId}/`);
              setJobPreferences(prev => prev.filter(job => job.id !== jobId));
              if (reloadUserProfile) {
                await reloadUserProfile();
              }
              Alert.alert('Success', 'Job seeking post has been deleted successfully.');
            } catch (error: any) {
              console.error('❌ Error deleting job seeking post:', error);
              const errMsg = error.response?.data?.detail || 'Failed to delete post. Please try again.';
              Alert.alert('Error', errMsg);
            }
          }
        }
      ]
    );
  };

  const getCurrentData = () => {
    if (activeTab === 'applied') {
      return appliedJobs && Array.isArray(appliedJobs) ? appliedJobs.filter(job => {
        const matchesSearch = searchQuery === '' ||
          job.job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.job.user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.job.location.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = selectedStatus === 'All' || job.status === selectedStatus;
        const matchesJobType = selectedJobType === 'All' || job.job.job_type === selectedJobType;
        const matchesSector = selectedSector === 'All' || job.job.sector === selectedJobType;

        // Date range filtering
        let matchesDateRange = true;
        if (selectedDateRange !== 'All') {
          const appliedDate = new Date(job.applied_date);
          const now = new Date();
          const diffDays = Math.ceil((now.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24));

          switch (selectedDateRange) {
            case 'Today':
              matchesDateRange = diffDays === 0;
              break;
            case 'This Week':
              matchesDateRange = diffDays <= 7;
              break;
            case 'This Month':
              matchesDateRange = diffDays <= 30;
              break;
            case 'Last 3 Months':
              matchesDateRange = diffDays <= 90;
              break;
          }
        }

        return matchesSearch && matchesStatus && matchesJobType && matchesSector && matchesDateRange;
      }) : [];
    } else {
      // For Job Seeking tab, return job preferences (user's own seeking posts)
      return jobPreferences && Array.isArray(jobPreferences) ? jobPreferences.filter(job => {
        const matchesSearch = searchQuery === '' ||
          job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.location.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = selectedStatus === 'All' || job.status === selectedStatus;
        const matchesJobType = selectedJobType === 'All' || job.job_type === selectedJobType;
        const matchesSector = selectedJobType === 'All' || job.sector === selectedJobType;

        // Date range filtering
        let matchesDateRange = true;
        if (selectedDateRange !== 'All') {
          const createdDate = new Date(job.created_at);
          const now = new Date();
          const diffDays = Math.ceil((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

          switch (selectedDateRange) {
            case 'Today':
              matchesDateRange = diffDays === 0;
              break;
            case 'This Week':
              matchesDateRange = diffDays <= 7;
              break;
            case 'This Month':
              matchesDateRange = diffDays <= 30;
              break;
            case 'Last 3 Months':
              matchesDateRange = diffDays <= 90;
              break;
          }
        }

        return matchesSearch && matchesStatus && matchesJobType && matchesSector && matchesDateRange;
      }) : [];
    }
  };

  const currentData = getCurrentData();



  if (!fontsLoaded) {
    return null;
  }

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.brandBackground }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.brandBackground }]}>
        <Text style={{ color: colors.error, marginBottom: 16 }}>Error: {error}</Text>
        <TouchableOpacity
          style={{ backgroundColor: colors.primary, padding: 12, borderRadius: 8 }}
          onPress={() => {
            setError(null);
            setLoading(true);
            // Re-fetch data
            fetchData();
          }}
        >
          <Text style={{ color: '#fff' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusOptions = activeTab === 'applied'
    ? ['All', 'Pending', 'Under Review', 'Shortlisted', 'Accepted', 'Rejected']
    : ['All', 'Pending', 'Accepted', 'Rejected', 'Withdrawn'];

  const jobTypeOptions = ['All', 'Full-time', 'Part-time', 'One-time', 'Contract'];
  const sectorOptions = ['All', 'Local', 'Professional'];
  const dateRangeOptions = ['All', 'Today', 'This Week', 'This Month', 'Last 3 Months'];

  const renderJobCard = (item: AppliedJob | JobPreference | HireRequest) => {
    if (activeTab === 'applied' && 'job' in item) {
      const appliedJob = item as AppliedJob;
      return (
        <View key={appliedJob.id} style={[styles.jobCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
          {/* Status Badge at Top Right */}
          <View style={styles.statusBadgeTop}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appliedJob.status) }]}>
               <Text style={styles.statusText}>{appliedJob.status}</Text>
            </View>
          </View>

          <View style={styles.jobHeader}>
            <View style={styles.jobInfo}>
              <Text style={[styles.jobTitle, { color: colors.text }]} numberOfLines={2}>{appliedJob.job.title}</Text>
              <Text style={[styles.companyName, { color: colors.textSecondary }]}>{appliedJob.job.user.full_name}</Text>
              <View style={styles.jobDetailsRow}>
                <View style={styles.detailItem}>
                  <Ionicons name="location-outline" size={18} color={colors.error} />
                  <Text style={[styles.detailText, { color: colors.textSecondary }]} numberOfLines={1}>{appliedJob.job.location}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="time-outline" size={18} color={colors.primary} />
                  <Text style={[styles.detailText, { color: colors.textSecondary }]} numberOfLines={1}>{appliedJob.job.job_type}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Salary Information */}
          <View style={styles.salaryRow}>
            <Text style={[styles.salaryLabel, { color: colors.textSecondary }]}>Salary:</Text>
            <Text style={[styles.salary, { color: colors.success }]}>{formatSalary(appliedJob.job.salary_min, appliedJob.job.salary_max, appliedJob.job.job_type)}</Text>
          </View>

          {/* Application Info Footer */}
          <View style={styles.applicationFooter}>
            <View style={styles.applicationInfo}>
              <Text style={[styles.appliedDate, { color: colors.textSecondary }]}>Applied {getRelativeDate(appliedJob.applied_date)}</Text>
              {appliedJob.cover_letter && (
                <Text style={[styles.coverLetterPreview, { color: colors.text }]} numberOfLines={2}>
                  "{appliedJob.cover_letter}"
                </Text>
              )}
            </View>
          </View>
        </View>
      );
    } else if (activeTab === 'posted' && 'title' in item) {
      const jobPreference = item as JobPreference;
      return (
        <View key={jobPreference.id} style={[styles.jobCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
          <View style={styles.statusBadgeTop}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(jobPreference.status) }]}>
              <Text style={styles.statusText}>{jobPreference.status}</Text>
            </View>
          </View>

          <View style={styles.jobHeader}>
            <View style={styles.jobInfo}>
              <Text style={[styles.jobTitle, { color: colors.text }]} numberOfLines={2}>{jobPreference.title}</Text>
              <View style={styles.categoryRow}>
                <Text style={[styles.categoryText, { color: colors.primary }]}>{jobPreference.job_type}</Text>
              </View>
            </View>
          </View>

          <View style={styles.jobDetailsRow}>
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={18} color={colors.error} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]} numberOfLines={1}>{jobPreference.location}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="briefcase-outline" size={18} color={colors.primary} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]} numberOfLines={1}>{jobPreference.category}</Text>
            </View>
          </View>

          {(jobPreference.salary_min || jobPreference.salary_max) && (
            <View style={styles.salaryRow}>
              <Text style={[styles.salaryLabel, { color: colors.textSecondary }]}>Salary:</Text>
              <Text style={[styles.salary, { color: colors.success }]}>{formatSalary(jobPreference.salary_min, jobPreference.salary_max, jobPreference.job_type)}</Text>
            </View>
          )}

          <View style={styles.jobFooter}>
            <View style={styles.metricsContainer}>
              <View style={styles.metricItem}>
                <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.metricText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {activeTab === 'posted'
                    ? `${jobPreference.applicants_count} response${jobPreference.applicants_count !== 1 ? 's' : ''}`
                    : `${jobPreference.applicants_count} applicants`
                  }
                </Text>
              </View>
              <View style={styles.metricItem}>
                <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.metricText, { color: colors.textSecondary }]} numberOfLines={1}>Posted {getRelativeDate(jobPreference.created_at)}</Text>
              </View>
            </View>
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={styles.viewOffersButton}
                onPress={() => fetchApplicants(jobPreference.id, jobPreference.title)}
              >
                <Text style={styles.viewOffersText}>
                  {activeTab === 'posted' ? 'View Responses' : 'View Applicants'}
                </Text>
              </TouchableOpacity>
              {/* Close Job Button - Only show for open job-seeking posts */}
              {activeTab === 'posted' && jobPreference.status === 'Open' && (
                <TouchableOpacity
                  style={styles.closeJobButton}
                  onPress={() => handleCloseJob(jobPreference.id, jobPreference.title)}
                >
                  <Ionicons name="close-circle" size={16} color={colors.error} />
                  <Text style={styles.closeJobText}>Close</Text>
                </TouchableOpacity>
              )}
              {/* Delete Job Seeking Button - Show for all job-seeking posts (Job Seeking tab) */}
              {activeTab === 'posted' && (
                <TouchableOpacity
                  style={styles.closeJobButton}
                  onPress={() => handleDeleteJobSeeking(jobPreference.id, jobPreference.title)}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.error} />
                  <Text style={styles.closeJobText}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.brandBackground }]}>
      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.brandBackground, paddingTop: Math.max(insets.top + 6, 30) }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Jobs</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Toggle Buttons */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            { backgroundColor: colors.cardAlt },
            activeTab === 'applied' && [styles.activeToggleButton, { backgroundColor: colors.primary }]
          ]}
          onPress={() => setActiveTab('applied')}
        >
          <Text style={[
            styles.toggleText,
            { color: colors.textSecondary },
            activeTab === 'applied' && [styles.activeToggleText, { color: '#fff' }]
          ]}>
            Applied Jobs
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            { backgroundColor: colors.cardAlt },
            activeTab === 'posted' && [styles.activeToggleButton, { backgroundColor: colors.primary }]
          ]}
          onPress={() => setActiveTab('posted')}
        >
          <Text style={[
            styles.toggleText,
            { color: colors.textSecondary },
            activeTab === 'posted' && [styles.activeToggleText, { color: '#fff' }]
          ]}>
            Job Seeking
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search and Filter Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={activeTab === 'applied' ? "Search jobs or companies..." : "Search job posts..."}
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="filter" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
      >
        {currentData.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>No {activeTab === 'applied' ? 'jobs' : 'job posts'} found</Text>
            <Text style={[styles.emptyStateSubtext, { color: colors.textSecondary }]}>Try adjusting your search or filters</Text>
          </View>
        ) : (
          currentData.map(item => activeTab === 'applied' ? renderJobCard(item) : renderJobCard(item))
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.filterModal, { backgroundColor: colors.card }]}>
            <View style={[styles.filterHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.filterTitle, { color: colors.text }]}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.filterContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Status Filter */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: colors.text }]}>
                  {activeTab === 'applied' ? 'Job Status' : 'Request Status'}
                </Text>
                <View style={styles.filterOptions}>
                  {statusOptions.map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.filterOption,
                        { borderColor: colors.border, backgroundColor: colors.cardAlt },
                        selectedStatus === status && [styles.filterOptionSelected, { borderColor: colors.primary, backgroundColor: `${colors.primary}15` }]
                      ]}
                      onPress={() => setSelectedStatus(status)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        { color: colors.textSecondary },
                        selectedStatus === status && [styles.filterOptionTextSelected, { color: colors.primary }]
                      ]}>
                        {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Job Type Filter */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Job Type</Text>
                <View style={styles.filterOptions}>
                  {jobTypeOptions.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.filterOption,
                        { borderColor: colors.border, backgroundColor: colors.cardAlt },
                        selectedJobType === type && [styles.filterOptionSelected, { borderColor: colors.primary, backgroundColor: `${colors.primary}15` }]
                      ]}
                      onPress={() => setSelectedJobType(type)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        { color: colors.textSecondary },
                        selectedJobType === type && [styles.filterOptionTextSelected, { color: colors.primary }]
                      ]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Sector Filter */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Sector</Text>
                <View style={styles.filterOptions}>
                  {sectorOptions.map((sector) => (
                    <TouchableOpacity
                      key={sector}
                      style={[
                        styles.filterOption,
                        { borderColor: colors.border, backgroundColor: colors.cardAlt },
                        selectedSector === sector && [styles.filterOptionSelected, { borderColor: colors.primary, backgroundColor: `${colors.primary}15` }]
                      ]}
                      onPress={() => setSelectedSector(sector)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        { color: colors.textSecondary },
                        selectedSector === sector && [styles.filterOptionTextSelected, { color: colors.primary }]
                      ]}>
                        {sector}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Date Range Filter */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Date Range</Text>
                <View style={styles.filterOptions}>
                  {dateRangeOptions.map((dateRange) => (
                    <TouchableOpacity
                      key={dateRange}
                      style={[
                        styles.filterOption,
                        { borderColor: colors.border, backgroundColor: colors.cardAlt },
                        selectedDateRange === dateRange && [styles.filterOptionSelected, { borderColor: colors.primary, backgroundColor: `${colors.primary}15` }]
                      ]}
                      onPress={() => setSelectedDateRange(dateRange)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        { color: colors.textSecondary },
                        selectedDateRange === dateRange && [styles.filterOptionTextSelected, { color: colors.primary }]
                      ]}>
                        {dateRange}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Action Buttons - Fixed at bottom */}
            <View style={styles.filterActions}>
              <TouchableOpacity
                style={[styles.clearFiltersButton, { backgroundColor: colors.cardAlt }]}
                onPress={() => {
                  setSelectedStatus('All');
                  setSelectedJobType('All');
                  setSelectedSector('All');
                  setSelectedDateRange('All');
                }}
              >
                <Text style={[styles.clearFiltersText, { color: colors.text }]}>Clear All Filters</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.applyFiltersButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.applyFiltersText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Applicants Modal */}
      <Modal
        visible={showApplicants}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowApplicants(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.applicantsModal, { backgroundColor: colors.card }]}>
            <View style={[styles.applicantsHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.applicantsTitle, { color: colors.text }]}>
                {activeTab === 'posted' ? 'Responses to "' : 'Applicants for "'}{selectedJobTitle}"
              </Text>
              <TouchableOpacity onPress={() => setShowApplicants(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {loadingApplicants ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  {activeTab === 'posted' ? 'Loading responses...' : 'Loading applicants...'}
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.applicantsContent}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                contentContainerStyle={styles.applicantsScrollContent}
              >
                {applicants.length === 0 ? (
                  <View style={styles.emptyApplicants}>
                    <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
                    <Text style={[styles.emptyApplicantsText, { color: colors.text }]}>
                      {activeTab === 'posted' ? 'No responses yet' : 'No applicants yet'}
                    </Text>
                    <Text style={[styles.emptyApplicantsSubtext, { color: colors.textSecondary }]}>
                      {activeTab === 'posted'
                        ? 'Check back later for new responses to your availability post'
                        : 'Check back later for new applications to your job post'
                      }
                    </Text>
                  </View>
                ) : (
                  applicants.map((applicant) => (
                    <View key={applicant.id} style={[styles.applicantCard, { backgroundColor: colors.cardAlt, borderColor: colors.border, borderWidth: 1 }]}>
                      <View style={styles.applicantHeader}>
                        <Image
                          source={{ uri: applicant.user.profile_picture || 'https://via.placeholder.com/50' }}
                          style={styles.applicantAvatar}
                        />
                        <View style={styles.applicantInfo}>
                          <View style={styles.applicantTopRow}>
                            <Text style={[styles.applicantName, { color: colors.text }]}>{applicant.user.full_name}</Text>
                          </View>
                          <View style={styles.applicantBottomRow}>
                            <Text style={[styles.applicantUsername, { color: colors.textSecondary }]}>@{applicant.user.username}</Text>
                            <TouchableOpacity
                              style={styles.contactButton}
                              onPress={() => {
                                // Navigate to chat/inbox with this applicant
                                router.push('/chat');
                              }}
                            >
                              <Ionicons name="chatbubble-outline" size={14} color="#fff" />
                              <Text style={styles.contactButtonText}>
                                {activeTab === 'posted' ? 'Respond' : 'Message'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>

                      {applicant.cover_letter && (
                        <View style={styles.coverLetterSection}>
                          <Text style={styles.coverLetterText} numberOfLines={2}>
                            {applicant.cover_letter}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.brandBackground,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 6,
    backgroundColor: colors.brandBackground,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  placeholder: {
    width: 32,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 25,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 21,
    alignItems: 'center',
    position: 'relative',
  },
  activeToggleButton: {
    backgroundColor: colors.card,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  activeToggleText: {
    color: '#B0AAD9',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: colors.text,
  },
  filterButton: {
    backgroundColor: colors.card,
    padding: 8,
    borderRadius: 8,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  dateGroupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
    marginTop: 16,
  },
  jobCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  jobInfo: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    paddingRight: 20,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  companyName: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 2,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  location: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  appliesText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
  },
  salaryContainer: {
    alignItems: 'flex-end',
  },
  salary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusContainer: {
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 0,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#fff',
  },
  appliedDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  viewButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: colors.card,
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
    paddingTop: 16,
    paddingBottom: 16,
    maxHeight: 350,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.cardAlt,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterOptionText: {
    fontSize: 14,
    color: colors.text,
  },
  filterOptionTextSelected: {
    color: '#fff',
  },
  clearFiltersButton: {
    backgroundColor: colors.cardAlt,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  clearFiltersText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: colors.card,
  },
  applyFiltersButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  applyFiltersText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },

  statusBadgeTop: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  categoryRow: {
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  metricsContainer: {
    flexDirection: 'row',
    gap: 16,
    flex: 1,
    flexWrap: 'wrap',
    overflow: 'hidden',
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
    flexShrink: 1,
  },
  metricText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    flexShrink: 1,
  },
  viewOffersButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
    flexShrink: 0,
  },
  viewOffersText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    flexWrap: 'wrap',
    flex: 1,
  },
  closeJobButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
    backgroundColor: 'transparent',
  },
  closeJobText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
  },
  jobDetailsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
    maxWidth: '48%',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: colors.cardAlt,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
    flexWrap: 'wrap',
    flexShrink: 1,
    minWidth: 0,
    fontWeight: '600',
  },
  salaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexWrap: 'wrap',
    gap: 8,
  },
  salaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginRight: 8,
    flexShrink: 0,
  },
  applicationFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    overflow: 'hidden',
  },
  applicationInfo: {
    gap: 8,
    flexWrap: 'wrap',
  },
  coverLetterPreview: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 20,
    flexWrap: 'wrap',
    flexShrink: 1,
  },

  // Applicants Modal Styles
  applicantsModal: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  applicantsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  applicantsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    marginRight: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
  applicantsContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    maxHeight: '80%',
  },
  applicantsScrollContent: {
    paddingBottom: 20,
  },
  emptyApplicants: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyApplicantsText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 16,
  },
  emptyApplicantsSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  applicantCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  applicantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  applicantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  applicantInfo: {
    flex: 1,
  },
  applicantTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 1,
  },
  applicantBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 0,
  },
  applicantName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  applicantUsername: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  coverLetterSection: {
    marginBottom: 0,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  coverLetterText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: colors.primary,
    minWidth: 70,
  },
  contactButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  messageContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#8b5cf6',
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  messageText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  countBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  countText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
}); 
