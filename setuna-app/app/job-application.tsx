import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCustomFonts } from '@/hooks/fonts';
import { router, useLocalSearchParams } from 'expo-router';
import { useBackHandler } from '@/hooks/useBackHandler';
import { useAuth } from '@/contexts/AuthContext';
import ProfilePicture from '@/components/ProfilePicture';
import API, { hireRequestAPI } from '@/utils/api';

// Interface for job post data
interface JobPost {
  id: number;
  title: string;
  description: string;
  salary_min?: number;
  salary_max?: number;
  location: string;
  post_type: string;
  job_type: string;
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
  } | null;
  status: string;
  applicants_count: number;
  is_remote?: boolean;
}

// Interface for custom field answers
interface CustomFieldAnswer {
  question: string;
  answer: 'yes' | 'no';
}

// Interface for ID Card data
interface IDCard {
  id: number;
  name: string;
  gender: string;
  date_of_birth: string;
  nationality: string;
  address: string;
  skills: string[];
  photo?: string;
  is_primary: boolean;
}

// Interface for Resume data
interface Resume {
  id: number;
  file_name: string;
  file_url: string;
  file_size: number;
  is_default: boolean;
  uploaded_at: string;
}

export default function JobApplicationScreen() {
  const [fontsLoaded] = useCustomFonts();
  const { user, isAuthenticated } = useAuth();
  const params = useLocalSearchParams();
  
  // Get parameters from navigation
  const jobId = params.jobId as string;
  const jobTitle = params.jobTitle as string;
  const isLookingPost = params.isLookingPost === 'true';
  const posterName = params.posterName as string;
  
  // State management
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [jobPost, setJobPost] = useState<JobPost | null>(null);
  const [customFieldAnswers, setCustomFieldAnswers] = useState<CustomFieldAnswer[]>([]);
  const [coverLetter, setCoverLetter] = useState('');
  const [userIDCard, setUserIDCard] = useState<IDCard | null>(null);
  const [userResume, setUserResume] = useState<Resume | null>(null);
  const [additionalMessage, setAdditionalMessage] = useState('');

  // Handle back button
  useBackHandler({
    targetRoute: '/(tabs)'
  });

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated]);

  // Fetch job details and user documents
  useEffect(() => {
    if (jobId && isAuthenticated) {
      fetchJobDetails();
      if (!isLookingPost) {
        fetchUserDocuments();
      }
    }
  }, [jobId, isAuthenticated]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/jobs/${jobId}/`);
      const job = response.data;
      setJobPost(job);
      
      // Initialize custom field answers - only for hire posts (job postings)
      if (job.post_type === 'hire' && job.custom_fields && Array.isArray(job.custom_fields) && job.custom_fields.length > 0) {
        const initialAnswers = job.custom_fields.map((field: any) => ({
          question: field.question,
          answer: 'yes' // Default to 'yes' for user to change
        }));
        setCustomFieldAnswers(initialAnswers);
      } else {
        setCustomFieldAnswers([]);
      }
    } catch (error) {
      console.error('Error fetching job details:', error);
      Alert.alert('Error', 'Failed to load job details. Please try again.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDocuments = async () => {
    try {
      // Fetch user's default ID card
      try {
        const idCardResponse = await API.get('/id-cards/');
        
        // Handle different response structures
        let idCards = [];
        if (Array.isArray(idCardResponse.data)) {
          idCards = idCardResponse.data;
        } else if (idCardResponse.data && Array.isArray(idCardResponse.data.results)) {
          idCards = idCardResponse.data.results;
        } else if (idCardResponse.data && idCardResponse.data.data) {
          idCards = Array.isArray(idCardResponse.data.data) ? idCardResponse.data.data : [];
        }
        
        const primaryIDCard = idCards.find((card: IDCard) => card.is_primary) || idCards[0];
        setUserIDCard(primaryIDCard || null);
      } catch (idError) {
        setUserIDCard(null);
      }

      // Fetch user's default resume
      try {
        const resumeResponse = await API.get('/resume-files/');
        
        // Handle different response structures
        let resumes = [];
        if (Array.isArray(resumeResponse.data)) {
          resumes = resumeResponse.data;
        } else if (resumeResponse.data && Array.isArray(resumeResponse.data.results)) {
          resumes = resumeResponse.data.results;
        } else if (resumeResponse.data && resumeResponse.data.data) {
          resumes = Array.isArray(resumeResponse.data.data) ? resumeResponse.data.data : [];
        }
        
        const defaultResume = resumes.find((resume: Resume) => resume.is_default) || resumes[0];
        setUserResume(defaultResume || null);
      } catch (resumeError) {
        setUserResume(null);
      }
    } catch (error) {
      console.error('Error fetching user documents:', error);
      // Don't show error alert here as documents might not exist
    }
  };

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return 'Salary not specified';
    if (min && max) return `₹${min.toLocaleString()}-${max.toLocaleString()}/month`;
    if (min) return `₹${min.toLocaleString()}/month`;
    if (max) return `₹${max.toLocaleString()}/month`;
    return 'Salary not specified';
  };

  const handleCustomFieldAnswer = (questionIndex: number, answer: 'yes' | 'no') => {
    setCustomFieldAnswers(prev => 
      prev.map((item, index) => 
        index === questionIndex ? { ...item, answer } : item
      )
    );
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      // Prepare submission data
      const submissionData: any = {
        job_id: jobId,
        cover_letter: coverLetter.trim(),
        custom_field_answers: customFieldAnswers,
        additional_message: additionalMessage.trim(),
      };

      // Add documents for job applications (not for hire requests)
      if (!isLookingPost) {
        submissionData.id_card_id = userIDCard?.id;
        submissionData.resume_id = userResume?.id;
      }

      // Choose endpoint based on application type
      if (isLookingPost) {
        // Use hire request API for looking posts
        console.log('Creating hire request for job:', jobId, 'with message:', submissionData.additional_message);
        await hireRequestAPI.createHireRequest(parseInt(jobId), submissionData.additional_message);
        console.log('Hire request created successfully');
      } else {
        // Use job application API for hire posts
        console.log('Submitting job application for job:', jobId);
        await API.post(`/jobs/${jobId}/apply/`, submissionData);
        console.log('Job application submitted successfully');
      }

      // Show success message
      const successMessage = isLookingPost 
        ? `Your hire request has been sent to ${posterName}!`
        : `Your application has been submitted for ${jobTitle}!`;
      
      Alert.alert('Success', successMessage, [
        {
          text: 'OK',
          onPress: () => router.back()
        }
      ]);

    } catch (error: any) {
      console.error('Error submitting application:', error);
      console.error('Error details:', error.response?.data);
      let errorMessage = 'Failed to submit. Please try again.';
      
      if (error.response?.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        }
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const validateSubmission = () => {
    if (!isLookingPost && !userIDCard) {
      Alert.alert('Missing Documents', 'Please create an ID card in your profile before applying for jobs.');
      return false;
    }
    
    if (!isLookingPost && !userResume) {
      Alert.alert('Missing Documents', 'Please upload a resume in your profile before applying for jobs.');
      return false;
    }

    // Check if all custom fields are answered
    if (customFieldAnswers.length > 0) {
      const unansweredFields = customFieldAnswers.filter(field => !field.answer);
      if (unansweredFields.length > 0) {
        Alert.alert('Incomplete', 'Please answer all the questions before submitting.');
        return false;
      }
    }

    return true;
  };

  const handleSubmitPress = () => {
    if (validateSubmission()) {
      handleSubmit();
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

  if (!jobPost) {
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
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerBackButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isLookingPost ? 'Send Hire Request' : 'Apply for Job'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Job Summary */}
        <View style={styles.jobSummaryCard}>
          <View style={styles.jobSummaryHeader}>
            <View style={styles.posterInfo}>
              <ProfilePicture 
                size={48} 
                showLongPress={false} 
                imageUrl={jobPost.user?.profile_picture}
                noBorder={true}
              />
              <View style={styles.posterDetails}>
                <Text style={styles.posterName}>
                  {jobPost.user?.full_name || jobPost.user?.username || 'Unknown User'}
                </Text>
                <Text style={styles.jobTitleSummary}>{jobPost.title}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.jobDetailsRow}>
            <View style={styles.jobDetailItem}>
              <Ionicons name="cash-outline" size={16} color="#059669" />
              <Text style={styles.jobDetailText}>{formatSalary(jobPost.salary_min, jobPost.salary_max)}</Text>
            </View>
            <View style={styles.jobDetailItem}>
              <Ionicons name="location-outline" size={16} color="#ef4444" />
              <Text style={styles.jobDetailText}>{jobPost.location}</Text>
            </View>
          </View>
          
          <View style={styles.jobDetailsRow}>
            <View style={styles.jobDetailItem}>
              <Ionicons name="time-outline" size={16} color="#6b7280" />
              <Text style={styles.jobDetailText}>{jobPost.job_type}</Text>
            </View>
            <View style={styles.jobDetailItem}>
              <Ionicons name="briefcase-outline" size={16} color="#6b7280" />
              <Text style={styles.jobDetailText}>{jobPost.experience_level}</Text>
            </View>
          </View>
        </View>

        {/* User Documents Section (for job applications only) */}
        {!isLookingPost && (
          <View style={styles.documentsCard}>
            <Text style={styles.sectionTitle}>Your Documents</Text>
            <Text style={styles.sectionSubtitle}>These will be submitted with your application</Text>
            
            {/* ID Card */}
            <View style={styles.documentItem}>
              <View style={styles.documentIcon}>
                <Ionicons name="card-outline" size={24} color="#8b5cf6" />
              </View>
              <View style={styles.documentInfo}>
                <Text style={styles.documentTitle}>ID Card</Text>
                {userIDCard ? (
                  <Text style={styles.documentSubtitle}>{userIDCard.name}</Text>
                ) : (
                  <Text style={styles.documentMissing}>No ID card found</Text>
                )}
              </View>
              {!userIDCard && (
                <TouchableOpacity 
                  style={styles.createButton}
                  onPress={() => router.push('/resume')}
                >
                  <Text style={styles.createButtonText}>Create</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Resume */}
            <View style={styles.documentItem}>
              <View style={styles.documentIcon}>
                <Ionicons name="document-text-outline" size={24} color="#8b5cf6" />
              </View>
              <View style={styles.documentInfo}>
                <Text style={styles.documentTitle}>Resume</Text>
                {userResume ? (
                  <Text style={styles.documentSubtitle}>{userResume.file_name}</Text>
                ) : (
                  <Text style={styles.documentMissing}>No resume found</Text>
                )}
              </View>
              {!userResume && (
                <TouchableOpacity 
                  style={styles.createButton}
                  onPress={() => router.push('/resume')}
                >
                  <Text style={styles.createButtonText}>Upload</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Custom Questions - Only show for hire posts (job postings) */}
        {jobPost?.post_type === 'hire' && jobPost?.custom_fields && Array.isArray(jobPost.custom_fields) && jobPost.custom_fields.length > 0 && (
          <View style={styles.questionsCard}>
            <Text style={styles.sectionTitle}>Additional Questions</Text>
            <Text style={styles.sectionSubtitle}>Please answer the following questions</Text>
            
            {jobPost.custom_fields.map((field, index) => (
              <View key={index} style={styles.questionItem}>
                <Text style={styles.questionText}>{field.question}</Text>
                <View style={styles.answerOptions}>
                  <TouchableOpacity
                    style={[
                      styles.answerOption,
                      customFieldAnswers[index]?.answer === 'yes' && styles.answerOptionSelected
                    ]}
                    onPress={() => handleCustomFieldAnswer(index, 'yes')}
                  >
                    <Text style={[
                      styles.answerOptionText,
                      customFieldAnswers[index]?.answer === 'yes' && styles.answerOptionTextSelected
                    ]}>Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.answerOption,
                      customFieldAnswers[index]?.answer === 'no' && styles.answerOptionSelected
                    ]}
                    onPress={() => handleCustomFieldAnswer(index, 'no')}
                  >
                    <Text style={[
                      styles.answerOptionText,
                      customFieldAnswers[index]?.answer === 'no' && styles.answerOptionTextSelected
                    ]}>No</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Cover Letter / Message */}
        <View style={styles.messageCard}>
          <Text style={styles.sectionTitle}>
            {isLookingPost ? 'Your Message' : 'Cover Letter'}
          </Text>
          <Text style={styles.sectionSubtitle}>
            {isLookingPost 
              ? 'Tell them about your project requirements' 
              : 'Why are you a good fit for this position?'
            }
          </Text>
          <TextInput
            style={styles.messageInput}
            placeholder={isLookingPost 
              ? 'Describe your project and requirements...' 
              : 'Write your cover letter here...'
            }
            value={isLookingPost ? additionalMessage : coverLetter}
            onChangeText={isLookingPost ? setAdditionalMessage : setCoverLetter}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <View style={styles.submitSection}>
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmitPress}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isLookingPost ? 'Send Hire Request' : 'Submit Application'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#8b5cf6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#8b5cf6',
  },
  headerBackButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
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
  jobSummaryCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  jobSummaryHeader: {
    marginBottom: 16,
  },
  posterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  posterDetails: {
    marginLeft: 12,
    flex: 1,
  },
  posterName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  jobTitleSummary: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  jobDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  jobDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  jobDetailText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  documentsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  questionsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  messageCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  documentSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  documentMissing: {
    fontSize: 14,
    color: '#ef4444',
    fontStyle: 'italic',
  },
  createButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  questionItem: {
    marginBottom: 20,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  answerOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  answerOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
  },
  answerOptionSelected: {
    borderColor: '#8b5cf6',
    backgroundColor: '#8b5cf6',
  },
  answerOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  answerOptionTextSelected: {
    color: '#fff',
  },
  messageInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#374151',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 120,
  },
  submitSection: {
    padding: 16,
    paddingBottom: 32,
  },
  submitButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0.1,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

