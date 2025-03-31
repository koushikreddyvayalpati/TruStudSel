import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert,
  SafeAreaView,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  TextInput as RNTextInput
} from 'react-native';
import { Auth } from 'aws-amplify';
import { OtpInputScreenProps } from '../../types/navigation.types';
import { useTheme } from '../../hooks';
import { useAuth } from '../../contexts';
import { TextInput, LoadingOverlay } from '../../components/common';
import Entypo from 'react-native-vector-icons/Entypo';

const OtpInputScreen: React.FC<OtpInputScreenProps> = ({ route, navigation }) => {
  const { theme } = useTheme();
  const { refreshSession } = useAuth();
  const { email, tempPassword, name, phoneNumber } = route.params;
  
  // State variables
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [verificationStep, setVerificationStep] = useState('otp'); // 'otp' or 'password'
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loadingStep, setLoadingStep] = useState(0);
  
  // Single OTP input
  const [otpValue, setOtpValue] = useState('');
  
  // Define loading steps
  const otpLoadingSteps = useMemo(() => [
    { id: 'verifying', message: 'Verifying your code...' },
    { id: 'success', message: 'Code verified successfully!' }
  ], []);
  
  const passwordLoadingSteps = useMemo(() => [
    { id: 'creating', message: 'Creating your password...' },
    { id: 'success', message: 'Password set successfully!' },
    { id: 'preparing', message: 'Preparing your account...' }
  ], []);
  
  useEffect(() => {
    // Listen for keyboard events
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    // Start countdown for resend button
    const timer = setInterval(() => {
      setCountdown((prevCount) => {
        if (prevCount <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prevCount - 1;
      });
    }, 1000);

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
      clearInterval(timer);
    };
  }, []);
  
  useEffect(() => {
    console.log('Current OTP:', otpValue);
  }, [otpValue]);
  
  const handleVerifyCode = async () => {
    if (otpValue.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit code');
      return;
    }
    
    setLoading(true);
    setLoadingStep(0);
    
    try {
      // Confirm sign up with the verification code
      await Auth.confirmSignUp(email, otpValue);
      
      // Show success message briefly
      setLoadingStep(1);
      setTimeout(() => {
        setLoading(false);
        // Switch to password creation step
        setVerificationStep('password');
      }, 1000);
      
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Error', error.message || 'Failed to verify code');
    }
  };
  
  const handleOtpChange = (text: string) => {
    // Allow only numbers and max 6 digits
    const numericText = text.replace(/[^0-9]/g, '');
    if (numericText.length <= 6) {
      setOtpValue(numericText);
    }
  };

  const renderOtpVerification = () => (
    <>
      <Text style={[styles.title, { color: theme.colors.secondary }]}>
        Verification
      </Text>
      
      {!keyboardVisible && (
        <View style={styles.imageContainer}>
          <Image 
            source={require('../../../assets/sms.png')} 
            style={styles.image}
            resizeMode="contain"
          />
        </View>
      )}
      
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Please enter the 6-digit code sent to {email}
      </Text>
      
      {/* New Simplified OTP Input */}
      <View style={styles.otpMainContainer}>
        {/* OTP Display */}
        <View style={styles.otpDisplayContainer}>
          {Array(6).fill(0).map((_, index) => (
            <View 
              key={index} 
              style={[
                styles.otpDigitDisplay,
                { 
                  borderColor: index < otpValue.length 
                    ? theme.colors.primary 
                    : theme.colors.border
                }
              ]}
            >
              <Text style={[styles.otpDigitText, { color: theme.colors.secondary }]}>
                {index < otpValue.length ? otpValue[index] : ''}
              </Text>
            </View>
          ))}
        </View>
        
        {/* Native Text Input that's styled to match the app's design */}
        <RNTextInput
          style={[
            styles.otpInput,
            { 
              borderColor: otpValue.length === 6 
                ? theme.colors.primary 
                : '#ccc' 
            }
          ]}
          value={otpValue}
          onChangeText={handleOtpChange}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus={true}
          placeholder="Enter 6-digit code"
          placeholderTextColor="#aaa"
        />
        
        <Text style={styles.otpHelpText}>
          Please enter the verification code sent to your email
        </Text>
      </View>
      
      <TouchableOpacity
        onPress={handleResendCode}
        disabled={!canResend}
        style={styles.resendContainer}
      >
        <Text style={[
          styles.resendText,
          { color: canResend ? theme.colors.primary : theme.colors.textSecondary }
        ]}>
          {canResend 
            ? 'Resend Code' 
            : `Resend code in ${countdown}s`
          }
        </Text>
      </TouchableOpacity>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.verifyButton,
            { 
              backgroundColor: loading 
                ? 'rgba(150,150,150,0.5)' 
                : otpValue.length === 6 
                  ? theme.colors.primary 
                  : 'rgba(200,200,200,0.5)' 
            }
          ]}
          onPress={handleVerifyCode}
          disabled={loading || otpValue.length !== 6}
        >
          <Text style={[styles.buttonText, { color: theme.colors.buttonText }]}>
            {loading ? "Verifying..." : "Verify"}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const handleCreatePassword = async () => {
    // Validate password
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    // Password strength check
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (!(hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar)) {
      setPasswordError('Password must contain uppercase, lowercase, number, and special character');
      return;
    }
    
    setLoading(true);
    setLoadingStep(0);
    
    try {
      // If tempPassword exists, sign in with it and change password
      if (tempPassword) {
        // Sign in with temporary password
        await Auth.signIn(email, tempPassword);
        
        // Change password from temp to new password
        const user = await Auth.currentAuthenticatedUser();
        await Auth.changePassword(user, tempPassword, password);
        
        // Show success message
        setLoadingStep(1);
        
        // Refresh the session to update auth state
        await refreshSession();
        
        // Show preparing message
        setTimeout(() => {
          setLoadingStep(2);
          
          // Navigate after a brief delay
          setTimeout(() => {
            setLoading(false);
            console.log('User successfully authenticated and password set');
            
            // Navigate to profile filling page
            navigation.navigate('ProfileFillingPage', { 
              email, 
              username: name || '',
              isAuthenticated: true,
              phoneNumber
            });
          }, 800);
        }, 1000);
      } else {
        // If no temp password (shouldn't happen in normal flow)
        setLoading(false);
        Alert.alert(
          'Success',
          'Your account has been verified and password set. Please sign in.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('SignIn')
            }
          ]
        );
      }
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Error', error.message || 'Failed to set password');
    }
  };
  
  const handleResendCode = async () => {
    if (!canResend) return;
    
    try {
      await Auth.resendSignUp(email);
      Alert.alert('Success', 'Verification code has been resent');
      setCountdown(30);
      setCanResend(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend verification code');
    }
  };

  const renderPasswordCreation = () => (
    <>
      <Text style={[styles.title, { color: theme.colors.secondary }]}>
        Create Password
      </Text>
      
      {!keyboardVisible && (
        <View style={styles.imageContainer}>
          <Image 
            source={require('../../../assets/sms.png')} 
            style={styles.image}
            resizeMode="contain"
          />
        </View>
      )}
      
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Your email has been verified. Please create a strong password for your account.
      </Text>
      
      <TextInput
        label="New Password"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          setPasswordError('');
        }}
        placeholder="Enter new password"
        secureTextEntry
        isPassword
        containerStyle={styles.passwordInputContainer}
        error={passwordError}
        touched={!!passwordError}
      />
      
      <TextInput
        label="Confirm Password"
        value={confirmPassword}
        onChangeText={(text) => {
          setConfirmPassword(text);
          setPasswordError('');
        }}
        placeholder="Confirm your password"
        secureTextEntry
        isPassword
        containerStyle={styles.passwordInputContainer}
      />
      
      <Text style={styles.passwordRequirements}>
        Password must contain at least 8 characters including uppercase, lowercase, number and special character.
      </Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.verifyButton,
            { backgroundColor: loading ? 'rgba(150,150,150,0.5)' : theme.colors.primary }
          ]}
          onPress={handleCreatePassword}
          disabled={loading || !password || !confirmPassword}
        >
          <Text style={[styles.buttonText, { color: theme.colors.buttonText }]}>
            {loading ? "Creating..." : "Create Password"}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* OTP verification loading overlay */}
      <LoadingOverlay
        visible={loading && verificationStep === 'otp'}
        steps={otpLoadingSteps}
        currentStep={loadingStep}
        showProgressDots={true}
      />
      
      {/* Password creation loading overlay */}
      <LoadingOverlay
        visible={loading && verificationStep === 'password'}
        steps={passwordLoadingSteps}
        currentStep={loadingStep}
        showProgressDots={true}
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => {
                if (verificationStep === 'password') {
                  setVerificationStep('otp');
                } else {
                  navigation.goBack();
                }
              }} 
              style={styles.backButton}
            >
              <Entypo name="chevron-left" size={28} color={theme.colors.secondary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.contentContainer}>
            {verificationStep === 'otp' ? renderOtpVerification() : renderPasswordCreation()}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
  imageContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  image: {
    width: 180,
    height: 180,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
  },
  otpMainContainer: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 30,
  },
  otpDisplayContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  otpDigitDisplay: {
    width: 45,
    height: 60,
    borderWidth: 2,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  otpDigitText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  passwordInputContainer: {
    marginBottom: 16,
  },
  passwordRequirements: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
    marginBottom: 20,
    textAlign: 'center',
  },
  resendContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  resendText: {
    fontSize: 16,
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 20,
  },
  verifyButton: {
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
  otpInput: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 18,
    textAlign: 'center',
    marginTop: 10,
    backgroundColor: '#f9f9f9',
  },
  otpHelpText: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
    marginBottom: 20,
    textAlign: 'center',
  },
});

export default OtpInputScreen; 