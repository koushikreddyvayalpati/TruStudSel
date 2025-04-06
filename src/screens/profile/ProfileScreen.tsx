import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Platform,
  Alert
} from 'react-native';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../contexts/AuthContext';
import { ProfileScreenNavigationProp, MainStackParamList } from '../../types/navigation.types';
import { fetchUserProfileById } from '../../api/users';
import { fetchUserProducts, Product } from '../../api/products';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants
const PROFILE_BANNER_HEIGHT = 180;
const PROFILE_IMAGE_SIZE = 110;
const HEADER_MAX_HEIGHT = Platform.OS === 'ios' ? 60 : 56;
const HEADER_MIN_HEIGHT = Platform.OS === 'ios' ? 60 : 56;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;
const ITEM_HEIGHT = 230; // Estimated post item height for better FlatList performance

// Convert API product to Post interface
const convertProductToPost = (product: Product): Post => ({
  id: parseInt(product.id) || Math.floor(Math.random() * 1000),
  image: product.primaryImage || product.imageUrls?.[0] || 'https://via.placeholder.com/150',
  caption: product.name,
  price: `$${product.price}`,
  condition: product.productage || 'Unknown',
  status: product.status === 'SOLD' ? 'sold' : (product.status === 'ARCHIVED' ? 'archived' : 'active')
});

// Post item type
interface Post {
  id: number;
  image: string;
  caption: string;
  price?: string;
  condition?: string;
  status?: 'active' | 'sold' | 'archived';
}

// Define tab types
type TabType = 'inMarket' | 'archive';

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
        <Text style={styles.statLabel}>Items Sold</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{isLoadingProducts ? '...' : filteredPosts.length}</Text>
        <Text style={styles.statLabel}>Active Listings</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{userData.totalProducts}</Text>
        <Text style={styles.statLabel}>Total</Text>
      </View>
    </View>
  ), [userData.soldProducts, userData.totalProducts, filteredPosts.length, isLoadingProducts]);

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
        <View style={styles.nameEditRow}>
          <Text style={styles.profileName}>{userData.name}</Text>
          {!isViewingSeller && (
            <TouchableOpacity 
              style={styles.editProfileButton}
              onPress={onEditProfile}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.userInfoRow}>
          <View style={styles.userInfoItem}>
            <FontAwesome5 name="university" size={16} color="#666" />
            <Text style={styles.userInfoText}>{userData.university}</Text>
          </View>
          {/* Only show email if viewing own profile, not someone else's */}
          {!isViewingSeller && (
            <View style={styles.userInfoItem}>
              <MaterialCommunityIcons name="email-outline" size={16} color="#666" />
              <Text style={styles.userInfoText} numberOfLines={1}>{userData.email}</Text>
            </View>
          )}
          {backendUserData?.city && backendUserData?.state && (
            <View style={styles.userInfoItem}>
              <FontAwesome5 name="map-marker-alt" size={16} color="#666" />
              <Text style={styles.userInfoText}>{backendUserData.city}, {backendUserData.state}</Text>
            </View>
          )}
        </View>
      </View>
      
      {/* Stats Card */}
      {StatsCard}
      
      {/* Tab Buttons */}
      <View style={styles.tabsContainer}>
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
      </View>
    </View>
  );
});

// Post item component extracted for better performance
const PostItem = React.memo(({ item, originalData }: { item: Post, originalData?: Product }) => {
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
      </View>
      <View style={styles.postInfo}>
        <Text style={styles.postCaption} numberOfLines={1}>{item.caption}</Text>
        <Text style={styles.postCondition}>{item.condition}</Text>
        <Text style={styles.postPrice}>{item.price}</Text>
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
    wishlist: backendUser?.productswishlist || []
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
  
  // Add a ref to track refresh count
  const refreshCountRef = useRef<number>(0);
  
  // Reset refresh count when component unmounts or when profile changes
  useEffect(() => {
    refreshCountRef.current = 0;
    
    return () => {
      refreshCountRef.current = 0;
    };
  }, [sellerEmail]);
  
  // For logging purposes
  useEffect(() => {
    if (sellerEmail) {
      console.log(`[ProfileScreen] Viewing profile for email: ${sellerEmail}`);
      console.log(`[ProfileScreen] Is viewing seller profile: ${isViewingSeller}`);
    }
  }, [sellerEmail, isViewingSeller]);
  
  // State for backend user data
  const [backendUserData, setBackendUserData] = useState<BackendUserData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  
  // State for user product data
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [products, setProducts] = useState<Post[]>([]);
  const [productsMap, setProductsMap] = useState<Map<number, Product>>(new Map());
  const [activeTab, setActiveTab] = useState<TabType>('inMarket');

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

  // Process the user data for display
  const userData = useMemo(() => {
    return processUserData(user, backendUserData);
  }, [user, backendUserData]);

  // Fetch user products from API with caching
  const fetchUserProductData = useCallback(async () => {
    // Use sellerEmail from route params if available, otherwise use logged-in user email
    const emailToFetch = sellerEmail || user?.email;
    
    if (!emailToFetch) {
      setIsLoadingProducts(false);
      return;
    }
    
    setProductsError(null);
    if (!isRefreshing) setIsLoadingProducts(true);
    
    // If this is the second or more refresh, log it and force refresh from API
    const shouldForceRefresh = isRefreshing && refreshCountRef.current >= 1;
    if (shouldForceRefresh) {
      console.log(`[ProfileScreen] Force refreshing user products from API (refresh count: ${refreshCountRef.current + 1})`);
    }
    
    try {
      const cacheKey = `${USER_PRODUCTS_CACHE_KEY}${emailToFetch}`;
      
      // First, check the in-memory cache for the fastest access
      if (!shouldForceRefresh && !isRefreshing && productsCache.has(emailToFetch)) {
        const { data, timestamp } = productsCache.get(emailToFetch);
        const isExpired = Date.now() - timestamp > PRODUCTS_CACHE_EXPIRY_TIME;
        const isStale = Date.now() - timestamp > (PRODUCTS_CACHE_EXPIRY_TIME / 3);
        
        if (!isExpired) {
          console.log('[ProfileScreen] Using in-memory cached user products data');
          
          // Create a new map to store the relationship between Posts and Products
          const newProductsMap = new Map<number, Product>();
          
          // Convert API products to Post format
          const formattedPosts = data.map((product: Product) => {
            const post = convertProductToPost(product);
            // Store the original product data for future reference
            newProductsMap.set(post.id, product);
            return post;
          });
          
          setProducts(formattedPosts);
          setProductsMap(newProductsMap);
          setIsLoadingProducts(false);
          
          // If data is stale but not expired, trigger a background refresh
          if (isStale && !isViewingSeller) {
            console.log('[ProfileScreen] Products data is stale, triggering background refresh');
            setTimeout(() => refreshProductsCacheInBackground(emailToFetch), 100);
          }
          
          return;
        }
      }
      
      // Then try AsyncStorage if not refreshing and not forcing refresh
      if (!shouldForceRefresh && !isRefreshing) {
        try {
          const cachedData = await AsyncStorage.getItem(cacheKey);
          
          if (cachedData) {
            const { data, timestamp } = JSON.parse(cachedData);
            const isExpired = Date.now() - timestamp > PRODUCTS_CACHE_EXPIRY_TIME;
            const isStale = Date.now() - timestamp > (PRODUCTS_CACHE_EXPIRY_TIME / 3);
            
            if (!isExpired) {
              console.log('[ProfileScreen] Using AsyncStorage cached user products data');
              
              // Update in-memory cache too
              productsCache.set(emailToFetch, { data, timestamp });
              
              // Create a new map to store the relationship between Posts and Products
              const newProductsMap = new Map<number, Product>();
              
              // Convert API products to Post format
              const formattedPosts = data.map((product: Product) => {
                const post = convertProductToPost(product);
                // Store the original product data for future reference
                newProductsMap.set(post.id, product);
                return post;
              });
              
              setProducts(formattedPosts);
              setProductsMap(newProductsMap);
              setIsLoadingProducts(false);
              
              // If data is stale but not expired, trigger a background refresh
              if (isStale && !isViewingSeller) {
                console.log('[ProfileScreen] Products data is stale, triggering background refresh');
                setTimeout(() => refreshProductsCacheInBackground(emailToFetch), 100);
              }
              
              return;
            } else {
              console.log('[ProfileScreen] Products cache expired, fetching fresh data');
            }
          }
        } catch (cacheError) {
          console.warn('[ProfileScreen] Error reading products from cache:', cacheError);
          // Continue with API fetch on cache error
        }
      }
      
      // Check if we should rate limit this API request (skip if forcing refresh)
      const lastRequestTime = PRODUCTS_API_REQUEST_TIMESTAMPS.get(emailToFetch);
      const now = Date.now();
      
      if (!shouldForceRefresh && lastRequestTime && (now - lastRequestTime < MIN_API_REQUEST_INTERVAL) && !isRefreshing) {
        console.log(`[ProfileScreen] Rate limiting products API request for ${emailToFetch}`);
        // Use cache even if expired, but mark for refresh
        if (productsCache.has(emailToFetch)) {
          const { data } = productsCache.get(emailToFetch);
          
          // Create a new map to store the relationship between Posts and Products
          const newProductsMap = new Map<number, Product>();
          
          // Convert API products to Post format
          const formattedPosts = data.map((product: Product) => {
            const post = convertProductToPost(product);
            // Store the original product data for future reference
            newProductsMap.set(post.id, product);
            return post;
          });
          
          setProducts(formattedPosts);
          setProductsMap(newProductsMap);
          setIsLoadingProducts(false);
          
          // Schedule a delayed refresh if not viewing a seller profile
          if (!isViewingSeller) {
            setTimeout(() => refreshProductsCacheInBackground(emailToFetch), MIN_API_REQUEST_INTERVAL);
          }
          return;
        }
      }
      
      // If cache miss or cache expired or explicitly refreshing, fetch from API
      console.log(`[ProfileScreen] Fetching products for user: ${emailToFetch}`);
      PRODUCTS_API_REQUEST_TIMESTAMPS.set(emailToFetch, now);
      
      const productData = await fetchUserProducts(emailToFetch);
      
      // Create a new map to store the relationship between Posts and Products
      const newProductsMap = new Map<number, Product>();
      
      // Convert API products to Post format
      const formattedPosts = productData.map((product: Product) => {
        const post = convertProductToPost(product);
        // Store the original product data for future reference
        newProductsMap.set(post.id, product);
        return post;
      });
      
      // Update state with new data
      setProducts(formattedPosts);
      setProductsMap(newProductsMap);
      
      // Save to both caches
      const cacheData = {
        data: productData,
        timestamp: now
      };
      
      // Update in-memory cache
      productsCache.set(emailToFetch, cacheData);
      
      // Run cache cleanup to prevent memory issues
      cleanupProductsCache();
      
      // Update AsyncStorage cache
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      
    } catch (error: any) {
      console.error('[ProfileScreen] Error fetching user products:', error.message || error);
      
      // If we have cached data, use it despite the error
      if (productsCache.has(emailToFetch)) {
        console.log('[ProfileScreen] Using cached products data after API error');
        const { data } = productsCache.get(emailToFetch);
        
        // Create a new map to store the relationship between Posts and Products
        const newProductsMap = new Map<number, Product>();
        
        // Convert API products to Post format
        const formattedPosts = data.map((product: Product) => {
          const post = convertProductToPost(product);
          // Store the original product data for future reference
          newProductsMap.set(post.id, product);
          return post;
        });
        
        setProducts(formattedPosts);
        setProductsMap(newProductsMap);
      } else {
        setProductsError('Network error while fetching products');
      }
    } finally {
      setIsLoadingProducts(false);
    }
  }, [sellerEmail, user?.email, isRefreshing, isViewingSeller, refreshCountRef]);
  
  // Fetch user data from backend API with caching
  const fetchUserData = useCallback(async () => {
    // Use sellerEmail from route params if available, otherwise use logged-in user email
    const emailToFetch = sellerEmail || user?.email;
    
    if (!emailToFetch) {
      setIsLoading(false);
      return;
    }
    
    setError(null);
    if (!isRefreshing) setIsLoading(true);
    
    // If this is the second or more refresh, log it and force refresh from API
    const shouldForceRefresh = isRefreshing && refreshCountRef.current >= 1;
    if (shouldForceRefresh) {
      console.log(`[ProfileScreen] Force refreshing user profile from API (refresh count: ${refreshCountRef.current + 1})`);
    }
    
    try {
      const cacheKey = `${USER_PROFILE_CACHE_KEY}${emailToFetch}`;
      
      // First, check the in-memory cache for the fastest access
      if (!shouldForceRefresh && !isRefreshing && profileCache.has(emailToFetch)) {
        const { data, timestamp } = profileCache.get(emailToFetch);
        const isExpired = Date.now() - timestamp > CACHE_EXPIRY_TIME;
        const isStale = Date.now() - timestamp > (CACHE_EXPIRY_TIME / 3);
        
        if (!isExpired) {
          console.log('[ProfileScreen] Using in-memory cached user profile data');
          setBackendUserData(data);
          setIsLoading(false);
          
          // If data is stale but not expired, trigger a background refresh
          if (isStale && !isViewingSeller) {
            console.log('[ProfileScreen] Data is stale, triggering background refresh');
            setTimeout(() => refreshCacheInBackground(emailToFetch), 100);
          }
          
          return;
        }
      }
      
      // Then try AsyncStorage if not refreshing and not forcing refresh
      if (!shouldForceRefresh && !isRefreshing) {
        try {
          const cachedData = await AsyncStorage.getItem(cacheKey);
          
          if (cachedData) {
            const { data, timestamp } = JSON.parse(cachedData);
            const isExpired = Date.now() - timestamp > CACHE_EXPIRY_TIME;
            const isStale = Date.now() - timestamp > (CACHE_EXPIRY_TIME / 3);
            
            if (!isExpired) {
              console.log('[ProfileScreen] Using AsyncStorage cached user profile data');
              // Update in-memory cache too
              profileCache.set(emailToFetch, { data, timestamp });
              setBackendUserData(data);
              setIsLoading(false);
              
              // If data is stale but not expired, trigger a background refresh
              if (isStale && !isViewingSeller) {
                console.log('[ProfileScreen] Data is stale, triggering background refresh');
                setTimeout(() => refreshCacheInBackground(emailToFetch), 100);
              }
              
              return;
            } else {
              console.log('[ProfileScreen] Cache expired, fetching fresh data');
            }
          }
        } catch (cacheError) {
          console.warn('[ProfileScreen] Error reading from cache:', cacheError);
          // Continue with API fetch on cache error
        }
      }
      
      // Check if we should rate limit this API request (skip if forcing refresh)
      const lastRequestTime = API_REQUEST_TIMESTAMPS.get(emailToFetch);
      const now = Date.now();
      
      if (!shouldForceRefresh && lastRequestTime && (now - lastRequestTime < MIN_API_REQUEST_INTERVAL) && !isRefreshing) {
        console.log(`[ProfileScreen] Rate limiting API request for ${emailToFetch}`);
        // Use cache even if expired, but mark for refresh
        if (profileCache.has(emailToFetch)) {
          const { data } = profileCache.get(emailToFetch);
          setBackendUserData(data);
          setIsLoading(false);
          // Schedule a delayed refresh if not viewing a seller profile
          if (!isViewingSeller) {
            setTimeout(() => refreshCacheInBackground(emailToFetch), MIN_API_REQUEST_INTERVAL);
          }
          return;
        }
      }
      
      // If cache miss or cache expired or explicitly refreshing, fetch from API
      console.log('[ProfileScreen] Fetching user profile from API');
      API_REQUEST_TIMESTAMPS.set(emailToFetch, now);
      
      const data = await fetchUserProfileById(emailToFetch);
      
      // Update state with new data
      setBackendUserData(data);
      
      // Save to both caches
      const cacheData = {
        data,
        timestamp: now
      };
      
      // Update in-memory cache
      profileCache.set(emailToFetch, cacheData);
      
      // Run cache cleanup to prevent memory issues
      cleanupCache();
      
      // Update AsyncStorage cache
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      
    } catch (error: any) {
      console.error('[ProfileScreen] Error fetching user data:', error.message || error);
      
      // If we have cached data, use it despite the error
      if (profileCache.has(emailToFetch)) {
        console.log('[ProfileScreen] Using cached data after API error');
        setBackendUserData(profileCache.get(emailToFetch).data);
      } else {
        setError('Network error while fetching profile data');
      }
    } finally {
      setIsLoading(false);
    }
  }, [sellerEmail, user?.email, isRefreshing, isViewingSeller, refreshCountRef]);
  
  // Load both user profile and products data
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      
      const loadData = async () => {
        if (isActive) {
          await Promise.all([
            fetchUserData(),
            fetchUserProductData()
          ]);
        }
      };
      
      loadData();
      
      return () => {
        isActive = false;
      };
    }, [fetchUserData, fetchUserProductData])
  );
  
  // Animated values with useMemo to avoid recreating on every render
  const scrollY = useMemo(() => new Animated.Value(0), []);
  const headerOpacity = useMemo(() => {
    return scrollY.interpolate({
      inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
      outputRange: [0, 0.5, 1],
      extrapolate: 'clamp'
    });
  }, [scrollY]);

  // Memoized filtered posts based on active tab
  const filteredPosts = useMemo(() => {
    switch (activeTab) {
      case 'inMarket':
        return products.filter(post => post.status === 'active');
      case 'archive':
        return products.filter(post => post.status === 'archived');
      default:
        return products;
    }
  }, [products, activeTab]);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(() => {
    // Increment the refresh counter
    refreshCountRef.current += 1;
    console.log(`[ProfileScreen] Refresh triggered (count: ${refreshCountRef.current})`);
    
    setIsRefreshing(true);
    
    // Refresh backend user data and products
    Promise.all([
      fetchUserData(), 
      fetchUserProductData()
    ]).finally(() => {
      setIsRefreshing(false);
      
      // Reset the refresh counter after a timeout (5 seconds)
      setTimeout(() => {
        if (refreshCountRef.current > 0) {
          console.log('[ProfileScreen] Resetting refresh counter');
          refreshCountRef.current = 0;
        }
      }, 5000);
    });
  }, [fetchUserData, fetchUserProductData]);

  // Tab change handler
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
  }, []);

  // Scroll handler - optimized with useNativeDriver for better performance
  const handleScroll = useMemo(() => Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  ), [scrollY]);

  // Render post grid item with proper spacing
  const renderItem = useCallback(({ item, index }: { item: Post, index: number }) => {
    const isEven = index % 2 === 0;
    return (
      <View style={[styles.postGridItem, isEven ? { paddingRight: 4 } : { paddingLeft: 4 }]}>
        <PostItem item={item} originalData={productsMap.get(item.id)} />
      </View>
    );
  }, [productsMap]);

  // Keyextractor for FlatList optimization
  const keyExtractor = useCallback((item: Post) => item.id.toString(), []);

  // FlatList performance optimization
  const getItemLayout = useCallback((_: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * Math.floor(index / 2),
    index,
  }), []);

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
            onPress={handleRefresh}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (filteredPosts.length === 0) {
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
                  onPress={handleAddListing}
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
  }, [activeTab, filteredPosts.length, isLoadingProducts, productsError, handleRefresh, isViewingSeller, handleAddListing]);
  
  // Memoized Footer component
  const ListFooterComponent = useMemo(() => {
    if (filteredPosts.length > 0) {
      return <View style={styles.listFooter} />;
    }
    return null;
  }, [filteredPosts.length]);

  // Add component unmount cleanup at the end of the ProfileScreen component
  useEffect(() => {
    // Component cleanup function
    return () => {
      // Remove this user's data from the request timestamp tracking when component unmounts
      if (user?.email) {
        API_REQUEST_TIMESTAMPS.delete(user?.email);
        PRODUCTS_API_REQUEST_TIMESTAMPS.delete(user?.email);
      }
    };
  }, [user?.email]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      {/* Animated Header */}
      <Animated.View 
        style={[
          styles.animatedHeader, 
          { 
            opacity: headerOpacity,
            transform: [{ 
              translateY: scrollY.interpolate({
                inputRange: [0, HEADER_SCROLL_DISTANCE],
                outputRange: [0, -HEADER_MIN_HEIGHT/4],
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
      
      {/* Using FlatList instead of ScrollView for better performance with large lists */}
      {!isLoading && !error && (
        <Animated.FlatList
          data={filteredPosts}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scrollContent}
          ListHeaderComponent={() => (
            <>
              {/* Profile Banner with background color #f7b305 */}
              <View style={styles.bannerContainer}>
                <View style={styles.bannerContent}>
                  <TouchableOpacity 
                    style={styles.backButton}
                    onPress={handleGoBack}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <MaterialIcons name="arrow-back" size={24} color="white" />
                  </TouchableOpacity>
                  
                  {!isViewingSeller && (
                    <TouchableOpacity 
                      style={styles.signOutButton}
                      onPress={handleSignOut}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <MaterialIcons name="logout" size={24} color="white" />
                    </TouchableOpacity>
                  )}
                  {isViewingSeller && (
                    <View style={styles.signOutButton} />
                  )}
                </View>
              </View>
              
              <ProfileHeader 
                userData={userData}
                backendUserData={backendUserData}
                filteredPosts={filteredPosts}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onEditProfile={handleEditProfile}
                isLoadingProducts={isLoadingProducts}
                isViewingSeller={isViewingSeller}
              />
            </>
          )}
          ListEmptyComponent={ListEmptyComponent}
          ListFooterComponent={ListFooterComponent}
          columnWrapperStyle={styles.columnWrapper}
          getItemLayout={getItemLayout}
          initialNumToRender={6}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#ffffff']}
              tintColor="#ffffff"
              progressBackgroundColor="#f7b305"
            />
          }
        />
      )}
      
      {/* Floating Add Button - only show when viewing own profile */}
      {!isViewingSeller && (
        <TouchableOpacity 
          style={styles.floatingButton}
          activeOpacity={0.9}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={handleAddListing}
        >
          <Ionicons name="add" size={30} color="#FFF" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    backgroundColor: '#000000',
    zIndex: 100,
    paddingTop: StatusBar.currentHeight || 0,
    paddingBottom: 8,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButtonHeader: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  headerAction: {
    padding: 8,
  },
  bannerContainer: {
    height: PROFILE_BANNER_HEIGHT,
    width: '100%',
    backgroundColor: '#f7b305', // Yellow background
  },
  bannerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 16 : 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(247, 179, 5, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signOutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(247, 179, 5, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
        elevation: 6,
      }
    }),
  },
  profileImageWrapper: {
    alignSelf: 'center',
    marginTop: -PROFILE_IMAGE_SIZE / 2,
    marginBottom: 16,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
      },
      android: {
        elevation: 8,
      }
    }),
  },
  profileImage: {
    width: PROFILE_IMAGE_SIZE,
    height: PROFILE_IMAGE_SIZE,
    borderRadius: PROFILE_IMAGE_SIZE / 2,
    borderWidth: 4,
    borderColor: '#fff',
  },
  profileImagePlaceholder: {
    width: PROFILE_IMAGE_SIZE,
    height: PROFILE_IMAGE_SIZE,
    borderRadius: PROFILE_IMAGE_SIZE / 2,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  profileInitial: {
    fontSize: 38,
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
        elevation: 2,
      }
    }),
  },
  profileDetailsContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  nameEditRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  profileName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'center',
    marginRight: 10,
  },
  editProfileButton: {
    backgroundColor: 'white',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1b74e4',
  },
  editButtonText: {
    fontSize: 12,
    color: '#1b74e4',
    fontWeight: '600',
  },
  userInfoRow: {
    width: '100%',
    marginVertical: 10,
  },
  userInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'center',
  },
  userInfoText: {
    fontSize: 15,
    color: '#555',
    marginLeft: 10,
    fontWeight: '400',
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    borderRadius: 14,
    padding: 18,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      }
    }),
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '400',
  },
  statDivider: {
    width: 1,
    height: '85%',
    backgroundColor: '#e0e0e0',
    alignSelf: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    padding: 4,
    marginHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: 'black',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      }
    }),
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#999',
  },
  activeTabText: {
    color: 'white',
    fontWeight: '600',
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
        elevation: 3,
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
  postPrice: {
    position: 'absolute',
    bottom: 10,
    right: 8,
    backgroundColor: '#e67e22',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    fontWeight: 'bold',
    color: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
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
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 8,
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
  errorMessage: {
    marginTop: 15,
    fontSize: 18,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#f7b305',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
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
  },
  emptyListButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  listFooter: {
    height: 30,
  },
  errorText: {
    marginTop: 10,
    fontSize: 18,
    color: '#e74c3c',
  },
});

export default React.memo(ProfileScreen); 