import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Alert,
  Image,
  StyleSheet,
  Text,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Feather } from '@expo/vector-icons';
import API from '@/utils/api';

interface ProfilePictureProps {
  size?: number;
  onLongPress?: () => void;
  showLongPress?: boolean;
  style?: any;
  userId?: string; // For database integration
  imageUrl?: string; // Direct image URL from database
  onImageChange?: (imageUrl: string) => void; // Callback for database updates
  noBorder?: boolean; // Option to remove white border
}

// No default profile pictures - use placeholder instead

export default function ProfilePicture({
  size = 120,
  onLongPress,
  showLongPress = true,
  style,
  userId,
  imageUrl,
  onImageChange,
  noBorder = false
}: ProfilePictureProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Reset local image state when userId changes (new user)
  useEffect(() => {
    setSelectedImage(null);
  }, [userId]);

  const handleLongPress = () => {
    if (!showLongPress) return;
    setShowPhotoModal(true);
  };

  const convertToBase64 = async (uri: string) => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      console.error('Error converting image to base64:', error);
      return null;
    }
  };

  const handleChooseFromLibrary = async () => {
    try {
      setIsUploading(true);
      setShowPhotoModal(false);

      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photo library.');
        setIsUploading(false);
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true, // Enable base64 for Cloudinary upload
      });

      if (!result.canceled && result.assets[0]) {
        const localUri = result.assets[0].uri;
        const base64Data = result.assets[0].base64;
        setSelectedImage(localUri); // Show locally immediately

        if (base64Data) {
          // Create data URL for Cloudinary upload
          const dataUrl = `data:image/jpeg;base64,${base64Data}`;

          try {
            // Upload to Cloudinary first
            const uploadResult = await API.post('/upload-profile-photo/', {
              photo: dataUrl
            });

            const cloudinaryUrl = uploadResult.data.photo_url;

            // Call the callback to update database with Cloudinary URL
            if (onImageChange) {
              await onImageChange(cloudinaryUrl);
            } else {
              Alert.alert('Success', 'Profile picture updated successfully!');
            }
          } catch (uploadError: any) {
            console.error('Failed to upload profile photo to Cloudinary:', uploadError);
            Alert.alert('Error', `Failed to upload photo: ${uploadError.response?.data?.error || uploadError.message}`);
            setSelectedImage(null);
          }
        } else {
          Alert.alert('Error', 'Failed to process image. Please try again.');
          setSelectedImage(null);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      setIsUploading(true);
      setShowPhotoModal(false);

      // Request camera permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your camera.');
        setIsUploading(false);
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true, // Enable base64 for Cloudinary upload
      });

      if (!result.canceled && result.assets[0]) {
        const localUri = result.assets[0].uri;
        const base64Data = result.assets[0].base64;
        setSelectedImage(localUri); // Show locally immediately

        if (base64Data) {
          // Create data URL for Cloudinary upload
          const dataUrl = `data:image/jpeg;base64,${base64Data}`;

          try {
            // Upload to Cloudinary first
            const uploadResult = await API.post('/upload-profile-photo/', {
              photo: dataUrl
            });

            const cloudinaryUrl = uploadResult.data.photo_url;

            // Call the callback to update database with Cloudinary URL
            if (onImageChange) {
              await onImageChange(cloudinaryUrl);
            } else {
              Alert.alert('Success', 'Profile picture updated successfully!');
            }
          } catch (uploadError: any) {
            console.error('Failed to upload profile photo to Cloudinary:', uploadError);
            Alert.alert('Error', `Failed to upload photo: ${uploadError.response?.data?.error || uploadError.message}`);
            setSelectedImage(null);
          }
        } else {
          Alert.alert('Error', 'Failed to process image. Please try again.');
          setSelectedImage(null);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    setShowPhotoModal(false);
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setSelectedImage(null);

            // Call the callback to update database
            if (onImageChange) {
              await onImageChange('');
            } else {
              Alert.alert('Success', 'Profile picture removed successfully!');
            }
          }
        },
      ]
    );
  };

  const getCurrentImage = () => {
    // Priority: 1. Selected image (local), 2. Database image URL, 3. null (show placeholder)
    if (selectedImage) {
      return selectedImage;
    }
    if (imageUrl) {
      // If the URL is relative (starts with /), prefix it with the backend URL
      if (imageUrl.startsWith('/')) {
        const baseURL = API.defaults.baseURL || '';
        // Remove trailing slash from baseURL if it exists to avoid double slashes
        const cleanBaseURL = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
        return `${cleanBaseURL}${imageUrl}`;
      }
      // If it's a localhost URL from Django, replace the host part with our dynamic backend URL
      if (imageUrl.includes('localhost:') || imageUrl.includes('127.0.0.1:')) {
        const baseURL = API.defaults.baseURL || '';
        const cleanBaseURL = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
        // Strip everything before the /media or /api or whatever path
        // Usually Django returns http://127.0.0.1:8000/media/...
        const pathIndex = imageUrl.indexOf('/media/');
        if (pathIndex !== -1) {
          return `${cleanBaseURL}${imageUrl.substring(pathIndex)}`;
        }
      }
      return imageUrl;
    }
    return null; // No image available
  };

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const borderStyle = noBorder ? {} : {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  };

  const currentImage = getCurrentImage();

  return (
    <>
      <TouchableOpacity
        style={[styles.container, borderStyle, containerStyle, style]}
        onLongPress={handleLongPress}
        delayLongPress={500}
        activeOpacity={0.8}
      >
        {currentImage ? (
          <Image
            source={{ uri: currentImage }}
            style={[styles.image, containerStyle]}
            resizeMode="cover"
          />
        ) : (
          // Professional gray placeholder for no profile photo
          <View style={[styles.placeholder, containerStyle]}>
            <View style={styles.grayBackground}>
              <View style={styles.placeholderIcon}>
                <Feather name="user" size={size * 0.6} color="#ffffff" />
              </View>
            </View>
          </View>
        )}

        {/* Upload indicator */}
        {isUploading && (
          <View style={[styles.uploadOverlay, containerStyle]}>
            <View style={styles.uploadIndicator}>
              <Text style={styles.uploadText}>Uploading...</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* Modern Photo Options Modal */}
      <Modal
        visible={showPhotoModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.photoModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Profile Photo</Text>
              <TouchableOpacity
                onPress={() => setShowPhotoModal(false)}
                style={styles.closeButton}
              >
                <Feather name="x" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <View style={styles.photoOptions}>
              <TouchableOpacity
                style={styles.photoOption}
                onPress={handleTakePhoto}
              >
                <View style={[styles.photoIconContainer, { backgroundColor: '#dbeafe' }]}>
                  <Feather name="camera" size={24} color="#3b82f6" />
                </View>
                <Text style={styles.photoOptionText}>Take Photo</Text>
                <Text style={styles.photoOptionSubtext}>Use camera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.photoOption}
                onPress={handleChooseFromLibrary}
              >
                <View style={[styles.photoIconContainer, { backgroundColor: '#dcfce7' }]}>
                  <Feather name="image" size={24} color="#10b981" />
                </View>
                <Text style={styles.photoOptionText}>Choose Photo</Text>
                <Text style={styles.photoOptionSubtext}>From gallery</Text>
              </TouchableOpacity>

              {getCurrentImage() && (
                <TouchableOpacity
                  style={styles.photoOption}
                  onPress={handleRemovePhoto}
                >
                  <View style={[styles.photoIconContainer, { backgroundColor: '#fee2e2' }]}>
                    <Feather name="trash-2" size={24} color="#ef4444" />
                  </View>
                  <Text style={styles.photoOptionText}>Remove Photo</Text>
                  <Text style={styles.photoOptionSubtext}>Delete current</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grayBackground: {
    width: '100%',
    height: '100%',
    backgroundColor: '#6b7280', // Professional gray
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 1000, // Ensures perfect circle
  },
  placeholderIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  uploadText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  photoModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  photoOptions: {
    gap: 16,
  },
  photoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  photoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  photoOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  photoOptionSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
}); 