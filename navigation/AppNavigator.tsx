import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import MessagesScreen from '../screens/MessagesScreen';
import MessageScreen from '../screens/MessageScreen';
import SignInPage from '../screens/SignInPage';
import EmailVerificationPage from '../screens/EmailVerificationPage';
import OtpInputPage from '../screens/OtpInputPage';
import ProfileFillingPage from '../screens/ProfileFillingPage';
import PostingScreen from '../screens/PostingScreen';
import GetStartedScreen from '../screens/GetStartedScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ProductInfoPage from '../screens/ProductInfoPage';
import { StatusBar, StyleSheet, View } from 'react-native';
import BottomNavigation from '../components/BottomNavigation';
import HomeScreen from '../screens/Homescreen';
import { StackNavigationProp } from '@react-navigation/stack';
import { useColorScheme } from 'react-native';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

// Define type for navigation parameters
type RootStackParamList = {
  GetStarted: undefined;
  Home: undefined;
  Profile: undefined;
  ProductInfoPage: { product: { id: number; name: string; price: string; image: string } };
  MessageScreen: undefined;
  MessagesScreen: undefined;
  SignIn: undefined;
  EmailVerification: undefined;
  OtpInput: undefined;
  ProfileFillingPage: undefined;
  PostingScreen: undefined;
  ForgotPassword: undefined;
  SignInPage: undefined;
};

// Define HomeScreenNav props interface
type HomeScreenNavProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Home'>;
};

const Stack = createStackNavigator();

const AppNavigator = () => {
    const isDarkMode = useColorScheme() === 'dark';
  return (
    <NavigationContainer>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="#fff"
      />
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          gestureEnabled: false,
        }}
      >
        <Stack.Screen 
          name="GetStarted" 
          component={GetStartedScreen} 
        />
        <Stack.Screen 
          name="Home" 
          component={HomeScreenWithNav}
          options={{ animationEnabled: false }} 
        />
        <Stack.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{ animationEnabled: true }} 
        />
        <Stack.Screen 
          name="ProductInfoPage" 
          component={ProductInfoPage} 
        />
        <Stack.Screen 
          name="MessageScreen" 
          component={MessageScreen} 
        />
        <Stack.Screen 
          name="MessagesScreen" 
          component={MessagesScreen} 
        />
        <Stack.Screen 
          name="SignIn" 
          component={SignInPage} 
        />
        <Stack.Screen 
          name="EmailVerification" 
          component={EmailVerificationPage} 
        />
        <Stack.Screen 
          name="OtpInput" 
          component={OtpInputPage} 
        />
        <Stack.Screen 
          name="ProfileFillingPage" 
          component={ProfileFillingPage}
        />
        <Stack.Screen 
          name="PostingScreen" 
          component={PostingScreen} 
        />
        <Stack.Screen 
          name="ForgotPassword" 
          component={ForgotPasswordScreen} 
        />
        <Stack.Screen 
          name="SignInPage" 
          component={SignInPage} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const HomeScreenWithNav = ({ navigation }: HomeScreenNavProps) => {
    return (
      <View style={styles.container}>
        <HomeScreen navigation={navigation} />
        <BottomNavigation navigation={navigation} />
      </View>
    );
  };
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      position: 'relative',
    },
  });
export default AppNavigator; 