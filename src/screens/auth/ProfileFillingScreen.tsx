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
  DevSettings
} from 'react-native';
import { ProfileFillingScreenProps } from '../../types/navigation.types';
import { useTheme } from '../../hooks';
import { useAuth } from '../../contexts';
import { TextInput, LoadingOverlay } from '../../components/common';
import { Auth } from 'aws-amplify';
import { CommonActions } from '@react-navigation/native';

const ProfileFillingScreen: React.FC<ProfileFillingScreenProps> = ({ route, navigation }) => {
  const { theme } = useTheme();
  const { refreshSession, updateUserInfo, isAuthenticated } = useAuth();
  const { email, username, isAuthenticated: wasAuthenticated } = route.params;
  
  const [fullName, setFullName] = useState(username || '');
  const [bio, setBio] = useState('');
  const [university, setUniversity] = useState('');
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
    setLoading(true);
    setLoadingStep(0);
    try {
      // Just updating the name attribute in Cognito
      const user = await Auth.currentAuthenticatedUser();
      await Auth.updateUserAttributes(user, {
        'name': fullName.trim()
      });
      // For university and bio, we're just logging them for now
      // Later you can connect to your API to store these values
      console.log('Profile data to be stored in API:', {
        fullName: fullName.trim(),
        university: university.trim(),
        bio: bio.trim(),
        email
      });
      // Update user info in the auth context
      updateUserInfo({
        name: fullName.trim(),
        university: university.trim(),
        email
      });
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
                  // Fallback for production
                  console.log('Forcing navigation reset...');
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

  const handleUploadProfilePicture = () => {
    // Implement profile picture upload functionality
    Alert.alert(
      'Upload Profile Picture', 
      'Profile picture upload feature will be implemented in future updates.'
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
            onChangeText={setFullName}
            placeholder="Enter your full name"
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
            label="Bio (Optional)"
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about yourself"
            multiline
            numberOfLines={4}
            containerStyle={styles.inputContainer}
            inputStyle={styles.bioInput}
          />
          
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
  bioInput: {
    // Add any specific styles for the bio input if needed
  },
});

export default ProfileFillingScreen; 