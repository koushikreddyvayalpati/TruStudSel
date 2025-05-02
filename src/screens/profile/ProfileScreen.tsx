import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Platform,
  Alert,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../contexts/AuthContext';
import { ProfileScreenNavigationProp, MainStackParamList } from '../../types/navigation.types';
import { fetchUserProfileById, updateUserProfileData } from '../../api/users';
import { fetchUserProducts, Product, updateProductStatus, ProductStatus, deleteProduct } from '../../api/products';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import the Zustand profile store
import useProfileStore from '../../store/profileStore';

// Constants
const PROFILE_BANNER_HEIGHT = 120;
const PROFILE_IMAGE_SIZE = 140;
const HEADER_MAX_HEIGHT = Platform.OS === 'ios' ? 60 : 56;
const HEADER_MIN_HEIGHT = Platform.OS === 'ios' ? 60 : 56;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;// Estimated post item height for better FlatList performance
const { width } = Dimensions.get('window'); // Get screen width for tab slider

// Convert API product to Post interface
const convertProductToPost = (product: Product): Post => ({
  id: parseInt(product.id) || Math.floor(Math.random() * 1000),
  image: product.primaryImage || product.imageUrls?.[0] || 'https://via.placeholder.com/150',
  caption: product.name,
  price: `$${product.price}`,
  condition: product.productage || 'Unknown',
  status: product.status === 'sold' ? 'sold' : (product.status === 'archived' ? 'archived' : 'available'),
});

// Post item type
interface Post {
  id: number;
  image: string;
  caption: string;
  price?: string;
  condition?: string;
  status?: 'available' | 'sold' | 'archived';
  originalId?: string; // The original UUID
}

// Define tab types
type TabType = 'inMarket' | 'archive' | 'sold';

// Add this interface for backend user data
interface BackendUserData {
  email: string;
  city?: string;
  mobile?: string;
  name?: string;
  productsCategoriesIntrested?: string[] | null;
  productsListed?: string;
  productssold?: string;
  productswishlist?: string[];
  state?: string;
  university?: string;
  userphoto?: string;
  zipcode?: string;
  userRating?: string;
}

// Extract profile header component for better code organization and performance
const ProfileHeader = React.memo(({
  userData,
  backendUserData,
  filteredPosts,
  activeTab,
  onTabChange,
  onEditProfile,
  isLoadingProducts,
  isViewingSeller,
}: {
  userData: ReturnType<typeof processUserData>,
  backendUserData: BackendUserData | null,
  filteredPosts: Post[],
  activeTab: TabType,
  onTabChange: (tab: TabType) => void,
  onEditProfile: () => void,
  isLoadingProducts: boolean,
  isViewingSeller: boolean,
}) => {
  // Create animated value for tab animation
  const tabPosition = useRef(new Animated.Value(activeTab === 'archive' ? 1 : (activeTab === 'sold' ? 2 : 0))).current;

  // Update animated value when tab changes
  useEffect(() => {
    Animated.timing(tabPosition, {
      toValue: activeTab === 'archive' ? 1 : (activeTab === 'sold' ? 2 : 0),
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [activeTab, tabPosition]);

  // Get the first letter of the user's name for the profile circle
  const getInitial = useCallback(() => {
    if (userData.name) {
      return userData.name.charAt(0).toUpperCase();
    }
    return 'U';
  }, [userData.name]);

  // Verified badge component - memoized
  const VerifiedBadge = useMemo(() => (
    <View style={styles.verifiedBadge}>
      <View style={styles.verifiedBadgeCircle}>
        <FontAwesome name="check" size={12} color="#FFFFFF" />
      </View>
    </View>
  ), []);

  // Stats card - memoized to prevent unnecessary rerenders
  const StatsCard = useMemo(() => (
    <View style={styles.statsCard}>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{parseInt(userData.soldProducts, 10)}</Text>
        <View style={styles.statLabelRow}>
          <Text style={styles.statLabel}>Sold</Text>
        </View>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{isLoadingProducts ? '...' : filteredPosts.length}</Text>
        <View style={styles.statLabelRow}>
          <Text style={styles.statLabel}>Active</Text>
        </View>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{backendUserData?.userRating || '0'}</Text>
        <View style={styles.statLabelRow}>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
      </View>
    </View>
  ), [userData.soldProducts, backendUserData?.userRating, filteredPosts.length, isLoadingProducts]);

  return (
    <View style={styles.profileContainer}>
      <View style={styles.profileImageWrapper}>
        {userData.photo ? (
          <Image
            source={{ uri: userData.photo }}
            style={styles.profileImage}
          />
        ) : (
          <View style={styles.profileImagePlaceholder}>
            <Text style={styles.profileInitial}>{getInitial()}</Text>
          </View>
        )}
        {/* Always show the verified badge */}
        {VerifiedBadge}
      </View>

      <View style={styles.profileDetailsContainer}>
        <View style={styles.nameRow}>
          <Text style={styles.profileName}>{userData.name}</Text>
          {!isViewingSeller && (
            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={onEditProfile}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <FontAwesome name="edit" size={18} color="#1b74e4" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.userInfoRow}>
          <View style={[styles.userInfoItem, styles.universityItem]}>
            <View style={styles.iconContainer}>
              <FontAwesome5 name="university" size={16} color="black" />
            </View>
            
            <Text style={styles.userInfoText}>{userData.university}</Text>
          </View>

          {/* Only show email if viewing own profile, not someone else's */}
          {!isViewingSeller && (
            <View style={[styles.userInfoItem, styles.emailItem]}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="email-outline" size={18} color="black" />
              </View>
              <Text style={styles.userInfoText} numberOfLines={1}>{userData.email}</Text>
            </View>
          )}

          {backendUserData?.city && backendUserData?.state && (
            <View style={[styles.userInfoItem, styles.locationItem]}>
              <View style={styles.iconContainer}>
                <FontAwesome5 name="map-marker-alt" size={16} color="#f7b305" />
              </View>
              <Text style={styles.infoLabel}>LOCATION</Text>
              <Text style={styles.userInfoText}>{backendUserData.city}, {backendUserData.state}</Text>
            </View>
          )}
        </View>

        {/* Stats Card */}
        {StatsCard}
      </View>

      {/* Tab Buttons */}
      <View style={styles.tabsContainer}>
        <Animated.View
          style={[
            styles.tabSlider,
            {
              transform: [{
                translateX: tabPosition.interpolate({
                  inputRange: [0, 1, 2],
                  outputRange: [0, width / 3 - 3, (2 * width) / 3 - 6],
                  extrapolate: 'clamp',
                }),
              }],
            },
          ]}
        />
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'inMarket' && styles.activeTabButton,
          ]}
          onPress={() => onTabChange('inMarket')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'inMarket' && styles.activeTabText,
          ]}>
            In Market
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'archive' && styles.activeTabButton,
          ]}
          onPress={() => onTabChange('archive')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'archive' && styles.activeTabText,
          ]}>
            Archive
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'sold' && styles.activeTabButton,
          ]}
          onPress={() => onTabChange('sold')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'sold' && styles.activeTabText,
          ]}>
            Sold Products
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// Update PostItem component to include mark as sold functionality
const PostItem = React.memo(({
  item,
  originalData,
  isViewingSeller,
  onDeleteProduct,
  onMarkAsSold,
}: {
  item: Post,
  originalData?: Product,
  isViewingSeller: boolean,
  onDeleteProduct?: (productId: string) => void,
  onMarkAsSold?: (productId: string) => void
}) => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();

  // No duplicate Post interface needed here as it's already defined at the top level

  const handleProductPress = useCallback(() => {
    console.log('[ProfileScreen] Product pressed:', item.id);

    // If we have the original product data, use it for navigation
    if (originalData) {
      navigation.navigate('ProductInfoPage', {
        product: originalData,
        productId: originalData.id,
      });
    } else {
      // If original data isn't available, navigate with the minimal data we have
      // and use originalId if available
      navigation.navigate('ProductInfoPage', {
        product: {
          id: item.originalId || item.id.toString(),
          name: item.caption,
          price: item.price?.replace('$', '') || '0',
          image: item.image,
          condition: item.condition,
          primaryImage: item.image,
        },
        productId: item.originalId || item.id.toString(),
      });
    }
  }, [item, originalData, navigation]);

  // Handle delete confirmation and action
  const handleDeletePress = useCallback(() => {
    // Get the best ID to use (originalData.id, originalId, or item.id)
    const productId = originalData?.id || item.originalId || item.id.toString();

    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (onDeleteProduct) {
              onDeleteProduct(productId);
            }
          },
        },
      ]
    );
  }, [item, originalData, onDeleteProduct]);

  // Handle mark as sold confirmation and action
  const handleMarkAsSold = useCallback(() => {
    if (item.status !== 'available') {
      // Only allow marking available items as sold
      Alert.alert('Cannot Mark as Sold', 'Only available items can be marked as sold.');
      return;
    }

    // Get the most reliable product ID available
    const productId = originalData?.id || item.originalId;

    // Make sure we have a valid product ID
    if (!productId) {
      console.error('[ProfileScreen:PostItem] Cannot mark as sold: Missing product ID:', {
        originalData,
        item,
      });
      Alert.alert('Error', 'Cannot mark product as sold: Missing product ID.');
      return;
    }

    // Make sure we're marking the correct product
    console.log('[ProfileScreen:PostItem] About to mark product as sold:', {
      itemId: item.id,
      itemCaption: item.caption,
      itemOriginalId: item.originalId,
      originalDataId: originalData?.id,
      finalProductId: productId,
    });

    // Verify with user that they're marking the correct item as sold
    const productName = originalData?.name || item.caption;
    Alert.alert(
      'Mark as Sold',
      `Are you sure you want to mark "${productName}" as sold? This will update your seller stats.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Mark as Sold',
          onPress: () => {
            if (onMarkAsSold) {
              // Ensure the ID is a string format
              const cleanProductId = String(productId).trim();
              console.log(`[ProfileScreen:PostItem] Calling onMarkAsSold with ID: ${cleanProductId}`);
              onMarkAsSold(cleanProductId);
            }
          },
        },
      ]
    );
  }, [item, originalData, onMarkAsSold]);

  return (
    <TouchableOpacity
      style={styles.postContainer}
      onPress={handleProductPress}
      activeOpacity={0.8}
    >
      <View style={styles.postImageContainer}>
        <Image
          source={{ uri: item.image }}
          style={styles.postImage}
          resizeMode="cover"
        />
        {item.status === 'sold' && (
          <View style={styles.soldOverlay}>
            <Text style={styles.soldText}>SOLD</Text>
          </View>
        )}
        <View style={styles.priceTagContainer}>
          <Text style={styles.postPrice}>{item.price}</Text>
        </View>
      </View>
      <View style={styles.postInfo}>
        <Text style={styles.postCaption} numberOfLines={1}>{item.caption}</Text>
        <Text style={styles.postCondition}>{item.condition}</Text>

        {/* Action buttons - only show for own products */}
        {!isViewingSeller && (
          <View style={styles.productActionButtons}>
            {/* Mark as Sold button - only show for available products */}
            {item.status === 'available' && onMarkAsSold && (
              <TouchableOpacity
                style={styles.markAsSoldButton}
                onPress={handleMarkAsSold}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons name="briefcase-edit-outline" size={16} color="black" />
              </TouchableOpacity>
            )}

            {/* Delete button */}
            {onDeleteProduct && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeletePress}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={16} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

// Move the useUserData function outside of any hooks
const processUserData = (user: any, backendUser: BackendUserData | null) => {
  return {
    name: backendUser?.name || user?.name || 'User',
    email: backendUser?.email || user?.email || '',
    photo: backendUser?.userphoto || user?.photo,
    university: backendUser?.university || '',
    city: backendUser?.city || '',
    totalProducts: parseInt(backendUser?.productsListed || '0', 10),
    soldProducts: backendUser?.productssold || '0',
    wishlist: backendUser?.productswishlist || [],
    userRating: backendUser?.userRating || '0',
  };
};

// Add this cache manager outside of the component to make it global
// This will serve as an in-memory cache for quick access without AsyncStorage overhead
const profileCache = new Map();

// Add this function for cache cleanup outside of the component
// This limits the in-memory cache size to prevent memory issues
const MAX_CACHE_SIZE = 50; // Maximum number of profiles to keep in memory

function cleanupCache() {
  if (profileCache.size > MAX_CACHE_SIZE) {
    // Convert to array to sort by timestamp
    const cacheEntries = Array.from(profileCache.entries());

    // Sort by timestamp (oldest first)
    cacheEntries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remove the oldest 20% entries
    const entriesToRemove = Math.floor(profileCache.size * 0.2);
    const oldestEntries = cacheEntries.slice(0, entriesToRemove);

    // Delete from Map
    oldestEntries.forEach(([key]) => {
      profileCache.delete(key);
    });

    console.log(`Cache cleanup: removed ${entriesToRemove} oldest entries`);
  }
}

// Add these variables outside the component for API request throttling
const USER_PROFILE_CACHE_KEY = 'user_profile_cache_';
const USER_PRODUCTS_CACHE_KEY = 'user_products_cache_';
const CACHE_EXPIRY_TIME = 15 * 60 * 1000; // 15 minutes in milliseconds
const PRODUCTS_CACHE_EXPIRY_TIME = 20 * 60 * 1000; // 20 minutes in milliseconds
const API_REQUEST_TIMESTAMPS = new Map(); // Track timestamps of API requests by email
const PRODUCTS_API_REQUEST_TIMESTAMPS = new Map(); // Track timestamps of product API requests by email
const MIN_API_REQUEST_INTERVAL = 30000; // Minimum time between API requests for the same user (30 seconds)

// Add this cache manager for products outside of the component
const productsCache = new Map();

// Background cache refresh mechanism to keep data fresh without blocking UI
async function refreshCacheInBackground(email: string) {
  try {
    // Check if we're rate-limiting this user
    const lastRequestTime = API_REQUEST_TIMESTAMPS.get(email);
    const now = Date.now();

    if (lastRequestTime && (now - lastRequestTime < MIN_API_REQUEST_INTERVAL)) {
      console.log(`Skipping background refresh for ${email}: rate limited`);
      return;
    }

    console.log(`Background refreshing data for ${email}`);
    API_REQUEST_TIMESTAMPS.set(email, now);

    // Fetch fresh data from API
    const data = await fetchUserProfileById(email);

    // Update caches
    const cacheData = {
      data,
      timestamp: now,
    };

    profileCache.set(email, cacheData);
    cleanupCache();

    const cacheKey = `${USER_PROFILE_CACHE_KEY}${email}`;
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));

    console.log(`Background refresh completed for ${email}`);
  } catch (error) {
    console.warn(`Background refresh failed for ${email}:`, error);
    // Don't propagate the error since this is a background operation
  }
}

// Add this function for products cache cleanup
function cleanupProductsCache() {
  if (productsCache.size > MAX_CACHE_SIZE) {
    // Convert to array to sort by timestamp
    const cacheEntries = Array.from(productsCache.entries());

    // Sort by timestamp (oldest first)
    cacheEntries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remove the oldest 20% entries
    const entriesToRemove = Math.floor(productsCache.size * 0.2);
    const oldestEntries = cacheEntries.slice(0, entriesToRemove);

    // Delete from Map
    oldestEntries.forEach(([key]) => {
      productsCache.delete(key);
    });

    console.log(`Products cache cleanup: removed ${entriesToRemove} oldest entries`);
  }
}

// Background refresh function for products
async function refreshProductsCacheInBackground(email: string) {
  try {
    // Check if we're rate-limiting this user
    const lastRequestTime = PRODUCTS_API_REQUEST_TIMESTAMPS.get(email);
    const now = Date.now();

    if (lastRequestTime && (now - lastRequestTime < MIN_API_REQUEST_INTERVAL)) {
      console.log(`Skipping background products refresh for ${email}: rate limited`);
      return;
    }

    console.log(`Background refreshing products for ${email}`);
    PRODUCTS_API_REQUEST_TIMESTAMPS.set(email, now);

    // Fetch fresh data from API
    const productData = await fetchUserProducts(email);

    // Update caches
    const cacheData = {
      data: productData,
      timestamp: now,
    };

    productsCache.set(email, cacheData);
    cleanupProductsCache();

    const cacheKey = `${USER_PRODUCTS_CACHE_KEY}${email}`;
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));

    console.log(`Background products refresh completed for ${email}`);
  } catch (error) {
    console.warn(`Background products refresh failed for ${email}:`, error);
    // Don't propagate the error since this is a background operation
  }
}

// Create a ProfileContentView component to render the profile content with the original UI
const ProfileContentView = React.memo(({
  userData,
  backendUserData,
  filteredProducts,
  productCount,
  activeTab,
  onTabChange,
  onEditProfile,
  isLoadingProducts,
  isLoadingMoreProducts,
  hasMoreProducts,
  onLoadMore,
  isRefreshing,
  onRefresh,
  productsError,
  isViewingSeller,
  navigation,
  productsMap,
  scrollY,
  setActiveTab,
}: {
  userData: any,
  backendUserData: BackendUserData | null,
  filteredProducts: Post[],
  productCount: number,
  activeTab: TabType,
  onTabChange: (tab: TabType) => void,
  onEditProfile: () => void,
  isLoadingProducts: boolean,
  isLoadingMoreProducts: boolean,
  hasMoreProducts: boolean,
  onLoadMore: () => void,
  isRefreshing: boolean,
  onRefresh: () => Promise<void>,
  productsError: string | null,
  isViewingSeller: boolean,
  navigation: ProfileScreenNavigationProp,
  productsMap: Map<number, Product>,
  scrollY: Animated.Value,
  setActiveTab: (tab: TabType) => void
}) => {
  // Use a stable reference for userEmail to prevent extra renders
  const userEmail = useMemo(() => userData?.email || '', [userData?.email]);
  const userCity = useMemo(() => backendUserData?.city || '', [backendUserData?.city]);
  const userUniversity = useMemo(() => backendUserData?.university || '', [backendUserData?.university]);

  // Define handleMarkAsSold function inside the component
  const handleMarkAsSold = useCallback(async (productId: string) => {
    try {
      // Validate product ID
      if (!productId || typeof productId !== 'string') {
        console.error(`[ProfileScreen] Invalid product ID: ${productId}, type: ${typeof productId}`);
        Alert.alert('Error', 'Invalid product ID. Please try again.');
        return;
      }

      // Ensure we have a clean string ID
      const cleanProductId = productId.trim();

      // Only log in development
      if (__DEV__) {
        console.log(`[ProfileScreen] Marking product as sold: ${cleanProductId}`);
      }

      // Track processing time for performance monitoring (dev only)
      const startTime = __DEV__ ? Date.now() : 0;

      // Get the current sold count before making the API call (only if needed)
      let currentUserData;
      if (!isViewingSeller && userEmail) {
        currentUserData = await fetchUserProfileById(userEmail);
        if (__DEV__) {
          const beforeSoldCount = parseInt(currentUserData.productssold || '0', 10);
          console.log(`[ProfileScreen] Current sold count before API call: ${beforeSoldCount}`);
        }
      }

      // Update the product status to 'sold'
      if (__DEV__) {
        console.log(`[ProfileScreen] Calling updateProductStatus with ID: ${cleanProductId}`);
      }

      // Show a loading indicator to the user
      const updatedProduct = await updateProductStatus(cleanProductId, 'sold');

      if (__DEV__) {
        console.log('[ProfileScreen] Product updated successfully:', updatedProduct);
      }

      if (!isViewingSeller && userEmail && currentUserData) {
        // Get the updated user profile after the status change
        const updatedUserData = await fetchUserProfileById(userEmail);
        const afterSoldCount = parseInt(updatedUserData.productssold || '0', 10);
        const beforeSoldCount = parseInt(currentUserData.productssold || '0', 10);

        if (__DEV__) {
          console.log(`[ProfileScreen] Sold count before: ${beforeSoldCount}, after: ${afterSoldCount}`);
        }

        // Only update if the backend didn't already increment the count
        if (afterSoldCount === beforeSoldCount) {
          if (__DEV__) {
            console.log('[ProfileScreen] Backend did not increment count, doing it in frontend');
          }

          const updatedSoldCount = (beforeSoldCount + 1).toString();

          // Update the user profile with the new count
          await updateUserProfileData(userEmail, {
            productssold: updatedSoldCount,
          });

          if (__DEV__) {
            console.log(`[ProfileScreen] Updated user's sold products count to: ${updatedSoldCount}`);
          }
        } else if (__DEV__) {
          console.log('[ProfileScreen] Backend already incremented the count, no need to update');
        }

        // Force refresh the data to reflect all changes
        if (__DEV__) {
          console.log('[ProfileScreen] Refreshing data after marking product as sold');
        }

        await onRefresh();

        // Switch to the 'sold' tab to show the sold product
        if (__DEV__) {
          console.log('[ProfileScreen] Switching to \'sold\' tab to display newly sold product');
        }

        setActiveTab('sold');

        // Performance tracking in dev mode
        if (__DEV__) {
          const endTime = Date.now();
          console.log(`[ProfileScreen] Mark as sold operation took ${endTime - startTime}ms`);
        }

        // Show success message with congratulations
        Alert.alert(
          'Congratulations! 🎉',
          'You have successfully sold your product! Your seller stats have been updated and your product has been moved to the "Sold Products" tab.',
          [
            {
              text: 'Great!',
              style: 'default',
            },
          ]
        );
      } else {
        // For sellers or when userData is not available, still refresh
        if (__DEV__) {
          console.log('[ProfileScreen] Refreshing data after marking product as sold (seller view or no userData)');
        }

        await onRefresh();

        // Switch to the 'sold' tab to show the sold product
        setActiveTab('sold');
      }
    } catch (error: any) {
      console.error('[ProfileScreen] Error marking product as sold:', error);

      // Extract more helpful error information
      let errorMessage = 'Failed to mark product as sold. Please try again.';

      if (error.message) {
        if (error.message.includes('405')) {
          errorMessage = 'Server error: The API endpoint is temporarily unavailable. Our team has been notified and is working on a fix.';
        } else if (error.message.includes('400')) {
          errorMessage = 'Invalid request: The product may already be sold or contains invalid data.';
        } else if (error.message.includes('403')) {
          errorMessage = 'Permission denied: You may not have rights to update this product.';
        } else if (error.message.includes('404')) {
          errorMessage = 'Product not found: This product may have been deleted or moved.';
        } else if (error.message.includes('Network request failed')) {
          errorMessage = 'Network error: Please check your internet connection and try again.';
        }
      }

      Alert.alert(
        'Unable to Mark as Sold',
        errorMessage,
        [
          {
            text: 'OK',
            style: 'default',
          },
        ]
      );
    }
  }, [userEmail, onRefresh, isViewingSeller, setActiveTab]);

  // Handle deleting a product
  const handleDeleteProduct = useCallback(async (productId: string) => {
    try {
      // Validate product ID
      if (!productId || typeof productId !== 'string') {
        console.error(`[ProfileScreen] Invalid product ID for deletion: ${productId}`);
        Alert.alert('Error', 'Invalid product ID. Please try again.');
        return;
      }

      // Ensure we have a clean string ID
      const cleanProductId = productId.trim();

      // Start timing (dev only)
      const startTime = __DEV__ ? Date.now() : 0;
      if (__DEV__) {
        console.log(`[ProfileScreen] Deleting product: ${cleanProductId}`);
      }

      // Show confirmation dialog
      Alert.alert(
        'Delete Product',
        'Are you sure you want to delete this product?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                // Immediately update UI for responsiveness
                useProfileStore.getState().removeProduct(cleanProductId);

                // Make API call in background
                const success = await deleteProduct(cleanProductId);

                if (__DEV__) {
                  console.log(`[ProfileScreen] API call successful: ${success}`);
                  const endTime = Date.now();
                  console.log(`[ProfileScreen] Delete operation took ${endTime - startTime}ms`);
                }

                // Only show success message after API call completes
                Alert.alert('Success', 'Product has been deleted.');
              } catch (error) {
                console.error('[ProfileScreen] API error:', error);
                Alert.alert(
                  'Error',
                  'The product was removed from your view, but there was an error on the server. It may reappear when you refresh.',
                  [
                    {
                      text: 'OK',
                      onPress: () => onRefresh(),
                    },
                  ]
                );
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('[ProfileScreen] Error in delete handler:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  }, [onRefresh]);

  // The item renderer for FlatList
  const renderItem = useCallback(({ item, index }: { item: Post, index: number }) => {
    const isEven = index % 2 === 0;

    // Find the original data more reliably by using the product name as a fallback
    // but only log warnings for development purposes in case of no match
    let originalData = productsMap.get(item.id);

    if (!originalData && item.originalId) {
      // Try using the originalId directly
      for (const product of productsMap.values()) {
        if (product.id === item.originalId) {
          originalData = product;
          break;
        }
      }
    }

    if (!originalData && __DEV__) {
      // Only in development mode, try matching by name as a last resort
      for (const product of productsMap.values()) {
        if (product.name === item.caption) {
          originalData = product;
          // Don't log in production to improve performance
          console.log(`[ProfileScreen] Found product by name match: ${product.name} with ID ${product.id}`);
          break;
        }
      }

      if (!originalData) {
        // Only log in development mode
        console.log(`[ProfileScreen] Warning: No original data found for product ${item.caption}(${item.id})`);
      }
    }

    return (
      <View style={[styles.postGridItem, isEven ? { paddingRight: 4 } : { paddingLeft: 4 }]}>
        <PostItem
          item={item}
          originalData={originalData}
          isViewingSeller={isViewingSeller}
          onDeleteProduct={!isViewingSeller ? handleDeleteProduct : undefined}
          onMarkAsSold={!isViewingSeller ? handleMarkAsSold : undefined}
        />
      </View>
    );
  }, [productsMap, isViewingSeller, handleMarkAsSold, handleDeleteProduct]);

  // Key extractor for the FlatList
  const keyExtractor = useCallback((item: Post) => item.id.toString(), []);

  // ListEmptyComponent for better organization
  const ListEmptyComponent = useMemo(() => {
    if (isLoadingProducts) {
      return (
        <View style={styles.emptyListContainer}>
          <ActivityIndicator size="large" color="#f7b305" />
          <Text style={styles.emptyStateText}>Loading products...</Text>
        </View>
      );
    }

    if (productsError) {
      return (
        <View style={styles.emptyListContainer}>
          <MaterialIcons name="error-outline" size={56} color="#e74c3c" />
          <Text style={styles.emptyListErrorText}>
            {productsError.includes('404') ? 
              'Your products could not be found. The server might be experiencing issues.' : 
              productsError}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={onRefresh}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (filteredProducts.length === 0) {
      return (
        <View style={styles.emptyListContainer}>
          {activeTab === 'inMarket' ? (
            <>
              <MaterialCommunityIcons name="storefront-outline" size={56} color="#bbb" />
              <Text style={styles.emptyStateText}>
                {isViewingSeller
                  ? "This seller doesn't have any active listings"
                  : "You don't have any active listings"}
              </Text>
              {!isViewingSeller && (
                <TouchableOpacity
                  style={styles.emptyListButton}
                  onPress={() => {
                    // Handle add listing
                    navigation.navigate('PostingScreen', {
                      userUniversity,
                      userCity,
                    });
                  }}
                >
                  <Text style={styles.emptyListButtonText}>Post Something</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <MaterialCommunityIcons name="archive-outline" size={56} color="#bbb" />
              <Text style={styles.emptyStateText}>
                {isViewingSeller
                  ? "This seller doesn't have any archived items"
                  : "You don't have any archived items"}
              </Text>
            </>
          )}
        </View>
      );
    }

    return null;
  }, [activeTab, filteredProducts.length, isLoadingProducts, productsError, onRefresh, isViewingSeller, navigation, userCity, userUniversity]);

  // Render the profile content using FlatList with the original styling
  return (
    <Animated.FlatList
      data={filteredProducts}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={2}
      showsVerticalScrollIndicator={false}
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: true }
      )}
      scrollEventThrottle={16}
      contentContainerStyle={styles.scrollContent}
      ListHeaderComponent={() => (
        <>
          {/* Profile Banner with background color #f7b305 */}
          <View style={styles.bannerContainer}>
            <View style={styles.bannerContent}>
              {/* Banner content without buttons */}
            </View>
          </View>

          <ProfileHeader
            userData={userData}
            backendUserData={backendUserData}
            filteredPosts={filteredProducts}
            activeTab={activeTab}
            onTabChange={onTabChange}
            onEditProfile={onEditProfile}
            isLoadingProducts={isLoadingProducts}
            isViewingSeller={isViewingSeller}
          />
        </>
      )}
      ListEmptyComponent={ListEmptyComponent}
      ListFooterComponent={() => (
        <View style={styles.listFooter}>
          {filteredProducts.length > 0 && (
            <>
              {isLoadingMoreProducts && (
                <View style={styles.loadMoreContainer}>
                  <ActivityIndicator size="small" color="#f7b305" />
                  <Text style={styles.loadMoreText}>Loading more products...</Text>
                </View>
              )}
              
              {!isLoadingMoreProducts && hasMoreProducts && (
                <TouchableOpacity 
                  style={styles.loadMoreButton}
                  onPress={onLoadMore}
                  disabled={isLoadingMoreProducts}
                >
                  <Text style={styles.loadMoreButtonText}>Load More</Text>
                </TouchableOpacity>
              )}
              
              {!hasMoreProducts && filteredProducts.length > 0 && (
                <Text style={styles.endOfListText}>
                  {filteredProducts.length === 1 
                    ? "That's the only product" 
                    : "You've reached the end"}
                </Text>
              )}
            </>
          )}
        </View>
      )}
      columnWrapperStyle={styles.columnWrapper}
      onEndReached={hasMoreProducts ? onLoadMore : undefined}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          colors={['#ffffff']}
          tintColor="#ffffff"
          progressBackgroundColor="#f7b305"
        />
      }
    />
  );
});

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const route = useRoute<RouteProp<MainStackParamList, 'Profile'>>();
  const { signOut, user } = useAuth();

  // Get sellerEmail from route params if available
  const sellerEmail = route.params?.sellerEmail;

  // Determine if we're viewing another seller's profile or our own
  const isViewingSeller = useMemo(() => {
    if (!sellerEmail || !user?.email) {return false;}
    return sellerEmail.toLowerCase() !== user.email.toLowerCase();
  }, [sellerEmail, user?.email]);

  // For logging purposes
  useEffect(() => {
    if (sellerEmail) {
      // console.log(`[ProfileScreen] Viewing profile for email: ${sellerEmail}`);
      console.log(`[ProfileScreen] Is viewing seller profile: ${isViewingSeller}`);
    }
  }, [sellerEmail, isViewingSeller]);

  // Use Zustand store for state management
  const {
    backendUserData,
    processedUserData,
    products,
    productsMap,
    activeTab,
    isLoading,
    isLoadingProducts,
    isLoadingMoreProducts,
    productsNextPageToken,
    productsHasMorePages,
    isRefreshing,
    error,
    productsError,
    fetchUserProfile,
    fetchUserProducts,
    loadMoreUserProducts,
    refreshAllData,
    setActiveTab,
    removeProduct
  } = useProfileStore();

  // Use a ref to track products length for optimized updates
  const productCountRef = useRef(products.length);

  // Optimized effect to detect significant state changes without triggering renders
  useEffect(() => {
    // Only log changes in development
    if (__DEV__ && productCountRef.current !== products.length) {
      console.log(`[ProfileScreen] Products count changed: ${productCountRef.current} → ${products.length}`);
      productCountRef.current = products.length;
    }
  }, [products.length]);

  // Animation for the parallax header effect
  const scrollY = useRef(new Animated.Value(0)).current;

  // Filter products based on active tab - MOVED HERE before any conditional returns
  const filteredProducts = useMemo(() => {
    switch (activeTab) {
      case 'inMarket':
        return products.filter(product => product.status === 'available');
      case 'archive':
        return products.filter(product => product.status === 'archived');
      case 'sold':
        return products.filter(product => product.status === 'sold');
      default:
        return products;
    }
  }, [activeTab, products]);

  // Handle navigation back
  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Handle sign out
  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          onPress: async () => {
            try {
              // Clear caches and sign out
              await Promise.all([
                cleanupCache(),
                cleanupProductsCache(),
                AsyncStorage.removeItem(USER_PROFILE_CACHE_KEY),
                AsyncStorage.removeItem(USER_PRODUCTS_CACHE_KEY),
              ]);

              // Sign out using Auth context
              await signOut();
              
              // No need to navigate manually - AuthContext will update isAuthenticated state
              // which will cause AppNavigator to show Auth stack automatically
            } catch (error) {
              console.error('[ProfileScreen] Error during sign out:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, [signOut]);

  // Handle edit profile
  const handleEditProfile = useCallback(() => {
    if (isViewingSeller) {return;}
    
    // Ensure backendUserData exists before navigating
    if (!backendUserData) {
      console.warn('[ProfileScreen] Cannot navigate to EditProfile: backendUserData is missing.');
      Alert.alert('Error', 'Could not load user data for editing. Please try again.');
      return;
    }
    
    // console.log('[ProfileScreen] Navigating to EditProfile with data:', backendUserData);
    
    navigation.navigate({
      name: 'EditProfile',
      // Pass parameters, using undefined as fallback if a field is missing on backendUserData
      params: {
        name: backendUserData.name ?? undefined,
        university: backendUserData.university ?? undefined,
        city: backendUserData.city ?? undefined,
        mobile: backendUserData.mobile ?? undefined,
        zipcode: backendUserData.zipcode ?? undefined,
        userphoto: backendUserData.userphoto ?? undefined,
        email: backendUserData.email ?? undefined, 
      }
    });
  }, [navigation, isViewingSeller, backendUserData]);

  // Handle adding a new listing
  const handleAddListing = useCallback(() => {
    if (__DEV__) {
      console.log('[ProfileScreen] Navigating to Posting screen');
    }
    navigation.navigate({
      name: 'PostingScreen',
      params: {
        userUniversity: backendUserData?.university || '',
        userCity: backendUserData?.city || ''
      }
    });
  }, [navigation, backendUserData]);

  // Handle loading more products
  const handleLoadMore = useCallback(() => {
    if (!isLoadingMoreProducts && productsHasMorePages) {
      const emailToFetch = sellerEmail || user?.email;
      if (emailToFetch) {
        try {
          loadMoreUserProducts(emailToFetch).catch(error => {
            console.error(`[ProfileScreen] Error loading more products: ${error.message || error}`);
            // Show a toast or small notification instead of full alert for better UX
            if (error.response?.status === 404) {
              // Handle 404 specifically
              Alert.alert(
                'Products Not Found',
                'The server could not find additional products. Please try refreshing the page.',
                [{ text: 'OK', style: 'default' }]
              );
            }
          });
        } catch (error) {
          console.error('[ProfileScreen] Error in handleLoadMore:', error);
        }
      }
    }
  }, [sellerEmail, user?.email, isLoadingMoreProducts, productsHasMorePages, loadMoreUserProducts]);

  // Handle tab change
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
  }, [setActiveTab]);

  // Load data when screen is focused
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        const emailToFetch = sellerEmail || user?.email;
        if (!emailToFetch) {return;}

        // console.log(`[ProfileScreen] Loading data for ${emailToFetch}`);

        try {
          // Load profile and products in parallel with error handling
          await Promise.all([
            fetchUserProfile(emailToFetch).catch(error => {
              console.error(`[ProfileScreen] Error fetching user profile: ${error.message || error}`);
              if (error.response?.status === 404) {
                // Handle 404 specifically for profile
                Alert.alert(
                  'Profile Not Found',
                  'Could not find user profile. The user may have been deleted or the server is experiencing issues.',
                  [{ text: 'OK', style: 'default' }]
                );
              }
            }),
            fetchUserProducts(emailToFetch).catch(error => {
              console.error(`[ProfileScreen] Error fetching user products: ${error.message || error}`);
              // We don't show an alert here as the error will be displayed in the UI
            })
          ]);
        } catch (error) {
          console.error('[ProfileScreen] Error in loadData:', error);
        }
      };

      loadData();
    }, [sellerEmail, user?.email, fetchUserProfile, fetchUserProducts])
  );

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    const emailToFetch = sellerEmail || user?.email;
    if (!emailToFetch) {return;}
    
    try {
      console.log('[ProfileScreen] Starting refresh and clearing cache');
      
      // Clear caches sequentially instead of in parallel to avoid race conditions
      try {
        // In-memory cache cleanup first
        cleanupCache();
        cleanupProductsCache();
        
        // Then clear AsyncStorage keys one by one with error handling
        try {
          await AsyncStorage.removeItem(`${USER_PROFILE_CACHE_KEY}${emailToFetch}`);
        } catch (storageError) {
          console.warn(`[ProfileScreen] Error clearing profile cache: ${storageError}`);
          // Continue with refresh despite storage error
        }
        
        try {
          await AsyncStorage.removeItem(`${USER_PRODUCTS_CACHE_KEY}${emailToFetch}`);
        } catch (storageError) {
          console.warn(`[ProfileScreen] Error clearing products cache: ${storageError}`);
          // Continue with refresh despite storage error
        }
      } catch (cacheError) {
        console.warn(`[ProfileScreen] Error during cache cleanup: ${cacheError}`);
        // Continue with refresh despite cache cleanup error
      }
      
      // Use the store's refresh function with force refresh enabled
      console.log('[ProfileScreen] Cache cleared, refreshing data from API');
      await refreshAllData(emailToFetch);
      
      console.log('[ProfileScreen] Refresh completed successfully');
    } catch (error) {
      console.error('[ProfileScreen] Error during refresh:', error);
      
      // Attempt a fallback refresh without cache clearing if the main refresh fails
      try {
        console.log('[ProfileScreen] Attempting fallback refresh without cache clearing');
        await refreshAllData(emailToFetch);
        console.log('[ProfileScreen] Fallback refresh completed successfully');
      } catch (fallbackError) {
        console.error('[ProfileScreen] Fallback refresh also failed:', fallbackError);
        Alert.alert(
          'Refresh Failed',
          'Unable to refresh your data. Please check your connection and try again.',
          [{ text: 'OK', style: 'default' }]
        );
      }
    }
  }, [sellerEmail, user?.email, refreshAllData]);

  // Render loading state
  if (isLoading && !isRefreshing) {
      return (
      <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f7b305" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
      );
    }

  // Render error state
  if (error && !isRefreshing) {
      return (
      <SafeAreaView style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={48} color="#e74c3c" />
        <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
          onPress={() => {
            const emailToFetch = sellerEmail || user?.email;
            if (emailToFetch) {
              fetchUserProfile(emailToFetch, true);
            }
          }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Use processedUserData from the store
  const userData = processedUserData || {
    name: 'User',
    email: user?.email || '',
    university: 'Unknown University',
    photo: null,
    soldProducts: '0',
    totalProducts: 0,
    city: '',
    wishlist: [],
    userRating: '0',
  };

  // Render the profile screen
  return (
    <SafeAreaView
      style={styles.container}
      edges={Platform.OS === 'ios' ? ['top', 'bottom', 'left', 'right'] : ['bottom', 'left', 'right']}
    >
      <View style={styles.container}>
        {/* Animated Header */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.backButtonHeader}
            onPress={handleGoBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isViewingSeller ? 'Seller Profile' : 'My Profile'}
          </Text>
          {!isViewingSeller ? (
            <TouchableOpacity
              style={styles.headerAction}
              onPress={handleSignOut}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="logout" size={24} color="white" />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerAction} />
          )}
        </View>

        <SafeAreaView style={styles.contentContainer} edges={['bottom', 'left', 'right']}>
          {/* Handle loading and error states for profile data */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#f7b305" />
              <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={64} color="#e74c3c" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRefresh}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Show profile content when not loading or error */}
          {!isLoading && !error && (
            <>
              <ProfileContentView
                userData={userData}
                backendUserData={backendUserData}
                filteredProducts={filteredProducts}
                productCount={products.length}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onEditProfile={handleEditProfile}
                isLoadingProducts={isLoadingProducts}
                isLoadingMoreProducts={isLoadingMoreProducts}
                hasMoreProducts={productsHasMorePages}
                onLoadMore={handleLoadMore}
                isRefreshing={isRefreshing}
                onRefresh={handleRefresh}
                productsError={productsError}
                isViewingSeller={isViewingSeller}
                navigation={navigation}
                productsMap={productsMap}
                scrollY={scrollY}
                setActiveTab={setActiveTab}
              />

            </>
          )}
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa', // Content background color
    paddingBottom: 60, // Added padding to account for bottom navigation
  },
  scrollContent: {
    paddingBottom: 20,
  },
  columnWrapper: {
    paddingHorizontal: 12,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: '#f7b305',
    borderBottomWidth: 0,
    borderBottomColor: '#f0f0f0',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 1,
        shadowRadius: 1,
        marginTop: 60,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  backButtonHeader: {
    padding: 8,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Montserrat',
  },
  headerAction: {
    padding: 8,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerContainer: {
    height: PROFILE_BANNER_HEIGHT * 0.85,
    width: '100%',
    backgroundColor: '#f7b305', // Yellow background
    ...Platform.select({
      android: {
        elevation: 0,
      },
    }),
  },
  bannerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 5,
    paddingTop: Platform.OS === 'android' ? 1 : StatusBar.currentHeight ? StatusBar.currentHeight + 1 : 1,
  },
  profileContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -25,
    paddingTop: 0,
    paddingHorizontal: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 0,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.1)',
      },
    }),
  },
  profileImageWrapper: {
    alignSelf: 'center',
    marginTop: -PROFILE_IMAGE_SIZE / 2,
    marginBottom: 8,
    position: 'relative',
    width: PROFILE_IMAGE_SIZE + 8, // Add some extra space for border
    height: PROFILE_IMAGE_SIZE + 8, // Add some extra space for border
    borderRadius: (PROFILE_IMAGE_SIZE + 8) / 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
      },
      android: {
        elevation: 0,
        borderWidth: 4,
        borderColor: '#fff',
        backgroundColor: '#fff',
      },
    }),
  },
  profileImage: {
    width: PROFILE_IMAGE_SIZE,
    height: PROFILE_IMAGE_SIZE,
    borderRadius: PROFILE_IMAGE_SIZE / 2,
    ...Platform.select({
      ios: {
        borderWidth: 4,
        borderColor: '#fff',
      },
      android: {
        borderWidth: 0,
      },
    }),
  },
  profileImagePlaceholder: {
    width: PROFILE_IMAGE_SIZE,
    height: PROFILE_IMAGE_SIZE,
    borderRadius: PROFILE_IMAGE_SIZE / 2,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        borderWidth: 4,
        borderColor: '#fff',
      },
      android: {
        borderWidth: 0,
      },
    }),
  },
  profileInitial: {
    fontSize: 34,
    fontWeight: 'bold',
    color: 'white',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'transparent',
  },
  verifiedBadgeCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#FFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 0,
        borderWidth: 3,
      },
    }),
  },
  profileDetailsContainer: {
    alignItems: 'center',
    marginBottom: 5,
    width: '100%',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
    width: '100%',
    position: 'relative',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#222222',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  editProfileButton: {
    marginTop: 2,
    marginLeft: 4,
    padding: 6,
    borderRadius: 50,
    backgroundColor: '#fff',
    borderWidth: 0,
    borderColor: '#e0e0e0',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 0,
        backgroundColor: 'rgba(247, 179, 5, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(27, 116, 228, 0.3)',
      },
    }),
  },
  editButtonText: {
    fontSize: 12,
    color: '#1b74e4',
    fontWeight: '600',
  },
  userInfoRow: {
    width: '100%',
    marginBottom: 10,
    flexDirection: 'column',
    paddingHorizontal: 5,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.05)',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  userInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 0,
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  iconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginLeft: 5,
    backgroundColor: 'rgba(247, 179, 5, 0.05)',
    borderRadius: 16,
  },
  userInfoText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'left',
    paddingRight: 10,
  },
  infoLabel: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
    marginLeft: 5,
    flex: 1,
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 0,
    marginBottom: 10,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#eeeeee',
    borderLeftWidth: 0,
    borderRightWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.08)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 0,
        borderBottomWidth: 1,
        borderTopWidth: 1,
      },
    }),
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 0,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#444',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: '#eeeeee',
    alignSelf: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 14,
    marginHorizontal: 5,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    padding: 3,
    position: 'relative',
    height: 46,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    zIndex: 2,
    backgroundColor: 'transparent',
  },
  activeTabButton: {
    backgroundColor: '#f7b305',
  },
  tabSlider: {
    position: 'absolute',
    height: 40,
    width: '25%',
    backgroundColor: '#f7b305',
    borderRadius: 9,
    top: 3,
    left: 3,
    zIndex: 1,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.15)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 0,
        borderWidth: 1,
        borderColor: 'rgba(233, 166, 0, 0.5)',
      },
    }),
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#888',
  },
  activeTabText: {
    color: '#ffffff',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  postsSection: {
    flex: 1,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  postGridItem: {
    width: '50%',
    marginBottom: 10,
    padding: 4,
    marginTop: 10,
  },
  postContainer: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 0,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)',
      },
    }),
  },
  postImageContainer: {
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: 160,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  priceTagContainer: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    zIndex: 5,
  },
  postPrice: {
    backgroundColor: '#000000',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    fontWeight: 'bold',
    fontSize: 16,
    color: '#ffffff',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.5)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 0,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.2)',
      },
    }),
  },
  postInfo: {
    padding: 14,
  },
  postCaption: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  postCondition: {
    fontSize: 14,
    color: '#666',
    fontWeight: '400',
  },
  soldOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  soldText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 20,
    transform: [{ rotate: '-30deg' }],
    borderWidth: 2,
    borderColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    letterSpacing: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 40,
    minHeight: 300,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#555',
    marginTop: 20,
  },
  emptyStateSubtext: {
    fontSize: 15,
    color: '#777',
    textAlign: 'center',
    marginTop: 10,
  },
  loaderFooter: {
    width: '100%',
    paddingVertical: 20,
    alignItems: 'center',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 84, // Adjusted to account for bottom navigation
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f7b305',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.3)',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 0,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
      },
    }),
  },
  bottomSpacing: {
    height: 80, // Increased to account for bottom navigation
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 18,
    color: '#e74c3c',
  },
  retryButton: {
    backgroundColor: '#f7b305',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    ...Platform.select({
      android: {
        elevation: 0,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
      },
    }),
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyListErrorText: {
    fontSize: 18,
    color: '#e74c3c',
    marginTop: 10,
  },
  emptyListButton: {
    backgroundColor: '#f7b305',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    ...Platform.select({
      android: {
        elevation: 0,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
      },
    }),
  },
  emptyListButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  listFooter: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  universityItem: {
    width: '100%',
  },
  emailItem: {
    width: '100%',
  },
  locationItem: {
    width: '100%',
    borderBottomWidth: 0,
  },
  productActionButtons: {
    position: 'absolute',
    right: 5,
    bottom: 5,
    flexDirection: 'row',
  },
  markAsSoldButton: {
    padding: 6,
    marginRight: 8,
    borderRadius: 50,
    borderWidth: 0,
  },
  deleteButton: {
    padding: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 50,
  },
  loadMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  loadMoreText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginLeft: 10,
  },
  loadMoreButton: {
    backgroundColor: '#f7b305',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    ...Platform.select({
      android: {
        elevation: 0,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
      },
    }),
  },
  loadMoreButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  endOfListText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#777',
    textAlign: 'center',
  },
});

export default React.memo(ProfileScreen);
