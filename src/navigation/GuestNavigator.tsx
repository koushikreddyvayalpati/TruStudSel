import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { ProductsScreen } from '../screens/products';
import { HomeScreen } from '../screens/home';
import { CategoryProductsScreen } from '../screens/categories';
import { SignInScreen, EmailVerificationScreen, OtpInputScreen, ProfileFillingScreen, ForgotPasswordScreen } from '../screens/auth';
import { useNavigation } from '@react-navigation/native';
import { Platform } from 'react-native';

// Define the guest stack parameter list
type GuestStackParamList = {
  GuestTabs: undefined;
  ProductInfoPage: any; // Match the same structure as in MainStackParamList
  CategoryProducts: {
    categoryId: number;
    categoryName: string;
    userUniversity?: string;
    userCity?: string;
  };
  // Auth screens
  EmailVerification: { email: string };
  OtpInput: { email: string; name?: string; phoneNumber?: string; tempPassword?: string };
  ProfileFillingPage: { email: string; username: string; phoneNumber?: string; isAuthenticated?: boolean };
  ForgotPassword: undefined;
};

// Create a separate type for the SignIn stack
type SignInStackParamList = {
  SignInScreen: undefined;
};

// Create stacks for the guest flow
const Stack = createStackNavigator<GuestStackParamList>();
const SignInStackNavigator = createStackNavigator<SignInStackParamList>();
const Tab = createBottomTabNavigator();

// Wrapper for HomeScreen with guest mode support
const GuestHomeScreen = (props: any) => {
  const navigation = useNavigation();
  
  // We pass isGuestMode=true to indicate the user is browsing as a guest
  return <HomeScreen {...props} isGuestMode={true} guestNavigation={navigation} />;
};

// Wrapper for ProductsScreen with guest mode support
const GuestProductsScreen = (props: any) => {
  const navigation = useNavigation();
  
  // We pass isGuestMode=true to indicate the user is browsing as a guest
  return <ProductsScreen {...props} isGuestMode={true} guestNavigation={navigation} />;
};

// Wrapper for CategoryProductsScreen with guest mode support
const GuestCategoryProductsScreen = (props: any) => {
  const navigation = useNavigation();
  
  // We pass isGuestMode=true to indicate the user is browsing as a guest
  return <CategoryProductsScreen {...props} isGuestMode={true} guestNavigation={navigation} />;
};

// Component containing just the Sign In screen
const SignInStack = () => {
  return (
    <SignInStackNavigator.Navigator screenOptions={{ headerShown: false }}>
      <SignInStackNavigator.Screen name="SignInScreen" component={SignInScreen} />
    </SignInStackNavigator.Navigator>
  );
};

// Bottom tab navigator for guest users
const GuestTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'BrowseHome') {
            iconName ='home';
          } else if (route.name === 'SignIn') {
            iconName =  'person' ;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: 'black',
        tabBarInactiveTintColor: 'white',
        headerShown: false,
        tabBarStyle: {
          elevation: 0,
          shadowOpacity: 0,
          borderTopWidth: 0.5,
          borderTopColor: '#e0e0e0',
          height: Platform.OS === 'ios' ? 60 : 60,
          paddingTop: 10,
          paddingBottom: Platform.OS === 'ios' ? 0 : 10,
          backgroundColor: '#f7b305',
          marginBottom: 20,
        },
      })}
    >
      <Tab.Screen 
        name="BrowseHome" 
        component={GuestHomeScreen} 
        options={{ 
          title: '',
          headerShown: false,
        }}
      />
      <Tab.Screen 
        name="SignIn" 
        component={SignInStack} 
        options={{ 
          title: '',
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
};

// Main stack navigator for guest users
const GuestNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="GuestTabs" component={GuestTabNavigator} />
      <Stack.Screen name="ProductInfoPage" component={GuestProductsScreen} />
      <Stack.Screen name="CategoryProducts" component={GuestCategoryProductsScreen} />
      
      {/* Auth screens at the same level as GuestTabs, not nested within tabs */}
      <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
      <Stack.Screen name="OtpInput" component={OtpInputScreen} />
      <Stack.Screen name="ProfileFillingPage" component={ProfileFillingScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
};

export default GuestNavigator; 