import React, { useEffect, forwardRef, ForwardRefRenderFunction } from 'react';
import { NavigationContainer, LinkingOptions, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Linking } from 'react-native';

// Import custom hooks
import { useAuth } from '../contexts';

// Import navigators
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';

// Import status bar manager
import { configureStatusBar } from '../utils/statusBarManager';

// Create app stack
const Stack = createStackNavigator();

// Update the props type to accept onReady
interface AppNavigatorProps {
  onReady?: () => void;
  initialRouteName?: string;
  initialParams?: any;
}

/**
 * Root navigator that handles authentication flow
 * Shows either AuthNavigator or MainNavigator based on auth state
 * 
 * Uses forwardRef to properly handle navigation references from parent components
 */
const AppNavigatorBase: ForwardRefRenderFunction<NavigationContainerRef<any>, AppNavigatorProps> = (props, ref) => {
  const { isAuthenticated, loading } = useAuth();
  const { onReady, initialRouteName, initialParams } = props;

  // Handle deep links
  useEffect(() => {
    // Function to handle deep links
    const handleDeepLink = async (event: { url: string }) => {
      const { url } = event;
      console.log('Deep link received:', url);
      
      // Handle product deep links: trustudsel://product/{productId}
      if (url.startsWith('trustudsel://product/')) {
        const productId = url.split('trustudsel://product/')[1];
        
        // Navigate to product details page with the extracted productId
        if (productId) {
          console.log('Navigating to product:', productId);
          // The navigation reference is not directly accessible here, so we'll use a global navigation method
          // if you have one, or store this productId to be handled after navigation is ready
          
          // For now, we'll just log this and implement the actual navigation later
          // We will access this via the linking config below
        }
      }
    };

    // Set up listeners for deep links
    const linkingListener = Linking.addEventListener('url', handleDeepLink);

    // Check for initial URL (app opened from deep link)
    const getInitialURL = async () => {
      const initialURL = await Linking.getInitialURL();
      if (initialURL) {
        handleDeepLink({ url: initialURL });
      }
    };
    
    getInitialURL();

    // Clean up listener on unmount
    return () => {
      linkingListener.remove();
    };
  }, []);

  // Configure deep linking
  const linking: LinkingOptions<ReactNavigation.RootParamList> = {
    prefixes: ['trustudsel://'],
    config: {
      // Screens defined directly in RootParamList (merged from AuthStack and MainStack)
      screens: {
        ProductInfoPage: 'product/:productId',
        // Add other screens directly if needed for deep linking
        // e.g., SignIn: 'signin'
        // Home: 'home' // Note: Home might be the initial route, often handled differently
      },
    },
  };

  // Show a loading screen if auth state is being determined
  if (loading) {
    return null; // You can add a splash screen or loading indicator here
  }

  return (
    <NavigationContainer 
      ref={ref}
      linking={linking}
      onReady={onReady}
      onStateChange={(_state) => {
        // Configure status bar on every navigation state change
        // This ensures consistent appearance regardless of how screens are opened
        configureStatusBar();
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          // User is signed in - show main app
          <Stack.Screen 
            name="Main" 
            component={MainNavigator} 
            initialParams={initialRouteName && initialParams ? { 
              initialRouteName, 
              initialParams 
            } : undefined}
          />
        ) : (
          // User is not signed in - show auth flow
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const AppNavigator = forwardRef(AppNavigatorBase);

export default AppNavigator;
