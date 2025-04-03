/**
 * TruStudSel App
 */
import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar, StatusBarStyle } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Amplify } from 'aws-amplify';
import awsconfig from '../aws-exports';

// Import crypto polyfills before Amplify
import '@azure/core-asynciterator-polyfill';
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
  MessagingProvider 
} from './contexts';
import { useTheme } from './hooks';

// Import navigation
import AppNavigator from './navigation/AppNavigator';

// Configure Amplify
console.log('Configuring Amplify with:', awsconfig);
Amplify.configure(awsconfig);

const App: React.FC = () => {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
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