/**
 * TruStudSel App
 */
import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { StatusBar, StatusBarStyle, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Amplify } from 'aws-amplify';
import Config from 'react-native-config';
import { NavigationContainerRef } from '@react-navigation/native';

// Import crypto polyfills before Amplify
import '@azure/core-asynciterator-polyfill';

// Fix for insecure random number generator warning when debugging with Chrome
if (__DEV__ && typeof global.crypto !== 'object') {
  // Provide a simple implementation for debugging only
  // @ts-ignore - This is only for debugging purposes and we're ignoring type issues
  global.crypto = {
    getRandomValues: (array) => {
      // When debugging in Chrome, provide a fallback
      for (let i = 0; i < array.length; i++) {
        // Use timestamp for better entropy than Math.random()
        array[i] = (Date.now() % 256) ^ (i % 256);
      }
      console.warn('Using fallback crypto.getRandomValues - FOR DEBUGGING ONLY');
      return array;
    },
  };
}

// Now import get-random-values which will be used in production
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

// Import providers
import {
  AuthProvider,
  ThemeProvider,
  ProductsProvider,
  WishlistProvider,
  CartProvider,
  MessagingProvider,
} from './contexts';
import { useTheme } from './hooks';

// Import navigation
import AppNavigator from './navigation/AppNavigator';

// Import push notification helper
import * as PushNotificationHelper from './utils/pushNotificationHelper';

// Build the Amplify config object from environment variables
const amplifyConfig = {
  Auth: {
    region: Config.AMPLIFY_AUTH_REGION,
    userPoolId: Config.AMPLIFY_AUTH_USER_POOL_ID,
    userPoolWebClientId: Config.AMPLIFY_AUTH_USER_POOL_WEB_CLIENT_ID,
  },
  // Add other Amplify categories (Storage, etc.) if you use them,
  // pulling values from Config.
};

// Configure Amplify with the dynamically built config
Amplify.configure(amplifyConfig);

const App: React.FC = () => {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  useEffect(() => {
    // Initialize push notifications
    const initNotifications = async () => {
      try {
        // Set navigation reference for push notification navigations
        if (navigationRef.current) {
          PushNotificationHelper.setNavigationReference(navigationRef.current);
        }
        
        // Initialize push notifications with a short delay to ensure the UI is ready first
        // This helps Android show the permission dialog properly
        setTimeout(async () => {
          // Initialize push notifications
          await PushNotificationHelper.initPushNotifications();
          
          // Check if app was opened from a notification
          if (navigationRef.current?.isReady()) {
            PushNotificationHelper.checkInitialNotification();
          }
        }, 1500);
      } catch (error) {
        console.error('Error initializing push notifications:', error);
      }
    };
    
    initNotifications();
    
    // Update device activity when app opens
    PushNotificationHelper.updateDeviceActivity();
    
    // Set up an interval to periodically update device activity
    const activityInterval = setInterval(() => {
      PushNotificationHelper.updateDeviceActivity();
    }, 30 * 60 * 1000); // Update every 30 minutes
    
    return () => {
      clearInterval(activityInterval);
    };
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider key="auth-provider-latest">
          <ProductsProvider>
            <WishlistProvider>
              <CartProvider>
                <MessagingProvider>
                  <AppContent navigationRef={navigationRef} />
                </MessagingProvider>
              </CartProvider>
            </WishlistProvider>
          </ProductsProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

// Separate component to access theme context
const AppContent: React.FC<{ navigationRef: React.RefObject<NavigationContainerRef<any>> }> = ({ navigationRef }) => {
  // We can now use the useTheme hook here because we're inside ThemeProvider
  const { theme } = useTheme();
  
  // Determine status bar style based on theme
  const barStyle: StatusBarStyle = theme.dark ? 'light-content' : 'dark-content';

  return (
    <>
      <StatusBar barStyle={barStyle} backgroundColor={theme.colors.background} />
      <AppNavigator ref={navigationRef} />
    </>
  );
};

export default App;
