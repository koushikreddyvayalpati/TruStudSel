import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { MainStackParamList } from '../types/navigation.types';

// Import screens from barrel files
import { HomeScreen } from '../screens/home';
import { ProfileScreen, EditProfileScreen } from '../screens/profile';
import { ProductsScreen } from '../screens/products';
import { MessagesScreen, MessageScreen } from '../screens/messages';
import { PostingScreen } from '../screens/posting';
import { WishlistScreen } from '../screens/wishlist';

// Import layout components
import { BottomNavigation, CustomDrawerContent } from '../components/layout';

const Stack = createStackNavigator<MainStackParamList>();
const Drawer = createDrawerNavigator();

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
        name="MessagesScreen" 
        component={MessagesScreen} 
        options={{ 
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="MessageScreen" 
        component={MessageScreen} 
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
    </Stack.Navigator>
  );
};

/**
 * Main navigator component that handles all authenticated app screens
 * Now uses a drawer navigator as the root
 */
const MainNavigator: React.FC = () => {
  return (
    <Drawer.Navigator
      initialRouteName="MainStack"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          width: '80%',
          backgroundColor: '#FFFFFF',
          borderTopRightRadius: 20,
          borderBottomRightRadius: 20,
        },
        swipeEnabled: true, // Enable drawer swipe from edge
        swipeEdgeWidth: 50, // Width of the edge area that detects swipes
        overlayColor: 'rgba(0, 0, 0, 0.5)', // Overlay color when drawer is open
      }}
    >
      <Drawer.Screen 
        name="MainStack" 
        component={MainStack}
        options={{ drawerLabel: 'Home' }}
      />
      <Drawer.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ drawerLabel: 'Profile', drawerItemStyle: { display: 'none' } }}
      />
      <Drawer.Screen 
        name="MessagesScreen" 
        component={MessagesScreen}
        options={{ drawerLabel: 'Messages', drawerItemStyle: { display: 'none' } }}
      />
      <Drawer.Screen 
        name="Wishlist" 
        component={WishlistScreen}
        options={{ drawerLabel: 'Wishlist', drawerItemStyle: { display: 'none' } }}
      />
    </Drawer.Navigator>
  );
};

// Wrapper component for Home screen with bottom navigation
const HomeWithBottomNav: React.FC = () => {
  return (
    <>
      <HomeScreen />
      <BottomNavigation />
    </>
  );
};

export default MainNavigator; 