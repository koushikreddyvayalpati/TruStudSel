import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar, StyleSheet, View } from 'react-native';
import { useColorScheme } from 'react-native';

// Screens
import HomeScreen from '../screens/Homescreen';
import ProfileScreen from '../screens/ProfileScreen';
import MessagesScreen from '../screens/MessagesScreen';
import MessageScreen from '../screens/MessageScreen';
import SignInPage from '../screens/SignInPage';
import EmailVerificationPage from '../screens/EmailVerificationPage';
import OtpInputPage from '../screens/OtpInputPage';
import ProfileFillingPage from '../screens/ProfileFillingPage';
import PostingScreen from '../screens/PostingScreen';
import GetStartedScreen from '../screens/GetStartedScreen';
import ProductInfoPage from '../screens/ProductInfoPage';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

// Components
import BottomNavigation from '../components/BottomNavigation';
import SimpleDrawer from '../components/SimpleDrawer';

// Define the stack navigator
const Stack = createStackNavigator();

// Main app navigator
const AppNavigator = () => {
  const isDarkMode = useColorScheme() === 'dark';
  
  return (
    <NavigationContainer>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="#fff"
      />
      <Stack.Navigator 
        initialRouteName="GetStarted"
        screenOptions={{ 
          headerShown: false,
        }}
      >
        {/* Auth Screens */}
        <Stack.Screen name="GetStarted" component={GetStartedScreen} />
        <Stack.Screen name="SignIn" component={SignInPage} />
        <Stack.Screen name="EmailVerification" component={EmailVerificationPage} />
        <Stack.Screen name="OtpInput" component={OtpInputPage} />
        <Stack.Screen name="ProfileFillingPage" component={ProfileFillingPage} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        
        {/* Main App Screens */}
        <Stack.Screen name="Home" component={MainScreenWithNav} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="MessagesScreen" component={MessagesScreen} />
        <Stack.Screen name="MessageScreen" component={MessageScreen} />
        <Stack.Screen name="PostingScreen" component={PostingScreen} />
        <Stack.Screen name="ProductInfoPage" component={ProductInfoPage} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// Main screen with bottom navigation and drawer
const MainScreenWithNav = ({ navigation }) => {
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

  // Add drawer open function to navigation
  React.useEffect(() => {
    navigation.openDrawer = () => setIsDrawerOpen(true);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <HomeScreen navigation={navigation} />
      {!isDrawerOpen && <BottomNavigation navigation={navigation} />}
      <SimpleDrawer 
        navigation={navigation} 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
      />
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