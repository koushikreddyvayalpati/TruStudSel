import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Antdesign from 'react-native-vector-icons/AntDesign';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { HomeScreenNavigationProp } from '../../types/navigation.types';
import { drawerEventEmitter } from './Drawer';

/**
 * BottomNavigation component
 * Displays a bottom navigation bar with Home, Wishlist, Post, Search and Chat options
 */
const BottomNavigation: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Listen for drawer events
  useEffect(() => {
    const removeListener = drawerEventEmitter.addListener((isOpen) => {
      setIsDrawerOpen(isOpen);
    });
    
    return () => {
      removeListener();
    };
  }, []);
  
  // Don't render if drawer is open
  if (isDrawerOpen) {
    return null;
  }
  
  // Function to render an icon with text
  const renderNavItem = (
    icon: React.ReactNode,
    text: string,
    onPress?: () => void,
    isCenter = false
  ) => {
    if (isCenter) {
      return (
        <TouchableOpacity style={styles.centerNavButton} onPress={onPress}>
          <View style={[styles.centerCircle, { backgroundColor: '#333333' }]}>
            {icon}
          </View>
        </TouchableOpacity>
      );
    }
    
    return (
      <TouchableOpacity style={styles.navButton} onPress={onPress}>
        {icon}
        <Text style={[styles.navText, { color: 'black' }]}>{text}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.bottomNav, { backgroundColor: '#f7b305' }]}>
      {renderNavItem(
        <Ionicons name="home-outline" size={24} color="black" />,
        'Home',
        () => navigation.navigate('Home')
      )}
      
      {renderNavItem(
        <Ionicons name="heart-outline" size={24} color="black" />,
        'Wishlist',
        () => navigation.navigate('Wishlist', { wishlist: [] })
      )}
      
      {renderNavItem(
        <Antdesign name="plus" size={28} color="white" />,
        '',
        () => navigation.navigate('PostingScreen'),
        true
      )}
      
      {renderNavItem(
        <Ionicons name="search-outline" size={24} color="black" />,
        'Search',
        () => console.log('Search pressed')
      )}
      
      {renderNavItem(
        <Ionicons name="chatbubbles-outline" size={24} color="black" />,
        'Chat',
        () => navigation.navigate('MessagesScreen')
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 10,
    right: 10,
    flexDirection: 'row',
    height: 60,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 0,
    zIndex: 1000,
    borderRadius: 25,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  navButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navText: {
    fontSize: 10,
    marginTop: 2,
  },
  centerNavButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 56,
    paddingBottom: 10,
  },
  centerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});

export default BottomNavigation; 