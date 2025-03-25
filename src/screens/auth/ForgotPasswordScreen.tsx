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
import { ForgotPasswordScreenNavigationProp } from '../../types/navigation.types';
import { useTheme } from '../../hooks';
import { TextInput } from '../../components/common';
import * as validation from '../../utils/validation';

interface ForgotPasswordScreenProps {
  navigation: ForgotPasswordScreenNavigationProp;
}

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1); // 1: Enter email, 2: Enter code and new password
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const validateEmail = (): boolean => {
    if (!email) {
      setEmailError('Email is required');
      return false;
    }
    
    const emailValidationError = validation.getEmailValidationError(email);
    if (emailValidationError) {
      setEmailError(emailValidationError);
      return false;
    }
    
    setEmailError('');
    return true;
  };

  const validatePasswordReset = (): boolean => {
    let isValid = true;
    
    if (!code) {
      Alert.alert('Error', 'Please enter the verification code');
      return false;
    }
    
    // Password validation
    const passwordValidationError = validation.getPasswordValidationError(newPassword);
    if (passwordValidationError) {
      setPasswordError(passwordValidationError);
      isValid = false;
    } else {
      setPasswordError('');
    }
    
    // Confirm password validation
    if (newPassword !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      isValid = false;
    } else {
      setConfirmPasswordError('');
    }
    
    return isValid;
  };

  const handleSendCode = async () => {
    if (!validateEmail()) {
      return;
    }
    
    setLoading(true);
    try {
      await Auth.forgotPassword(email);
      setStep(2);
    } catch (error: any) {
      console.error('Error:', error);
      Alert.alert('Error', error.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!validatePasswordReset()) {
      return;
    }
    
    setLoading(true);
    try {
      await Auth.forgotPasswordSubmit(email, code, newPassword);
      Alert.alert('Success', 'Password reset successfully', [
        { text: 'OK', onPress: () => navigation.navigate('SignIn') }
      ]);
    } catch (error: any) {
      console.error('Error:', error);
      Alert.alert('Error', error.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleBackPress = () => {
    if (step === 1) {
      navigation.goBack();
    } else {
      setStep(1);
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError('');
      setConfirmPasswordError('');
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
          <Text style={[styles.title, { color: theme.colors.primary }]}>Reset Password</Text>
          
          {step === 1 ? (
            <>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                Enter your email to receive a verification code
              </Text>
              
              <TextInput
                label="Email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) setEmailError('');
                }}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                error={emailError}
                containerStyle={styles.inputContainer}
              />
              
              <TouchableOpacity 
                style={[
                  styles.button, 
                  { backgroundColor: theme.colors.primary }
                ]}
                onPress={handleSendCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={theme.colors.buttonText} />
                ) : (
                  <Text style={[styles.buttonText, { color: theme.colors.buttonText }]}>
                    Send Code
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                Enter the verification code and your new password
              </Text>
              
              <TextInput
                label="Verification Code"
                value={code}
                onChangeText={setCode}
                placeholder="Enter verification code"
                keyboardType="number-pad"
                containerStyle={styles.inputContainer}
              />
              
              <TextInput
                label="New Password"
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
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
                  if (confirmPasswordError && text === newPassword) {
                    setConfirmPasswordError('');
                  }
                }}
                placeholder="Confirm new password"
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
                onPress={handleResetPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={theme.colors.buttonText} />
                ) : (
                  <Text style={[styles.buttonText, { color: theme.colors.buttonText }]}>
                    Reset Password
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
          
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <Text style={[styles.backButtonText, { color: theme.colors.primary }]}>
              {step === 1 ? 'Back to Login' : 'Back'}
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
  backButton: {
    marginTop: 20,
    alignItems: 'center',
    padding: 10,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ForgotPasswordScreen; 