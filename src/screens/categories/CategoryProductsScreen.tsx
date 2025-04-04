import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { 
  View, 
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  SafeAreaView,
  Platform,
  StatusBar,
  RefreshControl,
  Dimensions,
  TextInput
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

// Import types
import { CategoryProductsScreenProps } from '../../types/navigation.types';

// Import API methods
import { 
  getProductsByCategory,
  getProductsByUniversity,
  getProductsByCity,
  getFeaturedProducts,
  getNewArrivals,
  Product,
  ProductFilters
} from '../../api/products';

// Import context
import { useAuth } from '../../contexts';
import Icon from 'react-native-vector-icons/FontAwesome';

// Cache constants
const PRODUCTS_CACHE_KEY = 'products_cache_';
const PRODUCTS_CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes

// Get device dimensions for responsive layouts
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_GAP = 10;
const NUM_COLUMNS = 2;
const PRODUCT_CARD_WIDTH = (SCREEN_WIDTH - (COLUMN_GAP * (NUM_COLUMNS + 1))) / NUM_COLUMNS;

interface SortOption {
  id: string;
  label: string;
}

interface FilterOption {
  id: string;
  label: string;
}

// Memoized ProductItem component for better performance
const ProductItem = React.memo<{
  item: Product;
  wishlist: string[];
  onToggleWishlist: (id: string) => void;
  onPress: (product: Product) => void;
}>(({ item, wishlist, onToggleWishlist, onPress }) => {
  const [imageError, setImageError] = useState(false);
  
  // Get the appropriate image URL - primaryImage, first image from images array, or placeholder
  let imageUrl = 'https://via.placeholder.com/150?text=No+Image';
  
  if (!imageError) {
    if (item.primaryImage && item.primaryImage.startsWith('http')) {
      imageUrl = item.primaryImage;
    } else if (item.imageUrls && item.imageUrls.length > 0) {
      imageUrl = item.imageUrls[0];
    } else if (item.images && item.images.length > 0) {
      // Try to derive a proper S3 URL if it looks like a filename
      const img = item.images[0];
      if (img && typeof img === 'string' && !img.startsWith('http')) {
        imageUrl = `https://trustudsel-products.s3.amazonaws.com/${img}`;
      } else if (img && typeof img === 'string') {
        imageUrl = img;
      }
    }
  }
  
  // Format price display
  const formattedPrice = `$${item.price}`;
  
  // Memoize the wishlist status to prevent unnecessary re-renders
  const isInWishlist = wishlist.includes(item.id);
  
  // Handle the wishlist toggle specifically for this item
  const handleWishlistToggle = useCallback(() => {
    onToggleWishlist(item.id);
  }, [item.id, onToggleWishlist]);
  
  // Handle the product press
  const handlePress = useCallback(() => {
    onPress(item);
  }, [item, onPress]);
  
  // Handle image load error
  const handleImageError = useCallback(() => {
    console.log(`[ProductItem] Image load error for ${item.id}: ${imageUrl}`);
    setImageError(true);
  }, [item.id, imageUrl]);
  
  // Get badge text based on product condition
  const getBadgeText = () => {
    if (item.sellingtype === 'rent') return 'RENT';
    if (item.productage === 'brand-new') return 'NEW';
    return null;
  };
  
  const badgeText = getBadgeText();
  
  return (
    <TouchableOpacity 
      style={styles.productCard}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: imageUrl }} 
          style={styles.productImagePlaceholder}
          resizeMode="cover"
          onError={handleImageError}
        />
        {badgeText && (
          <View style={[
            styles.badge, 
            badgeText === 'RENT' ? styles.rentBadge : styles.newBadge
          ]}>
            <Text style={styles.badgeText}>{badgeText}</Text>
          </View>
        )}
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.productPrice}>{formattedPrice}</Text>
        {item.productage && (
          <Text style={styles.productCondition}>
            {item.productage.replace(/-/g, ' ')}
          </Text>
        )}
        <TouchableOpacity 
          style={styles.wishlistButton} 
          onPress={handleWishlistToggle}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <FontAwesome 
            name={isInWishlist ? "heart" : "heart-o"}
            size={20} 
            color="red" 
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

// Create a separate dropdown component to improve modularity
const SortDropdown = React.memo<{
  visible: boolean;
  options: SortOption[];
  selectedOption: string;
  onSelect: (id: string) => void;
}>(({ visible, options, selectedOption, onSelect }) => {
  if (!visible) return null;
  
  return (
    <View style={styles.dropdown}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.id}
          style={[
            styles.dropdownItem,
            selectedOption === option.id && styles.selectedDropdownItem
          ]}
          onPress={() => onSelect(option.id)}
        >
          <Text 
            style={[
              styles.dropdownItemText,
              selectedOption === option.id && styles.selectedDropdownItemText
            ]}
          >
            {option.label}
          </Text>
          {selectedOption === option.id && (
            <MaterialIcons name="check" size={18} color="#f7b305" />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
});

// Create a separate dropdown component for filters
const FilterDropdown = React.memo<{
  visible: boolean;
  options: FilterOption[];
  selectedFilters: string[];
  onSelect: (id: string) => void;
}>(({ visible, options, selectedFilters, onSelect }) => {
  if (!visible) return null;
  
  return (
    <View style={styles.dropdown}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.id}
          style={[
            styles.dropdownItem,
            selectedFilters.includes(option.id) && styles.selectedDropdownItem
          ]}
          onPress={() => onSelect(option.id)}
        >
          <Text 
            style={[
              styles.dropdownItemText,
              selectedFilters.includes(option.id) && styles.selectedDropdownItemText
            ]}
          >
            {option.label}
          </Text>
          {selectedFilters.includes(option.id) && (
            <MaterialIcons name="check" size={18} color="#f7b305" />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
});

// EmptyState component for better code organization
const EmptyState = React.memo<{ 
  message: string, 
  subMessage: string 
}>(({ message, subMessage }) => (
  <View style={styles.emptyContainer}>
    <MaterialIcons name="search-off" size={64} color="#cccccc" />
    <Text style={styles.emptyText}>{message}</Text>
    <Text style={styles.emptySubText}>{subMessage}</Text>
  </View>
));

// Skeleton loader for product cards during loading
const ProductSkeletonLoader = React.memo(() => {
  return (
    <View style={[styles.productCard, {backgroundColor: '#f2f2f2'}]}>
      <View style={[styles.productImagePlaceholder, {backgroundColor: '#e0e0e0'}]} />
      <View style={styles.productInfo}>
        <View style={[styles.skeletonLine, {width: '70%', height: 14, marginBottom: 8}]} />
        <View style={[styles.skeletonLine, {width: '40%', height: 18, marginBottom: 4}]} />
        <View style={[styles.skeletonLine, {width: '50%', height: 12}]} />
      </View>
    </View>
  );
});

// Loading skeleton for products grid
const ProductsGridSkeleton = React.memo(() => {
  return (
    <View style={styles.productList}>
      {/* Create rows of skeleton items */}
      <View style={styles.columnWrapper}>
        <ProductSkeletonLoader />
        <ProductSkeletonLoader />
      </View>
      <View style={styles.columnWrapper}>
        <ProductSkeletonLoader />
        <ProductSkeletonLoader />
      </View>
      <View style={styles.columnWrapper}>
        <ProductSkeletonLoader />
        <ProductSkeletonLoader />
      </View>
    </View>
  );
});

// ErrorState component
const ErrorState = React.memo<{ 
  error: string, 
  onRetry: () => void 
}>(({ error, onRetry }) => (
  <View style={styles.errorContainer}>
    <Text style={styles.errorText}>{error}</Text>
    <TouchableOpacity 
      style={styles.retryButton}
      onPress={onRetry}
    >
      <Text style={styles.retryButtonText}>Retry</Text>
    </TouchableOpacity>
  </View>
));

// SearchBar component for product search
const SearchBar = React.memo<{
  value: string;
  onChangeText: (text: string) => void;
  onSubmitEditing: () => void;
}>(({ value, onChangeText, onSubmitEditing }) => {
  return (
    <View style={styles.searchBarContainer}>
      <View style={styles.searchInputContainer}>
        <MaterialIcons name="search" size={24} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor="#888"
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmitEditing}
          returnKeyType="search"
          autoCapitalize="none"
        />
        {value.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={() => onChangeText('')}
          >
            <MaterialIcons name="clear" size={18} color="#888" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

// BackToTop button component
const BackToTopButton = React.memo<{
  visible: boolean;
  onPress: () => void;
}>(({ visible, onPress }) => {
  if (!visible) return null;
  
  return (
    <TouchableOpacity 
      style={styles.backToTopButton}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <MaterialIcons name="keyboard-arrow-up" size={24} color="white" />
    </TouchableOpacity>
  );
});

// Main component
const CategoryProductsScreen: React.FC<CategoryProductsScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { categoryName, categoryId, userUniversity: routeUniversity, userCity: routeCity } = route.params;
  
  // Determine what type of products to load based on the category name
  const isFeatured = categoryName === 'Featured Products';
  const isNewArrivals = categoryName === 'New Arrivals';
  const isUniversity = categoryName.includes('University') || categoryName.endsWith('Products');
  const isCity = !isUniversity && !isFeatured && !isNewArrivals && categoryId === 0;
  
  // FlatList ref for scrolling to top
  const flatListRef = useRef<FlatList<Product>>(null);
  
  // State variables
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [totalCount, setTotalCount] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  // Sort and filter states
  const [isSortDropdownVisible, setIsSortDropdownVisible] = useState(false);
  const [selectedSortOption, setSelectedSortOption] = useState<string>('default');
  const [isFilterDropdownVisible, setIsFilterDropdownVisible] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  // Extract user location data - prioritize route params over user context
  const userUniversity = routeUniversity || user?.university || '';
  const userCity = routeCity || user?.city || '';
  const userZipcode = user?.zipcode || '';

  // Memoize sort options to prevent recreation on each render
  const sortOptions = useMemo<SortOption[]>(() => [
    { id: 'default', label: 'Default' },
    { id: 'price_low_high', label: 'Price: Low to High' },
    { id: 'price_high_low', label: 'Price: High to Low' },
    { id: 'newest', label: 'Newest First' },
    { id: 'popularity', label: 'Popularity' },
  ], []);

  // Memoize filter options
  const filterOptions = useMemo<FilterOption[]>(() => [
    { id: 'new', label: 'Brand New' },
    { id: 'used', label: 'Used' },
    { id: 'rent', label: 'For Rent' },
    { id: 'sell', label: 'For Sale' },
    { id: 'free', label: 'Free Items' },
  ], []);

  // Create a simple hash function for cache keys
  const simpleHash = useCallback((str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }, []);

  // Memoize filters to prevent recreation on each render
  const apiFilters = useMemo<ProductFilters>(() => {
    const filters: ProductFilters = {
      sortBy: selectedSortOption === 'price_low_high' ? 'price_low_high' : 
              selectedSortOption === 'price_high_low' ? 'price_high_low' : 
              selectedSortOption === 'newest' ? 'newest' : 
              selectedSortOption === 'popularity' ? 'popularity' : undefined,
    };
    
    // Add condition filters
    if (selectedFilters.includes('new')) {
      filters.condition = 'brand-new';
    } else if (selectedFilters.includes('used')) {
      filters.condition = 'used';
    }
    
    // Add selling type filters
    if (selectedFilters.includes('rent')) {
      filters.sellingType = 'rent';
    } else if (selectedFilters.includes('sell')) {
      filters.sellingType = 'sell';
    }
    
    // Add search query if present
    if (searchQuery.trim()) {
      filters.query = searchQuery.trim();
    }
    
    // If user has university, filter by it
    if (userUniversity) {
      filters.university = userUniversity;
    }
    
    // If user has city, filter by it
    if (userCity) {
      filters.city = userCity;
    }
    
    // Add zipcode filter for nearby products if available
    if (userZipcode) {
      filters.zipcode = userZipcode;
    }
    
    return filters;
  }, [selectedSortOption, selectedFilters, userUniversity, userCity, userZipcode, searchQuery]);

  // At the top of the CategoryProductsScreen component
  // Add a new initialLoad ref to track the first load
  const isInitialLoadRef = useRef(true);

  // Load category products based on the specific type
  const loadCategoryProducts = useCallback(async () => {
    console.log(`[CategoryProducts] Loading products for ${categoryName}`);
    setLoading(true);
    setError(null);
    isInitialLoadRef.current = false;
    
    try {
      // Create a cache key that includes all filter parameters
      const filterString = JSON.stringify({
        ...apiFilters,
        isFeatured,
        isNewArrivals,
        isUniversity,
        isCity
      });
      const cacheKey = `${PRODUCTS_CACHE_KEY}${categoryName}_${simpleHash(filterString)}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (cachedData) {
        try {
          const { data, timestamp } = JSON.parse(cachedData);
          const isExpired = Date.now() - timestamp > PRODUCTS_CACHE_EXPIRY_TIME;
          
          // If cache is not expired, use cached data
          if (!isExpired && Array.isArray(data) && data.length > 0) {
            console.log(`[CategoryProducts] Using cached data (${data?.length || 0} products)`);
            setProducts(data);
            setTotalCount(data.length);
            setLoading(false);
            return;
          } else {
            console.log('[CategoryProducts] Cache expired or empty, fetching new data');
          }
        } catch (cacheError) {
          console.warn(`[CategoryProducts] Error parsing cache:`, cacheError);
          // Continue with API call
        }
      } else {
        console.log('[CategoryProducts] No cache found, fetching from API');
      }
      
      let result;
      // Determine which API to call based on the type
      if (isFeatured) {
        // Call featured products API
        console.log(`[CategoryProducts] Fetching featured products with university: "${userUniversity}" and city: "${userCity}"`);
        result = await getFeaturedProducts(userUniversity, userCity);
      } else if (isNewArrivals) {
        // Call new arrivals API
        console.log(`[CategoryProducts] Fetching new arrivals with university: "${userUniversity}"`);
        if (!userUniversity) {
          throw new Error('University is required for new arrivals');
        }
        result = await getNewArrivals(userUniversity);
      } else if (isUniversity && userUniversity) {
        // Call university products API
        console.log(`[CategoryProducts] Fetching university products for: "${userUniversity}"`);
        result = await getProductsByUniversity(userUniversity, apiFilters);
      } else if (isCity && userCity) {
        // Call city products API
        console.log(`[CategoryProducts] Fetching city products for: "${userCity}"`);
        result = await getProductsByCity(userCity, apiFilters);
      } else {
        // Default to category products
        console.log(`[CategoryProducts] Fetching category products for: "${categoryName.toLowerCase()}"`);
        result = await getProductsByCategory(categoryName.toLowerCase(), apiFilters);
      }
      
      // Handle different response formats from different APIs
      let productsList: Product[] = [];
      if (Array.isArray(result)) {
        productsList = result;
        setTotalCount(result.length);
      } else if (result && result.products) {
        productsList = result.products;
        setTotalCount(result.totalItems || result.products.length);
      }
      
      setProducts(productsList);
      
      // Save to cache
      await AsyncStorage.setItem(cacheKey, JSON.stringify({
        data: productsList,
        timestamp: Date.now()
      }));
    } catch (err: any) {
      console.error('[CategoryProducts] Error loading products:', err);
      setError(err?.message || 'Failed to load products');
      setProducts([]);
      setTotalCount(0);
    } finally {
      console.log('[CategoryProducts] FINISHED loading products, setting loading=false');
      setLoading(false);
    }
  }, [
    apiFilters, 
    categoryName, 
    simpleHash, 
    userUniversity, 
    userCity,
    isFeatured,
    isNewArrivals,
    isUniversity,
    isCity
  ]);

  // Force a complete refresh of products (ignoring loading state)
  const forceRefreshProducts = useCallback(() => {
    console.log('[CategoryProducts] Forcing complete refresh of products');
    // Reset loading state and force a new load
    isInitialLoadRef.current = true;
    setLoading(false);
    setTimeout(() => {
      loadCategoryProducts();
    }, 100);
  }, [loadCategoryProducts]);

  // Handle search submission
  const handleSearchSubmit = useCallback(() => {
    console.log('[CategoryProducts] Search submitted with query:', searchQuery);
    // Force reload of products with current search query
    forceRefreshProducts();
  }, [forceRefreshProducts, searchQuery]);

  // Handle search text change
  const handleSearchChange = useCallback((text: string) => {
    console.log('[CategoryProducts] Search query changed:', text);
    setSearchQuery(text);
    
    // If the user clears the search, reload with empty query
    if (text === '' && searchQuery !== '') {
      console.log('[CategoryProducts] Search cleared, reloading products');
      forceRefreshProducts();
    }
  }, [forceRefreshProducts, searchQuery]);

  // Handle when user clears all filters
  const handleClearFilters = useCallback(() => {
    console.log('[CategoryProducts] Clearing all filters');
    setSelectedSortOption('default');
    setSelectedFilters([]);
    setSearchQuery('');
    
    // Force complete refresh after clearing filters
    forceRefreshProducts();
  }, [forceRefreshProducts]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadCategoryProducts().finally(() => {
      setRefreshing(false);
    });
  }, [loadCategoryProducts]);

  const toggleWishlist = useCallback((id: string) => {
    setWishlist(prevWishlist => 
      prevWishlist.includes(id) 
        ? prevWishlist.filter(itemId => itemId !== id)
        : [...prevWishlist, id]
    );
  }, []);

  const handleProductPress = useCallback((product: Product) => {
    navigation.navigate('ProductInfoPage', { 
      product: {
        ...product,
        id: product.id,
        sellerName: product.sellerName || product.seller?.name,
        seller: product.seller || {
          id: product.email || 'unknown',
          name: product.sellerName || 'Unknown Seller'
        }
      },
      productId: product.id.toString()
    });
  }, [navigation]);

  // Sort and filter handlers
  const handleSortOptionSelect = useCallback((optionId: string) => {
    console.log(`[CategoryProducts] Sort option selected: ${optionId}`);
    setSelectedSortOption(optionId);
    setIsSortDropdownVisible(false);
    
    // Only force reload if the option actually changed
    if (optionId !== selectedSortOption) {
      forceRefreshProducts();
    }
  }, [forceRefreshProducts, selectedSortOption]);

  const handleFilterOptionSelect = useCallback((optionId: string) => {
    console.log(`[CategoryProducts] Filter option toggled: ${optionId}`);
    
    setSelectedFilters(prevFilters => {
      // Toggle the filter on/off
      const newFilters = prevFilters.includes(optionId)
        ? prevFilters.filter(id => id !== optionId)
        : [...prevFilters, optionId];
      
      // Force reload after filter change
      setTimeout(() => forceRefreshProducts(), 100);
      
      return newFilters;
    });
  }, [forceRefreshProducts]);

  const handleSortButtonClick = useCallback(() => {
    setIsSortDropdownVisible(prevState => !prevState);
    if (isFilterDropdownVisible) setIsFilterDropdownVisible(false);
  }, [isFilterDropdownVisible]);

  const handleFilterButtonClick = useCallback(() => {
    setIsFilterDropdownVisible(prevState => !prevState);
    if (isSortDropdownVisible) setIsSortDropdownVisible(false);
  }, [isSortDropdownVisible]);

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Update the useEffect to ensure products are loaded on mount
  useEffect(() => {
    console.log(`[CategoryProducts] Initial useEffect mount - triggering load`);
    // Force immediate load on mount
    const loadInitialData = async () => {
      try {
        setLoading(true);
        await loadCategoryProducts();
      } catch (error) {
        console.error('[CategoryProducts] Error in initial load:', error);
      }
    };
    
    loadInitialData();
    // Only run this on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Memoize renderItem function to optimize FlatList performance
  const renderItem = useCallback(({ item }: { item: Product }) => (
    <ProductItem 
      item={item} 
      wishlist={wishlist} 
      onToggleWishlist={toggleWishlist} 
      onPress={handleProductPress}
    />
  ), [wishlist, toggleWishlist, handleProductPress]);

  // Optimize keyExtractor to prevent recreating function on each render
  const keyExtractor = useCallback((item: Product) => item.id, []);

  // Memoize refreshControl to prevent recreating on each render
  const refreshControl = useMemo(() => (
    <RefreshControl 
      refreshing={refreshing} 
      onRefresh={handleRefresh}
      colors={['#f7b305']}
      tintColor="#f7b305"
      progressBackgroundColor="#fff"
      title="Pull to refresh"
      titleColor="#666"
    />
  ), [refreshing, handleRefresh]);

  // List footer component with loading indicator for pagination
  const ListFooterComponent = useMemo(() => (
    <View style={{ height: 80, justifyContent: 'center', alignItems: 'center' }}>
      {products.length > 0 && (
        <Text style={{ color: '#888', fontSize: 12, marginTop: 10 }}>
          {`Showing ${products.length} of ${totalCount} products`}
        </Text>
      )}
    </View>
  ), [products.length, totalCount]);

  // Add effect to reload products when filters change
  useEffect(() => {
    // Skip the first render since we're already loading in the initial effect
    if (!isInitialLoadRef.current) {
      console.log(`[CategoryProducts] Filters changed - reloading products`);
      loadCategoryProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiFilters]);

  // Handle scroll events to show/hide back to top button
  const handleScroll = useCallback((event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowBackToTop(offsetY > 300); // Show button when scrolled down 300px
  }, []);
  
  // Scroll to top function
  const scrollToTop = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleBackPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{categoryName}</Text>
          <View style={styles.rightPlaceholder} />
        </View>

        {/* Search bar component */}
        <SearchBar 
          value={searchQuery}
          onChangeText={handleSearchChange}
          onSubmitEditing={handleSearchSubmit}
        />

        {/* Filters row */}
        <View style={styles.filtersRow}>
          {/* Show total product count when available */}
          {!loading && !error && (
            <Text style={styles.totalCount}>
              {totalCount > 0 ? `${totalCount} products` : 'No products'}
            </Text>
          )}
          
          <View style={styles.filterButtonsContainer}>
            {/* Clear filters button - only visible if filters are applied */}
            {(selectedFilters.length > 0 || selectedSortOption !== 'default' || searchQuery.trim() !== '') && (
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={handleClearFilters}
              >
                <Text style={styles.clearFiltersText}>Clear All</Text>
                <MaterialIcons name="clear" size={14} color="#f7b305" />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.filterButton, isSortDropdownVisible && styles.activeFilterButton]}
              onPress={handleSortButtonClick}
            >
              <Text style={styles.filterButtonText}>Sort</Text>
              <Icon name="sort" size={14} color="black" />
              {selectedSortOption !== 'default' && (
                <View style={styles.activeFilterDot} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.filterButton, isFilterDropdownVisible && styles.activeFilterButton]}
              onPress={handleFilterButtonClick}
            >
              <Text style={styles.filterButtonText}>Filter</Text>
              <Icon name="filter" size={14} color="black" />
              {selectedFilters.length > 0 && (
                <View style={styles.filterCountBadge}>
                  <Text style={styles.filterCountText}>{selectedFilters.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Dropdowns for sort and filter */}
        <SortDropdown 
          visible={isSortDropdownVisible}
          options={sortOptions}
          selectedOption={selectedSortOption}
          onSelect={handleSortOptionSelect}
        />
        
        <FilterDropdown 
          visible={isFilterDropdownVisible}
          options={filterOptions}
          selectedFilters={selectedFilters}
          onSelect={handleFilterOptionSelect}
        />

        {/* Show appropriate content based on state */}
        {loading && products.length === 0 ? (
          <ProductsGridSkeleton />
        ) : error ? (
          <ErrorState 
            error={error} 
            onRetry={handleRefresh} 
          />
        ) : products.length === 0 ? (
          <EmptyState 
            message={`No ${categoryName} products found`} 
            subMessage="Try changing your filters or check back later" 
          />
        ) : (
          /* Product Grid */
          <FlatList
            ref={flatListRef}
            data={products}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            numColumns={NUM_COLUMNS}
            contentContainerStyle={styles.productList}
            columnWrapperStyle={styles.columnWrapper}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={ListFooterComponent}
            initialNumToRender={6}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={Platform.OS === 'android'}
            refreshControl={refreshControl}
            onEndReachedThreshold={0.5}
            onScroll={handleScroll}
            scrollEventThrottle={400}
          />
        )}
        
        {/* BackToTop button */}
        <BackToTopButton 
          visible={showBackToTop}
          onPress={scrollToTop}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  rightPlaceholder: {
    width: 30,
  },
  filtersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  filterButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    marginRight: 10,
    backgroundColor: '#f7b305',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterButtonText: {
    fontSize: 12,
    color: 'black',
    marginRight: 5,
    fontWeight: '500',
  },
  activeFilterButton: {
    borderColor: '#f7b305',
    backgroundColor: 'rgba(247, 179, 5, 0.08)',
  },
  dropdown: {
    position: 'absolute',
    top: 45,
    left: 15,
    width: 200,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedDropdownItem: {
    backgroundColor: 'rgba(247, 179, 5, 0.08)',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#555',
  },
  selectedDropdownItemText: {
    fontWeight: '600',
    color: '#f7b305',
  },
  productList: {
    padding: COLUMN_GAP,
    paddingBottom: 80,
    flexGrow: 1,
  },
  productCard: {
    flex: 1,
    margin: 5,
    maxWidth: PRODUCT_CARD_WIDTH,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productImagePlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: '#f5f5f5',
  },
  productInfo: {
    padding: 10,
    backgroundColor: 'white',
    minHeight: 80,
  },
  productName: {
    fontSize: 14,
    marginBottom: 5,
    color: '#333',
    fontWeight: '500',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'black',
  },
  productCondition: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  wishlistButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 90,
    minHeight: 300,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 90,
    minHeight: 300,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    marginBottom: 15,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 90,
    minHeight: 300,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  searchBarContainer: {
    padding: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    backgroundColor: '#f2f2f2',
    height: 40,
    overflow: 'hidden',
  },
  searchIcon: {
    marginLeft: 10,
    marginRight: 5,
    color: '#666',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    paddingRight: 10,
    color: '#333',
    fontSize: 16,
  },
  clearButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    paddingHorizontal: 15,
    paddingVertical: 5,
    backgroundColor: 'rgba(247, 179, 5, 0.08)',
    borderRadius: 5,
    borderWidth: 1, 
    borderColor: '#f7b305',
  },
  clearFiltersText: {
    color: '#f7b305',
    fontWeight: '600',
    marginRight: 5,
    fontSize: 12,
  },
  totalCount: {
    fontSize: 18,
    color: 'black',
    fontWeight: '700',
    fontFamily: 'Montserrat-SemiBold',
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  imageContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 15,
    padding: 2,
  },
  rentBadge: {
    backgroundColor: '#ff5757',
  },
  newBadge: {
    backgroundColor: '#57ff57',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  backToTopButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#f7b305',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeFilterDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#f7b305',
    borderRadius: 10,
    width: 4,
    height: 4,
  },
  filterCountBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#f7b305',
    borderRadius: 10,
    padding: 2,
  },
  filterCountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  skeletonLine: {
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginVertical: 2,
  },
});

export default React.memo(CategoryProductsScreen); 