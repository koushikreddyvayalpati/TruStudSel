import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  TextInput as RNTextInput,
  Animated,
  // Dimensions
} from 'react-native';
import { Auth } from 'aws-amplify';
import { OtpInputScreenProps } from '../../types/navigation.types';
import { useTheme } from '../../hooks';
import { useAuth } from '../../contexts';
import { TextInput, LoadingOverlay } from '../../components/common';
import Entypo from 'react-native-vector-icons/Entypo';
import LinearGradient from 'react-native-linear-gradient';

// const { width } = Dimensions.get('window');

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
  
  // Animated values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const otpInputRef = useRef<RNTextInput>(null);
  
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

  // Animate entrance
  useEffect(() => {
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
      })
    ]).start();

    return () => {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
    };
  }, [fadeAnim, slideAnim]);
  
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

  // Animation when switching steps
  useEffect(() => {
    if (verificationStep === 'password') {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: -30,
            duration: 300,
            useNativeDriver: true,
          })
        ]),
        Animated.timing(slideAnim, {
          toValue: 30,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          })
        ])
      ]).start();
    }
  }, [verificationStep, fadeAnim, slideAnim]);
  
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

  const getOtpBoxStyle = (index: number) => {
    const filled = index < otpValue.length;
    const lastFilled = index === otpValue.length - 1;
    
    return {
      borderColor: filled 
        ? theme.colors.primary 
        : theme.colors.border,
      backgroundColor: filled 
        ? 'rgba(0,122,255,0.05)' 
        : theme.colors.background,
      transform: [{ scale: lastFilled ? 1.05 : 1 }],
    };
  };

  const renderOtpVerification = () => (
    <Animated.View 
      style={[
        styles.animatedContainer,
        { 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <Text style={[styles.title, { color: theme.colors.secondary }]}>
        Verification
      </Text>
      
      {!keyboardVisible && (
        <View style={styles.imageContainer}>
          <Image 
            source={require('../../../assets/email.png')} 
            style={styles.image}
            resizeMode="contain"
          />
        </View>
      )}
      
      <View style={styles.cardContainer}>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Please enter the 6-digit code sent to
        </Text>
        <Text style={styles.emailText}>{email}</Text>
      </View>
      
      {/* New Enhanced OTP Input */}
      <View style={styles.otpMainContainer}>
        {/* OTP Display */}
        <View style={styles.otpDisplayContainer}>
          {Array(6).fill(0).map((_, index) => (
            <View 
              key={index} 
              style={[
                styles.otpDigitDisplay,
                getOtpBoxStyle(index)
              ]}
            >
              <Text style={[styles.otpDigitText, { color: theme.colors.secondary }]}>
                {index < otpValue.length ? otpValue[index] : ''}
              </Text>
            </View>
          ))}
        </View>
        
        {/* Hidden Native Text Input */}
        <RNTextInput
          ref={otpInputRef}
          style={styles.hiddenOtpInput}
          value={otpValue}
          onChangeText={handleOtpChange}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus={true}
        />
        
        {/* Tap area to focus input */}
        <TouchableOpacity 
          style={styles.tapToFocusArea}
          activeOpacity={0.9}
          onPress={() => otpInputRef.current?.focus()}
        >
          <Text style={styles.tapToFocusText}>
            Tap to enter code
          </Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity
        onPress={handleResendCode}
        disabled={!canResend}
        style={styles.resendContainer}
      >
        <Text style={[
          styles.resendText,
          { 
            color: canResend 
              ? theme.colors.primary 
              : theme.colors.textSecondary 
          }
        ]}>
          {canResend 
            ? 'Resend Code' 
            : `Resend code in ${countdown}s`
          }
        </Text>
      </TouchableOpacity>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.buttonWrapper}
          onPress={handleVerifyCode}
          disabled={loading || otpValue.length !== 6}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={
              loading ? 
                ['rgba(150,150,150,0.5)', 'rgba(120,120,120,0.8)'] : 
                otpValue.length === 6 ?
                  [theme.colors.primary, theme.colors.primaryDark || '#0055b3'] :
                  ['rgba(200,200,200,0.5)', 'rgba(180,180,180,0.8)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.verifyButton}
          >
            <Text style={[styles.buttonText, { color: theme.colors.buttonText }]}>
              {loading ? "Verifying..." : "Verify"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
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

  // Function to check password strength
  const getPasswordStrength = () => {
    if (!password) return 0;
    
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
    
    return score;
  };

  const renderPasswordStrengthBar = () => {
    const strength = getPasswordStrength();
    const strengthText = ['Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
    const strengthColor = [
      '#FF6B6B', // Red (Weak)
      '#FFD166', // Yellow (Fair)
      '#06D6A0', // Green (Good)
      '#118AB2', // Blue (Strong)
      '#073B4C'  // Dark Blue (Excellent)
    ];
    
    return (
      <View style={styles.strengthContainer}>
        <View style={styles.strengthBarContainer}>
          {[1, 2, 3, 4, 5].map(index => (
            <View 
              key={index}
              style={[
                styles.strengthSegment,
                { 
                  backgroundColor: strength >= index 
                    ? strengthColor[index-1] 
                    : '#E0E0E0'
                }
              ]}
            />
          ))}
        </View>
        {password && (
          <Text style={styles.strengthText}>
            Password Strength: {strengthText[strength-1] || 'Too weak'}
          </Text>
        )}
      </View>
    );
  };

  const renderPasswordCriteria = () => {
    const criteria = [
      { key: 'length', label: 'At least 8 characters', 
        met: password.length >= 8 },
      { key: 'upper', label: 'At least one uppercase letter', 
        met: /[A-Z]/.test(password) },
      { key: 'lower', label: 'At least one lowercase letter', 
        met: /[a-z]/.test(password) },
      { key: 'number', label: 'At least one number', 
        met: /[0-9]/.test(password) },
      { key: 'special', label: 'At least one special character', 
        met: /[!@#$%^&*(),.?":{}|<>]/.test(password) }
    ];
    
    return (
      <View style={styles.criteriaContainer}>
        {criteria.map(item => (
          <View key={item.key} style={styles.criteriaRow}>
            <Entypo 
              name={item.met ? "check" : "circle"} 
              size={16} 
              color={item.met ? "#06D6A0" : "#BBBBBB"} 
              style={styles.criteriaIcon}
            />
            <Text style={[
              styles.criteriaText,
              { color: item.met ? theme.colors.secondary : "#888888" }
            ]}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderPasswordCreation = () => (
    <Animated.View 
      style={[
        styles.animatedContainer,
        { 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
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
      
      <View style={styles.cardContainer}>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Your email has been verified. Please create a strong password for your account.
        </Text>
      </View>
      
      <View style={styles.passwordFormContainer}>
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
          leftIcon={<Entypo name="lock" size={20} color={theme.colors.secondary} />}
        />
        
        {renderPasswordStrengthBar()}
        {renderPasswordCriteria()}
        
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
          leftIcon={<Entypo name="lock-open" size={20} color={theme.colors.secondary} />}
        />
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.buttonWrapper}
          onPress={handleCreatePassword}
          disabled={loading || !password || !confirmPassword}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={
              loading ? 
                ['rgba(150,150,150,0.5)', 'rgba(120,120,120,0.8)'] : 
                (password && confirmPassword) ?
                  [theme.colors.primary, theme.colors.primaryDark || '#0055b3'] :
                  ['rgba(200,200,200,0.5)', 'rgba(180,180,180,0.8)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.verifyButton}
          >
            <Text style={[styles.buttonText, { color: theme.colors.buttonText }]}>
              {loading ? "Creating..." : "Create Password"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
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
                  // Animate back to OTP screen
                  Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true
                  }).start(() => {
                    setVerificationStep('otp');
                    Animated.timing(fadeAnim, {
                      toValue: 1,
                      duration: 300,
                      useNativeDriver: true
                    }).start();
                  });
                } else {
                  navigation.goBack();
                }
              }} 
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Entypo name="chevron-left" size={28} color={theme.colors.secondary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.contentContainer}>
            {verificationStep === 'otp' ? renderOtpVerification() : renderPasswordCreation()}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Premium corner decorative elements */}
      <View style={[styles.cornerDecoration, styles.topLeftCorner]} />
      <View style={[styles.cornerDecoration, styles.bottomRightCorner]} />
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
  animatedContainer: {
    flex: 1,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 10,
    fontFamily: 'Montserrat',
    letterSpacing: 0.5,
  },
  imageContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  image: {
    width: 180,
    height: 180,
  },
  cardContainer: {
    backgroundColor: 'rgba(245,245,245,0.5)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 5,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: '#007AFF',
    letterSpacing: 0.2,
  },
  otpMainContainer: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 20,
  },
  otpDisplayContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  otpDigitDisplay: {
    width: 50,
    height: 64,
    borderWidth: 2,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    marginHorizontal: 3,
  },
  otpDigitText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  hiddenOtpInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
  },
  tapToFocusArea: {
    backgroundColor: 'rgba(245,245,245,0.5)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 5,
  },
  tapToFocusText: {
    color: '#888',
    fontSize: 14,
  },
  passwordFormContainer: {
    width: '100%',
    marginBottom: 10,
  },
  passwordInputContainer: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  strengthContainer: {
    marginBottom: 20,
    width: '100%',
  },
  strengthBarContainer: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  strengthSegment: {
    flex: 1,
    marginHorizontal: 2,
    borderRadius: 4,
  },
  strengthText: {
    fontSize: 12,
    color: '#777',
    textAlign: 'right',
  },
  criteriaContainer: {
    marginBottom: 20,
    backgroundColor: 'rgba(245,245,245,0.5)',
    borderRadius: 10,
    padding: 15,
  },
  criteriaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  criteriaIcon: {
    marginRight: 8,
  },
  criteriaText: {
    fontSize: 14,
  },
  resendContainer: {
    alignItems: 'center',
    marginVertical: 15,
  },
  resendText: {
    fontSize: 16,
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 20,
  },
  buttonWrapper: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  verifyButton: {
    width: '100%',
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
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

export default OtpInputScreen; 