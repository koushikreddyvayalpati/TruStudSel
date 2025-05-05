import React, { forwardRef, ForwardRefRenderFunction, useEffect } from 'react';
import { NavigationContainer, LinkingOptions, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import custom hooks
import { useAuth } from '../contexts';

// Import navigators
// Note: We considered using React.lazy() for code splitting here, but it led to 
// compatibility issues with React Navigation. The performance gain would be minor 
// compared to the complexity introduced.
import MainNavigator from './MainNavigator';
import GuestNavigator from './GuestNavigator';

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
        Guest: {
          screens: {
            GuestTabs: {
              screens: {
                BrowseHome: 'browse',
                SignIn: 'signin',
              }
            },
            ProductInfoPage: 'product/:id',
            CategoryProducts: 'category/:categoryId',
          }
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

  // Check for sign out flag when authentication state changes
  useEffect(() => {
    if (!isAuthenticated && !loading) {
      const checkSignOutFlag = async () => {
        try {
          const justSignedOut = await AsyncStorage.getItem('@just_signed_out');
          if (justSignedOut === 'true') {
            console.log('[AppNavigator] User just signed out, will navigate to SignIn tab');
            // We need to wait until the navigation is ready and Guest navigator is mounted
            // The navigation will happen in the onReady callback below
          }
        } catch (error) {
          console.error('[AppNavigator] Error checking sign out flag:', error);
        }
      };
      
      checkSignOutFlag();
    }
  }, [isAuthenticated, loading]);

  // Custom onReady handler to navigate to sign in after sign out
  const handleNavigationReady = async () => {
    // Call the original onReady if provided
    if (onReady) {
      onReady();
    }
    
    // Check if we need to navigate to sign in
    if (!isAuthenticated && !loading) {
      try {
        const justSignedOut = await AsyncStorage.getItem('@just_signed_out');
        if (justSignedOut === 'true' && ref) {
          console.log('[AppNavigator] Navigating to SignIn tab after sign out');
          // Clear the flag
          await AsyncStorage.removeItem('@just_signed_out');
          
          // Type safety check for the ref object
          const navRef = ref as React.RefObject<NavigationContainerRef<any>>;
          if (navRef.current) {
            // Navigate to the SignIn tab
            navRef.current.navigate('Guest', {
              screen: 'GuestTabs',
              params: { screen: 'SignIn' }
            });
          }
        }
      } catch (error) {
        console.error('[AppNavigator] Error handling navigation after sign out:', error);
      }
    }
  };

  // Show a loading screen if auth state is being determined
  if (loading) {
    return null; // You can add a splash screen or loading indicator here
  }

  return (
    <NavigationContainer 
      ref={ref}
      linking={linking}
      onReady={handleNavigationReady}
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
          // User is not signed in - show guest navigator with browse products capability
          <Stack.Screen 
            name="Guest" 
            component={GuestNavigator}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const AppNavigator = forwardRef(AppNavigatorBase);

export default AppNavigator;
