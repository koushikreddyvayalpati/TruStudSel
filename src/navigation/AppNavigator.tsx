import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Import custom hooks
import { useAuth } from '../contexts';

// Import navigators
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';

// Create app stack
const Stack = createStackNavigator();

/**
 * Root navigator that handles authentication flow
 * Shows either AuthNavigator or MainNavigator based on auth state
 */
const AppNavigator: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  // Show a loading screen if auth state is being determined
  if (loading) {
    return null; // You can add a splash screen or loading indicator here
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          // User is signed in - show main app
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          // User is not signed in - show auth flow
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 