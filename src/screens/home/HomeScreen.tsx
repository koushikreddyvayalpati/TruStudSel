import React, { useCallback, useMemo, useState } from 'react';
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
  Image
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import EvilIcon from 'react-native-vector-icons/EvilIcons';
import Entypoicon from 'react-native-vector-icons/Entypo';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

// Import from contexts with new structure
import { useAuth } from '../../contexts';
import { useTheme } from '../../hooks';

// Import types
import { HomeScreenNavigationProp } from '../../types/navigation.types';

type HomescreenProps = {
  navigation: HomeScreenNavigationProp;
};

const HomeScreen: React.FC<HomescreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [wishlist, setWishlist] = useState<number[]>([]);

  // Category data
  const categories = useMemo(() => [
    { id: 1, name: 'Electronics' },
    { id: 2, name: 'Furniture' },
    { id: 3, name: 'Auto' },
    { id: 4, name: 'Fashion' },
    { id: 5, name: 'Sports' },
  ], []);

  // Product data
  const products = useMemo(() => [
    {
      id: 1,
      name: 'Nike Sneakers',
      price: '$34.00',
      image: 'https://via.placeholder.com/150',
      condition: 'Brand New',
      type: 'Rent',
      description: 'Vision Alta Men',
      images: ['https://via.placeholder.com/200', 'https://via.placeholder.com/200']
    },
    { id: 2, name: 'Cricket bat', price: '$18.50', image: 'https://via.placeholder.com/150' },
    { id: 3, name: 'Matress', price: '$32.99', image: 'https://via.placeholder.com/150' },
    { id: 4, name: 'Lamp', price: '$15.75', image: 'https://via.placeholder.com/150' },
    { id: 5, name: 'Polo Tshirt', price: '$49.99', image: 'https://via.placeholder.com/150' },
  ], []);

  // New arrivals data
  const newArrivals = useMemo(() => [
    { id: 1, name: 'New Item 1', price: '$21.99', image: 'https://via.placeholder.com/150' },
    { id: 2, name: 'New Item 2', price: '$34.50', image: 'https://via.placeholder.com/150' },
    { id: 3, name: 'New Item 3', price: '$19.99', image: 'https://via.placeholder.com/150' },
    { id: 4, name: 'New Item 4', price: '$27.75', image: 'https://via.placeholder.com/150' },
    { id: 5, name: 'New Item 5', price: '$45.99', image: 'https://via.placeholder.com/150' },
  ], []);

  // Best sellers data
  const bestSellers = useMemo(() => [
    { id: 1, name: 'Popular Item 1', price: '$22.99', image: 'https://via.placeholder.com/150' },
    { id: 2, name: 'Popular Item 2', price: '$17.50', image: 'https://via.placeholder.com/150' },
    { id: 3, name: 'Popular Item 3', price: '$31.99', image: 'https://via.placeholder.com/150' },
    { id: 4, name: 'Popular Item 4', price: '$14.75', image: 'https://via.placeholder.com/150' },
    { id: 5, name: 'Popular Item 5', price: '$39.99', image: 'https://via.placeholder.com/150' },
  ], []);

  // Get the first letter of the user's name for the profile circle
  const getInitial = () => {
    if (!user) return 'U';
    
    if (user.name) {
      return user.name.charAt(0).toUpperCase();
    }
    if (user.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return 'U'; // Default if no name is available
  };

  const toggleWishlist = (id: number) => {
    setWishlist(prevWishlist => 
      prevWishlist.includes(id) 
        ? prevWishlist.filter(itemId => itemId !== id)
        : [...prevWishlist, id]
    );
  };

  const renderCategory = useCallback(({ item }: { item: any }) => (
    <TouchableOpacity key={item.id} style={styles.categoryItem}>
      <View style={styles.categoryCircleWrapper}>
        <View style={styles.categoryCircle}>
          {item.id === 1 && <Entypoicon name="game-controller" size={28} color="black" />}
          {item.id === 2 && <Icon name="bed" size={28} color="black" />}
          {item.id === 3 && <MaterialIcons name="directions-car" size={28} color="black" />}
          {item.id === 4 && <FontAwesome name="shopping-bag" size={28} color="black" />}
          {item.id === 5 && <MaterialIcons name="sports-cricket" size={28} color="black" />}
        </View>
      </View>
      <Text style={styles.categoryText}>{item.name}</Text>
    </TouchableOpacity>
  ), []);

  const renderProduct = useCallback(({ item }: { item: any }) => (
    <TouchableOpacity 
      key={item.id} 
      style={styles.productCard}
      onPress={() => navigation.navigate('ProductInfoPage', { product: item })}
    >
      <Image 
        source={{ uri: item.image }} 
        style={styles.productImagePlaceholder} 
        resizeMode="cover" 
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>{item.price}</Text>
        <TouchableOpacity 
          style={styles.wishlistButton} 
          onPress={() => toggleWishlist(item.id)}
        >
          <FontAwesome 
            name={wishlist.includes(item.id) ? "heart" : "heart-o"}
            size={20} 
            color="red" 
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  ), [navigation, wishlist]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <View style={styles.container}>
        {/* Top navigation bar with menu and profile */}
        <View style={styles.topBar}>
          <TouchableOpacity 
            style={styles.menuButton} 
            onPress={() => navigation.openDrawer ? navigation.openDrawer() : null}
          >
            <MaterialIcons name="menu" size={22} color={theme.colors.text} />
          </TouchableOpacity>
          
          <Text style={[styles.truStudSelText, { color: theme.colors.primary }]}>TruStudSel</Text>
          
          <View style={styles.topBarRight}>
            <TouchableOpacity 
              style={styles.profileButton}
              onPress={() => {
                navigation.navigate('Profile');
              }}
            >
              <View style={[styles.profileCircle, { backgroundColor: theme.colors.secondary }]}>
                <Text style={[styles.profileText, { color: theme.colors.background }]}>{getInitial()}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Search Bar */}
        <View style={[styles.searchBox, { backgroundColor: theme.colors.surface }]}>
          <EvilIcon name="search" size={20} color={theme.colors.text} />
          <TextInput 
            placeholder="Search..." 
            style={styles.input}
            placeholderTextColor={theme.colors.placeholder}
          />
        </View>
        
        {/* Row with text and buttons */}
        <View style={styles.rowContainer}>
          <Text style={[styles.plainText, { color: theme.colors.text }]}>All Items</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.smallButton, styles.sortButton, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.buttonText, { color: theme.colors.text }]}> Sort</Text>
              <Icon name="sort" size={14} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.smallButton, styles.filterButton, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.buttonText, { color: theme.colors.text }]}> Filter</Text>
              <Icon name="filter" size={14} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Category Circles */}
        <View style={styles.categoryContainer}>
          <FlatList
            data={categories}
            renderItem={renderCategory}
            keyExtractor={item => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
          />
        </View>
        
        {/* Scrollable container for all product sections */}
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Featured Items Section */}
          <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>Featured Items</Text>
          <FlatList
            data={products}
            renderItem={renderProduct}
            keyExtractor={item => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.productScrollView}
          />

          {/* New Arrivals Section */}
          <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>New Arrivals</Text>
          <FlatList
            data={newArrivals}
            renderItem={renderProduct}
            keyExtractor={item => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.productScrollView}
          />

          {/* Best Sellers Section */}
          <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>Best Sellers</Text>
          <FlatList
            data={bestSellers}
            renderItem={renderProduct}
            keyExtractor={item => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.productScrollView}
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: 8,
  },
  truStudSelText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileButton: {
    marginLeft: 10,
  },
  profileCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginVertical: 10,
  },
  input: {
    flex: 1,
    marginLeft: 10,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  plainText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  smallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 15,
    marginLeft: 10,
  },
  sortButton: {
    paddingHorizontal: 12,
  },
  filterButton: {
    paddingHorizontal: 12,
  },
  buttonText: {
    fontSize: 12,
  },
  categoryContainer: {
    marginVertical: 15,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 20,
  },
  categoryCircleWrapper: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryText: {
    marginTop: 5,
    fontSize: 12,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  productScrollView: {
    paddingBottom: 15,
  },
  productCard: {
    marginRight: 15,
    width: 150,
    borderRadius: 10,
    overflow: 'hidden',
  },
  productImagePlaceholder: {
    width: 150,
    height: 120,
    backgroundColor: '#e1e1e1',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  productInfo: {
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  productName: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  productPrice: {
    color: '#666',
  },
  wishlistButton: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});

export default HomeScreen; 