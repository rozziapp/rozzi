import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useCustomFonts } from '@/hooks/fonts';
import { router , useFocusEffect } from 'expo-router';
import { hireRequestAPI } from '@/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export default function JobSeekingScreen() {
  console.log('🚀 JobSeekingScreen component is rendering!');
  
  const [fontsLoaded] = useCustomFonts();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedTimeRange, setSelectedTimeRange] = useState('All');
  
  // State for hire requests
  const [hireRequests, setHireRequests] = useState<HireRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch hire requests on component mount and when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🎯 Job Seeking screen focused, fetching hire requests...');
      fetchHireRequests();
    }, [])
  );

  // Also fetch on component mount
  useEffect(() => {
    console.log('🎯 Job Seeking screen mounted, fetching hire requests...');
    fetchHireRequests();
  }, []);

  const fetchHireRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('=== FETCHING HIRE REQUESTS ===');
      
      // Get current user info from token
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            console.log('Current user ID from token:', payload.user_id);
          }
        }
      } catch (tokenError) {
        console.log('Could not extract user ID from token:', tokenError);
      }
      
      console.log('API endpoint: /hire-requests/received/');
      
      const data = await hireRequestAPI.getReceivedHireRequests();
      console.log('✅ API call successful');
      console.log('Received hire requests:', data);
      console.log('Data type:', typeof data);
      console.log('Data length:', Array.isArray(data) ? data.length : 'Not an array');
      console.log('Data structure:', JSON.stringify(data, null, 2));
      
      if (Array.isArray(data)) {
        setHireRequests(data);
        console.log('✅ Hire requests state updated with', data.length, 'items');
      } else {
        console.error('❌ Data is not an array:', data);
        setHireRequests([]);
      }
    } catch (err: any) {
      console.error('❌ Error fetching hire requests:', err);
      console.error('Error status:', err.response?.status);
      console.error('Error details:', err.response?.data);
      console.error('Error message:', err.message);
      setError(err.response?.data?.detail || err.message || 'Failed to fetch hire requests');
    } finally {
      setLoading(false);
    }
  };

  if (!fontsLoaded) {
    console.log('⏳ Fonts not loaded yet, waiting...');
    return null;
  }
  
  console.log('✅ Fonts loaded, rendering Job Seeking screen content');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return '#f59e0b';
      case 'Accepted':
        return '#10b981';
      case 'Rejected':
        return '#ef4444';
      case 'Withdrawn':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const getRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return 'This Week';
    if (diffDays <= 30) return 'This Month';
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const isWithinTimeRange = (dateString: string, timeRange: string) => {
    if (timeRange === 'All') return true;
    
    const postDate = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - postDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    switch (timeRange) {
      case '1 Month':
        return diffDays <= 30;
      case '3 Months':
        return diffDays <= 90;
      case '6 Months':
        return diffDays <= 180;
      default:
        return true;
    }
  };

  const filteredRequests = useMemo(() => {
    console.log('Filtering hire requests. Total:', hireRequests.length);
    console.log('Search query:', searchQuery);
    console.log('Selected status:', selectedStatus);
    console.log('Selected time range:', selectedTimeRange);
    
    const filtered = hireRequests.filter(request => {
      const matchesSearch = request.job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           request.job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           request.requester.full_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedStatus === 'All' || request.status === selectedStatus;
      const matchesTimeRange = isWithinTimeRange(request.created_at, selectedTimeRange);
      
      return matchesSearch && matchesStatus && matchesTimeRange;
    });
    
    console.log('Filtered results:', filtered.length);
    return filtered;
  }, [hireRequests, searchQuery, selectedStatus, selectedTimeRange]);

  const groupedRequests = useMemo(() => {
    const groups: { [key: string]: HireRequest[] } = {};
    
    filteredRequests.forEach(request => {
      const dateGroup = getRelativeDate(request.created_at);
      if (!groups[dateGroup]) {
        groups[dateGroup] = [];
      }
      groups[dateGroup].push(request);
    });
    
    return groups;
  }, [filteredRequests]);

  const statusOptions = ['All', 'Pending', 'Accepted', 'Rejected', 'Withdrawn'];
  const timeRangeOptions = ['All', '1 Month', '3 Months', '6 Months'];

  const handleRequestPress = (requestId: number) => {
    // TODO: Navigate to hire request detail screen when implemented
    console.log('Navigate to hire request detail:', requestId);
  };

  const handleStatusUpdate = async (requestId: number, newStatus: string) => {
    try {
      console.log(`Updating hire request ${requestId} to status: ${newStatus}`);
      await hireRequestAPI.updateHireRequest(requestId, newStatus);
      console.log('Status updated successfully');
      // Refresh the list after update
      fetchHireRequests();
    } catch (err: any) {
      console.error('Error updating hire request status:', err);
      console.error('Error details:', err.response?.data);
      // Show error message to user
      setError(`Failed to update status: ${err.response?.data?.detail || err.message}`);
    }
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/my-profile')}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Job Seeking</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6b46c1" />
          <Text style={styles.loadingText}>Loading your hire requests...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/my-profile')}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Job Seeking</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text style={styles.errorText}>Failed to load hire requests</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchHireRequests}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
        <Text style={styles.title}>Job Seeking</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Description */}
      <View style={styles.descriptionContainer}>
        <Text style={styles.descriptionText}>
          View and manage hire requests from recruiters interested in your job seeking posts.
        </Text>
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            Total Requests: <Text style={styles.statsNumber}>{hireRequests.length}</Text>
          </Text>
        </View>
        {/* Debug info */}
        <Text style={styles.statsText}>
          Debug: hireRequests state has {hireRequests.length} items
        </Text>
        <Text style={styles.statsText}>
          Debug: filteredRequests has {filteredRequests.length} items
        </Text>
        <Text style={styles.statsText}>
          Debug: groupedRequests has {Object.keys(groupedRequests).length} groups
        </Text>
      </View>

      {/* Search and Filter Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search hire requests..."
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
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchHireRequests}
        >
          <Ionicons name="refresh" size={20} color="#6b7280" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.testButton}
          onPress={() => {
            console.log('=== MANUAL TEST BUTTON PRESSED ===');
            console.log('Current hireRequests state:', hireRequests);
            console.log('Current filteredRequests:', filteredRequests);
            console.log('Current groupedRequests keys:', Object.keys(groupedRequests));
            fetchHireRequests();
          }}
        >
          <Ionicons name="bug" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {Object.keys(groupedRequests).length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={64} color="#B0AAD9" />
            <Text style={styles.emptyStateText}>No hire requests found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery || selectedStatus !== 'All' || selectedTimeRange !== 'All'
                ? 'Try adjusting your search or filters'
                : 'Hire requests from recruiters will appear here when they contact you'}
            </Text>
            {/* Debug info */}
            <Text style={styles.emptyStateSubtext}>
              Debug: hireRequests.length = {hireRequests.length}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Debug: filteredRequests.length = {filteredRequests.length}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Debug: groupedRequests keys = {Object.keys(groupedRequests).join(', ')}
            </Text>
          </View>
        ) : (
          Object.entries(groupedRequests).map(([dateGroup, requests]) => (
            <View key={dateGroup}>
              <Text style={styles.dateGroupTitle}>{dateGroup}</Text>
              {requests.map((request) => (
                <TouchableOpacity
                  key={request.id}
                  style={styles.postCard}
                  onPress={() => handleRequestPress(request.id)}
                >
                  <View style={styles.statusBadgeTop}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
                      <Text style={styles.statusText}>{request.status}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.postContent}>
                    <View style={styles.postInfo}>
                      <Text style={styles.postTitle}>{request.job.title}</Text>
                      
                      {/* Requester Details Section */}
                      <View style={styles.userDetailsSection}>
                        <Text style={styles.userName}>{request.requester.full_name}</Text>
                        <Text style={styles.userUsername}>@{request.requester.username}</Text>
                      </View>
                      
                      {/* Message/Description */}
                      {request.message && (
                        <View style={styles.messageSection}>
                          <Text style={styles.messageLabel}>Message from Recruiter:</Text>
                          <Text style={styles.messageText}>{request.message}</Text>
                        </View>
                      )}
                      
                      <View style={styles.categoryRow}>
                        <Text style={styles.categoryText}>{request.job.job_type}</Text>
                        {request.job.location && (
                          <Text style={styles.locationText}> • {request.job.location}</Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.postFooter}>
                      <View style={styles.metricsContainer}>
                        <View style={styles.metricItem}>
                          <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                          <Text style={styles.metricText}>{getRelativeDate(request.created_at)}</Text>
                        </View>
                        <View style={styles.metricItem}>
                          <Ionicons name="briefcase-outline" size={16} color="#6b7280" />
                          <Text style={styles.metricText}>{request.job.sector}</Text>
                        </View>
                      </View>
                      
                      {/* Action Buttons for Pending Requests */}
                      {request.status === 'Pending' && (
                        <View style={styles.actionButtons}>
                          <TouchableOpacity 
                            style={[styles.actionButton, styles.acceptButton]}
                            onPress={() => handleStatusUpdate(request.id, 'Accepted')}
                          >
                            <Text style={styles.actionButtonText}>Accept</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.actionButton, styles.rejectButton]}
                            onPress={() => handleStatusUpdate(request.id, 'Rejected')}
                          >
                            <Text style={styles.actionButtonText}>Reject</Text>
                          </TouchableOpacity>
                        </View>
                      )}
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

            {/* Status Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Status</Text>
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

            {/* Time Range Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Time Range</Text>
              <View style={styles.filterOptions}>
                {timeRangeOptions.map((timeRange) => (
                  <TouchableOpacity
                    key={timeRange}
                    style={[
                      styles.filterOption,
                      selectedTimeRange === timeRange && styles.filterOptionSelected
                    ]}
                    onPress={() => setSelectedTimeRange(timeRange)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      selectedTimeRange === timeRange && styles.filterOptionTextSelected
                    ]}>
                      {timeRange}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.filterActions}>
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => {
                  setSelectedStatus('All');
                  setSelectedTimeRange('All');
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
  descriptionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  descriptionText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    textAlign: 'center',
  },
  statsContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  statsText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  statsNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6b46c1',
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
  refreshButton: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 8,
  },
  testButton: {
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
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  statusBadgeTop: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  postContent: {
    paddingTop: 8,
  },
  postInfo: {
    flex: 1,
    marginBottom: 16,
  },

  postTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    lineHeight: 26,
    paddingRight: 80,
  },
  location: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 2,
  },
  categoryRow: {
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  category: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  metricsContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  postMeta: {
    alignItems: 'flex-end',
  },
  sector: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '500',
  },
  postedDate: {
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
    padding: 24,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
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
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
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
  viewOffersButton: {
    backgroundColor: '#6b46c1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#6b46c1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  viewOffersText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  userDetailsSection: {
    marginBottom: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  userUsername: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  messageSection: {
    marginBottom: 12,
  },
  messageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  locationText: {
    fontSize: 14,
    color: '#6b7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#B0AAD9',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b46c1',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#B0AAD9',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ef4444',
    marginTop: 16,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#6b46c1',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#6b46c1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  acceptButton: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 
