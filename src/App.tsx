/**
 * TruStudSel App
 */
import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
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

// Import navigation
import AppNavigator from './navigation/AppNavigator';

// Import push notification helper
import * as PushNotificationHelper from './utils/pushNotificationHelper';

// Import status bar manager
import { configureStatusBar } from './utils/statusBarManager';
import StatusBarManager from './components/StatusBarManager';

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

  // Configure status bar immediately at app startup
  // This needs to be called as early as possible to prevent UI jumps
  useEffect(() => {
    configureStatusBar();
  }, []);

  useEffect(() => {
    // Initialize push notifications
    const initNotifications = async () => {
      try {
        // Set navigation reference for push notification navigations
        if (navigationRef.current) {
          PushNotificationHelper.setNavigationReference(navigationRef.current);
        }
        
        // Configure status bar again to ensure consistent appearance
        configureStatusBar();
        
        // Initialize push notifications with a short delay to ensure the UI is ready first
        // This helps Android show the permission dialog properly
        setTimeout(async () => {
          // Initialize push notifications
          await PushNotificationHelper.initPushNotifications();
          
          // Check if app was opened from a notification
          if (navigationRef.current?.isReady()) {
            // Ensure status bar is configured correctly before checking notifications
            configureStatusBar();
            
            // Add a small delay before checking for initial notification
            // This gives the UI time to settle after initialization
            setTimeout(() => {
              PushNotificationHelper.checkInitialNotification();
            }, 500);
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
                  <StatusBarManager />
                  <AppNavigator ref={navigationRef} />
                </MessagingProvider>
              </CartProvider>
            </WishlistProvider>
          </ProductsProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

export default App;
