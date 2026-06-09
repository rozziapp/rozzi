import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/contexts/ThemeContext';

const { width } = Dimensions.get('window');

interface IDCardData {
  photo?: string;
  name: string;
  gender: string;
  dateOfBirth: string;
  nationality: string;
  address: string;
  phoneNumber: string;
  skills: string[];
}

interface DigitalIDCardProps {
  data: IDCardData;
  isDefault?: boolean;
  onEdit?: () => void;
  onSetDefault?: () => void;
  cardNumber?: number;
}

export default function DigitalIDCard({
  data,
  isDefault = false,
  onEdit,
  onSetDefault,
  cardNumber = 1
}: DigitalIDCardProps) {
  const { colors, colorScheme } = useAppTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  // Debug photo data
  console.log(`=== DIGITAL ID CARD ${cardNumber} ===`);
  console.log('Photo data:', data.photo);
  console.log('Photo data type:', typeof data.photo);
  console.log('Photo data truthy:', !!data.photo);
  console.log('Full data:', data);

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

  // Format date to dd/mm/yyyy
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Get initials from name
  const getInitials = (name: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Check if card has data
  const hasData = data.name && data.gender && data.dateOfBirth && data.nationality && data.address && data.phoneNumber;

  if (!hasData) {
    return (
      <View style={styles.emptyCard}>
        <View style={[styles.emptyCardContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.emptyPhoto, { backgroundColor: colors.cardAlt }]}>
            <Ionicons name="person-add" size={32} color={colors.textSecondary} />
          </View>
          <Text style={[styles.emptyCardTitle, { color: colors.text }]}>Create Your ID Card</Text>
          <Text style={[styles.emptyCardSubtitle, { color: colors.textSecondary }]}>
            {cardNumber === 1 ? 'Fill in your details to create your digital ID card' : 'Optional second ID card'}
          </Text>
          {onEdit && (
            <TouchableOpacity style={styles.createButton} onPress={onEdit}>
              <Text style={styles.createButtonText}>Create Now</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  const age = calculateAge(data.dateOfBirth);
  const initials = getInitials(data.name);

  return (
    <View style={styles.cardContainer}>
      {/* Card Background with Gradient */}
      <LinearGradient
        colors={colorScheme === 'dark' ? [colors.card, colors.cardAlt, colors.border] : ['#ffffff', '#f8fafc', '#f1f5f9']}
        style={[styles.cardGradient, colorScheme === 'dark' && { borderColor: colors.border }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header with Logo and Edit Button */}
        <View style={styles.cardHeaderWrapper}>
          <View style={styles.cardHeader}>
            <View style={styles.logoSection}>
              <View style={styles.logo}>
                <Text style={styles.logoText}>ID</Text>
              </View>
              <Text style={styles.cardType}>Digital Identity Card</Text>
            </View>
            {onEdit && (
              <TouchableOpacity style={styles.editButton} onPress={onEdit}>
                <Ionicons name="create-outline" size={20} color="#6b46c1" />
              </TouchableOpacity>
            )}
          </View>
          {/* Default badge / Set as Default on its own row */}
          <View style={styles.defaultRow}>
            {isDefault && (
              <View style={styles.defaultBadge}>
                <Ionicons name="star" size={12} color="#fff" />
                <Text style={styles.defaultBadgeText}>Default</Text>
              </View>
            )}
            {!isDefault && onSetDefault && (
              <TouchableOpacity style={styles.setDefaultButton} onPress={onSetDefault}>
                <Text style={styles.setDefaultButtonText}>Set as Default</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Main Card Content */}
        <View style={styles.cardContent}>
          {/* Photo Section */}
          <View style={styles.photoSection}>
            <View style={styles.photoContainer}>
              {data.photo ? (
                <Image
                  source={{ uri: data.photo }}
                  style={styles.photoImage}
                  onError={(error) => console.log(`Image load error for card ${cardNumber}:`, error)}
                  onLoad={() => console.log(`Image loaded successfully for card ${cardNumber}:`, data.photo)}
                />
              ) : (
                <Text style={styles.photoText}>{initials}</Text>
              )}
            </View>
            <View style={styles.photoInfo}>
              <Text style={[styles.name, { color: colors.text }]}>{data.name}</Text>
              <Text style={[styles.gender, { color: colors.textSecondary }]}>{data.gender}</Text>
            </View>
          </View>

          {/* Details Grid */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailRow}>
              <View style={styles.detailLabel}>
                <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.labelText, { color: colors.textSecondary }]}>Date of Birth</Text>
              </View>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {formatDate(data.dateOfBirth)}
                {age && <Text style={styles.ageText}> ({age} years)</Text>}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailLabel}>
                <Ionicons name="flag-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.labelText, { color: colors.textSecondary }]}>Nationality</Text>
              </View>
              <Text style={[styles.detailValue, { color: colors.text }]}>{data.nationality}</Text>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailLabel}>
                <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.labelText, { color: colors.textSecondary }]}>Address</Text>
              </View>
              <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={2}>
                {data.address}
              </Text>
            </View>

            {data.phoneNumber && (
              <View style={styles.detailRow}>
                <View style={styles.detailLabel}>
                  <Ionicons name="call-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.labelText, { color: colors.textSecondary }]}>Phone</Text>
                </View>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {data.phoneNumber}
                </Text>
              </View>
            )}
          </View>

          {/* Skills Section */}
          {data.skills.length > 0 && (
            <View style={styles.skillsSection}>
              <Text style={[styles.skillsTitle, { color: colors.textSecondary }]}>Skills</Text>
              <View style={styles.skillsContainer}>
                {data.skills.slice(0, 4).map((skill, index) => (
                  <View key={index} style={styles.skillTag}>
                    <Text style={styles.skillText}>{skill}</Text>
                  </View>
                ))}
                {data.skills.length > 4 && (
                  <View style={[styles.moreSkillsTag, { backgroundColor: colors.cardAlt }]}>
                    <Text style={[styles.moreSkillsText, { color: colors.textSecondary }]}>+{data.skills.length - 4}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Footer with Card Number */}
        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <Text style={[styles.cardNumber, { color: colors.textSecondary }]}>Card #{cardNumber}</Text>
          <View style={styles.watermark}>
            <Text style={styles.watermarkText}>DIGITAL ID</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  cardContainer: {
    width: width - 32,
    maxWidth: 400,
    alignSelf: 'center',
    marginVertical: 8,
  },
  cardGradient: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeaderWrapper: {
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  cardType: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  defaultRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  defaultBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  editButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.cardAlt,
  },
  setDefaultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 6,
    alignSelf: 'flex-end',
  },
  setDefaultButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10b981',
  },
  cardContent: {
    gap: 16,
  },
  photoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  photoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  photoImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  photoText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  photoInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  gender: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  detailsGrid: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'right',
    flex: 1,
  },
  ageText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  skillsSection: {
    marginTop: 8,
  },
  skillsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillTag: {
    backgroundColor: colors.cardAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  skillText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.primary,
  },
  moreSkillsTag: {
    backgroundColor: colors.cardAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  moreSkillsText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(107, 114, 128, 0.1)',
  },
  cardNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  watermark: {
    opacity: 0.3,
  },
  watermarkText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1,
  },
  emptyCard: {
    width: width - 32,
    maxWidth: 400,
    alignSelf: 'center',
    marginVertical: 8,
  },
  emptyCardContent: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: 'rgba(107, 114, 128, 0.1)',
    borderStyle: 'dashed',
  },
  emptyPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.cardAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyCardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
}); 