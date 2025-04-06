import React, { useState, useEffect, useMemo } from 'react';
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
  TextInput as RNTextInput
} from 'react-native';
import { ProfileFillingScreenProps } from '../../types/navigation.types';
import { useTheme } from '../../hooks';
import { useAuth } from '../../contexts';
import { Auth } from 'aws-amplify';
import { CommonActions } from '@react-navigation/native';
import { createUserProfile, UserProfileData, uploadFile } from '../../api/users';
import { launchImageLibrary } from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import Entypo from 'react-native-vector-icons/Entypo';

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
  keyboardType = 'default'
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
          backgroundColor: editable ? theme.colors.background : 'rgba(240,240,240,0.3)'
        }
      ]}>
        <RNTextInput
          style={[
            textInputStyles.input,
            { 
              color: theme.colors.text,
            }
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
    borderWidth: 1,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 1,
    elevation: 1,
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
  
  if (!visible) return null;
  
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
                    }
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
  { id: '7', name: 'EventPass', icon: 'eventpass' }
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
  
  // Constants for progress tracking and UI
  const minCategoriesRequired = 3;
  const progressGradient = [theme.colors.primary, theme.colors.secondary || '#4a90e2'];
  
  // State to track field completions
  const [_completionFlags, setCompletionFlags] = useState({
    university: false,
    city: false,
    zipcode: false,
    categories: false,
  });

  // Update completion flags when fields change
  useEffect(() => {
    setCompletionFlags({
      university: !!university.trim(),
      city: !!city.trim(),
      zipcode: !!zipcode.trim(),
      categories: selectedCategories.length > 0
    });
  }, [university, city, zipcode, selectedCategories]);

  // Function to calculate completion percentage
  const calculateCompletionPercentage = () => {
    let progress = 0;
    
    // Profile image adds 20%
    if (profileImage) progress += 20;
    
    // Location fields add 30% total
    if (university) progress += 10;
    if (city) progress += 10;
    if (zipcode) progress += 10;
    
    // Categories add up to 50%
    progress += Math.min(selectedCategories.length, minCategoriesRequired) / minCategoriesRequired * 50;
    
    return Math.min(progress, 100);
  };

  // Define loading steps
  const loadingSteps = useMemo(() => [
    { id: 'updating', message: 'Updating your profile...' },
    { id: 'success', message: 'Profile saved successfully!' },
    { id: 'preparing', message: 'Preparing your account...' },
    { id: 'navigating', message: 'Taking you to home screen...' }
  ], []);
  
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
        'name': fullName.trim()
      });
      
      // Prepare profile data for API
      const profileData: UserProfileData = {
        email,
        name: fullName.trim(),
        university: university.trim(),
        city: city.trim(),
        zipcode: zipcode.trim(),
        productsCategoriesIntrested: selectedCategories,
        state: '', // Can be filled in later
        productsListed: "0",
        productssold: "0",
        productswishlist: [],
        mobile: phoneNumber,
        userphoto: profileImage || undefined
      };
      
      console.log('Sending profile data to API:', profileData);
      
      // Update user info in the auth context
      updateUserInfo({
        name: fullName.trim(),
        university: university.trim(),
        email
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
                  // Navigate to Main screen instead of SignIn
                  console.log('Navigating to Main screen...');
                  navigation.dispatch(
                    CommonActions.reset({
                      index: 0,
                      routes: [{ name: 'Main' }],
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

  const handleUploadProfilePicture = () => {
    if (uploadingImage) return;
    
    setUploadingImage(true);
    console.log('Starting image picker');
    
    const options = {
      mediaType: 'photo' as const,
      maxWidth: 500,
      maxHeight: 500,
      quality: 1 as const,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        setUploadingImage(false);
        return;
      }

      if (response.errorCode) {
        console.error('ImagePicker Error: ', response.errorMessage);
        Alert.alert('Error', 'Image picker error: ' + (response.errorMessage || 'unknown error'));
        setUploadingImage(false);
        return;
      }

      if (!response.assets || response.assets.length === 0) {
        Alert.alert('Error', 'No image was selected');
        setUploadingImage(false);
        return;
      }

      const selectedAsset = response.assets[0];
      if (!selectedAsset.uri) {
        Alert.alert('Error', 'Selected image has no URI');
        setUploadingImage(false);
        return;
      }

      // Create form data for upload
      const formData = new FormData();
      formData.append('file', {
        uri: selectedAsset.uri,
        type: selectedAsset.type || 'image/jpeg',
        name: selectedAsset.fileName || 'profile_image.jpg',
      });

      // Upload the image
      uploadFile(formData)
        .then((uploadResponse) => {
          if (uploadResponse && uploadResponse.fileName) {
            const imageUrl = `https://trustedproductimages.s3.us-east-2.amazonaws.com/${uploadResponse.fileName}`;
            setImageFileName(uploadResponse.fileName);
            setProfileImage(imageUrl);
            Alert.alert('Success', 'Profile picture uploaded successfully');
          } else {
            Alert.alert('Error', 'Failed to upload profile picture');
          }
        })
        .catch((error) => {
          console.error('Upload error:', error);
          Alert.alert('Error', error.message || 'Failed to upload profile picture');
        })
        .finally(() => {
          setUploadingImage(false);
        });
    });
  };

  const toggleCategorySelection = (categoryId: string) => {
    setSelectedCategories(prevSelected => {
      if (prevSelected.includes(categoryId)) {
        return prevSelected.filter(id => id !== categoryId);
      } else {
        return [...prevSelected, categoryId];
      }
    });
  };

  const renderCategoryItem = ({ item }: { item: typeof PRODUCT_CATEGORIES[0] }) => {
    const isSelected = selectedCategories.includes(item.id);
    
    return (
      <TouchableOpacity
        style={[
          styles.categoryItem,
          {
            borderColor: isSelected ? theme.colors.primary : theme.colors.border,
            backgroundColor: isSelected ? `${theme.colors.primary}10` : theme.colors.background,
            transform: [{ scale: isSelected ? 1.02 : 1 }],
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
              { backgroundColor: isSelected ? theme.colors.primary : '#f0f0f0' }
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
            { color: isSelected ? theme.colors.primary : theme.colors.text }
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
      
      <ScrollView showsVerticalScrollIndicator={false}>
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
                <View style={[styles.profilePicPlaceholder, { backgroundColor: theme.colors.primary + '20' }]}>
                  <Text style={[styles.profilePicText, { color: theme.colors.primary }]}>
                    {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
                  </Text>
                </View>
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
              style={[styles.uploadButton, { backgroundColor: theme.colors.primaryDark || '#0055b3' }]}
              onPress={handleUploadProfilePicture}
              disabled={uploadingImage}
            >
              <Text style={[styles.uploadButtonText, { color: theme.colors.buttonText }]}>
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
                <TextInput
                  label="University"
                  value={university}
                  onChangeText={setUniversity}
                  placeholder="Enter your university"
                  containerStyle={styles.inputContainer}
                />
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
                  colors={progressGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.progressBar,
                    { width: `${calculateCompletionPercentage()}%` }
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(240,240,240,0.8)',
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
  },
  profilePicPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profilePicText: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  cameraIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  uploadButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginTop: 4,
  },
  uploadButtonText: {
    fontSize: 13,
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
  },
  categoryItem: {
    flex: 1,
    margin: 4,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 68,
    justifyContent: 'flex-start',
    alignItems: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 1,
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
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  progressTrack: {
    height: 14,
    backgroundColor: 'rgba(200,200,200,0.5)',
    borderRadius: 7,
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 7,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 1,
  },
  inputContent: {
    flex: 1,
  },
});

export default ProfileFillingScreen; 
