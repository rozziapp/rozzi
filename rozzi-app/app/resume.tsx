import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Dimensions,
  Modal,
  KeyboardAvoidingView,
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCustomFonts } from '@/hooks/fonts';
import { router } from 'expo-router';
import { useBackHandler } from '@/hooks/useBackHandler';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import DigitalIDCard from '@/components/DigitalIDCard';
import { idCardAPI, resumeAPI } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// Custom Date Picker Component
interface CustomDatePickerProps {
  currentDate: Date;
  onDateSelect: (year: number, month: number, day: number) => void;
  onClose: () => void;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ currentDate, onDateSelect, onClose }) => {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(currentDate.getDate());

  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const handleConfirm = () => {
    onDateSelect(selectedYear, selectedMonth, selectedDay);
  };

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.datePickerModal}>
          <View style={styles.datePickerHeader}>
            <Text style={styles.datePickerTitle}>Select Date</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.datePickerContent}>
            <View style={styles.datePickerColumn}>
              <Text style={styles.datePickerLabel}>Year</Text>
              <ScrollView style={styles.datePickerScroll}>
                {years.map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[styles.datePickerOption, selectedYear === year && styles.datePickerOptionSelected]}
                    onPress={() => setSelectedYear(year)}
                  >
                    <Text style={[styles.datePickerOptionText, selectedYear === year && styles.datePickerOptionTextSelected]}>
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.datePickerColumn}>
              <Text style={styles.datePickerLabel}>Month</Text>
              <ScrollView style={styles.datePickerScroll}>
                {months.map((month) => (
                  <TouchableOpacity
                    key={month}
                    style={[styles.datePickerOption, selectedMonth === month && styles.datePickerOptionSelected]}
                    onPress={() => setSelectedMonth(month)}
                  >
                    <Text style={[styles.datePickerOptionText, selectedMonth === month && styles.datePickerOptionTextSelected]}>
                      {month}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.datePickerColumn}>
              <Text style={styles.datePickerLabel}>Day</Text>
              <ScrollView style={styles.datePickerScroll}>
                {days.map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[styles.datePickerOption, selectedDay === day && styles.datePickerOptionSelected]}
                    onPress={() => setSelectedDay(day)}
                  >
                    <Text style={[styles.datePickerOptionText, selectedDay === day && styles.datePickerOptionTextSelected]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.datePickerFooter}>
            <TouchableOpacity style={styles.datePickerButton} onPress={onClose}>
              <Text style={styles.datePickerButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.datePickerButton, styles.datePickerButtonConfirm]} onPress={handleConfirm}>
              <Text style={[styles.datePickerButtonText, styles.datePickerButtonTextConfirm]}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Mock data for dropdowns
const genderOptions = ['Male', 'Female', 'Other', 'Prefer not to say'];
const nationalityOptions = [
  'Indian', 'American', 'British', 'Canadian', 'Australian', 'German',
  'French', 'Japanese', 'Chinese', 'Korean', 'Brazilian', 'Mexican',
  'Russian', 'Italian', 'Spanish', 'Dutch', 'Swedish', 'Norwegian',
  'Danish', 'Finnish', 'Swiss', 'Austrian', 'Belgian', 'Portuguese'
];

// Default skills for suggestions
const defaultSkills = [
  'JavaScript', 'React', 'Node.js', 'Python', 'Java', 'C++', 'HTML', 'CSS',
  'SQL', 'MongoDB', 'AWS', 'Docker', 'Git', 'TypeScript', 'Angular', 'Vue.js',
  'PHP', 'Ruby', 'Swift', 'Kotlin', 'Flutter', 'React Native', 'UI/UX Design',
  'Graphic Design', 'Content Writing', 'Digital Marketing', 'SEO', 'Social Media',
  'Customer Service', 'Sales', 'Project Management', 'Data Analysis', 'Machine Learning',
  'DevOps', 'Cybersecurity', 'Mobile Development', 'Web Development', 'Database Design'
];

interface IDCard {
  id?: number;
  photo?: string;
  name: string;
  gender: string;
  dateOfBirth: string;
  nationality: string;
  address: string;
  phoneNumber: string;
  skills: string[];
  is_primary?: boolean;
}

interface ResumeFile {
  id?: string;
  name: string;
  url: string;  // Google Drive URL
  isDefault: boolean;
}

export default function ResumeScreen() {
  const [fontsLoaded] = useCustomFonts();
  const { user, isAuthenticated } = useAuth();
  const { colors, colorScheme } = useAppTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [showNationalityDropdown, setShowNationalityDropdown] = useState(false);
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false);
  const [skillInput, setSkillInput] = useState('');

  const [resumeFiles, setResumeFiles] = useState<ResumeFile[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState<'card1' | 'card2' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Date picker states
  const [showDatePicker1, setShowDatePicker1] = useState(false);
  const [showDatePicker2, setShowDatePicker2] = useState(false);
  const [isSavingResume, setIsSavingResume] = useState(false);
  const [isEditingResumes, setIsEditingResumes] = useState(false);

  // Form data for both cards
  const [card1Data, setCard1Data] = useState<IDCard>({
    photo: '',
    name: '',
    gender: '',
    dateOfBirth: '',
    nationality: '',
    address: '',
    phoneNumber: '',
    skills: [],
    is_primary: true,
  });

  const [card2Data, setCard2Data] = useState<IDCard>({
    photo: '',
    name: '',
    gender: '',
    dateOfBirth: '',
    nationality: '',
    address: '',
    phoneNumber: '',
    skills: [],
    is_primary: false,
  });

  // Temporary card data used for editing draft details
  const [tempCardData, setTempCardData] = useState<IDCard>({
    photo: '',
    name: '',
    gender: '',
    dateOfBirth: '',
    nationality: '',
    address: '',
    phoneNumber: '',
    skills: [],
    is_primary: false,
  });

  // Load existing data on component mount
  useEffect(() => {
    if (isAuthenticated) {
      loadExistingData(true); // Force reload on mount
    }
  }, [isAuthenticated]);

  // Note: Removed duplicate reload useEffect that was causing screen flicker
  // Data is only loaded on initial mount now

  // Monitor resume files state changes
  useEffect(() => {
    console.log('=== RESUME FILES STATE CHANGED ===');
    console.log('New resume files:', resumeFiles);
    console.log('New resume files length:', resumeFiles.length);
  }, [resumeFiles]);

  // Monitor card2Data changes
  useEffect(() => {
    console.log('=== CARD2 DATA STATE CHANGED ===');
    console.log('New card2Data:', card2Data);
    console.log('Card2Data photo:', card2Data.photo);
    console.log('Card2Data photo type:', typeof card2Data.photo);
    console.log('Card2Data photo truthy:', !!card2Data.photo);
    console.log('Card2Data has data:', !!(card2Data.name && card2Data.gender && card2Data.dateOfBirth && card2Data.nationality && card2Data.address));
  }, [card2Data]);

  // Monitor card1Data changes
  useEffect(() => {
    console.log('=== CARD1 DATA STATE CHANGED ===');
    console.log('New card1Data:', card1Data);
    console.log('Card1Data photo:', card1Data.photo);
    console.log('Card1Data photo type:', typeof card1Data.photo);
    console.log('Card1Data photo truthy:', !!card1Data.photo);
    console.log('Card1Data has data:', !!(card1Data.name && card1Data.gender && card1Data.dateOfBirth && card1Data.nationality && card1Data.address));
  }, [card1Data]);

  // Prevent auto-reload on focus to avoid undoing deletions
  const [lastLoadTime, setLastLoadTime] = useState(0);

  const cleanupExcessResumeFiles = async (excessFiles: any[]) => {
    console.log('Cleaning up excess resume files:', excessFiles);
    for (const file of excessFiles) {
      try {
        await resumeAPI.deleteResumeFile(file.id);
        console.log(`✅ Deleted excess file: ${file.file_name}`);
      } catch (error) {
        console.error(`❌ Failed to delete excess file ${file.file_name}:`, error);
      }
    }
  };

  const cleanupExcessIDCards = async (excessCards: any[]) => {
    console.log('Cleaning up excess ID cards:', excessCards);
    for (const card of excessCards) {
      try {
        await idCardAPI.deleteIDCard(card.id);
        console.log(`✅ Deleted excess ID card: ${card.name} (ID: ${card.id})`);
      } catch (error) {
        console.error(`❌ Failed to delete excess ID card ${card.name}:`, error);
      }
    }
  };

  const loadExistingData = async (forceReload = false) => {
    try {
      setIsLoading(true);
      const now = Date.now();

      // Prevent frequent reloads unless forced (avoid undoing user actions)
      if (!forceReload && now - lastLoadTime < 5000) {
        console.log('Skipping data reload (too soon after last load)');
        setIsLoading(false);
        return;
      }

      // If we're not forcing a reload and we have recent local changes, preserve them
      if (!forceReload && resumeFiles.length > 0) {
        console.log('Preserving local resume files state during non-forced reload');
        // Only reload ID cards, keep resume files as they are
        // This prevents overriding recently uploaded files
      }

      setLastLoadTime(now);
      console.log('Loading existing data...');

      // Load ID cards from backend
      const idCardsResponse = await idCardAPI.getIDCards();
      console.log('Raw ID cards response:', idCardsResponse);
      console.log('Raw ID cards response type:', typeof idCardsResponse);
      console.log('Raw ID cards response keys:', Object.keys(idCardsResponse || {}));

      // Handle paginated response format
      const idCards = idCardsResponse?.results || idCardsResponse || [];
      console.log('Processed ID cards:', idCards);
      console.log('ID cards count:', idCards.length);

      // Debug each ID card's photo field
      if (idCards.length > 0) {
        idCards.forEach((card: any, index: number) => {
          console.log(`Card ${index + 1} photo field:`, card.photo);
          console.log(`Card ${index + 1} photo type:`, typeof card.photo);
          console.log(`Card ${index + 1} photo truthy:`, !!card.photo);
          console.log(`Card ${index + 1} full data:`, card);
        });
      }

      if (idCards.length > 0) {
        // Limit to 2 ID cards maximum (similar to PDF files)
        const limitedCards = idCards.slice(0, 2);
        console.log('Limited ID cards to 2:', limitedCards);

        // Sort cards by ID to ensure stable order (Card 1 stays Card 1)
        // This prevents cards from swapping positions when default is changed
        limitedCards.sort((a: any, b: any) => {
          const idA = parseInt(a.id || '0');
          const idB = parseInt(b.id || '0');
          return idA - idB;
        });

        const card1Source = limitedCards[0];
        const card2Source = limitedCards.length > 1 ? limitedCards[1] : null;

        console.log('Card 1 source:', card1Source);
        console.log('Card 2 source:', card2Source);

        if (card1Source) {
          console.log('Setting Card 1 data:', card1Source);
          console.log('Card 1 photo field:', card1Source.photo);

          const newCard1Data = {
            id: card1Source.id,
            photo: card1Source.photo || '',
            name: card1Source.name,
            gender: card1Source.gender,
            dateOfBirth: card1Source.date_of_birth,
            nationality: card1Source.nationality,
            address: card1Source.address,
            phoneNumber: card1Source.phone_number || '',
            skills: card1Source.skills || [],
            is_primary: card1Source.is_primary,
          };
          setCard1Data(newCard1Data);
        }

        if (card2Source) {
          console.log('Setting Card 2 data:', card2Source);
          console.log('Card 2 photo field:', card2Source.photo);

          setCard2Data({
            id: card2Source.id,
            photo: card2Source.photo || '',
            name: card2Source.name,
            gender: card2Source.gender,
            dateOfBirth: card2Source.date_of_birth,
            nationality: card2Source.nationality,
            address: card2Source.address,
            phoneNumber: card2Source.phone_number || '',
            skills: card2Source.skills || [],
            is_primary: card2Source.is_primary,
          });
        }
      } else {
        console.log('No ID cards found in database or no primary/secondary cards');
        // Reset card data to empty state
        setCard1Data({
          photo: '',
          name: '',
          gender: '',
          dateOfBirth: '',
          nationality: '',
          address: '',
          phoneNumber: '',
          skills: [],
          is_primary: true,
        });
        setCard2Data({
          photo: '',
          name: '',
          gender: '',
          dateOfBirth: '',
          nationality: '',
          address: '',
          phoneNumber: '',
          skills: [],
          is_primary: false,
        });
      }

      // Load resume files from backend (only if not preserving local state)
      if (forceReload || resumeFiles.length === 0) {
        console.log('=== LOADING RESUME FILES ===');
        const resumeFilesResponse = await resumeAPI.getResumeFiles();
        console.log('Raw resume files response:', resumeFilesResponse);

        const backendResumeFiles = resumeFilesResponse?.results || resumeFilesResponse || [];
        console.log('Backend resume files:', backendResumeFiles);

        if (backendResumeFiles.length > 0) {
          // Limit to 2 files even if more exist in database
          const limitedFiles = backendResumeFiles.slice(0, 2);

          // Sort files by ID to ensure stable order
          limitedFiles.sort((a: any, b: any) => {
            const idA = parseInt(a.id || '0');
            const idB = parseInt(b.id || '0');
            return idA - idB;
          });

          console.log('Limited resume files to 2 (sorted):', limitedFiles);

          const formattedResumeFiles = limitedFiles.map((file: any) => ({
            id: file.id.toString(),
            name: file.file_name,
            url: file.file_url,  // Google Drive URL
            isDefault: file.is_default,
          }));
          console.log('Formatted resume files:', formattedResumeFiles);
          setResumeFiles(formattedResumeFiles);
          console.log('Resume files set to state');

          // Clean up excess files from database if more than 2 exist
          if (backendResumeFiles.length > 2) {
            console.log('⚠️ More than 2 files found in database, cleaning up excess files...');
            await cleanupExcessResumeFiles(backendResumeFiles.slice(2));
          }
        } else {
          console.log('No resume files found in database');
          setResumeFiles([]); // Ensure state is cleared
        }
      } else {
        console.log('Preserving local resume files state, skipping backend load');
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Safe date parsing to avoid timezone/platform conversion issues
  const parseDate = (dateString: string) => {
    if (!dateString) return new Date();
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return new Date();
  };

  // Calculate age robustly from YYYY-MM-DD
  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return '';
    const parts = dateOfBirth.split('-');
    if (parts.length !== 3) return '';
    const birthYear = parseInt(parts[0], 10);
    const birthMonth = parseInt(parts[1], 10) - 1;
    const birthDay = parseInt(parts[2], 10);
    
    const today = new Date();
    let age = today.getFullYear() - birthYear;
    const monthDiff = today.getMonth() - birthMonth;
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDay)) {
      age--;
    }
    return age.toString();
  };

  // Format date safely for display (DD/MM/YYYY)
  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
  };

  // Handle hardware back button - discard changes warning when editing, or exit screen
  useBackHandler({
    onBackPress: () => {
      if (showForm) {
        handleCloseForm();
        return true; // Prevent default navigation
      }
      return false; // Exit screen
    }
  });

  if (!fontsLoaded) {
    return null;
  }

  // Handle date change
  const handleDateChange = (year: number, month: number, day: number) => {
    setShowDatePicker1(false);
    setShowDatePicker2(false);
    const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    setTempCardData(prev => ({ ...prev, dateOfBirth: formattedDate }));
  };

  // Filter skills based on input
  const filteredSkills = useMemo(() => {
    if (!skillInput.trim()) return [];
    return defaultSkills.filter(skill =>
      skill.toLowerCase().includes(skillInput.toLowerCase()) &&
      !tempCardData.skills.includes(skill)
    );
  }, [skillInput, tempCardData.skills]);

  const addSkill = (skill: string) => {
    if (skill.trim() && !tempCardData.skills.includes(skill.trim())) {
      setTempCardData(prev => ({
        ...prev,
        skills: [...prev.skills, skill.trim()]
      }));
    }
    setSkillInput('');
    setShowSkillSuggestions(false);
  };

  const removeSkill = (skillToRemove: string) => {
    setTempCardData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  // Convert file to base64 for Cloudinary upload
  const convertFileToBase64 = async (uri: string): Promise<string | null> => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    } catch (error) {
      console.error('Error converting file to base64:', error);
      return null;
    }
  };

  const pickImage = async (cardNumber: 1 | 2) => {
    try {
      console.log('=== PICK IMAGE START ===');
      console.log('Card number:', cardNumber);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for ID card photos
        quality: 0.8,
        base64: true, // Enable base64 encoding for Cloudinary upload
      });

      console.log('Image picker result:', result);

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        const base64Data = result.assets[0].base64;
        console.log('Selected image URI:', imageUri);
        console.log('Selected image URI type:', typeof imageUri);
        console.log('Selected image URI truthy:', !!imageUri);
        console.log('Base64 data available:', !!base64Data);

        if (base64Data) {
          // Create data URL for Cloudinary upload
          const dataUrl = `data:image/jpeg;base64,${base64Data}`;
          console.log('Created data URL for upload, length:', dataUrl.length);

          try {
            // Upload to Cloudinary first
            console.log('Uploading photo to Cloudinary...');
            const uploadResult = await idCardAPI.uploadPhoto(dataUrl);
            console.log('✅ Photo uploaded to Cloudinary:', uploadResult);

            const cloudinaryUrl = uploadResult.photo_url;
            console.log('Cloudinary URL received:', cloudinaryUrl);

            // Update tempCardData with Cloudinary URL
            console.log('Updating tempCardData photo from:', tempCardData.photo, 'to:', cloudinaryUrl);
            setTempCardData(prev => ({ ...prev, photo: cloudinaryUrl }));

            // Prevent automatic reloads for a short time to allow state to settle
            setLastLoadTime(Date.now() + 3000); // Add 3 seconds to prevent immediate reloads

            console.log('Photo updated for card', cardNumber);
            Alert.alert('Success', 'Photo uploaded successfully!');

          } catch (uploadError: any) {
            console.error('❌ Failed to upload photo to Cloudinary:', uploadError);
            Alert.alert('Error', `Failed to upload photo: ${uploadError.response?.data?.error || uploadError.message}`);
          }
        } else {
          console.log('No base64 data available, cannot upload to Cloudinary');
          Alert.alert('Error', 'Failed to process image. Please try again.');
        }
      } else {
        console.log('Image picker was canceled');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const removePhoto = (cardNumber: 1 | 2) => {
    console.log('Removing photo for card', cardNumber);
    console.log('Removing photo from tempCardData, current photo:', tempCardData.photo);
    setTempCardData(prev => ({ ...prev, photo: '' }));
  };

  // NOTE: PDF upload (pickResume) removed - now using URL inputs instead

  const removeResume = async (id: string) => {
    console.log('=== DELETE RESUME START ===');
    console.log('Resume ID to delete:', id);
    console.log('Current resume files:', resumeFiles);

    const fileToRemove = resumeFiles.find(file => file.id === id);
    console.log('File to remove:', fileToRemove);

    if (!fileToRemove) {
      console.log('❌ File not found for deletion');
      return;
    }

    Alert.alert(
      'Delete Resume',
      `Are you sure you want to delete "${fileToRemove.name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => console.log('Delete cancelled by user'),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log('User confirmed deletion');
            setResumeFiles(prev => {
              console.log('Previous files:', prev);
              const newFiles = prev.filter(file => file.id !== id);
              console.log('New files after deletion:', newFiles);

              // If we removed the default resume and there are other resumes, make the first one default
              if (newFiles.length > 0 && !newFiles.some(file => file.isDefault)) {
                newFiles[0].isDefault = true;
                console.log('Set first file as default');
              }
              return newFiles;
            });
            console.log(`✅ Resume "${fileToRemove.name}" deleted successfully`);

            // Also delete from database if it has a database ID
            // Check if the ID is a number (from database) vs timestamp string (local only)
            if (fileToRemove.id) {
              const numericId = parseInt(fileToRemove.id);
              // Check if it's a database ID (reasonable range) vs timestamp (very large number)
              if (!isNaN(numericId) && numericId < 1000000000) {
                try {
                  console.log('Attempting to delete from database with ID:', numericId);
                  await resumeAPI.deleteResumeFile(numericId);
                  console.log('✅ Resume deleted from database successfully');
                } catch (error) {
                  console.error('❌ Failed to delete from database:', error);
                  console.error('Delete error details:', error);
                  // Continue with UI deletion even if database deletion fails
                }
              } else {
                console.log('File has timestamp ID only (not yet saved to database), skipping database deletion');
              }
            } else {
              console.log('File has no ID, skipping database deletion');
            }

            Alert.alert('Success', `Resume "${fileToRemove.name}" deleted successfully!`);
          },
        },
      ]
    );
  };

  const setDefaultResume = (id: string) => {
    setResumeFiles(prev =>
      prev.map(file => ({
        ...file,
        isDefault: file.id === id
      }))
    );
  };

  // Save resume URLs to database
  const saveResumeURLs = async () => {
    try {
      setIsSavingResume(true);
      console.log('=== SAVING RESUME URLS ===');

      // Validate URLs
      const validFiles = resumeFiles.filter(file => file.url && file.url.trim());
      if (validFiles.length === 0) {
        Alert.alert('Error', 'Please add at least one resume URL.');
        return;
      }

      // Validate URL format (basic check for Google Drive URLs)
      for (const file of validFiles) {
        if (!file.url.startsWith('http://') && !file.url.startsWith('https://')) {
          Alert.alert('Invalid URL', `"${file.name}" has an invalid URL. Please use a valid URL starting with http:// or https://`);
          return;
        }
      }

      // Save each file to database
      for (const file of validFiles) {
        const dataToSend = {
          file_name: file.name || 'Resume',
          file_url: file.url,
          file_size: 0,
          is_default: file.isDefault,
        };

        console.log('Saving resume URL:', dataToSend);

        const numericId = parseInt(file.id || '0');
        const isExistingFile = !isNaN(numericId) && numericId < 1000000000;

        if (isExistingFile) {
          // Update existing file
          await resumeAPI.updateResumeFile(numericId, dataToSend);
          console.log('✅ Updated existing resume:', file.name);
        } else {
          // Create new file
          const response = await resumeAPI.createResumeFile(dataToSend);
          console.log('✅ Created new resume:', response);
          // Update the local file with the database ID
          setResumeFiles(prev => prev.map(f =>
            f.id === file.id ? { ...f, id: response.id.toString() } : f
          ));
        }
      }

      Alert.alert('Success', 'Resume URLs saved successfully!');
      console.log('=== RESUME URLS SAVED ===');
    } catch (error: any) {
      console.error('❌ Error saving resume URLs:', error);
      Alert.alert('Error', `Failed to save resume URLs: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsSavingResume(false);
    }
  };

  const isFormValid = () => {
    const nameValid = !!tempCardData.name?.trim();
    const genderValid = !!tempCardData.gender;
    const dobValid = !!tempCardData.dateOfBirth;
    const nationalityValid = !!tempCardData.nationality;
    const addressValid = !!tempCardData.address?.trim();
    const phoneValid = !!tempCardData.phoneNumber?.trim();

    return nameValid && genderValid && dobValid && nationalityValid && addressValid && phoneValid;
  };

  const saveIDCardToDatabase = async (cardData: IDCard, isPrimary: boolean) => {
    try {
      console.log('=== SAVE ID CARD START ===');
      console.log('Input cardData:', cardData);
      console.log('Input cardData photo:', cardData.photo);
      console.log('Input cardData photo type:', typeof cardData.photo);
      console.log('Input cardData photo truthy:', !!cardData.photo);
      console.log('isPrimary:', isPrimary);

      // Format date to YYYY-MM-DD if it's not already in that format
      let formattedDate = cardData.dateOfBirth;
      if (cardData.dateOfBirth) {
        const date = parseDate(cardData.dateOfBirth);
        if (!isNaN(date.getTime())) {
          formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
        }
      }

      const dataToSend = {
        photo: cardData.photo || '',
        name: cardData.name,
        gender: cardData.gender,
        date_of_birth: formattedDate,
        nationality: cardData.nationality,
        address: cardData.address,
        phone_number: cardData.phoneNumber,
        skills: cardData.skills,
        is_primary: isPrimary,
      };

      console.log('Sending ID card data:', dataToSend);
      console.log('Sending photo field:', dataToSend.photo);
      console.log('Sending photo field type:', typeof dataToSend.photo);

      if (cardData.id) {
        // Update existing card
        console.log('Updating existing ID card with ID:', cardData.id);
        const response = await idCardAPI.updateIDCard(cardData.id, dataToSend);
        console.log('✅ ID card updated successfully:', response);
      } else {
        // Create new card
        console.log('Creating new ID card');
        const response = await idCardAPI.createIDCard(dataToSend);
        console.log('✅ ID card created successfully:', response);
      }
    } catch (error: any) {
      console.error('❌ Error saving ID card:', error);
      console.error('Error details:', error.response?.data);
      throw error;
    }
  };

  const saveResumeFilesToDatabase = async () => {
    try {
      console.log('=== SAVE RESUME FILES START ===');
      console.log('Resume files to save:', resumeFiles);
      console.log('Number of files:', resumeFiles.length);

      if (resumeFiles.length === 0) {
        console.log('No resume files to save');
        return;
      }

      for (let i = 0; i < resumeFiles.length; i++) {
        const file = resumeFiles[i];
        console.log(`Processing file ${i + 1}/${resumeFiles.length}:`, file.name);

        // Save resume file metadata to database
        const dataToSend = {
          file_name: file.name,
          file_url: file.url, // Google Drive URL
          file_size: 0, // No longer used for URL-based resumes
          is_default: file.isDefault,
        };

        console.log('Sending resume file data to API:', dataToSend);

        try {
          const response = await resumeAPI.createResumeFile(dataToSend);
          console.log('✅ Resume file saved successfully:', response);
          Alert.alert('Success', `Resume "${file.name}" saved to database!`);


        } catch (apiError: any) {
          console.error('❌ API Error for file:', file.name, apiError);
          console.error('API Error details:', apiError.response?.data);
          Alert.alert('Error', `Failed to save resume "${file.name}": ${apiError.response?.data?.detail || apiError.message}`);
          throw apiError;
        }
      }

      console.log('=== SAVE RESUME FILES COMPLETED ===');
    } catch (error) {
      console.error('❌ Error in saveResumeFilesToDatabase:', error);
      throw error;
    }
  };

  const handleSave = async () => {
    console.log('=== HANDLE SAVE START ===');
    console.log('Form validation check...');

    if (!isFormValid()) {
      console.log('❌ Form validation failed');
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }

    try {
      setIsLoading(true);
      console.log('✅ Form validation passed');
      console.log('Starting save process...');
      console.log('Editing Card:', editingCard);
      console.log('Temp card data:', JSON.stringify(tempCardData, null, 2));

      // Check authentication first
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Save the edited card to the database
      const isPrimary = editingCard === 'card1';
      await saveIDCardToDatabase(tempCardData, isPrimary);
      console.log(`✅ ID Card (${editingCard}) saved successfully`);

      let successMessage = 'ID card details saved successfully!';
      console.log('Save process completed successfully');

      // Force reload data to update the main screen
      console.log('Forcing data reload after save...');
      await loadExistingData(true);

      Alert.alert(
        'Success',
        successMessage,
        [{
          text: 'OK', onPress: () => {
            setShowForm(false);
            setEditingCard(null);
          }
        }]
      );
    } catch (error: any) {
      console.error('Error saving data:', error);
      console.error('Error details:', error.response?.data);

      let errorMessage = 'Failed to save data. Please try again.';
      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.date_of_birth) {
          errorMessage = `Date format error: ${errorData.date_of_birth[0]}`;
        } else if (errorData.name) {
          errorMessage = `Name error: ${errorData.name[0]}`;
        } else if (errorData.gender) {
          errorMessage = `Gender error: ${errorData.gender[0]}`;
        } else if (errorData.nationality) {
          errorMessage = `Nationality error: ${errorData.nationality[0]}`;
        } else if (errorData.address) {
          errorMessage = `Address error: ${errorData.address[0]}`;
        } else if (errorData.phone_number) {
          errorMessage = `Phone number error: ${errorData.phone_number[0]}`;
        }
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCard = (cardNumber: 'card1' | 'card2') => {
    console.log('=== HANDLE EDIT CARD START ===');
    console.log('Editing card:', cardNumber);

    const targetData = cardNumber === 'card1' ? card1Data : card2Data;
    setTempCardData({ ...targetData });

    setEditingCard(cardNumber);
    setShowGenderDropdown(false);
    setShowNationalityDropdown(false);
    setShowSkillSuggestions(false);
    setSkillInput('');
    setShowForm(true);
  };

  const setDefaultCard = async (cardNumber: 'card1' | 'card2') => {
    try {
      console.log('=== SET DEFAULT CARD START ===');
      console.log('Setting default card to:', cardNumber);

      const cardData = cardNumber === 'card1' ? card1Data : card2Data;
      const otherCardData = cardNumber === 'card1' ? card2Data : card1Data;

      console.log('Card to make primary:', cardData);
      console.log('Card to make secondary:', otherCardData);

      // Check if the card has data
      if (!cardData.name || !cardData.gender || !cardData.dateOfBirth || !cardData.nationality || !cardData.address || !cardData.phoneNumber) {
        Alert.alert('Error', 'Cannot set default for an incomplete ID card. Please fill all required fields first.');
        return;
      }

      // Update both cards in the database
      if (cardData.id) {
        const updateData = {
          photo: cardData.photo || '',
          name: cardData.name,
          gender: cardData.gender,
          date_of_birth: cardData.dateOfBirth,
          nationality: cardData.nationality,
          address: cardData.address,
          phone_number: cardData.phoneNumber,
          skills: cardData.skills,
          is_primary: true,
        };
        console.log('Updating card to primary with data:', updateData);
        await idCardAPI.updateIDCard(cardData.id, updateData);
        console.log('✅ Updated card to primary');
      }

      if (otherCardData.id) {
        const updateData = {
          photo: otherCardData.photo || '',
          name: otherCardData.name,
          gender: otherCardData.gender,
          date_of_birth: otherCardData.dateOfBirth,
          nationality: otherCardData.nationality,
          address: otherCardData.address,
          phone_number: otherCardData.phoneNumber,
          skills: otherCardData.skills,
          is_primary: false,
        };
        console.log('Updating other card to secondary with data:', updateData);
        await idCardAPI.updateIDCard(otherCardData.id, updateData);
        console.log('✅ Updated other card to secondary');
      }

      // Update local state
      setCard1Data(prev => ({ ...prev, is_primary: cardNumber === 'card1' }));
      setCard2Data(prev => ({ ...prev, is_primary: cardNumber === 'card2' }));

      Alert.alert('Success', `ID Card ${cardNumber === 'card1' ? '1' : '2'} is now set as default!`);
      console.log('=== SET DEFAULT CARD COMPLETED ===');
    } catch (error: any) {
      console.error('❌ Error setting default card:', error);
      Alert.alert('Error', 'Failed to set default card. Please try again.');
    }
  };

  const hasUnsavedChanges = () => {
    const original = editingCard === 'card1' ? card1Data : card2Data;
    return (
      (tempCardData.photo || '') !== (original.photo || '') ||
      (tempCardData.name || '') !== (original.name || '') ||
      (tempCardData.gender || '') !== (original.gender || '') ||
      (tempCardData.dateOfBirth || '') !== (original.dateOfBirth || '') ||
      (tempCardData.nationality || '') !== (original.nationality || '') ||
      (tempCardData.address || '') !== (original.address || '') ||
      (tempCardData.phoneNumber || '') !== (original.phoneNumber || '') ||
      JSON.stringify(tempCardData.skills) !== JSON.stringify(original.skills)
    );
  };

  const handleCloseForm = () => {
    console.log('=== HANDLE CLOSE FORM START ===');
    if (hasUnsavedChanges()) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setShowForm(false);
              setEditingCard(null);
            }
          }
        ]
      );
    } else {
      setShowForm(false);
      setEditingCard(null);
    }
  };

  const renderIDCardForm = () => {
    if (!editingCard) return null;
    const isCard1 = editingCard === 'card1';
    const age = calculateAge(tempCardData.dateOfBirth);

    return (
      <View style={styles.idCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{isCard1 ? 'ID Card 1' : 'ID Card 2'}</Text>
          {!isCard1 && (
            <View style={styles.optionalTag}>
              <Text style={styles.optionalText}>Optional</Text>
            </View>
          )}
        </View>

        {/* Photo Section */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Photo (Optional)</Text>
          <View style={styles.photoSection}>
            {tempCardData.photo ? (
              <View style={styles.photoContainer}>
                <Image source={{ uri: tempCardData.photo }} style={styles.photoPreview} />
                <TouchableOpacity
                  style={styles.photoRemoveButton}
                  onPress={() => removePhoto(isCard1 ? 1 : 2)}
                >
                  <Ionicons name="close-circle" size={24} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.photoPlaceholder}
                onPress={() => pickImage(isCard1 ? 1 : 2)}
              >
                <Ionicons name="camera" size={32} color={colors.textSecondary} />
                <Text style={styles.photoPlaceholderText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Name Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Full Name *</Text>
          <TextInput
            style={styles.textInput}
            value={tempCardData.name}
            onChangeText={(text) => setTempCardData(prev => ({ ...prev, name: text }))}
            placeholder="Enter your full name"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Gender Dropdown */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Gender *</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => {
              setShowGenderDropdown(!showGenderDropdown);
              setShowNationalityDropdown(false);
            }}
          >
            <Text style={[styles.dropdownText, !tempCardData.gender && styles.placeholderText]}>
              {tempCardData.gender || 'Select gender'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          {showGenderDropdown && (
            <View style={styles.dropdownMenu}>
              {genderOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.dropdownOption}
                  onPress={() => {
                    setTempCardData(prev => ({ ...prev, gender: option }));
                    setShowGenderDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownOptionText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Date of Birth */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Date of Birth *</Text>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => {
              if (isCard1) {
                setShowDatePicker1(true);
              } else {
                setShowDatePicker2(true);
              }
            }}
          >
            <Text style={[styles.datePickerText, !tempCardData.dateOfBirth && styles.placeholderText]}>
              {tempCardData.dateOfBirth ? formatDateForDisplay(tempCardData.dateOfBirth) : 'Select date'}
            </Text>
            <Ionicons name="calendar" size={20} color="#6b46c1" />
          </TouchableOpacity>
          {age && <Text style={styles.ageText}>Age: {age} years</Text>}

          {isCard1 && showDatePicker1 && (
            <CustomDatePicker
              currentDate={parseDate(tempCardData.dateOfBirth)}
              onDateSelect={handleDateChange}
              onClose={() => setShowDatePicker1(false)}
            />
          )}

          {!isCard1 && showDatePicker2 && (
            <CustomDatePicker
              currentDate={parseDate(tempCardData.dateOfBirth)}
              onDateSelect={handleDateChange}
              onClose={() => setShowDatePicker2(false)}
            />
          )}
        </View>

        {/* Nationality */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Nationality *</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => {
              setShowNationalityDropdown(!showNationalityDropdown);
              setShowGenderDropdown(false);
            }}
          >
            <Text style={[styles.dropdownText, !tempCardData.nationality && styles.placeholderText]}>
              {tempCardData.nationality || 'Select nationality'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          {showNationalityDropdown && (
            <View style={styles.dropdownMenu}>
              <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 200 }}>
                {nationalityOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={styles.dropdownOption}
                    onPress={() => {
                      setTempCardData(prev => ({ ...prev, nationality: option }));
                      setShowNationalityDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownOptionText}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Address */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Address *</Text>
          <TextInput
            style={[styles.textInput, styles.multilineInput]}
            value={tempCardData.address}
            onChangeText={(text) => setTempCardData(prev => ({ ...prev, address: text }))}
            placeholder="Enter your full address"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Phone Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Phone Number *</Text>
          <TextInput
            style={styles.textInput}
            value={tempCardData.phoneNumber}
            onChangeText={(text) => setTempCardData(prev => ({ ...prev, phoneNumber: text }))}
            placeholder="Enter your phone number"
            placeholderTextColor={colors.textSecondary}
            keyboardType="phone-pad"
          />
        </View>

        {/* Skills */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Skills</Text>
          <View style={styles.skillInputContainer}>
            <TextInput
              style={styles.skillInput}
              value={skillInput}
              onChangeText={(text) => {
                setSkillInput(text);
                setShowSkillSuggestions(text.length > 0);
              }}
              placeholder="Add a skill"
              placeholderTextColor={colors.textSecondary}
            />
            <TouchableOpacity
              style={styles.addSkillButton}
              onPress={() => addSkill(skillInput)}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Skill Suggestions */}
          {showSkillSuggestions && filteredSkills.length > 0 && (
            <View style={styles.skillSuggestions}>
              {filteredSkills.slice(0, 5).map((skill) => (
                <TouchableOpacity
                  key={skill}
                  style={styles.skillSuggestion}
                  onPress={() => addSkill(skill)}
                >
                  <Text style={styles.skillSuggestionText}>{skill}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Selected Skills */}
          <View style={styles.skillsContainer}>
            {tempCardData.skills.map((skill, index) => (
              <View key={index} style={styles.skillTag}>
                <Text style={styles.skillTagText}>{skill}</Text>
                <TouchableOpacity
                  onPress={() => removeSkill(skill)}
                  style={styles.removeSkillButton}
                >
                  <Ionicons name="close" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.brandBackground }]}>
      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.brandBackground, paddingTop: Math.max(insets.top + 6, 50) }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (showForm) {
              handleCloseForm();
            } else {
              router.back();
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Resume</Text>
        <View style={styles.placeholder} />
      </View>

      {showForm ? (
        // Form View
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
          >
            <View style={styles.formHeader}>
              <TouchableOpacity style={styles.closeButton} onPress={handleCloseForm}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.formTitle, { color: colors.text }]}>
                {editingCard === 'card1' ? 'Create/Edit ID Card 1' : 'Create/Edit ID Card 2'}
              </Text>
              <View style={styles.placeholder} />
            </View>

            {/* Single Card Form */}
            <View style={styles.cardsSection}>
              {renderIDCardForm()}
            </View>

            {/* Save Button */}
            <View style={styles.saveSection}>
              <TouchableOpacity
                style={[styles.saveButton, !isFormValid() && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={!isFormValid() || isLoading}
              >
                <Text style={[styles.saveButtonText, !isFormValid() && styles.saveButtonTextDisabled]}>
                  {isLoading ? 'Saving...' : 'Save ID Card'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        // Card View - wrapped in KeyboardAvoidingView so resume URL inputs stay visible above keyboard
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
          >
            {/* Digital ID Cards */}
            <View style={styles.cardsSection}>
              <DigitalIDCard
                data={card1Data}
                isDefault={card1Data.is_primary}
                onEdit={() => handleEditCard('card1')}
                onSetDefault={() => setDefaultCard('card1')}
                cardNumber={1}
              />
              <DigitalIDCard
                data={card2Data}
                isDefault={card2Data.is_primary}
                onEdit={() => handleEditCard('card2')}
                onSetDefault={() => setDefaultCard('card2')}
                cardNumber={2}
              />
            </View>

            {/* Resume URL Section */}
            <View style={styles.resumeSection}>
              <View style={styles.resumeSectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Resume URLs</Text>
                <TouchableOpacity
                  style={styles.editResumeButton}
                  onPress={() => {
                    if (isEditingResumes) {
                      // Save when exiting edit mode
                      saveResumeURLs();
                    }
                    setIsEditingResumes(!isEditingResumes);
                  }}
                >
                  {isEditingResumes ? (
                    <Text style={styles.editResumeButtonText}>Save</Text>
                  ) : (
                    <Ionicons
                      name="create-outline"
                      size={24}
                      color="#6b46c1"
                    />
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.resumeNoticeContainer}>
                <Ionicons name="information-circle-outline" size={18} color="#6b46c1" />
                <Text style={styles.resumeNoticeText}>
                  Add up to 2 Google Drive resume URLs. Set one as default.
                </Text>
              </View>

              {/* GDrive Notice - only in edit mode */}
              {isEditingResumes && (
                <View style={styles.gdriveNotice}>
                  <Ionicons name="information-circle" size={20} color="#6b46c1" />
                  <Text style={styles.gdriveNoticeText}>
                    Make sure your Google Drive file is set to "Anyone with the link can view" so employers can access your resume.
                  </Text>
                </View>
              )}

              {/* Resume URL Inputs */}
              {resumeFiles.map((file, index) => (
                <View key={file.id || index} style={[styles.urlInputContainer, { backgroundColor: colors.cardAlt }]}>
                  <View style={styles.urlInputHeader}>
                    <Text style={[styles.urlInputLabel, { color: colors.textSecondary }]}>Resume {index + 1}</Text>
                    {file.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Default</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.urlInputRow}>
                    {isEditingResumes ? (
                      <TextInput
                        style={[styles.urlInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                        value={file.url}
                        onChangeText={(text) => {
                          setResumeFiles(prev => prev.map((f, i) =>
                            i === index ? { ...f, url: text } : f
                          ));
                        }}
                        placeholder="https://drive.google.com/..."
                        placeholderTextColor={colors.textSecondary}
                        autoCapitalize="none"
                        keyboardType="url"
                      />
                    ) : (
                      <TouchableOpacity
                        style={[styles.urlDisplayContainer, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={async () => {
                          if (file.url) {
                            try {
                              const supported = await Linking.canOpenURL(file.url);
                              if (supported) {
                                await Linking.openURL(file.url);
                              } else {
                                Alert.alert('Invalid URL', 'This URL cannot be opened. Please make sure it is a valid link.');
                              }
                            } catch (e) {
                              Alert.alert('Error', 'Could not open this URL. Please check the link.');
                            }
                          }
                        }}
                      >
                        <Text style={[styles.urlDisplayText, { color: colors.text }]} numberOfLines={1}>
                          {file.url || 'No URL added'}
                        </Text>
                        {file.url && (
                          <Ionicons name="open-outline" size={18} color="#6b46c1" />
                        )}
                      </TouchableOpacity>
                    )}
                    {isEditingResumes && (
                      <TouchableOpacity
                        style={styles.removeUrlButton}
                        onPress={() => removeResume(file.id!)}
                      >
                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {isEditingResumes && !file.isDefault && resumeFiles.length > 1 && (
                    <TouchableOpacity
                      style={styles.setDefaultUrlButton}
                      onPress={() => setDefaultResume(file.id!)}
                    >
                      <Text style={styles.setDefaultText}>Set as Default</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {/* Add URL Button - only in edit mode */}
              {isEditingResumes && resumeFiles.length < 2 && (
                <TouchableOpacity
                  style={styles.addUrlButton}
                  onPress={() => {
                    const newFile: ResumeFile = {
                      id: Date.now().toString(),
                      name: `Resume ${resumeFiles.length + 1}`,
                      url: '',
                      isDefault: resumeFiles.length === 0,
                    };
                    setResumeFiles(prev => [...prev, newFile]);
                  }}
                >
                  <Ionicons name="add-circle-outline" size={24} color="#6b46c1" />
                  <Text style={styles.addUrlButtonText}>Add Resume URL</Text>
                </TouchableOpacity>
              )}

              {/* File Count Indicator */}
              <Text style={styles.fileCountText}>
                {resumeFiles.length}/2 resume URLs added
              </Text>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      )}
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
    paddingTop: 50,
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
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.brandBackground,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },

  cardsSection: {
    marginBottom: 24,
  },
  idCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  optionalTag: {
    backgroundColor: colors.cardAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  optionalText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.2)',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  placeholderText: {
    color: colors.textSecondary,
  },
  datePickerButton: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.2)',
  },
  datePickerText: {
    fontSize: 16,
    color: colors.text,
  },
  ageText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
    marginTop: 4,
  },
  dropdownButton: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.2)',
  },
  dropdownText: {
    fontSize: 16,
    color: colors.text,
  },
  dropdownMenu: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxHeight: 200,
  },
  dropdownOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownOptionText: {
    fontSize: 16,
    color: colors.text,
  },
  skillInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  skillInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.2)',
  },
  addSkillButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  skillSuggestions: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  skillSuggestion: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  skillSuggestionText: {
    fontSize: 14,
    color: colors.text,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  skillTag: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  skillTagText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  removeSkillButton: {
    padding: 2,
  },
  resumeSection: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  uploadButton: {
    backgroundColor: colors.cardAlt,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  uploadButtonDisabled: {
    backgroundColor: colors.cardAlt,
    borderColor: colors.textSecondary,
  },
  uploadButtonTextDisabled: {
    color: colors.textSecondary,
  },
  resumeFile: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  resumeFileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  resumeFileDetails: {
    flex: 1,
  },
  resumeFileName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  defaultBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  defaultBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  resumeFileActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  setDefaultButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  setDefaultText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  removeButton: {
    padding: 4,
  },
  saveSection: {
    paddingBottom: 32,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    backgroundColor: colors.textSecondary,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  saveButtonTextDisabled: {
    color: colors.textSecondary,
  },
  resumeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  editResumeButton: {
    padding: 8,
  },
  editResumeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
  },
  urlDisplayContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardAlt,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 8,
  },
  urlDisplayText: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563',
  },
  debugButton: {
    backgroundColor: '#10b981',
    marginTop: 8,
  },
  // Custom Date Picker Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerModal: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    width: width * 0.9,
    maxHeight: '80%',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  datePickerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  datePickerColumn: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  datePickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  datePickerScroll: {
    maxHeight: 200,
  },
  datePickerOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 2,
    minWidth: 60,
    alignItems: 'center',
  },
  datePickerOptionSelected: {
    backgroundColor: colors.primary,
  },
  datePickerOptionText: {
    fontSize: 16,
    color: colors.text,
  },
  datePickerOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  datePickerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  datePickerButtonConfirm: {
    backgroundColor: colors.primary,
  },
  datePickerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  datePickerButtonTextConfirm: {
    color: '#fff',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  closeButton: {
    padding: 4,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  fileCountText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  photoSection: {
    alignItems: 'center',
    marginTop: 8,
  },
  photoContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  photoPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.cardAlt,
  },
  photoRemoveButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: colors.card,
    borderRadius: 12,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.cardAlt,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  // URL Input Styles
  gdriveNotice: {
    flexDirection: 'row',
    backgroundColor: colors.cardAlt,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: 'flex-start',
    gap: 8,
  },
  gdriveNoticeText: {
    flex: 1,
    fontSize: 13,
    color: colors.primary,
    lineHeight: 18,
  },
  urlInputContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  urlInputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  urlInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  urlInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  urlInput: {
    flex: 1,
    backgroundColor: colors.cardAlt,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  removeUrlButton: {
    padding: 8,
    backgroundColor: colors.cardAlt,
    borderRadius: 8,
  },
  urlNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  urlNameLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  urlNameInput: {
    flex: 1,
    backgroundColor: colors.cardAlt,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  setDefaultUrlButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  addUrlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardAlt,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    gap: 8,
  },
  addUrlButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  saveUrlsButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveUrlsButtonDisabled: {
    backgroundColor: colors.textSecondary,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveUrlsButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  resumeNoticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardAlt,
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  resumeNoticeText: {
    flex: 1,
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
    lineHeight: 18,
  },
}); 
