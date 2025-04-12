import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthStackParamList } from '../types/navigation.types';

// Import auth screens
import { 
  SignInScreen, 
  GetStartedScreen, 
  OnboardingScreen,
  OnboardingScreen2,
  EmailVerificationScreen,
  OtpInputScreen,
  ProfileFillingScreen,
  ForgotPasswordScreen
} from '../screens/auth';

const Stack = createStackNavigator<AuthStackParamList>();

/**
 * Authentication navigator component that handles all auth-related screens
 */
const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="GetStarted"
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