import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Antdesign from 'react-native-vector-icons/AntDesign';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MainStackParamList } from '../../types/navigation.types';
import { StackNavigationProp } from '@react-navigation/stack';

type NavigationProp = StackNavigationProp<MainStackParamList>;

/**
 * BottomNavigation component
 * Displays a bottom navigation bar with Home, Wishlist, Post, Search and Chat options
 */
const BottomNavigation: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  
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
          <View style={[styles.centerCircle, { backgroundColor: 'black' }]}>
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
    <View style={styles.container}>
      {renderNavItem(
        <Antdesign name="home" size={24} color="black" />,
        'Home',
        () => navigation.navigate('Home')
      )}
      
      {renderNavItem(
        <Ionicons name="heart-outline" size={24} color="black" />,
        'Wishlist',
        () => navigation.navigate('Wishlist', { wishlist: [] })
      )}
      
      {renderNavItem(
        <Ionicons name="add" size={30} color="white" />,
        '',
        () => navigation.navigate('PostingScreen'),
        true
      )}
      
      {renderNavItem(
        <Ionicons name="search" size={24} color="black" />,
        'Search',
        () => {
          // To be implemented - search functionality
          console.log('Search pressed');
        }
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

export default BottomNavigation; 