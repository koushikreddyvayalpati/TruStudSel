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
  ScrollView,
  Modal,
} from 'react-native';
import { Auth } from 'aws-amplify';
import { EmailVerificationScreenProps } from '../../types/navigation.types';
import { useTheme } from '../../hooks';
import { TextInput } from '../../components/common';
import Entypo from 'react-native-vector-icons/Entypo';
import LinearGradient from 'react-native-linear-gradient';
import DeviceInfo from 'react-native-device-info';

const isTablet = DeviceInfo.isTablet();

// For consistent logging in development
const SCREEN_NAME = 'EmailVerification';

const EmailVerificationScreen: React.FC<EmailVerificationScreenProps> = ({ route, navigation }) => {
  const { theme } = useTheme();
  const [email, setEmail] = useState(route.params?.email || '');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

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
      }),
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
      console.log(`[${SCREEN_NAME}] ${message}`);
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
          name,
        },
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
        phoneNumber: formattedPhone,
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
              style: 'cancel',
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
                    phoneNumber: phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`,
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
              },
            },
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

  const togglePrivacyModal = () => {
    setShowPrivacyModal(!showPrivacyModal);
  };

  const toggleTermsModal = () => {
    setShowTermsModal(!showTermsModal);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Fixed position back button */}
      <TouchableOpacity
        style={styles.fixedBackButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        {Platform.OS === 'ios' ? (
          <Entypo name="chevron-left" size={32} color={theme.colors.secondary} />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Entypo name="chevron-left" size={28} color="black" />
          </View>
        )}
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            Platform.OS === 'android' ? { paddingTop: 15 } : {},
          ]}
          showsVerticalScrollIndicator={false}
        >


          <Animated.View
            style={[
              styles.contentContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
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
                leftIcon={<Entypo name="user" size={20} color={'#888'} />}
              />

              <TextInput
                label="Email (.edu only)"
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your .edu email"
                keyboardType="email-address"
                autoCapitalize="none"
                containerStyle={styles.inputContainer}
                leftIcon={<Entypo name="mail" size={20} color={'#888'} />}
              />

              <TextInput
                label="Phone Number"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Enter with country code (e.g., +1...)"
                keyboardType="phone-pad"
                containerStyle={styles.inputContainer}
                leftIcon={<Entypo name="phone" size={20} color={'#888'} />}
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
                    {loading ? 'Processing...' : 'Continue'}
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
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.legalTextContainer}>
              <Text style={styles.legalText}>
                By continuing, you agree to our <Text style={styles.highlightedText} onPress={toggleTermsModal}>Terms of Service</Text> and <Text style={styles.highlightedText} onPress={togglePrivacyModal}>Privacy Policy</Text>
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Terms of Service Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showTermsModal}
        onRequestClose={toggleTermsModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Terms of Service</Text>
              <TouchableOpacity onPress={toggleTermsModal} style={styles.closeButton}>
                <Entypo name="cross" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              <Text style={styles.privacyTitle}>Terms and Conditions</Text>
              <Text style={styles.privacyDate}>Last updated: April 28, 2025</Text>

              <Text style={styles.privacyText}>
                Welcome to TruStudSel. These Terms and Conditions govern your use of the TruStudSel mobile application 
                and related services (collectively referred to as the "Service"). By accessing or using our Service, 
                you agree to be bound by these Terms. If you disagree with any part of the Terms, please do not use our Service.
              </Text>

              <Text style={styles.privacySectionTitle}>1. Acceptance of Terms</Text>
              <Text style={styles.privacyText}>
                By accessing or using the TruStudSel application, you acknowledge that you have read, understood, and agree to be bound by
                these Terms and Conditions, regardless of whether you are a registered user. If you are using the Service on behalf of an
                organization, you are agreeing to these Terms on behalf of that organization.
              </Text>

              <Text style={styles.privacySectionTitle}>2. Changes to Terms</Text>
              <Text style={styles.privacyText}>
                We reserve the right to modify these Terms at any time. We will always post the most current version on our website and may
                notify you through the Service. Your continued use of the Service after the changes have been made will constitute your
                acceptance of the revised Terms.
              </Text>

              <Text style={styles.privacySectionTitle}>3. Access to the Service</Text>
              <Text style={styles.privacyText}>
                TruStudSel grants you a limited, non-exclusive, non-transferable, revocable license to use the Service for your personal,
                non-commercial purposes. This license is subject to these Terms and does not include:
              </Text>
              <View style={styles.bulletPoint}>
                <Text style={styles.privacyText}>• Modifying or copying the materials</Text>
              </View>
              <View style={styles.bulletPoint}>
                <Text style={styles.privacyText}>• Using the materials for any commercial purpose</Text>
              </View>
              <View style={styles.bulletPoint}>
                <Text style={styles.privacyText}>• Attempting to decompile or reverse engineer any software contained in the Service</Text>
              </View>
              <View style={styles.bulletPoint}>
                <Text style={styles.privacyText}>• Removing any copyright or other proprietary notations from the materials</Text>
              </View>

              <Text style={styles.privacySectionTitle}>4. User Accounts</Text>
              <Text style={styles.privacyText}>
                To access certain features of the Service, you may be required to create a user account. You are responsible for:
              </Text>
              <View style={styles.bulletPoint}>
                <Text style={styles.privacyText}>• Maintaining the confidentiality of your account credentials</Text>
              </View>
              <View style={styles.bulletPoint}>
                <Text style={styles.privacyText}>• Restricting access to your device</Text>
              </View>
              <View style={styles.bulletPoint}>
                <Text style={styles.privacyText}>• Assuming responsibility for all activities that occur under your account</Text>
              </View>

              <Text style={styles.privacySectionTitle}>5. User Content</Text>
              <Text style={styles.privacyText}>
                Our Service allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or
                other material ("Content"). You are responsible for the Content that you post on or through the Service, including its legality,
                reliability, and appropriateness.
              </Text>

              <Text style={styles.privacySectionTitle}>6. User Conduct</Text>
              <Text style={styles.privacyText}>
                As a TruStudSel user, you agree not to:
              </Text>
              <View style={styles.bulletPoint}>
                <Text style={styles.privacyText}>• Post or sell illegal, harmful, or fraudulent items</Text>
              </View>
              <View style={styles.bulletPoint}>
                <Text style={styles.privacyText}>• Upload or share offensive, abusive, or obscene content</Text>
              </View>
              <View style={styles.bulletPoint}>
                <Text style={styles.privacyText}>• Post or share nudity or sexually explicit content</Text>
              </View>
              <View style={styles.bulletPoint}>
                <Text style={styles.privacyText}>• Spam, harass, or impersonate other users</Text>
              </View>
              <View style={styles.bulletPoint}>
                <Text style={styles.privacyText}>• Attempt to breach the security or functionality of the Service</Text>
              </View>

              <Text style={styles.privacySectionTitle}>7. Intellectual Property</Text>
              <Text style={styles.privacyText}>
                The Service and its original content (excluding Content provided by users), features, and functionality are and will remain the
                exclusive property of TruStudSel and its licensors. The Service is protected by copyright, trademark, and other laws of both the
                United States and foreign countries.
              </Text>

              <Text style={styles.privacySectionTitle}>8. Termination</Text>
              <Text style={styles.privacyText}>
                We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our
                sole discretion, for any reason whatsoever, including, but not limited to, a breach of the Terms.
              </Text>

              <Text style={styles.privacySectionTitle}>9. Disclaimer</Text>
              <Text style={styles.privacyText}>
                Your use of the Service is at your sole risk. The Service is provided on an "AS IS" and "AS AVAILABLE" basis. The Service is
                provided without warranties of any kind, whether express or implied, including, but not limited to, implied warranties of
                merchantability, fitness for a particular purpose, non-infringement, or course of performance.
              </Text>

              <Text style={styles.privacySectionTitle}>10. Limitation of Liability</Text>
              <Text style={styles.privacyText}>
                In no event shall TruStudSel, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any
                indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use,
                goodwill, or other intangible losses.
              </Text>

              <Text style={styles.privacySectionTitle}>11. Contact Us</Text>
              <Text style={styles.privacyText}>
                If you have any questions about these Terms, please contact us:
              </Text>
              <View style={styles.bulletPoint}>
                <Text style={styles.privacyText}>• By email: trustudsel@gmail.com</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showPrivacyModal}
        onRequestClose={togglePrivacyModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Privacy Policy</Text>
              <TouchableOpacity onPress={togglePrivacyModal} style={styles.closeButton}>
                <Entypo name="cross" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              <Text style={styles.privacyTitle}>Privacy Policy</Text>
              <Text style={styles.privacyDate}>Last updated: April 20, 2025</Text>

              <Text style={styles.privacyText}>
                This Privacy Policy describes Our policies and procedures on the collection,
                use and disclosure of Your information when You use the Service and tells You
                about Your privacy rights and how the law protects You.
              </Text>

              <Text style={styles.privacyText}>
                We use Your Personal data to provide and improve the Service. By using the
                Service, You agree to the collection and use of information in accordance with
                this Privacy Policy.
              </Text>

              <Text style={styles.privacySectionTitle}>Interpretation and Definitions</Text>

              <Text style={styles.privacySubtitle}>Interpretation</Text>
              <Text style={styles.privacyText}>
                The words of which the initial letter is capitalized have meanings defined
                under the following conditions. The following definitions shall have the same
                meaning regardless of whether they appear in singular or in plural.
              </Text>

              <Text style={styles.privacySubtitle}>Definitions</Text>
              <Text style={styles.privacyText}>
                For the purposes of this Privacy Policy:
              </Text>

              <View style={styles.bulletPoint}>
                <Text style={styles.privacyText}>• Account means a unique account created for You to access our Service or parts of our Service.</Text>
              </View>

              <View style={styles.bulletPoint}>
                <Text style={styles.privacyText}>• Affiliate means an entity that controls, is controlled by or is under common control with a party, where "control" means ownership of 50% or more of the shares, equity interest or other securities entitled to vote for election of directors or other managing authority.</Text>
              </View>

              <View style={styles.bulletPoint}>
                <Text style={styles.privacyText}>• Application refers to TruStudSel, the software program provided by the Company.</Text>
              </View>

              <View style={styles.bulletPoint}>
                <Text style={styles.privacyText}>• Company (referred to as either "the Company", "We", "Us" or "Our" in this Agreement) refers to TruStudSel.</Text>
              </View>

              <View style={styles.bulletPoint}>
                <Text style={styles.privacyText}>• Country refers to: Alabama, United States</Text>
              </View>

              <View style={styles.bulletPoint}>
                <Text style={styles.privacyText}>• Device means any device that can access the Service such as a computer, a cellphone or a digital tablet.</Text>
              </View>

              <View style={styles.bulletPoint}>
                <Text style={styles.privacyText}>• Personal Data is any information that relates to an identified or identifiable individual.</Text>
              </View>

              <View style={styles.bulletPoint}>
                <Text style={styles.privacyText}>• Service refers to the Application.</Text>
              </View>

              <View style={styles.bulletPoint}>
                <Text style={styles.privacyText}>• Service Provider means any natural or legal person who processes the data on behalf of the Company.</Text>
              </View>

              <View style={styles.bulletPoint}>
                <Text style={styles.privacyText}>• Usage Data refers to data collected automatically, either generated by the use of the Service or from the Service infrastructure itself.</Text>
              </View>

              <View style={styles.bulletPoint}>
                <Text style={styles.privacyText}>• You means the individual accessing or using the Service, or the company, or other legal entity on behalf of which such individual is accessing or using the Service, as applicable.</Text>
              </View>

              <Text style={styles.privacySectionTitle}>Collecting and Using Your Personal Data</Text>

              <Text style={styles.privacySubtitle}>Types of Data Collected</Text>
              <Text style={styles.privacySubSubtitle}>Personal Data</Text>
              <Text style={styles.privacyText}>
                While using Our Service, We may ask You to provide Us with certain personally
                identifiable information that can be used to contact or identify You.
                Personally identifiable information may include, but is not limited to:
              </Text>

              <View style={styles.bulletPoint}>
                <Text style={styles.privacyText}>• Email address</Text>
              </View>
              <View style={styles.bulletPoint}>
                <Text style={styles.privacyText}>• First name and last name</Text>
              </View>
              <View style={styles.bulletPoint}>
                <Text style={styles.privacyText}>• Phone number</Text>
              </View>
              <View style={styles.bulletPoint}>
                <Text style={styles.privacyText}>• Address, State, Province, ZIP/Postal code, City</Text>
              </View>
              <View style={styles.bulletPoint}>
                <Text style={styles.privacyText}>• Usage Data</Text>
              </View>

              <Text style={styles.privacySubSubtitle}>Usage Data</Text>
              <Text style={styles.privacyText}>
                Usage Data is collected automatically when using the Service.
              </Text>

              <Text style={styles.privacyText}>
                Usage Data may include information such as Your Device's Internet Protocol
                address (e.g. IP address), browser type, browser version, the pages of our
                Service that You visit, the time and date of Your visit, the time spent on
                those pages, unique device identifiers and other diagnostic data.
              </Text>

              <Text style={styles.privacyText}>
                When You access the Service by or through a mobile device, We may collect
                certain information automatically, including, but not limited to, the type of
                mobile device You use, Your mobile device unique ID, the IP address of Your
                mobile device, Your mobile operating system, the type of mobile Internet
                browser You use, unique device identifiers and other diagnostic data.
              </Text>

              <Text style={styles.privacyText}>
                We may also collect information that Your browser sends whenever You visit our
                Service or when You access the Service by or through a mobile device.
              </Text>

              <Text style={styles.privacySectionTitle}>Contact Us</Text>
              <Text style={styles.privacyText}>
                If you have any questions about this Privacy Policy, You can contact us:
              </Text>
              <View style={styles.bulletPoint}>
                <Text style={styles.privacyText}>• By email: trustudsel@gmail.com</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
      },
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
      },
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
      },
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
    marginTop: isTablet ? 30 : 0,
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 35 : 35,
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
    fontSize: isTablet ? 18 : 12,
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
        elevation: 0,
        backgroundColor: '',
        height: 0,
        width: 0,
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
    top: Platform.OS === 'ios' ? 50 : 20,
    left: Platform.OS === 'ios' ? 4 : 10,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        backgroundColor: '',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        backgroundColor: '',
        paddingVertical: 10,
        paddingHorizontal: 6,
        marginTop: 0,
        borderRadius: 30,
        elevation: 0,
      },
    }),
  },
  fixedBackButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
    color: '#333',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    height: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  modalScrollView: {
    padding: 20,
  },
  privacyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  privacyDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  privacyText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
    marginBottom: 15,
  },
  privacySectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  privacySubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
    color: '#333',
  },
  privacySubSubtitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
    color: '#333',
  },
  bulletPoint: {
    flexDirection: 'row',
    marginLeft: 10,
    marginBottom: 5,
  },
});

export default EmailVerificationScreen;
