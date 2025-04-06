import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  Dimensions, 
  TouchableOpacity, 
  ScrollView, 
  Animated, 
  SafeAreaView,
  Alert,
  Share,
  ActivityIndicator,
  FlatList,
  Modal,
  StatusBar,
  Platform,
  Pressable
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { ProductInfoScreenRouteProp, ProductInfoScreenNavigationProp } from '../../types/navigation.types';
import { getProductById, getProductsByCategory } from '../../api/products'; // Import the category API function

const { width, height } = Dimensions.get('window');

// Extended Product type that includes seller information
interface ExtendedProduct {
  id: number | string;
  name: string;
  price: string;
  image: string;
  description?: string;
  condition?: string;
  type?: string;
  images?: string[];
  seller?: {
    name: string;
    rating?: number;
    id?: string;
    contactNumber?: string;
    email?: string;
  };
  sellerName?: string;
  email?: string;
  category?: string;
  sellingtype?: string; // Note the lowercase in the API response
}

// Base product type from params
interface BaseProduct {
  id: number | string;
  name: string;
  price: string;
  image: string;
  description?: string;
  condition?: string;
  type?: string;
  images?: string[];
  sellerName?: string;
  email?: string;
  sellingtype?: string; // Add sellingtype property
}

// Sample product data (fallback if route params are missing)
const sampleProduct: ExtendedProduct = {
  id: 1,
  name: 'Product Name',
  price: '$24.99',
  image: 'https://via.placeholder.com/300',
  condition: 'New',
  type: 'Electronics',
  description: 'This is a sample product description. It includes details about the product, its features, and its benefits.',
  images: [
    'https://via.placeholder.com/300',
    'https://via.placeholder.com/300/FF0000',
    'https://via.placeholder.com/300/00FF00',
  ],
  seller: {
    id: 'seller1',
    name: 'Koushik Reddy',
    rating: 4.8,
    contactNumber: '+1234567890',
    email: 'seller@example.com'
  },
  sellerName: 'Koushik Reddy',
  email: 'seller@example.com'
};

// Sample reviews for the seller
const sellerReviews = [
  { id: 1, name: 'Alice', rating: 5, text: 'Excellent communication and fast shipping!' },
  { id: 2, name: 'Bob', rating: 4, text: 'Great seller, item as described, would buy again.' },
  { id: 3, name: 'Charlie', rating: 5, text: 'Super friendly and helpful, highly recommend!' },
];

// Product Image Gallery Component
const ImageGallery: React.FC<{
  images: string[];
  onImagePress: (index: number) => void;
}> = React.memo(({ images, onImagePress }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { 
      useNativeDriver: false,
      listener: (event: any) => {
        const index = Math.floor(event.nativeEvent.contentOffset.x / width);
        setCurrentIndex(index);
      }
    }
  );

  const goToImage = (index: number) => {
    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({ index, animated: true });
    }
  };

  // Memoized pagination component
  const renderPagination = useMemo(() => {
    if (images.length <= 1) return null;
    
    return (
      <View style={styles.paginationContainer}>
        <View style={styles.paginationDots}>
          {images.map((_, index) => (
            <TouchableOpacity 
              key={index} 
              style={[
                styles.paginationDot,
                { backgroundColor: index === currentIndex ? '#f7b305' : '#ccc' }
              ]} 
              onPress={() => goToImage(index)}
            />
          ))}
        </View>
      </View>
    );
  }, [currentIndex, images]);

  // Memoized render item
  const renderItem = useCallback(({ item, index }: { item: string, index: number }) => (
    <Pressable 
      style={styles.imageContainer}
      onPress={() => onImagePress(index)}
    >
      <Image 
        source={{ uri: typeof item === 'string' && item.trim() !== '' ? item : 'https://via.placeholder.com/300' }} 
        style={styles.productImage}
        resizeMode="cover"
        defaultSource={{ uri: 'https://via.placeholder.com/300' }}
      />
    </Pressable>
  ), [onImagePress]);

  return (
    <View style={styles.imageGalleryContainer}>
      <FlatList
        ref={flatListRef}
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        keyExtractor={(_, index) => `image_${index}`}
        renderItem={renderItem}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
      />
      {renderPagination}
    </View>
  );
});

// Rating Stars Component
const RatingStars: React.FC<{
  rating: number;
  size?: number;
  color?: string;
}> = React.memo(({ rating, size = 16, color = '#f7b305' }) => {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  return (
    <View style={styles.ratingContainer}>
      {Array.from({ length: fullStars }).map((_, index) => (
        <Icon key={`full_${index}`} name="star" size={size} color={color} />
      ))}
      {halfStar && <Icon key="half" name="star-half-o" size={size} color={color} />}
      {Array.from({ length: emptyStars }).map((_, index) => (
        <Icon key={`empty_${index}`} name="star-o" size={size} color={color} />
      ))}
    </View>
  );
});

// Similar Products Component
const SimilarProducts: React.FC<{
  products: BaseProduct[];
  onProductPress: (product: BaseProduct) => void;
}> = React.memo(({ products, onProductPress }) => {
  // Memoized render item function
  const renderItem = useCallback(({ item }: { item: BaseProduct }) => (
    <TouchableOpacity 
      style={styles.similarProductItem}
      onPress={() => onProductPress(item)}
    >
      <Image 
        source={{ uri: item.image && item.image.trim() !== '' ? item.image : 'https://via.placeholder.com/150' }} 
        style={styles.similarProductImage}
        resizeMode="cover"
        defaultSource={{ uri: 'https://via.placeholder.com/150' }}
      />
      <View style={styles.similarProductInfo}>
        <Text style={styles.similarProductName} numberOfLines={1}>{item.name}</Text>
        
        {/* Property status tags (condition and selling type) */}
        <View style={styles.similarTagsRow}>
          {/* Show condition if available */}
          {item.condition && (
            <View style={styles.similarProductCondition}>
              <Text style={styles.similarConditionText}>{item.condition}</Text>
            </View>
          )}
          
          {/* Show selling type if available */}
          {item.sellingtype && (
            <View style={styles.similarSellingTypeTag}>
              <Text style={styles.similarConditionText}>
                {item.sellingtype.toLowerCase().includes('rent') ? 'Rent' : 'Sale'}
              </Text>
            </View>
          )}
        </View>
        
        {/* Price tag */}
        <View style={styles.similarProductPriceContainer}>
          <Text style={styles.similarProductPrice}>{item.price}</Text>
        </View>
      </View>
    </TouchableOpacity>
  ), [onProductPress]);

  return (
    <View style={styles.similarProductsContainer}>
      <Text style={styles.sectionTitle}>Similar Products</Text>
      <FlatList
        data={products}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => `similar_${item.id}`}
        renderItem={renderItem}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
      />
    </View>
  );
});

// Image Zoom Modal Component
const ImageZoomModal: React.FC<{
  visible: boolean;
  imageUri: string;
  onClose: () => void;
}> = React.memo(({ visible, imageUri, onClose }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackground}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
        
        <Image
          source={{ uri: imageUri && imageUri.trim() !== '' ? imageUri : 'https://via.placeholder.com/300' }}
          style={styles.zoomedImage}
          resizeMode="contain"
          defaultSource={{ uri: 'https://via.placeholder.com/300' }}
        />
      </View>
    </Modal>
  );
});

const ProductsScreen = () => {
  const navigation = useNavigation<ProductInfoScreenNavigationProp>();
  const route = useRoute<ProductInfoScreenRouteProp>();
  const [isLoading, setIsLoading] = useState(false);
  const [zoomVisible, setZoomVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [expandDescription, setExpandDescription] = useState(false);
  const [_isInWishlist, _setIsInWishlist] = useState(false);
  const [productData, setProductData] = useState<ExtendedProduct | null>(null);
  const [similarProductsData, setSimilarProductsData] = useState<BaseProduct[]>([]);
  const [loadingSimilarProducts, setLoadingSimilarProducts] = useState(false);
  
  // Extract product and productId from route params
  const routeParams = route.params || {};
  const productFromRoute = routeParams.product;
  const productId = routeParams.productId;
  
  // Fetch product data when component mounts if we have a productId
  useEffect(() => {
    const fetchProductData = async () => {
      // If we already have the product data in route params, use that
      if (productFromRoute) {
        return;
      }
      
      // Only fetch from API if we have a productId and no product object
      if (productId) {
        try {
          setIsLoading(true);
          
          const fetchedProduct = await getProductById(productId);
          
          setProductData(fetchedProduct as unknown as ExtendedProduct);
        } catch (error) {
          console.error('[ProductsScreen] Error fetching product:', error);
          // Show error alert to user
          Alert.alert('Error', 'Unable to load product details. Please try again.');
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    fetchProductData();
  }, [productId, productFromRoute]);
  
  // Use the product from route params if available, otherwise use the one fetched from API, or the sample product as fallback
  const routeProduct = productFromRoute || productData;
  
  // Create an extended product object with seller information if not provided
  const product: ExtendedProduct = useMemo(() => {
    if (!routeProduct) {
      return sampleProduct;
    }
    
    // Add a check for case-sensitivity issues
    const productObj = routeProduct as unknown as Record<string, any>;
    const keys = Object.keys(productObj);
    const normalizedKeys = keys.reduce((obj, key) => {
      obj[key.toLowerCase()] = key;
      return obj;
    }, {} as Record<string, string>);
    
    // Try to find sellerName with different case variations
    let actualSellerName = productObj.sellerName;
    if (!actualSellerName && normalizedKeys.sellername) {
      const key = normalizedKeys.sellername;
      actualSellerName = productObj[key];
    }
    
    const result: ExtendedProduct = {
      ...productObj,
      id: productObj.id,
      name: productObj.name,
      price: productObj.price,
      image: productObj.image || 'https://via.placeholder.com/300',
      // Ensure sellerName is properly assigned regardless of case
      sellerName: actualSellerName || productObj.sellerName,
      seller: productObj.seller || sampleProduct.seller // Use sample seller data if not provided
    };
    
    return result;
  }, [routeProduct]);
  
  // Handle case where product might not have images array - also normalize to strings only
  const productImages = useMemo(() => {
    const defaultImage = 'https://via.placeholder.com/300';
    
    if (!product.images || !Array.isArray(product.images) || product.images.length === 0) {
      return [(product.image && product.image.trim() !== '') ? product.image : defaultImage];
    }
    
    // Ensure all items are valid non-empty strings
    const validImages = product.images
      .map(img => typeof img === 'string' && img.trim() !== '' ? img : defaultImage)
      .filter(img => img && img.trim() !== '');
    
    // If no valid images were found, return the default image
    return validImages.length > 0 ? validImages : [defaultImage];
  }, [product.images, product.image]);

  // Memoize share function
  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Check out this awesome product: ${product.name} for ${product.price}`,
        url: productImages[0]
      });
    } catch (error) {
      console.error('Error sharing product:', error);
    }
  }, [product.name, product.price, productImages]);

  // Memoize contact seller function
  const handleContactSeller = useCallback((method: string) => {
    if (method === 'message') {
      try {
        // Get seller info from product attributes
        const sellerName = product.sellerName || product.seller?.name || 'Seller';
        const sellerEmail = product.email || product.seller?.email;
        
        if (!sellerEmail) {
          console.warn('[ProductsScreen] No seller email available for chat');
          Alert.alert('Error', 'Could not start chat - seller email not available.');
          return;
        }
        
        console.log('[ProductsScreen] Navigating to Firebase chat with seller:', sellerName, sellerEmail);
        
        // Navigate to the Firebase Chat screen instead of MessageScreen
        // Use the 'any' type to avoid TypeScript issues with the navigation
        (navigation as any).navigate('FirebaseChatScreen', { 
          recipientEmail: sellerEmail,
          recipientName: sellerName
        });
      } catch (error) {
        console.error('Navigation error:', error);
        Alert.alert('Error', 'Could not open chat screen.');
      }
    }
  }, [navigation, product]);

  // Memoize image press function
  const handleImagePress = useCallback((index: number) => {
    if (index >= 0 && index < productImages.length) {
      setSelectedImage(productImages[index]);
      setZoomVisible(true);
    }
  }, [productImages]);

  // Memoize similar product press function
  const handleSimilarProductPress = useCallback((similarProduct: BaseProduct) => {
    // @ts-ignore - We know this route exists
    navigation.replace('ProductInfoPage', { product: similarProduct });
  }, [navigation]);

  // Memoize seller profile navigation
  const handleViewSellerProfile = useCallback(() => {
    try {
      // Get seller email from product
      const sellerEmail = product.email || product.seller?.email;
      
      if (!sellerEmail) {
        console.warn('[ProductsScreen] No seller email available for navigation');
        Alert.alert('Error', 'Could not view seller profile - email not available.');
        return;
      }
      
      console.log('[ProductsScreen] Navigating to seller profile with email:', sellerEmail);
      
      // Navigate to the ProfileScreen with the seller's email
      navigation.navigate('Profile', { 
        sellerEmail: sellerEmail 
      });
    } catch (error) {
      console.error('[ProductsScreen] Navigation error:', error);
      Alert.alert('Error', 'Could not view seller profile.');
    }
  }, [navigation, product.email, product.seller?.email]);

  // Content sections are memoized for better performance
  const renderDescriptionSection = useMemo(() => (
    <View style={styles.descriptionContainer}>
      <Text style={styles.sectionTitle}>Description</Text>
      <View style={[
        styles.descriptionBox, 
        expandDescription && styles.expandedDescriptionBox,
        !product.description && styles.noDescriptionBox
      ]}>
        {product.description ? (
          <>
            <Text 
              style={[
                styles.descriptionText,
                product.description.length < 80 && styles.shortDescriptionText
              ]}
              numberOfLines={expandDescription ? undefined : 4}
            >
              {product.description}
            </Text>
            {product.description.length > 120 && (
              <TouchableOpacity 
                style={[
                  styles.readMoreButton,
                  expandDescription && styles.readLessButton
                ]}
                onPress={() => setExpandDescription(!expandDescription)}
              >
                <Text style={styles.readMoreText}>
                  {expandDescription ? 'Show less' : 'Read more'}
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={styles.noDescriptionContent}>
            <MaterialIcons name="description" size={24} color="#ccc" />
            <Text style={styles.noDescriptionText}>
              No description available for this product.
            </Text>
          </View>
        )}
      </View>
    </View>
  ), [product.description, expandDescription]);

  // Debug section memoization
  const renderDebugSection = useMemo(() => {
    // Return null to disable debug section completely
    return null;
  }, []);

  // Fetch similar products based on the current product category
  useEffect(() => {
    const fetchSimilarProducts = async () => {
      // Only fetch if we have a valid product with category
      if (!product) return;
      
      // Try to get category from the product
      const category = product.category || product.type;
      
      if (!category) {
        console.log('[ProductsScreen] No category found for similar products');
        return;
      }
      
      try {
        setLoadingSimilarProducts(true);
        
        // Convert category to lowercase for consistency with API
        const normalizedCategory = category.toLowerCase();
        console.log(`[ProductsScreen] Fetching similar products for category: ${normalizedCategory}`);
        
        // Fetch products by category
        const result = await getProductsByCategory(normalizedCategory, {
          // Limit results to 10 similar products
          size: 10
        });
        
        // Filter out the current product from results
        let similarItems = Array.isArray(result.products) 
          ? result.products 
          : [];
        
        // Remove the current product from similar items
        similarItems = similarItems.filter(item => item.id !== product.id);
        
        // Limit to 5 similar products max
        similarItems = similarItems.slice(0, 5);
        
        console.log(`[ProductsScreen] Found ${similarItems.length} similar products`);
        
        // Convert API Product type to BaseProduct type for state
        const convertedSimilarItems: BaseProduct[] = similarItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price || '0.00',
          image: item.image || item.primaryImage || 'https://via.placeholder.com/150',
          description: item.description,
          condition: item.condition || 'Used',
          type: item.type,
          sellerName: item.sellerName || (item.seller?.name || ''),
          email: item.email || '',
          images: item.images || item.imageUrls || [],
          sellingtype: item.sellingtype || ''
        }));
        
        // Update state with similar products
        setSimilarProductsData(convertedSimilarItems);
      } catch (error) {
        console.error('[ProductsScreen] Error fetching similar products:', error);
        // Keep the array empty on error
        setSimilarProductsData([]);
      } finally {
        setLoadingSimilarProducts(false);
      }
    };
    
    fetchSimilarProducts();
  }, [product]);

  // Similar Products rendering section with loading state
  const renderSimilarProductsSection = useMemo(() => {
    // If loading, show loading indicator
    if (loadingSimilarProducts) {
      return (
        <View style={styles.similarProductsContainer}>
          <Text style={styles.sectionTitle}>Similar Products</Text>
          <View style={styles.loadingSimilarContainer}>
            <ActivityIndicator size="small" color="#f7b305" />
            <Text style={styles.loadingSimilarText}>Finding similar items...</Text>
          </View>
        </View>
      );
    }
    
    // If no similar products found and not loading, don't show the section
    if (similarProductsData.length === 0) {
      return null;
    }
    
    // Otherwise show the similar products list
    return (
      <SimilarProducts 
        products={similarProductsData}
        onProductPress={handleSimilarProductPress}
      />
    );
  }, [similarProductsData, loadingSimilarProducts, handleSimilarProductPress]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f7b305" />
        <Text style={styles.loadingText}>Loading product details...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      {/* Enhanced Header with even-width buttons */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle} numberOfLines={1}>Product Details</Text>
        
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => Alert.alert('Report Item', 'Do you want to report this item?')}
        >
          <MaterialIcons name="report-problem" size={22} color="#e74c3c" />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Gallery */}
        <ImageGallery 
          images={productImages} 
          onImagePress={handleImagePress}
        />
        
        {/* Product Info */}
        <View style={styles.productInfoContainer}>
          {/* Title with Share option */}
          <View style={styles.titleContainer}>
            <Text style={styles.productName}>{product.name}</Text>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShare}
            >
              <MaterialIcons name="share" size={22} color="#333" />
            </TouchableOpacity>
          </View>
          
          {/* Price and tags in one row - with price on the left */}
          <View style={styles.priceAndTagsRow}>
            <Text style={styles.productPrice}>${product.price}</Text>
            <View style={styles.tagsContainer}>
              {product.condition && (
                <View style={styles.tagItem}>
                  <Text style={styles.tagText}>{product.condition}</Text>
                </View>
              )}
              {/* Show selling type (sale/rent) if available */}
              {product.sellingtype && (
                <View style={[styles.tagItem, styles.sellingTypeTag]}>
                  <Text style={styles.tagText}>
                    {product.sellingtype.toLowerCase().includes('rent') ? 'For Rent' : 'For Sale'}
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          {/* Debug Section - Only visible in development */}
          {renderDebugSection}

          {/* Description Section */}
          {renderDescriptionSection}

          {/* Seller Profile */}
          <View style={styles.sellerSection}>
            <Text style={styles.sectionTitle}>Seller Information</Text>
            
            <View style={styles.sellerProfileContainer}>
              {/* Top row with profile and details */}
              <View style={styles.sellerInfoContainer}>
                <View style={styles.profileImageWrapper}>
                  <TouchableOpacity 
                    style={styles.profileCircle}
                    onPress={handleViewSellerProfile}
                  >
                    <Text style={styles.profileText}>
                      {(() => {
                        // Get the display name prioritizing sellerName, then seller.name
                        const displayName = product.sellerName || product.seller?.name || '';
                        return displayName ? displayName.charAt(0).toUpperCase() : 'S';
                      })()}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.sellerDetails}>
                  <Text style={styles.sellerName}>
                    {product.sellerName || product.seller?.name || 'Unknown Seller'}
                  </Text>
                  <View style={styles.sellerMetaInfo}>
                    {product.seller?.rating && (
                      <View style={styles.sellerRatingContainer}>
                        <RatingStars rating={product.seller.rating} />
                        <Text style={styles.ratingText}>{product.seller.rating.toFixed(1)}</Text>
                      </View>
                    )}
                    <View style={styles.sellerBadgeContainer}>
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    </View>
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={styles.viewProfileButton}
                  onPress={handleViewSellerProfile}
                >
                  <Text style={styles.viewProfileText}>View Profile</Text>
                  <Ionicons name="chevron-forward" size={16} color="#f7b305" />
                </TouchableOpacity>
              </View>
              
              {/* Contact button with gradient-like effect */}
              <TouchableOpacity 
                style={styles.contactSellerButton}
                onPress={() => handleContactSeller('message')}
              >
                <Ionicons name="chatbubble-outline" size={18} color="#FFF" />
                <Text style={styles.contactButtonText}>Message Seller</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Seller Reviews */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Reviews</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>
            
            {sellerReviews.map(review => (
              <View key={review.id} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewName}>{review.name}</Text>
                  <RatingStars rating={review.rating} />
                </View>
                <Text style={styles.reviewText}>{review.text}</Text>
              </View>
            ))}
          </View>
          
          {/* Similar Products - Showing dynamic content */}
          {renderSimilarProductsSection}
        </View>
      </ScrollView>
      
      {/* Image Zoom Modal */}
      <ImageZoomModal 
        visible={zoomVisible}
        imageUri={selectedImage}
        onClose={() => setZoomVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    flex: 1,
    marginHorizontal: 10,
  },
  scrollView: {
    flex: 1,
  },
  imageGalleryContainer: {
    height: width * 0.65,
    backgroundColor: 'white',
    position: 'relative',
  },
  imageContainer: {
    width: width,
    height: width * 0.65,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImage: {
    width: width * 0.85,
    height: width * 0.55,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 20,
    width: '100%',
    alignItems: 'center',
    zIndex: 10,
    pointerEvents: 'box-none',
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 10,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 6,
  },
  productInfoContainer: {
    paddingHorizontal: 20,
    
    backgroundColor: 'white',
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 5,
  },
  shareButton: {
    padding: 8,
    borderRadius: 20,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
    letterSpacing: 0.3,
    flex: 1,
    paddingRight: 14,
  },
  priceAndTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 0,
  },
  productPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e67e22',
    marginRight: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
  },
  tagItem: {
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#eeeeee',
  },
  sellingTypeTag: {
    backgroundColor: '#e8f4fd',
    borderColor: '#c5e0f5',
  },
  tagText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '600',
  },
  sectionContainer: {
    marginTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: '#f7b305',
    fontWeight: '600',
  },
  descriptionContainer: {
    marginTop: 10,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  descriptionBox: {
    backgroundColor: '#FDB51C1A',
    borderRadius: 12,
    padding: 16,
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#eeeeee',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  expandedDescriptionBox: {
    minHeight: 200,
    maxHeight: undefined,
  },
  noDescriptionBox: {
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
    textAlign: 'justify',
  },
  shortDescriptionText: {
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#333',
  },
  readMoreButton: {
    marginTop: 12,
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 15,
    backgroundColor: 'rgba(247, 179, 5, 0.15)',
  },
  readLessButton: {
    backgroundColor: 'rgba(247, 179, 5, 0.25)',
  },
  readMoreText: {
    fontSize: 14,
    color: '#f7b305',
    fontWeight: 'bold',
  },
  noDescriptionContent: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  noDescriptionText: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
  },
  
  sellerSection: {
    marginTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  sellerProfileContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#eeeeee',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  sellerInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  profileImageWrapper: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  profileCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  profileText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  sellerDetails: {
    marginLeft: 16,
    flex: 1,
  },
  sellerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 6,
  },
  sellerMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    marginLeft: 4,
  },
  sellerBadgeContainer: {
    flexDirection: 'row',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 2,
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  viewProfileText: {
    fontSize: 13,
    color: '#f7b305',
    fontWeight: '600',
  },
  contactSellerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: '#f7b305',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(247, 179, 5, 0.5)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  contactButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  ratingContainer: {
    flexDirection: 'row',
  },
  reviewItem: {
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eeeeee',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reviewName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  reviewText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  similarProductsContainer: {
    marginTop: 24,
    marginBottom: 100, // Extra space at bottom for the action bar
  },
  similarProductItem: {
    width: 160,
    marginRight: 12,
    borderRadius: 16,
    backgroundColor: 'white',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eeeeee',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  similarProductImage: {
    width: '100%',
    height: 120,
  },
  similarProductInfo: {
    padding: 12,
  },
  similarProductName: {
    fontSize: 15,
    color: '#333',
    marginBottom: 6,
    fontWeight: '500',
  },
  similarTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  similarProductCondition: {
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 5,
    borderWidth: 1,
    borderColor: '#eeeeee',
  },
  similarSellingTypeTag: {
    backgroundColor: '#e8f4fd',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#c5e0f5',
  },
  similarConditionText: {
    fontSize: 10,
    color: '#555',
    fontWeight: '600',
  },
  similarProductPriceContainer: {
    backgroundColor: 'black',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  similarProductPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  actionButtonIcon: {
    marginRight: 8,
  },
  offerButton: {
    backgroundColor: '#2ecc71',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 10,
    borderRadius: 25,
  },
  zoomedImage: {
    width: width,
    height: height * 0.7,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 12,
  },
  inlineActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  inlineButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 15,
  },
  loadingSimilarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingSimilarText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
});

export default ProductsScreen; 