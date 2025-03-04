import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Dimensions 
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

const { width } = Dimensions.get('window');

const SignInPage = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>TruStudSel</Text>
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <Icon name="user" size={20} color="#999" style={styles.icon} />
          <TextInput 
            style={styles.input}
            placeholder="Username or Email"
            placeholderTextColor="#999"
          />
        </View>
        <View style={styles.inputWrapper}>
          <Icon name="lock" size={20} color="#999" style={styles.icon} />
          <TextInput 
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            placeholderTextColor="#999"
          />
        </View>
      </View>
      <TouchableOpacity 
        style={styles.loginButton}
        onPress={() => {
          console.log('Login pressed');
          // Handle login logic here
        }}
      >
        <Text style={styles.loginText}>Login</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.createAccountButton}
        onPress={() => navigation.navigate('EmailVerification')} // Navigate to GetStarted or Create Account screen
      >
        <Text style={styles.createAccountText}>Create Account</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        onPress={() => {
          console.log('Forgot Password pressed');
          // Handle forgot password logic here
        }}
      >
        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f7b305',
    marginBottom: 40,
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