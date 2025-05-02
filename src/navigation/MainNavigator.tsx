import React, { createContext, useState, useEffect, useContext } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { MainStackParamList } from '../types/navigation.types';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LogBox } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View } from 'react-native';

// Import screens from barrel files
import { HomeScreen } from '../screens/home';
import { ProfileScreen, EditProfileScreen, DeleteAccountScreen } from '../screens/profile';
import { ProductsScreen } from '../screens/products';
import { MessagesScreen} from '../screens/messages';
import FirebaseChatScreen from '../screens/messages/FirebaseChatScreen';
import { PostingScreen } from '../screens/posting';
import { WishlistScreen } from '../screens/wishlist';
import { CategoryProductsScreen } from '../screens/categories';
import { CategoryProductsScreenRouteProp, CategoryProductsScreenNavigationProp } from '../types/navigation.types';

// Import layout components
import { BottomNavigation, CustomDrawerContent } from '../components/layout';
import { useAuth } from '../contexts';

// Create a context to share user university data
interface UniversityContextType {
  userUniversity: string;
  setUserUniversity: (university: string) => void;
}

const UniversityContext = createContext<UniversityContextType>({
  userUniversity: '',
  setUserUniversity: () => {},
});

// Create a context to share user city data
interface CityContextType {
  userCity: string;
  setUserCity: (city: string) => void;
}

const CityContext = createContext<CityContextType>({
  userCity: '',
  setUserCity: () => {},
});

// Hook to use university context
export const useUniversity = () => useContext(UniversityContext);

// Hook to use city context
export const useCity = () => useContext(CityContext);

const Stack = createStackNavigator<MainStackParamList>();
const Drawer = createDrawerNavigator();

// Combined provider component
const LocationProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [userUniversity, setUserUniversity] = useState<string>('');
  const [userCity, setUserCity] = useState<string>('');
  const { user } = useAuth();
  
  // Reset to default values on component mount
  useEffect(() => {
    const resetToDefaults = async () => {
      try {
        // Get default values from user object
        const defaultUniversity = user?.university || '';
        const defaultCity = user?.city || '';
        
        console.log('[LocationProvider] Resetting to default values:', { 
          defaultUniversity, 
          defaultCity 
        });
        
        // Set in state
        setUserUniversity(defaultUniversity);
        setUserCity(defaultCity);
        
        // Also update AsyncStorage for consistency
        if (defaultUniversity) {
          await AsyncStorage.setItem('@user_university', defaultUniversity);
        }
        
        if (defaultCity) {
          await AsyncStorage.setItem('@user_city', defaultCity);
        }
      } catch (error) {
        console.error('[LocationProvider] Error resetting location data:', error);
      }
    };
    
    resetToDefaults();
  }, [user]);

  return (
    <UniversityContext.Provider value={{ userUniversity, setUserUniversity }}>
      <CityContext.Provider value={{ userCity, setUserCity }}>
        {children}
      </CityContext.Provider>
    </UniversityContext.Provider>
  );
};

/**
 * Stack navigator for all main screens
 */
const MainStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'white' },
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeWithBottomNav}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreenWithBottomNav}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
      />
      <Stack.Screen
        name="DeleteAccount"
        component={DeleteAccountScreen}
      />
      <Stack.Screen
        name="MessagesScreen"
        component={MessagesScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="FirebaseChatScreen"
        component={FirebaseChatScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="PostingScreen"
        component={PostingScreen}
      />
      <Stack.Screen
        name="ProductInfoPage"
        component={ProductsScreenWithBottomNav}
      />
      <Stack.Screen
        name="Wishlist"
        component={WishlistScreenWithBottomNav}
      />
      <Stack.Screen
        name="CategoryProducts"
        component={CategoryProductsWithBottomNav}
      />
    </Stack.Navigator>
  );
};

/**
 * Main navigator component that handles all authenticated app screens
 * Now uses a drawer navigator as the root
 */
const MainNavigator = ({ 
  route 
}: { 
  route: { 
    params?: { 
      initialRouteName?: string; 
      initialParams?: any; 
    } 
  } 
}) => {
  // Get custom route params from AppNavigator if they exist
  const initialRouteName = route?.params?.initialRouteName;
  const initialParams = route?.params?.initialParams;

  return (
    <LocationProvider>
      <Drawer.Navigator
        initialRouteName={initialRouteName || 'MainStack'}
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerShown: false,
          drawerStyle: {
            width: '80%',
            backgroundColor: '#FFFFFF',
            borderTopRightRadius: 20,
            borderBottomRightRadius: 20,
          },
          swipeEnabled: true,
          swipeEdgeWidth: 50,
          overlayColor: 'rgba(0, 0, 0, 0.5)',
        }}
      >
        <Drawer.Screen
          name="MainStack"
          component={MainStack}
          options={{ drawerLabel: 'Home' }}
          initialParams={initialRouteName === 'Home' ? initialParams : undefined}
        />
        <Drawer.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ drawerLabel: 'Profile', drawerItemStyle: { display: 'none' } }}
          initialParams={initialRouteName === 'Profile' ? initialParams : undefined}
        />
        <Drawer.Screen
          name="Settings"
          component={DeleteAccountScreen}
          options={{ drawerLabel: 'Account Settings' }}
        />
        <Drawer.Screen
          name="MessagesScreen"
          component={MessagesScreen}
          options={{ drawerLabel: 'Messages', drawerItemStyle: { display: 'none' } }}
          initialParams={initialRouteName === 'MessagesScreen' ? initialParams : undefined}
        />
        <Drawer.Screen
          name="FirebaseChatScreen"
          component={FirebaseChatScreen}
          options={{ drawerLabel: 'Firebase Chat', drawerItemStyle: { display: 'none' } }}
          initialParams={initialRouteName === 'FirebaseChatScreen' ? initialParams : undefined}
        />
        <Drawer.Screen
          name="Wishlist"
          component={WishlistScreen}
          options={{ drawerLabel: 'Wishlist', drawerItemStyle: { display: 'none' } }}
          initialParams={initialRouteName === 'Wishlist' ? initialParams : undefined}
        />
      </Drawer.Navigator>
    </LocationProvider>
  );
};

// Modified HomeScreen component that works with university context
const ModifiedHomeScreen = () => {
  const { user } = useAuth();
  const { userUniversity, setUserUniversity } = useUniversity();
  const { userCity, setUserCity } = useCity();
  const [_hasInitialized, setHasInitialized] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  // Always prioritize using default values from user object
  useEffect(() => {
    const applyDefaultValues = async () => {
      try {
        // Don't proceed if we're already in the process of fetching
        if (isFetchingLocation) return;
        
        setIsFetchingLocation(true);
        
        // Extract default values from user object
        const defaultUniversity = user?.university || '';
        const defaultCity = user?.city || '';
        
        console.log('[ModifiedHomeScreen] Applying default values:', { 
          defaultUniversity, 
          defaultCity 
        });
        
        // Set values in context
        if (defaultUniversity) {
          setUserUniversity(defaultUniversity);
        } else if (!userUniversity) {
          console.warn('[ModifiedHomeScreen] No default university available');
          setUserUniversity('University not available');
        }
        
        if (defaultCity) {
          setUserCity(defaultCity);
        } else if (!userCity) {
          console.warn('[ModifiedHomeScreen] No default city available');
          setUserCity('City not available');
        }
        
        setHasInitialized(true);
        setIsFetchingLocation(false);
      } catch (error) {
        console.error('[ModifiedHomeScreen] Error applying default values:', error);
        setIsFetchingLocation(false);
      }
    };
    
    applyDefaultValues();
  }, [user, isFetchingLocation, setUserUniversity, setUserCity, userUniversity, userCity]);

  return <HomeScreen />;
};

// Wrapper component for Home screen with bottom navigation
const HomeWithBottomNav: React.FC = () => {
  const { userUniversity } = useUniversity();
  const { userCity } = useCity();
  
  return (
    <View style={{ flex: 1 }}>
      <ModifiedHomeScreen />
      <BottomNavigation userUniversity={userUniversity} userCity={userCity} />
    </View>
  );
};

// Wrapper component for CategoryProducts screen with bottom navigation
const CategoryProductsWithBottomNav: React.FC = () => {
  const route = useRoute<CategoryProductsScreenRouteProp>();
  const navigation = useNavigation<CategoryProductsScreenNavigationProp>();
  const { userUniversity } = useUniversity();
  const { userCity } = useCity();

  // Get city from route params, or fall back to context
  const cityToUse = route.params?.userCity || userCity;

  return (
    <>
      <CategoryProductsScreen navigation={navigation} route={route} />
      <BottomNavigation userUniversity={userUniversity} userCity={cityToUse} />
    </>
  );
};

// Wrapper for Profile screen with bottom navigation
const ProfileScreenWithBottomNav: React.FC = () => {
  const { userUniversity } = useUniversity();
  const { userCity } = useCity();
  
  return (
    <View style={{ flex: 1 }}>
      <ProfileScreen />
      <BottomNavigation userUniversity={userUniversity} userCity={userCity} />
    </View>
  );
};

// Wrapper for Products screen with bottom navigation
const ProductsScreenWithBottomNav: React.FC = () => {
  const { userUniversity } = useUniversity();
  const { userCity } = useCity();
  
  return (
    <View style={{ flex: 1 }}>
      <ProductsScreen />
      <BottomNavigation userUniversity={userUniversity} userCity={userCity} />
    </View>
  );
};

// Wrapper for Wishlist screen with bottom navigation
const WishlistScreenWithBottomNav: React.FC = () => {
  const { userUniversity } = useUniversity();
  const { userCity } = useCity();
  
  return (
    <View style={{ flex: 1 }}>
      <WishlistScreen />
      <BottomNavigation userUniversity={userUniversity} userCity={userCity} />
    </View>
  );
};

// Ignore specific warnings instead of all
LogBox.ignoreLogs(['Warning: ...', 'NavigationContent']);

export default MainNavigator;
