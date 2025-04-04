import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { 
  View, 
  TextInput, 
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/FontAwesome';
import EvilIcon from 'react-native-vector-icons/EvilIcons';
import Entypoicon from 'react-native-vector-icons/Entypo';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useNavigation, DrawerActions } from '@react-navigation/native';

// Import from contexts with new structure
import { useAuth } from '../../contexts';
import { useUniversity, useCity } from '../../navigation/MainNavigator';

// Import API methods
import { 
  getFeaturedProducts,
  getNewArrivals,
  Product as ApiProduct,
  ProductFilters,
  getProductsByUniversity,
  getProductsByCity
} from '../../api/products';

// Import user profile API
import { fetchUserProfileById } from '../../api/users';

// Import types
import { StackNavigationProp } from '@react-navigation/stack';
import { MainStackParamList } from '../../types/navigation.types';

// Define types for better type safety
interface Category {
  id: number;
  name: string;
  icon: 'electronics' | 'furniture' | 'auto' | 'fashion' | 'sports' | 'stationery' | 'eventpass';
}

// Using the API Product interface directly
type Product = ApiProduct;

type ProductSectionType = 'featured' | 'newArrivals' | 'bestSellers' | 'university' | 'city';

type NavigationProp = StackNavigationProp<MainStackParamList>;

interface HomescreenProps {
  navigation?: NavigationProp;
}

// Cache constants with longer expiry for products
const USER_PROFILE_CACHE_KEY = 'user_profile_cache_';
const PRODUCTS_CACHE_KEY = 'products_cache_';
const USER_CACHE_EXPIRY_TIME = 15 * 60 * 1000; // 15 minutes
const PRODUCTS_CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes

// Component to display section headers with potential actions
const SectionHeader: React.FC<{
  title: string;
  onSeeAll?: () => void;
}> = ({ title, onSeeAll }) => (
  <View style={styles.sectionHeaderContainer}>
    <Text style={[styles.sectionHeader, { color: '#333' }]}>{title}</Text>
    {onSeeAll && (
      <TouchableOpacity onPress={onSeeAll}>
        <Text style={styles.seeAllText}>See All</Text>
      </TouchableOpacity>
    )}
  </View>
);

// Component for rendering a category item
const CategoryItem: React.FC<{
  item: Category;
  onPress: (category: Category) => void;
}> = ({ item, onPress }) => {
  const renderIcon = () => {
    switch (item.icon) {
      case 'electronics':
        return <Entypoicon name="game-controller" size={28} color="black" />;
      case 'furniture':
        return <Icon name="bed" size={28} color="black" />;
      case 'auto':
        return <MaterialIcons name="directions-car" size={28} color="black" />;
      case 'fashion':
        return <FontAwesome name="shopping-bag" size={28} color="black" />;
      case 'sports':
        return <MaterialIcons name="sports-cricket" size={28} color="black" />;
      case 'stationery':
        return <MaterialIcons name="book" size={28} color="black" />;
      case 'eventpass':
        return <FontAwesome name="ticket" size={28} color="black" />;
      default:
        return <Icon name="question" size={28} color="black" />;
    }
  };

  return (
    <TouchableOpacity 
      style={styles.categoryItem}
      onPress={() => onPress(item)}
    >
      <View style={styles.categoryCircleWrapper}>
        <View style={[styles.categoryCircle, { backgroundColor: '#f7b305' }]}>
          {renderIcon()}
        </View>
      </View>
      <Text style={[styles.categoryText, { color: '#333' }]}>{item.name}</Text>
    </TouchableOpacity>
  );
};

// Component for rendering a product item
const ProductItem: React.FC<{
  item: Product;
  wishlist: string[];
  onToggleWishlist: (id: string) => void;
  onPress: (product: Product) => void;
}> = ({ item, wishlist, onToggleWishlist, onPress }) => {
  // Get the appropriate image URL - primaryImage, first image from images array, or placeholder
  const imageUrl = item.primaryImage || 
                  (item.images && item.images.length > 0 ? item.images[0] : 
                  'https://via.placeholder.com/150');

  // Format price display
  const formattedPrice = `$${item.price}`;
  
  return (
    <TouchableOpacity 
      style={[styles.productCard, { backgroundColor: 'white' }]}
      onPress={() => onPress(item)}
    >
      <Image 
        source={{ uri: imageUrl }} 
        style={styles.productImagePlaceholder}
        resizeMode="cover"
      />
      <View style={[styles.productInfo, { backgroundColor: 'white' }]}>
        <Text style={[styles.productName, { color: '#333' }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.productPrice, { color: 'black' }]}>{formattedPrice}</Text>
        {item.productage && (
          <Text style={styles.productCondition}>
            {item.productage.replace(/-/g, ' ')}
          </Text>
        )}
        <TouchableOpacity 
          style={styles.wishlistButton} 
          onPress={() => onToggleWishlist(item.id)}
        >
          <FontAwesome 
            name={wishlist.includes(item.id) ? "heart" : "heart-o"}
            size={20} 
            color="red" 
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// Product section component for reusability
const ProductSection: React.FC<{
  title: string;
  data: Product[];
  wishlist: string[];
  onToggleWishlist: (id: string) => void;
  onProductPress: (product: Product) => void;
  onSeeAll?: () => void;
  isLoading?: boolean;
}> = ({ 
  title, 
  data, 
  wishlist, 
  onToggleWishlist, 
  onProductPress,
  onSeeAll,
  isLoading = false
}) => (
  <View>
    <SectionHeader title={title} onSeeAll={onSeeAll} />
    {isLoading ? (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#f7b305" />
      </View>
    ) : data.length === 0 ? (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No products available</Text>
      </View>
    ) : (
      <FlatList
        data={data}
        renderItem={({ item }) => (
          <ProductItem 
            item={item} 
            wishlist={wishlist} 
            onToggleWishlist={onToggleWishlist} 
            onPress={onProductPress}
          />
        )}
        keyExtractor={item => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.productScrollView}
        contentContainerStyle={styles.productListContainer}
      />
    )}
  </View>
);

// Define sort options
type SortOption = {
  id: string;
  label: string;
};

// Define filter options type
type FilterOption = {
  id: string;
  label: string;
};

// Add a component for a more professional dropdown
const EnhancedDropdown: React.FC<{
  items: { id: string; label: string }[];
  selectedItems: string[];
  onSelect: (id: string) => void;
  multiSelect?: boolean;
  title: string;
  onClose?: () => void;
}> = ({ items, selectedItems, onSelect, multiSelect = false, title, onClose }) => {
  return (
    <View style={styles.enhancedDropdown}>
      <View style={styles.enhancedDropdownHeader}>
        <Text style={styles.enhancedDropdownTitle}>{title}</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>
      <ScrollView style={styles.enhancedDropdownContent}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.enhancedDropdownItem,
              selectedItems.includes(item.id) && styles.enhancedDropdownItemSelected
            ]}
            onPress={() => onSelect(item.id)}
            activeOpacity={0.7}
          >
            <Text 
              style={[
                styles.enhancedDropdownItemText,
                selectedItems.includes(item.id) && styles.enhancedDropdownItemTextSelected
              ]}
            >
              {item.label}
            </Text>
            {selectedItems.includes(item.id) && (
              <View style={styles.checkIconContainer}>
                <MaterialIcons name={multiSelect ? "check-box" : "check-circle"} size={20} color="#f7b305" />
              </View>
            )}
            {multiSelect && !selectedItems.includes(item.id) && (
              <View style={styles.checkIconContainer}>
                <MaterialIcons name="check-box-outline-blank" size={20} color="#ccc" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const HomeScreen: React.FC<HomescreenProps> = ({ navigation: propNavigation }) => {
  const navigation = useNavigation<NavigationProp>();
  const nav = propNavigation || navigation;
  const { user } = useAuth();
  const { setUserUniversity } = useUniversity();
  const { setUserCity } = useCity();
  
  // User profile data state
  const [userProfileData, setUserProfileData] = useState<any>(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState<boolean>(false);
  const [userDataError, setUserDataError] = useState<string | null>(null);
  
  // Cache the University and City values for API calls
  const userUniversity = useMemo(() => {
    const university = userProfileData?.university || user?.university || '';
    console.log(`[HomeScreen] userUniversity updated:`, {
      fromProfile: userProfileData?.university || 'none',
      fromUser: user?.university || 'none',
      finalValue: university
    });
    return university;
  }, [userProfileData, user?.university]);
  
  const userCity = useMemo(() => userProfileData?.city || user?.city || '', [userProfileData, user]);
  
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Products state
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [newArrivalsProducts, setNewArrivalsProducts] = useState<Product[]>([]);
  const [universityProducts, setUniversityProducts] = useState<Product[]>([]);
  const [cityProducts, setCityProducts] = useState<Product[]>([]);
  
  // Original products state (for filtering and sorting)
  const [_featuredProductsOriginal, setFeaturedProductsOriginal] = useState<Product[]>([]);
  const [_newArrivalsProductsOriginal, setNewArrivalsProductsOriginal] = useState<Product[]>([]);
  const [_universityProductsOriginal, setUniversityProductsOriginal] = useState<Product[]>([]);
  const [_cityProductsOriginal, setCityProductsOriginal] = useState<Product[]>([]);
  
  // Loading states
  const [loadingFeatured, setLoadingFeatured] = useState(false);
  const [loadingNewArrivals, setLoadingNewArrivals] = useState(false);
  const [loadingUniversity, setLoadingUniversity] = useState(false);
  const [loadingCity, setLoadingCity] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Sort states
  const [selectedSort, setSelectedSort] = useState<string>('default');
  // Add filter states
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  
  // Category data with icon identifiers for type safety
  const categories = useMemo<Category[]>(() => [
    { id: 1, name: 'Electronics', icon: 'electronics' },
    { id: 2, name: 'Furniture', icon: 'furniture' },
    { id: 3, name: 'Auto', icon: 'auto' },
    { id: 4, name: 'Fashion', icon: 'fashion' },
    { id: 5, name: 'Sports', icon: 'sports' },
    { id: 6, name: 'Stationery', icon: 'stationery' },
    { id: 7, name: 'EventPass', icon: 'eventpass' },
  ], []);

  // Define sort options
  const sortOptions = useMemo<SortOption[]>(() => [
    { id: 'default', label: 'Default' },
    { id: 'price_low_to_high', label: 'Price: Low to High' },
    { id: 'price_high_to_low', label: 'Price: High to Low' },
    { id: 'newest', label: 'Newest First' },
    { id: 'popularity', label: 'Popularity' },
  ], []);
  
  // Define filter options with updated values matching backend values
  const filterOptions = useMemo<FilterOption[]>(() => [
    { id: 'brand-new', label: 'Brand New' },
    { id: 'like-new', label: 'Like New' },
    { id: 'very-good', label: 'Very Good' },
    { id: 'good', label: 'Good' },
    { id: 'acceptable', label: 'Acceptable' },
    { id: 'for-parts', label: 'For Parts' },
    { id: 'rent', label: 'For Rent' },
    { id: 'sell', label: 'For Sale' },
    { id: 'free', label: 'Free Items' },
  ], []);

  // Function to load products for university (wrapped in useCallback)
  const loadUniversityProducts = useCallback(async () => {
    if (!userUniversity) {
      console.log('[HomeScreen] Skipping university products - no university set');
      return;
    }
    
    console.log(`[HomeScreen] Loading university products for: ${userUniversity}`);
    setLoadingUniversity(true);
    setError(null);
    
    try {
      // Check cache first
      const cacheKey = `${PRODUCTS_CACHE_KEY}university_${userUniversity}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (cachedData) {
        try {
          const { data, timestamp } = JSON.parse(cachedData);
          const isExpired = Date.now() - timestamp > PRODUCTS_CACHE_EXPIRY_TIME;
          
          if (!isExpired) {
            console.log('[HomeScreen] Using cached university products');
            setUniversityProducts(data);
            setUniversityProductsOriginal(data);
            setLoadingUniversity(false);
            return;
          }
        } catch (cacheError) {
          console.warn('[HomeScreen] Error parsing cache:', cacheError);
          // Continue with API call if cache parsing fails
        }
      }
      
      // Adjusted filters to match backend expected parameters
      const filters: ProductFilters = {
        sortBy: 'newest',
        page: 1, // Will be converted to 0-indexed in the API layer
        size: 20
      };
      
      console.log(`[HomeScreen] University products API call starting with filters:`, JSON.stringify(filters));
      
      // Try to get university products
      try {
        console.log(`[HomeScreen] Calling getProductsByUniversity for: ${userUniversity}`);
        const result = await getProductsByUniversity(userUniversity, filters);
        console.log(`[HomeScreen] University API call success, result:`, 
          result?.products ? `${result.products.length} products found` : 'No products in response');
        
        if (result && Array.isArray(result.products)) {
          setUniversityProducts(result.products);
          setUniversityProductsOriginal(result.products);
          console.log(`[HomeScreen] University products state updated with ${result.products.length} items`);
          
          // Save to cache
          const cacheData = {
            data: result.products,
            timestamp: Date.now()
          };
          await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
        } else {
          console.warn('[HomeScreen] Unexpected response format from university products API. Result:', 
            typeof result === 'object' ? JSON.stringify(result) : typeof result);
          setUniversityProducts([]);
          setUniversityProductsOriginal([]);
        }
      } catch (error: any) {
        console.warn(`[HomeScreen] API error when loading university products:`, 
          error.message || 'Unknown error');
        console.warn(`[HomeScreen] Error stack:`, error.stack || 'No stack trace');
        
        // Fallback to an empty array to avoid UI crashes
        setUniversityProducts([]);
        setUniversityProductsOriginal([]);
      }
    } catch (err: any) {
      console.error('[HomeScreen] Error loading university products:', err);
      setError('Failed to load university products');
      setUniversityProducts([]);
      setUniversityProductsOriginal([]);
    } finally {
      console.log(`[HomeScreen] University products loading complete`);
      setLoadingUniversity(false);
    }
  }, [userUniversity]);

  // Function to load products for city (wrapped in useCallback)
  const loadCityProducts = useCallback(async () => {
    if (!userCity) {
      console.log('[HomeScreen] Skipping city products - no city set');
      return;
    }
    
    console.log(`[HomeScreen] Loading city products for: ${userCity}`);
    setLoadingCity(true);
    setError(null);
    
    try {
      // Check cache first
      const cacheKey = `${PRODUCTS_CACHE_KEY}city_${userCity}_${userUniversity || 'no_univ'}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (cachedData) {
        try {
          const { data, timestamp } = JSON.parse(cachedData);
          const isExpired = Date.now() - timestamp > PRODUCTS_CACHE_EXPIRY_TIME;
          
          if (!isExpired) {
            console.log('[HomeScreen] Using cached city products');
            setCityProducts(data);
            setCityProductsOriginal(data);
            setLoadingCity(false);
            return;
          }
        } catch (cacheError) {
          console.warn('[HomeScreen] Error parsing cache:', cacheError);
          // Continue with API call if cache parsing fails
        }
      }
      
      // Adjusted filters to match backend expected parameters
      const filters: ProductFilters = {
        sortBy: 'newest',
        page: 1, // Will be converted to 0-indexed in the API layer
        size: 20
      };
      
      // Explicitly include university if we have it
      if (userUniversity) {
        filters.university = userUniversity;
        console.log(`[HomeScreen] Including university filter: ${userUniversity}`);
      }
      
      console.log(`[HomeScreen] City products API call starting with filters:`, JSON.stringify(filters));
      
      // Try to get city products
      try {
        console.log(`[HomeScreen] Calling getProductsByCity for: ${userCity}`);
        const result = await getProductsByCity(userCity, filters);
        console.log(`[HomeScreen] City API call success, result:`, 
          result?.products ? `${result.products.length} products found` : 'No products in response');
        
        if (result && Array.isArray(result.products)) {
          setCityProducts(result.products);
          setCityProductsOriginal(result.products);
          console.log(`[HomeScreen] City products state updated with ${result.products.length} items`);
          
          // Save to cache
          const cacheData = {
            data: result.products,
            timestamp: Date.now()
          };
          await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
        } else {
          console.warn('[HomeScreen] Unexpected response format from city products API. Result:', 
            typeof result === 'object' ? JSON.stringify(result) : typeof result);
          setCityProducts([]);
          setCityProductsOriginal([]);
        }
      } catch (error: any) {
        console.warn(`[HomeScreen] API error when loading city products:`, 
          error.message || 'Unknown error');
        console.warn(`[HomeScreen] Error stack:`, error.stack || 'No stack trace');
        // Fallback to an empty array to avoid UI crashes
        setCityProducts([]);
        setCityProductsOriginal([]);
      }
    } catch (err: any) {
      console.error('[HomeScreen] Error loading city products:', err);
      setError('Failed to load city products');
      setCityProducts([]);
      setCityProductsOriginal([]);
    } finally {
      console.log(`[HomeScreen] City products loading complete`);
      setLoadingCity(false);
    }
  }, [userCity, userUniversity]);

  // Function to load featured products (wrapped in useCallback)
  const loadFeaturedProducts = useCallback(async () => {
    if (!userUniversity || !userCity) return;
    
    setLoadingFeatured(true);
    setError(null);
    
    try {
      // Check cache first
      const cacheKey = `${PRODUCTS_CACHE_KEY}featured_${userUniversity}_${userCity}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (cachedData) {
        try {
          const { data, timestamp } = JSON.parse(cachedData);
          const isExpired = Date.now() - timestamp > PRODUCTS_CACHE_EXPIRY_TIME;
          
          if (!isExpired) {
            console.log('[HomeScreen] Using cached featured products');
            setFeaturedProducts(data);
            setFeaturedProductsOriginal(data);
            setLoadingFeatured(false);
            return;
          }
        } catch (cacheError) {
          console.warn('[HomeScreen] Error parsing cache:', cacheError);
          // Continue with API call if cache parsing fails
        }
      }
      
      const products = await getFeaturedProducts(userUniversity, userCity);
      setFeaturedProducts(products);
      setFeaturedProductsOriginal(products);
      
      // Save to cache
      const cacheData = {
        data: products,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (err) {
      console.error('Error loading featured products:', err);
      setError('Failed to load featured products');
    } finally {
      setLoadingFeatured(false);
    }
  }, [userUniversity, userCity]);

  // Function to load new arrivals (wrapped in useCallback)
  const loadNewArrivals = useCallback(async () => {
    if (!userUniversity) return;
    
    setLoadingNewArrivals(true);
    setError(null);
    
    try {
      // Check cache first
      const cacheKey = `${PRODUCTS_CACHE_KEY}newArrivals_${userUniversity}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (cachedData) {
        try {
          const { data, timestamp } = JSON.parse(cachedData);
          const isExpired = Date.now() - timestamp > PRODUCTS_CACHE_EXPIRY_TIME;
          
          if (!isExpired) {
            console.log('[HomeScreen] Using cached new arrivals');
            setNewArrivalsProducts(data);
            setNewArrivalsProductsOriginal(data);
            setLoadingNewArrivals(false);
            return;
          }
        } catch (cacheError) {
          console.warn('[HomeScreen] Error parsing cache:', cacheError);
          // Continue with API call if cache parsing fails
        }
      }
      
      const products = await getNewArrivals(userUniversity);
      setNewArrivalsProducts(products);
      setNewArrivalsProductsOriginal(products);
      
      // Save to cache
      const cacheData = {
        data: products,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (err) {
      console.error('Error loading new arrivals:', err);
      setError('Failed to load new arrivals');
    } finally {
      setLoadingNewArrivals(false);
    }
  }, [userUniversity]);

  // User profile fetching with cache
  const fetchUserProfile = useCallback(async () => {
    if (!user?.email) {
      console.log('[HomeScreen] fetchUserProfile: No user email available');
            return;
    }
    
    console.log(`[HomeScreen] fetchUserProfile: Starting fetch for user: ${user.email}, current university: ${user?.university || 'none'}, current city: ${user?.city || 'none'}`);
    setIsLoadingUserData(true);
    setUserDataError(null);
    
    try {
      // Check if we have cached data
      const cacheKey = `${USER_PROFILE_CACHE_KEY}${user.email}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        const isExpired = Date.now() - timestamp > USER_CACHE_EXPIRY_TIME;
        
        console.log(`[HomeScreen] Found cached profile data, expired: ${isExpired}`);
        console.log(`[HomeScreen] Cached university: ${data?.university || 'none'}, cached city: ${data?.city || 'none'}`);
        
        if (!isExpired) {
          console.log('[HomeScreen] Using cached user profile data');
          setUserProfileData(data);
          
          // Update university in context if available
          if (data?.university) {
            console.log(`[HomeScreen] Updating UniversityContext with: ${data.university}`);
            setUserUniversity(data.university);
          }
          
          // Update city in context if available
          if (data?.city) {
            console.log(`[HomeScreen] Updating CityContext with: ${data.city}`);
            setUserCity(data.city);
          }
          
          setIsLoadingUserData(false);
          return;
        }
      } else {
        console.log('[HomeScreen] No cached profile data found');
      }
      
      // If no cache or expired, fetch from API
      console.log('[HomeScreen] Fetching user profile from API');
      const data = await fetchUserProfileById(user.email);
      
      console.log(`[HomeScreen] API response for user profile, university: ${data?.university || 'none'}, city: ${data?.city || 'none'}`);
      
      // Update state
      setUserProfileData(data);
      
      // Update university in context if available from API response
      if (data?.university) {
        console.log(`[HomeScreen] Updating UniversityContext with: ${data.university}`);
        setUserUniversity(data.university);
      }
      
      // Update city in context if available from API response
      if (data?.city) {
        console.log(`[HomeScreen] Updating CityContext with: ${data.city}`);
        setUserCity(data.city);
      }
      
      // Save to cache
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      
    } catch (error: any) {
      console.error('[HomeScreen] Error fetching user profile:', error.message || error);
      setUserDataError('Failed to fetch user profile data');
    } finally {
      setIsLoadingUserData(false);
    }
  }, [user?.email, user?.university, user?.city, setUserUniversity, setUserCity]);

  // Intelligent parallel loading for refresh
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    
    // Refresh user profile data first
    fetchUserProfile()
      .then(() => {
        // Then load all data in parallel with a limit of 2 concurrent requests
        const loadQueue = [];
        
        // Queue essential data first
        if (userUniversity) {
          loadQueue.push(() => loadNewArrivals().catch(err => console.warn('Error refreshing new arrivals:', err)));
        }
        
        // Add university products with error handling
        if (userUniversity) {
          loadQueue.push(() => loadUniversityProducts().catch(err => console.warn('Error refreshing university products:', err)));
        }
        
        // Add city products with error handling
        if (userCity) {
          loadQueue.push(() => loadCityProducts().catch(err => console.warn('Error refreshing city products:', err)));
        }
        
        // Add featured products with error handling
        if (userUniversity && userCity) {
          loadQueue.push(() => loadFeaturedProducts().catch(err => console.warn('Error refreshing featured products:', err)));
        }
        
        // Execute queue with concurrency limit
        return executeWithConcurrencyLimit(loadQueue, 2);
      })
      .catch(err => {
        console.error('Error refreshing data:', err);
        Alert.alert('Error', 'Failed to refresh some data');
      })
      .finally(() => {
        setIsRefreshing(false);
      });
  }, [
    loadFeaturedProducts, 
    loadNewArrivals, 
    fetchUserProfile, 
    loadUniversityProducts, 
    loadCityProducts, 
    userUniversity, 
    userCity
  ]);

  // Helper function to execute promises with concurrency limit
  const executeWithConcurrencyLimit = async (tasks: Array<() => Promise<any>>, limit: number) => {
    // Clone the tasks array to avoid modifying the original
    const queue = [...tasks];
    const executing: Promise<any>[] = [];
    const results: any[] = [];
    
    while (queue.length > 0 || executing.length > 0) {
      // Fill executing array up to the limit
      while (queue.length > 0 && executing.length < limit) {
        const task = queue.shift()!;
        const p = task().then(result => {
          results.push(result);
          executing.splice(executing.indexOf(p), 1);
        });
        executing.push(p);
      }
      
      // Wait for one of the executing promises to finish
      if (executing.length > 0) {
        await Promise.race(executing);
      }
    }
    
    return results;
  };

  // Get the first letter of the user's name for the profile circle
  const getInitial = useCallback(() => {
    if (!user) return 'U';
    
    if (user.name) {
      return user.name.charAt(0).toUpperCase();
    }
    if (user.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return 'U'; // Default if no name is available
  }, [user]);

  const toggleWishlist = useCallback((id: string) => {
    setWishlist(prevWishlist => 
      prevWishlist.includes(id) 
        ? prevWishlist.filter(itemId => itemId !== id)
        : [...prevWishlist, id]
    );
  }, []);

  const handleProductPress = useCallback((product: Product) => {
    // Ensure the product has the right type structure for the navigation
    // and pass the product ID as a separate parameter for easier access
    nav.navigate('ProductInfoPage', { 
      product: {
        ...product,
        id: product.id, // Ensure id is treated as expected by the screen
        // Make sure seller information is included
        sellerName: product.sellerName || product.seller?.name,
        seller: product.seller || {
          id: product.email || 'unknown',
          name: product.sellerName || 'Unknown Seller'
        }
      },
      productId: product.id.toString() // Explicitly pass the product ID as string for API lookup
    });
  }, [nav]);

  const handleCategoryPress = useCallback((category: Category) => {
    // Navigate to the category products screen
    nav.navigate('CategoryProducts', {
      categoryId: category.id,
      categoryName: category.name
    });
    console.log(`Category selected: ${category.name}`);
  }, [nav]);

  const handleSearch = useCallback(() => {
    // Implement search functionality here
    console.log(`Searching for: ${searchQuery}`);
  }, [searchQuery]);

  const handleSeeAll = useCallback((section: ProductSectionType) => {
    // Navigate to the CategoryProducts screen with appropriate parameters
    if (section === 'featured') {
      nav.navigate('CategoryProducts', {
        categoryId: 0, // Using 0 for non-category specific sections
        categoryName: 'Featured Products',
        userUniversity: userUniversity,
        userCity: userCity
      });
    } else if (section === 'newArrivals') {
      nav.navigate('CategoryProducts', {
        categoryId: 0,
        categoryName: 'New Arrivals',
        userUniversity: userUniversity
      });
    } else if (section === 'university') {
      nav.navigate('CategoryProducts', {
        categoryId: 0,
        categoryName: `${userUniversity} Products`,
        userUniversity: userUniversity
      });
    } else if (section === 'city') {
      nav.navigate('CategoryProducts', {
        categoryId: 0,
        categoryName: `${userCity} Products`,
        userUniversity: userUniversity,
        userCity: userCity
      });
    }
  }, [userUniversity, userCity, nav]);

  // Handle sort option selection
  const handleSortOptionSelect = useCallback((optionId: string) => {
    console.log(`[HomeScreen] Sort option selected: ${optionId}`);
    setSelectedSort(optionId);
    
    // Apply sorting to all product sections
    const applySorting = (products: Product[]): Product[] => {
      const productsCopy = [...products];
      
      switch (optionId) {
        case 'price_low_to_high':
          return productsCopy.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        case 'price_high_to_low':
          return productsCopy.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
        case 'newest':
          return productsCopy.sort((a, b) => {
            const dateA = a.postingdate ? new Date(a.postingdate).getTime() : 0;
            const dateB = b.postingdate ? new Date(b.postingdate).getTime() : 0;
            return dateB - dateA;
          });
        case 'popularity':
          // Sort by ID as a proxy for popularity (assuming newer IDs are more popular)
          return productsCopy.sort((a, b) => parseInt(b.id) - parseInt(a.id));
        case 'default':
        default:
          // Return original order
          return products;
      }
    };
    
    // Apply sorting to all product categories
    setFeaturedProducts(applySorting([..._featuredProductsOriginal]));
    setNewArrivalsProducts(applySorting([..._newArrivalsProductsOriginal]));
    setUniversityProducts(applySorting([..._universityProductsOriginal]));
    setCityProducts(applySorting([..._cityProductsOriginal]));
  }, [_featuredProductsOriginal, _newArrivalsProductsOriginal, _universityProductsOriginal, _cityProductsOriginal]);

  // Handle filter option selection
  const handleFilterOptionSelect = useCallback((optionId: string) => {
    console.log(`[HomeScreen] Filter option toggled: ${optionId}`);
    
      // Toggle the filter on/off
    setSelectedFilters(prevFilters => {
      const newFilters = prevFilters.includes(optionId)
        ? prevFilters.filter(id => id !== optionId)
        : [...prevFilters, optionId];
        
      console.log(`[HomeScreen] Updated filters:`, newFilters);
      return newFilters;
    });
    
    // We need to implement filtering in a separate effect to make sure
    // we have the latest state of selectedFilters
  }, []);

  // Use an effect to apply filters whenever selectedFilters changes
  useEffect(() => {
    console.log(`[HomeScreen] Filter effect triggered, filters:`, selectedFilters);
    
    // When no filters are active, restore original products
    if (selectedFilters.length === 0) {
      console.log(`[HomeScreen] No filters active, restoring original products`);
      setFeaturedProducts([..._featuredProductsOriginal]);
      setNewArrivalsProducts([..._newArrivalsProductsOriginal]);
      setUniversityProducts([..._universityProductsOriginal]);
      setCityProducts([..._cityProductsOriginal]);
      return;
    }
    
    console.log(`[HomeScreen] Applying filters:`, selectedFilters);
    
    // Apply filtering to all product sections
    const applyFilters = (originalProducts: Product[]): Product[] => {
      // If no filters active, return all products
      if (selectedFilters.length === 0) {
        return originalProducts;
      }
      
      // Create sets of condition and selling type filters for easier checking
      const conditionFilters = selectedFilters.filter(filter => 
        ['brand-new', 'like-new', 'very-good', 'good', 'acceptable', 'for-parts'].includes(filter)
      );
      
      const sellingTypeFilters = selectedFilters.filter(filter => 
        ['rent', 'sell', 'free'].includes(filter)
      );
      
      return originalProducts.filter(product => {
        // Log the product data to inspect what we're filtering
        console.log(`[HomeScreen] Checking product:`, {
          id: product.id,
          productage: product.productage,
          sellingtype: product.sellingtype,
          price: product.price
        });
        
        // Check if we need to filter by condition
        if (conditionFilters.length > 0) {
          // If this product doesn't match any of our selected condition filters, filter it out
          const productCondition = product.productage || '';
          const passesConditionFilter = conditionFilters.includes(productCondition);
          
          if (!passesConditionFilter) {
            console.log(`[HomeScreen] Product ${product.id} filtered out by condition`);
            return false;
          }
        }
        
        // Check if we need to filter by selling type
        if (sellingTypeFilters.length > 0) {
          const productSellingType = product.sellingtype || '';
          const isFree = parseFloat(product.price) === 0;
          
          // Special case for free items
          if (sellingTypeFilters.includes('free') && isFree) {
            return true; // Keep free items when "free" filter is active
          }
          
          // Check for rent/sell filters
          if (sellingTypeFilters.includes('rent') && productSellingType === 'rent') {
            return true;
          }
          
          if (sellingTypeFilters.includes('sell') && productSellingType === 'sell') {
            return true;
          }
          
          // If we have selling type filters but this product doesn't match any, filter it out
          if (!sellingTypeFilters.includes('free') || !isFree) {
            console.log(`[HomeScreen] Product ${product.id} filtered out by selling type`);
            return false;
          }
        }
        
        // If we get here, the product passed all active filters
        return true;
      });
    };
    
    // Apply filters with a small delay to allow for state updates
    const filtersTimeoutId = setTimeout(() => {
      console.log(`[HomeScreen] Applying filters to product lists`);
      
      // Log the original products state to make sure we have data
      console.log(`[HomeScreen] Original products counts:`, {
        featured: _featuredProductsOriginal.length,
        newArrivals: _newArrivalsProductsOriginal.length,
        university: _universityProductsOriginal.length,
        city: _cityProductsOriginal.length
      });
      
      // Apply filters to each product list
      const filteredFeatured = applyFilters(_featuredProductsOriginal);
      const filteredNewArrivals = applyFilters(_newArrivalsProductsOriginal);
      const filteredUniversity = applyFilters(_universityProductsOriginal);
      const filteredCity = applyFilters(_cityProductsOriginal);
      
      // Log the filtered results
      console.log(`[HomeScreen] Filtered products counts:`, {
        featured: filteredFeatured.length,
        newArrivals: filteredNewArrivals.length,
        university: filteredUniversity.length,
        city: filteredCity.length
      });
      
      // Update the state with filtered results
      setFeaturedProducts(filteredFeatured);
      setNewArrivalsProducts(filteredNewArrivals);
      setUniversityProducts(filteredUniversity);
      setCityProducts(filteredCity);
    }, 100);
    
    // Cleanup function to clear the timeout if the component unmounts
    return () => clearTimeout(filtersTimeoutId);
  }, [
    selectedFilters, 
    _featuredProductsOriginal, 
    _newArrivalsProductsOriginal, 
    _universityProductsOriginal, 
    _cityProductsOriginal
  ]);

  // Replace modal states with dropdown visibility states 
  const [sortDropdownVisible, setSortDropdownVisible] = useState(false);
  const [filterDropdownVisible, setFilterDropdownVisible] = useState(false);

  // Update button click handlers
  const handleSortButtonClick = useCallback(() => {
    setSortDropdownVisible(!sortDropdownVisible);
    if (filterDropdownVisible) setFilterDropdownVisible(false);
  }, [sortDropdownVisible, filterDropdownVisible]);

  const handleFilterButtonClick = useCallback(() => {
    setFilterDropdownVisible(!filterDropdownVisible);
    if (sortDropdownVisible) setSortDropdownVisible(false);
  }, [filterDropdownVisible, sortDropdownVisible]);

  // Effect to load featured products
  useEffect(() => {
    if (userUniversity && userCity) {
      loadFeaturedProducts();
    }
  }, [userUniversity, userCity, loadFeaturedProducts]);

  // Effect to load new arrivals
  useEffect(() => {
    if (userUniversity) {
      loadNewArrivals();
    }
  }, [userUniversity, loadNewArrivals]);
  
  // Effect to load university products
  useEffect(() => {
    if (userUniversity) {
      loadUniversityProducts();
    }
  }, [userUniversity, loadUniversityProducts]);
  
  // Effect to load city products
  useEffect(() => {
    if (userCity) {
      loadCityProducts();
    }
  }, [userCity, loadCityProducts]);

  // Load user profile on mount
  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: 'white' }]}>
      <View style={styles.container}>
        {/* Top navigation bar with menu and profile */}
        <View style={styles.topBar}>
          <TouchableOpacity 
            style={styles.menuButton} 
            onPress={() => {
              try {
                nav.dispatch(DrawerActions.openDrawer());
              } catch (error) {
                console.warn('Failed to open drawer:', error);
              }
            }}
            testID="menu-button"
            accessibilityLabel="Open menu"
          >
            <MaterialIcons name="menu" size={22} color="#333" />
          </TouchableOpacity>
          
          <Text style={[styles.truStudSelText, { color: '#efae1a' }]}>TruStudSel</Text>
          
          <View style={styles.topBarRight}>
            {isLoadingUserData && <ActivityIndicator size="small" color="#f7b305" style={{marginRight: 10}} />}
            {userDataError && <TouchableOpacity onPress={fetchUserProfile}>
              <MaterialIcons name="refresh" size={20} color="#e74c3c" style={{marginRight: 10}} />
            </TouchableOpacity>}
            <TouchableOpacity 
              style={styles.profileButton}
              onPress={() => {
                nav.navigate('Profile', {});
              }}
              testID="profile-button"
            >
              <View style={[styles.profileCircle, { backgroundColor: '#e0e0e0' }]}>
                <Text style={[styles.profileText, { color: '#333' }]}>{getInitial()}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Search Bar */}
        <View style={[styles.searchBox, { backgroundColor: 'white', borderColor: 'gray' }]}>
          <EvilIcon name="search" size={20} color="black" />
          <TextInput 
            placeholder="Search..." 
            style={[styles.input, { color: 'black' }]}
            placeholderTextColor="gray"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>
        
        {/* Row with text and buttons */}
        <View style={styles.rowContainer}>
          <Text style={[styles.plainText, { color: 'black' }]}>
            All Items
          </Text>
          <View style={styles.buttonContainer}>
            <View style={{ position: 'relative' }}>
              <TouchableOpacity 
                style={[
                  styles.smallButton, 
                  styles.sortButton, 
                  { backgroundColor: '#f7b305', borderColor: '#ddd' },
                  selectedSort !== 'default' && styles.activeFilterButton
                ]}
                onPress={handleSortButtonClick}
                activeOpacity={0.7}
              >
                <Text style={[styles.buttonText, { color: 'black' }]}>
                  {selectedSort !== 'default' ? ` Sort: ${sortOptions.find(o => o.id === selectedSort)?.label || 'Custom'}` : ' Sort'}
                </Text>
                <Icon name="sort" size={14} color="black" />
              </TouchableOpacity>
              
              {/* Enhanced Sort Dropdown */}
              {sortDropdownVisible && (
                <View style={styles.dropdownContainer}>
                  <EnhancedDropdown
                    items={sortOptions}
                    selectedItems={[selectedSort]}
                    onSelect={(id) => {
                      handleSortOptionSelect(id);
                      setSortDropdownVisible(false);
                    }}
                    title="Sort by"
                    onClose={() => setSortDropdownVisible(false)}
                  />
                </View>
              )}
            </View>
            
            <View style={{ position: 'relative' }}>
              <TouchableOpacity 
                style={[
                  styles.smallButton, 
                  styles.filterButton, 
                  { backgroundColor: '#f7b305', borderColor: '#ddd' },
                  selectedFilters.length > 0 && styles.activeFilterButton
                ]}
                onPress={handleFilterButtonClick}
                activeOpacity={0.7}
              >
                <Text style={[styles.buttonText, { color: 'black' }]}>
                  {selectedFilters.length > 0 ? ` Filter (${selectedFilters.length})` : ' Filter'}
                </Text>
                <Icon name="filter" size={14} color="black" />
              </TouchableOpacity>
              
              {/* Enhanced Filter Dropdown */}
              {filterDropdownVisible && (
                <View style={styles.dropdownContainer}>
                  <EnhancedDropdown
                    items={filterOptions}
                    selectedItems={selectedFilters}
                    onSelect={handleFilterOptionSelect}
                    multiSelect={true}
                    title="Filter by"
                    onClose={() => setFilterDropdownVisible(false)}
                  />
                </View>
              )}
            </View>
          </View>
        </View>
        
        {/* Category Circles */}
        <View style={styles.categoryContainer}>
          <FlatList
            data={categories}
            renderItem={({ item }) => (
              <CategoryItem 
                item={item} 
                onPress={handleCategoryPress}
              />
            )}
            keyExtractor={item => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
          />
        </View>
        
        {/* Scrollable container for all product sections */}
        <ScrollView 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
        >
          {/* New Arrivals Section */}
          <ProductSection 
            title="New Arrivals"
            data={newArrivalsProducts}
            wishlist={wishlist}
            onToggleWishlist={toggleWishlist}
            onProductPress={handleProductPress}
            onSeeAll={() => handleSeeAll('newArrivals')}
            isLoading={loadingNewArrivals}
          />

          {/* University Products Section */}
          {(userUniversity && (!loadingUniversity || universityProducts.length > 0)) && (
            <ProductSection 
              title={loadingUniversity 
                ? "Loading University Products..." 
                : `${userUniversity || 'University'} Products`
              }
              data={universityProducts}
              wishlist={wishlist}
              onToggleWishlist={toggleWishlist}
              onProductPress={handleProductPress}
              onSeeAll={() => handleSeeAll('university')}
              isLoading={loadingUniversity}
            />
          )}

          {/* City Products Section */}
          {(userCity && (!loadingCity || cityProducts.length > 0)) && (
            <ProductSection 
              title={loadingCity 
                ? "Loading City Products..." 
                : `${userCity || 'City'} Products`
              }
              data={cityProducts}
              wishlist={wishlist}
              onToggleWishlist={toggleWishlist}
              onProductPress={handleProductPress}
              onSeeAll={() => handleSeeAll('city')}
              isLoading={loadingCity}
            />
          )}
          
          {/* Featured Items Section */}
          <ProductSection 
            title="Featured Items"
            data={featuredProducts}
            wishlist={wishlist}
            onToggleWishlist={toggleWishlist}
            onProductPress={handleProductPress}
            onSeeAll={() => handleSeeAll('featured')}
            isLoading={loadingFeatured}
          />
          
          {/* Error display */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={handleRefresh}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Bottom padding to avoid content being hidden behind navigation */}
          <View style={{height: 70}} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 0,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  menuButton: {
    padding: 5,
  },
  menuIcon: {
    fontSize: 24,
    color: '#333',
  },
  truStudSelText: {
    fontSize: 24,
    fontFamily: 'Montserrat',
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
    borderColor: '#ccc',
  },
  profileText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchBox: {
    height: 40,
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    height: 40,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  plainText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  smallButton: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  sortButton: {
  },
  filterButton: {
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 0,
    marginRight: 5,
  },
  categoryContainer: {
    height: 110,
    paddingTop: 5,
    paddingBottom: 15,
  },
  categoryItem: {
    alignItems: 'center',
    marginHorizontal: 7,
    width: 65,
  },
  categoryCircleWrapper: {
    padding: 5,
    marginBottom: 5,
  },
  categoryCircle: {
    width: 55,
    height: 55,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  seeAllText: {
    fontSize: 14,
    color: '#f7b305',
  },
  productScrollView: {
    marginBottom: 20,
  },
  productListContainer: {
    paddingRight: 20,
  },
  productCard: {
    width: 150,
    marginRight: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  productImagePlaceholder: {
    width: 150,
    height: 120,
    backgroundColor: '#e0e0e0',
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 14,
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  wishlistButton: {
    position: 'absolute',
    top: 33,
    right: 10,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#777',
    fontSize: 14,
  },
  dropdownContainer: {
    position: 'absolute',
    top: 45,
    right: 0,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
  enhancedDropdown: {
    width: Math.min(260, width * 0.6),
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
  },
  enhancedDropdownHeader: {
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  enhancedDropdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  enhancedDropdownContent: {
    maxHeight: 300,
  },
  enhancedDropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  enhancedDropdownItemSelected: {
    backgroundColor: '#fff9e6',
  },
  enhancedDropdownItemText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  enhancedDropdownItemTextSelected: {
    fontWeight: '500',
    color: '#f7b305',
  },
  checkIconContainer: {
    width: 24,
    alignItems: 'center',
  },
  activeFilterButton: {
    backgroundColor: '#e69b00',
    borderColor: '#e69b00',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#f7b305',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  productCondition: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  closeButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
});

export default HomeScreen; 