import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  SafeAreaView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Onboarding2ScreenNavigationProp } from '../../types/navigation.types';
import { useTheme } from '../../hooks';

const { width } = Dimensions.get('window');

interface OnboardingScreen2Props {
  navigation: Onboarding2ScreenNavigationProp;
}

const OnboardingScreen2: React.FC<OnboardingScreen2Props> = ({ navigation }) => {
  const { theme } = useTheme();

  // Mark that user has seen onboarding
  useEffect(() => {
    const markAsSeen = async () => {
      try {
        await AsyncStorage.setItem('@has_seen_get_started', 'true');
        await AsyncStorage.setItem('@has_seen_onboarding', 'true');
      } catch (error) {
        console.error('Error saving onboarding status:', error);
      }
    };

    markAsSeen();
  }, []);

  const handleSkip = async () => {
    try {
      // If user skips, mark as having seen onboarding
      await AsyncStorage.setItem('@has_seen_get_started', 'true');
      await AsyncStorage.setItem('@has_seen_onboarding', 'true');
      navigation.navigate('SignIn');
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      navigation.navigate('SignIn');
    }
  };

  const handleNext = async () => {
    navigation.navigate('Onboarding3');
  };

  const handleBack = async () => {
    navigation.navigate('Onboarding');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={styles.pageIndicator}>2/3</Text>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.imageContainer}>
        <Image
          source={require('../../../assets/image.jpg')}
          style={styles.image}
          resizeMode="contain"
        />
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.title}>Instant Chat</Text>
        <Text style={styles.description}>
          Message the seller directly from product listing and get the best price for your product
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.backButton]}
          onPress={handleBack}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.paginationDots}>
          <View style={styles.dot} />
          <View style={[styles.dot, styles.activeDot]} />
          <View style={styles.dot} />
        </View>

        <TouchableOpacity
          style={[styles.nextButton]}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    ...Platform.select({
      android: {
        marginTop: 30,
      }
    })
  },
  pageIndicator: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    marginLeft: 10,
  },
  skipText: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    marginRight: 10,
  },
  imageContainer: {
    marginTop: 80,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    marginTop: 30,
    width: width * 0.8,
    height: width * 0.8,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'Montserrat',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#888',
    lineHeight: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  paginationDots: {
    flexDirection: 'row',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DDD',
    marginRight: 8,
  },
  activeDot: {
    backgroundColor: '#F7B305',
    width: 50,
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 4,
  },
  backButtonText: {
    color: '#888',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  nextButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 4,
  },
  nextButtonText: {
    color: '#f7b305',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
});

export default OnboardingScreen2;
