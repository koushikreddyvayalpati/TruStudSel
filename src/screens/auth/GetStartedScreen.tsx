import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Dimensions, 
  ImageBackground,
  StatusBar,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GetStartedScreenNavigationProp } from '../../types/navigation.types';
import { useTheme } from '../../hooks';

const { width } = Dimensions.get('window');

interface GetStartedScreenProps {
  navigation: GetStartedScreenNavigationProp;
}

const GetStartedScreen: React.FC<GetStartedScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  
  // Mark that user has seen get started screen when they view it
  useEffect(() => {
    const markAsSeen = async () => {
      try {
        await AsyncStorage.setItem('@has_seen_get_started', 'true');
      } catch (error) {
        console.error('Error saving onboarding status:', error);
      }
    };
    
    markAsSeen();
  }, []);
  
  const handleGetStarted = async () => {
    // Navigate to the next screen
    navigation.navigate('Onboarding');
  };
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={true}
      />
      <View style={styles.contentContainer}>
        <Text style={[styles.title, { color: theme.colors.primary }]}>TruStudSel</Text>
        <Text style={[styles.subtitle, { color: theme.colors.text }]}>Welcome's You</Text>
        <Image 
          source={require('../../../assets/intro.jpg')} // Update with your image path
          style={styles.image}
          resizeMode="cover"
        />
        <ImageBackground 
          //source={require('../../../assets/Yellow.png')}
          style={styles.trustContainer}
          resizeMode="cover"
        >
          <Text style={styles.trustText}>True</Text>
          <Text style={styles.trustText}>Student</Text>
          <Text style={styles.trustText}>Sell</Text>
          <TouchableOpacity 
            style={[styles.getStartedButton, { backgroundColor: theme.colors.secondaryDark }]}
            onPress={handleGetStarted}
          >
            <Text style={[styles.getStartedText, { color: theme.colors.buttonText }]}>Get Started</Text>
          </TouchableOpacity>
        </ImageBackground>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 20 : 60,
  },
  image: {
    width: width * 1,
    height: width * 0.85,
    marginTop: 10,
  },
  title: {
    fontSize: 44,
    fontWeight: 700,
    fontFamily: 'Montserrat',

  },
  subtitle: {
    fontSize: 34,
    fontWeight: '700',
    marginBottom: 20,
    fontFamily: 'Montserrat',
  },
  trustContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#f7b305',
  },
  trustText: {
    fontSize: 40,
    fontWeight: '700',
    color: 'black',
    marginBottom: 20,
    fontFamily: 'Montserrat-bold',
  },
  getStartedButton: {
    padding: 15,
    borderRadius: 5,
    marginTop: 20,
    width: width * 0.7,
  },
  getStartedText: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'Montserrat',
  },
});

export default GetStartedScreen; 