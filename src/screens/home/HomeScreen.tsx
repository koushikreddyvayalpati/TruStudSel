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
import Entypoicon from 'react-native-vector-icons/Entypo';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useNavigation, DrawerActions } from '@react-navigation/native';

// Import from contexts with new structure
import { useAuth } from '../../contexts';
import { useUniversity, useCity } from '../../navigation/MainNavigator';

// Import API methods
import { 
  getProductsByUniversity,
  getProductsByCity,
  getFeaturedProducts,
  getNewArrivals,
  Product as ApiProduct,
  searchProducts,
  SearchProductsParams,
  ProductFilters
} from '../../api/products';

// Import new filter utilities
import {
  createFilterMaps,
  FilterMap,
  shouldUseClientSideFiltering,
  applyOptimizedFiltering,
  convertToApiFilters,
  needsServerRefetch,
  PRODUCT_SIZE_THRESHOLD,
  SORTING_THRESHOLD
} from '../../utils/filterUtils';

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

// Define condition and selling type mappings for the backend
const conditionMapping = {
  'brand-new': 'new',
  'like-new': 'like-new',
  'very-good': 'very-good',
  'good': 'good',
  'acceptable': 'acceptable',
  'for-parts': 'for-parts'
};

// Filter functions
const filterByCondition = (product: Product, conditions: string[]): boolean => {
  if (!conditions.length) return true;
  
  // Check both condition and productage fields as they might be used inconsistently
  const productCondition = product.condition?.toLowerCase() || product.productage?.toLowerCase();
  
  return conditions.some(condition => {
    // Map UI condition to backend condition if needed
    const backendCondition = conditionMapping[condition as keyof typeof conditionMapping] || condition;
    return productCondition === backendCondition;
  });
};

const filterBySellingType = (product: Product, sellingTypes: string[]): boolean => {
  if (!sellingTypes.length) return true;
  
  const productSellingType = product.sellingtype?.toLowerCase();
  
  // Log the selling type to help with debugging
  console.log(`[HomeScreen] Product ${product.id} selling type: ${productSellingType}`);
  
  return sellingTypes.some(type => productSellingType === type);
};

// Add this function to apply front-end filtering
const applyFiltersToProducts = (products: Product[], filters: string[]): Product[] => {
  if (!filters.length) return products;
  
  console.log(`[HomeScreen] Applying ${filters.length} filters to ${products.length} products`);
  
  // Extract condition filters
  const conditionFilters = filters.filter(filter => 
    ['brand-new', 'like-new', 'very-good', 'good', 'acceptable', 'for-parts'].includes(filter)
  );
  console.log(`[HomeScreen] Condition filters: ${conditionFilters.join(', ')}`);
  
  // Extract selling type filters
  const sellingTypeFilters = filters.filter(filter => 
    ['rent', 'sell'].includes(filter)
  );
  console.log(`[HomeScreen] Selling type filters: ${sellingTypeFilters.join(', ')}`);
  
  // Check if we need to filter for free items
  const hasFreeFilter = filters.includes('free');
  console.log(`[HomeScreen] Free filter: ${hasFreeFilter}`);
  
  // Apply all filters
  const filteredProducts = products.filter(product => {
    // For debugging: log product condition and selling type
    console.log(`[HomeScreen] Checking product ${product.id}: condition=${product.condition || product.productage}, sellingtype=${product.sellingtype}, price=${product.price}`);
    
    // Filter by condition
    if (!filterByCondition(product, conditionFilters)) {
      console.log(`[HomeScreen] Product ${product.id} filtered out by condition`);
      return false;
    }
    
    // Filter by selling type
    if (!filterBySellingType(product, sellingTypeFilters)) {
      console.log(`[HomeScreen] Product ${product.id} filtered out by selling type`);
      return false;
    }
    
    // Filter by price (free items)
    if (hasFreeFilter && parseFloat(product.price || '0') > 0) {
      console.log(`[HomeScreen] Product ${product.id} filtered out by price (not free)`);
      return false;
    }
    
    console.log(`[HomeScreen] Product ${product.id} passed all filters`);
    return true;
  });
  
  console.log(`[HomeScreen] Filtering complete: ${filteredProducts.length} products remain`);
  return filteredProducts;
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
  
  // Advanced filtering state
  const [featuredFilterMaps, setFeaturedFilterMaps] = useState<{
    conditionMap: FilterMap;
    sellingTypeMap: FilterMap;
    priceRangeMap: FilterMap;
  }>({ conditionMap: {}, sellingTypeMap: {}, priceRangeMap: {} });
  
  const [newArrivalsFilterMaps, setNewArrivalsFilterMaps] = useState<{
    conditionMap: FilterMap;
    sellingTypeMap: FilterMap;
    priceRangeMap: FilterMap;
  }>({ conditionMap: {}, sellingTypeMap: {}, priceRangeMap: {} });
  
  const [universityFilterMaps, setUniversityFilterMaps] = useState<{
    conditionMap: FilterMap;
    sellingTypeMap: FilterMap;
    priceRangeMap: FilterMap;
  }>({ conditionMap: {}, sellingTypeMap: {}, priceRangeMap: {} });
  
  const [cityFilterMaps, setCityFilterMaps] = useState<{
    conditionMap: FilterMap;
    sellingTypeMap: FilterMap;
    priceRangeMap: FilterMap;
  }>({ conditionMap: {}, sellingTypeMap: {}, priceRangeMap: {} });
  
  // Total available product counts from server
  const [totalFeaturedCount, setTotalFeaturedCount] = useState<number>(0);
  const [totalNewArrivalsCount, setTotalNewArrivalsCount] = useState<number>(0);
  const [totalUniversityCount, setTotalUniversityCount] = useState<number>(0);
  const [totalCityCount, setTotalCityCount] = useState<number>(0);
  
  // Track if we're using server-side filtering
  const [usingServerFiltering, setUsingServerFiltering] = useState<boolean>(false);
  
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

  // Search related states
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [paginationToken, setPaginationToken] = useState<string | null>(null);
  const [hasMoreSearchResults, setHasMoreSearchResults] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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
          const { data, timestamp, totalCount, filterMaps } = JSON.parse(cachedData);
          const isExpired = Date.now() - timestamp > PRODUCTS_CACHE_EXPIRY_TIME;
          
          if (!isExpired) {
            console.log('[HomeScreen] Using cached university products');
            setUniversityProducts(data);
            setUniversityProductsOriginal(data);
            
            // Load cached filter maps and total count if available
            if (filterMaps) {
              setUniversityFilterMaps(filterMaps);
            } else {
              // Create filter maps if not in cache
              setUniversityFilterMaps(createFilterMaps(data));
            }
            
            if (totalCount) {
              setTotalUniversityCount(totalCount);
            } else {
              setTotalUniversityCount(data.length);
            }
            
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
          // Create filter maps for optimized filtering
          const filterMaps = createFilterMaps(result.products);
          
          setUniversityProducts(result.products);
          setUniversityProductsOriginal(result.products);
          setUniversityFilterMaps(filterMaps);
          setTotalUniversityCount(result.totalItems || result.products.length);
          
          console.log(`[HomeScreen] University products state updated with ${result.products.length} items`);
          
          // Save to cache with filter maps and total count
          const cacheData = {
            data: result.products,
            timestamp: Date.now(),
            filterMaps,
            totalCount: result.totalItems || result.products.length
          };
          await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
        } else {
          console.warn('[HomeScreen] Unexpected response format from university products API. Result:', 
            typeof result === 'object' ? JSON.stringify(result) : typeof result);
          setUniversityProducts([]);
          setUniversityProductsOriginal([]);
          setUniversityFilterMaps({ conditionMap: {}, sellingTypeMap: {}, priceRangeMap: {} });
          setTotalUniversityCount(0);
        }
      } catch (error: any) {
        console.warn(`[HomeScreen] API error when loading university products:`, 
          error.message || 'Unknown error');
        console.warn(`[HomeScreen] Error stack:`, error.stack || 'No stack trace');
        
        // Fallback to an empty array to avoid UI crashes
        setUniversityProducts([]);
        setUniversityProductsOriginal([]);
        setUniversityFilterMaps({ conditionMap: {}, sellingTypeMap: {}, priceRangeMap: {} });
        setTotalUniversityCount(0);
      }
    } catch (err: any) {
      console.error('[HomeScreen] Error loading university products:', err);
      setError('Failed to load university products');
      setUniversityProducts([]);
      setUniversityProductsOriginal([]);
      setUniversityFilterMaps({ conditionMap: {}, sellingTypeMap: {}, priceRangeMap: {} });
      setTotalUniversityCount(0);
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
          const { data, timestamp, totalCount, filterMaps } = JSON.parse(cachedData);
          const isExpired = Date.now() - timestamp > PRODUCTS_CACHE_EXPIRY_TIME;
          
          if (!isExpired) {
            console.log('[HomeScreen] Using cached featured products');
            setFeaturedProducts(data);
            setFeaturedProductsOriginal(data);
            
            // Load cached filter maps and total count if available
            if (filterMaps) {
              setFeaturedFilterMaps(filterMaps);
            } else {
              // Create filter maps if not in cache
              setFeaturedFilterMaps(createFilterMaps(data));
            }
            
            if (totalCount) {
              setTotalFeaturedCount(totalCount);
            } else {
              setTotalFeaturedCount(data.length);
            }
            
            setLoadingFeatured(false);
            return;
          }
        } catch (cacheError) {
          console.warn('[HomeScreen] Error parsing cache:', cacheError);
          // Continue with API call if cache parsing fails
        }
      }
      
      const products = await getFeaturedProducts(userUniversity, userCity);
      
      // Create filter maps for optimized filtering
      const filterMaps = createFilterMaps(products);
      
      setFeaturedProducts(products);
      setFeaturedProductsOriginal(products);
      setFeaturedFilterMaps(filterMaps);
      setTotalFeaturedCount(products.length);
      
      // Save to cache with filter maps and total count
      const cacheData = {
        data: products,
        timestamp: Date.now(),
        filterMaps,
        totalCount: products.length
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

  const handleSearch = useCallback(async () => {
    if (!searchQuery) return;
    
    setIsSearching(true);
    setShowSearchResults(true);
    setSearchError(null);
    
    console.log(`[HomeScreen] Searching for: ${searchQuery}`);
    
    try {
      // Construct search parameters
      const searchParams: SearchProductsParams = {
        query: searchQuery,
        university: userUniversity || undefined,
        city: userCity || undefined,
        size: 20
      };
      
      // Add filters if selected
      if (selectedFilters.length > 0) {
        // Map condition filters to backend format
        const conditionFilters = selectedFilters.filter(filter => 
          ['brand-new', 'like-new', 'very-good', 'good', 'acceptable', 'for-parts'].includes(filter)
        ).map(filter => conditionMapping[filter as keyof typeof conditionMapping] || filter);
        
        // Extract selling type filters (these already match backend format)
        const sellingTypeFilters = selectedFilters.filter(filter => 
          ['rent', 'sell'].includes(filter)
        );
        
        // Only add conditions if there are any
        if (conditionFilters.length > 0) {
          searchParams.condition = conditionFilters;
        }
        
        // Only add selling types if there are any
        if (sellingTypeFilters.length > 0) {
          searchParams.sellingType = sellingTypeFilters;
        }
        
        // Add price filter for "free" (price = 0)
        if (selectedFilters.includes('free')) {
          searchParams.maxPrice = 0;
        }
      }
      
      // Add sorting if selected
      if (selectedSort !== 'default') {
        // Map frontend sort options to backend parameters
        switch (selectedSort) {
          case 'price_low_to_high':
            searchParams.sortBy = 'price';
            searchParams.sortDirection = 'asc';
            break;
          case 'price_high_to_low':
            searchParams.sortBy = 'price';
            searchParams.sortDirection = 'desc';
            break;
          case 'newest':
            searchParams.sortBy = 'postingdate';
            searchParams.sortDirection = 'desc';
            break;
          case 'popularity':
            searchParams.sortBy = 'popularity';
            searchParams.sortDirection = 'desc';
            break;
        }
      }
      
      console.log(`[HomeScreen] Search params:`, searchParams);
      
      const result = await searchProducts(searchParams);
      
      // Update results state
      setSearchResults(result.products || []);
      setHasMoreSearchResults(result.hasMorePages || false);
      setPaginationToken(result.nextPageToken || null);
      setCurrentPage(result.currentPage || 1);
      setTotalPages(result.totalPages || 1);
      console.log(`[HomeScreen] Search found ${result.products?.length || 0} results`);
      
    } catch (error) {
      console.error('[HomeScreen] Search error:', error);
      setSearchError(error instanceof Error ? error.message : 'Failed to search products');
      
      // Display empty results with error
      setSearchResults([]);
      setHasMoreSearchResults(false);
      setPaginationToken(null);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, userUniversity, userCity, selectedFilters, selectedSort]);

  // handleLoadMoreSearchResults function
  const handleLoadMoreSearchResults = useCallback(async () => {
    if (isLoadingMore || !hasMoreSearchResults) return;
    
    setIsLoadingMore(true);
    setLoadMoreError(null);
    
    try {
      // Construct search parameters for next page
      const searchParams: SearchProductsParams = {
        query: searchQuery,
        university: userUniversity || undefined,
        city: userCity || undefined,
        size: 20
      };
      
      // Handle both token-based and page-based pagination
      if (paginationToken) {
        // Token-based pagination (preferred)
        searchParams.paginationToken = paginationToken;
      } else {
        // Page-based pagination (fallback)
        searchParams.page = currentPage + 1;
      }
      
      // Add filters if selected
      if (selectedFilters.length > 0) {
        const conditionFilters = selectedFilters.filter(filter => 
          filter === 'new' || filter === 'used'
        );
        
        const sellingTypeFilters = selectedFilters.filter(filter => 
          filter === 'sell' || filter === 'rent'
        );
        
        // Only add conditions if there are any
        if (conditionFilters.length > 0) {
          searchParams.condition = conditionFilters;
        }
        
        // Only add selling types if there are any
        if (sellingTypeFilters.length > 0) {
          searchParams.sellingType = sellingTypeFilters;
        }
        
        // Add price filter for "free" (price = 0)
        if (selectedFilters.includes('free')) {
          searchParams.maxPrice = 0;
        }
      }
      
      // Add sorting if selected
      if (selectedSort !== 'default') {
        searchParams.sortBy = selectedSort;
      }
      
      console.log(`[HomeScreen] Loading more search results with params:`, searchParams);
      
      const result = await searchProducts(searchParams);
      
      // Append new results to existing results
      setSearchResults(prev => [...prev, ...(result.products || [])]);
      setHasMoreSearchResults(result.hasMorePages || false);
      setPaginationToken(result.nextPageToken || null);
      setCurrentPage(result.currentPage || currentPage + 1);
      setTotalPages(result.totalPages || totalPages);
      
      console.log(`[HomeScreen] Loaded ${result.products?.length || 0} more search results`);
      
    } catch (error) {
      console.error('[HomeScreen] Error loading more search results:', error);
      setLoadMoreError(error instanceof Error ? error.message : 'Failed to load more results');
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    isLoadingMore, 
    hasMoreSearchResults, 
    searchQuery, 
    userUniversity, 
    userCity, 
    paginationToken, 
    currentPage, 
    totalPages,
    selectedFilters, 
    selectedSort
  ]);

  // Add handleClearSearch function
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setShowSearchResults(false);
    setSearchResults([]);
    setSearchError(null);
    setPaginationToken(null);
    setHasMoreSearchResults(false);
    console.log('[HomeScreen] Search cleared');
  }, []);

  // Pagination footer component for search results
  const SearchPaginationFooter = ({ 
    isLoadingMore, 
    hasMore, 
    onLoadMore, 
    error 
  }: { 
    isLoadingMore: boolean, 
    hasMore: boolean, 
    onLoadMore: () => void,
    error: string | null 
  }) => {
    if (error) {
      return (
        <View style={styles.paginationFooter}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={onLoadMore} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (isLoadingMore) {
      return (
        <View style={styles.paginationFooter}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingMoreText}>Loading more results...</Text>
        </View>
      );
    }
    
    if (hasMore) {
      return (
        <View style={styles.paginationFooter}>
          <TouchableOpacity onPress={onLoadMore} style={styles.loadMoreButton}>
            <Text style={styles.loadMoreButtonText}>Load More</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return null;
  };

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

  // Update the handleFilterOptionSelect function
  const handleFilterOptionSelect = useCallback((optionId: string) => {
    console.log(`[HomeScreen] Filter option toggled: ${optionId}`);
    
    // Toggle the filter on/off
    setSelectedFilters(prevFilters => {
      const newFilters = prevFilters.includes(optionId)
        ? prevFilters.filter(id => id !== optionId)
        : [...prevFilters, optionId];
        
      console.log(`[HomeScreen] Updated filters:`, newFilters);
      
      // Determine if we should use server-side filtering for any of the product sets
      const useFeaturedServerFiltering = _featuredProductsOriginal.length > 0 && 
        !shouldUseClientSideFiltering(_featuredProductsOriginal, newFilters, totalFeaturedCount);
      
      const useNewArrivalsServerFiltering = _newArrivalsProductsOriginal.length > 0 && 
        !shouldUseClientSideFiltering(_newArrivalsProductsOriginal, newFilters, totalNewArrivalsCount);
      
      const useUniversityServerFiltering = _universityProductsOriginal.length > 0 && 
        !shouldUseClientSideFiltering(_universityProductsOriginal, newFilters, totalUniversityCount);
      
      const useCityServerFiltering = _cityProductsOriginal.length > 0 && 
        !shouldUseClientSideFiltering(_cityProductsOriginal, newFilters, totalCityCount);
      
      // Check if we need to do progressive loading - fetch more data from server
      const needsProgressiveLoading = 
        needsServerRefetch(newFilters, prevFilters, totalFeaturedCount, _featuredProductsOriginal) ||
        needsServerRefetch(newFilters, prevFilters, totalNewArrivalsCount, _newArrivalsProductsOriginal) ||
        needsServerRefetch(newFilters, prevFilters, totalUniversityCount, _universityProductsOriginal) ||
        needsServerRefetch(newFilters, prevFilters, totalCityCount, _cityProductsOriginal);
      
      // If any product set needs server filtering or progressive loading, set the flag
      const useServer = useFeaturedServerFiltering || 
                        useNewArrivalsServerFiltering || 
                        useUniversityServerFiltering || 
                        useCityServerFiltering ||
                        needsProgressiveLoading;
      
      setUsingServerFiltering(useServer);
      
      if (useServer) {
        // Apply server-side filtering by reloading with filters
        console.log('[HomeScreen] Using server-side filtering for large datasets or progressive loading');
        
        // Convert filters to API-compatible format
        const apiFilters = convertToApiFilters(newFilters, selectedSort);
        
        // Set loading states
        if (useFeaturedServerFiltering || 
            (needsProgressiveLoading && _featuredProductsOriginal.length > 0)) {
          setLoadingFeatured(true);
          // Load featured products with filters
          loadFilteredFeaturedProducts(apiFilters)
            .finally(() => setLoadingFeatured(false));
        }
        
        if (useNewArrivalsServerFiltering || 
            (needsProgressiveLoading && _newArrivalsProductsOriginal.length > 0)) {
          setLoadingNewArrivals(true);
          // Load new arrivals with filters
          loadFilteredNewArrivals(apiFilters)
            .finally(() => setLoadingNewArrivals(false));
        }
        
        if (useUniversityServerFiltering || 
            (needsProgressiveLoading && _universityProductsOriginal.length > 0)) {
          setLoadingUniversity(true);
          // Load university products with filters
          loadFilteredUniversityProducts(apiFilters)
            .finally(() => setLoadingUniversity(false));
        }
        
        if (useCityServerFiltering || 
            (needsProgressiveLoading && _cityProductsOriginal.length > 0)) {
          setLoadingCity(true);
          // Load city products with filters
          loadFilteredCityProducts(apiFilters)
            .finally(() => setLoadingCity(false));
        }
      } else {
        // Use client-side filtering for smaller datasets
        console.log('[HomeScreen] Using optimized client-side filtering');
        
        // Apply filters to products in real-time with optimized filtering
        if (_featuredProductsOriginal.length > 0) {
          setFeaturedProducts(
            _featuredProductsOriginal.length < 100 ? 
              applySortingAndFilters(_featuredProductsOriginal, selectedSort, newFilters) :
              applyOptimizedFiltering(_featuredProductsOriginal, newFilters, featuredFilterMaps)
          );
        }
        
        if (_newArrivalsProductsOriginal.length > 0) {
          setNewArrivalsProducts(
            _newArrivalsProductsOriginal.length < 100 ? 
              applySortingAndFilters(_newArrivalsProductsOriginal, selectedSort, newFilters) :
              applyOptimizedFiltering(_newArrivalsProductsOriginal, newFilters, newArrivalsFilterMaps)
          );
        }
        
        if (_universityProductsOriginal.length > 0) {
          setUniversityProducts(
            _universityProductsOriginal.length < 100 ? 
              applySortingAndFilters(_universityProductsOriginal, selectedSort, newFilters) :
              applyOptimizedFiltering(_universityProductsOriginal, newFilters, universityFilterMaps)
          );
        }
        
        if (_cityProductsOriginal.length > 0) {
          setCityProducts(
            _cityProductsOriginal.length < 100 ? 
              applySortingAndFilters(_cityProductsOriginal, selectedSort, newFilters) :
              applyOptimizedFiltering(_cityProductsOriginal, newFilters, cityFilterMaps)
          );
        }
        
        // Apply to search results if visible
        if (showSearchResults && searchResults.length > 0) {
          // For search results, use applySortingAndFilters since we 
          // don't maintain filter maps for search results
          setSearchResults(prevResults => 
            applySortingAndFilters(prevResults, selectedSort, newFilters)
          );
        }
      }
      
      return newFilters;
    });
    
    // Close dropdown if not multi-select
    if (!filterDropdownVisible) {
      setFilterDropdownVisible(false);
    }
  }, [
    _featuredProductsOriginal, 
    _newArrivalsProductsOriginal, 
    _universityProductsOriginal, 
    _cityProductsOriginal, 
    selectedSort, 
    filterDropdownVisible,
    showSearchResults,
    searchResults,
    totalFeaturedCount,
    totalNewArrivalsCount,
    totalUniversityCount,
    totalCityCount,
    featuredFilterMaps,
    newArrivalsFilterMaps,
    universityFilterMaps,
    cityFilterMaps
  ]);

  // Update the handleSortOptionSelect function
  const handleSortOptionSelect = useCallback((optionId: string) => {
    console.log(`[HomeScreen] Sort option selected: ${optionId}`);
    setSelectedSort(optionId);
    setSortDropdownVisible(false);
    
    // Determine if we need server-side sorting for any product set
    // We generally only need server-side sorting for very large datasets
    // or if we're already using server-side filtering
    const useFeaturedServerSorting = 
      _featuredProductsOriginal.length > SORTING_THRESHOLD || 
      (usingServerFiltering && _featuredProductsOriginal.length > 0);
    
    const useNewArrivalsServerSorting = 
      _newArrivalsProductsOriginal.length > SORTING_THRESHOLD || 
      (usingServerFiltering && _newArrivalsProductsOriginal.length > 0);
    
    const useUniversityServerSorting = 
      _universityProductsOriginal.length > SORTING_THRESHOLD || 
      (usingServerFiltering && _universityProductsOriginal.length > 0);
    
    const useCityServerSorting = 
      _cityProductsOriginal.length > SORTING_THRESHOLD || 
      (usingServerFiltering && _cityProductsOriginal.length > 0);
    
    const useServerSorting = 
      useFeaturedServerSorting || 
      useNewArrivalsServerSorting || 
      useUniversityServerSorting || 
      useCityServerSorting;
    
    if (useServerSorting) {
      console.log('[HomeScreen] Using server-side sorting for large datasets');
      
      // Convert filters and sorts to API-compatible format
      const apiFilters = convertToApiFilters(selectedFilters, optionId);
      
      // Apply server-side sorting (and filtering if needed)
      if (useFeaturedServerSorting) {
        setLoadingFeatured(true);
        loadFilteredFeaturedProducts(apiFilters)
          .finally(() => setLoadingFeatured(false));
      }
      
      if (useNewArrivalsServerSorting) {
        setLoadingNewArrivals(true);
        loadFilteredNewArrivals(apiFilters)
          .finally(() => setLoadingNewArrivals(false));
      }
      
      if (useUniversityServerSorting) {
        setLoadingUniversity(true);
        loadFilteredUniversityProducts(apiFilters)
          .finally(() => setLoadingUniversity(false));
      }
      
      if (useCityServerSorting) {
        setLoadingCity(true);
        loadFilteredCityProducts(apiFilters)
          .finally(() => setLoadingCity(false));
      }
    } else {
      console.log('[HomeScreen] Using client-side sorting');
      
      // Apply sorting to products with existing filters
      if (_featuredProductsOriginal.length > 0) {
        console.log(`[HomeScreen] Sorting featured products (${_featuredProductsOriginal.length} items)`);
        setFeaturedProducts(applySortingAndFilters(_featuredProductsOriginal, optionId, selectedFilters));
      }
      
      if (_newArrivalsProductsOriginal.length > 0) {
        console.log(`[HomeScreen] Sorting new arrivals (${_newArrivalsProductsOriginal.length} items)`);
        setNewArrivalsProducts(applySortingAndFilters(_newArrivalsProductsOriginal, optionId, selectedFilters));
      }
      
      if (_universityProductsOriginal.length > 0) {
        console.log(`[HomeScreen] Sorting university products (${_universityProductsOriginal.length} items)`);
        setUniversityProducts(applySortingAndFilters(_universityProductsOriginal, optionId, selectedFilters));
      }
      
      if (_cityProductsOriginal.length > 0) {
        console.log(`[HomeScreen] Sorting city products (${_cityProductsOriginal.length} items)`);
        setCityProducts(applySortingAndFilters(_cityProductsOriginal, optionId, selectedFilters));
      }
      
      // Apply to search results if visible
      if (showSearchResults && searchResults.length > 0) {
        console.log(`[HomeScreen] Sorting search results (${searchResults.length} items)`);
        setSearchResults(prevResults => applySortingAndFilters(prevResults, optionId, selectedFilters));
      }
    }
  }, [
    _featuredProductsOriginal, 
    _newArrivalsProductsOriginal, 
    _universityProductsOriginal, 
    _cityProductsOriginal, 
    selectedFilters,
    showSearchResults,
    searchResults,
    usingServerFiltering,
    loadFilteredFeaturedProducts,
    loadFilteredNewArrivals,
    loadFilteredUniversityProducts,
    loadFilteredCityProducts
  ]);

  // Comprehensive function to apply both sorting and filtering
  const applySortingAndFilters = (products: Product[], sortOption: string, filters: string[]): Product[] => {
    // First apply filters
    let filteredProducts = filters.length > 0 ? applyFiltersToProducts(products, filters) : [...products];
    
    // Then apply sorting
    switch (sortOption) {
      case 'price_low_to_high':
        filteredProducts.sort((a, b) => parseFloat(a.price || '0') - parseFloat(b.price || '0'));
        break;
      case 'price_high_to_low':
        filteredProducts.sort((a, b) => parseFloat(b.price || '0') - parseFloat(a.price || '0'));
        break;
      case 'newest':
        filteredProducts.sort((a, b) => {
          const dateA = a.postingdate ? new Date(a.postingdate).getTime() : 0;
          const dateB = b.postingdate ? new Date(b.postingdate).getTime() : 0;
          return dateB - dateA;
        });
        break;
      case 'popularity':
        // If you have a popularity metric, sort by that here
        // For now, we'll just use ID as a proxy
        filteredProducts.sort((a, b) => a.id.localeCompare(b.id));
        break;
      // Default case - no sorting
      default:
        break;
    }
    
    return filteredProducts;
  };

  // Add a "Clear Filters" button near the filter dropdown
  const handleClearFilters = useCallback(() => {
    // Reset filters and sort
    setSelectedFilters([]);
    setSelectedSort('default');
    
    // Reset all products to their originals
    if (_featuredProductsOriginal.length > 0) {
      setFeaturedProducts([..._featuredProductsOriginal]);
    }
    
    if (_newArrivalsProductsOriginal.length > 0) {
      setNewArrivalsProducts([..._newArrivalsProductsOriginal]);
    }
    
    if (_universityProductsOriginal.length > 0) {
      setUniversityProducts([..._universityProductsOriginal]);
    }
    
    if (_cityProductsOriginal.length > 0) {
      setCityProducts([..._cityProductsOriginal]);
    }
    
    // Reset search results if visible
    if (showSearchResults && searchResults.length > 0) {
      // We'd need to re-run the search without filters
      handleSearch();
    }
    
    console.log('[HomeScreen] All filters and sorting cleared');
  }, [
    _featuredProductsOriginal,
    _newArrivalsProductsOriginal,
    _universityProductsOriginal,
    _cityProductsOriginal,
    showSearchResults,
    searchResults.length,
    handleSearch
  ]);

  // Navigate to category products screen with appropriate section
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
  }, [nav, userCity, userUniversity]);

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

  // Load filtered featured products from server
  const loadFilteredFeaturedProducts = useCallback(async (apiFilters: ProductFilters) => {
    if (!userUniversity || !userCity) return;
    
    console.log('[HomeScreen] Loading filtered featured products from server');
    
    try {
      // Add location filters
      const filters = {
        ...apiFilters,
        university: userUniversity,
        city: userCity
      };
      
      const products = await getFeaturedProducts(userUniversity, userCity);
      
      // Client-side filter if server doesn't support filtering for this endpoint
      let filteredProducts = products;
      
      if (Object.keys(apiFilters).length > 0) {
        // Apply manual filtering for condition
        if (apiFilters.condition) {
          const conditions = Array.isArray(apiFilters.condition) 
            ? apiFilters.condition 
            : [apiFilters.condition];
            
          filteredProducts = filteredProducts.filter(product => {
            const productCondition = (product.condition || product.productage || '').toLowerCase();
            return conditions.some(c => productCondition === c);
          });
        }
        
        // Apply manual filtering for selling type
        if (apiFilters.sellingType) {
          const types = Array.isArray(apiFilters.sellingType)
            ? apiFilters.sellingType
            : [apiFilters.sellingType];
            
          filteredProducts = filteredProducts.filter(product => {
            const sellingType = (product.sellingtype || '').toLowerCase();
            return types.some(t => sellingType === t);
          });
        }
        
        // Apply manual filtering for price
        if (apiFilters.maxPrice !== undefined) {
          const maxPrice = parseFloat(apiFilters.maxPrice.toString());
          filteredProducts = filteredProducts.filter(product => {
            const price = parseFloat(product.price || '0');
            return price <= maxPrice;
          });
        }
        
        if (apiFilters.minPrice !== undefined) {
          const minPrice = parseFloat(apiFilters.minPrice.toString());
          filteredProducts = filteredProducts.filter(product => {
            const price = parseFloat(product.price || '0');
            return price >= minPrice;
          });
        }
      }
      
      // Create filter maps for the filtered products
      const filterMaps = createFilterMaps(filteredProducts);
      
      setFeaturedProducts(filteredProducts);
      setFeaturedFilterMaps(filterMaps);
      
      return filteredProducts;
    } catch (err) {
      console.error('Error loading filtered featured products:', err);
      return [];
    }
  }, [userUniversity, userCity]);
  
  // Load filtered new arrivals from server
  const loadFilteredNewArrivals = useCallback(async (apiFilters: ProductFilters) => {
    if (!userUniversity) return;
    
    console.log('[HomeScreen] Loading filtered new arrivals from server');
    
    try {
      // Add location filters
      const filters = {
        ...apiFilters,
        university: userUniversity
      };
      
      const products = await getNewArrivals(userUniversity);
      
      // Client-side filter if server doesn't support filtering for this endpoint
      let filteredProducts = products;
      
      if (Object.keys(apiFilters).length > 0) {
        // Apply manual filtering for condition
        if (apiFilters.condition) {
          const conditions = Array.isArray(apiFilters.condition) 
            ? apiFilters.condition 
            : [apiFilters.condition];
            
          filteredProducts = filteredProducts.filter(product => {
            const productCondition = (product.condition || product.productage || '').toLowerCase();
            return conditions.some(c => productCondition === c);
          });
        }
        
        // Apply manual filtering for selling type
        if (apiFilters.sellingType) {
          const types = Array.isArray(apiFilters.sellingType)
            ? apiFilters.sellingType
            : [apiFilters.sellingType];
            
          filteredProducts = filteredProducts.filter(product => {
            const sellingType = (product.sellingtype || '').toLowerCase();
            return types.some(t => sellingType === t);
          });
        }
        
        // Apply manual filtering for price
        if (apiFilters.maxPrice !== undefined) {
          const maxPrice = parseFloat(apiFilters.maxPrice.toString());
          filteredProducts = filteredProducts.filter(product => {
            const price = parseFloat(product.price || '0');
            return price <= maxPrice;
          });
        }
        
        if (apiFilters.minPrice !== undefined) {
          const minPrice = parseFloat(apiFilters.minPrice.toString());
          filteredProducts = filteredProducts.filter(product => {
            const price = parseFloat(product.price || '0');
            return price >= minPrice;
          });
        }
      }
      
      // Create filter maps for the filtered products
      const filterMaps = createFilterMaps(filteredProducts);
      
      setNewArrivalsProducts(filteredProducts);
      setNewArrivalsFilterMaps(filterMaps);
      
      return filteredProducts;
    } catch (err) {
      console.error('Error loading filtered new arrivals:', err);
      return [];
    }
  }, [userUniversity]);
  
  // Load filtered university products from server
  const loadFilteredUniversityProducts = useCallback(async (apiFilters: ProductFilters) => {
    if (!userUniversity) return;
    
    console.log('[HomeScreen] Loading filtered university products from server');
    
    try {
      // Adjusted filters to match backend expected parameters
      const filters: ProductFilters = {
        ...apiFilters,
        sortBy: apiFilters.sortBy || 'newest',
        page: 1,
        size: 20
      };
      
      const result = await getProductsByUniversity(userUniversity, filters);
      
      if (result && Array.isArray(result.products)) {
        // Create filter maps for the filtered products
        const filterMaps = createFilterMaps(result.products);
        
        setUniversityProducts(result.products);
        setUniversityFilterMaps(filterMaps);
        
        return result.products;
      }
      
      return [];
    } catch (err) {
      console.error('Error loading filtered university products:', err);
      return [];
    }
  }, [userUniversity]);
  
  // Load filtered city products from server
  const loadFilteredCityProducts = useCallback(async (apiFilters: ProductFilters) => {
    if (!userCity) return;
    
    console.log('[HomeScreen] Loading filtered city products from server');
    
    try {
      // Adjusted filters to match backend expected parameters
      const filters: ProductFilters = {
        ...apiFilters,
        sortBy: apiFilters.sortBy || 'newest',
        page: 1,
        size: 20,
        university: userUniversity // Include university if available
      };
      
      const result = await getProductsByCity(userCity, filters);
      
      if (result && Array.isArray(result.products)) {
        // Create filter maps for the filtered products
        const filterMaps = createFilterMaps(result.products);
        
        setCityProducts(result.products);
        setCityFilterMaps(filterMaps);
        
        return result.products;
      }
      
      return [];
    } catch (err) {
      console.error('Error loading filtered city products:', err);
      return [];
    }
  }, [userCity, userUniversity]);

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
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <FontAwesome name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                // Automatically clear search results when search box is emptied
                if (!text) {
                  setShowSearchResults(false);
                  setSearchResults([]);
                  setSearchError(null);
                  setPaginationToken(null);
                  setHasMoreSearchResults(false);
                  console.log('[HomeScreen] Search cleared (text empty)');
                }
              }}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
              placeholderTextColor="#999"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                style={styles.clearButton} 
                onPress={handleClearSearch}
                activeOpacity={0.7}
              >
                <FontAwesome name="times-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearch}
            disabled={!searchQuery.trim()}
          >
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>
        
        {/* Row with text and buttons */}
        <View style={styles.rowContainer}>
          <Text style={[styles.plainText, { color: 'black' }]}>
            {showSearchResults ? 'Search Results' : 'All Items'}
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
                    onSelect={handleSortOptionSelect}
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
            
            {/* Clear filters button - only show if filters are applied */}
            {(selectedFilters.length > 0 || selectedSort !== 'default') && (
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={handleClearFilters}
                activeOpacity={0.7}
              >
                <Text style={styles.clearFiltersText}>Clear</Text>
                <MaterialIcons name="clear" size={14} color="#f7b305" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {/* Show either search results or normal content */}
        {showSearchResults ? (
          <View style={styles.searchResultsContainer}>
            {isSearching ? (
              <View style={styles.searchLoadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Searching...</Text>
              </View>
            ) : searchError ? (
              <View style={styles.searchErrorContainer}>
                <Text style={styles.errorText}>Error: {searchError}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={handleSearch}>
                  <Text style={styles.retryButtonText}>Retry Search</Text>
                </TouchableOpacity>
              </View>
            ) : searchResults.length === 0 ? (
              <View style={styles.noResultsContainer}>
                <FontAwesome name="search" size={40} color="#ccc" />
                <Text style={styles.noResultsText}>No products found</Text>
                <Text style={styles.noResultsSubText}>Try a different search or filter</Text>
              </View>
            ) : (
              <>
                <FlatList
                  data={searchResults}
                  renderItem={({ item }) => (
                    <ProductItem
                      item={item}
                      wishlist={wishlist}
                      onToggleWishlist={toggleWishlist}
                      onPress={handleProductPress}
                    />
                  )}
                  keyExtractor={item => item.id.toString()}
                  numColumns={2}
                  contentContainerStyle={styles.productsGrid}
                  ListFooterComponent={
                    <SearchPaginationFooter
                      isLoadingMore={isLoadingMore}
                      hasMore={hasMoreSearchResults}
                      onLoadMore={handleLoadMoreSearchResults}
                      error={loadMoreError}
                    />
                  }
                />
                {searchResults.length > 0 && (
                  <View style={styles.searchStatsContainer}>
                    <Text style={styles.searchStatsText}>
                      Showing {searchResults.length} results • Page {currentPage} of {totalPages}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        ) : (
          // Original content - Categories and Product Sections
          <>
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
          </>
        )}
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
    marginBottom:5,
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
  searchContainer: {
    flexDirection: 'row',
    marginVertical: 12,
    paddingHorizontal: 5,
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f2f2f2',
    borderRadius: 25,
    alignItems: 'center',
    paddingHorizontal: 15,
    height: 46,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    height: '100%',
  },
  clearButton: {
    padding: 6,
  },
  searchButton: {
    backgroundColor: 'black',
    borderRadius: 25,
    paddingHorizontal: 10,
    paddingVertical: 12,
    marginLeft: 10,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
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
  searchResultsContainer: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  searchResultsList: {
    padding: 10,
    paddingBottom: 20,
  },
  searchLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  searchErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
  },
  noResultsSubText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  searchStatsContainer: {
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  searchStatsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  paginationFooter: {
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  loadMoreButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  loadingMoreText: {
    marginTop: 8,
    color: '#666',
  },
  productsGrid: {
    padding: 8,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f7b305',
    marginRight: 8,
  },
  clearFiltersText: {
    color: '#f7b305',
    fontSize: 12,
    marginRight: 4,
    fontWeight: '500',
  },
});

export default HomeScreen; 