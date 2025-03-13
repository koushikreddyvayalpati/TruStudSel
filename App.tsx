/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import 'react-native-gesture-handler';
import React from 'react';
import {StatusBar,useColorScheme} from 'react-native';
import {Colors} from 'react-native/Libraries/NewAppScreen';
import AppNavigator from './navigation/AppNavigator';

// Import crypto polyfills before Amplify
import '@azure/core-asynciterator-polyfill';
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

// Fix Amplify import
import { Amplify } from 'aws-amplify';
import awsconfig from './aws-exports';
import { AuthProvider } from './contexts/AuthContext';
Amplify.configure(awsconfig);

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <AuthProvider>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? Colors.darker : Colors.lighter}
      />
      <AppNavigator />
    </AuthProvider>
  );
};
export default App;
