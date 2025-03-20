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
const DRAWER_WIDTH = width * 0.8;

interface SimpleDrawerProps {
  navigation: any;
  isOpen: boolean;
  onClose: () => void;
}

const SimpleDrawer = ({ navigation, isOpen, onClose }: SimpleDrawerProps) => {
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const [iconScale] = useState(new Animated.Value(1));

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

  const animateIcon = () => {
    Animated.sequence([
      Animated.timing(iconScale, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(iconScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const navigateTo = (screenName: string) => {
    onClose();
    setTimeout(() => {
      animateIcon();
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
          <Animated.View style={{ transform: [{ scale: iconScale }] }}>
            <View style={styles.icon}>
              <Icon name="home" size={23} color="black" />
            </View>
          </Animated.View>
          <Text style={styles.menuItemText}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={() => navigateTo('Profile')}
        >
          <Animated.View style={{ transform: [{ scale: iconScale }] }}>
            <Icon name="person" size={24} color="black" />
          </Animated.View>
          <Text style={styles.menuItemText}>Profile</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={() => navigateTo('MessagesScreen')}
        >
          <Animated.View style={{ transform: [{ scale: iconScale }] }}>
            <Icon name="message" size={24} color="black" />
          </Animated.View>
          <Text style={styles.menuItemText}>Messages</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={handleSignOut}
        >
          <Animated.View style={{ transform: [{ scale: iconScale }] }}>
            <Icon name="exit-to-app" size={24} color="black" />
          </Animated.View>
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
    backgroundColor: '#F5F5F5',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: DRAWER_WIDTH,
    height: '100%',
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingTop: 50,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f7b305',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    width: '100%',
    borderRadius: 10,
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: 85,
    color: '#333333',
    fontWeight: 'bold',
    flex: 1,
    justifyContent: 'flex-end',
  },
  icon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    color: '#666666',
  },
});

export default SimpleDrawer; 