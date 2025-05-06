import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  Platform,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GetStartedScreenNavigationProp } from '../../types/navigation.types';
import { useTheme } from '../../hooks';
import DeviceInfo from 'react-native-device-info';

const { width, height } = Dimensions.get('window');

// Determine if device is a tablet
const isTablet = DeviceInfo.isTablet(); 

// Responsive sizing based on screen size
const scale = width / 390; // Base scale on typical phone width
const moderateScale = (size: number, factor: number = 0.5) => {
  if (isTablet) {
    return size + (scale - 1) * size * factor * 0.7; // Reduce scaling factor for tablets
  }
  return size + (scale - 1) * size * factor;
};

interface GetStartedScreenProps {
  navigation: GetStartedScreenNavigationProp;
}

const GetStartedScreen: React.FC<GetStartedScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();

  const handleGetStarted = async () => {
    try {
      // Mark that user has seen get started screen when they click the button
      await AsyncStorage.setItem('@has_seen_get_started', 'true');
      
      // Navigate to the next screen
      navigation.navigate('Onboarding');
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      // Still navigate even if saving to AsyncStorage fails
      navigation.navigate('Onboarding');
    }
  };

const Container = Platform.OS === 'ios' ? View : SafeAreaView;
  return (
    <Container style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={true}
      />
      <View style={styles.contentContainer}>
        <View style={styles.headerContainer}>
          <Text style={[styles.title, { color: theme.colors.primary }]}>TruStudSel</Text>
          <Text style={[styles.subtitle, { color: theme.colors.text }]}>Welcome's You</Text>
        </View>
        
        <View style={styles.imageWrapper}>
          <Image
            source={require('../../../assets/intro2.png')}
            style={styles.image}
            resizeMode={isTablet ? 'stretch' : 'cover'}
          />
        </View>
        
        <View style={styles.trustContainer}>
          <Text style={styles.trustText}>True</Text>
          <Text style={styles.trustText}>Student</Text>
          <Text style={styles.trustText}>Sell</Text>
          <TouchableOpacity
            style={[styles.getStartedButton, { backgroundColor: theme.colors.secondaryDark }]}
            onPress={handleGetStarted}
          >
            <Text style={[styles.getStartedText, { color: theme.colors.buttonText }]}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Container>
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
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 60,
  },
  image: {
    width: isTablet ? width * 1.1 : width * 1.1,
    height: isTablet ? width * 0.55 : width * 0.85,
    marginTop: 10,
    marginLeft: 10
  },
  title: {
    fontSize: isTablet ? 60 : 44,
    fontWeight: 700,
    fontFamily: 'Montserrat',

  },
  subtitle: {
    fontSize: isTablet ? 40 : 34,
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
    fontSize: isTablet ? 60 : 40,
    fontWeight: '700',
    color: 'black',
    marginBottom: 10,
    fontFamily: 'Montserrat-bold',
    ...Platform.select({
      ios: {
        marginBottom: 20,
      },
    }),
  },
  getStartedButton: {
    padding: isTablet ? 20 : 15,
    borderRadius: isTablet ? 20 : 10,
    marginTop: 20,
    width: width * 0.7,
    ...Platform.select({
      android: {
        marginBottom: 10,
      },
    }),
  },
  getStartedText: {
    fontSize: isTablet ? 30 : 22,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'Montserrat',
  },
});

export default GetStartedScreen;
