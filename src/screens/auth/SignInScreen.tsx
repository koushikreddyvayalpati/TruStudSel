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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SignInScreenNavigationProp } from '../../types/navigation.types';
import { useAuth } from '../../contexts';
import { TextInput, LoadingOverlay } from '../../components/common';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

const SignInScreen: React.FC = () => {
  const navigation = useNavigation<SignInScreenNavigationProp>();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const { signIn } = useAuth();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

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
      console.log('Login successful:', user);

      // Get user attributes if available
      const userAttributes = user.attributes || {};
      console.log('User attributes:', userAttributes);

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
            </View>
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
  },
  logoContainer: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 0,
  },
  logoContainerCompressed: {
    paddingTop: Platform.OS === 'android' ? 40 : 30,
    paddingBottom: 0,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#f7b305',
    marginTop: Platform.OS === 'android' ? 10 : 20,
    letterSpacing: 0,
    fontFamily: 'Montserrat',
  },
  tagline: {
    fontSize: 18,
    color: '#333',
    marginTop: 0,
    fontFamily: 'Montserrat',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  logoImage: {
    width: 200,
    height: 200,
    marginTop: 10,

  },
  formContainer: {
    paddingHorizontal: 30,
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
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#f7b305',
    borderRadius: 12,
    padding: 18,
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
    padding: 18,
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
    fontSize: 17,
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
    fontSize: 14,
    fontWeight: '500',
  },
});

export default SignInScreen;
