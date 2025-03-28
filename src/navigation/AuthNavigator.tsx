import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthStackParamList } from '../types/navigation.types';

// Import auth screens
// Import migrated screens from new structure
import { 
  SignInScreen, 
  GetStartedScreen, 
  OnboardingScreen,
  EmailVerificationScreen,
  OtpInputScreen,
  ProfileFillingScreen,
  ForgotPasswordScreen
} from '../screens/auth';

// These imports will need to be updated once we migrate the existing screens
// No more imports from the old structure - all screens have been migrated!

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