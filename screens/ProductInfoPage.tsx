import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, TouchableOpacity, ScrollView, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { StackScreenProps } from '@react-navigation/stack';
import { ParamListBase } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// Define the props type for ProductInfoPage
type ProductInfoPageProps = StackScreenProps<ParamListBase, 'ProductInfoPage'>;

const ProductInfoPage: React.FC<ProductInfoPageProps> = ({ route, navigation }) => {
  const product = route.params?.product || {};
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = new Animated.Value(0);

  // Sample reviews for the seller
  const sellerReviews = [
    { id: 1, name: 'Alice', rating: 5, text: 'Excellent communication and fast shipping!' },
    { id: 2, name: 'Bob', rating: 4, text: 'Great seller, item as described, would buy again.' },
    { id: 3, name: 'Charlie', rating: 5, text: 'Super friendly and helpful, highly recommend!' },
  ];

  const handleScroll = (event: any) => {
    const index = Math.floor(event.nativeEvent.contentOffset.x / (width * 0.82));
    setCurrentIndex(index);
  };

  return (
    <View style={styles.container}>
      {/* Back Button with Icon */}
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-left" size={18} color="black" />
      </TouchableOpacity>

      {/* Warning Icon */}
      <TouchableOpacity style={styles.warningButton} onPress={() => alert('Warning!')}>
        <Icon name="exclamation-triangle" size={18} color="red" />
      </TouchableOpacity>

      {/* Product Images - Scrollable with Animation */}
      <View style={styles.card}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.imageScrollView}
          decelerationRate="fast"
          snapToInterval={width * 0.82}
          snapToAlignment="center"
          onScroll={handleScroll}
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
              source={{ uri: product.image || '' }} 
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
                  { backgroundColor: index === currentIndex ? '#f7b305' : '#ccc' }
                ]} 
              />
            ))}
          </View>
        )}
      </View>

      {/* Product Title, Price, Condition, and Type */}
      <View style={styles.textContainer}>
        <Text style={styles.productName}>{product.name || ''}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.productPrice}>{product.price || ''}</Text>
          <Text style={styles.productCondition}>{product.condition || ''}</Text>
          <Text style={styles.productType}>{product.type || ''}</Text>
        </View>
      </View>

      {/* Description Box */}
      <View style={styles.descriptionBox}>
        <Text style={styles.descriptionText}>{product.description || ''}</Text>
      </View>

      {/* Availability Button with Seller Profile */}
      <View style={styles.availabilityContainer}>
        <View style={styles.profileContainer}>
          <TouchableOpacity 
            style={styles.profileCircle}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.profileText}>A</Text>
          </TouchableOpacity>
          <Text style={styles.profileName}>Koushik Reddy</Text>
        </View>
        <TouchableOpacity 
          style={styles.availabilityButton}
          onPress={() => navigation.navigate('MessageScreen', { contactName: 'Koushik Reddy' })}
        >
          <Text style={styles.availabilityButtonText}>Is it available?</Text>
        </TouchableOpacity>
      </View>

      {/* Seller Reviews Section */}
      <View style={styles.reviewsContainer}>
        <Text style={styles.reviewsTitle}>Top Reviews of the Seller</Text>
        {sellerReviews.map(review => (
          <View key={review.id} style={styles.reviewItem}>
            <Text style={styles.reviewName}>{review.name}</Text>
            <View style={styles.ratingContainer}>
              {[...Array(review.rating)].map((_, index) => (
                <Icon key={index} name="star" size={16} color="#f7b305" />
              ))}
            </View>
            <Text style={styles.reviewText}>{review.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 10,
    padding: 10,
  },
  warningButton: {
    position: 'absolute',
    top: 40,
    right: 10,
    padding: 10,
  },
  card: {
    width: width * 0.9,
    height: 300,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
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
  textContainer: {
    width: '100%',
    alignItems: 'flex-start',
    marginTop: 15,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  productPrice: {
    fontSize: 20,
    color: '#e67e22',
    marginRight: 15,
  },
  productCondition: {
    fontSize: 16,
    color: '#666',
    marginRight: 15,
  },
  productType: {
    fontSize: 16,
    color: '#666',
  },
  descriptionBox: {
    marginTop: 25,
    padding: 15,
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    width: '100%',
    height: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  descriptionText: {
    fontSize: 16,
    color: '#333',
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 25,
    width: '100%',
  },
  profileContainer: {
    alignItems: 'center',
    marginRight: 15,
  },
  profileCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 10,
  },
  profileText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  profileName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'black',
    marginTop: 5,
  },
  availabilityButton: {
    padding: 15,
    backgroundColor: '#f7b305',
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
    marginLeft: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  availabilityButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  paginationDots: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  reviewsContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    width: '100%',
  },
  reviewsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  reviewItem: {
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 10,
  },
  reviewName: {
    fontWeight: 'bold',
    color: '#333',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  reviewText: {
    fontSize: 14,
    color: '#666',
  },
});

export default ProductInfoPage; 