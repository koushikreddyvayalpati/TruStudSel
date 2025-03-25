import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SignInScreenNavigationProp } from '../../types/navigation.types';
import { useAuth } from '../../contexts';
import { useTheme } from '../../hooks';
import { TextInput, BridgelessButton } from '../../components/common';

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
        
        <BridgelessButton
          title="Login"
          onPress={handleLogin}
          isLoading={loading}
          buttonStyle={{ backgroundColor: theme.colors.primary, marginTop: 16 }}
          textStyle={{ color: theme.colors.buttonText, fontWeight: 'bold', fontSize: 18 }}
          loadingColor={theme.colors.buttonText}
          accessibilityLabel="Login to your account"
        />
        
        <BridgelessButton
          title="Create Account"
          onPress={() => navigation.navigate('EmailVerification', { email: '' })}
          buttonStyle={[styles.createAccountButton, { 
            borderColor: theme.colors.primary,
            backgroundColor: theme.colors.background 
          }]}
          textStyle={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: 18 }}
          accessibilityLabel="Create a new account"
        />
        
        <BridgelessButton
          title="Forgot Password?"
          onPress={() => navigation.navigate('ForgotPassword')}
          buttonStyle={{ backgroundColor: 'transparent', marginTop: 20 }}
          textStyle={{ color: theme.colors.error, fontSize: 16 }}
          accessibilityLabel="Reset your password"
        />
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
  createAccountButton: {
    marginTop: 16,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
  }
});

export default SignInScreen; 