/**
 * Import statements
 */
import React, { useCallback, memo, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  PermissionsAndroid,
  StatusBar,
  InteractionManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Entypoicon from 'react-native-vector-icons/Entypo';
import { PostingScreenProps } from '../../types/navigation.types';
import { useTheme } from '../../hooks';
import { TextInput } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import LinearGradient from 'react-native-linear-gradient';
import ImagePicker from 'react-native-image-crop-picker';
import { launchCamera } from 'react-native-image-picker'; // Import for iOS camera

// Import the Zustand store
import usePostingStore from '../../store/postingStore';
import { ProductType, ProductCondition, PRODUCT_TYPES, PRODUCT_CONDITIONS } from '../../constants/productConstants';

// Import CitySelector component
import CitySelector from '../../components/CitySelector';

// Get device dimensions for responsive layout
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const THUMBNAIL_SIZE = SCREEN_WIDTH > 400 ? 85 : 75;
const MAIN_PHOTO_HEIGHT = SCREEN_WIDTH * 0.5;

// Type definition for image component props
type PhotoProps = {
  uri: string;
  onRemove: () => void;
};

// Photo components moved outside of the main component
const PhotoTips = memo(() => (
  <View style={styles.photoTipsContainer}>
    <View style={styles.photoTipRow}>
      <Icon name="check-circle" size={14} color="#f7b305" style={styles.tipIcon} />
      <Text style={[styles.photoTipText, { color: 'rgba(0,0,0,0.6)' }]}>
        Use good lighting and clean background
      </Text>
    </View>
    <View style={styles.photoTipRow}>
      <Icon name="check-circle" size={14} color="#f7b305" style={styles.tipIcon} />
      <Text style={[styles.photoTipText, { color: 'rgba(0,0,0,0.6)' }]}>
        Include multiple angles
      </Text>
    </View>
    <View style={styles.photoTipRow}>
      <Icon name="check-circle" size={14} color="#f7b305" style={styles.tipIcon} />
      <Text style={[styles.photoTipText, { color: 'rgba(0,0,0,0.6)' }]}>
        Show any defects or wear
      </Text>
    </View>
  </View>
));

// Updated MainPhotoPlaceholder to single button
const MainPhotoPlaceholder = memo(({ onPress, theme }: { 
  onPress: () => void, 
  theme: {
    colors: {
      text: string;
      textSecondary: string;
      border: string;
    };
  };
}) => (
  <TouchableOpacity
    style={[styles.mainPhotoButton, {
      borderColor: 'rgba(247, 179, 5, 0.4)',
      backgroundColor: 'rgba(247, 179, 5, 0.05)',
    }]}
    onPress={onPress}
    activeOpacity={0.7}
    accessible={true}
    accessibilityLabel="Add main photo"
    accessibilityHint="Opens image picker to select main photo"
  >
    <View style={styles.addImageIconContainer}>
      <View style={styles.cameraIconOuter}>
        <View style={styles.cameraIconCircle}>
          <Icon name="camera" size={28} color="#f7b305" />
        </View>
      </View>
      <Text style={[styles.mainPhotoText, { color: theme.colors.text }]}>
        Add Main Photo
      </Text>
      <Text style={[styles.photoTip, { color: theme.colors.textSecondary }]}>
        This will be the cover image
      </Text>
      <View style={styles.photoUpgradeBadge}>
        <LinearGradient
          colors={['#f7b305', '#f59000']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.photoUpgradeBadgeGradient}
        >
          <Icon name="image" size={12} color="#ffffff" style={{marginRight: 6}} />
          <Text style={styles.photoUpgradeBadgeText}>Better pics = faster sales</Text>
        </LinearGradient>
      </View>
    </View>
  </TouchableOpacity>
));

const MainPhoto = memo(({ uri, onRemove }: PhotoProps) => (
  <View style={styles.mainPhotoWrapper}>
    <Image
      source={{ uri }}
      style={styles.mainPhoto}
      resizeMode="cover"
      resizeMethod="resize"
      accessible={true}
      accessibilityLabel="Main product photo"
    />
    <TouchableOpacity
      style={styles.removeMainPhotoButton}
      onPress={onRemove}
      hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
      accessible={true}
      accessibilityLabel="Remove main photo"
    >
      <Icon name="trash" size={16} color="#FFFFFF" />
    </TouchableOpacity>
    <View style={styles.mainPhotoLabel}>
      <Text style={styles.mainPhotoLabelText}>Main Photo</Text>
    </View>
  </View>
));

const ThumbnailPhoto = memo(({ uri, onRemove }: PhotoProps) => (
  <View style={styles.thumbnailWrapper}>
    <Image
      source={{ uri }}
      style={styles.thumbnailImage}
      resizeMethod="resize"
      accessible={true}
      accessibilityLabel="Product photo thumbnail"
    />
    <TouchableOpacity
      style={styles.removeThumbnailButton}
      onPress={onRemove}
      hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
      accessible={true}
      accessibilityLabel="Remove this photo"
    >
      <Icon name="times" size={14} color="#FFFFFF" />
    </TouchableOpacity>
  </View>
));

const PostingScreen: React.FC<PostingScreenProps> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [photoPickerModalVisible, setPhotoPickerModalVisible] = useState(false);
  // Add state for city selector modal
  const [citySelectorVisible, setCitySelectorVisible] = useState(false);
  const [cameraCooldown, setCameraCooldown] = useState(false);

  const routeParams = route.params || {};
  const { userUniversity = '', userCity = '', isEditMode = false, productToEdit = null } = routeParams;

  // console.log('[PostingScreen] Route params:', JSON.stringify(routeParams));
  // console.log('[PostingScreen] Route university:', userUniversity);
  // console.log('[PostingScreen] Route city:', userCity);
  // console.log('[PostingScreen] User university from auth:', user?.university || 'not set');
  // console.log('[PostingScreen] User city from auth:', user?.city || 'not set');

  // Use the Posting Store
  const {
    // State
    images,
    localImageUris,
    title,
    selectedType,
    selectedSubcategory,
    description,
    price,
    selectedCondition,
    isSell,
    isLoading,
    uploadProgress,
    errors,
    typeModalVisible,
    subcategoryModalVisible,
    conditionModalVisible,
    // Only include used variables to avoid linter errors
    displayCondition,
    isEditMode: storeIsEditMode,
    cityToUse,

    // Actions
    setTitle,
    setSelectedType,
    setSelectedSubcategory,
    setDescription,
    setPrice,
    setSelectedCondition,
    setIsSell,
    setTypeModalVisible,
    setSubcategoryModalVisible,
    setConditionModalVisible,
    addImage,
    removeImage,
    clearErrors,
    postItem,
    resetState,
    setUniversityToUse,
    setCityToUse,
    setEditMode,
    setProductId,
    populateFormWithProduct,
    updateExistingProduct,
  } = usePostingStore();

  // Show photo picker modal
  const showPhotoPickerModal = useCallback(() => {
    setPhotoPickerModalVisible(true);
  }, []);

  // Hide photo picker modal
  const hidePhotoPickerModal = useCallback(() => {
    setPhotoPickerModalVisible(false);
  }, []);

  // Set edit mode and load product data if in edit mode
  useEffect(() => {
    if (isEditMode && productToEdit) {
      console.log('[PostingScreen] Entering edit mode for product:', productToEdit.id);
      setEditMode(true);
      setProductId(productToEdit.id);
      populateFormWithProduct(productToEdit);
    } else {
      setEditMode(false);
      setProductId(null);
    }
  }, [isEditMode, productToEdit, setEditMode, setProductId, populateFormWithProduct]);

  // Set the city and university to use from route params, ONLY if not in edit mode
  useEffect(() => {
    if (!isEditMode) {
      console.log('[PostingScreen] Setting context from route params (New Post):', { userUniversity, userCity });
    setUniversityToUse(userUniversity);
    setCityToUse(userCity);
    }
  }, [isEditMode, userUniversity, userCity, setUniversityToUse, setCityToUse]);

  // Debug log of navigation params when component mounts
  useEffect(() => {
    // console.log('[PostingScreen] Component mounted with route params:', JSON.stringify(route.params));
    // console.log('[PostingScreen] User object available:', user ? 'yes' : 'no');
    if (user) {
      // console.log('[PostingScreen] User university from user object:', user.university || 'not set');
    }

    // Reset the store state only if NOT in edit mode
    if (!isEditMode) {
      console.log('[PostingScreen] Resetting form state for new post.');
      resetState();
    }
  }, [route.params, user, resetState, isEditMode]);

  // Modified image picker function to include cropping
  const handleImageUpload = useCallback(async () => {
    console.log('[PostingScreen] Starting image selection process');
    if (images.length >= 5) {
      console.log('[PostingScreen] Maximum images limit reached');
      Alert.alert('Maximum Images', 'You can upload up to 5 images');
      return;
    }

    // Add a cooldown for gallery access too, just like camera
    if (cameraCooldown) return; // Reuse the same state to prevent rapid re-opening
    setCameraCooldown(true);

    // --- Android Pre-Picker Setup --- 
    // On Android, hide modal and add delay *before* picker to prevent UI jump
    if (Platform.OS === 'android') {
      hidePhotoPickerModal();
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    // --- End Android Pre-Picker Setup ---

    try {
      console.log('[PostingScreen] Requesting permissions and launching image crop picker');
      
      // --- Android StatusBar Handling --- 
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('#000000', true); 
        StatusBar.setBarStyle('light-content', true);
      }
      // --- End Android StatusBar Handling ---
      
      // Launch the picker
      const image = await ImagePicker.openPicker({
        width: 1200,
        height: 1200,
        cropping: true,
        cropperCircleOverlay: false,
        compressImageQuality: 0.7,
        mediaType: 'photo',
        cropperToolbarTitle: 'Edit Photo',
        cropperStatusBarColor: '#000000', 
        cropperToolbarColor: '#000000',
        cropperToolbarWidgetColor: '#ffffff',
        cropperActiveWidgetColor: '#f7b305',
        hideBottomControls: false,
        showCropGuidelines: true,
        enableRotationGesture: true,
        cropperChooseText: 'Done',
        cropperCancelText: 'Cancel',
        multiple: false,
        freeStyleCropEnabled: true, 
        showCropFrame: true,
        cropperChooseInitialCropArea: 'full',
        avoidEmptySpaceAroundImage: true,
        includeExif: true,
        forceJpg: true,
        ...(Platform.OS === 'android' ? {
          cropperToolbarWidgetColor: '#ffffff',
          includeBase64: false,
          cropperTintColor: '#f7b305',
          cropperDisableFreeStyleCrop: false,
          cropperInitialRectsPercentages: {
            x: 0,
            y: 0, 
            width: 1,
            height: 1
          },
          cropperToolbarIconsColor: '#ffffff',
          forceJpg: true,
          showVerticallyScrollingCropArea: true,
          cropperToolbarHeight: 88,
          cropperButtonsHorizontalMargin: 16,
          cropperActiveControlsWidgetColor: '#f7b305',
        } : {}),
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
          width: 800,
          height: 800,
        } : {}),
      });
      
      // --- Post-Picker Modal Hide (iOS & Android) ---
      // Hide the modal *after* picker interaction is complete (or started)
      // For Android, this is redundant if it succeeded, but safe.
      // For iOS, this is the primary hide.
      if (Platform.OS === 'ios') {
         hidePhotoPickerModal(); 
      }
      // --- End Post-Picker Modal Hide ---

      console.log('[PostingScreen] Selected and cropped image:', image);

      if (!image.path) {
        console.error('[PostingScreen] Selected image has no path');
        Alert.alert('Error', 'Failed to get image');
        return;
      }

      // Check file size (limit to 5MB)
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
      if (image.size && image.size > MAX_FILE_SIZE) {
        console.warn('[PostingScreen] Image too large:', image.size);
        Alert.alert(
          'Image Too Large',
          'The selected image exceeds the 5MB size limit. Please choose a smaller image or compress this one.',
          [
            { text: 'OK', style: 'default' },
          ]
        );
        return;
      }

      // Add the image to the store
      const newImage = {
        uri: image.path,
        type: image.mime || 'image/jpeg',
        name: `gallery_${Date.now()}.jpg`,
        fileSize: image.size,
      };

      console.log('[PostingScreen] Adding new gallery image to store:', JSON.stringify(newImage));
      addImage(newImage);
      
      // Reset cooldown after successful selection
      InteractionManager.runAfterInteractions(() => {
        setCameraCooldown(false);
      });

    } catch (error: any) {
      console.error('[PostingScreen] Error during image selection/processing:', error, error.stack);

      // Always hide the modal in case of error/cancellation
      hidePhotoPickerModal(); 
      
      if (error.toString().includes('cancelled') || error.toString().includes('canceled')) {
        console.log('[PostingScreen] User canceled image picker/cropper');
        // Reset cooldown immediately upon cancellation
        InteractionManager.runAfterInteractions(() => {
          setCameraCooldown(false);
        });
        // No need to reset status bar if cancelled
        return; 
      }
      
      // Reset cooldown on error
      InteractionManager.runAfterInteractions(() => {
        setCameraCooldown(false);
      });
      
      if (Platform.OS === 'ios') {
        // iOS specific error handling
        console.log('[PostingScreen] iOS error details:', error.code, error.message);
        
        // If there's a permissions issue
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
      
      // Reset Android status bar if an error occurred *after* it was changed
      if (Platform.OS === 'android') {
        InteractionManager.runAfterInteractions(() => {
          StatusBar.setBackgroundColor('transparent', true);
          StatusBar.setBarStyle('dark-content', true);
        });
      }

    } finally {
      // Reset StatusBar on Android if the process completed successfully
      // The catch block handles resets on error for Android.
      if (Platform.OS === 'android') {
        // We might check if the try block actually completed vs cancelled here, 
        // but resetting unconditionally within InteractionManager is generally safe.
        InteractionManager.runAfterInteractions(() => {
          StatusBar.setBackgroundColor('transparent', true);
          StatusBar.setBarStyle('dark-content', true);
        });
      }
      // Ensure modal is hidden (redundant for success/error cases handled above, but safe)
      hidePhotoPickerModal();
    }
  }, [images.length, addImage, hidePhotoPickerModal, cameraCooldown]);

  // New function to handle camera image capture
  const handleCameraCapture = useCallback(async () => {
    if (cameraCooldown) return; // Prevent rapid re-opening
    setCameraCooldown(true);

    setTimeout(() => setCameraCooldown(false), 1500); // 1.5 second cooldown

    console.log('[PostingScreen] Starting camera capture');
    if (images.length >= 5) {
      console.log('[PostingScreen] Maximum images limit reached');
      Alert.alert('Maximum Images', 'You can upload up to 5 images');
      return;
    }

    try {
      hidePhotoPickerModal();
      await new Promise(resolve => setTimeout(resolve, 300));

      // Platform-specific camera handling
      if (Platform.OS === 'ios') {
        // Use react-native-image-picker for iOS
        console.log('[PostingScreen] Using native image picker for iOS');
        
        launchCamera({
          mediaType: 'photo',
          includeBase64: false,
          maxHeight: 1200,
          maxWidth: 1200,
          quality: 0.7,
          saveToPhotos: false, // Don't save to photo library automatically
        }, (response) => {
          if (response.didCancel) {
            console.log('[PostingScreen] User cancelled camera');
            // Ensure we properly handle the cancellation
            InteractionManager.runAfterInteractions(() => {
              // Reset modal state and cooldown immediately upon cancellation
              setCameraCooldown(false);
            });
            return;
          }
          
          if (response.errorCode) {
            console.log('[PostingScreen] Camera error:', response.errorMessage);
            
            // Also reset the cooldown on error
            InteractionManager.runAfterInteractions(() => {
              setCameraCooldown(false);
            });
            
            if (response.errorCode === 'camera_unavailable') {
              Alert.alert('Camera Error', 'Camera is not available on this device');
            } else if (response.errorCode === 'permission') {
              Alert.alert(
                'Camera Permission Required',
                'To take photos, please allow camera access in your device settings.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Open Settings', 
                    onPress: () => Linking.openURL('app-settings:') 
                  }
                ]
              );
            } else {
              Alert.alert('Error', response.errorMessage || 'Failed to capture image');
            }
            return;
          }
          
          // Successfully captured an image
          if (response.assets && response.assets.length > 0) {
            const asset = response.assets[0];
            console.log('[PostingScreen] iOS camera captured image:', asset.uri);
            
            // Add the image to the store
            if (asset.uri) {
              const newImage = {
                uri: asset.uri,
                type: asset.type || 'image/jpeg',
                name: `camera_${Date.now()}.jpg`,
                fileSize: asset.fileSize || 0,
              };
              
              console.log('[PostingScreen] Adding new iOS camera image to store:', JSON.stringify(newImage));
              addImage(newImage);
              
              // Reset cooldown after successful capture
              InteractionManager.runAfterInteractions(() => {
                setCameraCooldown(false);
              });
            } else {
              console.error('[PostingScreen] No URI in captured image');
              Alert.alert('Error', 'Failed to process the captured image');
            }
          }
        });
        
        return; // Exit early, the callback will handle the rest
      }
      
      // Android: Use existing image-crop-picker implementation
      // --- Android StatusBar Handling --- 
      if (Platform.OS === 'android') {
        // Camera permission check
        const permission = PermissionsAndroid.PERMISSIONS.CAMERA;
        const hasPermission = await PermissionsAndroid.check(permission);
        if (!hasPermission) {
          const status = await PermissionsAndroid.request(permission, {
            title: "Camera Permission",
            message: "TruStudSel needs access to your camera to take photos",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK"
          });
          
          if (status !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log('[PostingScreen] Camera permission denied');
            Alert.alert(
              'Permission Required',
              'To take photos, please allow camera access in app settings.',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Open Settings', 
                  onPress: () => Linking.openSettings()
                }
              ]
            );
            return;
          }
        }
        
        StatusBar.setBackgroundColor('#000000', true);
        StatusBar.setBarStyle('light-content', true);
      
        // Continue with the original implementation for Android
        const image = await ImagePicker.openCamera({
          width: 1200,
          height: 1200,
          cropping: true,
          cropperCircleOverlay: false,
          compressImageQuality: 0.7,
          mediaType: 'photo',
          cropperToolbarTitle: 'Edit Photo',
          cropperStatusBarColor: '#000000',
          cropperToolbarColor: '#000000',
          cropperToolbarWidgetColor: '#ffffff',
          cropperActiveWidgetColor: '#f7b305',
          hideBottomControls: false,
          showCropGuidelines: true,
          enableRotationGesture: true,
          cropperChooseText: 'Done',
          cropperCancelText: 'Cancel',
          multiple: false,
          freeStyleCropEnabled: true,
          showCropFrame: true,
          cropperChooseInitialCropArea: 'full',
          avoidEmptySpaceAroundImage: true,
          includeExif: true,
          forceJpg: true,
          cropperInitialRectsPercentages: {
            x: 0,
            y: 0, 
            width: 1,
            height: 1
          },
          includeBase64: false,
          cropperTintColor: '#f7b305',
          cropperDisableFreeStyleCrop: false,
          cropperToolbarIconsColor: '#ffffff',
          showVerticallyScrollingCropArea: true,
          cropperToolbarHeight: 56, 
          cropperButtonsHorizontalMargin: 16,
          cropperActiveControlsWidgetColor: '#f7b305',
        });

        console.log('[PostingScreen] Android camera captured image:', image);

        if (!image.path) {
          console.error('[PostingScreen] Camera image has no path');
          Alert.alert('Error', 'Failed to get image from camera');
          return;
        }

        // Add the image to the store
        const newImage = {
          uri: image.path,
          type: image.mime || 'image/jpeg',
          name: `camera_${Date.now()}.jpg`,
          fileSize: image.size,
        };

        console.log('[PostingScreen] Adding new camera image to store:', JSON.stringify(newImage));
        addImage(newImage);
      }

    } catch (error: any) {
      // Check if user canceled the camera
      if (error.toString().includes('cancelled') || error.toString().includes('canceled')) {
        console.log('[PostingScreen] User canceled camera');
        // Reset cooldown immediately upon cancellation
        InteractionManager.runAfterInteractions(() => {
          setCameraCooldown(false);
        });
        return;
      }
      
      console.error('[PostingScreen] Error capturing image:', error, error.stack);
      
      // Reset cooldown on error
      InteractionManager.runAfterInteractions(() => {
        setCameraCooldown(false);
      });
      
      if (Platform.OS === 'ios') {
        // iOS specific error handling
        console.log('[PostingScreen] iOS error details:', error.code, error.message);
        
        // If there's a permissions issue
        if (error.message?.includes('permission') || error.message?.includes('denied') || error.message?.includes('restricted')) {
          Alert.alert(
            'Camera Permission Required',
            'To take photos, please allow camera access in your device settings.',
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
      
      Alert.alert('Error', 'Failed to capture image. Please try again.');
    } finally {
      // Reset StatusBar on Android after interactions
      if (Platform.OS === 'android') {
        InteractionManager.runAfterInteractions(() => {
          // Reset background and explicitly set barStyle to default
          StatusBar.setBackgroundColor('transparent', true);
          StatusBar.setBarStyle('dark-content', true);
        });
      }
    }
  }, [images.length, addImage, hidePhotoPickerModal, cameraCooldown]);

  // Handle removing images - uses the store's removeImage function
  const handleRemoveImage = useCallback((index: number, isExisting: boolean) => {
    removeImage(index, isExisting);
  }, [removeImage]);

  // Select a product type - uses the store's setSelectedType function
  const selectType = useCallback((type: ProductType) => {
    setSelectedType(type);
    setTypeModalVisible(false);
  }, [setSelectedType, setTypeModalVisible]);

  // Select a subcategory - uses the store's setSelectedSubcategory function
  const selectSubcategory = useCallback((subcategory: string) => {
    setSelectedSubcategory(subcategory);
    setSubcategoryModalVisible(false);
  }, [setSelectedSubcategory, setSubcategoryModalVisible]);

  // Select a condition - uses the store's setSelectedCondition function
  const selectCondition = useCallback((condition: ProductCondition) => {
    setSelectedCondition(condition);
    setConditionModalVisible(false);
  }, [setSelectedCondition, setConditionModalVisible]);

  // Handle posting or updating the item
  const handlePost = useCallback(() => {
    // Clear any previous errors
    clearErrors();

    // Get user info needed for posting
    const userEmail = user?.email || '';
    const userName = user?.attributes?.name || '';
    const userZipcode = user?.attributes?.['custom:zipcode'] || '';

    // Navigate back on success
    const handleSuccess = () => {
      // Go back to profile screen
      navigation.goBack();
    };

    if (storeIsEditMode) {
      // Update existing product
      updateExistingProduct(userEmail, userName, userZipcode, handleSuccess);
    } else {
      // Post new item
      postItem(userEmail, userName, userZipcode, handleSuccess);
    }
  }, [user, clearErrors, navigation, storeIsEditMode, updateExistingProduct, postItem]);

  // Modify button text based on edit mode
  const postButtonText = storeIsEditMode ? 'Update Listing' : 'Post Listing';
  
  // Modify screen title based on edit mode
  const screenTitle = storeIsEditMode ? 'Edit Product' : 'Post Product';

  // Render individual type option with icon
  const renderTypeOptionItem = ({ item }: { item: ProductType }) => (
    <TouchableOpacity
      style={[
        styles.optionItem,
        selectedType?.id === item.id && styles.selectedOption,
        { backgroundColor: selectedType?.id === item.id ? `${item.color}20` : theme.colors.surface },
      ]}
      onPress={() => selectType(item)}
    >
      <View style={[
        styles.iconContainer,
        {
          backgroundColor: item.color,
          borderRadius: 27.5,
          padding: 8,
          width: 55,
          height: 55,
          justifyContent: 'center',
          alignItems: 'center',
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
            },
            android: {
              elevation: 0,
              borderWidth: 1,
              borderColor: '#e0e0e0',
            },
          }),
        },
      ]}>
        {item.iconType === 'material' && <MaterialIcons name={item.icon} size={24} color="black" />}
        {item.iconType === 'fontawesome' && <Icon name={item.icon} size={24} color="black" />}
        {item.iconType === 'entypo' && <Entypoicon name={item.icon} size={24} color="black" />}
      </View>
      <Text style={[
        styles.optionText,
        { color: theme.colors.text },
        selectedType?.id === item.id && { fontWeight: 'bold' },
      ]}>
        {item.name}
      </Text>
      {selectedType?.id === item.id && (
        <Icon name="check" size={18} color={item.color} style={styles.checkIcon} />
      )}
    </TouchableOpacity>
  );

  // Memoized section headers for consistent styling
  const renderSectionHeader = useCallback((title: string, error?: string, subtitle?: string) => (
    <View style={styles.sectionHeaderRow}>
      <View>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          {title} {error && <Text style={styles.errorText}>({error})</Text>}
        </Text>
        {subtitle && (
          <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  ), [theme.colors]);

  // Move PostButton component outside renderPhotoGallery
  const PostButton = useCallback(() => (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: isLoading ? 'rgba(247, 179, 5, 0.7)' : '#f7b305',
          opacity: isLoading ? 0.8 : 1,
        },
      ]}
      activeOpacity={0.7}
      onPress={handlePost}
      disabled={isLoading}
    >
      {isLoading ? (
        <View style={styles.uploadProgressContainer}>
          <ActivityIndicator color="#FFFFFF" size="small" style={styles.uploadingIndicator} />
          <Text style={[styles.uploadingText, { color: '#FFFFFF' }]}>
            {uploadProgress < 50 ? 'Uploading images...' :
             uploadProgress < 90 ? 'Creating listing...' : 'Almost done...'}
          </Text>
        </View>
      ) : (
        <View style={styles.buttonContent}>
          <Icon name="check" size={18} color="#FFFFFF" style={styles.buttonIcon} />
          <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
            {postButtonText}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  ), [isLoading, uploadProgress, handlePost, postButtonText]);

  // Optimized photo gallery rendering
  const renderPhotoGallery = useCallback(() => {
    // Determine the URI and removal parameters for the main photo slot
    let mainPhotoUri: string | null = null;
    let isMainPhotoExisting = false;
    let mainPhotoRemoveIndex = 0;

    if (localImageUris.length > 0) {
      mainPhotoUri = localImageUris[0];
      isMainPhotoExisting = true;
      mainPhotoRemoveIndex = 0; // Index relative to localImageUris
    } else if (images.length > 0) {
      mainPhotoUri = images[0].uri;
      isMainPhotoExisting = false;
      mainPhotoRemoveIndex = 0; // Index relative to images array
    }

    return (
      <View style={styles.photoGalleryContainer}>
        {/* Main photo slot: Render MainPhoto if URI exists, otherwise Placeholder */}
        {mainPhotoUri ? (
          <MainPhoto 
            uri={mainPhotoUri} 
            onRemove={() => handleRemoveImage(mainPhotoRemoveIndex, isMainPhotoExisting)} 
          />
        ) : (
          <MainPhotoPlaceholder 
            onPress={showPhotoPickerModal}
            theme={theme} 
          />
        )}

        {/* Additional photos row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.additionalPhotosContainer}
        >
          {/* Display EXISTING thumbnails (excluding the main one) */}
          {localImageUris.slice(1).map((imageUri, index) => (
            <ThumbnailPhoto
              key={`thumb-existing-${index}`}
              uri={imageUri}
              onRemove={() => handleRemoveImage(index + 1, true)} 
            />
          ))}
          
          {/* Display NEWLY ADDED thumbnails (excluding the one potentially shown in main slot) */}
          {images.slice(localImageUris.length > 0 ? 0 : 1).map((imageFile, index) => (
            <ThumbnailPhoto
              key={`thumb-new-${index}`}
              uri={imageFile.uri} 
              // Adjust index based on whether the first new image is in the main slot
              onRemove={() => handleRemoveImage(index + (localImageUris.length > 0 ? 0 : 1), false)} 
            />
          ))}

          {/* Add button: Show if total displayed images < 5 */}
          {(localImageUris.length + images.length) < 5 && (
            <TouchableOpacity
              style={[styles.addThumbnailButton, {
                borderColor: 'rgba(247, 179, 5, 0.3)',
                backgroundColor: 'rgba(247, 179, 5, 0.05)',
              }] }
              onPress={showPhotoPickerModal}
              activeOpacity={0.7}
            >
              <Icon name="plus" size={20} color="#f7b305" />
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Photo upload tips */}
        {localImageUris.length === 0 && images.length === 0 && <PhotoTips />}
      </View>
    );
  // Update dependencies
  }, [localImageUris, images, theme, showPhotoPickerModal, handleRemoveImage]);

  // Add handler for city selection
  const handleSelectCity = useCallback((city: string) => {
    setCityToUse(city);
    setCitySelectorVisible(false);
  }, [setCityToUse]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <SafeAreaView 
        style={styles.safeArea}
        edges={Platform.OS === 'android' ? ['bottom', 'left', 'right'] : ['top', 'bottom', 'left', 'right']}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.contentContainer}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <Icon name="chevron-left" size={20} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{screenTitle}</Text>
            </View>

            {/* Photo Upload Section */}
            <View style={styles.sectionWrapper}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    Photos {errors.images && <Text style={styles.errorText}>({errors.images})</Text>}
                  </Text>
                  <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                    Add up to 5 photos to showcase your item
                  </Text>
                </View>
                <View style={styles.photoCountContainer}>
                  <Text style={styles.photoCount}>
                    {images.length}/5
                  </Text>
                </View>
              </View>

              {renderPhotoGallery()}
            </View>

            {/* Sell/Rent Toggle Section */}
            <View style={styles.sectionWrapper}>
              {renderSectionHeader('Listing Type')}
              <View style={styles.toggleWrapper}>
                <View style={styles.toggleContainer}>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      { backgroundColor: isSell ? '#f7b305' : 'transparent' },
                    ]}
                    onPress={() => setIsSell(true)}
                  >
                    <Text style={[
                      styles.toggleText,
                      { color: isSell ? '#FFFFFF' : theme.colors.text },
                    ]}>
                      Sell
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      { backgroundColor: !isSell ? '#f7b305' : 'transparent' },
                    ]}
                    onPress={() => setIsSell(false)}
                  >
                    <Text style={[
                      styles.toggleText,
                      { color: !isSell ? '#FFFFFF' : theme.colors.text },
                    ]}>
                      Rent
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Item Details Section */}
            <View style={styles.sectionWrapper}>
              {renderSectionHeader('Item Details')}

              <TextInput
                label="Title"
                value={title}
                onChangeText={setTitle}
                placeholder="Enter item title"
                containerStyle={styles.inputContainer}
                inputStyle={Platform.OS === 'android' ? styles.androidInputStyle : {}}
                error={errors.title}
                maxLength={100}
              />

              {/* Type Dropdown */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: theme.colors.text }]}>
                  Type {errors.type && <Text style={styles.errorText}>({errors.type})</Text>}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.dropdown,
                    {
                      borderColor: errors.type ? '#e74c3c' : theme.colors.border,
                      backgroundColor: theme.colors.surface,
                      borderWidth: 1.5,
                    },
                    selectedType && { borderColor: '#f7b305', borderWidth: 2 },
                  ]}
                  onPress={() => setTypeModalVisible(true)}
                >
                  <Text style={[
                    styles.dropdownText,
                    {
                      color: selectedType ? theme.colors.text : theme.colors.textSecondary,
                      fontWeight: selectedType ? '600' : 'normal',
                    },
                  ]}>
                    {selectedType?.name || 'Select item type'}
                  </Text>
                  <Icon name="chevron-down" size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                {selectedType && (
                  <Text style={[styles.selectedSubcategoryNote, { color: '#f7b305' }]}>
                    {selectedType.name}
                  </Text>
                )}
              </View>

              {/* Subcategory Dropdown - Only shown if selected type has subcategories */}
              {selectedType && selectedType.subcategories && selectedType.subcategories.length > 0 && (
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>Subcategory</Text>
                  <TouchableOpacity
                    style={[
                      styles.dropdown,
                      {
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.surface,
                        borderWidth: 1.5,
                      },
                    ]}
                    onPress={() => setSubcategoryModalVisible(true)}
                  >
                    <Text style={[
                      styles.dropdownText,
                      {
                        color: selectedSubcategory ? theme.colors.text : theme.colors.textSecondary,
                        fontWeight: selectedSubcategory ? '500' : 'normal',
                      },
                    ]}>
                      {selectedSubcategory || `Select ${selectedType.name.toLowerCase()} subcategory`}
                    </Text>
                    <Icon name="chevron-down" size={16} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                  {selectedSubcategory && (
                    <Text style={[styles.selectedSubcategoryNote, { color: theme.colors.primary }]}>
                      {selectedType.name} → {selectedSubcategory}
                    </Text>
                  )}
                </View>
              )}

              {/* City Selection Dropdown */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: theme.colors.text }]}>
                  Listing Location
                </Text>
                <TouchableOpacity
                  style={[
                    styles.dropdown,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.surface,
                      borderWidth: 1.5,
                    },
                    cityToUse && { borderColor: '#f7b305', borderWidth: 2 },
                  ]}
                  onPress={() => setCitySelectorVisible(true)}
                >
                  <View style={styles.cityDropdownContent}>
                    <MaterialIcons name="location-on" size={18} color="#f7b305" style={styles.cityIcon} />
                    <Text style={[
                      styles.dropdownText,
                      {
                        color: cityToUse ? theme.colors.text : theme.colors.textSecondary,
                        fontWeight: cityToUse ? '500' : 'normal',
                      },
                    ]}>
                      {cityToUse || 'Select listing location'}
                    </Text>
                  </View>
                  <Icon name="chevron-down" size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                {cityToUse && (
                  <Text style={[styles.cityNote, { color: theme.colors.textSecondary }]}>
                    Your item will be listed in {cityToUse}
                  </Text>
                )}
              </View>

              <TextInput
                label="Description"
                value={description}
                onChangeText={setDescription}
                placeholder="Describe your item (condition, features, etc.)"
                multiline
                textAlignVertical="top"
                containerStyle={styles.textAreaContainer}
                inputStyle={Platform.OS === 'android' ? 
                  {...styles.textArea, ...styles.androidInputStyle} : 
                  styles.textArea}
                error={errors.description}
                maxLength={1000}
              />
            </View>

            {/* Pricing & Condition Section */}
            <View style={styles.sectionWrapper}>
              {renderSectionHeader('Pricing & Condition')}

              <TextInput
                label={`Price${isSell ? '' : ' (per day)'}`}
                value={price}
                onChangeText={setPrice}
                placeholder={`Enter price in $${isSell ? '' : ' per day'}`}
                keyboardType="numeric"
                containerStyle={styles.inputContainer}
                inputStyle={Platform.OS === 'android' ? styles.androidInputStyle : {}}
                error={errors.price}
                maxLength={12}
              />

              {/* Condition Dropdown */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: theme.colors.text }]}>
                  Condition {errors.condition && <Text style={styles.errorText}>({errors.condition})</Text>}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.dropdown,
                    {
                      borderColor: errors.condition ? '#e74c3c' : theme.colors.border,
                      backgroundColor: theme.colors.surface,
                      borderWidth: 1.5,
                    },
                  ]}
                  onPress={() => setConditionModalVisible(true)}
                >
                  <Text style={[
                    styles.dropdownText,
                    {
                      color: displayCondition ? theme.colors.text : theme.colors.textSecondary,
                      fontWeight: displayCondition ? '500' : 'normal',
                    },
                  ]}>
                    {selectedCondition?.name || 'Select item condition'}
                  </Text>
                  <Icon name="chevron-down" size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                {selectedCondition && (
                  <Text style={[styles.conditionDescription, { color: theme.colors.textSecondary }]}>
                    {selectedCondition.description}
                  </Text>
                )}
              </View>
            </View>

            {/* Post Button */}
            <PostButton />
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Type Selection Modal */}
      <Modal
        visible={typeModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setTypeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Select Item Type</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setTypeModalVisible(false)}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <Icon name="times" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={PRODUCT_TYPES}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderTypeOptionItem}
              initialNumToRender={6}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={true}
            />
          </View>
        </View>
      </Modal>

      {/* Subcategory Selection Modal */}
      {selectedType && selectedType.subcategories && selectedType.subcategories.length > 0 && (
        <Modal
          visible={subcategoryModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSubcategoryModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  Select {selectedType.name} Subcategory
                </Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setSubcategoryModalVisible(false)}
                  hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                >
                  <Icon name="times" size={22} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={selectedType.subcategories}
                keyExtractor={(item) => item}
                initialNumToRender={6}
                windowSize={5}
                removeClippedSubviews={true}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.optionItem, {
                      backgroundColor: selectedSubcategory === item ? theme.colors.primaryLight : 'transparent',
                    }]}
                    onPress={() => selectSubcategory(item)}
                  >
                    <Text style={[styles.optionText, { color: theme.colors.text }]}>{item}</Text>
                    {selectedSubcategory === item && (
                      <Icon name="check" size={16} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Condition Selection Modal */}
      <Modal
        visible={conditionModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setConditionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Select Condition</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setConditionModalVisible(false)}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <Icon name="times" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={PRODUCT_CONDITIONS}
              keyExtractor={(item) => item.id}
              initialNumToRender={6}
              windowSize={3}
              removeClippedSubviews={true}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.optionItem, {
                    backgroundColor: selectedCondition?.id === item.id ? theme.colors.primaryLight : 'transparent',
                  }]}
                  onPress={() => selectCondition(item)}
                >
                  <View style={styles.conditionOption}>
                    <Text style={[styles.optionText, { color: theme.colors.text }]}>{item.name}</Text>
                    <Text style={[styles.optionDescription, { color: theme.colors.textSecondary }]}>
                      {item.description}
                    </Text>
                  </View>
                  {selectedCondition?.id === item.id && (
                    <Icon name="check" size={16} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Photo Picker Modal */}
      <Modal
        visible={photoPickerModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={hidePhotoPickerModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.photoPickerModalContent, { backgroundColor: theme.colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add Photo</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={hidePhotoPickerModal}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <Icon name="times" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.photoPickerOptions}>
              <TouchableOpacity
                style={styles.photoPickerOption}
                onPress={handleCameraCapture}
              >
                <View style={[styles.photoPickerIconCircle, { backgroundColor: 'rgba(247, 179, 5, 0.1)' }]}>
                  <Icon name="camera" size={28} color="#f7b305" />
                </View>
                <Text style={[styles.photoPickerText, { color: theme.colors.text }]}>Camera</Text>
                <Text style={[styles.photoPickerSubtext, { color: theme.colors.textSecondary }]}>
                  Take and crop a photo
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.photoPickerOption}
                onPress={handleImageUpload}
              >
                <View style={[styles.photoPickerIconCircle, { backgroundColor: 'rgba(247, 179, 5, 0.1)' }]}>
                  <Icon name="image" size={28} color="#f7b305" />
                </View>
                <Text style={[styles.photoPickerText, { color: theme.colors.text }]}>Gallery</Text>
                <Text style={[styles.photoPickerSubtext, { color: theme.colors.textSecondary }]}>
                  Select and crop from photos
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* City Selector Modal */}
      <CitySelector
        isVisible={citySelectorVisible}
        onClose={() => setCitySelectorVisible(false)}
        onSelectCity={handleSelectCity}
        currentCity={cityToUse}
        defaultCity={user?.city || null}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  contentContainer: {
    flex: 1,
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 5 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 12,
    marginHorizontal: 0,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    backgroundColor: 'white',
    borderRadius: 14,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  backButton: {
    width: 35,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 5,
    ...Platform.select({
      android: {
        marginRight: 10,
      },
    }),
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: -0.3,
    justifyContent: 'center',
  },
  sectionWrapper: {
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    paddingTop: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 0,
        borderWidth: 1,
        borderColor: '#e0e0e0',
      },
    }),
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: SCREEN_WIDTH > 400 ? 18 : 17,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 2,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 18,
    opacity: 0.7,
  },
  photoCountContainer: {
    backgroundColor: '#f7b305',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 3,
    marginTop: 4,
  },
  photoCount: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  photoGalleryContainer: {
    marginTop: 4,
  },
  mainPhotoButton: {
    width: '100%',
    height: MAIN_PHOTO_HEIGHT,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  cameraIconOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(247, 179, 5, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#f7b305',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: {
        elevation: 0,
        borderWidth: 1,
        borderColor: '#e0e0e0',
      },
    }),
  },
  cameraIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(247, 179, 5, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(247, 179, 5, 0.3)',
    ...Platform.select({
      ios: {
        shadowColor: '#f7b305',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 0,
        borderWidth: 1,
        borderColor: '#e0e0e0',
      },
    }),
  },
  addImageIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    width: '100%',
  },
  mainPhotoText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  photoTip: {
    fontSize: 14,
  },
  photoUpgradeBadge: {
    marginTop: 12,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  photoUpgradeBadgeGradient: {
    flexDirection: 'row',
    paddingHorizontal: 2,
    paddingVertical: 0,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: SCREEN_WIDTH * 0.60, // Responsive width based on screen width instead of fixed percentage
  },
  photoUpgradeBadgeText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginRight: 10,
    ...Platform.select({
      ios: {
        fontSize: 14,
      },
    }),
  },
  mainPhotoWrapper: {
    width: '100%',
    height: MAIN_PHOTO_HEIGHT,
    borderRadius: 16,
    marginBottom: 14,
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 0,
        borderWidth: 1,
        borderColor: '#e0e0e0',
      },
    }),
  },
  mainPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  removeMainPhotoButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  mainPhotoLabel: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: '#f7b305',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  mainPhotoLabelText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  additionalPhotosContainer: {
    flexDirection: 'row',
    paddingBottom: 12,
  },
  thumbnailWrapper: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: 12,
    marginRight: 12,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'white',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  removeThumbnailButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  addThumbnailButton: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoTipsContainer: {
    marginTop: 14,
    marginBottom: 8,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(247, 179, 5, 0.2)',
    backgroundColor: 'rgba(247, 179, 5, 0.03)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  photoTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipIcon: {
    marginRight: 10,
  },
  photoTipText: {
    fontSize: 13,
    lineHeight: 18,
  },
  toggleWrapper: {
    alignItems: 'center',
    marginTop: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 3,
    width: '70%',
  },
  toggleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleText: {
    fontWeight: '600',
    fontSize: 15,
  },
  inputContainer: {
    marginBottom: 16,
    ...Platform.select({
      android: {
        shadowColor: 'transparent',
        elevation: 0,
      },
    }),
  },
  textAreaContainer: {
    marginBottom: 16,
    ...Platform.select({
      android: {
        shadowColor: 'transparent',
        elevation: 0,
      },
    }),
  },
  textArea: {
    height: 120,
    paddingTop: 12,
    fontSize: 15,
    textAlignVertical: 'top',
    borderRadius: 10,
  },
  button: {
    height: 54,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: SCREEN_WIDTH > 400 ? 16 : 15,
    fontWeight: 'bold',
    letterSpacing: 0.2,
  },
  label: {
    marginBottom: 8,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  dropdown: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {},
      android: {
        borderColor: 'rgba(0,0,0,0.15)',
        elevation: 0,
        backgroundColor: 'white',
        shadowColor: 'transparent',
      },
    }),
  },
  dropdownText: {
    fontSize: 15,
  },
  conditionDescription: {
    marginTop: 6,
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
    paddingHorizontal: 3,
    opacity: 0.7,
    ...Platform.select({
      android: {
        paddingHorizontal: 5,
        paddingVertical: 3,
        backgroundColor: 'rgba(247, 179, 5, 0.05)',
        borderRadius: 4,
      },
    }),
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '80%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: -0.3,
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    marginVertical: 2,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 13,
    marginTop: 3,
    opacity: 0.7,
    lineHeight: 17,
  },
  conditionOption: {
    flex: 1,
  },
  errorText: {
    color: '#e74c3c',
    fontWeight: 'normal',
    fontSize: 13,
  },
  uploadProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingIndicator: {
    marginRight: 10,
  },
  uploadingText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  iconContainer: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedOption: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  checkIcon: {
    marginLeft: 10,
  },
  selectedSubcategoryNote: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '500',
  },
  thumbnailButtonsContainer: {
    flexDirection: 'row',
  },
  photoPickerModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 30,
    maxHeight: '50%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  photoPickerOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    marginBottom: 30,
  },
  photoPickerOption: {
    alignItems: 'center',
    width: '45%',
    paddingVertical: 15,
    paddingHorizontal: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(247, 179, 5, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(247, 179, 5, 0.2)',
  },
  photoPickerIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#f7b305',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  photoPickerText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  photoPickerSubtext: {
    fontSize: 12,
    textAlign: 'center',
  },
  cityDropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cityIcon: {
    marginRight: 8,
  },
  cityNote: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  androidInputStyle: {
    backgroundColor: 'white',
    borderColor: 'rgba(0,0,0,0.15)',
    elevation: 0,
  },
});

export default PostingScreen;
