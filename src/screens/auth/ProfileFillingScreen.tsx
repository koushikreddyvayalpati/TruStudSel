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
  FlatList
} from 'react-native';
import { ProfileFillingScreenProps } from '../../types/navigation.types';
import { useTheme } from '../../hooks';
import { useAuth } from '../../contexts';
import { TextInput, LoadingOverlay } from '../../components/common';
import { Auth } from 'aws-amplify';
import { CommonActions } from '@react-navigation/native';
import { createUserProfile, UserProfileData } from '../../api/users';

// Predefined product categories
const PRODUCT_CATEGORIES = [
  { id: '1', name: 'Electronics' },
  { id: '2', name: 'Clothing' },
  { id: '3', name: 'Books & Education' },
  { id: '4', name: 'Home & Furniture' },
  { id: '5', name: 'Sports & Outdoors' },
  { id: '6', name: 'Beauty & Personal Care' },
  { id: '7', name: 'Food & Beverages' },
  { id: '8', name: 'Toys & Games' }
];

const ProfileFillingScreen: React.FC<ProfileFillingScreenProps> = ({ route, navigation }) => {
  const { theme } = useTheme();
  const { refreshSession, updateUserInfo, isAuthenticated } = useAuth();
  const { email, username, isAuthenticated: wasAuthenticated } = route.params;
  
  const [fullName, _setFullName] = useState(username || '');
  const [university, setUniversity] = useState('');
  const [city, setCity] = useState('');
  const [zipcode, setZipcode] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  
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
        ProductsCategoriesIntrested: selectedCategories,
        state: '', // Can be filled in later
        productsListed: "0",
        productssold: "0",
        productswishlist: []
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
    // Implement profile picture upload functionality
    Alert.alert(
      'Upload Profile Picture', 
      'Profile picture upload feature will be implemented in future updates.'
    );
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
          isSelected && { backgroundColor: theme.colors.primary }
        ]}
        onPress={() => toggleCategorySelection(item.id)}
      >
        <Text 
          style={[
            styles.categoryText, 
            isSelected && { color: theme.colors.buttonText }
          ]}
        >
          {item.name}
        </Text>
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
          <Text style={[styles.title, { color: theme.colors.primary }]}>You're Almost Done</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Please fill in the following details
          </Text>
          
          <View style={styles.profilePicContainer}>
            <View style={[styles.profilePicPlaceholder, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.profilePicText, { color: theme.colors.textSecondary }]}>
                {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.uploadButton, { backgroundColor: theme.colors.secondary }]}
              onPress={handleUploadProfilePicture}
            >
              <Text style={[styles.uploadButtonText, { color: theme.colors.buttonText }]}>
                Upload Profile Picture
              </Text>
            </TouchableOpacity>
          </View>
          
          <TextInput
            label="Full Name"
            value={fullName}
            placeholder="Your full name"
            editable={false}
            containerStyle={styles.inputContainer}
          />
          
          <TextInput
            label="Email"
            value={email}
            placeholder="Your email"
            editable={false}
            containerStyle={styles.inputContainer}
          />
          
          <TextInput
            label="University"
            value={university}
            onChangeText={setUniversity}
            placeholder="Enter your university"
            containerStyle={styles.inputContainer}
          />
          
          <TextInput
            label="City"
            value={city}
            onChangeText={setCity}
            placeholder="Enter your city"
            containerStyle={styles.inputContainer}
          />
          
          <TextInput
            label="Zipcode"
            value={zipcode}
            onChangeText={setZipcode}
            placeholder="Enter your zipcode"
            keyboardType="numeric"
            containerStyle={styles.inputContainer}
          />
          
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Interested Product Categories
          </Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
            Select all that interest you
          </Text>
          
          <View style={styles.categoriesContainer}>
            <FlatList
              data={PRODUCT_CATEGORIES}
              renderItem={renderCategoryItem}
              keyExtractor={item => item.id}
              numColumns={2}
              scrollEnabled={false}
              contentContainerStyle={styles.categoriesList}
            />
          </View>
          
          <TouchableOpacity 
            style={[
              styles.button, 
              { backgroundColor: loading || navigating ? 'rgba(150,150,150,0.5)' : theme.colors.primary }
            ]}
            onPress={handleSubmit}
            disabled={loading || navigating}
          >
            <Text style={[styles.buttonText, { color: theme.colors.buttonText }]}>
              {loading ? 'Processing...' : 'Complete Profile'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    flex: 1,
    minHeight: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 60,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
  },
  profilePicContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profilePicPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  profilePicText: {
    fontSize: 40,
    fontWeight: 'bold',
  },
  uploadButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 10,
  },
  categoriesContainer: {
    marginBottom: 20,
  },
  categoriesList: {
    flexGrow: 1,
  },
  categoryItem: {
    flex: 1,
    margin: 5,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProfileFillingScreen; 