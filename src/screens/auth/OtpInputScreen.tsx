import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Pressable
} from 'react-native';
import { Auth } from 'aws-amplify';
import { OtpInputScreenProps, AuthStackParamList, MainStackParamList } from '../../types/navigation.types';
import { useTheme } from '../../hooks';
import { TextInput, BridgelessButton } from '../../components/common';
import { CommonActions } from '@react-navigation/native';

// For consistent logging in development
const SCREEN_NAME = 'OtpInput';

const OtpInputScreen: React.FC<OtpInputScreenProps> = ({ route, navigation }) => {
  const { theme } = useTheme();
  const { email } = route.params;
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Function to log important actions for easier debugging
  const logDebug = (message: string, data?: any) => {
    if (data) {
      console.log(`[${SCREEN_NAME}] ${message}`, data);
    } else {
      console.log(`[${SCREEN_NAME}] ${message}`);
    }
  };

  // Direct navigation function using multiple methods to ensure it works
  const navigateToScreen = useCallback((screenName: keyof AuthStackParamList | keyof MainStackParamList, params?: any) => {
    logDebug(`Navigating to ${screenName}`);
    
    // Method 1: Standard navigation
    try {
      navigation.navigate(screenName, params);
      logDebug(`Navigate to ${screenName} - Method 1 Success`);
      return;
    } catch (e) {
      logDebug(`Navigate to ${screenName} - Method 1 Failed: ${e}`);
    }
    
    // Method 2: CommonActions
    try {
      navigation.dispatch(
        CommonActions.navigate({
          name: screenName,
          params
        })
      );
      logDebug(`Navigate to ${screenName} - Method 2 Success`);
      return;
    } catch (e) {
      logDebug(`Navigate to ${screenName} - Method 2 Failed: ${e}`);
    }
    
    // Method 3: Reset navigation
    try {
      navigation.reset({
        index: 0,
        routes: [{ name: screenName, params }]
      });
      logDebug(`Navigate to ${screenName} - Method 3 Success`);
      return;
    } catch (e) {
      logDebug(`Navigate to ${screenName} - Method 3 Failed: ${e}`);
      Alert.alert('Navigation Error', `Could not navigate to ${screenName}. Please try again.`);
    }
  }, [navigation]);

  const handleSignUp = useCallback(async () => {
    logDebug("Create Account button pressed");
    
    // Basic validation
    if (!otp) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }
    
    if (!password) {
      Alert.alert('Error', 'Please create a password');
      return;
    }
    
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    
    logDebug("All validation passed, proceeding with confirmation");
    setLoading(true);
    
    try {
      logDebug("Confirming sign up for email:", email);
      // Confirm the sign up with the verification code
      await Auth.confirmSignUp(email, otp);
      logDebug("Sign up confirmed successfully");
      
      try {
        logDebug("Attempting to sign in with new credentials");
        // After confirmation, sign in with the new credentials
        await Auth.signIn(email, password);
        logDebug("Sign in successful");
        
        Alert.alert('Success', 'Account created and verified successfully!', [
          { 
            text: 'OK', 
            onPress: () => {
              logDebug("Will navigate to ProfileFillingPage");
              navigateToScreen('ProfileFillingPage', { 
                email, 
                username: email
              });
            }
          }
        ]);
      } catch (signInError) {
        logDebug('Error signing in after confirmation:', signInError);
        // If sign-in fails, the account is still created
        Alert.alert('Account Created', 'Your account was created successfully. Please sign in with your email and password.', [
          { 
            text: 'OK', 
            onPress: () => {
              logDebug("Will navigate to SignIn");
              navigateToScreen('SignIn');
            }
          }
        ]);
      }
    } catch (error: any) {
      logDebug('Error confirming sign up:', error);
      
      // Handle specific error cases
      if (error.code === 'CodeMismatchException') {
        Alert.alert('Error', 'Invalid verification code. Please try again.');
      } else if (error.code === 'ExpiredCodeException') {
        Alert.alert('Error', 'Verification code has expired. Please request a new one.');
      } else {
        Alert.alert('Error', error.message || 'Failed to verify account');
      }
    } finally {
      setLoading(false);
    }
  }, [email, otp, password, confirmPassword, navigateToScreen]);

  const handleResendCode = useCallback(async () => {
    logDebug("Resend Verification Code button pressed");
    
    try {
      logDebug("Resending code for email:", email);
      await Auth.resendSignUp(email);
      logDebug("Code resent successfully");
      Alert.alert('Success', 'Verification code has been resent to your email');
    } catch (error: any) {
      logDebug("Error resending code:", error);
      let errorMessage = 'Failed to resend code';
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      // Handle specific error codes
      if (error.code === 'LimitExceededException') {
        errorMessage = 'You have requested too many codes. Please try again later.';
      }
      
      Alert.alert('Error', errorMessage);
    }
  }, [email]);

  const goBackToEmailVerification = useCallback(() => {
    logDebug("Back to Email Verification button pressed");
    
    // Try multiple navigation methods to ensure at least one works
    
    // Method 1: Use our custom navigate
    try {
      navigateToScreen('EmailVerification', { email });
      logDebug("Navigate to EmailVerification using navigateToScreen");
      return;
    } catch (e) {
      logDebug("NavigateToScreen failed:", e);
    }
    
    // Method 2: Try direct navigation.navigate
    try {
      navigation.navigate('EmailVerification', { email });
      logDebug("Navigate to EmailVerification using direct navigation.navigate");
      return;
    } catch (e) {
      logDebug("Direct navigation.navigate failed:", e);
    }
    
    // Method 3: Try navigation goBack
    try {
      navigation.goBack();
      logDebug("Navigation using goBack");
      return;
    } catch (e) {
      logDebug("Navigation goBack failed:", e);
    }
    
    // Method 4: Reset navigation stack as last resort
    try {
      navigation.reset({
        index: 0,
        routes: [{ name: 'EmailVerification', params: { email } }]
      });
      logDebug("Navigation using reset");
      return;
    } catch (e) {
      logDebug("Navigation reset failed:", e);
      Alert.alert('Navigation Error', 'Unable to go back to Email Verification. Please restart the app.');
    }
  }, [email, navigation, navigateToScreen]);

  // Log when component mounts
  useEffect(() => {
    logDebug(`Screen mounted with email: ${email}`);
    return () => {
      logDebug('Screen unmounted');
    };
  }, [email]);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.contentContainer}>
            <Text style={[styles.title, { color: theme.colors.primary }]}>
              Verify Your Account
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              We've sent a code to {email}
            </Text>
            
            <TextInput
              label="Verification Code"
              value={otp}
              onChangeText={(text) => {
                // Allow only digits
                setOtp(text.replace(/\D/g, ''));
              }}
              placeholder="Enter verification code"
              keyboardType="number-pad"
              containerStyle={styles.inputContainer}
            />
            
            <TextInput
              label="Create Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Create a strong password"
              secureTextEntry
              containerStyle={styles.inputContainer}
            />
            
            <TextInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm your password"
              secureTextEntry
              isPassword
              containerStyle={styles.inputContainer}
            />

            <View style={styles.buttonContainer}>
              <BridgelessButton
                title="Create Account"
                onPress={() => {
                  console.log('Direct onPress called from Create Account button');
                  handleSignUp();
                }}
                isLoading={loading}
                loadingColor={theme.colors.buttonText}
                buttonStyle={[styles.signUpButton, { 
                  minHeight: 60, 
                  minWidth: '100%', 
                  padding: 20,
                  marginBottom: 20,
                  backgroundColor: theme.colors.primary
                }]}
                textStyle={{ 
                  color: theme.colors.buttonText, 
                  fontSize: 18,
                  fontWeight: 'bold' 
                }}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                accessibilityLabel="Create your account"
              />
              
              <BridgelessButton
                title="Resend Verification Code"
                onPress={() => {
                  console.log('Direct onPress called from Resend button');
                  handleResendCode();
                }}
                buttonStyle={[styles.resendButton, { 
                  minHeight: 60, 
                  minWidth: '100%', 
                  padding: 20,
                  marginBottom: 20,
                  backgroundColor: 'transparent',
                  borderColor: theme.colors.primary,
                  borderWidth: 1
                }]}
                textStyle={{ 
                  color: theme.colors.primary, 
                  fontSize: 18,
                  fontWeight: 'bold'
                }}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                accessibilityLabel="Resend verification code"
              />
              
              {/* Direct implementation of Back button for iOS Bridgeless mode */}
              <Pressable
                onPress={() => {
                  console.log('Direct Pressable onPress for Back button');
                  goBackToEmailVerification();
                }}
                accessibilityLabel="Go back to email verification"
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.backButton,
                  {
                    minHeight: 60, 
                    width: '100%', 
                    padding: 20,
                    borderRadius: 10,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: pressed ? '#f7f7f7' : 'transparent',
                  }
                ]}
                hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
              >
                <Text style={{ 
                  color: theme.colors.primary, 
                  fontSize: 18, 
                  fontWeight: 'bold',
                  textAlign: 'center'
                }}>
                  Back to Email Verification
                </Text>
              </Pressable>
              
              {/* Additional TouchableOpacity as a backup for iOS */}
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={[
                    StyleSheet.absoluteFill,
                    { bottom: 0, top: 160 } // Positioned below the two other buttons
                  ]}
                  onPress={() => {
                    console.log('Backup TouchableOpacity for Back button');
                    goBackToEmailVerification();
                  }}
                  activeOpacity={0.9}
                >
                  <View style={{ flex: 1 }} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    </View>
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
  buttonContainer: {
    width: '100%',
    marginTop: 30,
    paddingHorizontal: 20,
  },
  signUpButton: {
    width: '100%',
    borderRadius: 10,
    marginBottom: 15,
  },
  resendButton: {
    width: '100%',
    borderRadius: 10,
    marginBottom: 15,
  },
  backButton: {
    width: '100%',
    borderRadius: 10,
  },
  debugButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  debugButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  textButton: {
    backgroundColor: 'transparent',
    padding: 10,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
});

export default OtpInputScreen; 