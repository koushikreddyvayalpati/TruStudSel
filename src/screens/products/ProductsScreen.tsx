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
  SafeAreaView 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useTheme } from '../../contexts/ThemeContext';

const { width } = Dimensions.get('window');

// Sample product data
const sampleProduct = {
  id: '1',
  name: 'Product Name',
  price: '$24.99',
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
  const navigation = useNavigation();
  const { colors, shadows } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = new Animated.Value(0);
  const product = sampleProduct;

  const handleScroll = (event: any) => {
    const index = Math.floor(event.nativeEvent.contentOffset.x / (width * 0.82));
    setCurrentIndex(index);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Back Button with Icon */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={18} color={colors.text} />
        </TouchableOpacity>

        {/* Warning Icon */}
        <TouchableOpacity style={styles.warningButton} onPress={() => alert('Report this item?')}>
          <Icon name="exclamation-triangle" size={18} color={colors.error} />
        </TouchableOpacity>

        {/* Product Images - Scrollable with Animation */}
        <View style={[styles.card, { backgroundColor: colors.card, ...shadows.medium }]}>
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
            {product.images && product.images.length > 0 ? (
              product.images.map((image, index) => (
                <Animated.View key={index} style={{ opacity: currentIndex === index ? 1 : 0.5 }}>
                  <Image 
                    source={{ uri: image }} 
                    style={styles.productImage} 
                  />
                </Animated.View>
              ))
            ) : (
              <Image 
                source={{ uri: 'https://via.placeholder.com/300' }} 
                style={styles.productImage} 
              />
            )}
          </ScrollView>
          
          {/* Image pagination dots */}
          {product.images && product.images.length > 1 && (
            <View style={styles.paginationDots}>
              {product.images.map((_, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.paginationDot,
                    { backgroundColor: index === currentIndex ? colors.primary : colors.border }
                  ]} 
                />
              ))}
            </View>
          )}
        </View>

        {/* Product Title, Price, Condition, and Type */}
        <View style={styles.textContainer}>
          <Text style={[styles.productName, { color: colors.text }]}>{product.name}</Text>
          <View style={styles.priceContainer}>
            <Text style={[styles.productPrice, { color: colors.primary }]}>{product.price}</Text>
            <Text style={[styles.productCondition, { color: colors.textSecondary }]}>{product.condition}</Text>
            <Text style={[styles.productType, { color: colors.textSecondary }]}>{product.type}</Text>
          </View>
        </View>

        {/* Description Box */}
        <View style={[styles.descriptionBox, { backgroundColor: colors.cardAlt, ...shadows.small }]}>
          <Text style={[styles.descriptionText, { color: colors.text }]}>{product.description}</Text>
        </View>

        {/* Availability Button with Seller Profile */}
        <View style={styles.availabilityContainer}>
          <View style={styles.profileContainer}>
            <TouchableOpacity 
              style={[styles.profileCircle, { backgroundColor: colors.background }]}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={[styles.profileText, { color: colors.text }]}>{product.seller.name.charAt(0)}</Text>
            </TouchableOpacity>
            <Text style={[styles.profileName, { color: colors.text }]}>{product.seller.name}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.availabilityButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('MessageScreen', { contactName: product.seller.name })}
          >
            <Text style={[styles.availabilityButtonText, { color: colors.white }]}>Is it available?</Text>
          </TouchableOpacity>
        </View>

        {/* Seller Reviews Section */}
        <View style={styles.reviewsContainer}>
          <Text style={[styles.reviewsTitle, { color: colors.text }]}>Top Reviews of the Seller</Text>
          {sellerReviews.map(review => (
            <View key={review.id} style={[styles.reviewItem, { backgroundColor: colors.card, ...shadows.small }]}>
              <Text style={[styles.reviewName, { color: colors.text }]}>{review.name}</Text>
              <View style={styles.ratingContainer}>
                {[...Array(review.rating)].map((_, index) => (
                  <Icon key={index} name="star" size={16} color={colors.primary} />
                ))}
              </View>
              <Text style={[styles.reviewText, { color: colors.textSecondary }]}>{review.text}</Text>
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
    padding: 20,
  },
  backButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    padding: 10,
    zIndex: 10,
  },
  warningButton: {
    position: 'absolute',
    top: 10,
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
    alignSelf: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
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
    minHeight: 120,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 22,
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 25,
    width: '100%',
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 10,
  },
  profileText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  availabilityButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  availabilityButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  reviewsContainer: {
    marginTop: 30,
    width: '100%',
    marginBottom: 20,
  },
  reviewsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  reviewItem: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  reviewName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  ratingContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  reviewText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default ProductsScreen; 