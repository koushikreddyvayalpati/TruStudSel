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
import { OtpInputScreenProps } from '../../types/navigation.types';
import { useTheme } from '../../hooks';
import { TextInput } from '../../components/common';
import * as validation from '../../utils/validation';

const OtpInputScreen: React.FC<OtpInputScreenProps> = ({ route, navigation }) => {
  const { theme } = useTheme();
  const { email } = route.params;
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const validateInputs = (): boolean => {
    let isValid = true;
    
    // Check for empty fields
    if (!otp) {
      Alert.alert('Error', 'Please enter the verification code');
      return false;
    }
    
    if (!password) {
      Alert.alert('Error', 'Please create a password');
      return false;
    }
    
    // Password validation
    const passwordValidationError = validation.getPasswordValidationError(password);
    if (passwordValidationError) {
      setPasswordError(passwordValidationError);
      isValid = false;
    } else {
      setPasswordError('');
    }
    
    // Confirm password validation
    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      isValid = false;
    } else {
      setConfirmPasswordError('');
    }
    
    return isValid;
  };

  const handleSignUp = async () => {
    if (!validateInputs()) {
      return;
    }
    
    setLoading(true);
    try {
      // Confirm the sign up with the verification code
      await Auth.confirmSignUp(email, otp);
      
      try {
        // After confirmation, sign in with credentials
        await Auth.signIn(email, password);
        
        Alert.alert('Success', 'Account created and verified successfully!', [
          { 
            text: 'OK', 
            onPress: () => navigation.navigate('ProfileFillingPage', { 
              email, 
              username: email
            })
          }
        ]);
      } catch (signInError) {
        console.error('Error signing in after confirmation:', signInError);
        // If sign-in fails, the account is still created
        Alert.alert('Account Created', 'Your account was created successfully. Please sign in with your email and password.', [
          { 
            text: 'OK', 
            onPress: () => navigation.navigate('SignIn')
          }
        ]);
      }
    } catch (error: any) {
      console.error('Error confirming sign up:', error);
      Alert.alert('Error', error.message || 'Failed to verify account');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      await Auth.resendSignUp(email);
      Alert.alert('Success', 'Verification code has been resent to your email');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend code');
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
          <Text style={[styles.title, { color: theme.colors.primary }]}>Verify Your Account</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Enter the verification code sent to {email}
          </Text>
          
          <TextInput
            label="Verification Code"
            value={otp}
            onChangeText={setOtp}
            placeholder="Enter verification code"
            keyboardType="number-pad"
            containerStyle={styles.inputContainer}
          />
          
          <TextInput
            label="Create Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (passwordError) setPasswordError('');
              if (confirmPasswordError && text === confirmPassword) {
                setConfirmPasswordError('');
              }
            }}
            placeholder="Enter new password"
            secureTextEntry
            isPassword
            error={passwordError}
            containerStyle={styles.inputContainer}
          />
          
          <TextInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (confirmPasswordError && text === password) {
                setConfirmPasswordError('');
              }
            }}
            placeholder="Confirm your password"
            secureTextEntry
            isPassword
            error={confirmPasswordError}
            containerStyle={styles.inputContainer}
          />
          
          <TouchableOpacity 
            style={[
              styles.button, 
              { backgroundColor: theme.colors.primary }
            ]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.buttonText} />
            ) : (
              <Text style={[styles.buttonText, { color: theme.colors.buttonText }]}>
                Create Account
              </Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.resendButton}
            onPress={handleResendCode}
            disabled={loading}
          >
            <Text style={[styles.resendText, { color: theme.colors.primary }]}>
              Resend Verification Code
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
  resendButton: {
    marginTop: 20,
    alignItems: 'center',
    padding: 10,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default OtpInputScreen; 