import React, { useCallback, useEffect, useState } from 'react';
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
import useChatStore from '../../store/chatStore';
import { Platform } from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
// Update navigation type to be more general
type NavigationProp = StackNavigationProp<any>;

// Define navigation item type for better structure
type BottomNavItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  isCenter?: boolean;
  badge?: number;
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
  const { getTotalUnreadCount, conversations, unreadMessagesCount } = useChatStore();
  const [badgeCount, setBadgeCount] = useState(0);

  // Update badge count whenever conversations or unreadMessagesCount change
  useEffect(() => {
    // Get the latest count directly from the store
    const count = getTotalUnreadCount();
    console.log('[BottomNavigation] Updating badge count:', count);
    setBadgeCount(count);
  }, [getTotalUnreadCount, conversations, unreadMessagesCount]);

  // Also poll for updates every 3 seconds to ensure we never miss a count update
  useEffect(() => {
    const intervalId = setInterval(() => {
      const count = getTotalUnreadCount();
      if (count !== badgeCount) {
        console.log('[BottomNavigation] Updating badge count from interval:', count);
        setBadgeCount(count);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [getTotalUnreadCount, badgeCount]);

  // Log university and city values
  useEffect(() => {
    console.log('[BottomNavigation] Received university:', userUniversity || 'not set');
    console.log('[BottomNavigation] Received city:', userCity || 'not set');
  }, [userUniversity, userCity]);

  // Memoize navigation items for better performance
  const navigationItems = React.useMemo<BottomNavItem[]>(() => [
    {
      key: 'home',
      label: '',
      icon: <FontAwesome name="home" size={28} color="black" />,
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
      label: '',
      icon: <FontAwesome name="heart" size={27} color="black" />,
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
      label: '',
      icon: <FontAwesome name="user" size={28} color="black" />,
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
      label: '',
      icon: <FontAwesome name="wechat" size={28} color="black" />,
      onPress: () => navigation.navigate('MessagesScreen'),
      badge: badgeCount,
    },
  ], [navigation, userUniversity, userCity, badgeCount]);

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
        <View style={styles.iconContainer}>
          {item.icon}
          {item.badge !== undefined && item.badge > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {item.badge > 99 ? '99+' : item.badge}
              </Text>
            </View>
          )}
        </View>
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
    height: 55,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    width: '100%',
    ...Platform.select({
      ios: {
        marginBottom: 20,
        height: 60,
      }
    })
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconContainer: {
    position: 'relative',
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
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    backgroundColor: 'black',
  },
  badge: {
    position: 'absolute',
    right: -10,
    top: -5,
    backgroundColor: '#ff6b6b',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default React.memo(BottomNavigation);
