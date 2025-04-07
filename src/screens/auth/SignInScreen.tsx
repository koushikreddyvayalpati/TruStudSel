import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert,
  Pressable,
  Image
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
      
      // Handle UserNotFoundException specifically - No console.error needed here as it's handled by the alert
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
              }
            },
            { text: 'Try Again', style: 'cancel' }
          ],
          { cancelable: true }
        );
        return; // Important: Exit after handling this specific error
      }
      
      // Log other errors before showing a generic alert
      console.error('Login error (unhandled type):', err);
      
      // Handle other common auth errors
      if (errorName === 'NotAuthorizedException' || 
          errorMessage.includes('Incorrect username or password')) {
        Alert.alert(
          'Login Error', 
          'Incorrect password. Please try again.',
          [{ text: 'OK', style: 'cancel' }],
          { cancelable: true }
        );
      } else {
        // Generic error alert for anything else
        Alert.alert(
          'Login Error', 
          errorMessage || 'Failed to sign in',
          [{ text: 'OK', style: 'cancel' }],
          { cancelable: true }
        );
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Loading overlay */}
      <LoadingOverlay
        visible={loading}
        steps={loadingSteps}
        currentStep={loadingStep}
        showProgressDots={true}
      />
      
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>TruStudSel</Text>
        <Image 
          source={require('../../../assets/Group.jpg')} 
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>
      
      <View style={styles.formContainer}>
      <TextInput
          label="Email"
          value={username}
          onChangeText={setUsername}
          placeholder="Enter your email"
          leftIcon={<FontAwesome name="user" size={22} color="grey" />}
          containerStyle={styles.inputContainer}
        />
        
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          secureTextEntry
          isPassword
          leftIcon={<MaterialIcons name="lock" size={22} color="grey" />}
          containerStyle={styles.inputContainer}
        />
        
        <Text 
          style={styles.forgotPassword}
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          Forgot Password?
        </Text>
        
        <Pressable
          onPress={handleLogin}
          style={({ pressed }) => [
            styles.loginButton,
            pressed && styles.buttonPressed,
            loading && styles.buttonDisabled
          ]}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.3)' }}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Login</Text>
        </Pressable>
        
        <Pressable
          onPress={() => navigation.navigate('EmailVerification', { email: '' })}
          style={({ pressed }) => [
            styles.createAccountButton,
            pressed && styles.buttonPressed
          ]}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.3)' }}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Create Account</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  logoContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 0,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#f7b305',
    marginTop: 30,
    letterSpacing: 0,
    fontFamily:'Montserrat'
  },
  logoImage: {
    width: 220,
    height: 220,
    marginLeft: 10,
    marginTop: 10,
  },
  userIcon: {
    textAlign: 'center',
  },
  formContainer: {
    paddingHorizontal: 30,
    marginTop: 0,
    paddingTop: 10,
    flex: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    height: 52,
    shadowColor: 'rgba(0,0,0,0.03)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  inputIcon: {
    marginRight: 12,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.5,
    color: '#888',
  },
  inputContainer: {
    marginBottom: 16,
    backgroundColor: 'f3f3f3',
  },
  input: {
    fontSize: 16,
    fontWeight: '400',
    color: '#333',
    letterSpacing: 0.2,
  },
  forgotPassword: {
    color: '#4A90E2',
    textAlign: 'right',
    marginBottom: 10,
    marginTop: 5,
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  loginButton: {
    backgroundColor: '#f7b305',
    borderRadius: 10,
    padding: 16,
    marginVertical: 10,
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createAccountButton: {
    backgroundColor: '#f7b305',
    borderRadius: 10,
    padding: 16,
    marginTop: 15,
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
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
    backgroundColor: '#e6a700',
  },
  buttonDisabled: {
    backgroundColor: '#d0d0d0',
    opacity: 0.7,
  },
});

export default SignInScreen; 