/**
 * TruStudSel App
 */
import 'react-native-gesture-handler';
import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Amplify } from 'aws-amplify';
import Config from 'react-native-config';
import { NavigationContainerRef } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Import chat store
import useChatStore from './store/chatStore';

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
  const [initialRoute, setInitialRoute] = useState<string | undefined>(undefined);
  const [initialParams, setInitialParams] = useState<any>(undefined);
  const [_isCheckingNotification, setIsCheckingNotification] = useState(true);

  // Configure status bar immediately at app startup
  useEffect(() => {
    configureStatusBar();
  }, []);

  // Check for initial notification early before the app even mounts
  useEffect(() => {
    const checkForInitialNotification = async () => {
      try {
        setIsCheckingNotification(true);
        console.log('[App] Checking for initial notification before mounting app');
        
        // Look for stored notification data
        const initialNotificationData = await AsyncStorage.getItem('INITIAL_NOTIFICATION');
        if (initialNotificationData) {
          console.log('[App] Found initial notification for direct navigation:', initialNotificationData);
          
          try {
            const data = JSON.parse(initialNotificationData);
            
            // Check for conversation notifications
            if (data.conversationId || data.senderEmail || data.senderId) {
              console.log('[App] Setting initial route to FirebaseChatScreen');
              
              // Set the initial route to be FirebaseChatScreen
              setInitialRoute('FirebaseChatScreen');
              setInitialParams({
                recipientEmail: data.senderId || data.senderEmail || data.conversationId,
                recipientName: data.senderName || 'Chat'
              });
              
              // Clear the notification data as we're handling it directly
              await AsyncStorage.removeItem('INITIAL_NOTIFICATION');
            } else if (data.type === 'message') {
              // If it's a message but no specific details, go to messages screen
              console.log('[App] Setting initial route to MessagesScreen');
              setInitialRoute('MessagesScreen');
              await AsyncStorage.removeItem('INITIAL_NOTIFICATION');
            }
          } catch (parseError) {
            console.error('[App] Error parsing initial notification data:', parseError);
            await AsyncStorage.removeItem('INITIAL_NOTIFICATION');
          }
        }
      } catch (error) {
        console.error('[App] Error checking for initial notifications:', error);
      } finally {
        setIsCheckingNotification(false);
      }
    };
    
    checkForInitialNotification();
  }, []);

  // Initialize push notifications
  useEffect(() => {
    const initNotifications = async () => {
      try {
        // Configure status bar again to ensure consistent appearance
        configureStatusBar();
        // Initialize push notifications with a short delay to ensure the UI is ready first
        setTimeout(async () => {
          await PushNotificationHelper.initPushNotifications();
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

  // Pass onReady to AppNavigator to set navigation ref and check initial notification
  const handleNavigationReady = async () => {
    if (navigationRef.current) {
      console.log('[App] Navigation is ready, setting navigation ref for notifications');
      PushNotificationHelper.setNavigationReference(navigationRef.current);
      
      // Only check for initial notification if we didn't find one during startup
      if (!initialRoute) {
        setTimeout(() => {
          console.log('[App] Checking initial notification after navigation is ready');
          PushNotificationHelper.checkInitialNotification();
        }, 1000); // Increased from 300ms to 1000ms
      } else {
        console.log('[App] Using direct navigation from initial notification');
      }
    }
  };

  // Update the unread message count loading logic in App.tsx
  useEffect(() => {
    // Load persisted unread message count and fetch fresh conversations when app starts
    const initializeUnreadCount = async () => {
      try {
        console.log('[App] Initializing unread message count');
        const chatStore = useChatStore.getState();
        
        // First load the persisted count for immediate display
        await chatStore.loadPersistedUnreadCount();
        
        // Then fetch current user and set up real-time subscription
        await chatStore.fetchCurrentUser();
        
        // If user is authenticated, fetch fresh conversations to get accurate count
        if (chatStore.currentUserEmail) {
          // Set up real-time subscription which will update counts
          chatStore.setupConversationSubscription();
          
          // Fetch conversations to get the latest unread count
          chatStore.fetchConversations();
          
          console.log('[App] Initialized unread message count with fresh data');
        }
      } catch (error) {
        console.error('[App] Error initializing unread message count:', error);
      }
    };
    
    initializeUnreadCount();
    
    // Clean up subscription when app unmounts
    return () => {
      const chatStore = useChatStore.getState();
      chatStore.cleanupConversationSubscription();
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
                  <AppNavigator 
                    ref={navigationRef} 
                    onReady={handleNavigationReady}
                    initialRouteName={initialRoute}
                    initialParams={initialParams}
                  />
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
