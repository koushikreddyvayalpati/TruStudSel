import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import Antdesign from 'react-native-vector-icons/AntDesign';
// Define the prop types
type RootStackParamList = {
  Home: undefined;
  Profile: undefined;
};

type BottomNavigationProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Home'>;
};

// Try with a different import approach
let Icon;
try {
  Icon = require('react-native-vector-icons/Ionicons').default;
} catch (error) {
  // Fallback to null if the module can't be loaded
  console.warn('Could not load vector icons:', error);
  Icon = null;
}

const BottomNavigation = ({ navigation }: BottomNavigationProps) => {
  console.log('BottomNavigation is rendering');
  
  // Add a navigation handler
  const navigateTo = (screenName: keyof RootStackParamList) => {
    navigation?.navigate(screenName);
  };
  
  // Function to render icons safely
  const renderIcon = (iconName: string, fallbackText: string) => {
    if (Icon) {
      try {
        return <Icon name={iconName} size={24} color="#333" />;
      } catch (e) {
        console.warn('Error rendering icon:', e);
      }
    }
    
    // Platform-specific fallback icons look better
    const platformFallback = Platform.select({
      ios: {
        'home-outline': '⌂',
        'heart-outline': '♥',
        'search-outline': '⚲',
        'settings-outline': '⚙',
        'message-outline': '💬',
      },
      android: {
        'home-outline': '⋙',
        'heart-outline': '♡',
        'search-outline': '⚲',
        'settings-outline': '⚙',
        'message-outline': '💬',
      }
    });
    
    return <Text style={styles.navIcon}>{platformFallback[iconName] || fallbackText}</Text>;
  };

  return (
    <View style={styles.bottomNav}>
      <TouchableOpacity 
        style={styles.navButton}
        onPress={() => navigateTo('Home')}
      >
        {renderIcon('home-outline', '⌂')}
        <Text style={styles.navText}>Home</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.navButton}>
        {renderIcon('heart-outline', '♥')}
        <Text style={styles.navText}>Wishlist</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.centerNavButton}>
        <View style={styles.centerCircle}>
          <Antdesign name="plus" size={28} color="white" />
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.navButton}>
        {renderIcon('search-outline', '⚲')}
        <Text style={styles.navText}>Search</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.navButton}
        onPress={() => navigateTo('MessagesScreen')}
      >
        {renderIcon('settings-outline', '⚙')}
        <Text style={styles.navText}>Settings</Text>
      </TouchableOpacity>
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
    backgroundColor: '#f7b305',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 0,
    zIndex: 1000,
    borderRadius: 20,
    marginBottom: 10,
  },
  navButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navIcon: {
    fontSize: 22,
    color: '#333',
    marginBottom: 2,
  },
  navText: {
    fontSize: 10,
    color: '#333',
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
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  centerIcon: {
    fontSize: 34,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 10,
  }
});

export default BottomNavigation; 