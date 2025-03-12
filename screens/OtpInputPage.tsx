import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert 
} from 'react-native';
import { Auth } from 'aws-amplify';

const OtpInputPage = ({ route, navigation }: { route: any, navigation: any }) => {
  const { email, tempPassword, name, phoneNumber } = route.params;
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!otp) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }
    
    if (!password) {
      Alert.alert('Error', 'Please create a password');
      return;
    }
    
    // Password validation
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }
    
    setLoading(true);
    try {
      // Confirm the sign up with the verification code
      await Auth.confirmSignUp(email, otp);
      
      // Try to sign in with the temporary password
      try {
        await Auth.signIn(email, tempPassword);
        
        // If sign-in is successful, try to change the password
        try {
          const user = await Auth.currentAuthenticatedUser();
          await Auth.changePassword(user, tempPassword, password);
          
          Alert.alert('Success', 'Account created successfully!', [
            { 
              text: 'OK', 
              onPress: () => navigation.navigate('ProfileFillingPage',{ 
                email,name
              })
            }
          ]);
        } catch (changePasswordError) {
          console.error('Error changing password:', changePasswordError);
          // If changing password fails, at least the account is created
          Alert.alert('Account Created', 'Your account was created, but we couldn\'t set your password. Please use the forgot password option to set a new password.', [
            { 
              text: 'OK', 
              onPress: () => navigation.navigate('ProfileFillingPage')
            }
          ]);
        }
      } catch (signInError) {
        console.error('Error signing in after confirmation:', signInError);
        // If sign-in fails, the account is still created
        Alert.alert('Account Created', 'Your account was created successfully. Please sign in with your email and password.', [
          { 
            text: 'OK', 
            onPress: () => navigation.navigate('SignIn')
          }
        ]);
      }
    } catch (error) {
      console.error('Error confirming sign up:', error);
      Alert.alert('Error', error.message || 'Failed to verify account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify Your Account</Text>
      <Text style={styles.subtitle}>Enter the verification code sent to {email}</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Verification Code"
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Create Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity 
        style={styles.button}
        onPress={handleSignUp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Create Account</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#f7b305',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    color: '#666',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  button: {
    backgroundColor: '#f7b305',
    height: 50,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OtpInputPage; 