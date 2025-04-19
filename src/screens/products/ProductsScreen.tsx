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
  FlatList,
  Modal,
  StatusBar,
  Platform,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { ProductInfoScreenRouteProp, ProductInfoScreenNavigationProp } from '../../types/navigation.types';
import { useAuth } from '../../contexts'; // Add this to get user email
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import useProductDetailsStore from '../../store/productDetailsStore';
import reviewsApi from '../../api/reviews';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import ReviewsSection from '../../components/reviews/ReviewsSection';

const { width, height } = Dimensions.get('window');

// Product Image Gallery Component
const ImageGallery: React.FC<{
  images: string[];
  onImagePress: (index: number) => void;
}> = React.memo(({ images, onImagePress }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  // Enhanced scroll handler for better Android support
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / width);
        if (index !== currentIndex) {
          setCurrentIndex(index);
        }
      },
    }
  );

  // Improved goToImage function with better error handling
  const goToImage = useCallback((index: number) => {
    if (flatListRef.current && index >= 0 && index < images.length) {
      try {
        flatListRef.current.scrollToOffset({ 
          offset: index * width, 
          animated: true 
        });
        setCurrentIndex(index);
      } catch (error) {
        console.log('Error scrolling to image:', error);
      }
    }
  }, [images.length]);

  // Memoized pagination component
  const renderPagination = useMemo(() => {
    if (images.length <= 1) {return null;}

    return (
      <View style={styles.paginationContainer}>
        <View style={styles.paginationDots}>
          {images.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.paginationDot,
                { backgroundColor: index === currentIndex ? '#f7b305' : '#ccc' },
              ]}
              onPress={() => goToImage(index)}
            />
          ))}
        </View>
      </View>
    );
  }, [currentIndex, images, goToImage]);

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
        {...(Platform.OS === 'ios' ? { defaultSource: { uri: 'https://via.placeholder.com/300' } } : {})}
      />
    </Pressable>
  ), [onImagePress]);

  // Scroll to next image
  const scrollToNextImage = () => {
    if (currentIndex < images.length - 1) {
      goToImage(currentIndex + 1);
    }
  };

  // Scroll to previous image
  const scrollToPrevImage = () => {
    if (currentIndex > 0) {
      goToImage(currentIndex - 1);
    }
  };

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
        initialNumToRender={images.length > 2 ? 3 : images.length}
        maxToRenderPerBatch={3}
        windowSize={5}
        snapToInterval={width}
        snapToAlignment="center"
        decelerationRate={Platform.OS === 'ios' ? 'normal' : 'fast'}
        disableIntervalMomentum={true}
        contentContainerStyle={{ alignItems: 'center' }}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        removeClippedSubviews={false}
      />
      {renderPagination}
      
      {/* Add invisible touch areas for improved navigation on Android */}
      {Platform.OS === 'android' && images.length > 1 && (
        <>
          <TouchableOpacity
            style={[styles.galleryNavButton, styles.galleryPrevButton]}
            onPress={scrollToPrevImage}
            activeOpacity={0.8}
            disabled={currentIndex === 0}
          >
            {currentIndex > 0 && (
              <Ionicons name="chevron-back" size={28} color="rgba(255,255,255,0.7)" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.galleryNavButton, styles.galleryNextButton]}
            onPress={scrollToNextImage}
            activeOpacity={0.8}
            disabled={currentIndex === images.length - 1}
          >
            {currentIndex < images.length - 1 && (
              <Ionicons name="chevron-forward" size={28} color="rgba(255,255,255,0.7)" />
            )}
          </TouchableOpacity>
        </>
      )}
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
  products: any[];
  onProductPress: (product: any) => void;
}> = React.memo(({ products, onProductPress }) => {
  // Memoized render item function
  const renderItem = useCallback(({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.similarProductItem}
      onPress={() => onProductPress(item)}
    >
      <Image
        source={{ uri: item.image && item.image.trim() !== '' ? item.image : 'https://via.placeholder.com/150' }}
        style={styles.similarProductImage}
        resizeMode="cover"
        {...(Platform.OS === 'ios' ? { defaultSource: { uri: 'https://via.placeholder.com/150' } } : {})}
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
          {...(Platform.OS === 'ios' ? { defaultSource: { uri: 'https://via.placeholder.com/300' } } : {})}
        />
      </View>
    </Modal>
  );
});

const ProductsScreen = () => {
  const navigation = useNavigation<ProductInfoScreenNavigationProp>();
  const route = useRoute<ProductInfoScreenRouteProp>();
  const { user } = useAuth();

  // Use the product details store
  const {
    isLoading,
    zoomVisible,
    selectedImage,
    expandDescription,
    isInWishlist,
    product,
    productImages,
    similarProductsData,
    loadingSimilarProducts,

    setProductFromRoute,
    setUserEmail,
    handleImagePress,
    closeZoom,
    toggleExpandDescription,
    toggleWishlist,
    checkWishlistStatus,
    refreshWishlistCache,
    handleShare,
    isCurrentUserSeller,
  } = useProductDetailsStore();

  // State for reviews section
  const [totalReviews, setTotalReviews] = useState<number>(0);

  // Extract product and productId from route params
  const routeParams = route.params || {};
  const productFromRoute = routeParams.product;
  const productId = routeParams.productId;

  // Set user email from context
  useEffect(() => {
    if (user?.email) {
      setUserEmail(user.email);
    }
  }, [user?.email, setUserEmail]);

  // Initialize product from route params or id
  useEffect(() => {
    setProductFromRoute(productFromRoute, productId);
  }, [setProductFromRoute, productFromRoute, productId]);

  // Check wishlist status when product changes
  useEffect(() => {
    checkWishlistStatus();
  }, [checkWishlistStatus]);

  // Refresh wishlist cache when component mounts
  useEffect(() => {
    refreshWishlistCache();
  }, [refreshWishlistCache]);

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
          recipientName: sellerName,
        });
      } catch (error) {
        console.error('Navigation error:', error);
        Alert.alert('Error', 'Could not open chat screen.');
      }
    }
  }, [navigation, product]);

  // Memoize similar product press function
  const handleSimilarProductPress = useCallback((similarProduct: any) => {
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
        sellerEmail: sellerEmail,
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
        !product.description && styles.noDescriptionBox,
      ]}>
        {product.description ? (
          <>
            <Text
              style={[
                styles.descriptionText,
                product.description.length < 80 && styles.shortDescriptionText,
              ]}
              numberOfLines={expandDescription ? undefined : 4}
            >
              {product.description}
            </Text>
            {product.description.length > 120 && (
              <TouchableOpacity
                style={[
                  styles.readMoreButton,
                  expandDescription && styles.readLessButton,
                ]}
                onPress={toggleExpandDescription}
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
  ), [product.description, expandDescription, toggleExpandDescription]);

  // Debug section memoization
  const renderDebugSection = useMemo(() => {
    // Return null to disable debug section completely
    return null;
  }, []);

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
      // @ts-ignore - Type safety is handled within the component
      <SimilarProducts
        products={similarProductsData}
        onProductPress={handleSimilarProductPress}
      />
    );
  }, [similarProductsData, loadingSimilarProducts, handleSimilarProductPress]);

  // Check if the current user is the seller of this product
  const isUserSeller = isCurrentUserSeller();

  // Navigate to all reviews screen
  const handleViewAllReviews = useCallback(() => {
    const sellerEmail = product.email || product.seller?.email;
    const sellerName = product.sellerName || product.seller?.name || 'Seller';

    // In the future, this would navigate to a dedicated reviews screen
    // For now, show an alert as a placeholder
    Alert.alert(
      'View All Reviews',
      `This would navigate to all ${totalReviews} reviews for ${sellerName}.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'OK',
          onPress: () => {
            console.log('Would navigate to reviews screen for:', sellerEmail);
            // When the reviews screen is implemented, uncomment the line below
            // navigation.navigate('SellerReviews', { sellerEmail, sellerName });
          },
        },
      ]
    );
  }, [product.email, product.seller?.email, product.sellerName, product.seller?.name, totalReviews]);

  // Update total reviews count (called from ReviewsSection)
  const handleUpdateTotalReviews = useCallback((count: number) => {
    setTotalReviews(count);
  }, []);

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
      <StatusBar backgroundColor="white" barStyle="dark-content" />

      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Product Details</Text>

        <TouchableOpacity
          style={styles.headerRight}
          onPress={() => Alert.alert(
            'Report Item',
            'Do you want to report this item?',
            [
              {text: 'Cancel', style: 'cancel'},
              {text: 'Report', style: 'destructive'},
            ]
          )}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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

          {/* Price and tags in one row - with price on the left and wishlist on the right */}
          <View style={styles.priceAndTagsRow}>
            <Text style={styles.productPrice}>${product.price}</Text>
            <View style={styles.tagsContainer}>
              {product.condition && (
                <View style={styles.tagItem}>
                  <Text style={styles.tagText}>{product.condition}</Text>
                </View>
              )}

              {product.sellingtype && (
                <View style={[styles.tagItem, styles.sellingTypeTag]}>
                  <Text style={styles.tagText}>
                    {product.sellingtype.toLowerCase().includes('rent') ? 'For Rent' : 'For Sale'}
                  </Text>
                </View>
              )}
            </View>

            {/* Wishlist heart button */}
            {!isUserSeller && (
              <TouchableOpacity
                style={[styles.wishlistButton, isInWishlist && styles.wishlistActiveButton]}
                onPress={toggleWishlist}
              >
                <FontAwesome
                  name={isInWishlist ? 'heart' : 'heart-o'}
                  size={22}
                  color={isInWishlist ? '#e74c3c' : '#666'}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Description */}
          {renderDescriptionSection}

          {/* Seller Profile - Only show if the current user is not the seller */}
          {!isUserSeller && (
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
          )}

          {/* Seller Reviews Section */}
          <ReviewsSection
            sellerEmail={product.email ?? ''}
            sellerName={product.sellerName ?? ''}
            productId={route.params?.productId}
            isUserSeller={isUserSeller}
            onViewAllReviews={handleViewAllReviews}
            onUpdateTotalReviews={handleUpdateTotalReviews}
          />

          {/* Your own product indicator - show when the current user is the seller */}
          {isUserSeller && (
            <View style={styles.ownProductContainer}>
              <Ionicons name="checkmark-circle" size={22} color="#4CAF50" />
              <Text style={styles.ownProductText}>This is your product listing</Text>
            </View>
          )}

          {/* Similar Products */}
          {renderSimilarProductsSection}

          {/* Debug Info - Hidden in Production */}
          {renderDebugSection}

          {/* Bottom padding */}
          <View style={styles.bottomPadding} />
        </View>
      </ScrollView>

      {/* Image Zoom Modal */}
      <ImageZoomModal
        visible={zoomVisible}
        imageUri={selectedImage}
        onClose={closeZoom}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: 0,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Platform.OS === 'android' ? 12 : 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    ...Platform.select({
      android: {
        elevation: 3,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
      },
    }),
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Platform.OS === 'android' ? 8 : 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  headerRight: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Platform.OS === 'android' ? 8 : 10,
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
        borderWidth: 1,
        borderColor: '#e0e0e0',
        elevation: 0,
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
        elevation: 0,
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

  sellerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  sellerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  sellerAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  sellerInfo: {
    marginLeft: 16,
    flex: 1,
  },
  sellerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 6,
  },
  sellerRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    marginLeft: 4,
  },
  sellerContact: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
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
        elevation: 0,
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
        elevation: 0,
      },
    }),
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  reviewDate: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  reviewText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
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
        elevation: 0,
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
  bottomPadding: {
    height: 100, // Adjust this value based on your design
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
  wishlistButton: {
    padding: 8,
    marginLeft: 6,
    width: 38,
    height: 38,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wishlistActiveButton: {
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
    borderRadius: 20,
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
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
        elevation: 0,
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
        elevation: 0,
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
  sellerMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
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
        elevation: 0,
      },
    }),
  },
  ownProductContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f9f5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0f2e0',
  },
  ownProductText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#2e7d32',
    fontWeight: '500',
  },
  reviewsSection: {
    marginTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  reviewsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  reviewsTitleContainer: {
    flex: 1,
  },
  reviewMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  reviewMetaText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(247, 179, 5, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  writeReviewText: {
    fontSize: 13,
    color: '#f7b305',
    fontWeight: '600',
    marginRight: 4,
  },
  loadingReviewsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingReviewsText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  noReviewsContainer: {
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#eeeeee',
  },
  noReviewsText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  beFirstText: {
    fontSize: 14,
    color: '#f7b305',
    marginTop: 8,
    fontWeight: '500',
  },
  reviewsSummaryCard: {
    backgroundColor: '#fafafa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eeeeee',
    overflow: 'hidden',
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
  reviewAverageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    paddingBottom: 12,
  },
  reviewAverageScore: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e67e22',
    marginRight: 12,
  },
  totalReviewsText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  reviewsScrollContainer: {
    maxHeight: 300,
  },
  reviewItemCompact: {
    padding: 16,
    backgroundColor: 'white',
  },
  reviewHeaderCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewerInitialCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f7b305',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  reviewerInitial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  reviewerNameCompact: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  reviewDateCompact: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  reviewTextCompact: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginTop: 6,
    paddingLeft: 46, // Aligns with the text next to the initial circle
  },
  reviewSeparator: {
    height: 1,
    backgroundColor: '#eeeeee',
  },
  seeAllReviewsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#f8f8f8',
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
  },
  seeAllReviewsText: {
    fontSize: 14,
    color: '#f7b305',
    fontWeight: '600',
    marginRight: 4,
  },
  reviewFormModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  reviewFormContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  reviewFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  reviewFormTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeFormButton: {
    padding: 5,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  ratingSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  ratingStar: {
    padding: 5,
  },
  reviewCommentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  reviewCommentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    height: 120,
    fontSize: 16,
    backgroundColor: '#fafafa',
    marginBottom: 20,
  },
  submitReviewButton: {
    backgroundColor: '#f7b305',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  submitReviewButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingMoreText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#f8f8f8',
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
  },
  loadMoreButtonText: {
    fontSize: 14,
    color: '#f7b305',
    fontWeight: '600',
    marginRight: 4,
  },
  galleryNavButton: {
    position: 'absolute',
    width: width / 4,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 2,
  },
  galleryPrevButton: {
    left: 0,
  },
  galleryNextButton: {
    right: 0,
  },
});

export default ProductsScreen;
