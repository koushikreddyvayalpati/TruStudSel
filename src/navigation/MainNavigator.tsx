import React, { useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, StyleSheet } from 'react-native';
import { MainStackParamList, HomeScreenNavigationProp } from '../types/navigation.types';

// Import screens from barrel files
import { HomeScreen } from '../screens/home';
import { ProfileScreen, EditProfileScreen } from '../screens/profile';
import { ProductsScreen } from '../screens/products';
import { MessagesScreen, MessageScreen } from '../screens/messages';
import { PostingScreen } from '../screens/posting';
import { WishlistScreen } from '../screens/wishlist';

// Import layout components from new structure
import { BottomNavigation, Drawer } from '../components/layout';

const Stack = createStackNavigator<MainStackParamList>();

/**
 * Main navigator component that handles all authenticated app screens
 */
const MainNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{ headerShown: false }}
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
      />
      <Stack.Screen 
        name="MessageScreen" 
        component={MessageScreen} 
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

// Wrapper component for Home screen with bottom navigation
const HomeWithBottomNav: React.FC<{ navigation: HomeScreenNavigationProp }> = ({ navigation }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Add drawer open function to navigation
  React.useEffect(() => {
    navigation.openDrawer = () => {
      setIsDrawerOpen(true);
    };
  }, [navigation]);

  return (
    <View style={styles.container}>
      <HomeScreen navigation={navigation} />
      <BottomNavigation />
      <Drawer 
        navigation={navigation as any} 
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

export default MainNavigator; 