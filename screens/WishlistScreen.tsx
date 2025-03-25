import React, { useCallback } from 'react';
import { 
  View, 
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar,
  FlatList
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../src/contexts/AuthContext';

// Define the prop types for WishlistScreen
type RootStackParamList = {
  Home: undefined;
  Profile: undefined;
  Wishlist: undefined;
  ProductInfoPage: { product: { id: number; name: string; price: string; image: string } };
};

type WishlistScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Wishlist'>;
};

const WishlistScreen = ({ navigation }: WishlistScreenProps) => {
  const { user } = useAuth();
  
  // Hardcoded wishlist IDs
  const wishlistIds = [1, 3, 5];

  // Product data - in a real app, you would fetch this from an API or context
  const allProducts = [
    {
      id: 1,
      name: 'Nike Sneakers',
      price: '$34.00',
      image: '../assets/images/shoe.jpeg',
      condition: 'Brand New',
      type: 'Rent',
      description: 'Vision Alta Men',
      images: ['https://via.placeholder.com/150', 'https://via.placeholder.com/200']
    },
    { id: 2, name: 'Cricket bat', price: '$18.50', image: 'https://via.placeholder.com/150' },
    { id: 3, name: 'Matress', price: '$32.99', image: 'https://via.placeholder.com/150' },
    { id: 4, name: 'Lamp', price: '$15.75', image: 'https://via.placeholder.com/150' },
    { id: 5, name: 'Polo Tshirt', price: '$49.99', image: 'https://via.placeholder.com/150' },
    { id: 6, name: 'New Item 1', price: '$21.99', image: 'https://via.placeholder.com/150' },
    { id: 7, name: 'New Item 2', price: '$34.50', image: 'https://via.placeholder.com/150' },
    { id: 8, name: 'New Item 3', price: '$19.99', image: 'https://via.placeholder.com/150' },
    { id: 9, name: 'New Item 4', price: '$27.75', image: 'https://via.placeholder.com/150' },
    { id: 10, name: 'New Item 5', price: '$45.99', image: 'https://via.placeholder.com/150' },
    { id: 11, name: 'Popular Item 1', price: '$22.99', image: 'https://via.placeholder.com/150' },
    { id: 12, name: 'Popular Item 2', price: '$17.50', image: 'https://via.placeholder.com/150' },
    { id: 13, name: 'Popular Item 3', price: '$31.99', image: 'https://via.placeholder.com/150' },
    { id: 14, name: 'Popular Item 4', price: '$14.75', image: 'https://via.placeholder.com/150' },
    { id: 15, name: 'Popular Item 5', price: '$39.99', image: 'https://via.placeholder.com/150' },
  ];

  // Filter products to only show those in the wishlist
  const wishlistProducts = allProducts.filter(product => wishlistIds.includes(product.id));

  // Get the first letter of the user's name for the profile circle
  const getInitial = () => {
    if (!user) return 'U';
    
    if (user.name) {
      return user.name.charAt(0).toUpperCase();
    }
    if (user.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return 'U'; // Default if no name is available
  };

  const renderProduct = useCallback(({ item }: { item: any }) => (
    <TouchableOpacity 
      key={item.id} 
      style={styles.productCard}
      onPress={() => navigation.navigate('ProductInfoPage', { product: item })}
    >
      <View style={styles.productImagePlaceholder} />
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>{item.price}</Text>
        <TouchableOpacity 
          style={styles.wishlistButton}
        >
          <FontAwesome 
            name="heart"
            size={20} 
            color="red" 
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  ), [navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top navigation bar with back button and title */}
        <View style={styles.topBar}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          
          <Text style={styles.screenTitle}>My Wishlist</Text>
          
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <View style={styles.profileCircle}>
              <Text style={styles.profileText}>{getInitial()}</Text>
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Wishlist Items */}
        {wishlistProducts.length > 0 ? (
          <FlatList
            data={wishlistProducts}
            renderItem={renderProduct}
            keyExtractor={item => item.id.toString()}
            numColumns={2}
            contentContainerStyle={styles.productGrid}
          />
        ) : (
          <View style={styles.emptyWishlist}>
            <FontAwesome name="heart-o" size={50} color="#ccc" />
            <Text style={styles.emptyWishlistText}>Your wishlist is empty</Text>
            <TouchableOpacity 
              style={styles.browseButton}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.browseButtonText}>Browse Products</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 5,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
  },
  profileButton: {
    padding: 5,
  },
  profileCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  profileText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  productGrid: {
    paddingBottom: 20,
  },
  productCard: {
    flex: 1,
    margin: 10,
    borderRadius: 10,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
    maxWidth: '45%',
  },
  productImagePlaceholder: {
    height: 120,
    backgroundColor: '#e0e0e0',
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 16,
    color: '#34495e',
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: 'black',
  },
  wishlistButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  emptyWishlist: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyWishlistText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    marginBottom: 20,
  },
  browseButton: {
    backgroundColor: '#e67e22',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
  },
  browseButtonText: {
    color: 'black',
    fontWeight: 'bold',
  },
});

export default WishlistScreen; 