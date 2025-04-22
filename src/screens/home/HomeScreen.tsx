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
  Alert,
  Linking,
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

// Import the Product type from types/product
import { Product } from '../../types/product';

// Import new filter utilities
import {
  createFilterMaps,
  FilterMap,
  shouldUseClientSideFiltering,
  applyOptimizedFiltering,
  convertToApiFilters,
  needsServerRefetch,
} from '../../utils/filterUtils';

// Import user profile API
import { fetchUserProfileById } from '../../api/users';

// Import types
import { StackNavigationProp } from '@react-navigation/stack';
import { MainStackParamList } from '../../types/navigation.types';

// Import the search hook
import { useSearch } from './home-search';

// Import Zustand store
import useProductStore from '../../store/productStore';

// Define types for better type safety
interface Category {
  id: number;
  name: string;
  icon: 'electronics' | 'furniture' | 'auto' | 'fashion' | 'sports' | 'stationery' | 'eventpass';
}

// Using the Product interface directly from types/product instead of from api
// type Product = ApiProduct;

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
  isLoading = false,
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
              selectedItems.includes(item.id) && styles.enhancedDropdownItemSelected,
            ]}
            onPress={() => onSelect(item.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.enhancedDropdownItemText,
                selectedItems.includes(item.id) && styles.enhancedDropdownItemTextSelected,
              ]}
            >
              {item.label}
            </Text>
            {selectedItems.includes(item.id) && (
              <View style={styles.checkIconContainer}>
                <MaterialIcons name={multiSelect ? 'check-box' : 'check-circle'} size={20} color="#f7b305" />
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
  'brand-new': 'brand-new',
  'like-new': 'like-new',
  'very-good': 'very-good',
  'good': 'good',
  'acceptable': 'acceptable',
};

// Filter functions
const filterByCondition = (product: Product, conditions: string[]): boolean => {
  if (!conditions.length) {return true;}

  // Check both condition and productage fields as they might be used inconsistently
  const productCondition = product.condition?.toLowerCase() || product.productage?.toLowerCase();

  return conditions.some(condition => {
    // Map UI condition to backend condition if needed
    const backendCondition = conditionMapping[condition as keyof typeof conditionMapping] || condition;
    return productCondition === backendCondition;
  });
};

const filterBySellingType = (product: Product, sellingTypes: string[]): boolean => {
  if (!sellingTypes.length) {return true;}

  const productSellingType = product.sellingtype?.toLowerCase();

  // Log the selling type to help with debugging
  console.log(`[HomeScreen] Product ${product.id} selling type: ${productSellingType}`);

  return sellingTypes.some(type => productSellingType === type);
};

// Add this function to apply front-end filtering
const applyFiltersToProducts = (products: Product[], filters: string[]): Product[] => {
  if (!filters.length) {return products;}

  console.log(`[HomeScreen] Applying ${filters.length} filters to ${products.length} products`);

  // Extract condition filters
  const conditionFilters = filters.filter(filter =>
    ['brand-new', 'like-new', 'very-good', 'good', 'acceptable'].includes(filter)
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

// Add the SearchPaginationFooter component before the HomeScreen component
// This is a simplified version that matches the API expected in the component
const SearchPaginationFooter: React.FC<{
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  error?: string | null;
}> = ({ isLoadingMore, hasMore, onLoadMore, error }) => (
  <View style={styles.paginationFooter}>
    {error && (
      <Text style={styles.errorText}>{error}</Text>
    )}
    {isLoadingMore ? (
      <View>
        <ActivityIndicator size="small" color="#f7b305" />
        <Text style={styles.loadingMoreText}>Loading more...</Text>
      </View>
    ) : hasMore ? (
      <TouchableOpacity
        style={styles.loadMoreButton}
        onPress={onLoadMore}
        disabled={isLoadingMore}
      >
        <Text style={styles.loadMoreButtonText}>Load More</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

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

  // Add stub functions for filtering until full Zustand migration is complete
  // These will eventually be removed when migration is complete
  const loadFilteredFeaturedProducts = async (filters: any) => {
    console.log('[HomeScreen] loadFilteredFeaturedProducts is now a stub - will use Zustand in the future');
    return Promise.resolve();
  };

  const loadFilteredNewArrivals = async (filters: any) => {
    console.log('[HomeScreen] loadFilteredNewArrivals is now a stub - will use Zustand in the future');
    return Promise.resolve();
  };

  const loadFilteredUniversityProducts = async (filters: any) => {
    console.log('[HomeScreen] loadFilteredUniversityProducts is now a stub - will use Zustand in the future');
    return Promise.resolve();
  };

  const loadFilteredCityProducts = async (filters: any) => {
    console.log('[HomeScreen] loadFilteredCityProducts is now a stub - will use Zustand in the future');
    return Promise.resolve();
  };

  // Add these function stubs for the missing Zustand setters that are referenced
  const setLoadingFeatured = (isLoading: boolean) => {
    console.log('[HomeScreen] setLoadingFeatured is now a stub - will use Zustand in the future');
  };

  const setLoadingNewArrivals = (isLoading: boolean) => {
    console.log('[HomeScreen] setLoadingNewArrivals is now a stub - will use Zustand in the future');
  };

  const setLoadingUniversity = (isLoading: boolean) => {
    console.log('[HomeScreen] setLoadingUniversity is now a stub - will use Zustand in the future');
  };

  const setLoadingCity = (isLoading: boolean) => {
    console.log('[HomeScreen] setLoadingCity is now a stub - will use Zustand in the future');
  };

  // Add state variables to store the processed products
  const [featuredProductsState, setFeaturedProductsState] = useState<Product[]>([]);
  const [newArrivalsProductsState, setNewArrivalsProductsState] = useState<Product[]>([]);
  const [universityProductsState, setUniversityProductsState] = useState<Product[]>([]);
  const [cityProductsState, setCityProductsState] = useState<Product[]>([]);

  // Update setter functions to use local state
  const setFeaturedProducts = (products: Product[]) => {
    console.log('[HomeScreen] Updating featured products with', products.length, 'items');
    setFeaturedProductsState(products as any);
  };

  const setNewArrivalsProducts = (products: Product[]) => {
    console.log('[HomeScreen] Updating new arrivals products with', products.length, 'items');
    setNewArrivalsProductsState(products as any);
  };

  const setUniversityProducts = (products: Product[]) => {
    console.log('[HomeScreen] Updating university products with', products.length, 'items');
    setUniversityProductsState(products as any);
  };

  const setCityProducts = (products: Product[]) => {
    console.log('[HomeScreen] Updating city products with', products.length, 'items');
    setCityProductsState(products as any);
  };

  // Cache the University and City values for API calls
  const userUniversity = useMemo(() => {
    const university = userProfileData?.university || user?.university || '';
    // console.log('[HomeScreen] userUniversity updated:', {
    //   fromProfile: userProfileData?.university || 'none',
    //   fromUser: user?.university || 'none',
    //   finalValue: university,
    // });
    return university;
  }, [userProfileData, user?.university]);

  const userCity = useMemo(() => userProfileData?.city || user?.city || '', [userProfileData, user]);

  // Use our search hook for all search functionality
  const search = useSearch(userUniversity, userCity);

  const [wishlist, setWishlist] = useState<string[]>([]);

  // Use Zustand store for product state management
  const {
    // Product data from store
    featuredProducts,
    newArrivalsProducts,
    universityProducts,
    cityProducts,
    interestedCategoryProducts,

    // Loading states from store
    loadingFeatured,
    loadingNewArrivals,
    loadingUniversity,
    loadingCity,
    loadingInterestedCategory,

    // Refresh state from store
    isRefreshing,
    error: productError,
    interestedCategoryError,

    // Selected interest category
    selectedInterestCategory,
    setSelectedInterestCategory,

    // Actions from store
    loadFeaturedProducts,
    loadNewArrivals,
    loadUniversityProducts,
    loadCityProducts,
    loadInterestedCategoryProducts,
    handleRefresh,
    setError,
  } = useProductStore();

  // Modify the fetchUserProfile function to better log category selection
  const fetchUserProfile = useCallback(async () => {
    if (!user?.email) {
      console.log('[HomeScreen] No user email available, skipping profile fetch');
      return;
    }

    // console.log(`[HomeScreen] Starting profile fetch for user: ${user.email}`);
    setIsLoadingUserData(true);
    setUserDataError(null);

    try {
      const cacheKey = `${USER_PROFILE_CACHE_KEY}${user.email}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);

      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        const isExpired = Date.now() - timestamp > USER_CACHE_EXPIRY_TIME;

        if (!isExpired) {
          console.log('[HomeScreen] Using cached user profile');
          setUserProfileData(data);

          // Update shared context
          if (data.university) {setUserUniversity(data.university);}
          if (data.city) {setUserCity(data.city);}

          // DETAILED DEBUG: Examine profile data structure
          // console.log('[HomeScreen] DEBUG - Full cached user profile:', JSON.stringify(data).substring(0, 300));
          // console.log('[HomeScreen] DEBUG - Profile data type:', typeof data);
          console.log('[HomeScreen] DEBUG - Profile has productsCategoriesIntrested:',
            data.hasOwnProperty('productsCategoriesIntrested'));

          // Check all property names for possible misspellings
          // console.log('[HomeScreen] DEBUG - Available profile properties:', Object.keys(data));

          // Try alternate spellings/formats
          const possibleInterestProps = [
            'productsCategoriesIntrested',
            'productsCategories',
            'interestedCategories',
            'interests',
            'categories',
            'productCategories',
            'categoriesInterested',
          ];

          let interestCategories = null;
          let propName = null;

          for (const prop of possibleInterestProps) {
            if (data[prop] && Array.isArray(data[prop]) && data[prop].length > 0) {
              console.log(`[HomeScreen] Found interests in property: ${prop}`);
              interestCategories = data[prop];
              propName = prop;
              break;
            }
          }

          // If we found interests, log and use them
          if (interestCategories && interestCategories.length > 0) {
            console.log(`[HomeScreen] User interests found in '${propName}':`, interestCategories);

            // Select a random category from user's interests
            const randomIndex = Math.floor(Math.random() * interestCategories.length);
            const selectedCategory = interestCategories[randomIndex];
            console.log(`[HomeScreen] Selected random interest category: "${selectedCategory}" (index ${randomIndex} of ${interestCategories.length})`);
            setSelectedInterestCategory(selectedCategory);
          } else {
            console.log('[HomeScreen] ERROR: No interest categories found in user profile data');

            // If we found the property but it's empty, log that
            if (data.productsCategoriesIntrested !== undefined) {
              console.log('[HomeScreen] productsCategoriesIntrested exists but is:',
                data.productsCategoriesIntrested);
            }

            // Fallback to a default category if needed
            console.log('[HomeScreen] Using fallback category "electronics" since no interests found');
            setSelectedInterestCategory('electronics');
          }

          setIsLoadingUserData(false);
          return;
        }
      }

      console.log('[HomeScreen] Fetching fresh user profile data from API');
      const userData = await fetchUserProfileById(user.email);

      if (userData) {
        console.log('[HomeScreen] User profile fetched successfully from API');
        console.log('[HomeScreen] DEBUG - Full API user profile:', JSON.stringify(userData).substring(0, 300));
        console.log('[HomeScreen] DEBUG - API profile data type:', typeof userData);
        console.log('[HomeScreen] DEBUG - API profile has productsCategoriesIntrested:',
          userData.hasOwnProperty('productsCategoriesIntrested'));

        // Check all property names for possible misspellings
        console.log('[HomeScreen] DEBUG - Available API profile properties:', Object.keys(userData));

        setUserProfileData(userData);

        // Update shared context
        if (userData.university) {setUserUniversity(userData.university);}
        if (userData.city) {setUserCity(userData.city);}

        // Try alternate spellings/formats
        const possibleInterestProps = [
          'productsCategoriesIntrested',
          'productsCategories',
          'interestedCategories',
          'interests',
          'categories',
          'productCategories',
          'categoriesInterested',
        ];

        let interestCategories = null;
        let propName = null;

        for (const prop of possibleInterestProps) {
          if (userData[prop] && Array.isArray(userData[prop]) && userData[prop].length > 0) {
            console.log(`[HomeScreen] Found interests in API response property: ${prop}`);
            interestCategories = userData[prop];
            propName = prop;
            break;
          }
        }

        // If we found interests, log and use them
        if (interestCategories && interestCategories.length > 0) {
          console.log(`[HomeScreen] User interests from API in '${propName}':`, interestCategories);

          // Select a random category from user's interests
          const randomIndex = Math.floor(Math.random() * interestCategories.length);
          const selectedCategory = interestCategories[randomIndex];
          console.log(`[HomeScreen] Selected random interest category from API: "${selectedCategory}" (index ${randomIndex} of ${interestCategories.length})`);
          setSelectedInterestCategory(selectedCategory);
        } else {
          console.log('[HomeScreen] ERROR: No interest categories found in API user profile data');

          // If we found the property but it's empty, log that
          if (userData.productsCategoriesIntrested !== undefined) {
            console.log('[HomeScreen] productsCategoriesIntrested from API exists but is:',
              userData.productsCategoriesIntrested);
          }

          // Fallback to a default category if needed
          console.log('[HomeScreen] Using fallback category "electronics" since no interests found in API');
          setSelectedInterestCategory('electronics');
        }

        // Cache the user data
        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({
            data: userData,
            timestamp: Date.now(),
          })
        );
      } else {
        console.log('[HomeScreen] No user data returned from API');
        // Fallback to a default category
        console.log('[HomeScreen] Using fallback category "electronics" since no user data');
        setSelectedInterestCategory('electronics');
      }
    } catch (err) {
      console.error('[HomeScreen] Error fetching user profile:', err);
      setUserDataError('Failed to load user profile');
      // Fallback to a default category
      console.log('[HomeScreen] Using fallback category "electronics" due to error');
      setSelectedInterestCategory('electronics');
    } finally {
      setIsLoadingUserData(false);
    }
  }, [user, setUserUniversity, setUserCity, setSelectedInterestCategory]);

  // Add logging to useEffect
  useEffect(() => {
    if (selectedInterestCategory) {
      console.log(`[HomeScreen] useEffect triggered to load interest products for: "${selectedInterestCategory}"`);
      loadInterestedCategoryProducts(selectedInterestCategory, userUniversity, userCity);
    } else {
      console.log('[HomeScreen] useEffect for interest products skipped: no category selected');
    }
  }, [selectedInterestCategory, loadInterestedCategoryProducts, userUniversity, userCity]);

  // Load products when the component mounts
  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  // We removed the duplicate useEffect here that was calling loadInterestedCategoryProducts

  // Load products when userUniversity or userCity changes
  useEffect(() => {
    if (userUniversity || userCity) {
      loadFeaturedProducts(userUniversity, userCity);

      if (userUniversity) {
        loadNewArrivals(userUniversity);
        loadUniversityProducts(userUniversity);
      }

      if (userCity) {
        loadCityProducts(userCity);
      }

      // Also reload interested category products if we have a category
      if (selectedInterestCategory) {
        loadInterestedCategoryProducts(selectedInterestCategory, userUniversity, userCity);
      }
    }
  }, [
    userUniversity,
    userCity,
    loadFeaturedProducts,
    loadNewArrivals,
    loadUniversityProducts,
    loadCityProducts,
    selectedInterestCategory,
    loadInterestedCategoryProducts,
  ]);

  // Handle the refresh action with the Zustand store
  const onRefresh = useCallback(() => {
    // Call the handleRefresh function from the store
    handleRefresh(userUniversity, userCity);

    // Also increment search refresh counter
    if (search && search.incrementSearchRefreshCount) {
      search.incrementSearchRefreshCount();
    }

    // No need to manually refresh interested category products here,
    // since the store's handleRefresh already handles that
  }, [
    handleRefresh,
    userUniversity,
    userCity,
    search,
  ]);

  // Get the initial letter for the profile avatar
  const getInitial = useCallback(() => {
    if (userProfileData?.name) {
      return userProfileData.name.charAt(0).toUpperCase();
    } else if (user?.name) {
      return user.name.charAt(0).toUpperCase();
    } else if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  }, [userProfileData, user]);

  // Original products state (for filtering and sorting)
  const [_featuredProductsOriginal, setFeaturedProductsOriginal] = useState<Product[]>([]);
  const [_newArrivalsProductsOriginal, setNewArrivalsProductsOriginal] = useState<Product[]>([]);
  const [_universityProductsOriginal, setUniversityProductsOriginal] = useState<Product[]>([]);
  const [_cityProductsOriginal, setCityProductsOriginal] = useState<Product[]>([]);

  // Advanced filtering state
  const [featuredFilterMaps, setFeaturedFilterMaps] = useState<FilterMap>({
    condition: new Map(),
    sellingType: new Map(),
    price: new Map(),
  });

  const [newArrivalsFilterMaps, setNewArrivalsFilterMaps] = useState<FilterMap>({
    condition: new Map(),
    sellingType: new Map(),
    price: new Map(),
  });

  const [universityFilterMaps, setUniversityFilterMaps] = useState<FilterMap>({
    condition: new Map(),
    sellingType: new Map(),
    price: new Map(),
  });

  const [cityFilterMaps, setCityFilterMaps] = useState<FilterMap>({
    condition: new Map(),
    sellingType: new Map(),
    price: new Map(),
  });

  // Total available product counts from server
  const [totalFeaturedCount, setTotalFeaturedCount] = useState<number>(0);
  const [totalNewArrivalsCount, _setTotalNewArrivalsCount] = useState<number>(0); // Prefix with _ to indicate unused
  const [totalUniversityCount, setTotalUniversityCount] = useState<number>(0);
  const [totalCityCount, _setTotalCityCount] = useState<number>(0); // Prefix with _ to indicate unused

  // Track if we're using server-side filtering
  const [usingServerFiltering, setUsingServerFiltering] = useState<boolean>(false);

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
    { id: 'rent', label: 'For Rent' },
    { id: 'sell', label: 'For Sale' },
    { id: 'free', label: 'Free Items' },
  ], []);

  // Replace modal states with dropdown visibility states
  const [sortDropdownVisible, setSortDropdownVisible] = useState(false);
  const [filterDropdownVisible, setFilterDropdownVisible] = useState(false);

  // Update the handleFilterOptionSelect function
  const handleFilterOptionSelect = useCallback((optionId: string) => {
    console.log(`[HomeScreen] Filter option toggled: ${optionId}`);

    // Toggle the filter on/off
    setSelectedFilters(prevFilters => {
      const newFilters = prevFilters.includes(optionId)
        ? prevFilters.filter(id => id !== optionId)
        : [...prevFilters, optionId];

      console.log('[HomeScreen] Updated filters:', newFilters);

      // Determine if we should use server-side filtering for any of the product sets
      const useFeaturedServerFiltering = _featuredProductsOriginal.length > 0 &&
        !shouldUseClientSideFiltering(_featuredProductsOriginal as any, newFilters, totalFeaturedCount);

      const useNewArrivalsServerFiltering = _newArrivalsProductsOriginal.length > 0 &&
        !shouldUseClientSideFiltering(_newArrivalsProductsOriginal as any, newFilters, totalNewArrivalsCount);

      const useUniversityServerFiltering = _universityProductsOriginal.length > 0 &&
        !shouldUseClientSideFiltering(_universityProductsOriginal as any, newFilters, totalUniversityCount);

      const useCityServerFiltering = _cityProductsOriginal.length > 0 &&
        !shouldUseClientSideFiltering(_cityProductsOriginal as any, newFilters, totalCityCount);

      // Check if we need to do progressive loading - fetch more data from server
      const needsProgressiveLoading =
        needsServerRefetch(newFilters, prevFilters, totalFeaturedCount, _featuredProductsOriginal as any) ||
        needsServerRefetch(newFilters, prevFilters, totalNewArrivalsCount, _newArrivalsProductsOriginal as any) ||
        needsServerRefetch(newFilters, prevFilters, totalUniversityCount, _universityProductsOriginal as any) ||
        needsServerRefetch(newFilters, prevFilters, totalCityCount, _cityProductsOriginal as any);

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
              applySortingAndFilters(_featuredProductsOriginal as any, selectedSort, newFilters) :
              applyOptimizedFiltering(_featuredProductsOriginal as any, newFilters, featuredFilterMaps)
          );
        }

        if (_newArrivalsProductsOriginal.length > 0) {
          setNewArrivalsProducts(
            _newArrivalsProductsOriginal.length < 100 ?
              applySortingAndFilters(_newArrivalsProductsOriginal as any, selectedSort, newFilters) :
              applyOptimizedFiltering(_newArrivalsProductsOriginal as any, newFilters, newArrivalsFilterMaps)
          );
        }

        if (_universityProductsOriginal.length > 0) {
          setUniversityProducts(
            _universityProductsOriginal.length < 100 ?
              applySortingAndFilters(_universityProductsOriginal as any, selectedSort, newFilters) :
              applyOptimizedFiltering(_universityProductsOriginal as any, newFilters, universityFilterMaps)
          );
        }

        if (_cityProductsOriginal.length > 0) {
          setCityProducts(
            _cityProductsOriginal.length < 100 ?
              applySortingAndFilters(_cityProductsOriginal as any, selectedSort, newFilters) :
              applyOptimizedFiltering(_cityProductsOriginal as any, newFilters, cityFilterMaps)
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
    loadFilteredCityProducts,
  ]);

  // Update the handleSortOptionSelect function
  const handleSortOptionSelect = useCallback((optionId: string) => {
    console.log(`[HomeScreen] Sort option selected: ${optionId}`);
    setSelectedSort(optionId);
    setSortDropdownVisible(false);

    // Apply sorting directly using the applySortingAndFilters function
    if (_featuredProductsOriginal.length > 0) {
      setFeaturedProducts(
        applySortingAndFilters(_featuredProductsOriginal as any, optionId, selectedFilters)
      );
    }

    if (_newArrivalsProductsOriginal.length > 0) {
      setNewArrivalsProducts(
        applySortingAndFilters(_newArrivalsProductsOriginal as any, optionId, selectedFilters)
      );
    }

    if (_universityProductsOriginal.length > 0) {
      setUniversityProducts(
        applySortingAndFilters(_universityProductsOriginal as any, optionId, selectedFilters)
      );
    }

    if (_cityProductsOriginal.length > 0) {
      setCityProducts(
        applySortingAndFilters(_cityProductsOriginal as any, optionId, selectedFilters)
      );
    }

    // Apply to search results if visible
    if (search.showSearchResults && search.searchResults.length > 0) {
      // For search results, re-run search with new sort option
      search.handleSearch();
    }
  }, [
    _featuredProductsOriginal,
    _newArrivalsProductsOriginal,
    _universityProductsOriginal,
    _cityProductsOriginal,
    selectedFilters,
    search,
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
          const dateA = (a as any).postingdate ? new Date((a as any).postingdate).getTime() : 0;
          const dateB = (b as any).postingdate ? new Date((b as any).postingdate).getTime() : 0;
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
    search, // Add entire search object as dependency
  ]);

  // Navigate to category products screen with appropriate section
  const handleSeeAll = useCallback((section: ProductSectionType) => {
    // Navigate to the CategoryProducts screen with appropriate parameters
    if (section === 'featured') {
      nav.navigate('CategoryProducts', {
        categoryId: 0, // Using 0 for non-category specific sections
        categoryName: 'Featured Products',
        userUniversity: userUniversity,
        userCity: userCity,
      });
    } else if (section === 'newArrivals') {
      nav.navigate('CategoryProducts', {
        categoryId: 0,
        categoryName: 'New Arrivals',
        userUniversity: userUniversity,
      });
    } else if (section === 'university') {
      nav.navigate('CategoryProducts', {
        categoryId: 0,
        categoryName: `${userUniversity} Products`,
        userUniversity: userUniversity,
      });
    } else if (section === 'city') {
      nav.navigate('CategoryProducts', {
        categoryId: 0,
        categoryName: `${userCity} Products`,
        userUniversity: userUniversity,
        userCity: userCity,
      });
    }
  }, [nav, userCity, userUniversity]);

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
      userCity: userCity,
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
      recipientName: sellerName,
    });
  }, [nav]);

  // Handle filter change events
  const handleFilterChange = useCallback((filterType: string, value: string | string[], sectionType: string) => {
    // Store the selected filters temporarily
    setSelectedFilters(prev => ({
      ...prev,
      [filterType]: value,
    }));

    // Don't immediately apply filters, wait for user to press Apply
    console.log(`[HomeScreen] Filter changed: ${filterType} = ${value} for ${sectionType}`);
  }, []);

  // Add this close to other stub functions
  const setShowFilterModal = (show: boolean) => {
    console.log('[HomeScreen] setShowFilterModal is now a stub - will use direct state in the future');
  };

  // Fix the applyFilters function to check for setShowFilterModal in a better way
  const applyFilters = useCallback(() => {
    // Close the filter modal - only if we're using one
    setFilterDropdownVisible(false);

    if (Object.keys(selectedFilters).length === 0) {
      console.log('[HomeScreen] No filters to apply');
      return;
    }

    console.log('[HomeScreen] Applying filters:', selectedFilters);

    // Instead of using the old filtering functions, we should use the Zustand store
    // This is a stub for now - will be fully implemented later
    console.log('[HomeScreen] Filters will be handled by Zustand store in future implementation');

  }, [selectedFilters]);

  // Sync original product arrays with Zustand store data
  useEffect(() => {
    if (featuredProducts.length > 0 && _featuredProductsOriginal.length === 0) {
      console.log('[HomeScreen] Syncing featured products to original array:', featuredProducts.length);
      setFeaturedProductsOriginal([...featuredProducts] as any);
      // Also create filter maps
      setFeaturedFilterMaps(createFilterMaps(featuredProducts as any));
    }

    if (newArrivalsProducts.length > 0 && _newArrivalsProductsOriginal.length === 0) {
      console.log('[HomeScreen] Syncing new arrivals to original array:', newArrivalsProducts.length);
      setNewArrivalsProductsOriginal([...newArrivalsProducts] as any);
      setNewArrivalsFilterMaps(createFilterMaps(newArrivalsProducts as any));
    }

    if (universityProducts.length > 0 && _universityProductsOriginal.length === 0) {
      console.log('[HomeScreen] Syncing university products to original array:', universityProducts.length);
      setUniversityProductsOriginal([...universityProducts] as any);
      setUniversityFilterMaps(createFilterMaps(universityProducts as any));
    }

    if (cityProducts.length > 0 && _cityProductsOriginal.length === 0) {
      console.log('[HomeScreen] Syncing city products to original array:', cityProducts.length);
      setCityProductsOriginal([...cityProducts] as any);
      setCityFilterMaps(createFilterMaps(cityProducts as any));
    }
  }, [
    featuredProducts,
    newArrivalsProducts,
    universityProducts,
    cityProducts,
    _featuredProductsOriginal,
    _newArrivalsProductsOriginal,
    _universityProductsOriginal,
    _cityProductsOriginal,
  ]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setBarStyle('dark-content');
    }
  }, []);

  // Test deep linking (for development purposes)
  const testDeepLink = async () => {
    try {
      const url = 'trustudsel://product/12345';
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        // Open the deep link
        await Linking.openURL(url);
      } else {
        Alert.alert('Not Supported', 'Deep linking is not supported on this device');
      }
    } catch (error) {
      console.error('Error testing deep link:', error);
      Alert.alert('Error', 'Could not open deep link');
    }
  };

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
          {search.showRecentSearches && search.recentSearches.length > 0 && search.searchQuery.length > 0 && (
            <View style={styles.recentSearchesDropdown}>
              <Text style={styles.recentSearchesTitle}>Recent Searches</Text>
              {search.recentSearches.map((item, index) => (
                <TouchableOpacity
                  key={`recent-${index}`}
                  style={styles.recentSearchItem}
                  onPress={() => {
                    // Temporary solution until search.handleRecentSearchPress is properly implemented
                    console.log('Recent search pressed:', item);
                    search.setSearchQuery(item);
                    search.handleSearch();
                  }}
                >
                  <FontAwesome name="history" size={16} color="#777" style={styles.recentSearchIcon} />
                  <Text style={styles.recentSearchText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Row with text and buttons */}
        <View style={styles.rowContainer}>
          <Text style={styles.plainText}>
            {search.showSearchResults ? 'Search Results' : 'All Items'}
          </Text>
          <View style={styles.buttonContainer}>
            <View style={{ position: 'relative' }}>
              <TouchableOpacity
                style={[
                  styles.smallButton,
                  styles.sortButton,
                  selectedSort !== 'default' && styles.activeFilterButton,
                ]}
                onPress={() => setSortDropdownVisible(!sortDropdownVisible)}
                activeOpacity={0.7}
              >
                <Icon name="sort" size={14} color="black" />
                <Text style={[styles.buttonText, { color: 'black' }]}>Sort</Text>
              </TouchableOpacity>

              {/* Sort Dropdown */}
              {sortDropdownVisible && (
                <View style={styles.dropdownContainer}>
                  <EnhancedDropdown
                    items={sortOptions}
                    selectedItems={[selectedSort]}
                    onSelect={handleSortOptionSelect}
                    title="Sort By"
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
                  selectedFilters.length > 0 && styles.activeFilterButton,
                ]}
                onPress={() => setFilterDropdownVisible(!filterDropdownVisible)}
                activeOpacity={0.7}
              >
                <Icon name="filter" size={14} color="black" />
                <Text style={[styles.buttonText, { color: 'black' }]}>Filter</Text>
              </TouchableOpacity>

              {/* Filter Dropdown */}
              {filterDropdownVisible && (
                <View style={styles.dropdownContainer}>
                  <EnhancedDropdown
                    items={filterOptions}
                    selectedItems={selectedFilters}
                    onSelect={handleFilterOptionSelect}
                    multiSelect={true}
                    title="Filter By"
                    onClose={() => setFilterDropdownVisible(false)}
                  />
                </View>
              )}
            </View>

            {/* Clear filters button */}
            {selectedFilters.length > 0 && (
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={handleClearFilters}
              >
                <Text style={styles.clearFiltersText}>Clear</Text>
                <MaterialIcons name="close" size={14} color="#f7b305" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search Results */}
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
                      Showing {search.searchResults.length} results • Page {search.currentPage + 1} of {search.totalPages}
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
                <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
              }
            >
              {/* New Arrivals Section */}
              <ProductSection
                title="New Arrivals"
                data={(newArrivalsProductsState.length > 0 ? newArrivalsProductsState : newArrivalsProducts) as any}
                wishlist={wishlist}
                onToggleWishlist={toggleWishlist}
                onProductPress={handleProductPress}
                onMessageSeller={handleMessageSeller}
                onSeeAll={() => handleSeeAll('newArrivals')}
                isLoading={loadingNewArrivals}
              />

              {/* University Products Section */}
              <ProductSection
                title={`${userUniversity} Products`}
                data={(universityProductsState.length > 0 ? universityProductsState : universityProducts) as any}
                wishlist={wishlist}
                onToggleWishlist={toggleWishlist}
                onProductPress={handleProductPress}
                onMessageSeller={handleMessageSeller}
                onSeeAll={() => handleSeeAll('university')}
                isLoading={loadingUniversity}
              />

              {/* Interested Category Products Section */}
              {selectedInterestCategory && (
                <ProductSection
                  title="Products You May Like"
                  data={interestedCategoryProducts}
                  wishlist={wishlist}
                  onToggleWishlist={toggleWishlist}
                  onProductPress={handleProductPress}
                  onMessageSeller={handleMessageSeller}
                  onSeeAll={() => {
                    nav.navigate('CategoryProducts', {
                      categoryId: categories.find(c => c.name.toLowerCase() === selectedInterestCategory.toLowerCase())?.id || 1,
                      categoryName: selectedInterestCategory.charAt(0).toUpperCase() + selectedInterestCategory.slice(1),
                      userUniversity: userUniversity,
                      userCity: userCity,
                    });
                  }}
                  isLoading={loadingInterestedCategory}
                />
              )}

              {/* City Products Section */}
              {userCity && (
                <ProductSection
                  title={`${userCity} Products`}
                  data={(cityProductsState.length > 0 ? cityProductsState : cityProducts) as any}
                  wishlist={wishlist}
                  onToggleWishlist={toggleWishlist}
                  onProductPress={handleProductPress}
                  onMessageSeller={handleMessageSeller}
                  onSeeAll={() => handleSeeAll('city')}
                  isLoading={loadingCity}
                />
              )}

              {/* Featured Products Section */}
              <ProductSection
                title="Featured Products"
                data={(featuredProductsState.length > 0 ? featuredProductsState : featuredProducts) as any}
                wishlist={wishlist}
                onToggleWishlist={toggleWishlist}
                onProductPress={handleProductPress}
                onMessageSeller={handleMessageSeller}
                onSeeAll={() => handleSeeAll('featured')}
                isLoading={loadingFeatured}
              />

              {/* Error display */}
              {productError && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{productError}</Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={onRefresh}
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
    fontWeight: '700',
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
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallButton: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
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
      },
    }),
  },
  sortButton: {
    backgroundColor: '#f7b305',
    borderColor: '#e69b00',
  },
  filterButton: {
    backgroundColor: '#f7b305',
    borderColor: '#e69b00',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 5,
    marginRight: 5,
    color: '#333',
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
      },
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
      },
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
      },
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
      },
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
    backgroundColor: '#fff9e6',
    borderColor: '#f7b305',
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
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: '#f7b305',
    marginLeft: 5,
  },
  clearFiltersText: {
    color: '#f7b305',
    fontSize: 12,
    fontWeight: '500',
    marginRight: 4,
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
      },
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
      },
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
  filterSortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  specialButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginHorizontal: 10,
    marginBottom: 10,
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
      },
    }),
  },
  specialButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default HomeScreen;
