import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import MessagesScreen from './MessagesScreen';
import MessageScreen from './MessageScreen';
import Homescreen from './Homescreen'; // Assuming this is your main screen
import SignInPage from './SignInPage';
import EmailVerificationPage from './EmailVerificationPage';
import OtpInputPage from './OtpInputPage';
import ProfileFillingPage from './ProfileFillingPage';
import PostingScreen from './PostingScreen';
import GetStartedScreen from './GetStartedScreen';
import ProfileScreen from './ProfileScreen';
import ProductInfoPage from './ProductInfoPage';
const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={Homescreen} />
        <Stack.Screen name="Messages" component={MessagesScreen} />
        <Stack.Screen name="MessageScreen" component={MessageScreen} />
        <Stack.Screen name="SignIn" component={SignInPage} />
        <Stack.Screen name="EmailVerification" component={EmailVerificationPage} />
        <Stack.Screen name="OtpInput" component={OtpInputPage} />
        <Stack.Screen name="ProfileFillingPage" component={ProfileFillingPage} />
        <Stack.Screen name="PostingScreen" component={PostingScreen} />
        <Stack.Screen name="GetStarted" component={GetStartedScreen} />
        <Stack.Screen name="ProductInfoPage" component={ProductInfoPage} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="MessageScreen" component={MessageScreen} />
        <Stack.Screen name="MessagesScreen" component={MessagesScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 