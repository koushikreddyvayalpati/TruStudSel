import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Auth } from 'aws-amplify';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.7;

interface SimpleDrawerProps {
  navigation: any;
  isOpen: boolean;
  onClose: () => void;
}

const SimpleDrawer = ({ navigation, isOpen, onClose }: SimpleDrawerProps) => {
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  React.useEffect(() => {
    if (isOpen) {
      Animated.timing(translateX, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateX, {
        toValue: -DRAWER_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isOpen, translateX]);

  const navigateTo = (screenName: string) => {
    onClose();
    setTimeout(() => {
      navigation.navigate(screenName);
    }, 300);
  };

  const handleSignOut = async () => {
    onClose();
    try {
      await Auth.signOut();
      setTimeout(() => {
        navigation.navigate('SignIn');
      }, 300);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>
      
      <Animated.View 
        style={[
          styles.drawer,
          { transform: [{ translateX }] }
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Menu</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={() => navigateTo('Home')}
        >
          <Icon name="home" size={24} color="#333" />
          <Text style={styles.menuItemText}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={() => navigateTo('Profile')}
        >
          <Icon name="person" size={24} color="#333" />
          <Text style={styles.menuItemText}>Profile</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={() => navigateTo('MessagesScreen')}
        >
          <Icon name="message" size={24} color="#333" />
          <Text style={styles.menuItemText}>Messages</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={handleSignOut}
        >
          <Icon name="exit-to-app" size={24} color="#333" />
          <Text style={styles.menuItemText}>Sign Out</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: DRAWER_WIDTH,
    height: '100%',
    backgroundColor: 'white',
    padding: 20,
    paddingTop: 50,
  },
  header: {
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: 15,
  },
});

export default SimpleDrawer; 