import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ProgressBarAndroid, // For Android
// For iOS
} from 'react-native';
// import { ProgressViewIOS } from 'react-native-community/progress-view';

const EmailVerificationPage = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Email Verification</Text>
      <View style={styles.progressContainer}>
        {/* Progress Bar for Android */}
        {/* <ProgressBarAndroid 
          styleAttr="Horizontal" 
          indeterminate={false} 
          progress={100} // 10% progress
          color="#f7b305"
        /> */}
        {/* Progress Bar for iOS */}
        {/* <ProgressViewIOS 
          progress={0.1} // 10% progress
          color="#f7b305"
        /> */}
      </View>
      <TextInput 
        style={styles.input}
        placeholder="Enter your .edu email"
        placeholderTextColor="#999"
      />
      <TouchableOpacity 
        style={styles.verifyButton}
        onPress={() => {
          console.log('Verify button pressed');
          // Handle email verification logic here
          navigation.navigate('OtpInput');
        }}
      >
        <Text style={styles.verifyText}>Verify</Text>
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
  progressContainer: {
    width: '100%',
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

export default EmailVerificationPage; 