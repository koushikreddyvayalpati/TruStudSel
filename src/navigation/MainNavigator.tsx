import React, { createContext, useState, useEffect, useContext } from 'react';
import { createStackNavigator, StackScreenProps } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { MainStackParamList, RootStackParamList } from '../types/navigation.types';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LogBox } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
        component={ProfileScreen}
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
        component={ProductsScreen}
      />
      <Stack.Screen
        name="Wishlist"
        component={WishlistScreen}
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
const MainNavigator = ({ route }: StackScreenProps<RootStackParamList, 'Main'>) => {
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
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  // First try to load from AsyncStorage
  useEffect(() => {
    const loadFromCache = async () => {
      try {
        // Only fetch from cache if values are not already set
        if ((!userUniversity || userUniversity === 'University not available') ||
            (!userCity || userCity === 'City not available')) {
          
          setIsFetchingLocation(true);
          const cachedUniversity = await AsyncStorage.getItem('@user_university');
          const cachedCity = await AsyncStorage.getItem('@user_city');
          
          console.log('[ModifiedHomeScreen] Loaded from cache:', { cachedUniversity, cachedCity });
          
          if (cachedUniversity && (!userUniversity || userUniversity === 'University not available')) {
            setUserUniversity(cachedUniversity);
          }
          
          if (cachedCity && (!userCity || userCity === 'City not available')) {
            setUserCity(cachedCity);
          }
          
          setIsFetchingLocation(false);
        }
      } catch (error) {
        console.error('[ModifiedHomeScreen] Error loading from cache:', error);
        setIsFetchingLocation(false);
      }
    };
    
    loadFromCache();
  }, [userUniversity, userCity, setUserUniversity, setUserCity]);

  useEffect(() => {
    const setAndCacheValues = async () => {
      // Don't do anything if already fetching or initialized
      if (isFetchingLocation || hasInitialized) return;
      
      // Don't override if there's already a university value in context
      if (userUniversity && userUniversity !== 'University not available') {
        console.log(`[ModifiedHomeScreen] Context already has university value: ${userUniversity}, not overriding`);
        // Cache the value for future use
        await AsyncStorage.setItem('@user_university', userUniversity);
      } else {
        // Try to extract university data from user object
        const universityValue = user?.university || '';
        console.log('[ModifiedHomeScreen] Setting university from user context:', universityValue);

        if (universityValue) {
          setUserUniversity(universityValue);
          // Cache the value for future use
          await AsyncStorage.setItem('@user_university', universityValue);
        } else if (!hasInitialized) {
          console.warn('[ModifiedHomeScreen] No university found in user context, will try to get it from HomeScreen');
        }
      }

      // Don't override if there's already a city value in context
      if (userCity && userCity !== 'City not available') {
        console.log(`[ModifiedHomeScreen] Context already has city value: ${userCity}, not overriding`);
        // Cache the value for future use
        await AsyncStorage.setItem('@user_city', userCity);
      } else {
        // Try to extract city data from user object
        const cityValue = user?.city || '';
        console.log('[ModifiedHomeScreen] Setting city from user context:', cityValue);

        if (cityValue) {
          setUserCity(cityValue);
          // Cache the value for future use
          await AsyncStorage.setItem('@user_city', cityValue);
        } else if (!hasInitialized) {
          console.warn('[ModifiedHomeScreen] No city found in user context, will try to get it from HomeScreen');
        }
      }

      // If we have both values or this is our first init, mark as initialized
      if ((userUniversity && userCity) || !hasInitialized) {
        // This is a last resort fallback to prevent navigation with empty values
        const timer = setTimeout(() => {
          if (!userUniversity) {
            console.warn('[ModifiedHomeScreen] Still no university after timeout, using fallback');
            setUserUniversity('University not available');
          }
          if (!userCity) {
            console.warn('[ModifiedHomeScreen] Still no city after timeout, using fallback');
            setUserCity('City not available');
          }
          setHasInitialized(true);
        }, 1000); // Reduced from 3000ms to 1000ms

        return () => clearTimeout(timer);
      }
    };
    
    setAndCacheValues();
  }, [user, setUserUniversity, userUniversity, setUserCity, userCity, hasInitialized, isFetchingLocation]);

  return <HomeScreen />;
};

// Wrapper component for Home screen with bottom navigation
const HomeWithBottomNav: React.FC = () => {
  const { userUniversity } = useUniversity();
  const { userCity } = useCity();

  return (
    <>
      <ModifiedHomeScreen />
      <BottomNavigation userUniversity={userUniversity} userCity={userCity} />
    </>
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

// Ignore specific warnings instead of all
LogBox.ignoreLogs(['Warning: ...', 'NavigationContent']);

export default MainNavigator;
