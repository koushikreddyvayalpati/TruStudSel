import React, { useState, useCallback, useRef, useMemo } from 'react';
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

const { width, height } = Dimensions.get('window');

// Extended Product type that includes seller information
interface ExtendedProduct {
  id: number;
  name: string;
  price: string;
  image: string;
  description?: string;
  condition?: string;
  type?: string;
  images?: any[];
  seller?: {
    name: string;
    rating?: number;
    id?: string;
    contactNumber?: string;
    email?: string;
  };
}

// Base product type from params
interface BaseProduct {
  id: number;
  name: string;
  price: string;
  image: string;
  description?: string;
  condition?: string;
  type?: string;
  images?: any[];
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
  }
};

// Sample reviews for the seller
const sellerReviews = [
  { id: 1, name: 'Alice', rating: 5, text: 'Excellent communication and fast shipping!' },
  { id: 2, name: 'Bob', rating: 4, text: 'Great seller, item as described, would buy again.' },
  { id: 3, name: 'Charlie', rating: 5, text: 'Super friendly and helpful, highly recommend!' },
];

// Sample similar products
const similarProducts = [
  { id: 101, name: 'Similar Item 1', price: '$22.99', image: 'https://via.placeholder.com/150/0000FF' },
  { id: 102, name: 'Similar Item 2', price: '$19.99', image: 'https://via.placeholder.com/150/FF00FF' },
  { id: 103, name: 'Similar Item 3', price: '$27.50', image: 'https://via.placeholder.com/150/00FFFF' },
  { id: 104, name: 'Similar Item 4', price: '$18.25', image: 'https://via.placeholder.com/150/FFFF00' },
];

// Product Image Gallery Component
const ImageGallery = ({ images, onImagePress }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { 
      useNativeDriver: false,
      listener: (event) => {
        const index = Math.floor(event.nativeEvent.contentOffset.x / width);
        setCurrentIndex(index);
      }
    }
  );

  const goToImage = (index) => {
    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({ index, animated: true });
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
        renderItem={({ item, index }) => (
          <Pressable 
            style={styles.imageContainer}
            onPress={() => onImagePress(index)}
          >
            <Image 
              source={{ uri: typeof item === 'string' ? item : 'https://via.placeholder.com/300' }} 
              style={styles.productImage}
              resizeMode="cover"
            />
          </Pressable>
        )}
      />
      
      {images.length > 1 && (
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
      )}
    </View>
  );
};

// Rating Stars Component
const RatingStars = ({ rating, size = 16, color = '#f7b305' }) => {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  return (
    <View style={styles.ratingContainer}>
      {[...Array(fullStars)].map((_, index) => (
        <Icon key={`full_${index}`} name="star" size={size} color={color} />
      ))}
      {halfStar && <Icon key="half" name="star-half-o" size={size} color={color} />}
      {[...Array(emptyStars)].map((_, index) => (
        <Icon key={`empty_${index}`} name="star-o" size={size} color={color} />
      ))}
    </View>
  );
};

// Seller Profile Component
const SellerProfile = ({ seller, onContactPress, onViewProfilePress }) => {
  return (
    <View style={styles.sellerProfileContainer}>
      <View style={styles.sellerInfoContainer}>
        <TouchableOpacity 
          style={styles.profileCircle}
          onPress={onViewProfilePress}
        >
          <Text style={styles.profileText}>
            {seller.name ? seller.name.charAt(0).toUpperCase() : 'S'}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.sellerDetails}>
          <Text style={styles.sellerName}>{seller.name}</Text>
          {seller.rating && <RatingStars rating={seller.rating} />}
        </View>
      </View>
      
      <TouchableOpacity 
        style={[styles.sellerActionButton, styles.messageButton]}
        onPress={() => onContactPress('message')}
      >
        <Ionicons name="chatbubble-outline" size={18} color="#FFF" />
        <Text style={styles.buttonText}>Message Seller</Text>
      </TouchableOpacity>
    </View>
  );
};

// Similar Products Component
const SimilarProducts = ({ products, onProductPress }) => {
  return (
    <View style={styles.similarProductsContainer}>
      <Text style={styles.sectionTitle}>Similar Products</Text>
      <FlatList
        data={products}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => `similar_${item.id}`}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.similarProductItem}
            onPress={() => onProductPress(item)}
          >
            <Image 
              source={{ uri: item.image }} 
              style={styles.similarProductImage}
              resizeMode="cover"
            />
            <View style={styles.similarProductInfo}>
              <Text style={styles.similarProductName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.similarProductPrice}>{item.price}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

// Image Zoom Modal Component
const ImageZoomModal = ({ visible, imageUri, onClose }) => {
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
          source={{ uri: imageUri }}
          style={styles.zoomedImage}
          resizeMode="contain"
        />
      </View>
    </Modal>
  );
};

const ProductsScreen = () => {
  const navigation = useNavigation<ProductInfoScreenNavigationProp>();
  const route = useRoute<ProductInfoScreenRouteProp>();
  const [isLoading, setIsLoading] = useState(false);
  const [zoomVisible, setZoomVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [expandDescription, setExpandDescription] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);
  
  // Use the product from route params if available, otherwise use the sample product
  const routeProduct = route.params?.product as BaseProduct | undefined;
  
  // Create an extended product object with seller information if not provided
  const product: ExtendedProduct = useMemo(() => {
    return routeProduct 
      ? {
          ...routeProduct,
          seller: sampleProduct.seller // Use sample seller data since routeProduct may not have seller info
        }
      : sampleProduct;
  }, [routeProduct]);
  
  // Handle case where product might not have images array
  const productImages = useMemo(() => {
    return product.images 
      ? (Array.isArray(product.images) ? product.images : [product.image]) 
      : [product.image || 'https://via.placeholder.com/300'];
  }, [product]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Check out this awesome product: ${product.name} for ${product.price}`,
        url: productImages[0]
      });
    } catch (error) {
      console.error('Error sharing product:', error);
    }
  }, [product, productImages]);

  const toggleWishlist = useCallback(() => {
    setIsInWishlist(prev => !prev);
    Alert.alert(
      isInWishlist ? 'Removed from Wishlist' : 'Added to Wishlist',
      isInWishlist ? 'This item has been removed from your wishlist.' : 'This item has been added to your wishlist.'
    );
  }, [isInWishlist]);

  const handleContactSeller = useCallback((method) => {
    if (method === 'message') {
      navigation.navigate('MessageScreen', { 
        conversationId: 'new', 
        recipientName: product.seller?.name || 'Seller',
        recipientId: product.seller?.id || 'unknown'
      });
    }
  }, [navigation, product.seller]);

  const handleImagePress = useCallback((index) => {
    setSelectedImage(typeof productImages[index] === 'string' ? productImages[index] : 'https://via.placeholder.com/300');
    setZoomVisible(true);
  }, [productImages]);

  const handleSimilarProductPress = useCallback((similarProduct) => {
    navigation.replace('ProductInfoPage', { product: similarProduct });
  }, [navigation]);

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
      
      {/* Simplified Header with only back button and report warning */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.reportButton}
          onPress={() => Alert.alert('Report Item', 'Do you want to report this item?')}
        >
          <Ionicons name="flag-outline" size={22} color="#e74c3c" />
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
              <Ionicons name="share-social-outline" size={22} color="#333" />
            </TouchableOpacity>
          </View>
          
          {/* Price and tags in one row - with price on the left */}
          <View style={styles.priceAndTagsRow}>
            <Text style={styles.productPrice}>{product.price}</Text>
            <View style={styles.tagsContainer}>
              {product.condition && (
                <View style={styles.tagItem}>
                  <Text style={styles.tagText}>{product.condition}</Text>
                </View>
              )}
              {product.type && (
                <View style={styles.tagItem}>
                  <Text style={styles.tagText}>{product.type}</Text>
                </View>
              )}
            </View>
          </View>
          
          {/* Description */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.sectionTitle}>Description</Text>
            <View style={styles.descriptionBox}>
              <Text 
                style={styles.descriptionText}
                numberOfLines={expandDescription ? undefined : 4}
              >
                {product.description || 'No description available for this product.'}
              </Text>
              {product.description && product.description.length > 120 && (
                <TouchableOpacity 
                  style={styles.readMoreButton}
                  onPress={() => setExpandDescription(!expandDescription)}
                >
                  <Text style={styles.readMoreText}>
                    {expandDescription ? 'Show less' : 'Read more'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Seller Profile */}
          <View style={styles.sellerSection}>
            <Text style={styles.sectionTitle}>Seller Information</Text>
            <View style={styles.sellerProfileContainer}>
              <View style={styles.sellerInfoContainer}>
                <TouchableOpacity 
                  style={styles.profileCircle}
                  onPress={() => navigation.navigate('SellerProfileScreen', { 
                    sellerId: product.seller?.id || 'unknown' 
                  })}
                >
                  <Text style={styles.profileText}>
                    {product.seller?.name ? product.seller.name.charAt(0).toUpperCase() : 'S'}
                  </Text>
                </TouchableOpacity>
                
                <View style={styles.sellerDetails}>
                  <Text style={styles.sellerName}>{product.seller?.name || 'Unknown Seller'}</Text>
                  {product.seller?.rating && <RatingStars rating={product.seller.rating} />}
                </View>
              </View>
              
              <TouchableOpacity 
                style={[styles.sellerActionButton, styles.messageButton]}
                onPress={() => handleContactSeller('message')}
              >
                <Ionicons name="chatbubble-outline" size={18} color="#FFF" />
                <Text style={styles.buttonText}>Message Seller</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Actions Row */}
          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={[styles.inlineActionButton, styles.messageButton]}
              onPress={() => handleContactSeller('message')}
            >
              <Ionicons name="chatbubble-outline" size={18} color="#FFF" />
              <Text style={styles.inlineButtonText}>Message</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.inlineActionButton, styles.offerButton]}
              onPress={() => Alert.alert('Make Offer', 'This feature is coming soon!')}
            >
              <Ionicons name="pricetag-outline" size={18} color="#FFF" />
              <Text style={styles.inlineButtonText}>Make Offer</Text>
            </TouchableOpacity>
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
          
          {/* Similar Products */}
          <SimilarProducts 
            products={similarProducts}
            onProductPress={handleSimilarProductPress}
          />
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
    paddingHorizontal: 16,
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
  backButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: '#f8f8f8',
  },
  reportButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: '#fff0f0',
  },
  scrollView: {
    flex: 1,
  },
  imageGalleryContainer: {
    height: width * 0.65,
    backgroundColor: 'white',
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
    bottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  productInfoContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: 'white',
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  shareButton: {
    padding: 8,
    backgroundColor: '#f8f8f8',
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
    marginBottom: 20,
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
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 16,
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
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
  },
  readMoreButton: {
    marginTop: 12,
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 15,
    backgroundColor: 'rgba(247, 179, 5, 0.1)',
  },
  readMoreText: {
    fontSize: 14,
    color: '#f7b305',
    fontWeight: 'bold',
  },
  
  sellerSection: {
    marginTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  sellerProfileContainer: {
    backgroundColor: '#fafafa',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#eeeeee',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sellerInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileCircle: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: '#f7b305',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
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
  profileText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  sellerDetails: {
    marginLeft: 16,
  },
  sellerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
  },
  sellerActions: {
    flexDirection: 'row',
  },
  sellerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: '#f7b305',
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
  messageButton: {
    backgroundColor: '#f7b305',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
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
  similarProductPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#e67e22',
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
});

export default ProductsScreen; 