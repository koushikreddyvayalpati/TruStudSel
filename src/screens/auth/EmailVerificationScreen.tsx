import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Auth } from 'aws-amplify';
import { EmailVerificationScreenProps } from '../../types/navigation.types';
import { useTheme } from '../../hooks';
import { TextInput } from '../../components/common';
import Entypo from 'react-native-vector-icons/Entypo';
import LinearGradient from 'react-native-linear-gradient';

// For consistent logging in development
const SCREEN_NAME = 'EmailVerification';

const EmailVerificationScreen: React.FC<EmailVerificationScreenProps> = ({ route, navigation }) => {
  const { theme } = useTheme();
  const [email, setEmail] = useState(route.params?.email || '');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Animated values
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Animate progress from 0 to 30% when screen loads
  useEffect(() => {
    // Animate elements
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
      Animated.timing(progressAnim, {
        toValue: 30,
        duration: 1200,
        useNativeDriver: false,
      })
    ]).start();
    
    return () => {
      progressAnim.setValue(0);
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    };
  }, [progressAnim, fadeAnim, slideAnim]);

  // Function to log important actions for easier debugging
  const logDebug = (message: string, data?: any) => {
    if (data) {
      console.log(`[${SCREEN_NAME}] ${message}`, data);
    } else {
      console.log(`[${SCREEN_NAME}] ${message}`);
    }
  };

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
    
    // Animate progress to 50%
    Animated.timing(progressAnim, {
      toValue: 50,
      duration: 600,
      useNativeDriver: false,
    }).start();
    
    try {
      // Format phone number with + prefix if not already present
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
      
      // Generate a temporary password for the initial sign-up
      const tempPassword = Math.random().toString(36).slice(-8) + 'Aa1!';
      
      // Simulate some delay for visual feedback (remove in production)
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Sign up the user with Cognito
      const signUpResponse = await Auth.signUp({
        username: email,
        password: tempPassword,
        attributes: {
          email,
          phone_number: formattedPhone,
          name
        }
      });
      
      // Animate progress to 80%
      Animated.timing(progressAnim, {
        toValue: 80,
        duration: 600,
        useNativeDriver: false,
      }).start();
      
      // Simulate some delay for visual feedback (remove in production)
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Animate to 100% complete
      Animated.timing(progressAnim, {
        toValue: 100,
        duration: 600,
        useNativeDriver: false,
      }).start();
      
      logDebug('Sign up successful, verification code sent:', signUpResponse);
      
      // Short delay before navigating
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Navigate to OTP screen with all required parameters
      navigation.navigate('OtpInput', {
        email,
        tempPassword,
        name,
        phoneNumber: formattedPhone
      });
      
    } catch (error: any) {
      logDebug('Error during signup:', error);
      
      // Reset progress on error
      Animated.timing(progressAnim, {
        toValue: 30,
        duration: 300,
        useNativeDriver: false,
      }).start();
      
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
                  setLoading(true);
                  
                  Animated.timing(progressAnim, {
                    toValue: 50,
                    duration: 600,
                    useNativeDriver: false,
                  }).start();
                  
                  await Auth.resendSignUp(email);
                  
                  Animated.timing(progressAnim, {
                    toValue: 100,
                    duration: 600,
                    useNativeDriver: false,
                  }).start();
                  
                  await new Promise(resolve => setTimeout(resolve, 800));
                  
                  Alert.alert('Success', 'Verification code has been resent');
                  navigation.navigate('OtpInput', { 
                    email,
                    name,
                    phoneNumber: phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`
                  });
                } catch (resendError: any) {
                  Alert.alert('Error', resendError.message || 'Failed to resend verification code');
                  
                  // Reset progress on error
                  Animated.timing(progressAnim, {
                    toValue: 30,
                    duration: 300,
                    useNativeDriver: false,
                  }).start();
                } finally {
                  setLoading(false);
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

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const getButtonGradient = () => {
    return loading 
      ? ['rgba(150,150,150,0.5)', 'rgba(120,120,120,0.8)']
      : [theme.colors.primary, theme.colors.primaryDark || '#007bff'];
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Fixed position back button */}
      <TouchableOpacity 
        style={styles.fixedBackButton}
        onPress={() => navigation.navigate('SignIn')}
        activeOpacity={0.7}
      >
        <Entypo name="chevron-left" size={32} color={theme.colors.secondary} />
      </TouchableOpacity>
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView 
          contentContainerStyle={[
            styles.scrollContainer,
            Platform.OS === 'android' ? { paddingTop: 15 } : {}
          ]}
          showsVerticalScrollIndicator={false}
        >
          
          
          <Animated.View 
            style={[
              styles.contentContainer,
              { 
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <Text style={[styles.title, { color: theme.colors.secondary }]}>Create</Text>
            <Text style={[styles.title, { color: theme.colors.secondary }]}>Account</Text>
            
            <View style={styles.imageContainer}>
              <Image 
                source={require('../../../assets/amico.png')} 
                style={styles.image}
                resizeMode="contain"
              />
            </View>
            
            {/* <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Please fill in your details
            </Text> */}
            
            <View style={styles.formContainer}>
              <TextInput
                label="Full Name"
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                autoCapitalize="words"
                containerStyle={styles.inputContainer}
                leftIcon={<Entypo name="user" size={20} color={"#888"} />}
              />
              
              <TextInput
                label="Email (.edu only)"
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your .edu email"
                keyboardType="email-address"
                autoCapitalize="none"
                containerStyle={styles.inputContainer}
                leftIcon={<Entypo name="mail" size={20} color={"#888"} />}
              />
              
              <TextInput
                label="Phone Number"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Enter with country code (e.g., +1...)"
                keyboardType="phone-pad"
                containerStyle={styles.inputContainer}
                leftIcon={<Entypo name="phone" size={20} color={"#888"} />}
              />
            </View>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.continueButtonWrapper}
                onPress={handleContinue}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={getButtonGradient()}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.continueButton}
                >
                  <Text style={[styles.buttonText, { color: theme.colors.buttonText }]}>
                    {loading ? "Processing..." : "Continue"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            
            {/* Progress indicator - with custom styling */}
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <Animated.View 
                  style={[
                    styles.progressBar, 
                    { 
                      width: progressWidth,
                      backgroundColor: loading ? '#FFB347' : theme.colors.primary,
                    }
                  ]} 
                />
              </View>
            </View>
            
            <View style={styles.legalTextContainer}>
              <Text style={styles.legalText}>
                By continuing, you agree to our <Text style={styles.highlightedText}>Terms of Service</Text> and <Text style={styles.highlightedText}>Privacy Policy</Text>
              </Text>
            </View>
          </Animated.View>
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
  scrollContainer: {
    flexGrow: 1,
    ...Platform.select({
      android: {
        paddingBottom: 20,
      }
    }),
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 10,
    ...Platform.select({
      android: {
        marginTop: 20,
        paddingTop: 0,
      }
    }),
  },
  backButtonWrapper: {
    backgroundColor: 'rgba(220,220,220,0.3)',
    padding: 5,
    borderRadius: 12,
    marginRight: 10,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      android: {
        marginTop: 0,
      }
    }),
  },
  backButton: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
  },
  textBackButton: {
    backgroundColor: 'rgba(200,200,200,0.3)',
    padding: 12,
    borderRadius: 8,
    marginLeft: 10,
  },
  textBackButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    letterSpacing: 0.5,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 35,
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
    marginBottom: 20,
    letterSpacing: 0.3,
  },
  formContainer: {
    width: '100%',
    marginBottom: 0,
  },
  inputContainer: {
    marginBottom: Platform.OS === 'android' ? 12 : 20,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 0,
        backgroundColor: '#fff',
      },
    }),
  },
  buttonContainer: {
    width: '100%',
    marginTop: Platform.OS === 'android' ? 12 : 20,
    alignItems: 'center',
  },
  continueButtonWrapper: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 0,
        backgroundColor: '#fff',
      },
    }),
  },
  continueButton: {
    width: '100%',
    height:  56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  imageContainer: {
    marginTop: Platform.OS === 'android' ? 0 : 20,
    alignItems: 'center',
  },
  image: {
    width: 200,
    height: Platform.OS === 'android' ? 190 : 200,
  },
  progressContainer: {
    marginTop: Platform.OS === 'android' ? 15 : 30,
    paddingHorizontal: 5,
    width: '100%',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#E8E8E8',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  legalTextContainer: {
    marginTop: Platform.OS === 'android' ? 10 : 24,
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: Platform.OS === 'android' ? 15 : 0,
  },
  legalText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#888',
    lineHeight: 18,
  },
  highlightedText: {
    fontWeight: '600',
    color: '#555',
  },
  cornerDecoration: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 30,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
        backgroundColor: '#FFFFFF',
      },
    }),
  },
  topLeftCorner: {
    top: -50,
    left: -50,
  },
  bottomRightCorner: {
    bottom: -50,
    right: -50,
  },
  fixedBackButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 4,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  fixedBackButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
    color: '#333',
  },
});

export default EmailVerificationScreen; 