import React, { useState, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  InteractionManager,
  ActivityIndicator,
  LogBox,
  Linking,
  PermissionsAndroid,
  type Permission,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { useAuth } from '../../contexts/AuthContext';
import { TextInput } from '../../components/common';
import { EditProfileScreenNavigationProp, EditProfileScreenRouteProp } from '../../types/navigation.types';
import ImagePicker from 'react-native-image-crop-picker';
import { uploadFile, updateUserProfileData } from '../../api/users';

// Disable yellow box warnings in production
if (!__DEV__) {
  LogBox.ignoreAllLogs();
}

// Destructure needed constants if direct access causes issues
const { PERMISSIONS, RESULTS } = PermissionsAndroid;

const EditProfileScreen = () => {
  const navigation = useNavigation<EditProfileScreenNavigationProp>();
  const route = useRoute<EditProfileScreenRouteProp>();
  const { user, updateUserInfo } = useAuth();

  // Get data from route params or use defaults
  const routeParams = useMemo(() => route.params || {}, [route.params]);

  // Debug log to check the received profile image URL
  console.log('Received userphoto from route params:', routeParams.userphoto);

  const [name, setName] = useState(routeParams.name || user?.name || '');
  const [university, _setUniversity] = useState(routeParams.university || user?.university || '');
  const [city, setCity] = useState(routeParams.city || '');
  const [zipcode, setZipcode] = useState(routeParams.zipcode || '');
  const [mobile] = useState(routeParams.mobile || ''); // mobile is non-editable
  const [loading, setLoading] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(routeParams.userphoto || user?.profileImage || null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Add cleanup for any animation-related operations
  useEffect(() => {
    // Defer non-critical operations to avoid animation warnings
    const interactionPromise = InteractionManager.runAfterInteractions(() => {
      // Any animations or heavy operations should be started here
    });

    return () => {
      // Cleanup any subscriptions or pending interactions
      interactionPromise.cancel();
    };
  }, []);

  // Add effect to detect changes in profile data
  useEffect(() => {
    // Function to check if current values differ from initial values
    const checkForChanges = () => {
      const initialName = routeParams.name || user?.name || '';
      const initialCity = routeParams.city || '';
      const initialZipcode = routeParams.zipcode || '';
      const initialPhoto = routeParams.userphoto || user?.profileImage || null;

      // Check if any values have changed
      const hasChanged =
        name !== initialName ||
        city !== initialCity ||
        zipcode !== initialZipcode ||
        profilePicture !== initialPhoto;

      setHasUnsavedChanges(hasChanged);
    };

    checkForChanges();
  }, [name, city, zipcode, profilePicture, routeParams, user]);

  // Add a ref to store the selected image for upload on save
  const selectedImageRef = React.useRef<any>(null);

  // Function to handle profile update
  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setLoading(true);

    try {
      const email = routeParams.email || user?.email;

      if (!email) {
        Alert.alert('Error', 'Email is required for updating profile');
        setLoading(false);
        return;
      }

      // Check if we have a new image to upload
      let imageUrl = routeParams.userphoto || user?.profileImage || '';

      // If we have a selected image that needs to be uploaded
      if (selectedImageRef.current) {
        let uploadResponse: any = null;
        try {
          console.log('Uploading new image to server...');

          // Create form data for upload
          const formData = new FormData();
          formData.append('file', {
            uri: selectedImageRef.current.uri,
            type: selectedImageRef.current.type || 'image/jpeg',
            name: selectedImageRef.current.fileName || 'profile_image.jpg',
          } as any);

          // Upload the image to get the filename
          uploadResponse = await uploadFile(formData);
          console.log('Upload response:', uploadResponse);

          if (uploadResponse && uploadResponse.fileName) {
            // Construct the full image URL
            imageUrl = `https://trustedproductimages.s3.us-east-2.amazonaws.com/${uploadResponse.fileName}`;
            console.log('Image uploaded successfully, URL:', imageUrl);
          } else {
            throw new Error('Failed to get image URL from server');
          }
        } catch (uploadError) {
          console.error('Failed to upload image:', uploadError);

          // Ask user if they want to continue without the image
          return new Promise<void>((resolve, reject) => {
            Alert.alert(
              'Image Upload Failed',
              'Could not upload profile image. Do you want to continue updating other profile information?',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                  onPress: () => {
                    setLoading(false);
                    reject(new Error('Image upload cancelled'));
                  },
                },
                {
                  text: 'Continue',
                  onPress: () => {
                    console.log('Continuing without image update');
                    resolve();
                  },
                },
              ]
            );
          });
        }
      }

      // Now prepare the data with the new image URL if we have one
      const updateData = {
        name: name.trim(),
        city: city.trim(),
        zipcode: zipcode.trim(),
        userphoto: imageUrl,
      };

      console.log('Updating profile with data:', updateData);

      // Now call the PUT API to update the profile with all data including image URL
      await updateUserProfileData(email, updateData);

      // Clear the selected image ref after successful upload
      selectedImageRef.current = null;

      // Also update local user info in Auth context
      updateUserInfo({
        name: name.trim(),
        university: university.trim(),
        profileImage: imageUrl,
      });

      Alert.alert('Success', 'Profile updated successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle profile picture upload with cropping
  const handleUploadProfilePicture = async () => {
    if (uploadingImage) {return;}

    setUploadingImage(true);

    try {
      console.log('[EditProfileScreen] Starting image selection with cropping');
      
      // --- Permission Check ---
      if (Platform.OS === 'android') {
        const apiLevel = Platform.Version;
        let permissionToRequest: Permission;

        if (apiLevel >= 33) { // Android 13+ uses READ_MEDIA_IMAGES
          permissionToRequest = PERMISSIONS.READ_MEDIA_IMAGES;
          console.log('[EditProfileScreen] Requesting READ_MEDIA_IMAGES permission (Android 13+)');
        } else { // Older Android versions use READ_EXTERNAL_STORAGE
          permissionToRequest = PERMISSIONS.READ_EXTERNAL_STORAGE;
          console.log('[EditProfileScreen] Requesting READ_EXTERNAL_STORAGE permission (Android < 13)');
        }

        const hasPermission = await PermissionsAndroid.check(permissionToRequest);
        if (!hasPermission) {
          const status = await PermissionsAndroid.request(permissionToRequest, {
            title: "Photo Library Permission",
            message: "TruStudSel needs access to your photo library to select pictures.",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK"
          });

          if (status !== RESULTS.GRANTED) {
            console.log('[EditProfileScreen] Photo library permission denied by user');
            Alert.alert(
              'Permission Required',
              'To select photos, please allow access to your photo library in app settings.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Open Settings',
                  onPress: () => Linking.openSettings()
                }
              ]
            );
            setUploadingImage(false);
            return; // Exit if permission denied
          }
          console.log('[EditProfileScreen] Photo library permission granted by user');
        } else {
          console.log('[EditProfileScreen] Photo library permission was already granted');
        }
      } else if (Platform.OS === 'ios') {
         // On iOS, permission is typically requested by the library itself,
         // but we can add a check here if needed in the future, or rely on the catch block.
         // For now, we rely on the catch block for iOS permission errors.
         console.log('[EditProfileScreen] Proceeding with image picker on iOS (permissions checked by library/handled in catch)');
      }
      // --- End Permission Check ---

      // Use react-native-image-crop-picker for selecting and cropping with improved UI
      const image = await ImagePicker.openPicker({
        width: 500,
        height: 500,
        cropping: true,
        cropperCircleOverlay: true,
        compressImageQuality: 0.8,
        mediaType: 'any',
        cropperToolbarTitle: 'Edit Profile Photo',
        cropperStatusBarColor: '#000000',
        cropperToolbarColor: '#000000',
        cropperToolbarWidgetColor: '#ffffff',
        cropperActiveWidgetColor: '#1b74e4',
        hideBottomControls: false,
        showCropGuidelines: true,
        enableRotationGesture: true,
        cropperChooseText: 'Use Photo',
        cropperCancelText: 'Cancel',
        // For Android, using a more standard bottom toolbar layout
        freeStyleCropEnabled: false, // Force aspect ratio for profile picture
        showCropFrame: true,
        // Android specific configurations for better controls and safe areas
        ...(Platform.OS === 'android' ? {
          cropperToolbarWidgetColor: '#ffffff',
          includeBase64: false,
          cropperTintColor: '#1b74e4',
          cropperDisableFreeStyleCrop: true, // Force aspect ratio to be square
          cropperToolbarIconsColor: '#ffffff',
          forceJpg: true,
          showVerticallyScrollingCropArea: true,
          cropperStatusBarColor: '#000000',
          cropperToolbarHeight: 88,
          cropperButtonsHorizontalMargin: 16,
          cropperActiveControlsWidgetColor: '#1b74e4',
        } : {}),
        // iOS specific configurations
        ...(Platform.OS === 'ios' ? {
          showsSelectedCount: false,
          avoidEmptySpaceAroundImage: true,
          autoScaleFontSize: true,
          customButtonsIOS: [],
          waitAnimationEnd: false,
          smartAlbums: ['UserLibrary', 'PhotoStream', 'Panoramas', 'Videos', 'Bursts'],
          useFrontCamera: false,
          includeBase64: false,
          cropping: true,
          loadingLabelText: 'Processing...',
          forceJpg: true,
          maxFiles: 1,
        } : {}),
      });

      console.log('[EditProfileScreen] Selected and cropped image:', image);

      if (!image.path) {
        console.error('[EditProfileScreen] Selected image has no path');
        Alert.alert('Error', 'Failed to get image');
        return;
      }

      // Check file size (limit to 5MB)
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
      if (image.size && image.size > MAX_FILE_SIZE) {
        console.warn('[EditProfileScreen] Image too large:', image.size);
        Alert.alert(
          'Image Too Large',
          'The selected image exceeds the 5MB size limit. Please choose a smaller image or compress this one.',
          [
            { text: 'OK', style: 'default' },
          ]
        );
        return;
      }

      // Store the image information
      const selectedImage = {
        uri: image.path,
        type: image.mime || 'image/jpeg',
        fileName: `profile_${Date.now()}.jpg`,
        size: image.size,
      };

      console.log('[EditProfileScreen] Profile image ready for upload:', selectedImage.uri);

      // Update the UI with the selected image
      setProfilePicture(selectedImage.uri);
      
      // Store the selected image in a ref for later upload
      selectedImageRef.current = selectedImage;

      // Notification for better UX
      Alert.alert(
        'Profile Photo Selected',
        'Your new profile photo has been selected. Click "Save Changes" to update your profile.',
        [{ text: 'OK', style: 'default' }]
      );

    } catch (error: any) {
      // Check if user canceled the image picker
      if (error.toString().includes('cancelled') || error.toString().includes('canceled')) {
        console.log('[EditProfileScreen] User canceled image picker');
        // No need to reset status bar if cancelled
        return;
      }
      
      console.error('[EditProfileScreen] Error selecting image:', error);
      
      // --- iOS Permission Error Handling (from catch block) ---
      if (Platform.OS === 'ios') {
        // iOS specific error handling
        if (error.message?.includes('permission') || error.message?.includes('denied') || error.message?.includes('restricted')) {
          Alert.alert(
            'Permission Required',
            'To select photos, please allow access to your photo library in your device settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Open Settings', 
                onPress: () => Linking.openURL('app-settings:') 
              }
            ]
          );
          return;
        }
      }
      
      Alert.alert('Error', 'Failed to select image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Get the first letter of the user's name for the profile circle
  const getInitial = () => {
    if (name) {
      return name.charAt(0).toUpperCase();
    }
    if (user?.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return 'U'; // Default if no name is available
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: '#fff' }}
      edges={Platform.OS === 'ios' ? ['top', 'bottom', 'left', 'right'] : ['bottom', 'left', 'right']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="chevron-left" size={18} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.profileSection}>
            <View style={styles.profilePictureContainer}>
              {profilePicture ? (
                <Image
                  source={{ uri: profilePicture }}
                  style={styles.profilePicture}
                />
              ) : (
                <View style={styles.profilePicturePlaceholder}>
                  <View style={styles.profileGradient} />
                  <Text style={styles.profileInitial}>{getInitial()}</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.uploadPictureButton}
                onPress={handleUploadProfilePicture}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="#1b74e4" />
                ) : (
                  <Icon name="camera" size={14} color="#1b74e4" />
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.namePreview}>{name || 'Your Name'}</Text>
            <Text style={styles.universityPreview}>{university || 'University'}</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.formCard}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>FULL NAME</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your full name"
                  containerStyle={styles.inputContainer}
                  leftIcon={<MaterialIcons name="account-outline" size={22} color="#222" />}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>EMAIL</Text>
                <View style={styles.disabledField}>
                  <MaterialIcons name="email-outline" size={22} color="#222" style={styles.disabledFieldIcon} />
                  <Text style={styles.disabledFieldText}>{routeParams.email || user?.email || 'No email available'}</Text>
                  <View style={styles.lockIconContainer}>
                    <Icon name="lock" size={12} color="#999" />
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>UNIVERSITY</Text>
                <View style={styles.disabledField}>
                  <MaterialIcons name="school-outline" size={22} color="#222" style={styles.disabledFieldIcon} />
                  <Text style={styles.disabledFieldText}>{university || 'No university available'}</Text>
                  <View style={styles.lockIconContainer}>
                    <Icon name="lock" size={12} color="#999" />
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
                <View style={styles.disabledField}>
                  <FontAwesome5 name="phone-alt" size={18} color="#222" style={styles.disabledFieldIcon} />
                  <Text style={styles.disabledFieldText}>{mobile || 'No phone number available'}</Text>
                  <View style={styles.lockIconContainer}>
                    <Icon name="lock" size={12} color="#999" />
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>CITY</Text>
                <TextInput
                  value={city}
                  onChangeText={setCity}
                  placeholder="Enter your city"
                  containerStyle={styles.inputContainer}
                  leftIcon={<FontAwesome5 name="city" size={18} color="#222" />}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>ZIPCODE</Text>
                <TextInput
                  value={zipcode}
                  onChangeText={setZipcode}
                  placeholder="Enter your zipcode"
                  containerStyle={styles.inputContainer}
                  leftIcon={<FontAwesome5 name="map-pin" size={18} color="#222" />}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.saveButton,
                (loading || uploadingImage) && styles.saveButtonLoading,
                hasUnsavedChanges && !loading && !uploadingImage && styles.saveButtonHighlighted,
              ]}
              onPress={handleUpdateProfile}
              disabled={loading || uploadingImage}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <View style={styles.loadingDot} />
                  <View style={[styles.loadingDot, styles.loadingDotMiddle]} />
                  <View style={styles.loadingDot} />
                </View>
              ) : uploadingImage ? (
                <Text style={styles.saveButtonText}>UPLOADING IMAGE...</Text>
              ) : hasUnsavedChanges ? (
                <Text style={styles.saveButtonText}>
                  {profilePicture !== (routeParams.userphoto || user?.profileImage)
                    ? 'SAVE PROFILE & IMAGE'
                    : 'SAVE CHANGES'}
                </Text>
              ) : (
                <Text style={styles.saveButtonText}>NO CHANGES</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  backButton: {
    padding: 8,
    backgroundColor: '',
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 0,
      },
    }),
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profilePictureContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  profilePicture: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  profilePicturePlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#f7b305',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#f7b305',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 0,
      },
    }),
    overflow: 'hidden',
    position: 'relative',
  },
  profileGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
    opacity: 0.9,
  },
  profileInitial: {
    fontSize: 42,
    fontWeight: 'bold',
    color: 'white',
    zIndex: 2,
  },
  namePreview: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  universityPreview: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  uploadPictureButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'white',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1b74e4',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.2)',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  form: {
    marginBottom: Platform.OS === 'android' ? 40 : 20,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 0,
      },
    }),
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
  },
  fieldGroup: {
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#777',
    marginBottom: 8,
    letterSpacing: 0.8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    marginVertical: 20,
  },
  inputContainer: {
    marginBottom: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    height: 48,
  },
  disabledField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  disabledFieldIcon: {
    marginRight: 12,
  },
  disabledFieldText: {
    fontSize: 15,
    color: '#999',
    flex: 1,
  },
  lockIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#f7b305',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 0,
      },
    }),
    position: 'relative',
    overflow: 'hidden',
  },
  saveButtonLoading: {
    backgroundColor: '#222',
  },
  saveButtonHighlighted: {
    backgroundColor: '#1b74e4',
    ...Platform.select({
      ios: {
        shadowColor: '#1b74e4',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
      },
      android: {
        elevation: 0,
      },
    }),
    transform: [{ scale: 1.02 }],
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f7b305',
    marginHorizontal: 2,
    opacity: 0.8,
  },
  loadingDotMiddle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    opacity: 1,
  },
});

export default EditProfileScreen;
