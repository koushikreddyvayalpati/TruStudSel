import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Dimensions, 
  ImageBackground
} from 'react-native';

const { width } = Dimensions.get('window');

const GetStartedScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>TruStudSel</Text>
      <Text style={styles.subtitle}>Welcome's You</Text>
      <Image 
        source={require('../assets/intro.jpg')} // Update with your image path
        style={styles.image}
      />
      <ImageBackground 
      source={require('../assets/Yellow.png')}
      style={styles.trustContainer}>
        <Text style={styles.trustText}>Trust</Text>
        <Text style={styles.trustText}>Student</Text>
        <Text style={styles.trustText}>Sell</Text>
        <TouchableOpacity 
        style={styles.getStartedButton}
        onPress={() => navigation.navigate('SignIn')} // Navigate to Home or any other screen
      >
        <Text style={styles.getStartedText}>Get Started</Text>
      </TouchableOpacity>
      </ImageBackground>

     
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start', // Align items to the top
    backgroundColor: '#fff',
    paddingTop: 50, 
    marginTop: 10,// Add padding to the top for spacing
  },
  image: {
    width: width * 0.99,
    height: width * 0.9,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f7b305',
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  trustContainer: {
    flex: 1,
    backgroundColor: 'rgba(128, 128, 128, 0.8)',
    flexDirection: 'column',
    justifyContent: 'center',
    width: '100%',
    alignItems: 'center',
  },
  trustText: {
    fontSize: 34,
    fontWeight: '300',
    color: 'black', 
    marginBottom: 20,
    fontFamily: 'Montserrat-Regular',
    // Change text color to white for contrast
  },
  getStartedButton: {
    backgroundColor: 'black',
    padding: 15,
    borderRadius: 5,
    marginTop: 20,
    width: width * 0.7,
  },
  getStartedText: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default GetStartedScreen; 