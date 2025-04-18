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
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Icon from 'react-native-vector-icons/FontAwesome';

// Import types
import { CategoryProductsScreenProps } from '../../types/navigation.types';

// Import API methods
import { Product } from '../../api/products';

// Import context
import { useAuth } from '../../contexts';

// Import our new Zustand store
import useCategoryStore from '../../store/categoryStore';

// Get device dimensions for responsive layouts
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_GAP = 10;
const NUM_COLUMNS = 2;
const PRODUCT_CARD_WIDTH = (SCREEN_WIDTH - (COLUMN_GAP * (NUM_COLUMNS + 1))) / NUM_COLUMNS;

// Define types for sort and filter options
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
    if (item.sellingtype === 'rent') {return 'RENT';}
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
            badgeText === 'RENT' ? styles.rentBadge : styles.newBadge,
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
      </View>
    </TouchableOpacity>
  );
});

// EnhancedDropdown component for improved UI
const EnhancedDropdown: React.FC<{
  items: { id: string; label: string }[];
  selectedItems: string[];
  onSelect: (id: string) => void;
  multiSelect?: boolean;
  title: string;
  onClose: () => void;
}> = ({ items, selectedItems, onSelect, multiSelect = false, title, onClose }) => {
  return (
    <View style={styles.enhancedDropdown}>
      <View style={styles.enhancedDropdownHeader}>
        <Text style={styles.enhancedDropdownTitle}>{title}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <MaterialIcons name="close" size={20} color="#666" />
        </TouchableOpacity>
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
  if (!visible) {return null;}

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

// Add a LoadingOverlay component for filtering and sorting operations
const LoadingOverlay: React.FC<{ visible: boolean, message: string }> = ({ visible, message }) => {
  if (!visible) {return null;}

  return (
    <View style={styles.loadingOverlay}>
      <View style={styles.loadingOverlayContent}>
        <ActivityIndicator size="large" color="#f7b305" />
        <Text style={styles.loadingOverlayText}>{message}</Text>
      </View>
    </View>
  );
};

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
    { id: 'brand-new', label: 'Brand New' },
    { id: 'like-new', label: 'Like New' },
    { id: 'very-good', label: 'Very Good' },
    { id: 'good', label: 'Good' },
    { id: 'acceptable', label: 'Acceptable' },
    { id: 'rent', label: 'For Rent' },
    { id: 'sell', label: 'For Sale' },
    { id: 'free', label: 'Free Items' },
  ], []);

  // Use Zustand store instead of local state
  const {
    // Product data
    products,

    // Loading states
    loading,
    loadingMoreData,
    error,
    refreshing,

    // Pagination state
    totalCount,
    hasMoreData,

    // Search, sort and filter states
    searchQuery,
    selectedSortOption,
    selectedFilters,

    // UI states
    isSortDropdownVisible,
    isFilterDropdownVisible,

    // Actions
    setSearchQuery,
    setSortDropdownVisible,
    setFilterDropdownVisible,
    setSelectedSortOption,
    setSelectedFilters,

    // API functions
    loadCategoryProducts,
    searchProducts,
    handleRefresh: refreshProducts,
    applyFilters,
    clearFilters,
    loadMore,
  } = useCategoryStore();

  // Local state for UI elements that don't need to be in the store
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Extract user location data - prioritize route params over user context
  const userUniversity = routeUniversity || user?.university || '';
  const userCity = routeCity || user?.city || '';

  // At the top of the CategoryProductsScreen component
  // Add a new initialLoad ref to track the first load
  const isInitialLoadRef = useRef(true);

  // Additional store functions for category context
  const setCurrentCategory = useCategoryStore(state => state.setCurrentCategory);

  // Handler for back button press
  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Helper function to toggle wishlist
  const toggleWishlist = useCallback((id: string) => {
    setWishlist(prev => {
      if (prev.includes(id)) {
        return prev.filter(itemId => itemId !== id);
      } else {
        return [...prev, id];
      }
    });
  }, []);

  // Handler for product press
  const handleProductPress = useCallback((product: Product) => {
    navigation.navigate('ProductInfoPage', { product });
  }, [navigation]);

  // Handler for search input change
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, [setSearchQuery]);

  // Handler for search submission
  const handleSearchSubmit = useCallback(() => {
    if (searchQuery.trim().length > 0) {
      // Call the store's searchProducts function
      searchProducts(searchQuery);
    }
  }, [searchQuery, searchProducts]);

  // Handler for refresh
  const handleRefresh = useCallback(() => {
    // Wrap refreshProducts to pass the correct parameters
    refreshProducts();
  }, [refreshProducts]);

  // Add a loading state for sort operations
  const [isSorting, setIsSorting] = useState(false);

  // Handler for sort option selection - improved with visual feedback
  const handleSortOptionSelect = useCallback((option: string) => {
    // Show sorting spinner
    setIsSorting(true);

    // Update the selected option immediately
    setSelectedSortOption(option);
    setSortDropdownVisible(false);

    // Apply filters with the new sort option
    setTimeout(() => {
      applyFilters();
      // Hide spinner after sorting is done
      setIsSorting(false);
    }, 100);
  }, [setSelectedSortOption, setSortDropdownVisible, applyFilters]);

  // Update the component to track filtering state
  const [isFiltering, setIsFiltering] = useState(false);

  // Handler for filter option selection
  const handleFilterOptionSelect = useCallback((option: string) => {
    // Get current filters first
    const currentFilters = [...selectedFilters];
    const newFilters = currentFilters.includes(option)
      ? currentFilters.filter(id => id !== option)
      : [...currentFilters, option];

    // Only update the selected filters, don't apply them yet
    setSelectedFilters(newFilters);

    // We'll only apply filters when the "Apply Filters" button is clicked
  }, [selectedFilters, setSelectedFilters]);

  // Add an Apply Filters button handler
  const handleApplyFilters = useCallback(() => {
    setIsFiltering(true);
    setFilterDropdownVisible(false);

    // Apply filters after a short delay to allow UI to update
    setTimeout(() => {
      applyFilters();
      setIsFiltering(false);
    }, 100);
  }, [applyFilters, setFilterDropdownVisible]);

  // Update Clear Filters to restore original products
  const handleClearFilters = useCallback(() => {
    if (selectedFilters.length > 0 && selectedSortOption !== 'default' && searchQuery.trim() !== '') {
      Alert.alert(
        'Clear All',
        'Do you want to clear all filters, sorting, and search?',
        [
          {
            text: 'Clear All',
            onPress: () => {
              // Show loading spinner during clear operation
              setIsFiltering(true);
              setTimeout(() => {
                clearFilters();
                setIsFiltering(false);
              }, 100);
            },
          },
          {
            text: 'Clear Filters Only',
            onPress: () => {
              setIsFiltering(true);
              setTimeout(() => {
                setSelectedFilters([]);
                applyFilters(); // Apply with empty filters
                setIsFiltering(false);
              }, 100);
            },
          },
          {
            text: 'Clear Sort Only',
            onPress: () => {
              setIsSorting(true);
              setTimeout(() => {
                setSelectedSortOption('default');
                applyFilters(); // Apply with default sort
                setIsSorting(false);
              }, 100);
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } else {
      // Show loading indicator during clear operation
      if (selectedFilters.length > 0) {
        setIsFiltering(true);
      } else if (selectedSortOption !== 'default') {
        setIsSorting(true);
      } else {
        setIsFiltering(true);
      }

      setTimeout(() => {
        clearFilters();
        setIsFiltering(false);
        setIsSorting(false);
      }, 100);
    }
  }, [clearFilters, selectedFilters, selectedSortOption, searchQuery, setSelectedFilters, setSelectedSortOption, applyFilters]);

  // Initial data load on mount
  useEffect(() => {
    console.log('[CategoryProducts] Initial useEffect mount - triggering load');
    // Force immediate load on mount
    const loadInitialData = async () => {
      try {
        // Set the current category context first
        setCurrentCategory(categoryName, categoryId, userUniversity, userCity);

        // Then load the products
        await loadCategoryProducts(categoryName, categoryId, userUniversity, userCity, 0, false);
        isInitialLoadRef.current = false;
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

  // Handle scroll events to show/hide back to top button
  const handleScroll = useCallback((event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowBackToTop(offsetY > 300); // Show button when scrolled down 300px
  }, []);

  // Scroll to top function
  const scrollToTop = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // List footer component with loading indicator for pagination
  const ListFooterComponent = useCallback(() => (
    <View style={{ height: 80, justifyContent: 'center', alignItems: 'center' }}>
      {loadingMoreData && (
        <View style={{ paddingVertical: 20 }}>
          <ActivityIndicator size="small" color="#f7b305" />
          <Text style={{ color: '#888', fontSize: 12, marginTop: 5 }}>
            Loading more products...
          </Text>
        </View>
      )}

      {products.length > 0 && !loadingMoreData && (
        <Text style={{ color: '#888', fontSize: 12, marginTop: 10 }}>
          {hasMoreData
            ? `Showing ${products.length} of ${totalCount} products`
            : `Showing all ${products.length} products`}
        </Text>
      )}
    </View>
  ), [products.length, totalCount, loadingMoreData, hasMoreData]);

  // Move the handleLoadMore to use the store's loadMore function
  const handleLoadMore = useCallback(() => {
    // We need to ensure the current context is passed to loadMore
    loadMore();
    // The store's loadMore function needs to pass the right parameters to loadCategoryProducts
    // so we could enhance it if needed
  }, [loadMore]);

  // We might need to keep an effect for handling searchQuery changes
  useEffect(() => {
    // Only run this effect for search query changes
    if (searchQuery && searchQuery.trim() !== '') {
      // This is for search functionality only - not for regular filters
      console.log(`[CategoryProducts] Search query changed, searching for: "${searchQuery}"`);
    }
  }, [searchQuery]);

  // Remove the refs, layouts and measurement code that's causing errors
  // Keep the original handlers without the measure calls
  const handleSortButtonClick = useCallback(() => {
    setSortDropdownVisible(!isSortDropdownVisible);
    if (isFilterDropdownVisible) {
      setFilterDropdownVisible(false);
    }
  }, [isSortDropdownVisible, isFilterDropdownVisible, setSortDropdownVisible, setFilterDropdownVisible]);

  const handleFilterButtonClick = useCallback(() => {
    setFilterDropdownVisible(!isFilterDropdownVisible);
    if (isSortDropdownVisible) {
      setSortDropdownVisible(false);
    }
  }, [isFilterDropdownVisible, isSortDropdownVisible, setFilterDropdownVisible, setSortDropdownVisible]);

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
                style={[
                  styles.clearFiltersButton,
                  (selectedFilters.length > 3 || selectedSortOption !== 'default') && styles.emphasizedClearButton,
                ]}
                onPress={handleClearFilters}
                disabled={isSorting || isFiltering}
              >
                <Text style={styles.clearFiltersText}>
                  {(selectedFilters.length > 0 && selectedSortOption !== 'default') ?
                    `Clear All (${selectedFilters.length + 1})` :
                    selectedFilters.length > 0 ?
                      `Clear (${selectedFilters.length})` :
                      selectedSortOption !== 'default' ?
                        '' :
                        'Clear All'}
                </Text>
                <MaterialIcons name="clear" size={14} color="#f7b305" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.filterButton,
                isSortDropdownVisible && styles.activeFilterButton,
                { backgroundColor: '#f7b305', borderColor: '#ddd' },
                selectedSortOption !== 'default' && styles.activeFilterButton,
              ]}
              onPress={handleSortButtonClick}
              disabled={isSorting}
            >
              <Text style={styles.filterButtonText}>Sort</Text>
              {isSorting ? (
                <ActivityIndicator size="small" color="black" style={{ marginLeft: 5 }} />
              ) : (
                <Icon name="sort" size={14} color="black" />
              )}
            </TouchableOpacity>

            {/* Sort dropdown */}
            {isSortDropdownVisible && (
              <View style={styles.sortDropdownContainer}>
                <EnhancedDropdown
                  items={sortOptions}
                  selectedItems={[selectedSortOption]}
                  onSelect={handleSortOptionSelect}
                  title="Sort By"
                  onClose={() => setSortDropdownVisible(false)}
                />
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.filterButton,
                isFilterDropdownVisible && styles.activeFilterButton,
                { backgroundColor: '#f7b305', borderColor: '#ddd' },
                selectedFilters.length > 0 && styles.activeFilterButton,
              ]}
              onPress={handleFilterButtonClick}
            >
              <Text style={styles.filterButtonText}>Filter</Text>
              {selectedFilters.length > 0 && (
                <View style={styles.filterCountBadge}>
                  <Text style={styles.filterCountText}>{selectedFilters.length}</Text>
                </View>
              )}
              {isFiltering ? (
                <ActivityIndicator size="small" color="black" style={{ marginLeft: 5 }} />
              ) : (
                <Icon name="filter" size={14} color="black" />
              )}
            </TouchableOpacity>

            {/* Filter dropdown */}
            {isFilterDropdownVisible && (
              <View style={styles.filterDropdownContainer}>
                <EnhancedDropdown
                  items={filterOptions}
                  selectedItems={selectedFilters}
                  onSelect={handleFilterOptionSelect}
                  multiSelect={true}
                  title="Filter By"
                  onClose={() => setFilterDropdownVisible(false)}
                />
                <TouchableOpacity
                  style={styles.applyFiltersButton}
                  onPress={handleApplyFilters}
                >
                  <Text style={styles.applyFiltersText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Main content - Product list or loading/empty state */}
        {loading && !refreshing ? (
          <ProductsGridSkeleton />
        ) : error ? (
          <EmptyState
            message="Error loading products"
            subMessage={error}
          />
        ) : products.length === 0 ? (
          <EmptyState
            message="No products found"
            subMessage={searchQuery ? 'Try a different search term or filter' : 'Try a different category'}
          />
        ) : (
          <FlatList
            ref={flatListRef}
            data={products as any[]}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.productList}
            columnWrapperStyle={styles.columnWrapper}
            refreshControl={refreshControl}
            onScroll={handleScroll}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={ListFooterComponent}
          />
        )}

        {/* Back to top button */}
        {showBackToTop && (
          <TouchableOpacity
            style={styles.backToTopButton}
            onPress={scrollToTop}
            activeOpacity={0.8}
          >
            <MaterialIcons name="keyboard-arrow-up" size={24} color="white" />
          </TouchableOpacity>
        )}

        {/* Loading overlay for filtering and sorting */}
        <LoadingOverlay
          visible={isSorting || isFiltering}
          message={isSorting ? 'Sorting products...' : 'Applying filters...'}
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
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginLeft: 10,
    backgroundColor: '#f7b305',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterButtonText: {
    fontSize: 13,
    color: 'black',
    marginRight: 5,
    fontWeight: '500',
  },
  activeFilterButton: {
    backgroundColor: '#e69b00',
    borderColor: '#e69b00',
  },
  dropdownContainer: {
    position: 'absolute',
    top: 40,
    right: 0,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 6,
  },
  enhancedDropdown: {
    width: Math.min(260, Dimensions.get('window').width * 0.6),
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
    borderRadius: 20,
    backgroundColor: '#f2f2f2',
    height: 44,
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
    backgroundColor: 'red',
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
  skeletonLine: {
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginVertical: 2,
  },
  closeButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  emphasizedClearButton: {
    backgroundColor: '#fff0d4',
    borderColor: '#f7b305',
    borderWidth: 1.5,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingOverlayContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingOverlayText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  applyFiltersButton: {
    backgroundColor: '#f7b305',
    padding: 12,
    borderRadius: 5,
    margin: 10,
    alignItems: 'center',
  },
  applyFiltersText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sortDropdownContainer: {
    position: 'absolute',
    top: 38,
    right: 0,
    width: 260,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 8,
  },
  filterDropdownContainer: {
    position: 'absolute',
    top: 38,
    right: 0,
    width: 260,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 8,
  },
  filterCountBadge: {
    backgroundColor: '#e69b00',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
    marginRight: 2,
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    paddingHorizontal: 3,
  },
});

export default React.memo(CategoryProductsScreen);
