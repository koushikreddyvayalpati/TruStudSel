import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { 
  DrawerContentScrollView, 
  DrawerItem,
  DrawerContentComponentProps 
} from '@react-navigation/drawer';
import { useAuth } from '../../hooks';

// Get the status bar height for precise positioning
const STATUSBAR_HEIGHT = StatusBar.currentHeight || 0;

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
      // Close drawer after signing out
      navigation.closeDrawer();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, [signOut, navigation]);

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
    }, 
    {
      key: 'settings',
      label: 'Account Settings',
      icon: 'settings',
      navigateTo: 'Settings'
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
        try {
          // First try to navigate directly to the screen
          navigation.navigate(item.navigateTo, item.params);
          
          // Close drawer after navigation
          navigation.closeDrawer();
        } catch (error) {
          // If that fails, try to navigate through the main stack
          console.error(`Error navigating to ${item.navigateTo}:`, error);
          
          // Fallback to nested navigation
          try {
            navigation.navigate('MainStack', {
              screen: item.navigateTo,
              params: item.params
            });
            navigation.closeDrawer();
          } catch (nestedError) {
            console.error(`Error in nested navigation to ${item.navigateTo}:`, nestedError);
          }
        }
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
    <SafeAreaView style={styles.safeArea} edges={['right', 'bottom']}>
      <View style={styles.statusBarFill} />
      <DrawerContentScrollView 
        {...props} 
        contentContainerStyle={styles.drawerContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Menu</Text>
        </View>
        
        {/* Main navigation items */}
        <View style={styles.navigationSection}>
          {navigationItems.map(renderNavigationItem)}
        </View>
        
        <View style={styles.separator} />
        
        {/* Additional items like sign out */}
        <View style={styles.additionalSection}>
          {additionalItems.map(renderNavigationItem)}
        </View>
      </DrawerContentScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  statusBarFill: {
    height: Platform.OS === 'android' ? STATUSBAR_HEIGHT : 0,
    backgroundColor: '#ffffff',
  },
  drawerContent: {
    flexGrow: 1,
    paddingTop: 0,
  },
  header: {
    paddingHorizontal: 20,
    marginTop: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30, // Increase top padding to move content down
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 26, // Slightly bigger
    fontWeight: 'bold',
    color: '#f7b305',
    marginLeft: 5, // Add a little left margin to align with icons
  },
  navigationSection: {
    paddingHorizontal: 5, // Increased from 5
    marginTop: 10,
  },
  additionalSection: {
    paddingHorizontal: 5, // Increased from 5
    paddingBottom: Platform.OS === 'ios' ? 30 : 20, // Increased bottom padding
  },
  drawerItem: {
    borderRadius: 10,
    marginVertical: 4, // Increased for better spacing
  },
  drawerLabel: {
    fontSize: 16,
    fontWeight: '600', // Changed from bold to semi-bold
    color: '#333333',
    marginLeft: 0, // Move labels closer to icons
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 20,
    marginHorizontal: 20,
  },
});

export default React.memo(CustomDrawerContent); 