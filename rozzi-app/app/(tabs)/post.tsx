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
  Modal,
} from 'react-native';
import { ScrollView as GestureScrollView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

import { useCustomFonts } from '@/hooks/fonts';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useBackHandler } from '@/hooks/useBackHandler';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import API from '@/utils/api';

// Job types that match Django backend
const jobTypes = ['Full-time', 'Part-time', 'One-time', 'Contract'];
const sectors = ['Local', 'Professional'];
const shiftTimings = ['Day', 'Night', 'Not mentioned'];
const experienceLevels = ['not mentioned', 'fresher', '0 to 2 years', '1 to 3 years', '3+ years', '5+ years'];

// Indian States, Union Territories and Cities Data
const indianStatesAndCities: Record<string, string[]> = {
  // ── 28 States ──
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Anantapur', 'Kadapa', 'Tirupati', 'Kakinada', 'Rajahmundry', 'Eluru', 'Ongole', 'Srikakulam', 'Vizianagaram', 'Tenali', 'Proddatur', 'Chittoor', 'Hindupur', 'Machilipatnam', 'Adoni'],
  'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat', 'Bomdila', 'Tawang', 'Ziro', 'Along', 'Tezu', 'Roing', 'Daporijo', 'Namsai', 'Changlang', 'Khonsa', 'Yingkiong', 'Seppa'],
  'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Tinsukia', 'Tezpur', 'Nagaon', 'Bongaigaon', 'Goalpara', 'Barpeta', 'Karimganj', 'Sivasagar', 'Dhubri', 'Lakhimpur', 'Nalbari', 'Haflong', 'Diphu', 'Golaghat', 'Hailakandi', 'Kokrajhar'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga', 'Arrah', 'Begusarai', 'Katihar', 'Chhapra', 'Munger', 'Bihar Sharif', 'Sasaram', 'Hajipur', 'Dehri', 'Siwan', 'Motihari', 'Samastipur', 'Nawada', 'Bettiah', 'Jamalpur', 'Buxar', 'Jehanabad', 'Aurangabad'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Korba', 'Bilaspur', 'Durg', 'Rajnandgaon', 'Jagdalpur', 'Ambikapur', 'Chirmiri', 'Bhatapara', 'Raigarh', 'Dhamtari', 'Mahasamund', 'Kawardha', 'Kanker', 'Dalli-Rajhara', 'Manendragarh', 'Dongargarh'],
  'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda', 'Bicholim', 'Valpoi', 'Sanquelim', 'Curchorem', 'Cuncolim', 'Canacona', 'Quepem', 'Sanguem', 'Pernem'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar', 'Anand', 'Bharuch', 'Valsad', 'Junagadh', 'Morbi', 'Mehsana', 'Navsari', 'Surendranagar', 'Porbandar', 'Godhra', 'Palanpur', 'Nadiad', 'Veraval', 'Gandhidham', 'Bhuj', 'Dahod', 'Amreli', 'Vapi'],
  'Haryana': ['Gurgaon', 'Faridabad', 'Panipat', 'Yamunanagar', 'Rohtak', 'Hisar', 'Karnal', 'Sonipat', 'Ambala', 'Bhiwani', 'Sirsa', 'Bahadurgarh', 'Jind', 'Thanesar', 'Kaithal', 'Palwal', 'Rewari', 'Panchkula', 'Manesar', 'Dharuhera'],
  'Himachal Pradesh': ['Shimla', 'Mandi', 'Solan', 'Kullu', 'Dharamshala', 'Chamba', 'Palampur', 'Una', 'Hamirpur', 'Bilaspur', 'Nahan', 'Manali', 'Kangra', 'Baddi', 'Sundernagar', 'Parwanoo'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar', 'Hazaribagh', 'Giridih', 'Ramgarh', 'Medininagar', 'Chatra', 'Phusro', 'Dumka', 'Chaibasa', 'Adityapur', 'Gumla', 'Lohardaga', 'Sahebganj', 'Godda'],
  'Karnataka': ['Bangalore', 'Mysore', 'Hubli', 'Mangalore', 'Belgaum', 'Gulbarga', 'Davanagere', 'Bellary', 'Bijapur', 'Shimoga', 'Tumkur', 'Raichur', 'Bidar', 'Hospet', 'Gadag', 'Udupi', 'Robertson Pet', 'Hassan', 'Chitradurga', 'Mandya', 'Chikmagalur', 'Gangavathi', 'Bagalkot', 'Ranebennur'],
  'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Alappuzha', 'Palakkad', 'Malappuram', 'Kannur', 'Kottayam', 'Kasaragod', 'Pathanamthitta', 'Idukki', 'Wayanad', 'Perinthalmanna', 'Mattannur', 'Thalassery', 'Guruvayur', 'Kayamkulam', 'Thodupuzha'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam', 'Rewa', 'Katni', 'Singrauli', 'Burhanpur', 'Khandwa', 'Morena', 'Bhind', 'Chhindwara', 'Shivpuri', 'Vidisha', 'Damoh', 'Mandsaur', 'Khargone', 'Neemuch', 'Pithampur', 'Hoshangabad'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad', 'Solapur', 'Kolhapur', 'Amravati', 'Nanded', 'Pimpri-Chinchwad', 'Navi Mumbai', 'Vasai-Virar', 'Malegaon', 'Sangli', 'Akola', 'Latur', 'Dhule', 'Ahmednagar', 'Chandrapur', 'Jalgaon', 'Ichalkaranji', 'Parbhani', 'Satara', 'Ratnagiri', 'Kalyan-Dombivli', 'Bhiwandi', 'Panvel'],
  'Manipur': ['Imphal', 'Thoubal', 'Bishnupur', 'Churachandpur', 'Ukhrul', 'Senapati', 'Tamenglong', 'Chandel', 'Jiribam', 'Kakching', 'Moirang', 'Lilong', 'Mayang Imphal', 'Wangjing', 'Moreh'],
  'Meghalaya': ['Shillong', 'Tura', 'Jowai', 'Nongstoin', 'Williamnagar', 'Baghmara', 'Nongpoh', 'Resubelpara', 'Mairang', 'Khliehriat', 'Cherrapunji', 'Mawlai', 'Mawkyrwat'],
  'Mizoram': ['Aizawl', 'Lunglei', 'Saiha', 'Champhai', 'Kolasib', 'Serchhip', 'Lawngtlai', 'Mamit', 'Saitual', 'Khawzawl', 'Hnahthial', 'Bairabi'],
  'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung', 'Tuensang', 'Wokha', 'Zunheboto', 'Phek', 'Mon', 'Longleng', 'Kiphire', 'Peren', 'Chumukedima', 'Pfutsero'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Brahmapur', 'Sambalpur', 'Puri', 'Balasore', 'Bhadrak', 'Baripada', 'Jharsuguda', 'Jeypore', 'Angul', 'Bargarh', 'Paradip', 'Bhawanipatna', 'Kendrapara', 'Sunabeda', 'Rayagada', 'Jajpur', 'Dhenkanal'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Pathankot', 'Moga', 'Hoshiarpur', 'Batala', 'Muktsar', 'Mohali', 'Phagwara', 'Abohar', 'Malerkotla', 'Khanna', 'Sangrur', 'Barnala', 'Firozpur', 'Kapurthala', 'Rajpura', 'Zirakpur', 'Dera Bassi'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur', 'Bhilwara', 'Alwar', 'Sri Ganganagar', 'Sikar', 'Bharatpur', 'Pali', 'Tonk', 'Kishangarh', 'Beawar', 'Hanumangarh', 'Dhaulpur', 'Gangapur City', 'Sawai Madhopur', 'Barmer', 'Churu', 'Jhunjhunu', 'Chittorgarh', 'Nagaur', 'Banswara'],
  'Sikkim': ['Gangtok', 'Namchi', 'Gyalshing', 'Mangan', 'Ravongla', 'Singtam', 'Rangpo', 'Jorethang', 'Pelling', 'Lachung', 'Lachen', 'Pakyong', 'Soreng'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Tiruchirappalli', 'Vellore', 'Erode', 'Tiruppur', 'Thoothukkudi', 'Dindigul', 'Thanjavur', 'Tirunelveli', 'Nagercoil', 'Kanchipuram', 'Hosur', 'Ambur', 'Cuddalore', 'Kumbakonam', 'Karur', 'Sivakasi', 'Namakkal', 'Pollachi', 'Rajapalayam', 'Ooty', 'Avadi', 'Tambaram'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Ramagundam', 'Khammam', 'Mahbubnagar', 'Nalgonda', 'Adilabad', 'Siddipet', 'Suryapet', 'Miryalaguda', 'Jagtial', 'Mancherial', 'Nirmal', 'Kamareddy', 'Kothagudem', 'Bodhan', 'Sangareddy', 'Secunderabad'],
  'Tripura': ['Agartala', 'Udaipur', 'Dharmanagar', 'Kailasahar', 'Belonia', 'Khowai', 'Teliamura', 'Ambassa', 'Sabroom', 'Kamalpur', 'Sonamura', 'Amarpur', 'Bishalgarh'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Prayagraj', 'Bareilly', 'Aligarh', 'Moradabad', 'Saharanpur', 'Noida', 'Meerut', 'Gorakhpur', 'Jhansi', 'Mathura', 'Firozabad', 'Ayodhya', 'Sultanpur', 'Muzaffarnagar', 'Shahjahanpur', 'Rampur', 'Etawah', 'Mirzapur', 'Bijnor', 'Bulandshahr', 'Hapur', 'Unnao', 'Lakhimpur Kheri', 'Jaunpur', 'Greater Noida'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur', 'Kashipur', 'Rishikesh', 'Kotdwara', 'Ramnagar', 'Pithoragarh', 'Mussoorie', 'Almora', 'Nainital', 'Srinagar', 'Pauri', 'Tehri', 'Champawat', 'Bageshwar', 'Uttarkashi', 'Jaspur', 'Sitarganj'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman', 'Malda', 'Baharampur', 'Habra', 'Kharagpur', 'Haldia', 'Barasat', 'Raiganj', 'Krishnanagar', 'Balurghat', 'Bankura', 'Jalpaiguri', 'Cooch Behar', 'Darjeeling', 'Alipurduar', 'Purulia', 'Contai', 'Basirhat', 'Kalyani', 'Barrackpore', 'Serampore', 'Bally', 'Naihati'],

  // ── 8 Union Territories ──
  'Andaman and Nicobar Islands': ['Port Blair', 'Diglipur', 'Rangat', 'Mayabunder', 'Bamboo Flat', 'Prothrapur', 'Garacharma', 'Ferrargunj', 'Car Nicobar', 'Hut Bay'],
  'Chandigarh': ['Chandigarh'],
  'Dadra and Nagar Haveli and Daman and Diu': ['Silvassa', 'Daman', 'Diu', 'Amli', 'Naroli', 'Vapi (nearby)'],
  'Delhi': ['New Delhi', 'Dwarka', 'Rohini', 'Saket', 'Lajpat Nagar', 'Karol Bagh', 'Connaught Place', 'Nehru Place', 'Janakpuri', 'Pitampura', 'Vasant Kunj', 'Shahdara', 'Preet Vihar', 'Mayur Vihar', 'Okhla', 'Narela', 'Mundka', 'Najafgarh', 'Mehrauli', 'Laxmi Nagar'],
  'Jammu and Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Sopore', 'Kathua', 'Udhampur', 'Pulwama', 'Kupwara', 'Rajouri', 'Poonch', 'Kulgam', 'Shopian', 'Bandipore', 'Ganderbal', 'Samba', 'Doda', 'Kishtwar', 'Ramban', 'Reasi'],
  'Ladakh': ['Leh', 'Kargil', 'Diskit', 'Padum', 'Nyoma', 'Hanle', 'Turtuk'],
  'Lakshadweep': ['Kavaratti', 'Agatti', 'Amini', 'Andrott', 'Minicoy', 'Kalpeni', 'Kadmat', 'Kiltan', 'Chetlat', 'Bitra'],
  'Puducherry': ['Puducherry', 'Karaikal', 'Mahe', 'Yanam', 'Ozhukarai', 'Villianur'],
};



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
  gender_preference?: 'any' | 'male' | 'female';
  requires_resume_url?: boolean;
  custom_fields?: {
    question: string;
    answer: 'yes' | 'no';
  }[];
}

// ── Reusable tiny components (Declared outside parent component to prevent unmounting and keyboard dismissal on state updates) ──

const RequiredDot = () => {
  const { colors, colorScheme } = useAppTheme();
  const s = React.useMemo(() => getStyles(colors, colorScheme), [colors, colorScheme]);
  return <View style={s.requiredDot} />;
};

const SectionCard = ({ children, style, zIndex }: { children: React.ReactNode; style?: any; zIndex?: number }) => {
  const { colors, colorScheme } = useAppTheme();
  const s = React.useMemo(() => getStyles(colors, colorScheme), [colors, colorScheme]);
  return <View style={[s.card, style, zIndex != null && { zIndex }]}>{children}</View>;
};

const SectionHeader = ({ icon, label }: { icon: string; label: string }) => {
  const { colors, colorScheme } = useAppTheme();
  const s = React.useMemo(() => getStyles(colors, colorScheme), [colors, colorScheme]);
  return (
    <View style={s.sectionHeader}>
      <Ionicons name={icon as any} size={16} color={colors.primary} />
      <Text style={s.sectionHeaderText}>{label}</Text>
    </View>
  );
};

const FieldLabel = ({ label, required }: { label: string; required?: boolean }) => {
  const { colors, colorScheme } = useAppTheme();
  const s = React.useMemo(() => getStyles(colors, colorScheme), [colors, colorScheme]);
  return (
    <View style={s.labelRow}>
      <Text style={s.fieldLabel}>{label}</Text>
      {required && <RequiredDot />}
    </View>
  );
};

const ChipSelector = ({ options, value, onSelect }: {
  options: { value: string; label: string }[];
  value: string;
  onSelect: (v: string) => void;
}) => {
  const { colors, colorScheme } = useAppTheme();
  const s = React.useMemo(() => getStyles(colors, colorScheme), [colors, colorScheme]);
  return (
    <View style={s.chipRow}>
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[s.chip, isActive && s.chipActive]}
            onPress={() => onSelect(opt.value)}
            activeOpacity={0.7}
          >
            {isActive && (
              <Ionicons name="checkmark-circle" size={14} color={colors.primary} style={{ marginRight: 4 }} />
            )}
            <Text style={[s.chipText, isActive && s.chipTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default function PostScreen() {
  const { colors, colorScheme } = useAppTheme();
  const s = React.useMemo(() => getStyles(colors, colorScheme), [colors, colorScheme]);
  const insets = useSafeAreaInsets();
  const { user, reloadUserProfile } = useAuth();
  const params = useLocalSearchParams();
  const prefillTitle = params.prefillTitle ? String(params.prefillTitle) : '';
  const prefillDescription = params.prefillDescription ? String(params.prefillDescription) : '';

  useFocusEffect(
    React.useCallback(() => {
      reloadUserProfile();
      if (params.prefillTitle || params.prefillDescription) {
        setFormData(prev => ({
          ...prev,
          title: params.prefillTitle ? String(params.prefillTitle) : prev.title,
          description: params.prefillDescription ? String(params.prefillDescription) : prev.description,
        }));
      }
    }, [params.prefillTitle, params.prefillDescription])
  );
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
  const [requiresResumeUrl, setRequiresResumeUrl] = useState<boolean>(false);

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
    title: prefillTitle || '',
    description: prefillDescription || '',
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
    requires_resume_url: false,
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

  const filteredCities = formData.state && indianStatesAndCities[formData.state]
    ? indianStatesAndCities[formData.state].filter(city =>
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

    // Enforce active post limits before proceeding
    if (user && user.profile) {
      const profile = user.profile;
      const isHire = activeTab === 'hire';
      const activeCount = isHire ? profile.active_hire_count || 0 : profile.active_looking_count || 0;
      const maxPosts = isHire ? profile.max_active_hire_posts || 0 : profile.max_active_looking_posts || 0;

      if (maxPosts !== 999999 && activeCount >= maxPosts) {
        if (isHire) {
          Alert.alert(
            'Limit Reached',
            'You can only have 1 active job post on the Free Plan. Please close/stop your current active job post or upgrade your plan to post more.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Manage Posts', onPress: () => router.push('/posted-jobs') },
              { text: 'Upgrade Plan', onPress: () => router.push('/subscription') }
            ]
          );
        } else {
          Alert.alert(
            'Limit Reached',
            `You can only have ${maxPosts} active job seeking post${maxPosts > 1 ? 's' : ''} on your current plan. Please delete/remove a previous post or upgrade your plan to post more.`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Applied Jobs', onPress: () => router.push('/applied-jobs') },
              { text: 'Upgrade Plan', onPress: () => router.push('/subscription') }
            ]
          );
        }
        return;
      }
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
        gender_preference: genderPreference,
        requires_resume_url: requiresResumeUrl,
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
      setRequiresResumeUrl(false);

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

  // ── Shared dropdown renderer ──────────────────────────────────────
  const renderDropdown = (
    label: string,
    value: string,
    placeholder: string,
    isOpen: boolean,
    onToggle: () => void,
    items: string[],
    onSelect: (item: string) => void,
    searchQuery?: string,
    onSearchChange?: (text: string) => void,
    disabled?: boolean,
  ) => {
    const isSearchable = !!onSearchChange;

    return (
      <View style={{ position: 'relative', zIndex: isOpen ? 999 : 1 }}>
        <TouchableOpacity
          style={[s.dropdown, disabled && s.dropdownDisabled]}
          onPress={() => {
            if (!disabled) {
              closeAllDropdowns();
              onToggle();
            }
          }}
          activeOpacity={disabled ? 1 : 0.7}
        >
          <Text style={[s.dropdownValue, !value && s.dropdownPlaceholder]}>
            {value || placeholder}
          </Text>
          <Ionicons
            name={isOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={disabled ? '#D1D5DB' : '#9CA3AF'}
          />
        </TouchableOpacity>

        {/* Modal dropdown for searchable lists (State / City) */}
        {isSearchable && (
          <Modal
            visible={isOpen}
            transparent={true}
            animationType="fade"
            onRequestClose={onToggle}
          >
            <TouchableOpacity
              style={s.modalOverlay}
              activeOpacity={1}
              onPress={onToggle}
            >
              <View
                style={s.modalContent}
                onStartShouldSetResponder={() => true}
              >
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Select {label}</Text>
                  <TouchableOpacity
                    onPress={onToggle}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={s.modalSearchWrap}>
                  <Ionicons name="search" size={14} color={colors.textSecondary} />
                  <TextInput
                    style={s.modalSearchInput}
                    placeholder={`Search ${label.toLowerCase()}...`}
                    placeholderTextColor={colors.textSecondary}
                    value={searchQuery}
                    onChangeText={onSearchChange}
                    autoFocus
                  />
                </View>
                <ScrollView
                  style={s.modalList}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                >
                  {items.map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={[s.modalItem, value === item && s.modalItemActive]}
                      onPress={() => onSelect(item)}
                    >
                      <Text style={[s.modalItemText, value === item && s.modalItemTextActive]}>
                        {item}
                      </Text>
                      {value === item && (
                        <Ionicons name="checkmark" size={16} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>
        )}

        {/* Inline dropdown for simple lists (Job Type, Shift, Sector) */}
        {!isSearchable && isOpen && (
          <View style={s.dropdownMenu}>
            {items.map((item) => (
              <TouchableOpacity
                key={item}
                style={[s.dropdownItem, value === item && s.dropdownItemActive]}
                onPress={() => onSelect(item)}
              >
                <Text style={[s.dropdownItemText, value === item && s.dropdownItemTextActive]}>
                  {item}
                </Text>
                {value === item && (
                  <Ionicons name="checkmark" size={16} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  // ── HIRE FORM ────────────────────────────────────────────────────
  const renderHireForm = () => (
    <GestureScrollView
      style={s.formScroll}
      contentContainerStyle={s.formContent}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Section 1: Basics ── */}
      <SectionCard zIndex={50}>
        <SectionHeader icon="briefcase-outline" label="BASICS" />

        <FieldLabel label="Job Title" required />
        <TextInput
          style={s.input}
          placeholder="e.g. Delivery Driver, Accountant..."
          placeholderTextColor={colors.textSecondary}
          value={formData.title}
          onChangeText={(text) => updateFormData('title', text)}
          onFocus={closeAllDropdowns}
        />

        <View style={s.fieldGap} />

        <FieldLabel label="Sector" required />
        <View style={s.segmentedControl}>
          <TouchableOpacity
            style={[s.segmentBtn, formData.sector === 'Local' && s.segmentBtnActive]}
            onPress={() => updateFormData('sector', 'Local')}
            activeOpacity={0.7}
          >
            <Text style={[s.segmentText, formData.sector === 'Local' && s.segmentTextActive]}>
              Local
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.segmentBtn, formData.sector === 'Professional' && s.segmentBtnActive]}
            onPress={() => updateFormData('sector', 'Professional')}
            activeOpacity={0.7}
          >
            <Text style={[s.segmentText, formData.sector === 'Professional' && s.segmentTextActive]}>
              Professional
            </Text>
          </TouchableOpacity>
        </View>

        <View style={s.fieldGap} />

        <FieldLabel label="Job Type" required />
        {renderDropdown(
          'Job Type',
          formData.job_type,
          'Select',
          showJobTypeDropdown,
          () => setShowJobTypeDropdown(!showJobTypeDropdown),
          jobTypes,
          (item) => { updateFormData('job_type', item); setShowJobTypeDropdown(false); },
        )}
      </SectionCard>

      {/* ── Section 2: Location ── */}
      <SectionCard zIndex={40}>
        <SectionHeader icon="location-outline" label="LOCATION" />

        <View style={s.row}>
          <View style={[s.flexField, { marginRight: 6 }]}>
            <FieldLabel label="State" required />
            {renderDropdown(
              'State',
              formData.state,
              'Select State',
              showStateDropdown,
              () => setShowStateDropdown(!showStateDropdown),
              filteredStates,
              (item) => {
                updateFormData('state', item);
                updateFormData('city', '');
                setShowStateDropdown(false);
                setStateSearchQuery('');
              },
              stateSearchQuery,
              setStateSearchQuery,
            )}
          </View>
          <View style={[s.flexField, { marginLeft: 6 }]}>
            <FieldLabel label="City" required />
            {renderDropdown(
              'City',
              formData.city,
              formData.state ? 'Select City' : 'Select state first',
              showCityDropdown,
              () => formData.state && setShowCityDropdown(!showCityDropdown),
              filteredCities,
              (item) => { updateFormData('city', item); setShowCityDropdown(false); setCitySearchQuery(''); },
              citySearchQuery,
              setCitySearchQuery,
              !formData.state,
            )}
          </View>
        </View>

        <View style={s.fieldGap} />

        <FieldLabel label="Address" required />
        <TextInput
          style={s.input}
          placeholder="Street address or locality"
          placeholderTextColor={colors.textSecondary}
          value={formData.address}
          onChangeText={(text) => updateFormData('address', text)}
          onFocus={closeAllDropdowns}
        />

        <View style={s.fieldGap} />

        <View style={s.row}>
          <View style={[s.flexField, { marginRight: 6 }]}>
            <FieldLabel label="Pin Code" required />
            <TextInput
              style={s.input}
              placeholder="e.g. 110001"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={formData.pincode}
              onChangeText={(text) => updateFormData('pincode', text)}
              onFocus={closeAllDropdowns}
            />
          </View>
          <View style={[s.flexField, { marginLeft: 6 }]}>
            <FieldLabel label="Shift Timing" />
            {renderDropdown(
              'Shift',
              formData.shift_timing,
              'Select',
              showShiftDropdown,
              () => setShowShiftDropdown(!showShiftDropdown),
              shiftTimings,
              (item) => { updateFormData('shift_timing', item); setShowShiftDropdown(false); },
            )}
          </View>
        </View>
      </SectionCard>

      {/* ── Section 3: Details ── */}
      <SectionCard zIndex={30}>
        <SectionHeader icon="options-outline" label="DETAILS" />

        <FieldLabel label="Salary (₹)" />
        <TextInput
          style={s.input}
          placeholder="e.g. 15000"
          placeholderTextColor={colors.textSecondary}
          keyboardType="numeric"
          value={formData.salary_min ? String(formData.salary_min) : ''}
          onChangeText={(text) => updateFormData('salary_min', text)}
          onFocus={closeAllDropdowns}
        />

        <View style={s.fieldGap} />

        <FieldLabel label="Gender Preference" />
        <ChipSelector
          options={[
            { value: 'any', label: 'Any' },
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
          ]}
          value={genderPreference}
          onSelect={(v) => setGenderPreference(v as any)}
        />

        <View style={s.fieldGap} />

        <FieldLabel label="Experience" />
        <ChipSelector
          options={experienceLevels.map(e => ({ value: e, label: e }))}
          value={experience}
          onSelect={(v) => { setExperience(v); updateFormData('experience_level', v); }}
        />
      </SectionCard>

      {/* ── Section 4: Description ── */}
      <SectionCard zIndex={20}>
        <SectionHeader icon="document-text-outline" label="DESCRIPTION" />
        <FieldLabel label="Job Description" />
        <TextInput
          style={[s.input, s.textArea]}
          placeholder="Tell candidates about the role, responsibilities, perks..."
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={4}
          value={formData.description}
          onChangeText={(text) => updateFormData('description', text)}
          onFocus={closeAllDropdowns}
        />
      </SectionCard>

      {/* ── Section 5: Additional (Hire only) ── */}
      <SectionCard zIndex={10}>
        <SectionHeader icon="add-circle-outline" label="ADDITIONAL" />

        {/* Resume toggle */}
        <View style={s.toggleRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={s.toggleLabel}>Require Resume URL</Text>
            <Text style={s.toggleHint}>Applicants must provide a Google Drive resume link</Text>
          </View>
          <TouchableOpacity
            style={[s.toggleSwitch, requiresResumeUrl && s.toggleSwitchOn]}
            onPress={() => setRequiresResumeUrl(!requiresResumeUrl)}
            activeOpacity={0.8}
          >
            <View style={[s.toggleKnob, requiresResumeUrl && s.toggleKnobOn]} />
          </TouchableOpacity>
        </View>

        <View style={s.fieldGap} />

        {/* Custom field add */}
        <TouchableOpacity
          style={s.addFieldBtn}
          onPress={() => setShowAddField(!showAddField)}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={18} color={colors.primary} />
          <Text style={s.addFieldBtnText}>Add custom question</Text>
        </TouchableOpacity>

        {showAddField && (
          <View style={s.newFieldWrap}>
            <TextInput
              style={[s.input, s.textArea, { minHeight: 70 }]}
              placeholder="Enter your question for applicants..."
              placeholderTextColor={colors.textSecondary}
              value={newFieldQuestion}
              onChangeText={setNewFieldQuestion}
              multiline
              numberOfLines={3}
            />
            <View style={s.newFieldActions}>
              <TouchableOpacity
                style={s.newFieldCancel}
                onPress={() => { setShowAddField(false); setNewFieldQuestion(''); }}
              >
                <Text style={s.newFieldCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.newFieldAdd} onPress={addCustomField}>
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={s.newFieldAddText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Custom field list */}
        {customFields.map((field) => (
          <View key={field.id} style={s.customField}>
            <View style={{ flex: 1 }}>
              <Text style={s.customFieldQ}>{field.question}</Text>
              <Text style={s.customFieldHint}>Question for applicants</Text>
            </View>
            <TouchableOpacity
              onPress={() => removeCustomField(field.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))}
      </SectionCard>

      {/* ── Post button ── */}
      <TouchableOpacity
        style={s.postBtn}
        onPress={handlePost}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="paper-plane-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={s.postBtnText}>Publish Post</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </GestureScrollView>
  );

  // ── LOOKING FORM ─────────────────────────────────────────────────
  const renderLookingForm = () => (
    <GestureScrollView
      style={s.formScroll}
      contentContainerStyle={s.formContent}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Section 1: Basics ── */}
      <SectionCard zIndex={50}>
        <SectionHeader icon="briefcase-outline" label="BASICS" />

        <FieldLabel label="Title" required />
        <TextInput
          style={s.input}
          placeholder="e.g. Looking for Accountant role, Need Cook job..."
          placeholderTextColor={colors.textSecondary}
          value={formData.title}
          onChangeText={(text) => updateFormData('title', text)}
          onFocus={closeAllDropdowns}
        />

        <View style={s.fieldGap} />

        <View style={s.row}>
          <View style={[s.flexField, { marginRight: 6 }]}>
            <FieldLabel label="Sector" />
            {renderDropdown(
              'Sector',
              formData.sector,
              'Select',
              showSectorDropdown,
              () => setShowSectorDropdown(!showSectorDropdown),
              sectors,
              (item) => { updateFormData('sector', item); setShowSectorDropdown(false); },
            )}
          </View>
          <View style={[s.flexField, { marginLeft: 6 }]}>
            <FieldLabel label="Job Type" />
            {renderDropdown(
              'Job Type',
              formData.job_type,
              'Select',
              showJobTypeDropdown,
              () => setShowJobTypeDropdown(!showJobTypeDropdown),
              jobTypes,
              (item) => { updateFormData('job_type', item); setShowJobTypeDropdown(false); },
            )}
          </View>
        </View>
      </SectionCard>

      {/* ── Section 2: Location ── */}
      <SectionCard zIndex={40}>
        <SectionHeader icon="location-outline" label="LOCATION" />

        <View style={s.row}>
          <View style={[s.flexField, { marginRight: 6 }]}>
            <FieldLabel label="State" required />
            {renderDropdown(
              'State',
              formData.state,
              'Select State',
              showStateDropdown,
              () => setShowStateDropdown(!showStateDropdown),
              filteredStates,
              (item) => {
                updateFormData('state', item);
                updateFormData('city', '');
                setShowStateDropdown(false);
                setStateSearchQuery('');
              },
              stateSearchQuery,
              setStateSearchQuery,
            )}
          </View>
          <View style={[s.flexField, { marginLeft: 6 }]}>
            <FieldLabel label="City" required />
            {renderDropdown(
              'City',
              formData.city,
              formData.state ? 'Select City' : 'Select state first',
              showCityDropdown,
              () => formData.state && setShowCityDropdown(!showCityDropdown),
              filteredCities,
              (item) => { updateFormData('city', item); setShowCityDropdown(false); setCitySearchQuery(''); },
              citySearchQuery,
              setCitySearchQuery,
              !formData.state,
            )}
          </View>
        </View>

        <View style={s.fieldGap} />

        <FieldLabel label="Address" required />
        <TextInput
          style={s.input}
          placeholder="Street address or locality"
          placeholderTextColor={colors.textSecondary}
          value={formData.address}
          onChangeText={(text) => updateFormData('address', text)}
          onFocus={closeAllDropdowns}
        />

        <View style={s.fieldGap} />

        <FieldLabel label="Pin Code" required />
        <TextInput
          style={s.input}
          placeholder="e.g. 110001"
          placeholderTextColor={colors.textSecondary}
          keyboardType="numeric"
          value={formData.pincode}
          onChangeText={(text) => updateFormData('pincode', text)}
          onFocus={closeAllDropdowns}
        />
      </SectionCard>

      {/* ── Section 3: Details ── */}
      <SectionCard zIndex={30}>
        <SectionHeader icon="options-outline" label="DETAILS" />

        <FieldLabel label="Salary Range (₹)" />
        <View style={s.salaryRow}>
          <TextInput
            style={[s.input, { flex: 1 }]}
            placeholder="Min"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
            value={formData.salary_min ? String(formData.salary_min) : ''}
            onChangeText={(text) => updateFormData('salary_min', text)}
            onFocus={closeAllDropdowns}
          />
          <Text style={s.salaryTo}>to</Text>
          <TextInput
            style={[s.input, { flex: 1 }]}
            placeholder="Max"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
            value={formData.salary_max ? String(formData.salary_max) : ''}
            onChangeText={(text) => updateFormData('salary_max', text)}
            onFocus={closeAllDropdowns}
          />
        </View>

        <View style={s.fieldGap} />

        <FieldLabel label="Experience" />
        <ChipSelector
          options={experienceLevels.map(e => ({ value: e, label: e }))}
          value={experience}
          onSelect={(v) => { setExperience(v); updateFormData('experience_level', v); }}
        />
      </SectionCard>

      {/* ── Section 4: Description ── */}
      <SectionCard zIndex={20}>
        <SectionHeader icon="document-text-outline" label="DESCRIPTION" />
        <FieldLabel label="Description" required />
        <TextInput
          style={[s.input, s.textArea]}
          placeholder="Describe your skills, availability, and what kind of job you're seeking..."
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={4}
          value={formData.description}
          onChangeText={(text) => updateFormData('description', text)}
          onFocus={closeAllDropdowns}
        />
      </SectionCard>

      {/* ── Post button ── */}
      <TouchableOpacity
        style={s.postBtn}
        onPress={handlePost}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="paper-plane-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={s.postBtnText}>Publish Post</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </GestureScrollView>
  );

  const renderLimitBanner = () => {
    if (!user || !user.profile) return null;

    const profile = user.profile;
    const isHire = activeTab === 'hire';

    const activeCount = isHire ? profile.active_hire_count || 0 : profile.active_looking_count || 0;
    const maxPosts = isHire ? profile.max_active_hire_posts || 0 : profile.max_active_looking_posts || 0;
    const remaining = isHire ? profile.remaining_hire_posts || 0 : profile.remaining_looking_posts || 0;

    const maxStr = maxPosts === 999999 ? 'Unlimited' : maxPosts;
    const remainingStr = remaining === 999999 ? 'Unlimited' : remaining;

    const limitReached = maxPosts !== 999999 && activeCount >= maxPosts;

    return (
      <View style={[s.bannerContainer, limitReached && s.bannerContainerLimit]}>
        <View style={s.bannerLeft}>
          <Ionicons
            name={limitReached ? "warning-outline" : "information-circle-outline"}
            size={18}
            color={limitReached ? colors.error : colors.primary}
          />
          <View style={s.bannerTextContainer}>
            <Text style={[s.bannerTitle, limitReached && s.bannerTitleLimit]}>
              {isHire ? 'Active Job Posts' : 'Active Seeking Posts'}
            </Text>
            <Text style={s.bannerSubtitle}>
              {activeCount} of {maxStr} used (Remaining: {remainingStr})
            </Text>
          </View>
        </View>

        {limitReached ? (
          <TouchableOpacity
            style={s.bannerBtn}
            onPress={() => router.push('/subscription')}
            activeOpacity={0.8}
          >
            <Text style={s.bannerBtnText}>Upgrade</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.bannerBadge}>
            <Text style={s.bannerBadgeText}>
              {user.profile.subscription_plan === 'free' ? 'Free' : user.profile.subscription_plan === 'seeker_29' ? '₹29 Plan' : '₹99 Plan'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // ── MAIN RENDER ──────────────────────────────────────────────────
  return (
    <View style={s.container}>
      {/* StatusBar managed via useFocusEffect above */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* ── Header ── */}
        <View style={[s.header, { paddingTop: Math.max(insets.top + (Platform.OS === 'ios' ? 10 : 14), Platform.OS === 'ios' ? 54 : 38) }]}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Create Post</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* ── Tab toggle ── */}
        <View style={s.tabWrap}>
          <View style={s.tabBar}>
            <TouchableOpacity
              style={[s.tab, activeTab === 'hire' && s.tabActive]}
              onPress={() => { closeAllDropdowns(); setActiveTab('hire'); }}
              activeOpacity={0.7}
            >
              {activeTab === 'hire' && (
                <Ionicons name="checkmark-circle" size={15} color={colors.primary} style={{ marginRight: 5 }} />
              )}
              <Text style={[s.tabText, activeTab === 'hire' && s.tabTextActive]}>Hire</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.tab, activeTab === 'looking' && s.tabActive]}
              onPress={() => { closeAllDropdowns(); setActiveTab('looking'); }}
              activeOpacity={0.7}
            >
              {activeTab === 'looking' && (
                <Ionicons name="checkmark-circle" size={15} color={colors.primary} style={{ marginRight: 5 }} />
              )}
              <Text style={[s.tabText, activeTab === 'looking' && s.tabTextActive]}>Looking</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Limit Banner ── */}
        {renderLimitBanner()}

        {/* ── Form ── */}
        {activeTab === 'hire' ? renderHireForm() : renderLookingForm()}
      </KeyboardAvoidingView>
    </View>
  );
}

// ── STYLES ──────────────────────────────────────────────────────────

const getStyles = (colors: any, colorScheme: 'light' | 'dark') => StyleSheet.create({
  // ── Page ──
  container: {
    flex: 1,
    backgroundColor: colors.brandBackground,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 38,
    paddingBottom: 12,
    backgroundColor: colors.brandBackground,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.2,
  },

  // ── Tab toggle ──
  tabWrap: {
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.cardAlt,
    borderRadius: 14,
    padding: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
  },

  // ── Form scroll ──
  formScroll: {
    flex: 1,
  },
  formContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  // ── Cards ──
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    // Shadow for iOS only — elevation on Android clips overflow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    overflow: 'visible',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1.2,
  },

  // ── Field labels ──
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  requiredDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#EF4444',
    marginTop: -2,
  },
  fieldGap: {
    height: 14,
  },

  // ── Input ──
  input: {
    backgroundColor: colors.cardAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },

  // ── Row layout ──
  row: {
    flexDirection: 'row',
  },
  flexField: {
    flex: 1,
  },

  // ── Segmented control (sector) ──
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.cardAlt,
    borderRadius: 10,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.primary,
  },

  // ── Dropdown ──
  dropdown: {
    backgroundColor: colors.cardAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownDisabled: {
    backgroundColor: colors.cardAlt,
    borderColor: colors.border,
  },
  dropdownValue: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  dropdownPlaceholder: {
    color: colors.textSecondary,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
  },
  dropdownSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardAlt,
    margin: 8,
    borderRadius: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dropdownSearchInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 14,
    color: colors.text,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemActive: {
    backgroundColor: colors.cardAlt,
  },
  dropdownItemText: {
    fontSize: 15,
    color: colors.text,
  },
  dropdownItemTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },

  // ── Chips (gender, experience) ──
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardAlt,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },

  // ── Salary row ──
  salaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  salaryTo: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // ── Toggle switch ──
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  toggleHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.textSecondary,
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchOn: {
    backgroundColor: colors.primary,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleKnobOn: {
    marginLeft: 'auto',
  },

  // ── Add custom field ──
  addFieldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  addFieldBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  newFieldWrap: {
    marginTop: 12,
    backgroundColor: colors.cardAlt,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  newFieldActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  newFieldCancel: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.cardAlt,
  },
  newFieldCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  newFieldAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary,
    gap: 4,
  },
  newFieldAddText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },

  // ── Custom field display ──
  customField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardAlt,
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customFieldQ: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  customFieldHint: {
    fontSize: 11,
    color: colors.textSecondary,
  },

  // ── Post button ──
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  postBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },

  // ── Limit Banner Styles ──
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  bannerContainerLimit: {
    borderColor: colors.error,
    backgroundColor: colorScheme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.05)',
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  bannerTitleLimit: {
    color: colors.error,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bannerBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bannerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  bannerBadge: {
    backgroundColor: colors.cardAlt,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // ── Modal dropdown (State / City) ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 20,
    maxHeight: 500,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  modalSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardAlt,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalSearchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 15,
    color: colors.text,
  },
  modalList: {
    flexGrow: 0,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalItemActive: {
    backgroundColor: colors.cardAlt,
  },
  modalItemText: {
    fontSize: 16,
    color: colors.text,
  },
  modalItemTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
});
