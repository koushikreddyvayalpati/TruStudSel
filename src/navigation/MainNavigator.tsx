import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, StyleSheet } from 'react-native';
import { MainStackParamList, HomeScreenNavigationProp } from '../types/navigation.types';

// Import migrated screens from new structure
import { HomeScreen } from '../screens/home';
import { ProfileScreen } from '../screens/profile';
import { ProductsScreen } from '../screens/products';
import { MessagesScreen } from '../screens/messages';

// These imports will need to be updated once we migrate the existing screens
const MessageScreen = require('../../screens/MessageScreen').default;
const PostingScreen = require('../../screens/PostingScreen').default;
const WishlistScreen = require('../../screens/WishlistScreen').default;

// Import layout components
const BottomNavigation = require('../../components/BottomNavigation').default;

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
  // Add drawer open function to navigation
  React.useEffect(() => {
    navigation.openDrawer = () => {
      // This would be implemented when we integrate the actual drawer
      console.log('Open drawer functionality');
    };
  }, [navigation]);

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

export default MainNavigator; 