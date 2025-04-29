import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  Image,
  Animated,
  Keyboard,
  StatusBar,
} from 'react-native';
import { Auth } from 'aws-amplify';
import { useNavigation } from '@react-navigation/native';
import { ForgotPasswordScreenNavigationProp } from '../../types/navigation.types';
import { useTheme } from '../../hooks';
import { TextInput, LoadingOverlay } from '../../components/common';
import * as validation from '../../utils/validation';
import Entypo from 'react-native-vector-icons/Entypo';
import LinearGradient from 'react-native-linear-gradient';

// For consistent logging in development
const SCREEN_NAME = 'ForgotPassword';

const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1); // 1: Enter email, 2: Enter code and new password
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Animated values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Keyboard listeners
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    // Animate elements when the screen loads
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    };
  }, [fadeAnim, slideAnim]);

  // Define loading steps for each process
  const sendCodeLoadingSteps = useMemo(() => [
    { id: 'sending', message: 'Sending verification code...' },
    { id: 'success', message: 'Code sent successfully!' },
  ], []);

  const resetPasswordLoadingSteps = useMemo(() => [
    { id: 'resetting', message: 'Resetting your password...' },
    { id: 'success', message: 'Password reset successful!' },
  ], []);

  // Function to log important actions for easier debugging
  const logDebug = (message: string, data?: any) => {
    if (data) {
      console.log(`[${SCREEN_NAME}] ${message}`, data);
    } else {
      console.log(`[${SCREEN_NAME}] ${message}`);
    }
  };

  // Log navigation for debugging
  useEffect(() => {
    console.log('ForgotPassword screen navigation:', navigation);
  }, [navigation]);

  const validateEmail = (): boolean => {
    if (!email) {
      setEmailError('Email is required');
      return false;
    }

    // Check for .edu email
    if (!email.includes('@') || !email.toLowerCase().endsWith('.edu')) {
      setEmailError('Please use your university email address ending with .edu');
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
    logDebug('Attempting to send verification code');
    if (!validateEmail()) {
      return;
    }

    setLoading(true);
    setLoadingStep(0);

    try {
      await Auth.forgotPassword(email);
      logDebug('Verification code sent successfully');

      // Show success message briefly
      setLoadingStep(1);
      setTimeout(() => {
        setLoading(false);
        setStep(2);
      }, 1000);

    } catch (error: any) {
      logDebug('Error sending verification code', error);
      setLoading(false);
      Alert.alert('Error', error.message || 'Failed to send verification code');
    }
  };

  const handleResetPassword = async () => {
    logDebug('Attempting to reset password');
    if (!validatePasswordReset()) {
      return;
    }

    setLoading(true);
    setLoadingStep(0);

    try {
      await Auth.forgotPasswordSubmit(email, code, newPassword);
      logDebug('Password reset successfully');

      // Show success message briefly
      setLoadingStep(1);
      setTimeout(() => {
        setLoading(false);
        Alert.alert('Success', 'Password reset successfully', [
          { text: 'OK', onPress: () => navigation.navigate('SignIn') },
        ]);
      }, 1000);

    } catch (error: any) {
      logDebug('Error resetting password', error);
      setLoading(false);
      Alert.alert('Error', error.message || 'Failed to reset password');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            Platform.OS === 'android' && { paddingTop: 0 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Loading overlays */}
          <LoadingOverlay
            visible={loading && step === 1}
            steps={sendCodeLoadingSteps}
            currentStep={loadingStep}
            showProgressDots={true}
          />

          <LoadingOverlay
            visible={loading && step === 2}
            steps={resetPasswordLoadingSteps}
            currentStep={loadingStep}
            showProgressDots={true}
          />

          {/* Back button header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => {
                logDebug('Back button pressed');
                if (step !== 1) {
                  // If on step 2, go back to step 1
                  logDebug('Returning to step 1');
                  setStep(1);
                  setCode('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordError('');
                  setConfirmPasswordError('');
                } else {
                  // If on step 1, go back to SignIn
                  logDebug('Navigating to SignIn');
                  navigation.navigate('SignIn');
                }
              }}
              style={[styles.backButton, { zIndex: 999 }]}
              activeOpacity={0.5}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            >
                <Entypo name="chevron-left" size={28} color={theme.colors.secondary} />

            </TouchableOpacity>
          </View>

          <Animated.View
            style={[
              styles.contentContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={[styles.title, { color: theme.colors.secondary }]}>
              {step === 1 ? 'Reset' : 'Create New'}
            </Text>
            <Text style={[styles.title, { color: theme.colors.secondary }]}>
              {step === 1 ? 'Password' : 'Password'}
            </Text>

            {!keyboardVisible && (
              <View style={styles.imageContainer}>
                <Image
                  source={require('../../../assets/password.png')}
                  style={styles.image}
                  resizeMode="contain"
                />
              </View>
            )}

            {step === 1 ? (
              <>
                <View style={styles.formContainer}>
                  <TextInput
                    label="University Email (.edu)"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (emailError) {setEmailError('');}
                    }}
                    placeholder="Enter your .edu email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    error={emailError}
                    touched={!!emailError}
                    leftIcon={<Entypo name="mail" size={20} color={theme.colors.secondary} />}
                  />

                  <View style={styles.buttonContainer}>
                    <TouchableOpacity
                      onPress={handleSendCode}
                      disabled={loading}
                      activeOpacity={0.7}
                      style={styles.continueButtonWrapper}
                    >
                      <LinearGradient
                        colors={['#f7b305', '#f7d305']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.continueButton, loading && { opacity: 0.7 }]}
                      >
                        <Text style={styles.buttonText}>Send Reset Code</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={styles.formContainer}>
                  <TextInput
                    label="Verification Code"
                    value={code}
                    onChangeText={setCode}
                    placeholder="Enter the 6-digit code"
                    keyboardType="number-pad"
                    leftIcon={<Entypo name="key" size={20} color={theme.colors.secondary} />}
                  />

                  <TextInput
                    label="New Password"
                    value={newPassword}
                    onChangeText={(text) => {
                      setNewPassword(text);
                      if (passwordError) {setPasswordError('');}
                      if (confirmPasswordError && text === confirmPassword) {
                        setConfirmPasswordError('');
                      }
                    }}
                    placeholder="Create a strong password"
                    secureTextEntry
                    isPassword
                    error={passwordError}
                    touched={!!passwordError}
                    leftIcon={<Entypo name="lock" size={20} color={theme.colors.secondary} />}
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
                    placeholder="Confirm your password"
                    secureTextEntry
                    isPassword
                    error={confirmPasswordError}
                    touched={!!confirmPasswordError}
                    leftIcon={<Entypo name="lock" size={20} color={theme.colors.secondary} />}
                  />

                  <View style={styles.buttonContainer}>
                    <TouchableOpacity
                      onPress={handleResetPassword}
                      disabled={loading}
                      activeOpacity={0.7}
                      style={styles.continueButtonWrapper}
                    >
                      <LinearGradient
                        colors={['#f7b305', '#f7d305']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.continueButton, loading && { opacity: 0.7 }]}
                      >
                        <Text style={styles.buttonText}>Reset Password</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </Animated.View>

          {/* Corner decorations for visual appeal */}
          <View style={[styles.cornerDecoration, styles.topLeftCorner]} />
          <View style={[styles.cornerDecoration, styles.bottomRightCorner]} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginTop: 10,
    zIndex: 10,
    ...Platform.select({
      android: {
        paddingTop: 16,
        height: 75,
      },
    }),
  },
  backButton: {
    padding: 10,
    paddingLeft: 5,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      android: {
        padding: 8,
        marginLeft: 0,
        marginTop: 0,
      },
    }),
  },
  contentContainer: {
    padding: 20,
    paddingTop: 0,
    flex: 1,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 0,
    fontFamily: 'Montserrat',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 10,
    marginBottom: 20,
    letterSpacing: 0.3,
    color: '#666',
  },
  imageContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  image: {
    width: 180,
    height: 180,
  },
  formContainer: {
    width: '100%',
    marginBottom: 10,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 20,
    alignItems: 'center',
  },
  continueButtonWrapper: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#f7b305',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  continueButton: {
    width: '100%',
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
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
});

export default ForgotPasswordScreen;
