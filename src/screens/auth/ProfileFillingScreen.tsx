import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  BackHandler,
  DevSettings,
  Image,
  ActivityIndicator,
  Modal,
  TextInput as RNTextInput,
  Animated,
  Easing,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StatusBar,
  Linking,
  PermissionsAndroid,
  type Permission,
} from 'react-native';
import { ProfileFillingScreenProps } from '../../types/navigation.types';
import { useTheme } from '../../hooks';
import { useAuth } from '../../contexts';
import { Auth } from 'aws-amplify';
import { CommonActions } from '@react-navigation/native';
import { createUserProfile, UserProfileData, uploadFile } from '../../api/users';
import ImagePicker from 'react-native-image-crop-picker';
import LinearGradient from 'react-native-linear-gradient';
import Entypo from 'react-native-vector-icons/Entypo';
import collegeData from '../../../college_names.json';

// Destructure needed constants if direct access causes issues
const { PERMISSIONS, RESULTS } = PermissionsAndroid;

// Define a simple TextInput component to replace the missing import
interface CustomTextInputProps {
  label?: string;
  value: string | undefined;
  onChangeText?: ((text: string) => void) | undefined;
  placeholder?: string;
  editable?: boolean;
  containerStyle?: any;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad' | 'numeric' | 'email-address' | 'phone-pad';
}

const TextInput: React.FC<CustomTextInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  editable = true,
  containerStyle = {},
  keyboardType = 'default',
}) => {
  const { theme } = useTheme();

  return (
    <View style={[textInputStyles.inputContainer, containerStyle]}>
      {label && (
        <Text style={[textInputStyles.inputLabel, { color: theme.colors.text }]}>
          {label}
        </Text>
      )}
      <View style={[
        textInputStyles.inputWrapper,
        {
          borderColor: theme.colors.border,
          backgroundColor: editable ? theme.colors.background : 'rgba(240,240,240,0.3)',
        },
      ]}>
        <RNTextInput
          style={[
            textInputStyles.input,
            {
              color: theme.colors.text,
            },
          ]}
          value={value}
          onChangeText={onChangeText || (() => {})}
          placeholder={placeholder || ''}
          placeholderTextColor={theme.colors.placeholder || '#999'}
          editable={editable}
          keyboardType={keyboardType}
        />
      </View>
    </View>
  );
};

// Define styles for the TextInput component
const textInputStyles = StyleSheet.create({
  inputContainer: {
    marginBottom: 10,
    width: '100%',
  },
  inputLabel: {
    fontSize: 13,
    marginBottom: 4,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderWidth: Platform.OS === 'ios' ? 1 : 0.5,
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 1,
      },
      android: {
        elevation: 0,
        backgroundColor: '#fff',
        borderColor: 'rgba(224, 224, 224, 0.5)',
      },
    }),
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 14,
    fontSize: 14,
  },
});

// Define a simple LoadingOverlay component to replace the missing import
const LoadingOverlay: React.FC<{
  visible: boolean;
  steps?: Array<{ id: string; message: string }>;
  currentStep?: number;
  showProgressDots?: boolean;
}> = ({ visible, steps = [], currentStep = 0 }) => {
  const { theme } = useTheme();

  if (!visible) {return null;}

  const currentMessage = steps.length > 0 && currentStep < steps.length
    ? steps[currentStep].message
    : 'Loading...';

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.loadingOverlay}>
        <View style={styles.loadingModalContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingModalText, { color: theme.colors.text }]}>
            {currentMessage}
          </Text>

          {steps.length > 1 && (
            <View style={styles.progressDotsContainer}>
              {steps.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.progressDot,
                    {
                      backgroundColor: index <= currentStep
                        ? theme.colors.primary
                        : 'rgba(200,200,200,0.5)',
                    },
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

// Predefined product categories
const PRODUCT_CATEGORIES = [
  { id: '1', name: 'Electronics', icon: 'electronics' },
  { id: '2', name: 'Furniture', icon: 'furniture' },
  { id: '3', name: 'Auto', icon: 'auto' },
  { id: '4', name: 'Fashion', icon: 'fashion' },
  { id: '5', name: 'Sports', icon: 'sports' },
  { id: '6', name: 'Stationery', icon: 'stationery' },
  { id: '7', name: 'EventPass', icon: 'eventpass' },
];

const ProfileFillingScreen: React.FC<ProfileFillingScreenProps> = ({ route, navigation }) => {
  const { theme } = useTheme();
  const { refreshSession, updateUserInfo, isAuthenticated } = useAuth();
  const { email, username, phoneNumber, isAuthenticated: wasAuthenticated } = route.params;

  // State for form data
  const [fullName, _setFullName] = useState<string>(username || '');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [_selectedImageFile, _setSelectedImageFile] = useState<any>(null);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [_imageFileName, setImageFileName] = useState<string | null>(null);
  const [university, setUniversity] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [zipcode, setZipcode] = useState<string>('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [navigating, setNavigating] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<number>(0);

  // New state for university dropdown - changed to use modal approach
  const [showUniversityModal, setShowUniversityModal] = useState<boolean>(false);
  const [filteredUniversities, setFilteredUniversities] = useState<string[]>([]);

  // Constants for progress tracking and UI
  const minCategoriesRequired = 3;

  // State to track field completions
  const [_completionFlags, setCompletionFlags] = useState({
    university: false,
    city: false,
    zipcode: false,
    categories: false,
  });

  // Add animation values for the scroll indicator
  const scrollIndicatorY = useRef(new Animated.Value(0)).current;
  const scrollOpacity = useRef(new Animated.Value(1)).current;
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);

  // Setup scroll indicator animation
  useEffect(() => {
    if (showScrollIndicator) {
      // Start the bouncing animation for the scroll indicator
      Animated.loop(
        Animated.sequence([
          Animated.timing(scrollIndicatorY, {
            toValue: 10,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scrollIndicatorY, {
            toValue: 0,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }

    return () => {
      scrollIndicatorY.stopAnimation();
    };
  }, [showScrollIndicator, scrollIndicatorY]);

  // Function to handle scroll events
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollOffset = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const scrollViewHeight = event.nativeEvent.layoutMeasurement.height;

    // If user scrolled close to the bottom, hide the indicator
    if (scrollOffset + scrollViewHeight > contentHeight - 100) {
      setShowScrollIndicator(false);
      Animated.timing(scrollOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else if (!showScrollIndicator && scrollOffset < contentHeight - scrollViewHeight - 100) {
      // Show the indicator again if user scrolls back up
      setShowScrollIndicator(true);
      Animated.timing(scrollOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  // Update university selection handling
  // Modify the filter universities effect
  useEffect(() => {
    if (university.trim().length > 0) {
      const filtered = collegeData.college_names.filter(name =>
        name.toLowerCase().includes(university.toLowerCase())
      ).slice(0, 10); // Limit to 10 results for performance

      // Add "Other" option if it's not already in the filtered list
      if (filtered.length === 0 || !filtered.includes('Other')) {
        setFilteredUniversities([...filtered, 'Other']);
      } else {
        setFilteredUniversities(filtered);
      }
    } else {
      // Show some popular/suggested universities when input is empty
      setFilteredUniversities([...collegeData.college_names.slice(0, 9), 'Other']);
    }
  }, [university]);

  // Update completion flags when fields change
  useEffect(() => {
    setCompletionFlags({
      university: !!university.trim(),
      city: !!city.trim(),
      zipcode: !!zipcode.trim(),
      categories: selectedCategories.length > 0,
    });
  }, [university, city, zipcode, selectedCategories]);

  // Function to calculate completion percentage
  const calculateCompletionPercentage = () => {
    let progress = 0;

    // Profile image adds 20%
    if (profileImage) {progress += 20;}

    // Location fields add 30% total
    if (university) {progress += 10;}
    if (city) {progress += 10;}
    if (zipcode) {progress += 10;}

    // Categories add up to 50%
    progress += Math.min(selectedCategories.length, minCategoriesRequired) / minCategoriesRequired * 50;

    return Math.min(progress, 100);
  };

  // Handle university input change
  const handleUniversityChange = (text: string) => {
    setUniversity(text);
    // Always show the dropdown
    setShowUniversityModal(true);
  };

  // Handle selecting a university from the dropdown
  const selectUniversity = (name: string) => {
    setUniversity(name);
    setShowUniversityModal(false);
  };

  // Define loading steps
  const loadingSteps = useMemo(() => [
    { id: 'updating', message: 'Updating your profile...' },
    { id: 'success', message: 'Profile saved successfully!' },
    { id: 'preparing', message: 'Preparing your account...' },
    { id: 'navigating', message: 'Successfully created please login again!' },
  ], []);

  // Define gradient colors for progress bar
  const progressGradientColors = useMemo(() =>
    Platform.OS === 'android'
      ? ['#f7b305', '#f7b305'] // Use solid color on Android
      : ['#f7b305', '#f59000'], // Use consistent branding gradient on iOS
  []);

  // Log initial state for debugging
  useEffect(() => {
    console.log('ProfileFillingScreen mounted');
    console.log('Authentication state:', { isAuthenticated, wasAuthenticated });
    console.log('Route params:', { email, username });

    // Verify current authentication state
    const checkAuth = async () => {
      try {
        const user = await Auth.currentAuthenticatedUser();
        console.log('Current authenticated user:', user.username);
      } catch (error) {
        console.log('No authenticated user found');
      }
    };

    checkAuth();
  }, [isAuthenticated, wasAuthenticated, email, username]);

  // Update loading message based on step
  useEffect(() => {
    if (navigating && loadingStep < loadingSteps.length - 1) {
      const timer = setTimeout(() => {
        setLoadingStep(prev => prev + 1);
      }, 800); // Change message every 800ms

      return () => clearTimeout(timer);
    }
  }, [navigating, loadingStep, loadingSteps.length]);

  // Block hardware back button to prevent navigation issues
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isAuthenticated) {
        return true; // Prevent going back if authenticated
      }
      return false;
    });

    return () => backHandler.remove();
  }, [isAuthenticated]);

  useEffect(() => {
    if (wasAuthenticated) {
      // User is already authenticated from previous step
      console.log('User authenticated from previous step');
    }
  }, [wasAuthenticated]);

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }
    if (!university.trim()) {
      Alert.alert('Error', 'Please enter your university');
      return;
    }
    if (!city.trim()) {
      Alert.alert('Error', 'Please enter your city');
      return;
    }
    if (!zipcode.trim()) {
      Alert.alert('Error', 'Please enter your zipcode');
      return;
    }
    if (selectedCategories.length === 0) {
      Alert.alert('Error', 'Please select at least one product category');
      return;
    }

    setLoading(true);
    setLoadingStep(0);
    try {
      // Just updating the name attribute in Cognito
      const user = await Auth.currentAuthenticatedUser();
      await Auth.updateUserAttributes(user, {
        'name': fullName.trim(),
      });

      // Prepare profile data for API
      const profileData: UserProfileData = {
        email,
        name: fullName.trim(),
        university: university.trim(),
        city: city.trim(),
        zipcode: zipcode.trim(),
        productsCategoriesIntrested: selectedCategories,
        state: '',
        userRating: '0', // Can be filled in later
        productsListed: '0',
        productssold: '0',
        productswishlist: [],
        mobile: phoneNumber,
        userphoto: profileImage || undefined,
      };

      console.log('Sending profile data to API:', profileData);

      // Update user info in the auth context
      updateUserInfo({
        name: fullName.trim(),
        university: university.trim(),
        email,
      });

      // Make API call to save profile data
      try {
        const response = await createUserProfile(profileData);
        console.log('Profile created successfully:', response);
      } catch (apiError: any) {
        console.error('API error when creating profile:', apiError);
        // Continue with app flow even if API fails - we can sync later
        // But log the error for tracking
      }

      // Explicitly set auth state to authenticated
      await refreshSession();
      // Show loading indicator and navigate to home
      setLoading(false);
      setNavigating(true);
      // Navigate to home without showing alert
      try {
        // Make sure our authentication state is properly set
        await refreshSession();
        // Proceed with staged navigation
        setTimeout(() => {
          setLoadingStep(1); // Success message
          setTimeout(() => {
            setLoadingStep(2); // Preparing account
            setTimeout(() => {
              setLoadingStep(3); // Taking to home
              // Final delay before navigation
              setTimeout(() => {
                // In development, use DevSettings to reload the app
                if (__DEV__ && DevSettings) {
                  console.log('Reloading app to update navigation...');
                  DevSettings.reload();
                } else {
                  // Navigate to SignIn Screen for security
                  console.log('Navigating to SignIn screen...');
                  navigation.dispatch(
                    CommonActions.reset({
                      index: 0,
                      routes: [{ name: 'SignIn' }],
                    })
                  );
                }
              }, 600);
            }, 600);
          }, 800);
        }, 100);

      } catch (error) {
        console.error('Navigation error:', error);
        setNavigating(false);
        Alert.alert(
          'Navigation Issue',
          'Please restart the app to go to the home screen.'
        );
      }

    } catch (error: any) {
      console.log('Error updating profile:', error);
      setLoading(false);
      Alert.alert('Error', error.message || 'Failed to update profile');
    }
  };

  const handleUploadProfilePicture = async () => {
    if (uploadingImage) {return;}

    setUploadingImage(true);
    console.log('[ProfileFillingScreen] Starting image selection with cropping');

    try {
      // --- Android Permission Check ---
      if (Platform.OS === 'android') {
        const apiLevel = Platform.Version;
        let permissionToRequest: Permission;

        if (apiLevel >= 33) { // Android 13+ uses READ_MEDIA_IMAGES
          permissionToRequest = PERMISSIONS.READ_MEDIA_IMAGES;
          console.log('[ProfileFillingScreen] Requesting READ_MEDIA_IMAGES permission (Android 13+)');
        } else { // Older Android versions use READ_EXTERNAL_STORAGE
          permissionToRequest = PERMISSIONS.READ_EXTERNAL_STORAGE;
          console.log('[ProfileFillingScreen] Requesting READ_EXTERNAL_STORAGE permission (Android < 13)');
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
            console.log('[ProfileFillingScreen] Photo library permission denied by user');
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
            return;
          }
          console.log('[ProfileFillingScreen] Photo library permission granted by user');
        } else {
          console.log('[ProfileFillingScreen] Photo library permission was already granted');
        }
      }
      // --- End Android Permission Check ---

      // Only modify StatusBar on Android *after* potential permission dialogs
      if (Platform.OS === 'android') {
        StatusBar.setTranslucent(false);
        StatusBar.setBackgroundColor('#000000');
        StatusBar.setBarStyle('light-content');
      }
      
      // Use react-native-image-crop-picker for selecting and cropping with improved UI
      const image = await ImagePicker.openPicker({
        width: 500,
        height: 500,
        cropping: true,
        cropperCircleOverlay: true, // Make crop overlay circular for profile picture
        compressImageQuality: 0.8,
        mediaType: 'photo',
        cropperToolbarTitle: 'Edit Profile Photo',
        cropperStatusBarColor: '#000000',
        cropperToolbarColor: '#000000',
        cropperToolbarWidgetColor: '#ffffff',
        cropperActiveWidgetColor: '#f7b305', // Using the app's primary yellow color
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
          cropperTintColor: '#f7b305',
          cropperDisableFreeStyleCrop: true, // Force aspect ratio to be square
          cropperToolbarIconsColor: '#ffffff',
          forceJpg: true,
          showVerticallyScrollingCropArea: true,
          cropperStatusBarColor: '#000000',
          cropperToolbarHeight: 88,
          cropperButtonsHorizontalMargin: 16,
          cropperActiveControlsWidgetColor: '#f7b305',
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

      console.log('[ProfileFillingScreen] Selected and cropped image:', image);

      if (!image.path) {
        console.error('[ProfileFillingScreen] Selected image has no path');
        Alert.alert('Error', 'Failed to get image');
        return;
      }

      // Check file size (limit to 5MB)
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
      if (image.size && image.size > MAX_FILE_SIZE) {
        console.warn('[ProfileFillingScreen] Image too large:', image.size);
        Alert.alert(
          'Image Too Large',
          'The selected image exceeds the 5MB size limit. Please choose a smaller image or compress this one.',
          [
            { text: 'OK', style: 'default' },
          ]
        );
        return;
      }

      // Create form data for upload
      const formData = new FormData();
      formData.append('file', {
        uri: image.path,
        type: image.mime || 'image/jpeg',
        name: `profile_${Date.now()}.jpg`,
      } as any);

      // Upload the image
      try {
        const uploadResponse = await uploadFile(formData);
        if (uploadResponse && uploadResponse.fileName) {
          const imageUrl = `https://trustedproductimages.s3.us-east-2.amazonaws.com/${uploadResponse.fileName}`;
          setImageFileName(uploadResponse.fileName);
          setProfileImage(imageUrl);
          Alert.alert('Success', 'Profile picture uploaded successfully');
        } else {
          Alert.alert('Error', 'Failed to upload profile picture');
        }
      } catch (uploadError: any) {
        console.error('[ProfileFillingScreen] Upload error:', uploadError);
        Alert.alert('Error', uploadError.message || 'Failed to upload profile picture');
      }

    } catch (error: any) {
      // Check if user canceled the image picker
      if (error.toString().includes('cancelled') || error.toString().includes('canceled')) {
        console.log('[ProfileFillingScreen] User canceled image picker');
        return;
      }
      
      console.error('[ProfileFillingScreen] Error selecting image:', error);
      
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
      // Reset StatusBar on Android
      if (Platform.OS === 'android') {
        StatusBar.setTranslucent(true);
        StatusBar.setBackgroundColor('transparent');
        StatusBar.setBarStyle('dark-content');
      }
      setUploadingImage(false); // Ensure loading state is reset
    }
  };

  const toggleCategorySelection = (categoryId: string) => {
    // Find the category by ID
    const category = PRODUCT_CATEGORIES.find(cat => cat.id === categoryId);
    if (!category) {return;}

    // Use the category name in lowercase for the API
    const categoryNameLowerCase = category.name.toLowerCase();

    setSelectedCategories(prevSelected => {
      // Check if the category name is already in the array
      if (prevSelected.includes(categoryNameLowerCase)) {
        return prevSelected.filter(name => name !== categoryNameLowerCase);
      } else {
        return [...prevSelected, categoryNameLowerCase];
      }
    });
  };

  const renderCategoryItem = ({ item }: { item: typeof PRODUCT_CATEGORIES[0] }) => {
    // Check if this category name (in lowercase) is in selectedCategories
    const isSelected = selectedCategories.includes(item.name.toLowerCase());

    return (
      <TouchableOpacity
        style={[
          styles.categoryItem,
          {
            borderColor: isSelected ?
              Platform.OS === 'ios' ? theme.colors.primary : 'rgba(247, 179, 5, 0.3)'
              : Platform.OS === 'ios' ? theme.colors.border : 'rgba(220, 220, 220, 0.5)',
            backgroundColor: isSelected ?
              Platform.OS === 'ios' ? `${theme.colors.primary}10` : 'rgba(247, 179, 5, 0.05)'
              : theme.colors.background,
            transform: [{ scale: isSelected ? (Platform.OS === 'ios' ? 1.02 : 1.0) : 1 }],
          },
        ]}
        onPress={() => toggleCategorySelection(item.id)}
        activeOpacity={0.7}
      >
        <View
          style={styles.categoryIconContainer}
        >
          <View
            style={[
              styles.categoryIconCircle,
              { backgroundColor: isSelected ? theme.colors.primary : '#f0f0f0' },
            ]}
          >
            <Entypo
              name={getCategoryIcon(item.icon)}
              size={16}
              color={isSelected ? '#fff' : theme.colors.secondary}
            />
          </View>
        </View>

        <Text
          style={[
            styles.categoryText,
            { color: isSelected ? theme.colors.primary : theme.colors.text },
          ]}
          numberOfLines={2}
        >
          {item.name}
        </Text>

        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Entypo name="check" size={14} color={theme.colors.primary} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const getCategoryIcon = (iconName: string): string => {
    switch (iconName) {
      case 'electronics':
        return 'modern-mic';
      case 'furniture':
        return 'home';
      case 'auto':
        return 'drive';
      case 'fashion':
        return 'shopping-bag';
      case 'sports':
        return 'creative-commons-attribution';
      case 'stationery':
        return 'pencil';
      case 'eventpass':
        return 'ticket';
      default:
        return 'book';
    }
  };

  const renderGradientButton = (text: string, onPress: () => void, disabled: boolean = false) => {
    return (
      <TouchableOpacity
        style={styles.buttonWrapper}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={
            disabled
              ? ['rgba(150,150,150,0.5)', 'rgba(120,120,120,0.8)']
              : [theme.colors.primary, theme.colors.primaryDark || '#0055b3']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.button}
        >
          <Text style={[styles.buttonText, { color: theme.colors.buttonText }]}>
            {text}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      {/* Use the new LoadingOverlay component */}
      <LoadingOverlay
        visible={navigating}
        steps={loadingSteps}
        currentStep={loadingStep}
        showProgressDots={true}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.contentContainer}>
          <View style={styles.headerContainer}>
            <Text style={[styles.title, { color: theme.colors.primary }]}>Welcome, {fullName}!</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Complete your profile to personalize your experience
            </Text>
          </View>

          <View style={styles.profilePicContainer}>
            <View style={styles.profileImageWrapper}>
              {profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  style={styles.profileImage}
                  resizeMode="cover"
                />
              ) : (
                Platform.OS === 'android' ? (
                  <View style={styles.profilePicPlaceholder}>
                    <Text style={[styles.profilePicText, { color: '#f7b305' }]}>
                      {fullName ? fullName.charAt(0).toUpperCase() : 'K'}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.profilePicPlaceholder, { backgroundColor: theme.colors.primary + '20' }]}>
                    <Text style={[styles.profilePicText, { color: theme.colors.primary }]}>
                      {fullName ? fullName.charAt(0).toUpperCase() : 'K'}
                    </Text>
                  </View>
                )
              )}

              <TouchableOpacity
                style={styles.cameraIconContainer}
                onPress={handleUploadProfilePicture}
                disabled={uploadingImage}
              >
                <View style={styles.cameraIcon}>
                  <Entypo name="camera" size={16} color="#FFF" />
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.uploadButton, {
                backgroundColor: '#f7b305',
                paddingVertical: 6,
                paddingHorizontal: 16,
                borderRadius: 16,
                alignItems: 'center',
                ...Platform.select({
                  ios: {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                  },
                  android: {
                    elevation: 3,
                  },
                }),
              }]}
              onPress={handleUploadProfilePicture}
              disabled={uploadingImage}
            >
              <Text style={[styles.uploadButtonText, {
                color: '#fff',
                fontWeight: '700',
                fontSize: 12,
              }]}>
                {uploadingImage ? 'Uploading...' : 'Add Profile Picture'}
              </Text>
            </TouchableOpacity>

            <View style={styles.userInfoContainer}>
              <View style={styles.userInfoItem}>
                <Entypo name="mail" size={16} color={theme.colors.secondary} style={styles.userInfoIcon} />
                <Text style={styles.userInfoText}>{email}</Text>
              </View>
              <View style={styles.userInfoItem}>
                <Entypo name="phone" size={16} color={theme.colors.secondary} style={styles.userInfoIcon} />
                <Text style={styles.userInfoText}>{phoneNumber}</Text>
              </View>
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>Location Information</Text>

            <View style={styles.inputRow}>
              <View style={styles.inputIconContainer}>
                <View style={[styles.inputIcon, { backgroundColor: university ? theme.colors.primary : 'rgba(0,0,0,0.05)' }]}>
                  <Entypo name="graduation-cap" size={20} color={university ? '#fff' : theme.colors.secondary} />
                </View>
              </View>
              <View style={styles.inputContent}>
                <Text style={[textInputStyles.inputLabel, { color: theme.colors.text }]}>
                  University
                </Text>
                <View style={styles.universityContainer}>
                  <View style={styles.universityInputWrapper}>
                    <RNTextInput
                      style={[styles.input, { color: theme.colors.text }]}
                      value={university}
                      onChangeText={handleUniversityChange}
                      placeholder="Search for your university"
                      placeholderTextColor={theme.colors.placeholder || '#999'}
                      editable={false} // Make input non-editable
                      onTouchStart={() => setShowUniversityModal(true)} // Show dropdown on touch
                    />
                    <TouchableOpacity
                      style={styles.universityDropdownButton}
                      onPress={() => setShowUniversityModal(true)}
                    >
                      <Entypo name="chevron-down" size={18} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {/* Simple dropdown list that appears beneath the input */}
                  {showUniversityModal && (
                    <View style={[styles.simpleSuggestionsList, { backgroundColor: theme.colors.background }]}>
                      <View style={styles.searchInputContainer}>
                        <RNTextInput
                          style={[styles.searchInput, { color: theme.colors.text }]}
                          placeholder="Type to search universities..."
                          placeholderTextColor={theme.colors.placeholder || '#999'}
                          onChangeText={handleUniversityChange}
                          value={university}
                          autoFocus={true}
                        />
                      </View>

                      {filteredUniversities.length > 0 ? (
                        <ScrollView
                          nestedScrollEnabled={true}
                          style={{maxHeight: 250}}
                          keyboardShouldPersistTaps="handled"
                        >
                          {filteredUniversities.map((item) => (
                            <TouchableOpacity
                              key={item}
                              style={styles.suggestionItem}
                              onPress={() => selectUniversity(item)}
                            >
                              <Text style={[styles.suggestionText, { color: theme.colors.text }]} numberOfLines={1}>
                                {item}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      ) : (
                        <Text style={[styles.emptyMessage, { color: theme.colors.textSecondary }]}>
                          No universities found. Please select "Other".
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputIconContainer}>
                <View style={[styles.inputIcon, { backgroundColor: city ? theme.colors.primary : 'rgba(0,0,0,0.05)' }]}>
                  <Entypo name="location" size={20} color={city ? '#fff' : theme.colors.secondary} />
                </View>
              </View>
              <View style={styles.inputContent}>
                <TextInput
                  label="City"
                  value={city}
                  onChangeText={setCity}
                  placeholder="Enter your city"
                  containerStyle={styles.inputContainer}
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputIconContainer}>
                <View style={[styles.inputIcon, { backgroundColor: zipcode ? theme.colors.primary : 'rgba(0,0,0,0.05)' }]}>
                  <Entypo name="location-pin" size={20} color={zipcode ? '#fff' : theme.colors.secondary} />
                </View>
              </View>
              <View style={styles.inputContent}>
                <TextInput
                  label="Zipcode"
                  value={zipcode}
                  onChangeText={setZipcode}
                  placeholder="Enter your zipcode"
                  keyboardType="numeric"
                  containerStyle={styles.inputContainer}
                />
              </View>
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>Your Interests</Text>
            <Text style={styles.helperText}>
              Select categories that interest you to personalize your experience
            </Text>

            <View style={styles.categoriesContainer}>
              <View style={styles.categoriesGrid}>
                {PRODUCT_CATEGORIES.map((item) => (
                  <View key={item.id} style={styles.categoryItemWrapper}>
                    {renderCategoryItem({item})}
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <LinearGradient
                  colors={progressGradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.progressBar,
                    { width: `${calculateCompletionPercentage()}%` },
                  ]}
                />
              </View>
              <Text style={styles.helperText}>
                {selectedCategories.length < minCategoriesRequired
                  ? `Select at least ${minCategoriesRequired} categories to continue`
                  : `${selectedCategories.length} categories selected`}
              </Text>
            </View>
          </View>

          {renderGradientButton(
            loading ? 'Processing...' : 'Complete Profile',
            handleSubmit,
            loading || navigating
          )}
        </View>
      </ScrollView>

      {/* Scroll indicator */}
      <Animated.View
        style={[
          styles.scrollIndicator,
          {
            transform: [{ translateY: scrollIndicatorY }],
            opacity: scrollOpacity,
          },
        ]}
      >
        <View style={styles.scrollIndicatorLine} />
        <Text style={styles.scrollIndicatorText}>Scroll for more</Text>
        <Entypo name="chevron-down" size={20} color="#666" />
      </Animated.View>

      {/* Premium corner decorative elements */}
      <View style={[styles.cornerDecoration, styles.topLeftCorner]} />
      <View style={[styles.cornerDecoration, styles.bottomRightCorner]} />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  contentContainer: {
    padding: 20,
    flex: 1,
    minHeight: '100%',
  },
  headerContainer: {
    marginTop: 40,
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
    maxWidth: '80%',
  },
  formSection: {
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(240,240,240,0.8)',
      },
      android: {
        elevation: 1,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderWidth: 0.2,
        borderColor: 'rgba(230,230,230,0.5)',
      },
    }),
  },
  formSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
    textAlign: 'center',
  },
  profilePicContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImageWrapper: {
    position: 'relative',
    marginBottom: 8,
    ...Platform.select({
      android: {
        padding: 2,
      },
    }),
  },
  profilePicPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 0,
        backgroundColor: 'rgba(247, 179, 5, 0.08)',
        borderWidth: 0.2,
        borderColor: 'rgba(247, 179, 5, 0.2)',
      },
    }),
  },
  profilePicText: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    ...Platform.select({
      android: {
        bottom: 2,
        right: 2,
      },
    }),
  },
  cameraIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 0,
        backgroundColor: '#007AFF',
        borderWidth: 0,
      },
    }),
  },
  uploadButton: {
    marginTop: 8,
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  uploadButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  categoriesContainer: {
    marginVertical: 6,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryItemWrapper: {
    width: '48%',
    marginBottom: 8,
    ...Platform.select({
      android: {
        marginBottom: 6,
        marginHorizontal: 1,
      },
    }),
  },
  categoryItem: {
    flex: 1,
    margin: 4,
    padding: 10,
    borderRadius: 12,
    minHeight: 68,
    justifyContent: 'flex-start',
    alignItems: 'center',
    flexDirection: 'row',
    ...Platform.select({
      ios: {
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
        shadowColor: 'transparent',
        backgroundColor: '#fff',
        borderWidth: 0.2,
        borderColor: 'rgba(220, 220, 220, 0.5)',
      },
    }),
    position: 'relative',
  },
  categoryIconContainer: {
    marginRight: 8,
  },
  categoryIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 1,
      },
      android: {
        elevation: 0,
        backgroundColor: '#fff',
        borderWidth: 0.2,
        borderColor: 'rgba(220, 220, 220, 0.5)',
      },
    }),
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  buttonWrapper: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
        backgroundColor: '#fff',
      },
    }),
    marginTop: 8,
    marginBottom: 24,
  },
  button: {
    width: '100%',
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    ...Platform.select({
      android: {
        borderWidth: 0,
      },
    }),
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingModalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '80%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  loadingModalText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },
  progressDotsContainer: {
    flexDirection: 'row',
    marginTop: 16,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  cornerDecoration: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.08,
    backgroundColor: '#FFB347',
  },
  topLeftCorner: {
    top: -50,
    left: -50,
  },
  bottomRightCorner: {
    bottom: -50,
    right: -50,
  },
  userInfoContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  userInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  userInfoIcon: {
    marginRight: 8,
  },
  userInfoText: {
    fontSize: 14,
  },
  progressContainer: {
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 16,
    padding: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 0,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        backgroundColor: 'rgba(255,255,255,0.8)',
        padding: 10,
      },
    }),
  },
  progressTrack: {
    height: 14,
    backgroundColor: 'rgba(200,200,200,0.5)',
    borderRadius: 7,
    marginBottom: 8,
    ...Platform.select({
      android: {
        backgroundColor: 'rgba(230,230,230,0.8)',
        height: 12,
      },
    }),
  },
  progressBar: {
    height: '100%',
    borderRadius: 7,
    ...Platform.select({
      android: {
        elevation: 0,
      },
    }),
  },
  progressLabelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 14,
  },
  helperText: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    marginTop: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  inputIconContainer: {
    marginRight: 12,
    marginTop: 25,
  },
  inputIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 1,
      },
      android: {
        elevation: 0,
        borderWidth: 1,
        borderColor: '#e0e0e0',
      },
    }),
  },
  inputContent: {
    flex: 1,
  },
  universityContainer: {
    position: 'relative',
  },
  universityInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderWidth: Platform.OS === 'ios' ? 1 : 0.5,
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 1,
      },
      android: {
        elevation: 0,
        backgroundColor: '#fff',
        borderColor: 'rgba(224, 224, 224, 0.5)',
      },
    }),
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 14,
    fontSize: 14,
  },
  simpleSuggestionsList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    padding: 8,
    zIndex: 1000,
    backgroundColor: 'white',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  suggestionItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  suggestionText: {
    fontSize: 14,
  },
  universityDropdownButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInputContainer: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    marginBottom: 8,
  },
  searchInput: {
    height: 36,
    paddingHorizontal: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    paddingLeft: 10,
  },
  emptyMessage: {
    padding: 20,
    textAlign: 'center',
    fontSize: 14,
  },
  scrollIndicator: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  scrollIndicatorText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginVertical: 4,
  },
  scrollIndicatorLine: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    marginBottom: 4,
  },
});

export default ProfileFillingScreen;
