import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import contexts and hooks
import { useAuth } from '../../contexts';
import { useTheme } from '../../hooks';
import { MainStackParamList } from '../../types/navigation.types';
import { StackNavigationProp } from '@react-navigation/stack';
import { API_URL } from '../../api/config';

// Add API base URL
const API_BASE_URL = API_URL;

// Define Product type
interface Product {
  id: string;
  name: string;
  price: string;
  image?: string;
  images?: string[];
  description?: string;
  condition?: string;
  type?: string;
  sellerName?: string;
  email?: string;
  seller?: {
    id?: string;
    name?: string;
    email?: string;
  };
  addedAt?: string;
}

type WishlistScreenNavigationProp = StackNavigationProp<MainStackParamList, 'Wishlist'>;

// Helper function to format the date
const formatDate = (dateString?: string) => {
  if (!dateString) {return '';}

  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Added today';
    } else if (diffDays === 1) {
      return 'Added yesterday';
    } else if (diffDays < 7) {
      return `Added ${diffDays} days ago`;
    } else {
      return `Added on ${date.toLocaleDateString()}`;
    }
  } catch (error) {
    console.error('[WishlistScreen] Error formatting date:', error);
    return '';
  }
};

/**
 * WishlistScreen displays the user's wishlist items
 */
const WishlistScreen: React.FC = () => {
  const navigation = useNavigation<WishlistScreenNavigationProp>();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { colors } = theme;

  // State for wishlist data
  const [wishlistItems, setWishlistItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Get the first letter of the user's name for the profile circle
  const getInitial = () => {
    if (!user) {return 'U';}

    if (user.name) {
      return user.name.charAt(0).toUpperCase();
    }
    if (user.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return 'U'; // Default if no name is available
  };

  // Function to fetch wishlist items from API
  const fetchWishlistItems = useCallback(async () => {
    if (!user?.email) {
      console.error('[WishlistScreen] No user email found for fetching wishlist');
      setWishlistItems([]);
      setLoading(false);
      return;
    }

    try {
      // Import Auth from Amplify inside the function to avoid circular dependencies
      const { Auth } = require('aws-amplify');

      // Get the current authenticated session to retrieve the JWT token
      const currentSession = await Auth.currentSession();
      const token = currentSession.getIdToken().getJwtToken();

      console.log(`[WishlistScreen] Fetching wishlist for user: ${user.email}`);
      const apiUrl = `${API_BASE_URL}/api/wishlist/${user.email}`;

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error(`[WishlistScreen] API error: ${response.status}`);
        setWishlistItems([]);
        setLoading(false);
        return;
      }

      try {
        const text = await response.text();
        if (!text) {
          console.log('[WishlistScreen] Empty response received');
          setWishlistItems([]);
          setLoading(false);
          return;
        }

        const data = JSON.parse(text);
        console.log(`[WishlistScreen] Fetched ${data.length || 0} wishlist items`);

        // Transform data to match Product interface based on actual API response
        const processedItems = Array.isArray(data) ? data.map(item => ({
          id: item.productId, // Use productId as the id
          name: item.productName || 'Unknown Product',
          price: item.productPrice || '0.00',
          image: item.productImage || 'https://via.placeholder.com/150',
          images: [item.productImage || 'https://via.placeholder.com/150'], // Create images array from productImage
          description: '', // No description in API response
          condition: '', // No condition in API response
          type: '',
          sellerName: '',
          email: item.email,
          addedAt: item.addedAt, // Store the addedAt date for potential sorting
        })) : [];

        // Sort by newest first if addedAt is available
        processedItems.sort((a, b) => {
          if (a.addedAt && b.addedAt) {
            return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
          }
          return 0;
        });

        setWishlistItems(processedItems);
      } catch (parseError) {
        console.error('[WishlistScreen] Error parsing response:', parseError);
        setWishlistItems([]);
      }
    } catch (error) {
      console.error('[WishlistScreen] Error fetching wishlist:', error);
      setWishlistItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.email]);

  // Function to remove item from wishlist
  const removeFromWishlist = useCallback(async (productId: string) => {
    if (!user?.email) {
      console.error('[WishlistScreen] No user email found for removing from wishlist');
      return false;
    }

    try {
      // Import Auth from Amplify inside the function to avoid circular dependencies
      const { Auth } = require('aws-amplify');

      // Get the current authenticated session to retrieve the JWT token
      const currentSession = await Auth.currentSession();
      const token = currentSession.getIdToken().getJwtToken();

      console.log(`[WishlistScreen] Removing product ${productId} from wishlist`);
      const apiUrl = `${API_BASE_URL}/api/wishlist/${user.email}/${productId}`;

      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status >= 200 && response.status < 300) {
        console.log('[WishlistScreen] Successfully removed from wishlist');

        // Update the UI by removing the item from state
        setWishlistItems(prev => prev.filter(item => item.id !== productId));

        // Update the cache to reflect the removal
        try {
          const cacheKey = `wishlist_${user.email}_${productId}`;
          const cacheTimeKey = `${cacheKey}_timestamp`;
          await AsyncStorage.setItem(cacheKey, 'false');
          await AsyncStorage.setItem(cacheTimeKey, Date.now().toString());
        } catch (cacheError) {
          console.warn('[WishlistScreen] Error updating cache:', cacheError);
        }

        return true;
      } else {
        console.error(`[WishlistScreen] Failed API response: ${response.status}`);
        Alert.alert('Error', 'Failed to remove item from wishlist. Please try again.');
        return false;
      }
    } catch (error) {
      console.error('[WishlistScreen] Error removing from wishlist:', error);
      Alert.alert('Error', 'Failed to remove item from wishlist. Please try again.');
      return false;
    }
  }, [user?.email]);

  // Function to handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchWishlistItems();
  }, [fetchWishlistItems]);

  // Fetch wishlist items when component mounts
  useEffect(() => {
    fetchWishlistItems();
  }, [fetchWishlistItems]);

  // Handle remove from wishlist
  const handleRemoveFromWishlist = useCallback((productId: string) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from your wishlist?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          onPress: () => removeFromWishlist(productId),
        },
      ]
    );
  }, [removeFromWishlist]);

  const renderProduct = useCallback(({ item }: { item: Product }) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.productCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
      onPress={() => {
        // Use type assertion to satisfy TypeScript
        navigation.navigate('ProductInfoPage', {
          product: {
            id: item.id.toString(),
            name: item.name,
            price: item.price,
            image: Array.isArray(item.images) && item.images.length > 0
              ? item.images[0]
              : (item.image || 'https://via.placeholder.com/150'),
            description: item.description || '',
            condition: item.condition || '',
            type: item.type || '',
            images: Array.isArray(item.images)
              ? item.images
              : item.image ? [item.image] : [],
            sellerName: item.sellerName || (item.seller?.name || 'Unknown Seller'),
            email: item.email || '',
            seller: {
              id: (item.seller?.id || 'unknown-seller'),
              name: item.sellerName || (item.seller?.name || 'Unknown Seller'),
              email: item.email || (item.seller?.email || ''),
            },
          },
          productId: item.id.toString(),
        });
      }}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{
            uri: Array.isArray(item.images) && item.images.length > 0
              ? item.images[0]
              : (item.image || 'https://via.placeholder.com/150'),
          }}
          style={styles.productImage}
          resizeMode="cover"
          {...(Platform.OS === 'ios' ? { defaultSource: { uri: 'https://via.placeholder.com/150' } } : {})}
        />
        <View style={styles.wishlistBadge}>
          <FontAwesome name="heart" size={14} color="#fff" />
        </View>
      </View>
      <View style={styles.productInfo}>
        <Text style={[styles.productName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.productPrice, { color: colors.text }]}>${item.price}</Text>

        {/* Added date display */}
        {item.addedAt && (
          <Text style={[styles.addedDate, { color: colors.textSecondary }]}>
            {formatDate(item.addedAt)}
          </Text>
        )}

        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveFromWishlist(item.id)}
        >
          <FontAwesome name="trash-o" size={16} color={colors.error} />
          <Text style={[styles.removeText, { color: colors.error }]}>Remove</Text>
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

          <View style={styles.titleContainer}>
            <Text style={[styles.screenTitle, { color: colors.text }]}>My Wishlist</Text>
            {!loading && wishlistItems.length > 0 && (
              <Text style={[styles.itemCount, { color: colors.textSecondary }]}>
                {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile', { sellerEmail: user?.email })}
          >
            <View style={[styles.profileCircle, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              <Text style={[styles.profileText, { color: colors.text }]}>{getInitial()}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Wishlist Items */}
        {loading ? (
          <View style={styles.emptyWishlist}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.emptyWishlistText, { color: colors.textSecondary }]}>Loading your wishlist...</Text>
          </View>
        ) : wishlistItems.length > 0 ? (
          <FlatList
            data={wishlistItems}
            renderItem={renderProduct}
            keyExtractor={item => item.id}
            numColumns={2}
            contentContainerStyle={styles.productGrid}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
          />
        ) : (
          <View style={styles.emptyWishlist}>
            <FontAwesome name="heart-o" size={50} color={colors.textDisabled} />
            <Text style={[styles.emptyWishlistTitle, { color: colors.text }]}>Your wishlist is empty</Text>
            <Text style={[styles.emptyWishlistText, { color: colors.textSecondary }]}>
              Items you save to your wishlist will appear here
            </Text>
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
    paddingTop: 0,
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
  titleContainer: {
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  itemCount: {
    fontSize: 14,
    marginTop: 4,
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
  imageContainer: {
    position: 'relative',
    height: 120,
    width: '100%',
  },
  productImage: {
    height: '100%',
    width: '100%',
  },
  wishlistBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    padding: 4,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 4,
  },
  addedDate: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  removeText: {
    fontSize: 13,
    marginLeft: 4,
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
  emptyWishlistTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyWishlistText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
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
