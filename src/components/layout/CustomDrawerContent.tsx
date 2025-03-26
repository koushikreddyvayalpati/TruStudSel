import React from 'react';
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

const CustomDrawerContent = (props: DrawerContentComponentProps) => {
  const { navigation } = props;
  const { signOut } = useAuth();
  
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContent}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Menu</Text>
      </View>
      
      <DrawerItem
        icon={({ color, size }) => (
          <Icon name="home" size={size} color={color} />
        )}
        label="Home"
        onPress={() => navigation.navigate('MainStack')}
        labelStyle={styles.drawerLabel}
        style={styles.drawerItem}
      />
      
      <DrawerItem
        icon={({ color, size }) => (
          <Icon name="person" size={size} color={color} />
        )}
        label="Profile"
        onPress={() => navigation.navigate('Profile')}
        labelStyle={styles.drawerLabel}
        style={styles.drawerItem}
      />
      
      <DrawerItem
        icon={({ color, size }) => (
          <Icon name="message" size={size} color={color} />
        )}
        label="Messages"
        onPress={() => navigation.navigate('MessagesScreen')}
        labelStyle={styles.drawerLabel}
        style={styles.drawerItem}
      />
      
      <DrawerItem
        icon={({ color, size }) => (
          <Icon name="favorite" size={size} color={color} />
        )}
        label="Wishlist"
        onPress={() => navigation.navigate('Wishlist', { wishlist: [] })}
        labelStyle={styles.drawerLabel}
        style={styles.drawerItem}
      />
      
      <View style={styles.separator} />
      
      <DrawerItem
        icon={({ color, size }) => (
          <Icon name="exit-to-app" size={size} color={color} />
        )}
        label="Sign Out"
        onPress={handleSignOut}
        labelStyle={styles.drawerLabel}
        style={styles.drawerItem}
      />
    </DrawerContentScrollView>
  );
};

const styles = StyleSheet.create({
  drawerContent: {
    flex: 1,
    paddingTop: 20,
  },
  header: {
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

export default CustomDrawerContent; 