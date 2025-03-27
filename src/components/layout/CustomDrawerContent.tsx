import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { 
  DrawerContentScrollView, 
  DrawerItem,
  DrawerContentComponentProps 
} from '@react-navigation/drawer';
import { useAuth } from '../../hooks';

// Define navigation item type for better scalability
type DrawerNavigationItem = {
  key: string;
  label: string;
  icon: string;
  navigateTo?: string;
  params?: Record<string, any>;
  onPress?: () => void | Promise<void>;
};

const CustomDrawerContent = (props: DrawerContentComponentProps) => {
  const { navigation } = props;
  const { signOut} = useAuth();
  
  // Memoize the sign out handler to prevent unnecessary re-renders
  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, [signOut]);

  // Define navigation items in a structured way for better scalability
  const navigationItems: DrawerNavigationItem[] = useMemo(() => [
    {
      key: 'home',
      label: 'Home',
      icon: 'home',
      navigateTo: 'MainStack'
    },
    {
      key: 'profile',
      label: 'Profile',
      icon: 'person',
      navigateTo: 'Profile'
    },
    {
      key: 'messages',
      label: 'Messages',
      icon: 'message',
      navigateTo: 'MessagesScreen'
    },
    {
      key: 'wishlist',
      label: 'Wishlist',
      icon: 'favorite',
      navigateTo: 'Wishlist',
      params: { wishlist: [] }
    }
  ], []);

  // Additional items (like sign out) that need special handling
  const additionalItems: DrawerNavigationItem[] = useMemo(() => [
    {
      key: 'signout',
      label: 'Sign Out',
      icon: 'exit-to-app',
      onPress: handleSignOut
    }
  ], [handleSignOut]);

  // Memoize the rendering of navigation items for performance
  const renderNavigationItem = useCallback((item: DrawerNavigationItem) => {
    const handlePress = () => {
      if (item.onPress) {
        item.onPress();
      } else if (item.navigateTo) {
        navigation.navigate(item.navigateTo, item.params);
      }
    };

    return (
      <DrawerItem
        key={item.key}
        icon={({ color, size }) => (
          <Icon name={item.icon} size={size} color={color} />
        )}
        label={item.label}
        onPress={handlePress}
        labelStyle={styles.drawerLabel}
        style={styles.drawerItem}
      />
    );
  }, [navigation]);

  // // Get the username for the drawer header
  // const username = useMemo(() => {
  //   if (user?.name) return user.name;
  //   if (user?.username) return user.username;
  //   return 'Menu';
  // }, [user]);

  return (
    <DrawerContentScrollView 
      {...props} 
      contentContainerStyle={styles.drawerContent}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Menu</Text>
      </View>
      
      {/* Main navigation items */}
      {navigationItems.map(renderNavigationItem)}
      
      <View style={styles.separator} />
      
      {/* Additional items like sign out */}
      {additionalItems.map(renderNavigationItem)}
    </DrawerContentScrollView>
  );
};

const styles = StyleSheet.create({
  drawerContent: {
    flex: 1,
    paddingTop: 20,
  },
  header: {
    marginTop: 20,
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f7b305',
  },
  drawerItem: {
    borderRadius: 10,
    marginVertical: 2,
  },
  drawerLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 20,
    marginHorizontal: 20,
  },
});

export default React.memo(CustomDrawerContent); 