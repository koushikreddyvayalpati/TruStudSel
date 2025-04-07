// /**
//  * Sample React Native App
//  * https://github.com/facebook/react-native
//  *
//  * @format
//  */

// import 'react-native-gesture-handler';
// import React from 'react';
// import {StatusBar,useColorScheme} from 'react-native';
// import {Colors} from 'react-native/Libraries/NewAppScreen';
// import { SafeAreaProvider } from 'react-native-safe-area-context';
// import { AuthProvider } from './src/contexts/AuthContext';
// import { Amplify } from 'aws-amplify';
// import awsconfig from './aws-exports';

// // Import crypto polyfills before Amplify
// import '@azure/core-asynciterator-polyfill';
// import 'react-native-get-random-values';
// import { Buffer } from 'buffer';
// global.Buffer = Buffer;

// // Import AppNavigator
// import AppNavigator from './src/navigation/AppNavigator';

// Amplify.configure(awsconfig);

// const App = () => {
//   const isDarkMode = useColorScheme() === 'dark';
//   return (
//     <SafeAreaProvider>
//       <AuthProvider>
//         <StatusBar
//           barStyle={isDarkMode ? 'light-content' : 'dark-content'}
//           backgroundColor={isDarkMode ? Colors.darker : Colors.lighter}
//         />
//         <AppNavigator />
//       </AuthProvider>
//     </SafeAreaProvider>
//   );
// };
// export default App;
