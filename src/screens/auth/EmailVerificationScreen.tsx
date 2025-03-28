import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert,
  SafeAreaView,
  TouchableOpacity,
  Image
} from 'react-native';
import { Auth } from 'aws-amplify';
import { useNavigation } from '@react-navigation/native';
import { EmailVerificationScreenProps, SignInScreenNavigationProp } from '../../types/navigation.types';
import { useTheme } from '../../hooks';
import { TextInput } from '../../components/common';
import Entypo from 'react-native-vector-icons/Entypo';

// For consistent logging in development
const SCREEN_NAME = 'EmailVerification';

const EmailVerificationScreen: React.FC<EmailVerificationScreenProps> = ({ route }) => {
  // Get navigation using useNavigation hook like in SignInScreen
  const navigation = useNavigation<SignInScreenNavigationProp>();
  const { theme } = useTheme();
  const [email, setEmail] = useState(route.params?.email || '');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

  // Function to log important actions for easier debugging
  const logDebug = (message: string, data?: any) => {
    if (data) {
      console.log(`[${SCREEN_NAME}] ${message}`, data);
    } else {
      console.log(`[${SCREEN_NAME}] ${message}`);
    }
  };

  // Simple navigation handler with logging
  const goBack = useCallback(() => {
    logDebug('Attempting to go back to SignIn');
    
    // Try direct navigation - simple approach
    try {
      logDebug('Using navigation.goBack()');
      navigation.goBack();
    } catch (e) {
      logDebug('Navigation error:', e);
      
      // Fallback to reset navigation
      try {
        logDebug('Fallback: Using navigation.reset()');
        navigation.reset({
          index: 0,
          routes: [{ name: 'SignIn' }],
        });
      } catch (resetError) {
        logDebug('Reset navigation error:', resetError);
        Alert.alert('Navigation Error', 'Unable to navigate back. Please restart the app.');
      }
    }
  }, [navigation]);

  const handleContinue = async () => {
    logDebug('Continue button pressed');
    
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }
    
    // Check if email is a .edu email
    const emailRegex = /^[^\s@]+@[^\s@]+\.edu$/i;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid .edu email address');
      return;
    }
    
    // Validate phone number (10-15 digits, with optional + prefix)
    const phoneRegex = /^\+?\d{10,15}$/;
    if (!phoneRegex.test(phoneNumber)) {
      Alert.alert('Error', 'Please enter a valid phone number (10-15 digits)');
      return;
    }
    
    setLoading(true);
    logDebug('Processing signup');
    
    try {
      // Generate a temporary password for the initial sign-up
      const tempPassword = Math.random().toString(36).slice(-8) + 'Aa1!';
      
      // Format phone number with + prefix if not already present
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
      
      // Sign up the user with Cognito using the exact attribute names required by your schema
      const signUpResponse = await Auth.signUp({
        username: email,
        password: tempPassword,
        attributes: {
          email,
          phone_number: formattedPhone,
          name
        }
      });
      
      logDebug('Sign up successful, verification code sent:', signUpResponse);
      
      // Navigate to OTP screen with all required parameters
      navigation.navigate('OtpInput', {
        email,
        tempPassword,
        name,
        phoneNumber: formattedPhone
      });
      
    } catch (error: any) {
      logDebug('Error during signup:', error);
      
      // Handle specific error cases
      if (error.code === 'UsernameExistsException') {
        Alert.alert(
          'Account Exists', 
          'An account with this email already exists. Would you like to resend the verification code?',
          [
            {
              text: 'Cancel',
              style: 'cancel'
            },
            {
              text: 'Resend',
              onPress: async () => {
                try {
                  await Auth.resendSignUp(email);
                  Alert.alert('Success', 'Verification code has been resent');
                  navigation.navigate('OtpInput', { 
                    email,
                    name,
                    phoneNumber: phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`
                  });
                } catch (resendError: any) {
                  Alert.alert('Error', resendError.message || 'Failed to resend verification code');
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', error.message || 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={goBack} 
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Entypo name="chevron-left" size={28} color={theme.colors.secondary} />
        </TouchableOpacity>
      </View> 
      <View style={styles.contentContainer}>
        <Text style={[styles.title, { color: theme.colors.secondary }]}>Create Account</Text>
        <View style={styles.imageContainer}>
          <Image 
            source={require('../../../assets/amico.png')} 
            style={styles.image}
            resizeMode="contain"
          />
        </View>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Please fill in your details</Text>
        <TextInput
          label="Full Name"
          value={name}
          onChangeText={setName}
          placeholder="Enter your full name"
          autoCapitalize="words"
          containerStyle={styles.inputContainer}
        />
        
        <TextInput
          label="Email (.edu only)"
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your .edu email"
          keyboardType="email-address"
          autoCapitalize="none"
          containerStyle={styles.inputContainer}
        />
        
        <TextInput
          label="Phone Number"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="Enter with country code (e.g., +1...)"
          keyboardType="phone-pad"
          containerStyle={styles.inputContainer}
        />
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              {
                backgroundColor: loading ? 'rgba(150,150,150,0.5)' : theme.colors.primary,
              }
            ]}
            onPress={handleContinue}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonText, { color: theme.colors.buttonText }]}>
              {loading ? "Loading..." : "Continue"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  backButton: {
    padding: 10,
    paddingLeft: 0,
    marginTop: 5,
    marginRight: 10,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  contentContainer: {
    padding: 20,
    flex: 1,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 10,
    fontFamily: 'Montserrat',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 16,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 30,
    alignItems: 'center',
  },
  continueButton: {
    width: '100%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  backTextContainer: {
    marginTop: 20,
    padding: 15,
    alignSelf: 'center',
  },
  backText: {
    fontSize: 16,
    textAlign: 'center',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  image: {
    width: 200,
    height: 200,
  },
});

export default EmailVerificationScreen; 