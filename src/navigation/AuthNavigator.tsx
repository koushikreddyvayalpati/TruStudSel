import React, { useState, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthStackParamList } from '../types/navigation.types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View } from 'react-native';

// Import auth screens
import {
  SignInScreen,
  GetStartedScreen,
  OnboardingScreen,
  OnboardingScreen2,
  OnboardingScreen3,
  EmailVerificationScreen,
  OtpInputScreen,
  ProfileFillingScreen,
  ForgotPasswordScreen,
} from '../screens/auth';

const Stack = createStackNavigator<AuthStackParamList>();

/**
 * Authentication navigator component that handles all auth-related screens
 */
const AuthNavigator: React.FC = () => {
  const [initialRoute, setInitialRoute] = useState<keyof AuthStackParamList | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if the user has seen onboarding screens before
    const checkOnboardingStatus = async () => {
      try {
        const hasSeenGetStarted = await AsyncStorage.getItem('@has_seen_get_started');
        const hasSeenOnboarding = await AsyncStorage.getItem('@has_seen_onboarding');

        if (hasSeenGetStarted === 'true' && hasSeenOnboarding === 'true') {
          // User has seen all onboarding screens, go directly to sign in
          setInitialRoute('SignIn');
        } else {
          // First-time user, start with get started screen
          setInitialRoute('GetStarted');
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // Fallback to get started screen on error
        setInitialRoute('GetStarted');
      } finally {
        setLoading(false);
      }
    };

    checkOnboardingStatus();
  }, []);

  if (loading || !initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#f7b305" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen
        name="GetStarted"
        component={GetStartedScreen}
      />
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
      />
      <Stack.Screen
        name="Onboarding2"
        component={OnboardingScreen2}
      />
      <Stack.Screen
        name="Onboarding3"
        component={OnboardingScreen3}
      />
      <Stack.Screen
        name="SignIn"
        component={SignInScreen}
      />
      <Stack.Screen
        name="EmailVerification"
        component={EmailVerificationScreen}
      />
      <Stack.Screen
        name="OtpInput"
        component={OtpInputScreen}
      />
      <Stack.Screen
        name="ProfileFillingPage"
        component={ProfileFillingScreen}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
