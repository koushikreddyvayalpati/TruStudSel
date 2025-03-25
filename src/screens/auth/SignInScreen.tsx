import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SignInScreenNavigationProp } from '../../types/navigation.types';
import { useAuth } from '../../contexts';
import { useTheme } from '../../hooks';
import { TextInput } from '../../components/common';

const SignInScreen: React.FC = () => {
  const navigation = useNavigation<SignInScreenNavigationProp>();
  const { theme } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }
    setLoading(true);
    try {
      const user = await signIn(username, password);
      console.log('Login successful:', user);
      
      // Get user attributes if available
      const userAttributes = user.attributes || {};
      console.log('User attributes:', userAttributes);
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Login Error', (error as Error).message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: theme.colors.primary }]}>TruStudSel</Text>
      </View>
      
      <View style={styles.formContainer}>
        <TextInput
          label="Email"
          value={username}
          onChangeText={setUsername}
          placeholder="Enter your email"
          leftIcon={<Text style={{ color: theme.colors.primary }}>📧</Text>}
          containerStyle={styles.inputContainer}
        />
        
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          secureTextEntry
          isPassword
          leftIcon={<Text style={{ color: theme.colors.primary }}>🔒</Text>}
          containerStyle={styles.inputContainer}
        />
        
        <TouchableOpacity 
          style={[
            styles.loginButton,
            { backgroundColor: theme.colors.primary }
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.buttonText} />
          ) : (
            <Text style={[styles.loginText, { color: theme.colors.buttonText }]}>
              Login
            </Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.createAccountButton,
            { 
              borderColor: theme.colors.primary,
              backgroundColor: theme.colors.background 
            }
          ]}
          onPress={() => navigation.navigate('EmailVerification', { email: '' })}
        >
          <Text style={[styles.createAccountText, { color: theme.colors.primary }]}>
            Create Account
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => navigation.navigate('ForgotPassword')}
          style={styles.forgotPasswordContainer}
        >
          <Text style={[styles.forgotPasswordText, { color: theme.colors.error }]}>
            Forgot Password?
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
  },
  formContainer: {
    paddingHorizontal: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  loginButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  loginText: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  createAccountButton: {
    marginTop: 16,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  createAccountText: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  forgotPasswordText: {
    fontSize: 16,
  },
});

export default SignInScreen; 