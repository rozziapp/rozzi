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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCustomFonts } from '@/hooks/fonts';
import { router } from 'expo-router';
import { useBackHandler } from '@/hooks/useBackHandler';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import DigitalIDCard from '@/components/DigitalIDCard';
import { idCardAPI, resumeAPI } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

const { width } = Dimensions.get('window');

// Custom Date Picker Component
interface CustomDatePickerProps {
  currentDate: Date;
  onDateSelect: (year: number, month: number, day: number) => void;
  onClose: () => void;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ currentDate, onDateSelect, onClose }) => {
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
              <Ionicons name="close" size={24} color="#000" />
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
  uri: string;
  isDefault: boolean;
  file_size?: number;
}

export default function ResumeScreen() {
  const [fontsLoaded] = useCustomFonts();
  const { user, isAuthenticated } = useAuth();
  
  const [showGenderDropdown1, setShowGenderDropdown1] = useState(false);
  const [showNationalityDropdown1, setShowNationalityDropdown1] = useState(false);
  const [showSkillSuggestions1, setShowSkillSuggestions1] = useState(false);
  const [skillInput1, setSkillInput1] = useState('');
  
  const [showGenderDropdown2, setShowGenderDropdown2] = useState(false);
  const [showNationalityDropdown2, setShowNationalityDropdown2] = useState(false);
  const [showSkillSuggestions2, setShowSkillSuggestions2] = useState(false);
  const [skillInput2, setSkillInput2] = useState('');
  
  const [resumeFiles, setResumeFiles] = useState<ResumeFile[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState<'card1' | 'card2' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Date picker states
  const [showDatePicker1, setShowDatePicker1] = useState(false);
  const [showDatePicker2, setShowDatePicker2] = useState(false);
  const [isSavingResume, setIsSavingResume] = useState(false);

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

  // Load existing data on component mount
  useEffect(() => {
    if (isAuthenticated) {
      loadExistingData(true); // Force reload on mount
    }
  }, [isAuthenticated]);

  // Also reload data when the screen comes into focus (but not too frequently)
  useEffect(() => {
    const unsubscribe = () => {
      if (isAuthenticated) {
        console.log('Resume screen focused, checking if reload needed...');
        // Add delay to prevent interfering with upload operations
        setTimeout(() => {
          loadExistingData(false); // Don't force reload on focus
        }, 2000); // 2 second delay to allow uploads to complete
      }
    };

    // This will be called when the component mounts and when isAuthenticated changes
    unsubscribe();
  }, [isAuthenticated]);

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
        
        const primaryCard = limitedCards.find((card: any) => card.is_primary);
        const secondaryCard = limitedCards.find((card: any) => !card.is_primary);
        
        console.log('Primary card found:', primaryCard);
        console.log('Secondary card found:', secondaryCard);
        
        // Clean up excess ID cards from database if more than 2 exist
        if (idCards.length > 2) {
          console.log('⚠️ More than 2 ID cards found in database, cleaning up excess cards...');
          await cleanupExcessIDCards(idCards.slice(2));
        }
        
        if (primaryCard) {
          console.log('Setting primary card:', primaryCard);
          console.log('Primary card photo field:', primaryCard.photo);
          console.log('Primary card photo type:', typeof primaryCard.photo);
          console.log('Primary card photo truthy:', !!primaryCard.photo);
          
          const newCard1Data = {
            id: primaryCard.id,
            photo: primaryCard.photo || '',
            name: primaryCard.name,
            gender: primaryCard.gender,
            dateOfBirth: primaryCard.date_of_birth,
            nationality: primaryCard.nationality,
            address: primaryCard.address,
            phoneNumber: primaryCard.phone_number || '',
            skills: primaryCard.skills || [],
            is_primary: true,
          };
          console.log('New card1Data to set:', newCard1Data);
          console.log('New card1Data photo:', newCard1Data.photo);
          setCard1Data(newCard1Data);
        }
        
        if (secondaryCard) {
          console.log('Setting secondary card:', secondaryCard);
          console.log('Secondary card photo field:', secondaryCard.photo);
          console.log('Secondary card photo type:', typeof secondaryCard.photo);
          console.log('Secondary card photo truthy:', !!secondaryCard.photo);
          
          setCard2Data({
            id: secondaryCard.id,
            photo: secondaryCard.photo || '',
            name: secondaryCard.name,
            gender: secondaryCard.gender,
            dateOfBirth: secondaryCard.date_of_birth,
            nationality: secondaryCard.nationality,
            address: secondaryCard.address,
            phoneNumber: secondaryCard.phone_number || '',
            skills: secondaryCard.skills || [],
            is_primary: false,
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
          console.log('Limited resume files to 2:', limitedFiles);
          
          const formattedResumeFiles = limitedFiles.map((file: any) => ({
            id: file.id.toString(),
            name: file.file_name,
            uri: file.file_url,
            isDefault: file.is_default,
            file_size: file.file_size,
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

  // Handle back button
  useBackHandler({
    targetRoute: '/my-profile'
  });

  if (!fontsLoaded) {
    return null;
  }

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return '';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age.toString();
  };

  // Format date for display
  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // Handle date change for card 1
  const handleDateChange1 = (year: number, month: number, day: number) => {
    setShowDatePicker1(false);
    const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    setCard1Data(prev => ({ ...prev, dateOfBirth: formattedDate }));
  };

  // Handle date change for card 2
  const handleDateChange2 = (year: number, month: number, day: number) => {
    setShowDatePicker2(false);
    const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    setCard2Data(prev => ({ ...prev, dateOfBirth: formattedDate }));
  };

  // Filter skills based on input for card 1
  const filteredSkills1 = useMemo(() => {
    if (!skillInput1.trim()) return [];
    return defaultSkills.filter(skill =>
      skill.toLowerCase().includes(skillInput1.toLowerCase()) &&
      !card1Data.skills.includes(skill)
    );
  }, [skillInput1, card1Data.skills]);

  // Filter skills based on input for card 2
  const filteredSkills2 = useMemo(() => {
    if (!skillInput2.trim()) return [];
    return defaultSkills.filter(skill =>
      skill.toLowerCase().includes(skillInput2.toLowerCase()) &&
      !card2Data.skills.includes(skill)
    );
  }, [skillInput2, card2Data.skills]);

  const addSkill1 = (skill: string) => {
    if (skill.trim() && !card1Data.skills.includes(skill.trim())) {
      setCard1Data(prev => ({
        ...prev,
        skills: [...prev.skills, skill.trim()]
      }));
    }
    setSkillInput1('');
    setShowSkillSuggestions1(false);
  };

  const removeSkill1 = (skillToRemove: string) => {
    setCard1Data(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const addSkill2 = (skill: string) => {
    if (skill.trim() && !card2Data.skills.includes(skill.trim())) {
      setCard2Data(prev => ({
        ...prev,
        skills: [...prev.skills, skill.trim()]
      }));
    }
    setSkillInput2('');
    setShowSkillSuggestions2(false);
  };

  const removeSkill2 = (skillToRemove: string) => {
    setCard2Data(prev => ({
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
            
            // Update card data with Cloudinary URL
            if (cardNumber === 1) {
              console.log('Updating card 1 photo from:', card1Data.photo, 'to:', cloudinaryUrl);
              setCard1Data(prev => {
                const newData = { ...prev, photo: cloudinaryUrl };
                console.log('New card1Data photo:', newData.photo);
                return newData;
              });
            } else {
              console.log('Updating card 2 photo from:', card2Data.photo, 'to:', cloudinaryUrl);
              setCard2Data(prev => {
                const newData = { ...prev, photo: cloudinaryUrl };
                console.log('New card2Data photo:', newData.photo);
                return newData;
              });
            }
            
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
    if (cardNumber === 1) {
      console.log('Removing photo from card 1, current photo:', card1Data.photo);
      setCard1Data(prev => ({ ...prev, photo: '' }));
    } else {
      console.log('Removing photo from card 2, current photo:', card2Data.photo);
      setCard2Data(prev => ({ ...prev, photo: '' }));
    }
  };

  const pickResume = async () => {
    try {
      console.log('=== PICK RESUME START ===');
      console.log('Current resume files before picking:', resumeFiles);
      console.log('Current resume files length before picking:', resumeFiles.length);
      
      // Prevent multiple concurrent operations
      if (isSavingResume) {
        console.log('Already saving a resume, please wait...');
        Alert.alert('Please Wait', 'Already processing a resume file. Please wait for it to complete.');
        return;
      }
      
      // Check if we've reached the limit
      if (resumeFiles.length >= 2) {
        Alert.alert('Limit Reached', 'You can only upload up to 2 resume files. Please delete an existing file first.');
        return;
      }
      
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      console.log('Document picker result:', result);
      console.log('Result canceled:', result.canceled);
      console.log('Result assets:', result.assets);
      console.log('First asset:', result.assets?.[0]);

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        console.log('Selected asset:', asset);
        
        // Automatically save the new file to database first
        setIsSavingResume(true);
        try {
          console.log('Uploading resume file to Cloudinary...');
          
          // Convert file to base64 for Cloudinary upload
          const base64Data = await convertFileToBase64(asset.uri);
          if (!base64Data) {
            throw new Error('Failed to convert file to base64');
          }
          
          // Create data URL for Cloudinary upload
          const dataUrl = `data:application/pdf;base64,${base64Data}`;
          
          // Upload to Cloudinary first
          const uploadResult = await resumeAPI.uploadResumeFile(dataUrl, asset.name || 'Resume.pdf');
          console.log('✅ Resume file uploaded to Cloudinary:', uploadResult);
          
          const cloudinaryUrl = uploadResult.file_url;
          
          // Now save to database with Cloudinary URL
          console.log('Saving resume file to database...');
          const dataToSend = {
            file_name: asset.name || 'Resume.pdf',
            file_url: cloudinaryUrl,
            file_size: asset.size || 0,
            is_default: resumeFiles.length === 0, // First resume is default
          };
          
          console.log('Sending resume file data to API:', dataToSend);
          const response = await resumeAPI.createResumeFile(dataToSend);
          console.log('✅ Resume file saved to database successfully:', response);
          
          // Update the resume file with the database ID and add to state
          if (!response || !response.id) {
            console.error('❌ Invalid response from API:', response);
            throw new Error('Invalid response from server - no ID returned');
          }
          
          const savedResume: ResumeFile = {
            id: response.id.toString(),
            name: asset.name || 'Resume.pdf',
            uri: cloudinaryUrl, // Use Cloudinary URL instead of local URI
            isDefault: resumeFiles.length === 0,
            file_size: asset.size || 0,
          };
          
          try {
            // Update state immediately to show the new file
            setResumeFiles(prev => {
              console.log('setResumeFiles callback - prev:', prev);
              console.log('setResumeFiles callback - prev length:', prev.length);
              
              // Ensure we have a valid array
              if (!Array.isArray(prev)) {
                console.warn('Previous resume files state is not an array, resetting to empty array');
                return [savedResume];
              }
              
              const newFiles = [...prev, savedResume];
              console.log('setResumeFiles callback - newFiles:', newFiles);
              console.log('setResumeFiles callback - newFiles length:', newFiles.length);
              return newFiles;
            });
            
            // Prevent automatic reloads for a short time to allow state to settle
            setLastLoadTime(Date.now() + 3000); // Add 3 seconds to prevent immediate reloads
          } catch (stateError) {
            console.error('Error updating resume files state:', stateError);
            // Fallback: force reload from database
            setTimeout(() => {
              loadExistingData(true);
            }, 1000);
          }
          
          Alert.alert('Success', `Resume "${asset.name || 'Resume.pdf'}" uploaded and saved successfully!`);
        } catch (error: any) {
          console.error('❌ Error uploading/saving resume:', error);
          console.error('Error details:', error.response?.data);
          
          Alert.alert('Error', `Failed to upload resume: ${error.response?.data?.error || error.message}`);
        } finally {
          setIsSavingResume(false);
        }
        
        console.log('=== PICK RESUME COMPLETED ===');
      } else {
        console.log('Document picker was canceled or no assets');
        Alert.alert('Info', 'No file selected or picker was canceled');
      }
    } catch (error) {
      console.error('Error in pickResume:', error);
      Alert.alert('Error', 'Failed to pick document');
    } finally {
      // Ensure loading state is always reset
      setIsSavingResume(false);
    }
  };

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

  const isFormValid = () => {
    // Only require ID card 1 to be filled, skills are optional
    console.log('=== FORM VALIDATION DEBUG ===');
    console.log('card1Data.name:', card1Data.name);
    console.log('card1Data.gender:', card1Data.gender);
    console.log('card1Data.dateOfBirth:', card1Data.dateOfBirth);
    console.log('card1Data.nationality:', card1Data.nationality);
    console.log('card1Data.address:', card1Data.address);
    console.log('card1Data.phoneNumber:', card1Data.phoneNumber);
    console.log('card1Data.skills:', card1Data.skills);
    console.log('card1Data.skills.length:', card1Data.skills.length);
    
    const card1Valid = card1Data.name && card1Data.gender && card1Data.dateOfBirth && 
                      card1Data.nationality && card1Data.address && card1Data.phoneNumber;
    
    console.log('card1Valid:', card1Valid);
    return card1Valid;
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
        const date = new Date(cardData.dateOfBirth);
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
        // For now, we'll save the local file path as the URL
        // In production, this would be a cloud storage URL
        const dataToSend = {
          file_name: file.name,
          file_url: file.uri, // Local file path for now
          file_size: file.file_size || 0,
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
      Alert.alert('Validation Error', 'Please fill in all required fields for ID Card 1.');
      return;
    }

    try {
      setIsLoading(true);
      console.log('✅ Form validation passed');
      console.log('Starting save process...');
      console.log('Card 1 data:', JSON.stringify(card1Data, null, 2));
      console.log('Card 2 data:', JSON.stringify(card2Data, null, 2));

      // Check authentication first
      const token = await AsyncStorage.getItem('authToken');
      console.log('Auth token available:', !!token);
      console.log('Auth token (first 20 chars):', token?.substring(0, 20) + '...');
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Test API connectivity
      console.log('Testing API connectivity...');
      try {
        const testResponse = await idCardAPI.getIDCards();
        console.log('✅ API connectivity test passed:', testResponse);
      } catch (apiError: any) {
        console.error('❌ API connectivity test failed:', apiError);
        console.error('API Error details:', apiError.response?.data);
        console.error('API Error status:', apiError.response?.status);
        throw new Error(`API connectivity failed: ${apiError.response?.status} - ${apiError.response?.data?.detail || apiError.message}`);
      }

      // Save ID cards to database
      console.log('Saving primary ID card...');
      try {
        await saveIDCardToDatabase(card1Data, true);
        console.log('✅ Primary ID card saved successfully');
      } catch (card1Error) {
        console.error('❌ Error saving primary ID card:', card1Error);
        throw card1Error;
      }
      
      // Save second card if it has data
      if (card2Data.name && card2Data.gender && card2Data.dateOfBirth && 
          card2Data.nationality && card2Data.address && card2Data.phoneNumber) {
        console.log('Saving secondary ID card...');
        await saveIDCardToDatabase(card2Data, false);
        console.log('Secondary ID card saved successfully');
      }

      let successMessage = 'ID card details saved successfully!';
      
      console.log('Save process completed successfully');
      
      // Force reload data to update the main screen
      console.log('Forcing data reload after save...');
      await loadExistingData(true);
      
    Alert.alert(
      'Success',
        successMessage,
      [{ text: 'OK', onPress: () => {
        setShowForm(false);
        setEditingCard(null);
      }}]
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
    console.log('Card 1 data before edit:', card1Data);
    console.log('Card 2 data before edit:', card2Data);
    console.log('Card 1 photo before edit:', card1Data.photo);
    console.log('Card 2 photo before edit:', card2Data.photo);
    
    setEditingCard(cardNumber);
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

  const handleCloseForm = () => {
    console.log('=== HANDLE CLOSE FORM START ===');
    console.log('Card 1 data after edit:', card1Data);
    console.log('Card 2 data after edit:', card2Data);
    console.log('Card 1 photo after edit:', card1Data.photo);
    console.log('Card 2 photo after edit:', card2Data.photo);
    
    setShowForm(false);
    setEditingCard(null);
  };

  const renderIDCard1 = () => {
    const age = calculateAge(card1Data.dateOfBirth);

    return (
      <View style={styles.idCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>ID Card 1</Text>
        </View>

        {/* Photo Section */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Photo (Optional)</Text>
          <View style={styles.photoSection}>
            {card1Data.photo ? (
              <View style={styles.photoContainer}>
                <Image source={{ uri: card1Data.photo }} style={styles.photoPreview} />
                <TouchableOpacity 
                  style={styles.photoRemoveButton} 
                  onPress={() => removePhoto(1)}
                >
                  <Ionicons name="close-circle" size={24} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.photoPlaceholder} 
                onPress={() => pickImage(1)}
              >
                <Ionicons name="camera" size={32} color="#6b7280" />
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
            value={card1Data.name}
            onChangeText={(text) => setCard1Data(prev => ({ ...prev, name: text }))}
            placeholder="Enter your full name"
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Gender Dropdown */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Gender *</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowGenderDropdown1(!showGenderDropdown1)}
          >
            <Text style={[styles.dropdownText, !card1Data.gender && styles.placeholderText]}>
              {card1Data.gender || 'Select gender'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#6b7280" />
          </TouchableOpacity>
          {showGenderDropdown1 && (
            <View style={styles.dropdownMenu}>
              {genderOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.dropdownOption}
                  onPress={() => {
                    setCard1Data(prev => ({ ...prev, gender: option }));
                    setShowGenderDropdown1(false);
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
            onPress={() => setShowDatePicker1(true)}
          >
            <Text style={[styles.datePickerText, !card1Data.dateOfBirth && styles.placeholderText]}>
              {card1Data.dateOfBirth ? formatDateForDisplay(card1Data.dateOfBirth) : 'Select date'}
            </Text>
            <Ionicons name="calendar" size={20} color="#6b46c1" />
          </TouchableOpacity>
          {age && <Text style={styles.ageText}>Age: {age} years</Text>}
          
          {showDatePicker1 && (
            <CustomDatePicker
              currentDate={card1Data.dateOfBirth ? new Date(card1Data.dateOfBirth) : new Date()}
              onDateSelect={handleDateChange1}
              onClose={() => setShowDatePicker1(false)}
            />
          )}
        </View>

        {/* Nationality */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Nationality *</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowNationalityDropdown1(!showNationalityDropdown1)}
          >
            <Text style={[styles.dropdownText, !card1Data.nationality && styles.placeholderText]}>
              {card1Data.nationality || 'Select nationality'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#6b7280" />
          </TouchableOpacity>
          {showNationalityDropdown1 && (
            <View style={styles.dropdownMenu}>
              {nationalityOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.dropdownOption}
                  onPress={() => {
                    setCard1Data(prev => ({ ...prev, nationality: option }));
                    setShowNationalityDropdown1(false);
                  }}
                >
                  <Text style={styles.dropdownOptionText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Address */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Address *</Text>
          <TextInput
            style={[styles.textInput, styles.multilineInput]}
            value={card1Data.address}
            onChangeText={(text) => setCard1Data(prev => ({ ...prev, address: text }))}
            placeholder="Enter your full address"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Phone Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Phone Number *</Text>
          <TextInput
            style={styles.textInput}
            value={card1Data.phoneNumber}
            onChangeText={(text) => setCard1Data(prev => ({ ...prev, phoneNumber: text }))}
            placeholder="Enter your phone number"
            placeholderTextColor="#9ca3af"
            keyboardType="phone-pad"
          />
        </View>

        {/* Skills */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Skills</Text>
          <View style={styles.skillInputContainer}>
            <TextInput
              style={styles.skillInput}
              value={skillInput1}
              onChangeText={(text) => {
                setSkillInput1(text);
                setShowSkillSuggestions1(text.length > 0);
              }}
              placeholder="Add a skill"
              placeholderTextColor="#9ca3af"
            />
            <TouchableOpacity
              style={styles.addSkillButton}
              onPress={() => addSkill1(skillInput1)}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {/* Skill Suggestions */}
          {showSkillSuggestions1 && filteredSkills1.length > 0 && (
            <View style={styles.skillSuggestions}>
              {filteredSkills1.slice(0, 5).map((skill) => (
                <TouchableOpacity
                  key={skill}
                  style={styles.skillSuggestion}
                  onPress={() => addSkill1(skill)}
                >
                  <Text style={styles.skillSuggestionText}>{skill}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Selected Skills */}
          <View style={styles.skillsContainer}>
            {card1Data.skills.map((skill, index) => (
              <View key={index} style={styles.skillTag}>
                <Text style={styles.skillTagText}>{skill}</Text>
                <TouchableOpacity
                  onPress={() => removeSkill1(skill)}
                  style={styles.removeSkillButton}
                >
                  <Ionicons name="close" size={14} color="#6b7280" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderIDCard2 = () => {
    const age = calculateAge(card2Data.dateOfBirth);

    return (
      <View style={styles.idCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>ID Card 2</Text>
          <View style={styles.optionalTag}>
            <Text style={styles.optionalText}>Optional</Text>
          </View>
        </View>

        {/* Photo Section */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Photo (Optional)</Text>
          <View style={styles.photoSection}>
            {card2Data.photo ? (
              <View style={styles.photoContainer}>
                <Image source={{ uri: card2Data.photo }} style={styles.photoPreview} />
                <TouchableOpacity 
                  style={styles.photoRemoveButton} 
                  onPress={() => removePhoto(2)}
                >
                  <Ionicons name="close-circle" size={24} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.photoPlaceholder} 
                onPress={() => pickImage(2)}
              >
                <Ionicons name="camera" size={32} color="#6b7280" />
                <Text style={styles.photoPlaceholderText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Name Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Full Name</Text>
          <TextInput
            style={styles.textInput}
            value={card2Data.name}
            onChangeText={(text) => setCard2Data(prev => ({ ...prev, name: text }))}
            placeholder="Enter your full name"
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Gender Dropdown */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Gender</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowGenderDropdown2(!showGenderDropdown2)}
          >
            <Text style={[styles.dropdownText, !card2Data.gender && styles.placeholderText]}>
              {card2Data.gender || 'Select gender'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#6b7280" />
          </TouchableOpacity>
          {showGenderDropdown2 && (
            <View style={styles.dropdownMenu}>
              {genderOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.dropdownOption}
                  onPress={() => {
                    setCard2Data(prev => ({ ...prev, gender: option }));
                    setShowGenderDropdown2(false);
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
          <Text style={styles.inputLabel}>Date of Birth</Text>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker2(true)}
          >
            <Text style={[styles.datePickerText, !card2Data.dateOfBirth && styles.placeholderText]}>
              {card2Data.dateOfBirth ? formatDateForDisplay(card2Data.dateOfBirth) : 'Select date'}
            </Text>
            <Ionicons name="calendar" size={20} color="#6b46c1" />
          </TouchableOpacity>
          {age && <Text style={styles.ageText}>Age: {age} years</Text>}
          
          {showDatePicker2 && (
            <CustomDatePicker
              currentDate={card2Data.dateOfBirth ? new Date(card2Data.dateOfBirth) : new Date()}
              onDateSelect={handleDateChange2}
              onClose={() => setShowDatePicker2(false)}
            />
          )}
        </View>

        {/* Nationality */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Nationality</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowNationalityDropdown2(!showNationalityDropdown2)}
          >
            <Text style={[styles.dropdownText, !card2Data.nationality && styles.placeholderText]}>
              {card2Data.nationality || 'Select nationality'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#6b7280" />
          </TouchableOpacity>
          {showNationalityDropdown2 && (
            <View style={styles.dropdownMenu}>
              {nationalityOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.dropdownOption}
                  onPress={() => {
                    setCard2Data(prev => ({ ...prev, nationality: option }));
                    setShowNationalityDropdown2(false);
                  }}
                >
                  <Text style={styles.dropdownOptionText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Address */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Address</Text>
          <TextInput
            style={[styles.textInput, styles.multilineInput]}
            value={card2Data.address}
            onChangeText={(text) => setCard2Data(prev => ({ ...prev, address: text }))}
            placeholder="Enter your full address"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Phone Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Phone Number *</Text>
          <TextInput
            style={styles.textInput}
            value={card2Data.phoneNumber}
            onChangeText={(text) => setCard2Data(prev => ({ ...prev, phoneNumber: text }))}
            placeholder="Enter your phone number"
            placeholderTextColor="#9ca3af"
            keyboardType="phone-pad"
          />
        </View>

        {/* Skills */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Skills</Text>
          <View style={styles.skillInputContainer}>
            <TextInput
              style={styles.skillInput}
              value={skillInput2}
              onChangeText={(text) => {
                setSkillInput2(text);
                setShowSkillSuggestions2(text.length > 0);
              }}
              placeholder="Add a skill"
              placeholderTextColor="#9ca3af"
            />
            <TouchableOpacity
              style={styles.addSkillButton}
              onPress={() => addSkill2(skillInput2)}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {/* Skill Suggestions */}
          {showSkillSuggestions2 && filteredSkills2.length > 0 && (
            <View style={styles.skillSuggestions}>
              {filteredSkills2.slice(0, 5).map((skill) => (
                <TouchableOpacity
                  key={skill}
                  style={styles.skillSuggestion}
                  onPress={() => addSkill2(skill)}
                >
                  <Text style={styles.skillSuggestionText}>{skill}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Selected Skills */}
          <View style={styles.skillsContainer}>
            {card2Data.skills.map((skill, index) => (
              <View key={index} style={styles.skillTag}>
                <Text style={styles.skillTagText}>{skill}</Text>
                <TouchableOpacity
                  onPress={() => removeSkill2(skill)}
                  style={styles.removeSkillButton}
                >
                  <Ionicons name="close" size={14} color="#6b7280" />
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
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/my-profile')}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Resume</Text>
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
          >
          <View style={styles.formHeader}>
            <TouchableOpacity style={styles.closeButton} onPress={handleCloseForm}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.formTitle}>
              {editingCard === 'card1' ? 'Create/Edit ID Card 1' : 'Create/Edit ID Card 2'}
            </Text>
            <View style={styles.placeholder} />
          </View>

          {/* Single Card Form */}
          <View style={styles.cardsSection}>
            {editingCard === 'card1' ? renderIDCard1() : renderIDCard2()}
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
        // Card View
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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

          {/* Resume Upload Section */}
          <View style={styles.resumeSection}>
            <Text style={styles.sectionTitle}>Resume Upload</Text>
            <Text style={styles.sectionSubtitle}>
              Upload up to 2 PDF resumes. Set one as default.
            </Text>

            {/* Upload Button */}
            {resumeFiles.length < 2 ? (
              <TouchableOpacity 
                style={[styles.uploadButton, isSavingResume && styles.uploadButtonDisabled]} 
                onPress={pickResume}
                disabled={isSavingResume}
              >
                <Ionicons 
                  name={isSavingResume ? "hourglass-outline" : "cloud-upload-outline"} 
                  size={24} 
                  color={isSavingResume ? "#9ca3af" : "#6b46c1"} 
                />
                <Text style={[styles.uploadButtonText, isSavingResume && styles.uploadButtonTextDisabled]}>
                  {isSavingResume ? 'Saving...' : 'Upload Resume (PDF)'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.uploadButton, { backgroundColor: '#f3f4f6', borderColor: '#d1d5db' }]}>
                <Ionicons name="cloud-upload-outline" size={24} color="#9ca3af" />
                <Text style={[styles.uploadButtonText, { color: '#9ca3af' }]}>
                  Maximum 2 resumes reached
                </Text>
              </View>
            )}
            
            {/* File Count Indicator */}
            <Text style={styles.fileCountText}>
              {resumeFiles.length}/2 resumes uploaded
            </Text>

            {/* Resume Files */}
            {resumeFiles.map((file) => (
              <View key={file.id} style={styles.resumeFile}>
                <View style={styles.resumeFileInfo}>
                  <Ionicons name="document-text" size={24} color="#6b46c1" />
                  <View style={styles.resumeFileDetails}>
                    <Text style={styles.resumeFileName}>{file.name}</Text>
                    {file.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Default</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.resumeFileActions}>
                  {!file.isDefault && (
                    <TouchableOpacity
                      style={styles.setDefaultButton}
                      onPress={() => setDefaultResume(file.id!)}
                    >
                      <Text style={styles.setDefaultText}>Set Default</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeResume(file.id!)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>


        </ScrollView>
      )}
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
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#B0AAD9',
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
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
    color: '#111827',
  },
  optionalTag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  optionalText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.2)',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  placeholderText: {
    color: '#9ca3af',
  },
  datePickerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
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
    color: '#111827',
  },
  ageText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
    marginTop: 4,
  },
  dropdownButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
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
    color: '#111827',
  },
  dropdownMenu: {
    backgroundColor: '#fff',
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
    borderBottomColor: '#f3f4f6',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#111827',
  },
  skillInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  skillInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.2)',
  },
  addSkillButton: {
    backgroundColor: '#6b46c1',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#6b46c1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  skillSuggestions: {
    backgroundColor: '#fff',
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
    borderBottomColor: '#f3f4f6',
  },
  skillSuggestionText: {
    fontSize: 14,
    color: '#111827',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  skillTag: {
    backgroundColor: '#6b46c1',
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
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
    color: '#111827',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  uploadButton: {
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#6b46c1',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b46c1',
  },
  uploadButtonDisabled: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
  },
  uploadButtonTextDisabled: {
    color: '#9ca3af',
  },
  resumeFile: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
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
    color: '#111827',
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
    backgroundColor: '#6b46c1',
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
    backgroundColor: '#6b46c1',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#6b46c1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  saveButtonTextDisabled: {
    color: '#9ca3af',
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
    backgroundColor: '#fff',
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
    color: '#111827',
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
    color: '#374151',
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
    backgroundColor: '#6b46c1',
  },
  datePickerOptionText: {
    fontSize: 16,
    color: '#374151',
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
    backgroundColor: '#6b46c1',
  },
  datePickerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
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
    color: '#111827',
  },
  fileCountText: {
    fontSize: 14,
    color: '#6b7280',
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
    backgroundColor: '#f3f4f6',
  },
  photoRemoveButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
}); 
