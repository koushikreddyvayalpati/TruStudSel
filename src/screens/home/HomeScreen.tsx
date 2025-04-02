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

// Import API methods
import { 
  getProductsByCategory,
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
  icon: 'electronics' | 'furniture' | 'auto' | 'fashion' | 'sports';
}

// Using the API Product interface directly
type Product = ApiProduct;

type ProductSectionType = 'featured' | 'newArrivals' | 'bestSellers' | 'university' | 'city';

type NavigationProp = StackNavigationProp<MainStackParamList>;

interface HomescreenProps {
  navigation?: NavigationProp;
}

// Cache constants
const USER_PROFILE_CACHE_KEY = 'user_profile_cache_';
const CACHE_EXPIRY_TIME = 15 * 60 * 1000; // 15 minutes

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

const HomeScreen: React.FC<HomescreenProps> = ({ navigation: propNavigation }) => {
  const navigation = useNavigation<NavigationProp>();
  const nav = propNavigation || navigation;
  const { user } = useAuth();
  
  // User profile data state
  const [userProfileData, setUserProfileData] = useState<any>(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState<boolean>(false);
  const [userDataError, setUserDataError] = useState<string | null>(null);
  
  // Cache the University and City values for API calls
  const userUniversity = useMemo(() => 
    userProfileData?.university || user?.university || '', 
    [userProfileData, user?.university]
  );
  
  const userCity = useMemo(() => 
    userProfileData?.city || user?.city || '', 
    [userProfileData, user?.city]
  );
  
  const userZipcode = useMemo(() => 
    userProfileData?.zipcode || user?.zipcode || '', 
    [userProfileData, user?.zipcode]
  );
  
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  
  // API data states
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [newArrivalsProducts, setNewArrivalsProducts] = useState<Product[]>([]);
  const [universityProducts, setUniversityProducts] = useState<Product[]>([]);
  const [cityProducts, setCityProducts] = useState<Product[]>([]);
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  
  // Loading states
  const [loadingFeatured, setLoadingFeatured] = useState(false);
  const [loadingNewArrivals, setLoadingNewArrivals] = useState(false);
  const [loadingUniversity, setLoadingUniversity] = useState(false);
  const [loadingCity, setLoadingCity] = useState(false);
  const [loadingCategory, setLoadingCategory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Sort states
  const [sortDropdownVisible, setSortDropdownVisible] = useState(false);
  const [selectedSortOption, setSelectedSortOption] = useState<string>('default');
  // Add filter states
  const [filterDropdownVisible, setFilterDropdownVisible] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  
  // Category data with icon identifiers for type safety
  const categories = useMemo<Category[]>(() => [
    { id: 1, name: 'Electronics', icon: 'electronics' },
    { id: 2, name: 'Furniture', icon: 'furniture' },
    { id: 3, name: 'Auto', icon: 'auto' },
    { id: 4, name: 'Fashion', icon: 'fashion' },
    { id: 5, name: 'Sports', icon: 'sports' },
  ], []);

  // Function to load featured products (wrapped in useCallback)
  const loadFeaturedProducts = useCallback(async () => {
    if (!userUniversity || !userCity) return;
    
    setLoadingFeatured(true);
    setError(null);
    
    try {
      const products = await getFeaturedProducts(userUniversity, userCity);
      setFeaturedProducts(products);
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
      const products = await getNewArrivals(userUniversity);
      setNewArrivalsProducts(products);
    } catch (err) {
      console.error('Error loading new arrivals:', err);
      setError('Failed to load new arrivals');
    } finally {
      setLoadingNewArrivals(false);
    }
  }, [userUniversity]);

  // Function to load products by category (wrapped in useCallback)
  const loadCategoryProducts = useCallback(async (category: string) => {
    setLoadingCategory(true);
    setError(null);
    
    try {
      // Convert selectedFilters and selectedSortOption to API filter format
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
      
      const result = await getProductsByCategory(category, filters);
      setCategoryProducts(result.products || []);
    } catch (err) {
      console.error(`Error loading ${category} products:`, err);
      setError(`Failed to load ${category} products`);
    } finally {
      setLoadingCategory(false);
    }
  }, [selectedSortOption, selectedFilters, userUniversity, userCity, userZipcode]);

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
          console.log(`[HomeScreen] University products state updated with ${result.products.length} items`);
        } else {
          console.warn('[HomeScreen] Unexpected response format from university products API. Result:', 
            typeof result === 'object' ? JSON.stringify(result) : typeof result);
          setUniversityProducts([]);
        }
      } catch (error: any) {
        console.warn(`[HomeScreen] API error when loading university products:`, 
          error.message || 'Unknown error');
        console.warn(`[HomeScreen] Error stack:`, error.stack || 'No stack trace');
        
        // Fallback to an empty array to avoid UI crashes
        setUniversityProducts([]);
      }
    } catch (err: any) {
      console.error('[HomeScreen] Error loading university products:', err);
      setError('Failed to load university products');
      setUniversityProducts([]);
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
          console.log(`[HomeScreen] City products state updated with ${result.products.length} items`);
        } else {
          console.warn('[HomeScreen] Unexpected response format from city products API. Result:', 
            typeof result === 'object' ? JSON.stringify(result) : typeof result);
          setCityProducts([]);
        }
      } catch (error: any) {
        console.warn(`[HomeScreen] API error when loading city products:`, 
          error.message || 'Unknown error');
        console.warn(`[HomeScreen] Error stack:`, error.stack || 'No stack trace');
        // Fallback to an empty array to avoid UI crashes
        setCityProducts([]);
      }
    } catch (err: any) {
      console.error('[HomeScreen] Error loading city products:', err);
      setError('Failed to load city products');
      setCityProducts([]);
    } finally {
      console.log(`[HomeScreen] City products loading complete`);
      setLoadingCity(false);
    }
  }, [userCity, userUniversity]);

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
        id: product.id // Ensure id is treated as expected by the screen
      },
      productId: product.id // Explicitly pass the product ID for easier access in ProductsScreen
    });
  }, [nav]);

  const handleCategoryPress = useCallback((category: Category) => {
    setActiveCategory(prevCategory => 
      prevCategory === category.id ? null : category.id
    );
    // Here you could filter products by category if needed
    console.log(`Category selected: ${category.name}`);
  }, []);

  // User profile fetching with cache
  const fetchUserProfile = useCallback(async () => {
    if (!user?.email) return;
    
    setIsLoadingUserData(true);
    setUserDataError(null);
    
    try {
      // Check if we have cached data
      const cacheKey = `${USER_PROFILE_CACHE_KEY}${user.email}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        const isExpired = Date.now() - timestamp > CACHE_EXPIRY_TIME;
        
        if (!isExpired) {
          console.log('Using cached user profile data');
          setUserProfileData(data);
          setIsLoadingUserData(false);
          return;
        }
      }
      
      // If no cache or expired, fetch from API
      console.log('Fetching user profile from API');
      const data = await fetchUserProfileById(user.email);
      
      // Update state
      setUserProfileData(data);
      
      // Save to cache
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      
    } catch (error: any) {
      console.error('Error fetching user profile:', error.message || error);
      setUserDataError('Failed to fetch user profile data');
    } finally {
      setIsLoadingUserData(false);
    }
  }, [user?.email]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    
    // Refresh user profile data first
    fetchUserProfile()
      .then(() => {
        // Then reload all data with separate promises to avoid errors stopping other requests
        const promises = [
          loadFeaturedProducts().catch(err => console.warn('Error refreshing featured products:', err)),
          loadNewArrivals().catch(err => console.warn('Error refreshing new arrivals:', err)),
        ];
          
        // Only load category products if a category is selected  
        if (activeCategory !== null) {
          const categoryName = categories.find(c => c.id === activeCategory)?.name.toLowerCase();
          if (categoryName) {
            promises.push(
              loadCategoryProducts(categoryName).catch(err => console.warn('Error refreshing category products:', err))
            );
          }
        }
        
        // Add university and city products with error handling
        promises.push(loadUniversityProducts().catch(err => console.warn('Error refreshing university products:', err)));
        promises.push(loadCityProducts().catch(err => console.warn('Error refreshing city products:', err)));
        
        return Promise.all(promises);
      })
      .catch(err => {
        console.error('Error refreshing data:', err);
        Alert.alert('Error', 'Failed to refresh some data');
      })
      .finally(() => {
        setIsRefreshing(false);
      });
  }, [activeCategory, categories, loadFeaturedProducts, loadNewArrivals, loadCategoryProducts, fetchUserProfile, loadUniversityProducts, loadCityProducts]);

  const handleSearch = useCallback(() => {
    // Implement search functionality here
    console.log(`Searching for: ${searchQuery}`);
  }, [searchQuery]);

  const handleSeeAll = useCallback((section: ProductSectionType) => {
    // Navigate to a page showing all products of a specific section based on section type
    if (section === 'featured') {
      // Navigate to page showing all featured products
      Alert.alert('Coming Soon', 'View all featured products');
    } else if (section === 'newArrivals') {
      // Navigate to page showing all new arrivals
      Alert.alert('Coming Soon', 'View all new arrivals');
    } else if (section === 'bestSellers') {
      // Navigate to page showing all best sellers
      Alert.alert('Coming Soon', 'View all best sellers');
    } else if (section === 'university') {
      // Navigate to page showing all university products
      Alert.alert('Coming Soon', `View all ${userUniversity} products`);
    } else if (section === 'city') {
      // Navigate to page showing all city products
      Alert.alert('Coming Soon', `View all ${userCity} products`);
    }
  }, [userUniversity, userCity]);

  // Define sort options
  const sortOptions = useMemo<SortOption[]>(() => [
    { id: 'default', label: 'Default' },
    { id: 'price_low_high', label: 'Price: Low to High' },
    { id: 'price_high_low', label: 'Price: High to Low' },
    { id: 'newest', label: 'Newest First' },
    { id: 'popularity', label: 'Popularity' },
  ], []);

  // Add a handler for sort option selection
  const handleSortOptionSelect = useCallback((optionId: string) => {
    setSelectedSortOption(optionId);
    setSortDropdownVisible(false);
    
    // If a category is active, reload products with the new sort option
    if (activeCategory !== null) {
      const categoryName = categories.find(c => c.id === activeCategory)?.name.toLowerCase();
      if (categoryName) {
        loadCategoryProducts(categoryName);
      }
    }
  }, [activeCategory, categories, loadCategoryProducts]);

  // Define filter options
  const filterOptions = useMemo<FilterOption[]>(() => [
    { id: 'new', label: 'Brand New' },
    { id: 'used', label: 'Used' },
    { id: 'rent', label: 'For Rent' },
    { id: 'sell', label: 'For Sale' },
    { id: 'free', label: 'Free Items' },
  ], []);

  // Add a handler for filter option selection
  const handleFilterOptionSelect = useCallback((optionId: string) => {
    setSelectedFilters(prevFilters => {
      // Toggle the filter on/off
      if (prevFilters.includes(optionId)) {
        return prevFilters.filter(id => id !== optionId);
      } else {
        return [...prevFilters, optionId];
      }
    });
    
    // Reload category products with new filters (actual filtering happens in the useEffect)
  }, []);

  // Close other dropdown when one is opened
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

  // Effect to load category products when a category is selected
  useEffect(() => {
    if (activeCategory !== null) {
      const categoryName = categories.find(c => c.id === activeCategory)?.name.toLowerCase();
      if (categoryName) {
        loadCategoryProducts(categoryName);
      }
    }
  }, [activeCategory, selectedSortOption, selectedFilters, categories, loadCategoryProducts]);

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
                nav.navigate('Profile');
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
            {activeCategory 
              ? categories.find(c => c.id === activeCategory)?.name || 'All Items'
              : 'All Items'
            }
          </Text>
          <View style={styles.buttonContainer}>
            <View style={{ position: 'relative' }}>
              <TouchableOpacity 
                style={[styles.smallButton, styles.sortButton, { backgroundColor: '#f7b305', borderColor: '#ddd' }]}
                onPress={handleSortButtonClick}
              >
                <Text style={[styles.buttonText, { color: 'black' }]}> Sort</Text>
                <Icon name="sort" size={14} color="black" />
              </TouchableOpacity>
              
              {/* Sort Dropdown */}
              {sortDropdownVisible && (
                <View style={styles.dropdown}>
                  {sortOptions.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.dropdownItem,
                        selectedSortOption === option.id && styles.selectedDropdownItem
                      ]}
                      onPress={() => handleSortOptionSelect(option.id)}
                    >
                      <Text 
                        style={[
                          styles.dropdownItemText,
                          selectedSortOption === option.id && styles.selectedDropdownItemText
                        ]}
                      >
                        {option.label}
                      </Text>
                      {selectedSortOption === option.id && (
                        <MaterialIcons name="check" size={18} color="#f7b305" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            
            <View style={{ position: 'relative' }}>
              <TouchableOpacity 
                style={[styles.smallButton, styles.filterButton, { backgroundColor: '#f7b305', borderColor: '#ddd' }]}
                onPress={handleFilterButtonClick}
              >
                <Text style={[styles.buttonText, { color: 'black' }]}>
                  {selectedFilters.length > 0 ? ` Filter (${selectedFilters.length})` : ' Filter'}
                </Text>
                <Icon name="filter" size={14} color="black" />
              </TouchableOpacity>
              
              {/* Filter Dropdown */}
              {filterDropdownVisible && (
                <View style={styles.dropdown}>
                  {filterOptions.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.dropdownItem,
                        selectedFilters.includes(option.id) && styles.selectedDropdownItem
                      ]}
                      onPress={() => handleFilterOptionSelect(option.id)}
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

          {/* Category Products Section - Only show when a category is selected */}
          {activeCategory !== null && (
            <ProductSection 
              title={`${categories.find(c => c.id === activeCategory)?.name || ''} Products`}
              data={categoryProducts}
              wishlist={wishlist}
              onToggleWishlist={toggleWishlist}
              onProductPress={handleProductPress}
              isLoading={loadingCategory}
            />
          )}
          
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
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    marginLeft: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortButton: {
  },
  filterButton: {
  },
  buttonText: {
    fontSize: 12,
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
  dropdown: {
    position: 'absolute',
    top: 40,
    right: 0,
    width: Math.min(200, width * 0.5),
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
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
    backgroundColor: '#f9f9f9',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
  },
  selectedDropdownItemText: {
    fontWeight: 'bold',
    color: '#f7b305',
  },
  productCondition: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    textTransform: 'capitalize',
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
});

export default HomeScreen; 