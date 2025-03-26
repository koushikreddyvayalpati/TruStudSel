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
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import EvilIcon from 'react-native-vector-icons/EvilIcons';
import Entypoicon from 'react-native-vector-icons/Entypo';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

// Import from contexts with new structure
import { useAuth } from '../../contexts';

// Import types
import { HomeScreenNavigationProp } from '../../types/navigation.types';

// Define types for better type safety
interface Category {
  id: number;
  name: string;
  icon: 'electronics' | 'furniture' | 'auto' | 'fashion' | 'sports';
}

interface Product {
  id: number;
  name: string;
  price: string;
  image: string;
  condition?: string;
  type?: string;
  description?: string;
  images?: string[];
}

type ProductSectionType = 'featured' | 'newArrivals' | 'bestSellers';

interface HomescreenProps {
  navigation: HomeScreenNavigationProp;
}

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
  wishlist: number[];
  onToggleWishlist: (id: number) => void;
  onPress: (product: Product) => void;
}> = ({ item, wishlist, onToggleWishlist, onPress }) => (
  <TouchableOpacity 
    style={[styles.productCard, { backgroundColor: 'white' }]}
    onPress={() => onPress(item)}
  >
    <Image 
      source={{ uri: item.image }} 
      style={styles.productImagePlaceholder}
      resizeMode="cover"
    />
    <View style={[styles.productInfo, { backgroundColor: 'white' }]}>
      <Text style={[styles.productName, { color: '#333' }]}>{item.name}</Text>
      <Text style={[styles.productPrice, { color: 'black' }]}>{item.price}</Text>
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

// Product section component for reusability
const ProductSection: React.FC<{
  title: string;
  data: Product[];
  wishlist: number[];
  onToggleWishlist: (id: number) => void;
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
        keyExtractor={item => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.productScrollView}
        contentContainerStyle={styles.productListContainer}
      />
    )}
  </View>
);

const HomeScreen: React.FC<HomescreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  
  // Category data with icon identifiers for type safety
  const categories = useMemo<Category[]>(() => [
    { id: 1, name: 'Electronics', icon: 'electronics' },
    { id: 2, name: 'Furniture', icon: 'furniture' },
    { id: 3, name: 'Auto', icon: 'auto' },
    { id: 4, name: 'Fashion', icon: 'fashion' },
    { id: 5, name: 'Sports', icon: 'sports' },
  ], []);

  // Product data with proper typing
  const products = useMemo<Product[]>(() => [
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
  const newArrivals = useMemo<Product[]>(() => [
    { id: 1, name: 'New Item 1', price: '$21.99', image: 'https://via.placeholder.com/150' },
    { id: 2, name: 'New Item 2', price: '$34.50', image: 'https://via.placeholder.com/150' },
    { id: 3, name: 'New Item 3', price: '$19.99', image: 'https://via.placeholder.com/150' },
    { id: 4, name: 'New Item 4', price: '$27.75', image: 'https://via.placeholder.com/150' },
    { id: 5, name: 'New Item 5', price: '$45.99', image: 'https://via.placeholder.com/150' },
  ], []);

  // Best sellers data
  const bestSellers = useMemo<Product[]>(() => [
    { id: 1, name: 'Popular Item 1', price: '$22.99', image: 'https://via.placeholder.com/150' },
    { id: 2, name: 'Popular Item 2', price: '$17.50', image: 'https://via.placeholder.com/150' },
    { id: 3, name: 'Popular Item 3', price: '$31.99', image: 'https://via.placeholder.com/150' },
    { id: 4, name: 'Popular Item 4', price: '$14.75', image: 'https://via.placeholder.com/150' },
    { id: 5, name: 'Popular Item 5', price: '$39.99', image: 'https://via.placeholder.com/150' },
  ], []);

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

  const toggleWishlist = useCallback((id: number) => {
    setWishlist(prevWishlist => 
      prevWishlist.includes(id) 
        ? prevWishlist.filter(itemId => itemId !== id)
        : [...prevWishlist, id]
    );
  }, []);

  const handleProductPress = useCallback((product: Product) => {
    navigation.navigate('ProductInfoPage', { product });
  }, [navigation]);

  const handleCategoryPress = useCallback((category: Category) => {
    setActiveCategory(prevCategory => 
      prevCategory === category.id ? null : category.id
    );
    // Here you could filter products by category if needed
    console.log(`Category selected: ${category.name}`);
  }, []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    // Simulate data refresh
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  }, []);

  const handleSearch = useCallback(() => {
    // Implement search functionality here
    console.log(`Searching for: ${searchQuery}`);
  }, [searchQuery]);

  const handleSeeAll = useCallback((section: ProductSectionType) => {
    // Navigate to a page showing all products of a specific section
    console.log(`See all pressed for: ${section}`);
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: 'white' }]}>
      <View style={styles.container}>
        {/* Top navigation bar with menu and profile */}
        <View style={styles.topBar}>
          <TouchableOpacity 
            style={styles.menuButton} 
            onPress={() => navigation.openDrawer ? navigation.openDrawer() : null}
          >
            <MaterialIcons name="menu" size={22} color="#333" />
          </TouchableOpacity>
          
          <Text style={[styles.truStudSelText, { color: '#efae1a' }]}>TruStudSel</Text>
          
          <View style={styles.topBarRight}>
            <TouchableOpacity 
              style={styles.profileButton}
              onPress={() => {
                navigation.navigate('Profile');
              }}
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
            <TouchableOpacity style={[styles.smallButton, styles.sortButton, { backgroundColor: '#f7b305', borderColor: '#ddd' }]}>
              <Text style={[styles.buttonText, { color: 'black' }]}> Sort</Text>
              <Icon name="sort" size={14} color="black" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.smallButton, styles.filterButton, { backgroundColor: '#f7b305', borderColor: '#ddd' }]}>
              <Text style={[styles.buttonText, { color: 'black' }]}> Filter</Text>
              <Icon name="filter" size={14} color="black" />
            </TouchableOpacity>
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
          {/* Featured Items Section */}
          <ProductSection 
            title="Featured Items"
            data={products}
            wishlist={wishlist}
            onToggleWishlist={toggleWishlist}
            onProductPress={handleProductPress}
            onSeeAll={() => handleSeeAll('featured')}
          />

          {/* New Arrivals Section */}
          <ProductSection 
            title="New Arrivals"
            data={newArrivals}
            wishlist={wishlist}
            onToggleWishlist={toggleWishlist}
            onProductPress={handleProductPress}
            onSeeAll={() => handleSeeAll('newArrivals')}
          />

          {/* Best Sellers Section */}
          <ProductSection 
            title="Best Sellers"
            data={bestSellers}
            wishlist={wishlist}
            onToggleWishlist={toggleWishlist}
            onProductPress={handleProductPress}
            onSeeAll={() => handleSeeAll('bestSellers')}
          />
          
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
    fontSize: 19,
    fontFamily: 'LibreCaslonDisplay',
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
    top: 10,
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
});

export default HomeScreen; 