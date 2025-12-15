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
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCustomFonts } from '@/hooks/fonts';
import { router } from 'expo-router';
import API from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

// Interface for posted job data from Django backend
interface PostedJob {
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
  updated_at: string;
  status: string;
  applicants_count: number;
  user: {
    id: number;
    username: string;
    full_name: string;
    profile_picture?: string;
  };
}

export default function PostedJobsScreen() {
  const [fontsLoaded] = useCustomFonts();
  const { user, isAuthenticated, token } = useAuth();
  const [postedJobs, setPostedJobs] = useState<PostedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedJobType, setSelectedJobType] = useState('All');
  const [selectedSector, setSelectedSector] = useState('All');
  const [selectedDateRange, setSelectedDateRange] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch posted jobs from Django backend
  const fetchPostedJobs = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching posted jobs from API...');
      console.log('👤 Current user:', user);
      console.log('🔐 Is authenticated:', isAuthenticated);
      console.log('🎫 Has token:', !!token);
      const response = await API.get('/jobs/my-posts/');
      console.log('✅ API Response received:', response.status);
      console.log('📦 Response data:', response.data);
      
      // Handle paginated response - extract jobs from results field
      const jobs = response.data?.results || response.data || [];
      console.log('📊 Number of jobs received:', jobs.length);
      console.log('🎯 Jobs data:', jobs);
      setPostedJobs(jobs);
      setError(null);
    } catch (error: any) {
      console.error('❌ Error fetching posted jobs:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      // If backend is not available, use mock data for development
      if (__DEV__) {
        console.log('🔄 Using mock data for development');
        setPostedJobs([
          {
            id: 1,
            title: 'React Native Developer',
            description: 'Looking for an experienced React Native developer to join our team.',
            salary_min: 800000,
            salary_max: 1200000,
            location: 'Remote',
            job_type: 'Full-time',
            category: 'Full-time',
            sector: 'Professional',
            experience_level: '2-5 years',
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z',
            status: 'Open',
            applicants_count: 45,
            user: {
              id: 1,
              username: 'techcompany',
              full_name: 'Tech Solutions Inc',
              profile_picture: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=150&h=150&fit=crop&crop=face'
            }
          },
          {
            id: 2,
            title: 'Content Creator',
            description: 'Creative content creator needed for social media management.',
            salary_min: 25000,
            salary_max: 35000,
            location: 'Mumbai, India',
            job_type: 'Part-time',
            category: 'Part-time',
            sector: 'Local',
            experience_level: 'Fresher',
            created_at: '2024-01-12T14:30:00Z',
            updated_at: '2024-01-12T14:30:00Z',
            status: 'Open',
            applicants_count: 23,
            user: {
              id: 1,
              username: 'techcompany',
              full_name: 'Tech Solutions Inc',
              profile_picture: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=150&h=150&fit=crop&crop=face'
            }
          }
        ]);
      } else {
        setError(error.response?.data?.message || 'Failed to fetch posted jobs');
      }
    } finally {
      setLoading(false);
    }
  };

  // Pull to refresh function
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Reset filters to default state
      setSelectedStatus('All');
      setSelectedJobType('All');
      setSelectedSector('All');
      setSelectedDateRange('All');
      setSearchQuery('');
      
      // Fetch fresh data
      await fetchPostedJobs();
    } catch (error) {
      console.error('Error refreshing posted jobs:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPostedJobs();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
      case 'active':
        return '#10b981';
      case 'closed':
      case 'inactive':
        return '#6b7280';
      case 'draft':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return 'Salary not specified';
    if (min && max) return `₹${min.toLocaleString()}-${max.toLocaleString()}/month`;
    if (min) return `₹${min.toLocaleString()}/month`;
    if (max) return `₹${max.toLocaleString()}/month`;
    return 'Salary not specified';
  };

  const filteredJobs = postedJobs && Array.isArray(postedJobs) ? postedJobs.filter(job => {
    const matchesSearch = searchQuery === '' || 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'All' || job.status === selectedStatus;
    const matchesJobType = selectedJobType === 'All' || job.job_type === selectedJobType;
    const matchesSector = selectedSector === 'All' || job.sector === selectedSector;
    
    // Date range filtering
    let matchesDateRange = true;
    if (selectedDateRange !== 'All') {
      const postedDate = new Date(job.created_at);
      const now = new Date();
      const diffDays = Math.ceil((now.getTime() - postedDate.getTime()) / (1000 * 60 * 60 * 24));
      
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

  const handlePostPress = (jobId: number) => {
    // Navigate to job details screen to view applicants
    console.log('Navigate to job details:', jobId);
    router.push(`/job-details?jobId=${jobId}`);
  };

  const handleCloseJob = (jobId: number, jobTitle: string) => {
    Alert.alert(
      'Close Job Posting',
      `Are you sure you want to close "${jobTitle}"? This action cannot be undone and no new applications will be accepted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Close Job',
          style: 'destructive',
          onPress: async () => {
            try {
              await API.patch(`/jobs/${jobId}/update/`, { status: 'Closed' });
              
              // Update local state
              setPostedJobs(prev => prev.map(job => 
                job.id === jobId ? { ...job, status: 'Closed' } : job
              ));
              
              Alert.alert('Success', 'Job posting has been closed successfully.');
            } catch (error) {
              console.error('Error closing job:', error);
              Alert.alert('Error', 'Failed to close job posting. Please try again.');
            }
          }
        }
      ]
    );
  };

  if (!fontsLoaded) {
    return null;
  }

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={{ marginTop: 16, color: '#6b7280' }}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#ef4444', marginBottom: 16 }}>Error: {error}</Text>
        <TouchableOpacity 
          style={{ backgroundColor: '#8b5cf6', padding: 12, borderRadius: 8 }}
          onPress={() => {
            setError(null);
            setLoading(true);
            // Re-fetch data
            fetchPostedJobs();
          }}
        >
          <Text style={{ color: '#fff' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const groupedJobs = filteredJobs && Array.isArray(filteredJobs) ? filteredJobs.reduce((acc, job) => {
    const dateGroup = getRelativeDate(job.created_at);
    if (!acc[dateGroup]) {
      acc[dateGroup] = [];
    }
    acc[dateGroup].push(job);
    return acc;
  }, {} as { [key: string]: PostedJob[] }) : {};

  const statusOptions = ['All', 'Open', 'Closed'];
  const jobTypeOptions = ['All', 'Full-time', 'Part-time', 'One-time'];
  const sectorOptions = ['All', 'Local', 'Professional'];
  const dateRangeOptions = ['All', 'Today', 'This Week', 'This Month', 'Last 3 Months'];

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
        <Text style={styles.title}>Posted Jobs</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={refreshing}
        >
          <Ionicons 
            name="refresh" 
            size={24} 
            color={refreshing ? '#9ca3af' : '#6b7280'} 
          />
        </TouchableOpacity>
      </View>

      {/* Search and Filter Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search job posts..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="filter" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Refresh Status Indicator */}
      {refreshing && (
        <View style={styles.refreshIndicator}>
          <ActivityIndicator size="small" color="rgb(149, 125, 222)" />
          <Text style={styles.refreshIndicatorText}>Refreshing...</Text>
        </View>
      )}

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['rgb(149, 125, 222)', '#6b46c1']}
            title="Pull to refresh"
            titleColor="rgb(149, 125, 222)"
          />
        }
      >
        {Object.keys(groupedJobs).length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="#B0AAD9" />
            <Text style={styles.emptyStateText}>No posted jobs found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery || selectedStatus !== 'All' || selectedJobType !== 'All' || selectedSector !== 'All' || selectedDateRange !== 'All'
                ? 'Try adjusting your search or filters'
                : 'Jobs you post will appear here'}
            </Text>
          </View>
        ) : (
          Object.entries(groupedJobs).map(([dateGroup, jobs]) => (
            <View key={dateGroup}>
              <Text style={styles.dateGroupTitle}>{dateGroup}</Text>
              {jobs.map((job) => (
                <TouchableOpacity
                  key={job.id}
                  style={styles.jobCard}
                  onPress={() => handlePostPress(job.id)}
                >
                  <View style={styles.jobHeader}>
                    <View style={styles.jobInfo}>
                      <Text style={styles.jobTitle}>{job.title}</Text>
                      <Text style={styles.location}>{job.location}</Text>
                      <Text style={styles.salary}>{formatSalary(job.salary_min, job.salary_max)}</Text>
                    </View>
                    <View style={styles.statusContainer}>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
                        <Text style={styles.statusText}>{job.status}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.jobFooter}>
                    <View style={styles.applicantsContainer}>
                      <Ionicons name="people-outline" size={16} color="#6b7280" />
                      <Text style={styles.applicantsText}>{job.applicants_count} applicants</Text>
                      {job.applicants_count === 0 && job.status === 'Open' && (
                        <TouchableOpacity
                          style={styles.closeJobButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleCloseJob(job.id, job.title);
                          }}
                        >
                          <Ionicons name="close-circle" size={16} color="#ef4444" />
                          <Text style={styles.closeJobText}>Close</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={styles.jobMeta}>
                      <Text style={styles.jobType}>{job.job_type}</Text>
                      <Text style={styles.sector}>{job.sector}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))
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
          <View style={styles.filterModal}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.filterContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Status Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Post Status</Text>
                <View style={styles.filterOptions}>
                  {statusOptions.map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.filterOption,
                        selectedStatus === status && styles.filterOptionSelected
                      ]}
                      onPress={() => setSelectedStatus(status)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        selectedStatus === status && styles.filterOptionTextSelected
                      ]}>
                        {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Job Type Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Job Type</Text>
                <View style={styles.filterOptions}>
                  {jobTypeOptions.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.filterOption,
                        selectedJobType === type && styles.filterOptionSelected
                      ]}
                      onPress={() => setSelectedJobType(type)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        selectedJobType === type && styles.filterOptionTextSelected
                      ]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Sector Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Sector</Text>
                <View style={styles.filterOptions}>
                  {sectorOptions.map((sector) => (
                    <TouchableOpacity
                      key={sector}
                      style={[
                        styles.filterOption,
                        selectedSector === sector && styles.filterOptionSelected
                      ]}
                      onPress={() => setSelectedSector(sector)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        selectedSector === sector && styles.filterOptionTextSelected
                      ]}>
                        {sector}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Date Range Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Date Range</Text>
                <View style={styles.filterOptions}>
                  {dateRangeOptions.map((dateRange) => (
                    <TouchableOpacity
                      key={dateRange}
                      style={[
                        styles.filterOption,
                        selectedDateRange === dateRange && styles.filterOptionSelected
                      ]}
                      onPress={() => setSelectedDateRange(dateRange)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        selectedDateRange === dateRange && styles.filterOptionTextSelected
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
                style={styles.clearFiltersButton}
                onPress={() => {
                  setSelectedStatus('All');
                  setSelectedJobType('All');
                  setSelectedSector('All');
                  setSelectedDateRange('All');
                }}
              >
                <Text style={styles.clearFiltersText}>Clear All Filters</Text>
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
    paddingTop: 30,
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
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
    minHeight: 40,
  },
  refreshIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: 'rgba(149, 125, 222, 0.1)',
    marginHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  refreshIndicatorText: {
    fontSize: 14,
    color: 'rgb(149, 125, 222)',
    fontWeight: '500',
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
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#374151',
  },
  filterButton: {
    backgroundColor: '#fff',
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
    color: '#374151',
    marginBottom: 12,
    marginTop: 16,
  },
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  salary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  applicantsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  applicantsText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  closeJobButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  closeJobText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500',
    marginLeft: 4,
  },
  jobMeta: {
    alignItems: 'flex-end',
  },
  jobType: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '500',
  },
  sector: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
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
    borderBottomColor: '#e5e7eb',
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
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
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterOptionSelected: {
    backgroundColor: '#6b46c1',
    borderColor: '#6b46c1',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  filterOptionTextSelected: {
    color: '#fff',
  },
  clearFiltersButton: {
    backgroundColor: '#f3f4f6',
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
    color: '#6b7280',
  },
  applyFiltersButton: {
    backgroundColor: '#6b46c1',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
    shadowColor: '#6b46c1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  applyFiltersText: {
    fontSize: 16,
    fontWeight: '500',
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
  },
}); 
