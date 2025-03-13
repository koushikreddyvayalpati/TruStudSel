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
// import { ProgressViewIOS } from 'react-native-community/progress-view';

const EmailVerificationPage = ({ navigation }: { navigation: any }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!email || !name || !phoneNumber) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const eduEmailRegex = /^[^\s@]+@[^\s@]+\.edu$/;
    if (!emailRegex.test(email) || !eduEmailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid .edu email address');
      return;
    }
    
    // Validate phone number format
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(phoneNumber)) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }
    
    setLoading(true);
    try {
      // Generate a temporary password for the initial sign-up
      const tempPassword = Math.random().toString(36).slice(-8) + 'Aa1!';
      
      // Format phone number with + prefix if not already present
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
      
      // Sign up the user with Cognito using the exact attribute names required by your schema
      const signUpResponse = await Auth.signUp({
        username: email,
        password: tempPassword,
        attributes: {
          email,
          phone_number: formattedPhone,
          name,
          // 'custom:phoneNumbers': formattedPhone,
          // 'name.formatted': name,
        }
      });
      
      console.log('Sign up successful, verification code sent:', signUpResponse);
      
      // Pass all user data to OTP page
      navigation.navigate('OtpInput', { 
        email,
        tempPassword,
        name,
        phoneNumber: formattedPhone
      });
      
    } catch (error) {
      console.error('Error:', error);
      
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
                  await Auth.resendSignUp(email);
                  Alert.alert('Success', 'Verification code has been resent');
                  navigation.navigate('OtpInput', { 
                    email,
                    name,
                    phoneNumber: phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`
                  });
                } catch (resendError) {
                  Alert.alert('Error', (resendError as Error).message || 'Failed to resend verification code');
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', (error as Error).message || 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Please fill in your details</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Phone Number (with country code)"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
      />
      
      <TouchableOpacity 
        style={styles.button}
        onPress={handleContinue}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Continue</Text>
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

export default EmailVerificationPage; 