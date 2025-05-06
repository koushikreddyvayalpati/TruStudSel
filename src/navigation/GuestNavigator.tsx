import React, { useState, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Platform, ActivityIndicator, View, Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import DeviceInfo from 'react-native-device-info';

// Detect if device is a tablet
const isTablet = DeviceInfo.isTablet();

// Import screens
import { ProductsScreen } from '../screens/products';
import { HomeScreen } from '../screens/home';
import { CategoryProductsScreen } from '../screens/categories';

// Import auth screens - make sure these are correctly imported
import {
  SignInScreen,
  EmailVerificationScreen,
  OtpInputScreen,
  ProfileFillingScreen,
  ForgotPasswordScreen,
  GetStartedScreen,
  OnboardingScreen,
  OnboardingScreen2,
  OnboardingScreen3
} from '../screens/auth';

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
  // Onboarding screens
  GetStarted: undefined;
  Onboarding: undefined;
  Onboarding2: undefined;
  Onboarding3: undefined;
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
  const [showSignUpModal, setShowSignUpModal] = useState(true);
  
  // Handle navigation to sign in screen
  const handleSignUpPress = () => {
    setShowSignUpModal(false);
    navigation.navigate('SignIn');
  };
  
  // Close modal
  const handleCloseModal = () => {
    setShowSignUpModal(false);
  };
  
  // We pass isGuestMode=true to indicate the user is browsing as a guest
  return (
    <View style={{ flex: 1 }}>
      <HomeScreen {...props} isGuestMode={true} guestNavigation={navigation} />
      
      {/* Sign Up Modal */}
      {showSignUpModal && (
        <View 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <View 
            style={{
              backgroundColor: 'white',
              borderRadius: 10,
              width: isTablet ? 400 : 300,
              padding: 20,
              alignItems: 'center',
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
              position: 'relative'
            }}
          >
            {/* Close button */}
            <TouchableOpacity
              style={{
                position: 'absolute',
                top: isTablet ? 15 : 10,
                right: isTablet ? 15 : 10,
                width: isTablet ? 40 : 30,
                height: isTablet ? 40 : 30,
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                backgroundColor: '#f5f5f5',
                borderRadius: isTablet ? 20 : 15,
              }}
              onPress={handleCloseModal}
            >
              <Ionicons name="close" size={isTablet ? 28 : 24} color="#666" />
            </TouchableOpacity>
            
            <Text style={{ 
              color: '#333', 
              fontSize: isTablet ? 24 : 20, 
              fontWeight: 'bold', 
              marginBottom: 15,
              textAlign: 'center',
              marginTop: isTablet ? 35 : 15
            }}>
              Sign up for a better experience!
            </Text>
            <Text style={{ 
              color: '#666', 
              fontSize: isTablet ? 18 : 15,
              textAlign: 'center',
              marginBottom: 25
            }}>
              Create an account to message sellers and save your favorite products
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#f7b305',
                paddingVertical: 12,
                paddingHorizontal: isTablet ? 30 : 20,
                borderRadius: 25,
                width: isTablet ? 200 : 150,
                alignItems: 'center',
              }}
              onPress={handleSignUpPress}
            >
              <Text style={{ 
                color: 'white', 
                fontWeight: 'bold',
                fontSize: isTablet ? 18 : 16
              }}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
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
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === 'BrowseHome') {
            iconName ='home';
          } else if (route.name === 'SignIn') {
            iconName =  'person' ;
          }

          // Use larger icon size for tablets
          const iconSize = isTablet ? size * 1.2 : size;
          
          return <Ionicons name={iconName} size={iconSize} color={color} />;
        },
        tabBarActiveTintColor: 'black',
        tabBarInactiveTintColor: 'white',
        headerShown: false,
        tabBarStyle: {
          elevation: 0,
          shadowOpacity: 0,
          borderTopWidth: 0.5,
          borderTopColor: '#e0e0e0',
          height: isTablet ? 100 : 60,
          paddingTop: isTablet ? 0 : 10,
          paddingBottom: Platform.OS === 'ios' ? 0 : 10,
          backgroundColor: '#f7b305',
          marginBottom: 20,
        },
        tabBarItemStyle: {
          // Add padding to position icons better on tablets
          paddingTop: isTablet ? 15 : 0,
          height: isTablet ? 80 : 'auto',
        },
        tabBarIconStyle: {
          // Adjust icon positioning
          marginTop: isTablet ? 5 : 0,
        },
        tabBarLabelStyle: {
          fontSize: isTablet ? 0 : 0,
          paddingBottom: isTablet ? 0 : 0,
          paddingTop: isTablet ? 0 : 0,
          fontWeight: isTablet ? '500' : 'normal',
        }
      })}
    >
      <Tab.Screen 
        name="BrowseHome" 
        component={GuestHomeScreen} 
        options={{ 
          title: isTablet ? '' : '',
          headerShown: false,
        }}
      />
      <Tab.Screen 
        name="SignIn" 
        component={SignInStack} 
        options={{ 
          title: isTablet ? '' : '',
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
};

// Main stack navigator for guest users
const GuestNavigator = () => {
  const [initialRoute, setInitialRoute] = useState<keyof GuestStackParamList | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if the user has seen onboarding screens before
    const checkOnboardingStatus = async () => {
      try {
        const hasSeenGetStarted = await AsyncStorage.getItem('@has_seen_get_started');
        const hasSeenOnboarding = await AsyncStorage.getItem('@has_seen_onboarding');

        if (hasSeenGetStarted === 'true' && hasSeenOnboarding === 'true') {
          // User has seen all onboarding screens, go directly to guest tabs
          setInitialRoute('GuestTabs');
        } else {
          // First-time user, start with get started screen
          setInitialRoute('GetStarted');
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // Fallback to GetStarted screen on error
        setInitialRoute('GetStarted');
      } finally {
        setLoading(false);
      }
    };

    checkOnboardingStatus();
  }, []);

  if (loading || !initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#f7b305" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
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
      <Stack.Screen name="GetStarted" component={GetStartedScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Onboarding2" component={OnboardingScreen2} />
      <Stack.Screen name="Onboarding3" component={OnboardingScreen3} />
    </Stack.Navigator>
  );
};

export default GuestNavigator; 