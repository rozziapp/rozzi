import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useCustomFonts } from '@/hooks/fonts';
import { router } from 'expo-router';
import { useBackHandler } from '@/hooks/useBackHandler';
import API from '@/utils/api';

// Job types that match Django backend
const jobTypes = ['Full-time', 'Part-time', 'One-time', 'Contract'];
const sectors = ['Local', 'Professional'];
const shiftTimings = ['Day', 'Night', 'Not mentioned'];
const experienceLevels = ['not mentioned', 'fresher', '0 to 2 years', '1 to 3 years', '3+ years', '5+ years'];

// Indian States and Cities Data
const indianStatesAndCities = {
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Anantapur', 'Kadapa', 'Tirupati', 'Kakinada', 'Rajahmundry'],
  'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat', 'Bomdila', 'Tawang', 'Ziro', 'Along', 'Tezu', 'Roing', 'Daporijo'],
  'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Tinsukia', 'Tezpur', 'Nagaon', 'Bongaigaon', 'Goalpara', 'Barpeta'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga', 'Arrah', 'Begusarai', 'Katihar', 'Chhapra'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Korba', 'Bilaspur', 'Durg', 'Rajnandgaon', 'Jagdalpur', 'Ambikapur', 'Chirmiri', 'Bhatapara'],
  'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda', 'Bicholim', 'Valpoi', 'Sanquelim', 'Curchorem', 'Cuncolim'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar', 'Anand', 'Bharuch', 'Valsad'],
  'Haryana': ['Gurgaon', 'Faridabad', 'Panipat', 'Yamunanagar', 'Rohtak', 'Hisar', 'Karnal', 'Sonipat', 'Ambala', 'Bhiwani'],
  'Himachal Pradesh': ['Shimla', 'Mandi', 'Solan', 'Kullu', 'Dharamshala', 'Chamba', 'Palampur', 'Una', 'Hamirpur', 'Bilaspur'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar', 'Hazaribagh', 'Giridih', 'Ramgarh', 'Medininagar', 'Chatra'],
  'Karnataka': ['Bangalore', 'Mysore', 'Hubli', 'Mangalore', 'Belgaum', 'Gulbarga', 'Davanagere', 'Bellary', 'Bijapur', 'Shimoga'],
  'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Alappuzha', 'Palakkad', 'Malappuram', 'Kannur', 'Kottayam'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam', 'Rewa'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad', 'Solapur', 'Kolhapur', 'Amravati', 'Nanded'],
  'Manipur': ['Imphal', 'Thoubal', 'Bishnupur', 'Churachandpur', 'Ukhrul', 'Senapati', 'Tamenglong', 'Chandel', 'Jiribam', 'Kakching'],
  'Meghalaya': ['Shillong', 'Tura', 'Jowai', 'Nongstoin', 'Williamnagar', 'Baghmara', 'Nongpoh', 'Resubelpara', 'Mairang', 'Khliehriat'],
  'Mizoram': ['Aizawl', 'Lunglei', 'Saiha', 'Champhai', 'Kolasib', 'Serchhip', 'Lawngtlai', 'Mamit', 'Saitual', 'Khawzawl'],
  'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung', 'Tuensang', 'Wokha', 'Zunheboto', 'Phek', 'Mon', 'Longleng', 'Kiphire'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Brahmapur', 'Sambalpur', 'Puri', 'Balasore', 'Bhadrak', 'Baripada', 'Jharsuguda'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Pathankot', 'Moga', 'Hoshiarpur', 'Batala', 'Muktsar'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur', 'Bhilwara', 'Alwar', 'Sri Ganganagar', 'Sikar'],
  'Sikkim': ['Gangtok', 'Namchi', 'Gyalshing', 'Mangan', 'Ravongla', 'Singtam', 'Rangpo', 'Jorethang', 'Pelling', 'Lachung'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Tiruchirappalli', 'Vellore', 'Erode', 'Tiruppur', 'Thoothukkudi', 'Dindigul'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Ramagundam', 'Khammam', 'Mahbubnagar', 'Nalgonda', 'Adilabad', 'Siddipet'],
  'Tripura': ['Agartala', 'Udaipur', 'Dharmanagar', 'Kailasahar', 'Belonia', 'Khowai', 'Teliamura', 'Ambassa', 'Sabroom', 'Kamalpur'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Prayagraj', 'Bareilly', 'Aligarh', 'Moradabad', 'Saharanpur'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur', 'Kashipur', 'Rishikesh', 'Kotdwara', 'Ramnagar', 'Pithoragarh'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman', 'Malda', 'Baharampur', 'Habra', 'Kharagpur']
};



// Interface for job post data
interface JobPostData {
  title: string;
  description: string;
  salary_min?: number | string;
  salary_max?: number | string;
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
}

export default function PostScreen() {
  const [fontsLoaded] = useCustomFonts();
  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'hire' | 'looking'>('hire');
  const [sector, setSector] = useState<'local' | 'professional'>('local');
  const [showSectorDropdown, setShowSectorDropdown] = useState(false);
  const [showShiftDropdown, setShowShiftDropdown] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showJobTypeDropdown, setShowJobTypeDropdown] = useState(false);
  const [stateSearchQuery, setStateSearchQuery] = useState('');
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [genderPreference, setGenderPreference] = useState<'any' | 'male' | 'female'>('any');
  const [experience, setExperience] = useState<string>('not mentioned');

  const [customFields, setCustomFields] = useState<{ id: number, question: string, answer: 'yes' | 'no' }[]>([]);
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldQuestion, setNewFieldQuestion] = useState('');
  const [newFieldAnswer, setNewFieldAnswer] = useState<'yes' | 'no'>('yes');

  // Function to close all dropdowns
  const closeAllDropdowns = () => {
    setShowSectorDropdown(false);
    setShowShiftDropdown(false);
    setShowStateDropdown(false);
    setShowCityDropdown(false);
    setShowJobTypeDropdown(false);
  };

  // Close dropdowns when component unmounts or when switching tabs
  useEffect(() => {
    return () => {
      closeAllDropdowns();
    };
  }, [activeTab]);

  // Clear custom fields when switching tabs (they're only for hire posts)
  useEffect(() => {
    if (activeTab === 'looking') {
      setCustomFields([]);
      setShowAddField(false);
      setNewFieldQuestion('');
    } else if (activeTab === 'hire') {
      setCustomFields([]);
      setShowAddField(false);
      setNewFieldQuestion('');
    }
  }, [activeTab]);

  // Clear custom fields when component mounts to ensure clean state
  useEffect(() => {
    setCustomFields([]);
    setShowAddField(false);
    setNewFieldQuestion('');
  }, []);

  // Handle back button - navigate to home
  useBackHandler({
    targetRoute: '/(tabs)'
  });

  // Form data
  const [formData, setFormData] = useState<JobPostData>({
    title: '',
    description: '',
    salary_min: undefined,
    salary_max: undefined,
    location: '',
    post_type: 'hire',
    job_type: 'Full-time',
    sector: 'Local',
    experience_level: 'not mentioned',
    shift_timing: 'Not mentioned',
    state: '',
    city: '',
    address: '',
    pincode: '',
    skills: [],
    custom_fields: []
  });

  if (!fontsLoaded) {
    return null;
  }

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };



  const addCustomField = () => {
    if (newFieldQuestion.trim()) {
      setCustomFields(prev => [...prev, {
        id: Date.now(),
        question: newFieldQuestion.trim(),
        answer: newFieldAnswer
      }]);
      setNewFieldQuestion('');
      setNewFieldAnswer('yes');
      setShowAddField(false);
    }
  };

  const removeCustomField = (id: number) => {
    setCustomFields(prev => prev.filter(field => field.id !== id));
  };



  const filteredStates = Object.keys(indianStatesAndCities).filter(state =>
    state.toLowerCase().includes(stateSearchQuery.toLowerCase())
  );

  const filteredCities = formData.state && indianStatesAndCities[formData.state as keyof typeof indianStatesAndCities]
    ? indianStatesAndCities[formData.state as keyof typeof indianStatesAndCities].filter(city =>
      city.toLowerCase().includes(citySearchQuery.toLowerCase())
    )
    : [];

  const handlePost = async () => {
    // Validate required fields
    const requiredFields = ['title', 'state', 'city', 'address', 'pincode', 'description', 'job_type'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);

    if (missingFields.length > 0) {
      Alert.alert('Missing Fields', 'Please fill in all required fields marked with *');
      return;
    }

    try {
      setLoading(true);

      // Check if user is authenticated
      const { authAPI } = await import('@/utils/api');
      const isAuthenticated = await authAPI.isAuthenticated();

      if (!isAuthenticated) {
        Alert.alert('Authentication Required', 'Please login to post jobs.', [
          {
            text: 'Login',
            onPress: () => router.push('/login'),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]);
        return;
      }

      // Debug custom fields before sending
      console.log('=== JOB POST DEBUG ===');
      console.log('customFields state:', customFields);
      console.log('customFields length:', customFields.length);
      console.log('formData.skills:', formData.skills);

      // Prepare job post data for Django backend
      const jobPostData: JobPostData = {
        title: formData.title,
        description: formData.description,
        salary_min: formData.salary_min ? (typeof formData.salary_min === 'string' ? parseInt(formData.salary_min) : formData.salary_min) : undefined,
        salary_max: formData.salary_max ? (typeof formData.salary_max === 'string' ? parseInt(formData.salary_max) : formData.salary_max) : undefined,
        location: `${formData.city}, ${formData.state}`,
        post_type: activeTab,
        job_type: formData.job_type,
        sector: formData.sector,
        experience_level: formData.experience_level,
        shift_timing: formData.shift_timing,
        state: formData.state,
        city: formData.city,
        address: formData.address,
        pincode: formData.pincode,
        skills: formData.skills || [],
        custom_fields: activeTab === 'hire' ? customFields.map(field => ({
          question: field.question,
          answer: field.answer
        })) : []
      };

      console.log('Final jobPostData:', jobPostData);
      console.log('Custom fields in payload:', jobPostData.custom_fields);
      console.log('=====================');

      // Send job post to Django backend
      const response = await API.post('/jobs/', jobPostData);

      // Clear all form data after successful post creation
      setFormData({
        title: '',
        description: '',
        salary_min: undefined,
        salary_max: undefined,
        location: '',
        post_type: 'hire',
        job_type: 'Full-time',
        sector: 'Local',
        experience_level: 'not mentioned',
        shift_timing: 'Not mentioned',
        state: '',
        city: '',
        address: '',
        pincode: '',
        skills: [],
        custom_fields: []
      });

      // Clear custom fields and related state
      setCustomFields([]);
      setShowAddField(false);
      setNewFieldQuestion('');
      setNewFieldAnswer('yes');

      // Reset other form states
      setActiveTab('hire');
      setSector('local');
      setGenderPreference('any');
      setExperience('not mentioned');

      // Reset all dropdown states
      setShowSectorDropdown(false);
      setShowShiftDropdown(false);
      setShowStateDropdown(false);
      setShowCityDropdown(false);
      setShowJobTypeDropdown(false);

      // Reset search queries
      setStateSearchQuery('');
      setCitySearchQuery('');

      Alert.alert('Success', 'Your job post has been created successfully!');

      // Navigate to home screen - it will automatically refresh to show the new post
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Error creating job post:', error);
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.detail ||
        'Failed to create job post. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderHireForm = () => (
    <ScrollView
      style={styles.formContainer}
      showsVerticalScrollIndicator={true}
      nestedScrollEnabled={true}
      keyboardShouldPersistTaps="handled"
    >
      {/* Job Title */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Title*</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter job title"
          value={formData.title}
          onChangeText={(text) => updateFormData('title', text)}
          onFocus={closeAllDropdowns}
        />
      </View>

      {/* Sector & Job Type in same line */}
      <View style={styles.rowContainer}>
        <View style={[styles.fieldContainer, { flex: 2, marginRight: 8 }]}>
          <Text style={styles.fieldLabel}>Sector*</Text>
          <View style={styles.sectorToggleContainer}>
            <TouchableOpacity
              style={[
                styles.sectorToggleButton,
                { flex: 0.8 },
                formData.sector === 'Local' && styles.activeSectorToggleButton
              ]}
              onPress={() => updateFormData('sector', 'Local')}
            >
              <Text style={[
                styles.sectorToggleText,
                formData.sector === 'Local' && styles.activeSectorToggleText
              ]}>
                Local
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sectorToggleButton,
                { flex: 1.2 },
                formData.sector === 'Professional' && styles.activeSectorToggleButton
              ]}
              onPress={() => updateFormData('sector', 'Professional')}
            >
              <Text style={[
                styles.sectorToggleText,
                formData.sector === 'Professional' && styles.activeSectorToggleText
              ]}>
                Professional
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={[styles.fieldContainer, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.fieldLabel}>Job Type*</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => {
              closeAllDropdowns();
              setShowJobTypeDropdown(!showJobTypeDropdown);
            }}
          >
            <Text style={styles.dropdownText}>{formData.job_type}</Text>
            <Ionicons name="chevron-down" size={16} color="#fff" />
          </TouchableOpacity>
          {showJobTypeDropdown && (
            <View style={styles.dropdownMenu}>
              {jobTypes.map((jobType) => (
                <TouchableOpacity
                  key={jobType}
                  style={styles.dropdownItem}
                  onPress={() => {
                    updateFormData('job_type', jobType);
                    setShowJobTypeDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{jobType}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* State & City */}
      <View style={styles.rowContainer}>
        <View style={[styles.fieldContainer, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.fieldLabel}>State*</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => {
              closeAllDropdowns();
              setShowStateDropdown(!showStateDropdown);
            }}
          >
            <Text style={styles.dropdownText}>
              {formData.state || "Select State"}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#fff" />
          </TouchableOpacity>
          {showStateDropdown && (
            <View style={styles.dropdownMenu}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search states..."
                value={stateSearchQuery}
                onChangeText={setStateSearchQuery}
              />
              <ScrollView
                style={{ maxHeight: 150 }}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
              >
                {filteredStates.map((state) => (
                  <TouchableOpacity
                    key={state}
                    style={styles.dropdownItem}
                    onPress={() => {
                      updateFormData('state', state);
                      updateFormData('city', '');
                      setShowStateDropdown(false);
                      setStateSearchQuery('');
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{state}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
        <View style={[styles.fieldContainer, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.fieldLabel}>City*</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => {
              closeAllDropdowns();
              formData.state && setShowCityDropdown(!showCityDropdown);
            }}
            disabled={!formData.state}
          >
            <Text style={[styles.dropdownText, !formData.state && { opacity: 0.5 }]}>
              {formData.city || (formData.state ? "Select City" : "Select State First")}
            </Text>
            <Ionicons name="chevron-down" size={16} color={formData.state ? "#fff" : "rgba(255,255,255,0.5)"} />
          </TouchableOpacity>
          {showCityDropdown && formData.state && (
            <View style={styles.dropdownMenu}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search cities..."
                value={citySearchQuery}
                onChangeText={setCitySearchQuery}
              />
              <ScrollView
                style={{ maxHeight: 150 }}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
              >
                {filteredCities.map((city) => (
                  <TouchableOpacity
                    key={city}
                    style={styles.dropdownItem}
                    onPress={() => {
                      updateFormData('city', city);
                      setShowCityDropdown(false);
                      setCitySearchQuery('');
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{city}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </View>

      {/* Address */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Address*</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter address"
          value={formData.address}
          onChangeText={(text) => updateFormData('address', text)}
          onFocus={closeAllDropdowns}
        />
      </View>

      {/* Pincode & Shift Timing */}
      <View style={styles.rowContainer}>
        <View style={[styles.fieldContainer, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.fieldLabel}>Pin code*</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter pincode"
            keyboardType="numeric"
            value={formData.pincode}
            onChangeText={(text) => updateFormData('pincode', text)}
            onFocus={closeAllDropdowns}
          />
        </View>
        <View style={[styles.fieldContainer, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.fieldLabel}>Shift timing</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => {
              closeAllDropdowns();
              setShowShiftDropdown(!showShiftDropdown);
            }}
          >
            <Text style={styles.dropdownText}>{formData.shift_timing}</Text>
            <Ionicons name="chevron-down" size={16} color="#fff" />
          </TouchableOpacity>
          {showShiftDropdown && (
            <View style={styles.dropdownMenu}>
              {shiftTimings.map((timing) => (
                <TouchableOpacity
                  key={timing}
                  style={styles.dropdownItem}
                  onPress={() => {
                    updateFormData('shift_timing', timing);
                    setShowShiftDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{timing}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Salary Range */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Salary range</Text>
        <View style={styles.salaryContainer}>
          <TextInput
            style={[styles.textInput, { flex: 1, marginRight: 8 }]}
            placeholder="Min"
            keyboardType="numeric"
            value={formData.salary_min ? String(formData.salary_min) : ''}
            onChangeText={(text) => updateFormData('salary_min', text)}
            onFocus={closeAllDropdowns}
          />
          <Text style={styles.toText}>to</Text>
          <TextInput
            style={[styles.textInput, { flex: 1, marginLeft: 8 }]}
            placeholder="Max"
            keyboardType="numeric"
            value={formData.salary_max ? String(formData.salary_max) : ''}
            onChangeText={(text) => updateFormData('salary_max', text)}
            onFocus={closeAllDropdowns}
          />
        </View>
      </View>

      {/* Gender Preference */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Gender preference</Text>
        <View style={styles.radioContainer}>
          {[
            { value: 'any', label: 'Any' },
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' }
          ].map((option) => (
            <TouchableOpacity
              key={option.value}
              style={styles.radioButton}
              onPress={() => setGenderPreference(option.value as any)}
            >
              <View style={styles.radioCircle}>
                {genderPreference === option.value && (
                  <View style={styles.radioInner} />
                )}
              </View>
              <Text style={styles.radioLabel}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Experience */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Experience</Text>
        <View style={styles.experienceContainer}>
          {experienceLevels.map((exp) => (
            <TouchableOpacity
              key={exp}
              style={styles.radioButton}
              onPress={() => {
                setExperience(exp);
                updateFormData('experience_level', exp);
              }}
            >
              <View style={styles.radioCircle}>
                {experience === exp && (
                  <View style={styles.radioInner} />
                )}
              </View>
              <Text style={styles.radioLabel}>{exp}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Description */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Job description</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          placeholder="about job and preference...."
          multiline
          numberOfLines={4}
          value={formData.description}
          onChangeText={(text) => updateFormData('description', text)}
          onFocus={closeAllDropdowns}
        />
      </View>

      {/* Add New Field */}
      <TouchableOpacity
        style={styles.addFieldButton}
        onPress={() => setShowAddField(!showAddField)}
      >
        <Ionicons name="add" size={20} color="#B0AAD9" />
        <Text style={styles.addFieldText}>add new field</Text>
      </TouchableOpacity>

      {showAddField && (
        <View style={styles.customFieldContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Enter your question for applicants..."
            value={newFieldQuestion}
            onChangeText={setNewFieldQuestion}
            multiline
            numberOfLines={3}
          />
          <View style={styles.customFieldActions}>
            <TouchableOpacity
              style={[styles.customFieldButton, styles.cancelButton]}
              onPress={() => {
                setShowAddField(false);
                setNewFieldQuestion('');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.customFieldButton, styles.addButton]}
              onPress={addCustomField}
            >
              <Text style={styles.addButtonText}>Add Question</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Custom Fields Display */}
      {customFields.map((field) => (
        <View key={field.id} style={styles.customFieldDisplay}>
          <View style={styles.customFieldHeader}>
            <Text style={styles.customFieldQuestion}>{field.question}</Text>
            <TouchableOpacity onPress={() => removeCustomField(field.id)}>
              <Ionicons name="close" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
          <Text style={styles.customFieldType}>Question for applicants</Text>
        </View>
      ))}

      {/* Post Button - At the end of form */}
      <View style={styles.postButtonContainer}>
        <TouchableOpacity style={styles.postButton} onPress={handlePost}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.postButtonText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderLookingForm = () => (
    <ScrollView
      style={styles.formContainer}
      showsVerticalScrollIndicator={true}
      nestedScrollEnabled={true}
      keyboardShouldPersistTaps="handled"
    >
      {/* Job Title */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Title*</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter job title"
          value={formData.title}
          onChangeText={(text) => updateFormData('title', text)}
          onFocus={closeAllDropdowns}
        />
      </View>

      {/* Sector & Job Type in same line */}
      <View style={styles.rowContainer}>
        <View style={[styles.fieldContainer, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.fieldLabel}>Sector</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => {
              closeAllDropdowns();
              setShowSectorDropdown(!showSectorDropdown);
            }}
          >
            <Text style={styles.dropdownText}>{formData.sector}</Text>
            <Ionicons name="chevron-down" size={16} color="#fff" />
          </TouchableOpacity>
          {showSectorDropdown && (
            <View style={styles.dropdownMenu}>
              {sectors.map((sector) => (
                <TouchableOpacity
                  key={sector}
                  style={styles.dropdownItem}
                  onPress={() => {
                    updateFormData('sector', sector);
                    setShowSectorDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{sector}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        <View style={[styles.fieldContainer, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.fieldLabel}>Job Type</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => {
              closeAllDropdowns();
              setShowJobTypeDropdown(!showJobTypeDropdown);
            }}
          >
            <Text style={styles.dropdownText}>{formData.job_type}</Text>
            <Ionicons name="chevron-down" size={16} color="#fff" />
          </TouchableOpacity>
          {showJobTypeDropdown && (
            <View style={styles.dropdownMenu}>
              {jobTypes.map((jobType) => (
                <TouchableOpacity
                  key={jobType}
                  style={styles.dropdownItem}
                  onPress={() => {
                    updateFormData('job_type', jobType);
                    setShowJobTypeDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{jobType}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* State & City */}
      <View style={styles.rowContainer}>
        <View style={[styles.fieldContainer, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.fieldLabel}>State*</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => {
              closeAllDropdowns();
              setShowStateDropdown(!showStateDropdown);
            }}
          >
            <Text style={styles.dropdownText}>
              {formData.state || "Select State"}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#fff" />
          </TouchableOpacity>
          {showStateDropdown && (
            <View style={styles.dropdownMenu}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search states..."
                value={stateSearchQuery}
                onChangeText={setStateSearchQuery}
              />
              <ScrollView
                style={{ maxHeight: 150 }}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
              >
                {filteredStates.map((state) => (
                  <TouchableOpacity
                    key={state}
                    style={styles.dropdownItem}
                    onPress={() => {
                      updateFormData('state', state);
                      updateFormData('city', '');
                      setShowStateDropdown(false);
                      setStateSearchQuery('');
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{state}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
        <View style={[styles.fieldContainer, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.fieldLabel}>City*</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => {
              closeAllDropdowns();
              formData.state && setShowCityDropdown(!showCityDropdown);
            }}
            disabled={!formData.state}
          >
            <Text style={[styles.dropdownText, !formData.state && { opacity: 0.5 }]}>
              {formData.city || (formData.state ? "Select City" : "Select State First")}
            </Text>
            <Ionicons name="chevron-down" size={16} color={formData.state ? "#fff" : "rgba(255,255,255,0.5)"} />
          </TouchableOpacity>
          {showCityDropdown && formData.state && (
            <View style={styles.dropdownMenu}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search cities..."
                value={citySearchQuery}
                onChangeText={setCitySearchQuery}
              />
              <ScrollView
                style={{ maxHeight: 150 }}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
              >
                {filteredCities.map((city) => (
                  <TouchableOpacity
                    key={city}
                    style={styles.dropdownItem}
                    onPress={() => {
                      updateFormData('city', city);
                      setShowCityDropdown(false);
                      setCitySearchQuery('');
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{city}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </View>

      {/* Address */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Address*</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter address"
          value={formData.address}
          onChangeText={(text) => updateFormData('address', text)}
          onFocus={closeAllDropdowns}
        />
      </View>

      {/* Pincode */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Pin code*</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter pincode"
          keyboardType="numeric"
          value={formData.pincode}
          onChangeText={(text) => updateFormData('pincode', text)}
          onFocus={closeAllDropdowns}
        />
      </View>

      {/* Salary Range */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Salary range</Text>
        <View style={styles.salaryContainer}>
          <TextInput
            style={[styles.textInput, { flex: 1, marginRight: 8 }]}
            placeholder="Min"
            keyboardType="numeric"
            value={formData.salary_min ? String(formData.salary_min) : ''}
            onChangeText={(text) => updateFormData('salary_min', text)}
            onFocus={closeAllDropdowns}
          />
          <Text style={styles.toText}>to</Text>
          <TextInput
            style={[styles.textInput, { flex: 1, marginLeft: 8 }]}
            placeholder="Max"
            keyboardType="numeric"
            value={formData.salary_max ? String(formData.salary_max) : ''}
            onChangeText={(text) => updateFormData('salary_max', text)}
            onFocus={closeAllDropdowns}
          />
        </View>
      </View>

      {/* Experience */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Experience</Text>
        <View style={styles.experienceContainer}>
          {experienceLevels.map((exp) => (
            <TouchableOpacity
              key={exp}
              style={styles.radioButton}
              onPress={() => {
                setExperience(exp);
                updateFormData('experience_level', exp);
              }}
            >
              <View style={styles.radioCircle}>
                {experience === exp && (
                  <View style={styles.radioInner} />
                )}
              </View>
              <Text style={styles.radioLabel}>{exp}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Description */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Description*</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          placeholder="about job and preference...."
          multiline
          numberOfLines={4}
          value={formData.description}
          onChangeText={(text) => updateFormData('description', text)}
          onFocus={closeAllDropdowns}
        />
      </View>

      {/* Post Button - At the end of form */}
      <View style={styles.postButtonContainer}>
        <TouchableOpacity style={styles.postButton} onPress={handlePost}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.postButtonText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              // Navigate to home page instead of back
              router.replace('/(tabs)');
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Toggle Buttons - Moved down */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              activeTab === 'hire' && styles.activeToggleButton
            ]}
            onPress={() => {
              closeAllDropdowns();
              setActiveTab('hire');
            }}
          >
            {activeTab === 'hire' && (
              <Ionicons
                name="checkmark"
                size={16}
                color="#B0AAD9"
              />
            )}
            <Text style={[
              styles.toggleText,
              activeTab === 'hire' && styles.activeToggleText
            ]}>
              Hire
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              activeTab === 'looking' && styles.activeToggleButton
            ]}
            onPress={() => {
              closeAllDropdowns();
              setActiveTab('looking');
            }}
          >
            {activeTab === 'looking' && (
              <Ionicons
                name="checkmark"
                size={16}
                color="#B0AAD9"
              />
            )}
            <Text style={[
              styles.toggleText,
              activeTab === 'looking' && styles.activeToggleText
            ]}>
              Looking
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Content */}
        {activeTab === 'hire' ? renderHireForm() : renderLookingForm()}
      </KeyboardAvoidingView>



    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#B0AAD9',
    height: '100%',
  },
  keyboardContainer: {
    flex: 1,
    height: '100%',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 16,
    backgroundColor: '#B0AAD9',
  },
  backButton: {
    padding: 4,
    marginRight: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 21,
    gap: 4,
  },
  activeToggleButton: {
    backgroundColor: '#fff',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  activeToggleText: {
    color: '#B0AAD9',
  },
  sectorToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 2,
  },
  sectorToggleButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  activeSectorToggleButton: {
    backgroundColor: '#fff',
  },
  sectorToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  activeSectorToggleText: {
    color: '#B0AAD9',
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  fieldContainer: {
    marginBottom: 20,
    position: 'relative',
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dropdownButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    fontSize: 16,
    color: '#fff',
  },
  dropdownMenu: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 1000,
    maxHeight: 200,
    overflow: 'hidden',
    elevation: 10,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#fff',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#374151',
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#374151',
    margin: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  rowContainer: {
    flexDirection: 'row',
  },
  salaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toText: {
    fontSize: 16,
    color: '#000',
    marginHorizontal: 8,
  },
  radioContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  experienceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8b5cf6',
  },
  radioLabel: {
    fontSize: 14,
    color: '#374151',
  },

  addFieldButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 20,
    gap: 8,
  },
  addFieldText: {
    fontSize: 16,
    color: '#B0AAD9',
    fontWeight: '600',
  },
  customFieldContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  customFieldActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  customFieldButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  addButton: {
    backgroundColor: '#B0AAD9',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  addButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  customFieldDisplay: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  customFieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customFieldQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  customFieldAnswer: {
    fontSize: 14,
    color: '#6b7280',
  },
  customFieldType: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  postButtonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  postButton: {
    backgroundColor: '#374151',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  postButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },


});
