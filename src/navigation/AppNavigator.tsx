import React, { forwardRef, ForwardRefRenderFunction } from 'react';
import { NavigationContainer, LinkingOptions, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Linking } from 'react-native';

// Import custom hooks
import { useAuth } from '../contexts';

// Import navigators
// Note: We considered using React.lazy() for code splitting here, but it led to 
// compatibility issues with React Navigation. The performance gain would be minor 
// compared to the complexity introduced.
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
 * Main navigation container component
 * 
 * This component is responsible for:
 * 1. Setting up the navigation container
 * 2. Handling conditional rendering based on authentication state
 * 3. Configuring deep linking
 * 4. Enforcing status bar appearance on navigation changes
 * 
 * Uses forwardRef to properly handle navigation references from parent components
 */
const AppNavigatorBase: ForwardRefRenderFunction<NavigationContainerRef<any>, AppNavigatorProps> = (props, ref) => {
  const { isAuthenticated, loading } = useAuth();
  const { onReady, initialRouteName, initialParams } = props;

  // Handle deep links
  const linking: LinkingOptions<{}> = {
    prefixes: ['trustudsel://', 'https://trustudsel.com', 'https://www.trustudsel.com'],
    config: {
      screens: {
        Main: {
          screens: {
            ProductsStack: {
              screens: {
                ProductInfo: 'product/:id',
              },
            },
            MessagesStack: {
              screens: {
                MessagesScreen: 'messages',
                FirebaseChatScreen: 'chat/:recipientEmail',
              },
            },
            ProfileStack: {
              screens: {
                ProfileScreen: 'profile',
                UserProducts: 'user/:email/products',
              },
            },
          },
        },
      },
    },
    // Custom getInitialURL implementation
    getInitialURL: async () => {
      try {
        // First, check if app was opened from a deep link
        const url = await Linking.getInitialURL();
        
        if (url) {
          console.log('[AppNavigator] App opened from deep link:', url);
          return url;
        }
        
        // If no deep link, check if we have stored a notification path to handle
        return null;
      } catch (error) {
        console.error('[AppNavigator] Error getting initial URL:', error);
        return null;
      }
    },
    // Custom subscribe implementation to handle deep links while the app is running
    subscribe: (listener) => {
      // Listen to incoming links from deep linking
      const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
        listener(url);
      });
      
      return () => {
        linkingSubscription.remove();
      };
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
