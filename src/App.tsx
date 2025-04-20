/**
 * TruStudSel App
 */
import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar, StatusBarStyle } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Amplify } from 'aws-amplify';
import Config from 'react-native-config';

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

// Log the configuration being used (for debugging)
// console.log('[App.tsx] Configuring Amplify with:', JSON.stringify(amplifyConfig, null, 2));

// Configure Amplify with the dynamically built config
Amplify.configure(amplifyConfig);

const App: React.FC = () => {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider key="auth-provider-latest">
          <ProductsProvider>
            <WishlistProvider>
              <CartProvider>
                <MessagingProvider>
                  <AppContent />
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
const AppContent: React.FC = () => {
  // We can now use the useTheme hook here because we're inside ThemeProvider
  const { theme } = useTheme();

  return (
    <>
      <StatusBar
        barStyle={theme.colors.statusBar as StatusBarStyle}
        backgroundColor={theme.colors.background}
      />
      <AppNavigator />
    </>
  );
};

export default App;
