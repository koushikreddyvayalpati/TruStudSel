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
  ScrollView
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
import { fetchUserProducts, Product, updateProductStatus, ProductStatus } from '../../api/products';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import the Zustand profile store
import useProfileStore from '../../store/profileStore';

// Constants
const PROFILE_BANNER_HEIGHT = 160;
const PROFILE_IMAGE_SIZE = 100;
const HEADER_MAX_HEIGHT = Platform.OS === 'ios' ? 60 : 56;
const HEADER_MIN_HEIGHT = Platform.OS === 'ios' ? 60 : 56;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;
const ITEM_HEIGHT = 230; // Estimated post item height for better FlatList performance
const { width } = Dimensions.get('window'); // Get screen width for tab slider

// Add the API base URL constant
const API_BASE_URL = 'http://localhost:8080';

// Convert API product to Post interface
const convertProductToPost = (product: Product): Post => ({
  id: parseInt(product.id) || Math.floor(Math.random() * 1000),
  image: product.primaryImage || product.imageUrls?.[0] || 'https://via.placeholder.com/150',
  caption: product.name,
  price: `$${product.price}`,
  condition: product.productage || 'Unknown',
  status: product.status === 'sold' ? 'sold' : (product.status === 'archived' ? 'archived' : 'available')
});

// Post item type
interface Post {
  id: number;
  image: string;
  caption: string;
  price?: string;
  condition?: string;
  status?: 'available' | 'sold' | 'archived';
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
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>UNIVERSITY</Text>
              <Text style={styles.userInfoText}>{userData.university}</Text>
            </View>
          </View>
          
          {/* Only show email if viewing own profile, not someone else's */}
          {!isViewingSeller && (
            <View style={[styles.userInfoItem, styles.emailItem]}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="email-outline" size={18} color="black" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>EMAIL</Text>
                <Text style={styles.userInfoText} numberOfLines={1}>{userData.email}</Text>
              </View>
            </View>
          )}
          
          {backendUserData?.city && backendUserData?.state && (
            <View style={[styles.userInfoItem, styles.locationItem]}>
              <View style={styles.iconContainer}>
                <FontAwesome5 name="map-marker-alt" size={16} color="#f7b305" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>LOCATION</Text>
                <Text style={styles.userInfoText}>{backendUserData.city}, {backendUserData.state}</Text>
              </View>
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
                  extrapolate: 'clamp'
                })
              }]
            }
          ]}
        />
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'inMarket' && styles.activeTabButton
          ]}
          onPress={() => onTabChange('inMarket')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'inMarket' && styles.activeTabText
          ]}>
            In Market
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'archive' && styles.activeTabButton
          ]}
          onPress={() => onTabChange('archive')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'archive' && styles.activeTabText
          ]}>
            Archive
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'sold' && styles.activeTabButton
          ]}
          onPress={() => onTabChange('sold')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'sold' && styles.activeTabText
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
  onMarkAsSold 
}: { 
  item: Post, 
  originalData?: Product, 
  isViewingSeller: boolean,
  onDeleteProduct?: (productId: string) => void,
  onMarkAsSold?: (productId: string) => void 
}) => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  
  const handleProductPress = useCallback(() => {
    console.log('[ProfileScreen] Product pressed:', item.id);
    
    // If we have the original product data, use it for navigation
    if (originalData) {
      navigation.navigate('ProductInfoPage', { 
        product: originalData,
        productId: originalData.id
      });
    } else {
      // If original data isn't available, navigate with the minimal data we have
      navigation.navigate('ProductInfoPage', { 
        product: {
          id: item.id.toString(),
          name: item.caption,
          price: item.price?.replace('$', '') || '0',
          image: item.image,
          condition: item.condition,
          primaryImage: item.image
        },
        productId: item.id.toString()
      });
    }
  }, [item, originalData, navigation]);

  // Handle delete confirmation and action
  const handleDeletePress = useCallback(() => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (onDeleteProduct) {
              onDeleteProduct(item.id.toString());
            }
          }
        }
      ]
    );
  }, [item.id, onDeleteProduct]);

  // Handle mark as sold confirmation and action
  const handleMarkAsSold = useCallback(() => {
    if (item.status !== 'available') {
      // Only allow marking available items as sold
      Alert.alert('Cannot Mark as Sold', 'Only available items can be marked as sold.');
      return;
    }

    // Make sure we have the original product data with the correct UUID
    if (!originalData || !originalData.id) {
      Alert.alert('Error', 'Cannot mark product as sold: Missing product ID.');
      return;
    }

    Alert.alert(
      'Mark as Sold',
      'Are you sure you want to mark this product as sold? This will update your seller stats.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Mark as Sold',
          onPress: () => {
            if (onMarkAsSold) {
              // Use the original product ID (UUID) instead of the item.id (numeric)
              onMarkAsSold(originalData.id);
            }
          }
        }
      ]
    );
  }, [item.status, originalData, onMarkAsSold]);
  
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
    userRating: backendUser?.userRating || '0'
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
      timestamp: now
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
      timestamp: now
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
  isRefreshing,
  onRefresh,
  productsError,
  isViewingSeller,
  navigation,
  productsMap,
  scrollY
}: {
  userData: any,
  backendUserData: BackendUserData | null,
  filteredProducts: Post[],
  productCount: number,
  activeTab: TabType,
  onTabChange: (tab: TabType) => void,
  onEditProfile: () => void,
  isLoadingProducts: boolean,
  isRefreshing: boolean,
  onRefresh: () => Promise<void>,
  productsError: string | null,
  isViewingSeller: boolean,
  navigation: ProfileScreenNavigationProp,
  productsMap: Map<number, Product>,
  scrollY: Animated.Value
}) => {
  // Define handleMarkAsSold function inside the component
  const handleMarkAsSold = useCallback(async (productId: string) => {
    try {
      console.log(`[ProfileScreen] Marking product as sold: ${productId}`);
      
      // Get the current sold count before making the API call
      let currentUserData;
      if (!isViewingSeller && userData.email) {
        currentUserData = await fetchUserProfileById(userData.email);
        const beforeSoldCount = parseInt(currentUserData.productssold || '0', 10);
        console.log(`[ProfileScreen] Current sold count before API call: ${beforeSoldCount}`);
      }
      
      // Update the product status to 'sold'
      await updateProductStatus(productId, 'sold');
      
      if (!isViewingSeller && userData.email && currentUserData) {
        // Get the updated user profile after the status change
        const updatedUserData = await fetchUserProfileById(userData.email);
        const afterSoldCount = parseInt(updatedUserData.productssold || '0', 10);
        const beforeSoldCount = parseInt(currentUserData.productssold || '0', 10);
        
        console.log(`[ProfileScreen] Sold count before: ${beforeSoldCount}, after: ${afterSoldCount}`);
        
        // Only update if the backend didn't already increment the count
        if (afterSoldCount === beforeSoldCount) {
          console.log(`[ProfileScreen] Backend did not increment count, doing it in frontend`);
          const updatedSoldCount = (beforeSoldCount + 1).toString();
          
          // Update the user profile with the new count
          await updateUserProfileData(userData.email, {
            productssold: updatedSoldCount
          });
          
          console.log(`[ProfileScreen] Updated user's sold products count to: ${updatedSoldCount}`);
        } else {
          console.log(`[ProfileScreen] Backend already incremented the count, no need to update`);
        }
        
        // Refresh the data to reflect changes
        await onRefresh();
        
        // Show success message with congratulations
        Alert.alert(
          'Congratulations! 🎉',
          'You have successfully sold your product! Your seller stats have been updated and your product has been moved to the "Sold Products" tab.',
          [
            {
              text: 'Great!',
              style: 'default'
            }
          ]
        );
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
            style: 'default'
          }
        ]
      );
    }
  }, [userData.email, onRefresh, isViewingSeller]);

  // The item renderer for FlatList
  const renderItem = useCallback(({ item, index }: { item: Post, index: number }) => {
    const isEven = index % 2 === 0;
    return (
      <View style={[styles.postGridItem, isEven ? { paddingRight: 4 } : { paddingLeft: 4 }]}>
        <PostItem 
          item={item} 
          originalData={productsMap.get(item.id)} 
          isViewingSeller={isViewingSeller}
          onDeleteProduct={!isViewingSeller ? (productId) => {
            console.log('Delete product:', productId);
            // Add actual delete functionality here
            Alert.alert('Feature Coming Soon', 'Product deletion will be available in a future update.');
          } : undefined}
          onMarkAsSold={!isViewingSeller ? handleMarkAsSold : undefined}
        />
      </View>
    );
  }, [productsMap, isViewingSeller, handleMarkAsSold]);

  // Key extractor for the FlatList
  const keyExtractor = useCallback((item: Post) => item.id.toString(), []);

  // ListEmptyComponent for better organization
  const ListEmptyComponent = useMemo(() => {
    if (isLoadingProducts) {
      return (
        <View style={styles.emptyListContainer}>
          <ActivityIndicator size="large" color="#f7b305" />
          <Text style={styles.emptyListText}>Loading products...</Text>
        </View>
      );
    }
    
    if (productsError) {
      return (
        <View style={styles.emptyListContainer}>
          <MaterialIcons name="error-outline" size={56} color="#e74c3c" />
          <Text style={styles.emptyListErrorText}>{productsError}</Text>
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
              <Text style={styles.emptyListText}>
                {isViewingSeller 
                  ? "This seller doesn't have any active listings" 
                  : "You don't have any active listings"}
              </Text>
              {!isViewingSeller && (
                <TouchableOpacity 
                  style={styles.emptyListButton}
                  onPress={() => {
                    // Handle add listing 
                    // Get the user's university and city
                    const userUniversity = backendUserData?.university || '';
                    const userCity = backendUserData?.city || '';
                    navigation.navigate('PostingScreen', {
                      userUniversity,
                      userCity
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
              <Text style={styles.emptyListText}>
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
  }, [activeTab, filteredProducts.length, isLoadingProducts, productsError, onRefresh, isViewingSeller, navigation]);

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
        <View style={styles.listFooter} />
      )}
      columnWrapperStyle={styles.columnWrapper}
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
    if (!sellerEmail || !user?.email) return false;
    return sellerEmail.toLowerCase() !== user.email.toLowerCase();
  }, [sellerEmail, user?.email]);
  
  // For logging purposes
  useEffect(() => {
    if (sellerEmail) {
      console.log(`[ProfileScreen] Viewing profile for email: ${sellerEmail}`);
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
    isRefreshing,
    error,
    productsError,
    setActiveTab,
    fetchUserProfile,
    fetchUserProducts,
    refreshAllData
  } = useProfileStore();

  // Add scrollY animated value for header animation
  const scrollY = useMemo(() => new Animated.Value(0), []);

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
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              // Navigation will be handled by the AuthContext
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          }
        },
      ]
    );
  }, [signOut]);
  
  // Handle edit profile navigation
  const handleEditProfile = useCallback(() => {
    if (!backendUserData) return;
    
    navigation.navigate('EditProfile', {
      name: backendUserData.name,
      university: backendUserData.university,
      city: backendUserData.city,
      mobile: backendUserData.mobile,
      zipcode: backendUserData.zipcode,
      userphoto: backendUserData.userphoto,
      email: backendUserData.email
    });
  }, [navigation, backendUserData]);
  
  // Handle adding a new listing
  const handleAddListing = useCallback(() => {
    // Get the user's university and city to pass to PostingScreen
    const userUniversity = backendUserData?.university || '';
    const userCity = backendUserData?.city || '';
    
    console.log('[ProfileScreen] Navigating to PostingScreen with params:', {
      userUniversity,
      userCity
    });
    
    navigation.navigate('PostingScreen', {
      userUniversity,
      userCity
    });
  }, [navigation, backendUserData]);

  // Handle tab change
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
  }, [setActiveTab]);

  // Load data when screen is focused
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        const emailToFetch = sellerEmail || user?.email;
        if (!emailToFetch) return;
        
        console.log(`[ProfileScreen] Loading data for ${emailToFetch}`);
        
        // Load profile and products in parallel
        fetchUserProfile(emailToFetch);
        fetchUserProducts(emailToFetch);
      };
      
      loadData();
    }, [sellerEmail, user?.email, fetchUserProfile, fetchUserProducts])
  );
  
  // Handle refresh 
  const handleRefresh = useCallback(async () => {
    const emailToFetch = sellerEmail || user?.email;
    if (!emailToFetch) return;
    
    // Use the store's refresh function
    await refreshAllData(emailToFetch);
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
    userRating: '0'
  };

  // Render the profile screen
  return (
    <SafeAreaView style={styles.safeAreaContainer} edges={['top']}>
      <StatusBar 
        translucent={true}
        backgroundColor="transparent"
        barStyle="light-content" 
      />
      
      {/* Animated Header */}
      <Animated.View 
        style={[
          styles.animatedHeader, 
          { 
            transform: [{ 
              translateY: scrollY.interpolate({
                inputRange: [0, HEADER_SCROLL_DISTANCE],
                outputRange: [0, 0],
                extrapolate: 'clamp',
              })
            }]
          }
        ]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButtonHeader}
            onPress={handleGoBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isViewingSeller ? 'Seller Profile' : 'My Profile'}
          </Text>
          {!isViewingSeller && (
            <TouchableOpacity 
              style={styles.headerAction}
              onPress={handleSignOut}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="logout" size={24} color="#FFF" />
            </TouchableOpacity>
          )}
          {isViewingSeller && (
            <View style={styles.headerAction} />
          )}
        </View>
      </Animated.View>
      
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
              isRefreshing={isRefreshing}
              onRefresh={handleRefresh}
              productsError={productsError}
              isViewingSeller={isViewingSeller}
              navigation={navigation}
              productsMap={productsMap}
              scrollY={scrollY}
            />
            
            {/* Add Listing FAB - only show if viewing own profile */}
            {!isViewingSeller && (
              <TouchableOpacity 
                style={styles.floatingButton}
                onPress={handleAddListing}
                activeOpacity={0.8}
              >
                <MaterialIcons name="add" size={30} color="white" />
              </TouchableOpacity>
            )}
          </>
        )}
      </SafeAreaView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  safeAreaContainer: {
    flex: 1,
    backgroundColor: '#f7b305', // Set top background color to match header
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa', // Content background color
  },
  scrollContent: {
    paddingBottom: 20,
  },
  columnWrapper: {
    paddingHorizontal: 12,
  },
  animatedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_MAX_HEIGHT,
    backgroundColor: '#f7b305',
    zIndex: 100,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : (StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 10),
    paddingBottom: Platform.OS === 'android' ? 12 : 8,
    marginTop: Platform.OS === 'android' ? 0 : (StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 50),
    ...Platform.select({
      android: {
        elevation: 0,
      }
    }),
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: Platform.OS === 'android' ? 8 : 0,
  },
  backButtonHeader: {
    padding: 8,
    backgroundColor: '#f7b305',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      android: {
        backgroundColor: 'transparent',
      }
    }),
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  headerAction: {
    padding: 8,
    backgroundColor: '#f7b305',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      android: {
        backgroundColor: 'transparent',
      }
    }),
  },
  bannerContainer: {
    height: PROFILE_BANNER_HEIGHT,
    width: '100%',
    backgroundColor: '#f7b305', // Yellow background
    ...Platform.select({
      android: {
        elevation: 0,
      }
    }),
  },
  bannerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 16 : StatusBar.currentHeight ? StatusBar.currentHeight + 16 : 16,
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
      }
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
      }
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
      }
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
      }
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
      }
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
    marginBottom: 10,
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
      }
    }),
  },
  editButtonText: {
    fontSize: 12,
    color: '#1b74e4',
    fontWeight: '600',
  },
  userInfoRow: {
    width: '100%',
    marginBottom: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  userInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 8,
    width: '100%',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderLeftWidth: 3,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.05)',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 0,
        borderColor: '#e5e5e5',
      }
    }),
  },
  iconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
  },
  infoContent: {
    flex: 1,
  },
  userInfoText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  infoLabel: {
    fontSize: 11,
    color: '#777',
    marginBottom: 2,
    fontWeight: '500',
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginTop: 2,
    marginBottom: 12,
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
      }
    }),
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
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
      }
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
      }
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
      }
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  soldText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#fff',
    overflow: 'hidden',
    ...Platform.select({
      android: {
        elevation: 0,
      }
    }),
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
    bottom: 24,
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
      }
    }),
  },
  bottomSpacing: {
    height: 30
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
      }
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
  emptyListText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#555',
    marginTop: 20,
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
      }
    }),
  },
  emptyListButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  listFooter: {
    height: 30,
  },
  universityItem: {
    borderLeftColor: '#f7b305',
    width: '100%',
  },
  emailItem: {
    borderLeftColor: '#f7b305',
    width: '100%',
  },
  locationItem: {
    borderLeftColor: '#f7b305', 
    width: '100%',
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  backButton: {
    padding: 8,
    backgroundColor: '#f7b305',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signOutButton: {
    padding: 8,
    backgroundColor: '#f7b305',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
    color: '#000000',
    marginRight: 4,
  },
});

export default React.memo(ProfileScreen); 