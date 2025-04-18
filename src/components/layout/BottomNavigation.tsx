import React, { useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Antdesign from 'react-native-vector-icons/AntDesign';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { StackNavigationProp } from '@react-navigation/stack';

// Update navigation type to be more general
type NavigationProp = StackNavigationProp<any>;

// Define navigation item type for better structure
type BottomNavItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  isCenter?: boolean;
};

interface BottomNavigationProps {
  userUniversity: string;
  userCity?: string;
}

/**
 * BottomNavigation component
 * Displays a bottom navigation bar with Home, Wishlist, Post, Search and Chat options
 */
const BottomNavigation: React.FC<BottomNavigationProps> = ({ userUniversity, userCity = '' }) => {
  const navigation = useNavigation<NavigationProp>();

  // Log university and city values
  useEffect(() => {
    console.log('[BottomNavigation] Received university:', userUniversity || 'not set');
    console.log('[BottomNavigation] Received city:', userCity || 'not set');
  }, [userUniversity, userCity]);

  // Memoize navigation items for better performance
  const navigationItems = useMemo<BottomNavItem[]>(() => [
    {
      key: 'home',
      label: 'Home',
      icon: <Antdesign name="home" size={24} color="black" />,
      onPress: () => {
        try {
          // Use popToTop to return to home from any nested stack
          const state = navigation.getState();
          if (state.routes.length > 1) {
            navigation.popToTop();
          } else {
            navigation.navigate('Home');
          }
        } catch (error) {
          // Fallback if popToTop fails
          navigation.navigate('Home');
          console.warn('Navigation error:', error);
        }
      },
    },
    {
      key: 'wishlist',
      label: 'Wishlist',
      icon: <Ionicons name="heart-outline" size={24} color="black" />,
      onPress: () => navigation.navigate('Wishlist', { wishlist: [] }),
    },
    {
      key: 'post',
      label: '',
      icon: <Ionicons name="add" size={30} color="white" />,
      onPress: () => {
        // Add more debug logging to track userUniversity during navigation
        console.log('[BottomNavigation] Navigating to PostingScreen with university:', userUniversity || 'not set');
        console.log('[BottomNavigation] Navigating to PostingScreen with city:', userCity || 'not set');

        // Only navigate with params if we have values
        if (userUniversity) {
          navigation.navigate('PostingScreen', {
            userUniversity,
            userCity,
          });
        } else {
          console.warn('[BottomNavigation] Warning: Navigating to PostingScreen without university data');
          navigation.navigate('PostingScreen', {
            userUniversity: '',
            userCity: userCity || '',
          });
        }
      },
      isCenter: true,
    },
    {
      key: 'profile',
      label: 'Profile',
      icon: <Antdesign name="user" size={24} color="black" />,
      onPress: () => {
        try {
          // Navigate to the Profile screen - use direct navigation
          // This will now work with the drawer navigator
          navigation.navigate('Profile');
          console.log('Profile pressed');
        } catch (error) {
          console.error('Navigation error:', error);
        }
      },
    },
    {
      key: 'chat',
      label: 'Chat',
      icon: <Ionicons name="chatbubbles-outline" size={24} color="black" />,
      onPress: () => navigation.navigate('MessagesScreen'),
    },
  ], [navigation, userUniversity, userCity]);

  // Memoize the render function to prevent unnecessary re-renders
  const renderNavItem = useCallback((item: BottomNavItem) => {
    if (item.isCenter) {
      return (
        <TouchableOpacity
          key={item.key}
          style={styles.centerNavButton}
          onPress={item.onPress}
          accessibilityLabel={item.label || 'Post'}
        >
          <View style={styles.centerCircle}>
            {item.icon}
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        key={item.key}
        style={styles.navButton}
        onPress={item.onPress}
        accessibilityLabel={item.label}
      >
        {item.icon}
        <Text style={styles.navText}>{item.label}</Text>
      </TouchableOpacity>
    );
  }, []);

  return (
    <View style={styles.container}>
      {navigationItems.map(renderNavItem)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f7b305',
    height: 70,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: 10,
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navText: {
    fontSize: 12,
    marginTop: 2,
    color: 'black',
  },
  centerNavButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  centerCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    backgroundColor: 'black',
  },
});

export default React.memo(BottomNavigation);
