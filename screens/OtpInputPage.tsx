import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity 
} from 'react-native';

const OtpInputPage = ({ navigation }: { navigation: any }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter OTP</Text>
      <Text style={styles.instruction}>Please enter the OTP sent to your email.</Text>
      <TextInput 
        style={styles.input}
        placeholder="Enter OTP"
        placeholderTextColor="#999"
        keyboardType="numeric"
      />
      <TouchableOpacity 
        style={styles.verifyButton}
        onPress={() => {
          console.log('Verify OTP button pressed');
          // Handle OTP verification logic here
          navigation.navigate('ProfileFillingPage');
        }}
      >
        <Text style={styles.verifyText}>Verify OTP</Text>
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
    marginBottom: 20,
  },
  instruction: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  verifyButton: {
    backgroundColor: '#f7b305',
    padding: 15,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  verifyText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
});

export default OtpInputPage; 