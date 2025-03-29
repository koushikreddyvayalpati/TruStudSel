import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
  Modal
} from 'react-native';
import { ProfileFillingScreenProps } from '../../types/navigation.types';
import { useTheme } from '../../hooks';
import { useAuth } from '../../contexts';
import { TextInput } from '../../components/common';
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
  const [loadingMessage, setLoadingMessage] = useState('Updating your profile...');
  const [loadingStep, setLoadingStep] = useState(0);
  
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

  // Update loading message based on step
  useEffect(() => {
    const messages = [
      'Updating your profile...',
      'Profile saved successfully!',
      'Preparing your account...',
      'Taking you to home screen...'
    ];
    
    if (navigating && loadingStep < messages.length) {
      setLoadingMessage(messages[loadingStep]);
      const timer = setTimeout(() => {
        setLoadingStep(prev => prev + 1);
      }, 800); // Change message every 800ms for a nice effect
      
      return () => clearTimeout(timer);
    }
  }, [navigating, loadingStep]);

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
        
        // Proceed with small delay to show profile saved message
        setLoadingStep(1); // Show "Profile saved successfully!"
        
        setTimeout(async () => {
          try {
            setLoadingStep(2); // Show "Preparing your account..."
            
            // Small delay to show "Preparing" message
            setTimeout(async () => {
              setLoadingStep(3); // Show "Taking you to home screen..."
              
              // Final delay before actual navigation
              setTimeout(async () => {
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
          } catch (error) {
            console.error('Navigation error after delay:', error);
            setNavigating(false);
            Alert.alert(
              'Navigation Issue',
              'Please restart the app to go to the home screen.'
            );
          }
        }, 800);
        
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
      {/* Loading overlay modal for navigation */}
      <Modal
        visible={navigating}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>{loadingMessage}</Text>
            
            {/* Progress dots */}
            <View style={styles.progressDotsContainer}>
              {[0, 1, 2, 3].map((dot) => (
                <View 
                  key={dot}
                  style={[
                    styles.progressDot,
                    { 
                      backgroundColor: dot <= loadingStep 
                        ? theme.colors.primary 
                        : 'rgba(200,200,200,0.5)' 
                    }
                  ]}
                />
              ))}
            </View>
          </View>
        </View>
      </Modal>
      
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
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 250,
    minHeight: 150,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  progressDotsContainer: {
    flexDirection: 'row',
    marginTop: 15,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
});

export default ProfileFillingScreen; 