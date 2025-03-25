import React, { useCallback } from 'react';
import { 
  View, 
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  FlatList
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// Import contexts and hooks
import { useAuth, useWishlist } from '../../contexts';
import { useTheme } from '../../hooks';
import { Product } from '../../contexts/ProductsContext';
import { MainStackParamList } from '../../types/navigation.types';
import { StackNavigationProp } from '@react-navigation/stack';

type WishlistScreenNavigationProp = StackNavigationProp<MainStackParamList, 'Wishlist'>;

/**
 * WishlistScreen displays the user's wishlist items
 */
const WishlistScreen: React.FC = () => {
  const navigation = useNavigation<WishlistScreenNavigationProp>();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { colors } = theme;
  const { items: wishlistItems, loading, removeFromWishlist } = useWishlist();
  
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

  // Wrap in useCallback
  const handleRemoveFromWishlist = useCallback(async (productId: string) => {
    await removeFromWishlist(productId);
  }, [removeFromWishlist]);

  const renderProduct = useCallback(({ item }: { item: Product }) => (
    <TouchableOpacity 
      key={item.id} 
      style={[styles.productCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
      onPress={() => navigation.navigate('ProductInfoPage', { 
        product: {
          id: parseInt(item.id), 
          name: item.name, 
          price: item.price,
          image: Array.isArray(item.images) && item.images.length > 0 
            ? typeof item.images[0] === 'string' 
              ? item.images[0] 
              : (item.images[0] as any).url 
            : '',
          description: item.description,
          condition: item.condition,
          type: item.type,
          images: item.images
        }
      })}
    >
      <View style={[styles.productImagePlaceholder, { backgroundColor: colors.cardAlt }]} />
      <View style={styles.productInfo}>
        <Text style={[styles.productName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.productPrice, { color: colors.text }]}>{item.price}</Text>
        <TouchableOpacity 
          style={styles.wishlistButton}
          onPress={() => handleRemoveFromWishlist(item.id)}
        >
          <FontAwesome 
            name="heart"
            size={20} 
            color={colors.error} 
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  ), [navigation, colors, handleRemoveFromWishlist]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.container]}>
        {/* Top navigation bar with back button and title */}
        <View style={styles.topBar}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          
          <Text style={[styles.screenTitle, { color: colors.text }]}>My Wishlist</Text>
          
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <View style={[styles.profileCircle, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              <Text style={[styles.profileText, { color: colors.text }]}>{getInitial()}</Text>
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Wishlist Items */}
        {loading ? (
          <View style={styles.emptyWishlist}>
            <Text style={[styles.emptyWishlistText, { color: colors.textSecondary }]}>Loading...</Text>
          </View>
        ) : wishlistItems.length > 0 ? (
          <FlatList
            data={wishlistItems}
            renderItem={renderProduct}
            keyExtractor={item => item.id}
            numColumns={2}
            contentContainerStyle={styles.productGrid}
          />
        ) : (
          <View style={styles.emptyWishlist}>
            <FontAwesome name="heart-o" size={50} color={colors.textDisabled} />
            <Text style={[styles.emptyWishlistText, { color: colors.textSecondary }]}>Your wishlist is empty</Text>
            <TouchableOpacity 
              style={[styles.browseButton, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={[styles.browseButtonText, { color: colors.buttonText }]}>Browse Products</Text>
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
  },
  profileButton: {
    padding: 5,
  },
  profileCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  profileText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  productGrid: {
    paddingBottom: 20,
  },
  productCard: {
    flex: 1,
    margin: 10,
    borderRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
    maxWidth: '45%',
  },
  productImagePlaceholder: {
    height: 120,
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 16,
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
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
    marginTop: 10,
    marginBottom: 20,
  },
  browseButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
  },
  browseButtonText: {
    fontWeight: 'bold',
  },
});

export default WishlistScreen; 