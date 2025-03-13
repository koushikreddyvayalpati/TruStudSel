import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Dimensions, 
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Auth } from 'aws-amplify';

const { width } = Dimensions.get('window');

const SignInPage = ({ navigation }: { navigation: any }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }
    setLoading(true);
    try {
      const user = await Auth.signIn(username, password);
      console.log('Login successful:', user);
      navigation.navigate('Home');
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Login Error', (error as Error).message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>TruStudSel</Text>
      </View>
      <View style={styles.container}>
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <Icon name="user" size={20} color="#999" style={styles.icon} />
            <TextInput 
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
              value={username}
              onChangeText={setUsername}
            />
          </View>
          <View style={styles.inputWrapper}>
            <Icon name="lock" size={20} color="#999" style={styles.icon} />
            <TextInput 
              style={styles.input}
              placeholder="Password"
              secureTextEntry
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
            />
          </View>
        </View>
        <TouchableOpacity 
          style={styles.loginButton}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginText}>Login</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.createAccountButton}
          onPress={() => navigation.navigate('EmailVerification')}
        >
          <Text style={styles.createAccountText}>Create Account</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 0,
  },
  titleContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: 50,
    marginBottom: 0,
    marginTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'semibold',
    color: '#f7b305',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  input: {
    paddingLeft: 40,
    width: '100%',
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  icon: {
    position: 'absolute',
    left: 10,
    top: 15,
  },
  loginButton: {
    backgroundColor: '#f7b305',
    padding: 15,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  loginText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  createAccountButton: {
    marginTop: 10,
    padding: 15,
    borderRadius: 5,
    borderColor: '#f7b305',
    borderWidth: 1,
    width: '100%',
    alignItems: 'center',
  },
  createAccountText: {
    color: '#f7b305',
    fontWeight: 'bold',
    fontSize: 18,
  },
  forgotPasswordText: {
    color: 'red',
    marginTop: 10,
  },
});

export default SignInPage; 