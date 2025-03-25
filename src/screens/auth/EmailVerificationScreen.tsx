import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Auth } from 'aws-amplify';
import { EmailVerificationScreenProps } from '../../types/navigation.types';
import { useTheme } from '../../hooks';
import { TextInput } from '../../components/common';
import * as validation from '../../utils/validation';

const EmailVerificationScreen: React.FC<EmailVerificationScreenProps> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const [email, setEmail] = useState(route.params?.email || '');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const validateInputs = (): boolean => {
    let isValid = true;
    
    // Check for empty fields
    if (!email || !name || !phoneNumber) {
      Alert.alert('Error', 'Please fill in all fields');
      return false;
    }
    
    // Validate email format (must be .edu domain)
    let eduError = '';
    const emailValidationError = validation.getEmailValidationError(email);
    if (emailValidationError) {
      eduError = emailValidationError;
    } else if (!email.endsWith('.edu')) {
      eduError = 'Please enter a valid .edu email address';
    }
    
    if (eduError) {
      setEmailError(eduError);
      isValid = false;
    } else {
      setEmailError('');
    }
    
    // Validate phone number format
    const phoneValidationError = validation.getPhoneValidationError(phoneNumber);
    if (phoneValidationError) {
      setPhoneError(phoneValidationError);
      isValid = false;
    } else {
      setPhoneError('');
    }
    
    return isValid;
  };

  const handleContinue = async () => {
    if (!validateInputs()) {
      return;
    }
    
    setLoading(true);
    try {
      // Generate a temporary password for the initial sign-up
      const tempPassword = Math.random().toString(36).slice(-8) + 'Aa1!';
      
      // Format phone number with + prefix if not already present
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
      
      // Sign up the user with Cognito
      const signUpResponse = await Auth.signUp({
        username: email,
        password: tempPassword,
        attributes: {
          email,
          phone_number: formattedPhone,
          name,
        }
      });
      
      console.log('Sign up successful, verification code sent:', signUpResponse);
      
      // Pass all user data to OTP page
      navigation.navigate('OtpInput', { 
        email,
      });
      
    } catch (error: any) {
      console.error('Error:', error);
      
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
                  });
                } catch (resendError) {
                  Alert.alert('Error', (resendError as Error).message || 'Failed to resend verification code');
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', (error as Error).message || 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          <Text style={[styles.title, { color: theme.colors.primary }]}>Create Account</Text>
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
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (emailError) setEmailError('');
            }}
            placeholder="Enter your .edu email"
            keyboardType="email-address"
            autoCapitalize="none"
            error={emailError}
            containerStyle={styles.inputContainer}
          />
          
          <TextInput
            label="Phone Number"
            value={phoneNumber}
            onChangeText={(text) => {
              setPhoneNumber(text);
              if (phoneError) setPhoneError('');
            }}
            placeholder="Enter with country code (e.g., +1...)"
            keyboardType="phone-pad"
            error={phoneError}
            containerStyle={styles.inputContainer}
          />
          
          <TouchableOpacity 
            style={[
              styles.button, 
              { backgroundColor: theme.colors.primary }
            ]}
            onPress={handleContinue}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.buttonText} />
            ) : (
              <Text style={[styles.buttonText, { color: theme.colors.buttonText }]}>
                Continue
              </Text>
            )}
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
    justifyContent: 'center',
    minHeight: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 60,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
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
});

export default EmailVerificationScreen; 