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
import { debounce } from 'lodash'; // Add lodash import for debouncing

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
  SearchProductsResponse,
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

// Import search utilities
import {
  saveRecentSearch,
  loadRecentSearches,
  cacheSearchResults,
  getCachedSearchResults,
  SEARCH_CACHE_KEY,
  SEARCH_CACHE_RESULTS_KEY,
  SEARCH_CACHE_EXPIRY_TIME,
  MAX_RECENT_SEARCHES
} from './searchUtils';

// Import the search hook
import { useSearch } from './home-search';

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
const FEATURED_PRODUCTS_CACHE_KEY = 'featured_products_cache_';
const NEW_ARRIVALS_CACHE_KEY = 'new_arrivals_cache_';
const UNIVERSITY_PRODUCTS_CACHE_KEY = 'university_products_cache_';
const CITY_PRODUCTS_CACHE_KEY = 'city_products_cache_';
const USER_CACHE_EXPIRY_TIME = 15 * 60 * 1000; // 15 minutes
const PRODUCTS_CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes
// Add global refresh key
const FORCE_REFRESH_KEY = 'force_refresh_flag';

// Constants for search caching are imported from searchUtils.ts

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
  onMessageSeller: (product: Product) => void;
}> = ({ item, onPress, onMessageSeller, wishlist: _wishlist, onToggleWishlist: _onToggleWishlist }) => {
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
          style={styles.messageButton} 
          onPress={() => onMessageSeller(item)}
        >
          <FontAwesome 
            name="comment" 
            size={18} 
            color="#f7b305" 
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
  onMessageSeller: (product: Product) => void;
  onSeeAll?: () => void;
  isLoading?: boolean;
}> = ({ 
  title, 
  data, 
  wishlist, 
  onToggleWishlist, 
  onProductPress,
  onMessageSeller,
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
            onMessageSeller={onMessageSeller}
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
  
  // Use our search hook for all search functionality
  const search = useSearch(userUniversity, userCity);
  
  const [wishlist, setWishlist] = useState<string[]>([]);
  
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
  const [featuredFilterMaps, setFeaturedFilterMaps] = useState<FilterMap>({
    condition: new Map(),
    sellingType: new Map(),
    price: new Map()
  });
  
  const [newArrivalsFilterMaps, setNewArrivalsFilterMaps] = useState<FilterMap>({
    condition: new Map(),
    sellingType: new Map(),
    price: new Map()
  });
  
  const [universityFilterMaps, setUniversityFilterMaps] = useState<FilterMap>({
    condition: new Map(),
    sellingType: new Map(),
    price: new Map()
  });
  
  const [cityFilterMaps, setCityFilterMaps] = useState<FilterMap>({
    condition: new Map(),
    sellingType: new Map(),
    price: new Map()
  });
  
  // Total available product counts from server
  const [totalFeaturedCount, setTotalFeaturedCount] = useState<number>(0);
  const [totalNewArrivalsCount, _setTotalNewArrivalsCount] = useState<number>(0); // Prefix with _ to indicate unused
  const [totalUniversityCount, setTotalUniversityCount] = useState<number>(0);
  const [totalCityCount, _setTotalCityCount] = useState<number>(0); // Prefix with _ to indicate unused
  
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
        if (search.showSearchResults && search.searchResults.length > 0) {
          // For search results, re-run search with new filters instead of directly manipulating results
          search.handleSearch();
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
    search, // Add entire search object as dependency
    totalFeaturedCount,
    totalNewArrivalsCount,
    totalUniversityCount,
    totalCityCount,
    featuredFilterMaps,
    newArrivalsFilterMaps,
    universityFilterMaps,
    cityFilterMaps,
    loadFilteredFeaturedProducts,
    loadFilteredNewArrivals,
    loadFilteredUniversityProducts,
    loadFilteredCityProducts
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
      if (search.showSearchResults && search.searchResults.length > 0) {
        console.log(`[HomeScreen] Sorting search results (${search.searchResults.length} items)`);
        // Re-run search with new sort option instead of directly manipulating results
        search.handleSearch();
      }
    }
  }, [
    _featuredProductsOriginal, 
    _newArrivalsProductsOriginal, 
    _universityProductsOriginal, 
    _cityProductsOriginal, 
    selectedFilters,
    search, // Add entire search object as dependency
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
    if (search.showSearchResults && search.searchResults.length > 0) {
      // We'd need to re-run the search without filters
      search.handleSearch();
    }
    
    console.log('[HomeScreen] All filters and sorting cleared');
  }, [
    _featuredProductsOriginal,
    _newArrivalsProductsOriginal,
    _universityProductsOriginal,
    _cityProductsOriginal,
    search // Add entire search object as dependency
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

  // Effect to initialize the app - add this before other effects
  useEffect(() => {
    console.log('[HomeScreen] Initial render, user data:', user);
    if (user) {
      fetchUserProfile();
    }
  }, [user, fetchUserProfile]);

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
  const fetchUserProfile = useCallback(async () => {
    // Use user.email instead of user.id since this is the correct property from AuthContext
    if (!user || !user.email) {
      console.log('[HomeScreen] No user or user email found, skipping profile fetch');
      return;
    }
    
    try {
      setIsLoadingUserData(true);
      setUserDataError(null);
      
      // Log that we're trying to fetch profile
      console.log(`[HomeScreen] Attempting to fetch profile for user: ${user.email}`);
      
      // Try to get from cache first
      const cachedProfile = await AsyncStorage.getItem(USER_PROFILE_CACHE_KEY + user.email);
      if (cachedProfile) {
        const { data, timestamp } = JSON.parse(cachedProfile);
        const isExpired = Date.now() - timestamp > USER_CACHE_EXPIRY_TIME;
        
        if (!isExpired) {
          console.log('[HomeScreen] Using cached user profile');
          setUserProfileData(data);
          if (data.university) setUserUniversity(data.university);
          if (data.city) setUserCity(data.city);
          setIsLoadingUserData(false);
          return;
        }
      }
      
      // Fetch profile from API
      console.log(`[HomeScreen] Fetching fresh user profile for ${user.email}`);
      const profile = await fetchUserProfileById(user.email);
      console.log('[HomeScreen] Profile fetched successfully:', profile);
      setUserProfileData(profile);
      
      // Update context values
      if (profile.university) setUserUniversity(profile.university);
      if (profile.city) setUserCity(profile.city);
      
      // Cache the result
      await AsyncStorage.setItem(
        USER_PROFILE_CACHE_KEY + user.email,
        JSON.stringify({
          data: profile,
          timestamp: Date.now()
        })
      );
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setUserDataError('Failed to load user data');
    } finally {
      setIsLoadingUserData(false);
    }
  }, [user, setUserCity, setUserUniversity]);

  // Function to get user initials for avatar
  const getInitial = () => {
    if (userProfileData?.name) {
      return userProfileData.name.charAt(0).toUpperCase();
    } else if (user?.name) {
      return user.name.charAt(0).toUpperCase();
    }
    return 'U';
  };

  // Filtered products loading functions
  const loadFilteredFeaturedProducts = useCallback(async (filters: ProductFilters) => {
    try {
      console.log('[HomeScreen] Using client-side filtering for featured products with filters:', filters);
      
      // Since getFeaturedProducts doesn't accept filters parameter, we'll fetch and filter client-side
      const response = await getFeaturedProducts(userUniversity || '', userCity || '');
      
      let productsToFilter: Product[] = [];
      
      // Handle the new paginated response format
      if (Array.isArray(response)) {
        productsToFilter = response;
      } else if (response && response.products) {
        productsToFilter = response.products;
      } else {
        console.error('Unexpected response format from loadFilteredFeaturedProducts:', response);
        setFeaturedProducts([]);
        return;
      }
      
      // Apply filtering on the client side
      const filteredProducts = applySortingAndFilters(productsToFilter, selectedSort, 
        Object.entries(filters).reduce((acc, [key, value]) => {
          if (Array.isArray(value)) {
            return [...acc, ...value];
          } else if (value) {
            return [...acc, value as string];
          }
          return acc;
        }, [] as string[])
      );
      
      setFeaturedProducts(filteredProducts || []);
    } catch (err) {
      console.error('Error loading filtered featured products:', err);
      setError('Failed to load featured products with filters');
    }
  }, [userUniversity, userCity, selectedSort, applySortingAndFilters]);

  // Client-side filtering for new arrivals
  const loadFilteredNewArrivals = useCallback(async (filters: ProductFilters) => {
    try {
      console.log('[HomeScreen] Using client-side filtering for new arrivals with filters:', filters);
      
      // Since getNewArrivals doesn't accept filters parameter, we'll fetch and filter client-side
      const response = await getNewArrivals(userUniversity || '');
      
      let productsToFilter: Product[] = [];
      
      // Handle the new paginated response format
      if (Array.isArray(response)) {
        productsToFilter = response;
      } else if (response && response.products) {
        productsToFilter = response.products;
      } else {
        console.error('Unexpected response format from loadFilteredNewArrivals:', response);
        setNewArrivalsProducts([]);
        return;
      }
      
      // Apply filtering on the client side
      const filteredProducts = applySortingAndFilters(productsToFilter, selectedSort, 
        Object.entries(filters).reduce((acc, [key, value]) => {
          if (Array.isArray(value)) {
            return [...acc, ...value];
          } else if (value) {
            return [...acc, value as string];
          }
          return acc;
        }, [] as string[])
      );
      
      setNewArrivalsProducts(filteredProducts || []);
    } catch (err) {
      console.error('Error loading filtered new arrivals:', err);
      setError('Failed to load new arrivals with filters');
    }
  }, [userUniversity, selectedSort, applySortingAndFilters]);

  // Update loadNewArrivals to check for force refresh synchronously
  const loadNewArrivals = useCallback(async () => {
    try {
      setLoadingNewArrivals(true);
      
      // Check if force refresh is enabled - direct check
      if (shouldForceRefresh) {
        console.log(`[HomeScreen] Force refresh enabled, fetching fresh new arrivals`);
        const response = await getNewArrivals(userUniversity || '');
        
        // Handle the new paginated response format
        if (Array.isArray(response)) {
          // Legacy format - response is an array of products
          setNewArrivalsProducts(response);
          setNewArrivalsProductsOriginal(response);
          
          if (response.length > 0) {
            setNewArrivalsFilterMaps(createFilterMaps(response));
          }
          
          // Cache the result
          await cacheProducts(NEW_ARRIVALS_CACHE_KEY, response, userUniversity);
        } else if (response && response.products) {
          // New paginated response format
          setNewArrivalsProducts(response.products);
          setNewArrivalsProductsOriginal(response.products);
          
          if (response.products.length > 0) {
            setNewArrivalsFilterMaps(createFilterMaps(response.products));
          }
          
          // Cache the result
          await cacheProducts(NEW_ARRIVALS_CACHE_KEY, response.products, userUniversity);
        } else {
          console.error('Unexpected response format from getNewArrivals:', response);
          setNewArrivalsProducts([]);
          setNewArrivalsProductsOriginal([]);
        }
        return;
      }
      
      // Regular cache-first approach if not force refreshing
      const cachedProducts = await getCachedProducts(NEW_ARRIVALS_CACHE_KEY, userUniversity);
      
      if (cachedProducts) {
        // Use cached data
        setNewArrivalsProducts(cachedProducts);
        setNewArrivalsProductsOriginal(cachedProducts);
        
        // Create filter maps for optimization
        if (cachedProducts.length > 0) {
          setNewArrivalsFilterMaps(createFilterMaps(cachedProducts));
        }
      } else {
        // Fetch from API
        console.log(`[HomeScreen] Fetching fresh new arrivals: univ=${userUniversity}`);
        const response = await getNewArrivals(userUniversity || '');
        
        // Handle the new paginated response format
        if (Array.isArray(response)) {
          // Legacy format - response is an array of products
          setNewArrivalsProducts(response);
          setNewArrivalsProductsOriginal(response);
          
          // Create filter maps for optimization
          if (response.length > 0) {
            setNewArrivalsFilterMaps(createFilterMaps(response));
          }
          
          // Cache the result
          await cacheProducts(NEW_ARRIVALS_CACHE_KEY, response, userUniversity);
        } else if (response && response.products) {
          // New paginated response format
          setNewArrivalsProducts(response.products);
          setNewArrivalsProductsOriginal(response.products);
          
          // Create filter maps for optimization
          if (response.products.length > 0) {
            setNewArrivalsFilterMaps(createFilterMaps(response.products));
          }
          
          // Cache the result
          await cacheProducts(NEW_ARRIVALS_CACHE_KEY, response.products, userUniversity);
        } else {
          console.error('Unexpected response format from getNewArrivals:', response);
          setNewArrivalsProducts([]);
          setNewArrivalsProductsOriginal([]);
        }
      }
    } catch (err) {
      console.error('Error loading new arrivals:', err);
      setError('Failed to load new arrivals');
    } finally {
      setLoadingNewArrivals(false);
    }
  }, [userUniversity, shouldForceRefresh]);

  // Update loadFeaturedProducts to check for force refresh synchronously
  const loadFeaturedProducts = useCallback(async () => {
    try {
      setLoadingFeatured(true);
      
      // Check if force refresh is enabled - direct check
      if (shouldForceRefresh) {
        console.log(`[HomeScreen] Force refresh enabled, fetching fresh featured products`);
        const response = await getFeaturedProducts(userUniversity || '', userCity || '');
        
        // Handle the new paginated response format
        if (Array.isArray(response)) {
          // Legacy format - response is an array of products
          setFeaturedProducts(response);
          setFeaturedProductsOriginal(response);
          setTotalFeaturedCount(response.length);
          
          if (response.length > 0) {
            setFeaturedFilterMaps(createFilterMaps(response));
          }
          
          // Cache the result
          await cacheProducts(FEATURED_PRODUCTS_CACHE_KEY, response, userUniversity, userCity);
        } else if (response && response.products) {
          // New paginated response format
          setFeaturedProducts(response.products);
          setFeaturedProductsOriginal(response.products);
          setTotalFeaturedCount(response.totalItems || response.products.length);
          
          if (response.products.length > 0) {
            setFeaturedFilterMaps(createFilterMaps(response.products));
          }
          
          // Cache the result
          await cacheProducts(FEATURED_PRODUCTS_CACHE_KEY, response.products, userUniversity, userCity);
        } else {
          console.error('Unexpected response format from getFeaturedProducts:', response);
          setFeaturedProducts([]);
          setFeaturedProductsOriginal([]);
          setTotalFeaturedCount(0);
        }
        return;
      }
      
      // Regular cache-first approach if not force refreshing
      const cachedProducts = await getCachedProducts(FEATURED_PRODUCTS_CACHE_KEY, userUniversity, userCity);
      
      if (cachedProducts) {
        // Use cached data
        setFeaturedProducts(cachedProducts);
        setFeaturedProductsOriginal(cachedProducts);
        setTotalFeaturedCount(cachedProducts.length);
        
        // Create filter maps for optimization
        if (cachedProducts.length > 0) {
          setFeaturedFilterMaps(createFilterMaps(cachedProducts));
        }
      } else {
        // Fetch from API
        console.log(`[HomeScreen] Fetching fresh featured products: univ=${userUniversity}, city=${userCity}`);
        const response = await getFeaturedProducts(userUniversity || '', userCity || '');
        
        // Handle the new paginated response format
        if (Array.isArray(response)) {
          // Legacy format - response is an array of products
          setFeaturedProducts(response);
          setFeaturedProductsOriginal(response);
          setTotalFeaturedCount(response.length);
          
          // Create filter maps for optimization
          if (response.length > 0) {
            setFeaturedFilterMaps(createFilterMaps(response));
          }
          
          // Cache the result
          await cacheProducts(FEATURED_PRODUCTS_CACHE_KEY, response, userUniversity, userCity);
        } else if (response && response.products) {
          // New paginated response format
          setFeaturedProducts(response.products);
          setFeaturedProductsOriginal(response.products);
          setTotalFeaturedCount(response.totalItems || response.products.length);
          
          // Create filter maps for optimization
          if (response.products.length > 0) {
            setFeaturedFilterMaps(createFilterMaps(response.products));
          }
          
          // Cache the result
          await cacheProducts(FEATURED_PRODUCTS_CACHE_KEY, response.products, userUniversity, userCity);
        } else {
          console.error('Unexpected response format from getFeaturedProducts:', response);
          setFeaturedProducts([]);
          setFeaturedProductsOriginal([]);
          setTotalFeaturedCount(0);
        }
      }
    } catch (err) {
      console.error('Error loading featured products:', err);
      setError('Failed to load featured products');
    } finally {
      setLoadingFeatured(false);
    }
  }, [userUniversity, userCity, shouldForceRefresh, cacheProducts, getCachedProducts]);

  // Update loadUniversityProducts to check for force refresh synchronously
  const loadUniversityProducts = useCallback(async () => {
    if (!userUniversity) return;
    
    try {
      setLoadingUniversity(true);
      
      // Check if force refresh is enabled - direct check
      if (shouldForceRefresh) {
        console.log(`[HomeScreen] Force refresh enabled, fetching fresh university products`);
        const response = await getProductsByUniversity(userUniversity);
        
        setUniversityProducts(response.products || []);
        setUniversityProductsOriginal(response.products || []);
        setTotalUniversityCount(response.products?.length || 0);
        
        // Create filter maps for optimization
        if (response.products && response.products.length > 0) {
          setUniversityFilterMaps(createFilterMaps(response.products));
        }
        
        // Cache the result
        await cacheProducts(UNIVERSITY_PRODUCTS_CACHE_KEY, response, userUniversity);
        return;
      }
      
      // Regular cache-first approach if not force refreshing
      const cachedProducts = await getCachedProducts(UNIVERSITY_PRODUCTS_CACHE_KEY, userUniversity);
      
      if (cachedProducts) {
        // Use cached data
        setUniversityProducts(cachedProducts.products || []);
        setUniversityProductsOriginal(cachedProducts.products || []);
        setTotalUniversityCount(cachedProducts.products?.length || 0);
        
        // Create filter maps for optimization
        if (cachedProducts.products && cachedProducts.products.length > 0) {
          setUniversityFilterMaps(createFilterMaps(cachedProducts.products));
        }
      } else {
        // Fetch from API
        console.log(`[HomeScreen] Fetching fresh university products: univ=${userUniversity}`);
        const response = await getProductsByUniversity(userUniversity);
        
        setUniversityProducts(response.products || []);
        setUniversityProductsOriginal(response.products || []);
        setTotalUniversityCount(response.products?.length || 0);
        
        // Create filter maps for optimization
        if (response.products && response.products.length > 0) {
          setUniversityFilterMaps(createFilterMaps(response.products));
        }
        
        // Cache the result
        await cacheProducts(UNIVERSITY_PRODUCTS_CACHE_KEY, response, userUniversity);
      }
    } catch (err) {
      console.error('Error loading university products:', err);
      setError('Failed to load university products');
    } finally {
      setLoadingUniversity(false);
    }
  }, [userUniversity, shouldForceRefresh, cacheProducts, getCachedProducts]);

  // Update loadCityProducts to check for force refresh synchronously
  const loadCityProducts = useCallback(async () => {
    if (!userCity) return;
    
    try {
      setLoadingCity(true);
      
      // Check if force refresh is enabled - direct check
      if (shouldForceRefresh) {
        console.log(`[HomeScreen] Force refresh enabled, fetching fresh city products`);
        const response = await getProductsByCity(userCity);
        
        setCityProducts(response.products || []);
        setCityProductsOriginal(response.products || []);
        
        // Create filter maps for optimization
        if (response.products && response.products.length > 0) {
          setCityFilterMaps(createFilterMaps(response.products));
        }
        
        // Cache the result
        await cacheProducts(CITY_PRODUCTS_CACHE_KEY, response, undefined, userCity);
        return;
      }
      
      // Regular cache-first approach if not force refreshing
      const cachedProducts = await getCachedProducts(CITY_PRODUCTS_CACHE_KEY, undefined, userCity);
      
      if (cachedProducts) {
        // Use cached data
        setCityProducts(cachedProducts.products || []);
        setCityProductsOriginal(cachedProducts.products || []);
        
        // Create filter maps for optimization
        if (cachedProducts.products && cachedProducts.products.length > 0) {
          setCityFilterMaps(createFilterMaps(cachedProducts.products));
        }
      } else {
        // Fetch from API
        console.log(`[HomeScreen] Fetching fresh city products: city=${userCity}`);
        const response = await getProductsByCity(userCity);
        
        setCityProducts(response.products || []);
        setCityProductsOriginal(response.products || []);
        
        // Create filter maps for optimization
        if (response.products && response.products.length > 0) {
          setCityFilterMaps(createFilterMaps(response.products));
        }
        
        // Cache the result
        await cacheProducts(CITY_PRODUCTS_CACHE_KEY, response, undefined, userCity);
      }
    } catch (err) {
      console.error('Error loading city products:', err);
      setError('Failed to load city products');
    } finally {
      setLoadingCity(false);
    }
  }, [userCity, shouldForceRefresh, cacheProducts, getCachedProducts]);

  // Helper function to save products to cache
  const cacheProducts = async (key: string, products: any, university?: string, city?: string) => {
    try {
      const cacheKey = `${key}${university ? '_' + university : ''}${city ? '_' + city : ''}`;
      await AsyncStorage.setItem(
        cacheKey,
        JSON.stringify({
          data: products,
          timestamp: Date.now()
        })
      );
      
      console.log(`[HomeScreen] Cached ${products.length} products with key: ${cacheKey}`);
      
      // If this was a forced refresh, clear the flag now that we've refreshed the data
      if (shouldForceRefresh) {
        console.log('[HomeScreen] Clearing force refresh flag after refresh');
        await AsyncStorage.setItem(FORCE_REFRESH_KEY, 'false');
        setShouldForceRefresh(false);
        setRefreshCount(0);
      }
    } catch (error) {
      console.error(`[HomeScreen] Error caching products:`, error);
    }
  };

  // Helper function to get products from cache
  const getCachedProducts = async (key: string, university?: string, city?: string) => {
    try {
      // Check for force refresh flag in both state and AsyncStorage
      // This is a safety check to ensure we're definitely bypassing cache when needed
      if (shouldForceRefresh) {
        console.log(`[HomeScreen] Force refresh is enabled in state, skipping cache for ${key}`);
        return null;
      }
      
      // Double-check AsyncStorage as well (in case the state update hasn't propagated)
      const forceRefreshValue = await AsyncStorage.getItem(FORCE_REFRESH_KEY);
      if (forceRefreshValue === 'true') {
        console.log(`[HomeScreen] Force refresh flag found in storage, skipping cache for ${key}`);
        // Update local state to match storage
        if (!shouldForceRefresh) {
          setShouldForceRefresh(true);
        }
        return null;
      }
      
      // If we get here, it's safe to check the cache
      const cacheKey = `${key}${university ? '_' + university : ''}${city ? '_' + city : ''}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        const isExpired = Date.now() - timestamp > PRODUCTS_CACHE_EXPIRY_TIME;
        
        if (!isExpired) {
          console.log(`[HomeScreen] Using cached products from: ${cacheKey}`);
          return data;
        } else {
          console.log(`[HomeScreen] Cache expired for: ${cacheKey}`);
        }
      }
      return null;
    } catch (error) {
      console.error(`[HomeScreen] Error retrieving cached products:`, error);
      return null;
    }
  };

  // Define SearchPaginationFooter component
  const SearchPaginationFooter: React.FC<{
    isLoadingMore: boolean;
    hasMore: boolean;
    onLoadMore: () => void;
    error?: string | null;
  }> = ({ isLoadingMore, hasMore, onLoadMore, error }) => {
    if (error) {
      return (
        <View style={styles.paginationFooter}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onLoadMore}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (!hasMore) {
      return <View style={styles.paginationFooter}>
        <Text style={{ color: '#666' }}>No more products</Text>
      </View>;
    }
    
    return (
      <View style={styles.paginationFooter}>
        {isLoadingMore ? (
          <ActivityIndicator size="small" color="#f7b305" />
        ) : (
          <TouchableOpacity style={styles.loadMoreButton} onPress={onLoadMore}>
            <Text style={styles.loadMoreButtonText}>Load More</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const loadFilteredUniversityProducts = useCallback(async (filters: ProductFilters) => {
    if (!userUniversity) return;
    
    try {
      // Use API to fetch university products with filters
      const response = await getProductsByUniversity(userUniversity, filters);
      if (response && typeof response === 'object' && 'products' in response) {
        setUniversityProducts(response.products || []);
      } else {
        console.error('Unexpected response format from loadFilteredUniversityProducts:', response);
        setUniversityProducts([]);
      }
    } catch (err) {
      console.error('Error loading filtered university products:', err);
      setError('Failed to load university products with filters');
    }
  }, [userUniversity]);

  const loadFilteredCityProducts = useCallback(async (filters: ProductFilters) => {
    if (!userCity) return;
    
    try {
      // Use API to fetch city products with filters
      const response = await getProductsByCity(userCity, filters);
      if (response && typeof response === 'object' && 'products' in response) {
        setCityProducts(response.products || []);
      } else {
        console.error('Unexpected response format from loadFilteredCityProducts:', response);
        setCityProducts([]);
      }
    } catch (err) {
      console.error('Error loading filtered city products:', err);
      setError('Failed to load city products with filters');
    }
  }, [userCity]);

  // Add refresh handling
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Add refresh counter
  const [refreshCount, setRefreshCount] = useState<number>(0);
  
  // Add a forceRefresh flag
  const [shouldForceRefresh, setShouldForceRefresh] = useState(false);

  // When the component mounts, check if we should force refresh
  useEffect(() => {
    const checkForceRefreshFlag = async () => {
      try {
        const forceRefreshValue = await AsyncStorage.getItem(FORCE_REFRESH_KEY);
        if (forceRefreshValue === 'true') {
          console.log('[HomeScreen] Force refresh flag is set, will skip cache');
          setShouldForceRefresh(true);
        }
      } catch (err) {
        console.error('Error checking force refresh flag:', err);
      }
    };
    
    checkForceRefreshFlag();
  }, []);

  // Helper function to clear all product cache keys
  const clearProductCaches = useCallback(async () => {
    try {
      console.log('[HomeScreen] Clearing all product cache keys');
      
      // Build a list of cache keys to clear
      const keysToRemove = [];
      
      // Add featured products cache key
      if (userUniversity && userCity) {
        keysToRemove.push(`${FEATURED_PRODUCTS_CACHE_KEY}${userUniversity}_${userCity}`);
      }
      
      // Add new arrivals cache key
      if (userUniversity) {
        keysToRemove.push(`${NEW_ARRIVALS_CACHE_KEY}${userUniversity}`);
      }
      
      // Add university products cache key
      if (userUniversity) {
        keysToRemove.push(`${UNIVERSITY_PRODUCTS_CACHE_KEY}${userUniversity}`);
      }
      
      // Add city products cache key
      if (userCity) {
        keysToRemove.push(`${CITY_PRODUCTS_CACHE_KEY}${userCity}`);
      }
      
      // Remove all identified keys
      await Promise.all(keysToRemove.map(key => AsyncStorage.removeItem(key)));
      
      console.log(`[HomeScreen] Cleared ${keysToRemove.length} cache keys`);
    } catch (error) {
      console.error('[HomeScreen] Error clearing product caches:', error);
    }
  }, [userUniversity, userCity]);

  // Update handleRefresh to use the force refresh flag directly
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    
    // Increment refresh counter locally
    const newCount = refreshCount + 1;
    setRefreshCount(newCount);
    console.log(`[HomeScreen] Refresh counter incremented to ${newCount}`);
    
    // After 2 refreshes, force refresh all data
    let needsForceRefresh = false;
    if (newCount >= 2) {
      console.log('[HomeScreen] Setting force refresh to bypass cache');
      setShouldForceRefresh(true);
      needsForceRefresh = true;
      
      // Also store in AsyncStorage for persistence
      await AsyncStorage.setItem(FORCE_REFRESH_KEY, 'true').catch(err => {
        console.error('Error saving force refresh flag:', err);
      });
      
      // IMPORTANT: Immediately clear all cache to force fresh data
      await clearProductCaches();
      
      // Add a small delay to ensure the state update has taken effect
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Also increment search refresh counter
    if (search && search.incrementSearchRefreshCount) {
      search.incrementSearchRefreshCount();
    }
    
    try {
      // Check refresh status for logging
      console.log(`[HomeScreen] Starting refresh with forceRefresh=${needsForceRefresh}`);
      
      await Promise.all([
        loadFeaturedProducts(),
        loadNewArrivals(),
        loadUniversityProducts(),
        loadCityProducts()
      ]);
      
      // Reset force refresh flag after successfully loading fresh data
      if (needsForceRefresh) {
        console.log('[HomeScreen] Resetting force refresh flag after successful refresh');
        setShouldForceRefresh(false);
        setRefreshCount(0);
        
        // Update in AsyncStorage
        await AsyncStorage.setItem(FORCE_REFRESH_KEY, 'false').catch(err => {
          console.error('Error saving force refresh flag:', err);
        });
      }
    } catch (err) {
      console.error('Error refreshing products:', err);
      setError('Failed to refresh products');
    } finally {
      setIsRefreshing(false);
    }
  }, [loadFeaturedProducts, loadNewArrivals, loadUniversityProducts, loadCityProducts, search, refreshCount, clearProductCaches]);
  
  // Add missing handlers
  const handleProductPress = useCallback((product: Product) => {
    // Navigate to product detail
    nav.navigate('ProductInfoPage', { product });
  }, [nav]);
  
  const toggleWishlist = useCallback((id: string) => {
    // Toggle product in wishlist
    setWishlist(prev => {
      if (prev.includes(id)) {
        return prev.filter(itemId => itemId !== id);
      } else {
        return [...prev, id];
      }
    });
  }, []);
  
  const handleCategoryPress = useCallback((category: Category) => {
    // Navigate to category products
    nav.navigate('CategoryProducts', {
      categoryId: category.id,
      categoryName: category.name,
      userUniversity: userUniversity,
      userCity: userCity
    });
  }, [nav, userUniversity, userCity]);

  // Add the message seller handler function
  const handleMessageSeller = useCallback((product: Product) => {
    // Get seller information from the product
    const sellerName = product.sellerName || (product.seller && product.seller.name) || 'Seller';
    const sellerEmail = product.email || (product.seller && (product.seller as any).email);
    
    if (!sellerEmail) {
      Alert.alert('Error', 'Seller contact information is not available');
      return;
    }
    
    console.log(`[HomeScreen] Messaging seller: ${sellerName} (${sellerEmail})`);
    
    // Navigate to the Firebase Chat screen
    nav.navigate('FirebaseChatScreen', { 
      recipientEmail: sellerEmail,
      recipientName: sellerName
    });
  }, [nav]);

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
              {userProfileData?.userphoto ? (
                <Image 
                  source={{ uri: userProfileData.userphoto }} 
                  style={styles.profileCircle}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.profileCircle, { backgroundColor: '#f7b305' }]}>
                  <Text style={[styles.profileText, { color: 'black' }]}>{getInitial()}</Text>
                </View>
              )}
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
              value={search.searchQuery}
              onChangeText={(text) => {
                search.setSearchQuery(text);
                // Show recent searches when the user starts typing
                if (text.length > 0 && search.recentSearches.length > 0) {
                  search.setShowRecentSearches(true);
                } else {
                  search.setShowRecentSearches(false);
                }
                
                // Automatically clear search results when search box is emptied
                if (!text) {
                  search.setShowSearchResults(false);
                }
                // Remove the automatic debounced search trigger
              }}
              returnKeyType="search"
              onSubmitEditing={search.handleSearchButtonPress}
              placeholderTextColor="#999"
            />
            {search.searchQuery.length > 0 && (
              <TouchableOpacity 
                style={styles.clearButton} 
                onPress={search.handleClearSearch}
                activeOpacity={0.7}
              >
                <FontAwesome name="times-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
            {/* Add explicit search button */}
            {search.searchQuery.length > 0 && (
              <TouchableOpacity 
                style={styles.searchButton} 
                onPress={search.handleSearchButtonPress}
                activeOpacity={0.7}
              >
                <MaterialIcons name="search" size={20} color="white" />
              </TouchableOpacity>
            )}
          </View>

          {/* Recent Searches Dropdown */}
          {search.showRecentSearches && search.recentSearches.length > 0 && (
            <View style={styles.recentSearchesDropdown}>
              <View style={styles.recentSearchesHeader}>
                <Text style={styles.recentSearchesTitle}>Recent Searches</Text>
                <TouchableOpacity 
                  onPress={() => search.setShowRecentSearches(false)}
                  style={styles.closeRecentButton}
                >
                  <MaterialIcons name="close" size={18} color="#666" />
                </TouchableOpacity>
              </View>
              <ScrollView 
                style={styles.recentSearchesList}
                keyboardShouldPersistTaps="handled"
              >
                {search.recentSearches.map((term, index) => (
                  <TouchableOpacity
                    key={`recent-${index}`}
                    style={styles.recentSearchItem}
                    onPress={() => search.handleSelectRecentSearch(term)}
                  >
                    <FontAwesome name="history" size={16} color="#999" style={styles.recentSearchIcon} />
                    <Text style={styles.recentSearchText}>{term}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
        
        {/* Row with text and buttons */}
        <View style={styles.rowContainer}>
          <Text style={[styles.plainText, { color: 'black' }]}>
            {search.showSearchResults ? 'Search Results' : 'All Items'}
          </Text>
          <View style={styles.buttonContainer}>
            <View style={{ position: 'relative' }}>
              <TouchableOpacity 
                style={[
                  styles.smallButton, 
                  styles.sortButton, 
                  { backgroundColor: '#f7b305', borderColor: '#ddd' },
                  search.selectedSort !== 'default' && styles.activeFilterButton
                ]}
                onPress={handleSortButtonClick}
                activeOpacity={0.7}
              >
                <Text style={[styles.buttonText, { color: 'black' }]}>
                  {search.selectedSort !== 'default' ? ` Sort: ${sortOptions.find(o => o.id === search.selectedSort)?.label || 'Custom'}` : ' Sort'}
                </Text>
                <Icon name="sort" size={14} color="black" />
              </TouchableOpacity>
              
              {/* Enhanced Sort Dropdown */}
              {sortDropdownVisible && (
                <View style={styles.dropdownContainer}>
                  <EnhancedDropdown
                    items={sortOptions}
                    selectedItems={[search.selectedSort]}
                    onSelect={(sortId) => {
                      search.setSelectedSort(sortId);
                      setSortDropdownVisible(false);
                      if (search.showSearchResults) {
                        search.handleSearch();
                      } else {
                        handleSortOptionSelect(sortId);
                      }
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
                  search.selectedFilters.length > 0 && styles.activeFilterButton
                ]}
                onPress={handleFilterButtonClick}
                activeOpacity={0.7}
              >
                <Text style={[styles.buttonText, { color: 'black' }]}>
                  {search.selectedFilters.length > 0 ? ` Filter (${search.selectedFilters.length})` : ' Filter'}
                </Text>
                <Icon name="filter" size={14} color="black" />
              </TouchableOpacity>
              
              {/* Enhanced Filter Dropdown */}
              {filterDropdownVisible && (
                <View style={styles.dropdownContainer}>
                  <EnhancedDropdown
                    items={filterOptions}
                    selectedItems={search.selectedFilters}
                    onSelect={(filterId) => {
                      // Update filters in search hook
                      const isSelected = search.selectedFilters.includes(filterId);
                      const newFilters = isSelected
                        ? search.selectedFilters.filter(id => id !== filterId)
                        : [...search.selectedFilters, filterId];
                      
                      search.setSelectedFilters(newFilters);
                      
                      if (search.showSearchResults) {
                        // For search results, re-run search with new filters instead of directly manipulating results
                        search.handleSearch();
                      } else {
                        // Apply to product listings
                        handleFilterOptionSelect(filterId);
                      }
                    }}
                    multiSelect={true}
                    title="Filter by"
                    onClose={() => setFilterDropdownVisible(false)}
                  />
                </View>
              )}
            </View>
            
            {/* Clear filters button - only show if filters are applied */}
            {(search.selectedFilters.length > 0 || search.selectedSort !== 'default') && (
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => {
                  search.setSelectedFilters([]);
                  search.setSelectedSort('default');
                  handleClearFilters();
                  if (search.showSearchResults) {
                    search.handleSearch();
                  }
                }}
                activeOpacity={0.7}
              >
                <MaterialIcons name="clear" size={14} color="black" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {/* Show either search results or normal content */}
        {search.showSearchResults ? (
          <View style={styles.searchResultsContainer}>
            {search.isSearching ? (
              <View style={styles.searchLoadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Searching...</Text>
              </View>
            ) : search.searchError ? (
              <View style={styles.searchErrorContainer}>
                <Text style={styles.errorText}>Error: {search.searchError}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={search.handleSearch}>
                  <Text style={styles.retryButtonText}>Retry Search</Text>
                </TouchableOpacity>
              </View>
            ) : search.searchResults.length === 0 ? (
              <View style={styles.noResultsContainer}>
                <FontAwesome name="search" size={40} color="#ccc" />
                <Text style={styles.noResultsText}>No products found</Text>
                <Text style={styles.noResultsSubText}>Try a different search or filter</Text>
              </View>
            ) : (
              <>
                <FlatList
                  data={search.searchResults}
                  renderItem={({ item }) => (
                    <ProductItem
                      item={item}
                      wishlist={wishlist}
                      onToggleWishlist={toggleWishlist}
                      onPress={handleProductPress}
                      onMessageSeller={handleMessageSeller}
                    />
                  )}
                  keyExtractor={item => item.id.toString()}
                  numColumns={2}
                  contentContainerStyle={styles.productsGrid}
                  ListFooterComponent={
                    <SearchPaginationFooter
                      isLoadingMore={search.isLoadingMore}
                      hasMore={search.hasMoreSearchResults}
                      onLoadMore={search.handleLoadMoreSearchResults}
                      error={search.loadMoreError}
                    />
                  }
                />
                {search.searchResults.length > 0 && (
                  <View style={styles.searchStatsContainer}>
                    <Text style={styles.searchStatsText}>
                      Showing {search.searchResults.length} results • Page {search.currentPage+1} of {search.totalPages}
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
                onMessageSeller={handleMessageSeller}
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
                  onMessageSeller={handleMessageSeller}
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
                  onMessageSeller={handleMessageSeller}
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
                onMessageSeller={handleMessageSeller}
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
    paddingHorizontal: 1,
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f2f2f2',
    borderRadius: 25,
    alignItems: 'center',
    paddingHorizontal: 15,
    height: 45,
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
    backgroundColor: '#f7b305',
    padding: 8,
    borderRadius: 20,
    marginLeft: 6,
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
    fontFamily: 'Montserrat',
    marginLeft: 5,
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
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.5,
      },
      android: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        backgroundColor: 'white',
      }
    }),
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
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        elevation: 0,
      }
    }),
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
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        elevation: 0,
      }
    }),
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
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.27,
        shadowRadius: 4.65,
      },
      android: {
        elevation: 3,
        borderWidth: 1,
        borderColor: '#e0e0e0',
      }
    }),
  },
  enhancedDropdown: {
    width: Math.min(260, width * 0.6),
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
    ...Platform.select({
      android: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
      }
    }),
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
    backgroundColor: 'black',
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
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f7b305',
    marginRight: 8,
    marginLeft: 8,
  },
  clearFiltersText: {
    color: '#f7b305',
    fontSize: 12,
    marginRight: 4,
    fontWeight: '500',
  },
  messageButton: {
    position: 'absolute',
    top: 33,
    right: 10,
    backgroundColor: 'white',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 0,
      }
    }),
  },
  recentSearchesDropdown: {
    position: 'absolute',
    top: 50,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.27,
        shadowRadius: 4.65,
      },
      android: {
        elevation: 3,
        borderWidth: 1,
        borderColor: '#e0e0e0',
      }
    }),
  },
  recentSearchesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  recentSearchesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  closeRecentButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  recentSearchesList: {
    maxHeight: 200,
  },
  recentSearchItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentSearchIcon: {
    marginRight: 10,
  },
  recentSearchText: {
    fontSize: 14,
    color: '#333',
  },
});

export default HomeScreen; 