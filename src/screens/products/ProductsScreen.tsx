import React, { useState } from 'react';
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
  Alert
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { ProductInfoScreenRouteProp, ProductInfoScreenNavigationProp } from '../../types/navigation.types';

const { width } = Dimensions.get('window');

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
    name: 'Koushik Reddy',
    rating: 4.8,
  }
};

// Sample reviews for the seller
const sellerReviews = [
  { id: 1, name: 'Alice', rating: 5, text: 'Excellent communication and fast shipping!' },
  { id: 2, name: 'Bob', rating: 4, text: 'Great seller, item as described, would buy again.' },
  { id: 3, name: 'Charlie', rating: 5, text: 'Super friendly and helpful, highly recommend!' },
];

const ProductsScreen = () => {
  const navigation = useNavigation<ProductInfoScreenNavigationProp>();
  const route = useRoute<ProductInfoScreenRouteProp>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = new Animated.Value(0);
  
  // Use the product from route params if available, otherwise use the sample product
  const routeProduct = route.params?.product as BaseProduct | undefined;
  
  // Create an extended product object with seller information if not provided
  const product: ExtendedProduct = routeProduct 
    ? {
        ...routeProduct,
        seller: sampleProduct.seller // Use sample seller data since routeProduct may not have seller info
      }
    : sampleProduct;
  
  // Handle case where product might not have images array
  const productImages = product.images 
    ? (Array.isArray(product.images) ? product.images : [product.image]) 
    : [product.image || 'https://via.placeholder.com/300'];

  const handleScroll = (event: any) => {
    const index = Math.floor(event.nativeEvent.contentOffset.x / (width * 0.82));
    setCurrentIndex(index);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#f0f0f0' }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Back Button with Icon */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={18} color="black" />
        </TouchableOpacity>

        {/* Warning Icon */}
        <TouchableOpacity 
          style={styles.warningButton} 
          onPress={() => Alert.alert('Report Item', 'Do you want to report this item?')}
        >
          <Icon name="exclamation-triangle" size={18} color="red" />
        </TouchableOpacity>

        {/* Product Images - Scrollable with Animation */}
        <View style={[styles.card, { 
          backgroundColor: 'white',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 5
        }]}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.imageScrollView}
            decelerationRate="fast"
            snapToInterval={width * 0.82}
            snapToAlignment="center"
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false, listener: handleScroll }
            )}
            scrollEventThrottle={16}
          >
            {productImages.map((image, index) => (
              <Animated.View key={index} style={{ opacity: currentIndex === index ? 1 : 0.5 }}>
                <Image 
                  source={{ uri: typeof image === 'string' ? image : 'https://via.placeholder.com/300' }} 
                  style={styles.productImage} 
                />
              </Animated.View>
            ))}
          </ScrollView>
          
          {/* Image pagination dots */}
          {productImages.length > 1 && (
            <View style={styles.paginationDots}>
              {productImages.map((_, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.paginationDot,
                    { backgroundColor: index === currentIndex ? '#f7b305' : '#ccc' }
                  ]} 
                />
              ))}
            </View>
          )}
        </View>

        {/* Product Title, Price, Condition, and Type */}
        <View style={styles.textContainer}>
          <Text style={[styles.productName, { color: '#333' }]}>{product.name}</Text>
          <View style={styles.priceContainer}>
            <Text style={[styles.productPrice, { color: '#e67e22' }]}>{product.price}</Text>
            {product.condition && (
              <Text style={[styles.productCondition, { color: '#666' }]}>{product.condition}</Text>
            )}
            {product.type && (
              <Text style={[styles.productType, { color: '#666' }]}>{product.type}</Text>
            )}
          </View>
        </View>

        {/* Description Box */}
        <View style={[styles.descriptionBox, { 
          backgroundColor: '#FFF8E1',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 5, 
          height: 150
        }]}>
          <Text style={[styles.descriptionText, { color: '#333' }]}>
            {product.description || 'No description available for this product.'}
          </Text>
        </View>

        {/* Availability Button with Seller Profile */}
        <View style={styles.availabilityContainer}>
          <View style={[styles.profileContainer, { alignItems: 'center', marginRight: 15 }]}>
            {product.seller && (
              <>
                <TouchableOpacity 
                  style={[styles.profileCircle, { 
                    backgroundColor: '#e0e0e0',
                    borderWidth: 1,
                    borderColor: '#ccc'
                  }]}
                  onPress={() => navigation.navigate('Profile')}
                >
                  <Text style={[styles.profileText, { color: '#333' }]}>
                    {product.seller.name ? product.seller.name.charAt(0) : 'S'}
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.profileName, { 
                  color: 'black',
                  fontSize: 12,
                  fontWeight: 'bold',
                  marginTop: 5
                }]}>
                  {product.seller.name}
                </Text>
              </>
            )}
          </View>
          <TouchableOpacity 
            style={[styles.availabilityButton, { 
              backgroundColor: '#f7b305',
              padding: 15,
              borderRadius: 10,
              alignItems: 'center',
              flex: 1,
              marginLeft: 10,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5
            }]}
            onPress={() => navigation.navigate('MessageScreen', { 
              conversationId: 'new', 
              recipientName: product.seller?.name || 'Seller' 
            })}
          >
            <Text style={[styles.availabilityButtonText, { color: '#fff' }]}>Is it available?</Text>
          </TouchableOpacity>
        </View>

        {/* Seller Reviews Section */}
        <View style={[styles.reviewsContainer, { 
          backgroundColor: '#f0f0f0',
          padding: 15,
          borderRadius: 10,
          width: '100%',
          marginTop: 20
        }]}>
          <Text style={[styles.reviewsTitle, { color: '#333' }]}>Top Reviews of the Seller</Text>
          
          {sellerReviews.map(review => (
            <View key={review.id} style={[styles.reviewItem, {
              marginBottom: 10,
              borderBottomWidth: 1,
              borderBottomColor: '#ccc',
              paddingBottom: 10
            }]}>
              <Text style={[styles.reviewName, { color: '#333', fontWeight: 'bold' }]}>{review.name}</Text>
              <View style={[styles.ratingContainer, { marginBottom: 5 }]}>
                {[...Array(review.rating)].map((_, index) => (
                  <Icon key={index} name="star" size={16} color="#f7b305" />
                ))}
              </View>
              <Text style={[styles.reviewText, { color: '#666' }]}>{review.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 20,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 10,
    padding: 10,
    zIndex: 10,
  },
  warningButton: {
    position: 'absolute',
    top: 40,
    right: 10,
    padding: 10,
    zIndex: 10,
  },
  card: {
    width: width * 0.9,
    height: 300,
    borderRadius: 10,
    padding: 15,
    marginTop: 60,
  },
  imageScrollView: {
    width: '100%',
    height: '100%',
  },
  productImage: {
    width: width * 0.82,
    height: '100%',
    borderRadius: 10,
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center', 
    width: '100%'
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  textContainer: {
    width: '100%',
    alignItems: 'flex-start',
    marginTop: 15,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  productPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 15,
  },
  productCondition: {
    fontSize: 16,
    marginRight: 15,
  },
  productType: {
    fontSize: 16,
  },
  descriptionBox: {
    marginTop: 25,
    padding: 15,
    borderRadius: 10,
    width: '100%',
  },
  descriptionText: {
    fontSize: 16,
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 25,
    width: '100%',
  },
  profileContainer: {
    flexDirection: 'column',
  },
  profileCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  profileName: {
    fontSize: 16,
  },
  availabilityButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  availabilityButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  reviewsContainer: {
    marginBottom: 20,
  },
  reviewsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  reviewItem: {
  },
  reviewName: {
    fontSize: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    marginVertical: 5,
  },
  reviewText: {
    fontSize: 14,
  },
});

export default ProductsScreen; 