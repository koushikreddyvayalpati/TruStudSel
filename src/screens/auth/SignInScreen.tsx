import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Pressable,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  SafeAreaView,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SignInScreenNavigationProp } from '../../types/navigation.types';
import { useAuth } from '../../contexts';
import { TextInput, LoadingOverlay } from '../../components/common';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Entypo from 'react-native-vector-icons/Entypo';

import DeviceInfo from 'react-native-device-info';

const isTablet = DeviceInfo.isTablet(); 

const SignInScreen: React.FC = () => {
  const navigation = useNavigation<SignInScreenNavigationProp>();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const { signIn } = useAuth();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

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

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  // Toggle modal functions
  const togglePrivacyModal = () => {
    setShowPrivacyModal(!showPrivacyModal);
  };

  const toggleTermsModal = () => {
    setShowTermsModal(!showTermsModal);
  };

  // Define loading steps
  const loadingSteps = useMemo(() => [
    { id: 'signing', message: 'Signing you in...' },
    { id: 'verifying', message: 'Verifying your account...' },
    { id: 'success', message: 'Login successful!' },
  ], []);

  const handleLogin = async () => {
    // 1. Check if fields are empty
    if (!username || !password) {
      Alert.alert('Error', 'Please enter both your .edu email and password');
      return;
    }

    // 2. Validate email format (.edu)
    if (!username.includes('@') || !username.toLowerCase().endsWith('.edu')) {
      Alert.alert(
        'Invalid Email',
        'Please use your university email address ending with .edu to sign in.'
      );
      return;
    }

    setLoading(true);
    setLoadingStep(0);

    try {
      // Show verifying step after a brief delay
      setTimeout(() => setLoadingStep(1), 800);

      const user = await signIn(username, password);
      // console.log('Login successful:', user);

      // Get user attributes if available
      const userAttributes = user.attributes || {};
      // console.log('User attributes:', userAttributes);

      // Set the email as username if email is empty
      if (!userAttributes.email && username.includes('@')) {
        console.log('Setting email from username:', username);
      }

      // Show success message briefly before continuing
      setLoadingStep(2);
      setTimeout(() => {
        setLoading(false);
      }, 800);

    } catch (err) {
      setLoading(false);

      // Capture error details
      let errorName = '';
      let errorMessage = '';

      if (err && typeof err === 'object') {
        errorName = (err as any).name || '';
        errorMessage = (err as any).message || '';

        if (!errorMessage && (err as any).toString) {
          const errString = (err as any).toString();
          if (errString !== '[object Object]') {
            errorMessage = errString;
          }
        }
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

      console.log('Login error details:', { errorName, errorMessage });

      // Handle UserNotFoundException specifically
      if (errorName === 'UserNotFoundException' ||
          errorMessage.includes('User does not exist') ||
          errorMessage.includes('user does not exist')) {

        // Log specifically for debugging if needed, but not as an error
        console.log('Handled UserNotFoundException - showing alert.');

        Alert.alert(
          'Account Not Found',
          'We couldn\'t find an account with this email. Please check your email or create a new account.',
          [
            {
              text: 'Sign Up',
              onPress: () => {
                console.log('Navigating to email verification...');
                navigation.navigate('EmailVerification', { email: username });
              },
            },
            { text: 'Try Again', style: 'cancel' },
          ],
          { cancelable: true }
        );
        return; // Important: Exit after handling this specific error
      }

      // Handle NotAuthorizedException (incorrect password)
      if (errorName === 'NotAuthorizedException' ||
          errorMessage.includes('Incorrect username or password')) {

        console.log('Handled NotAuthorizedException - showing alert.');

        Alert.alert(
          'Incorrect Password',
          'The password you entered is incorrect. Please try again or reset your password.',
          [
            {
              text: 'Forgot Password',
              onPress: () => {
                console.log('Navigating to ForgotPassword...');
                navigation.navigate('ForgotPassword');
              },
            },
            { text: 'Try Again', style: 'cancel' },
          ],
          { cancelable: true }
        );
        return; // Exit after handling this specific error
      }

      // Only log unhandled errors with console.error
      console.error('Login error (unhandled type):', err);

      // Generic error alert for anything else
      Alert.alert(
        'Login Error',
        errorMessage || 'Failed to sign in',
        [{ text: 'OK', style: 'cancel' }],
        { cancelable: true }
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContainer,
              Platform.OS === 'android' && { paddingTop: 15 },
            ]}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Loading overlay */}
            <LoadingOverlay
              visible={loading}
              steps={loadingSteps}
              currentStep={loadingStep}
              showProgressDots={true}
            />

            <View style={[styles.logoContainer, keyboardVisible && styles.logoContainerCompressed]}>
              <Text style={styles.logoText}>TruStudSel</Text>
              <Text style={styles.tagline}>Your Campus Your Market Your Way</Text>

              {!keyboardVisible && (
                <Image
                  source={require('../../../assets/Group.jpg')}
                  style={styles.logoImage}
                  resizeMode="contain"
                  fadeDuration={0}
                  {...(Platform.OS === 'ios' ? { defaultSource: require('../../../assets/Group.jpg') } : {})}
                />
              )}
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputWrapper}>
                <TextInput
                  label="University Email"
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Enter your .edu email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  leftIcon={<FontAwesome name="envelope" size={20} color="#888" />}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputWrapper}>
                <TextInput
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  secureTextEntry
                  isPassword
                  leftIcon={<MaterialIcons name="lock" size={22} color="#888" />}
                  placeholderTextColor="#999"
                />
              </View>

              <Text
                style={styles.forgotPassword}
                onPress={() => {
                  console.log('Navigating to ForgotPassword screen');
                  navigation.navigate('ForgotPassword');
                }}
              >
                Forgot Password?
              </Text>

              <Pressable
                onPress={handleLogin}
                style={({ pressed }) => [
                  styles.loginButton,
                  pressed && styles.buttonPressed,
                  loading && styles.buttonDisabled,
                ]}
                android_ripple={{ color: 'rgba(255, 255, 255, 0.3)' }}
                disabled={loading}
              >
                <Text style={styles.buttonText}>Sign In</Text>
              </Pressable>

              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.divider} />
              </View>

              <Pressable
                onPress={() => navigation.navigate('EmailVerification', { email: '' })}
                style={({ pressed }) => [
                  styles.createAccountButton,
                  pressed && styles.buttonPressed,
                ]}
                android_ripple={{ color: 'rgba(255, 255, 255, 0.3)' }}
                disabled={loading}
              >
                <Text style={styles.buttonText}>Create Account</Text>
              </Pressable>
              
              <View style={styles.legalTextContainer}>
                <Text style={styles.legalText}>
                  By continuing, you agree to our{' '}
                  <Text style={styles.highlightedText} onPress={toggleTermsModal}>
                    Terms of Service
                  </Text>{' '}
                  and{' '}
                  <Text style={styles.highlightedText} onPress={togglePrivacyModal}>
                    Privacy Policy
                  </Text>
                </Text>
              </View>
            </View>
            
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
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 30,
    ...Platform.select({
      android: {
        paddingTop: 0,
      },
    }),
  },
  logoContainer: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 10 : 10,
    paddingBottom: 0,
  },
  logoContainerCompressed: {
    paddingTop: Platform.OS === 'android' ? 40 : 30,
    paddingBottom: 0,
  },
  logoText: {
    fontSize: isTablet ? 60 : 32,
    fontWeight: '700',
    color: '#f7b305',
    marginTop: Platform.OS === 'android' ? 10 : 20,
    letterSpacing: 0,
    fontFamily: 'Montserrat',
  },
  tagline: {
    fontSize: isTablet ? 35 : 18,
    color: '#333',
    marginTop: 0,
    fontFamily: 'Montserrat',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  logoImage: {
    width: isTablet ? 300 : 200,
    height: isTablet ? 300 : 200,
    marginTop: 10,

  },
  formContainer: {
    paddingHorizontal: isTablet ? 70 : 30,
    marginTop: 0,
    paddingTop: 0,
    flex: 1,
  },
  inputWrapper: {
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    marginBottom: 5,
    marginLeft: 4,
    letterSpacing: 0.3,
  },
  forgotPassword: {
    color: '#4A90E2',
    textAlign: 'right',
    marginBottom: 5,
    marginTop: -2,
    fontSize: isTablet ? 20 : 14,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#f7b305',
    borderRadius: 12,
    padding: isTablet ? 25 : 18,
    marginTop: 10,
    shadowColor: 'rgba(247,179,5,0.4)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createAccountButton: {
    backgroundColor: 'black',
    borderRadius: 12,
    padding: isTablet ? 25 : 18,
    marginTop: 5,
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: isTablet ? 25 : 17,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  buttonDisabled: {
    backgroundColor: '#d0d0d0',
    opacity: 0.7,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#888',
    fontSize: isTablet ? 20 : 14,
    fontWeight: '500',
  },
  legalTextContainer: {
    marginTop: 15,
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
    fontSize: isTablet ? 20 : 14,
    lineHeight: 20,
    color: '#333',
    marginBottom: 15,
  },
  privacySectionTitle: {
    fontSize: isTablet ? 25 : 18,
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
  bulletPoint: {
    marginLeft: 20,
  },
});

export default SignInScreen;
