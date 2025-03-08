import React, { useCallback, useMemo  } from 'react';
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
  FlatList
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/FontAwesome';
import EvilIcon from 'react-native-vector-icons/EvilIcons';

import Entypoicon from 'react-native-vector-icons/Entypo';
// import { useNavigation } from '@react-navigation/native';

// Import the mobile icon and other icons
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome'; // For shopping bag and cricket icons

// Define the prop types for HomeScreen
type RootStackParamList = {
  Home: undefined;
  Profile: undefined;
  ProductInfoPage: { product: { id: number; name: string; price: string; image: string } };
  MessageScreen: undefined;
};

type HomescreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Home'>;
};

// type ProfileScreenProps = {
//   navigation: StackNavigationProp<RootStackParamList, 'Profile'>;
// };

const Homescreen = ({ navigation }: HomescreenProps) => {
  // const [isMenuOpen, setMenuOpen] = useState(false);

  // const toggleMenu = () => {
  //   setMenuOpen(!isMenuOpen);
  // };

  console.log('HomeScreen is rendering');
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
      image: '../assets/images/shoe.jpeg',
      condition: 'Brand New',
      type: 'Rent',
      description: 'Vision Alta Men',
      images: ['https://via.placeholder.com/150', 'https://via.placeholder.com/200']
    },
    { id: 2, name: 'Product 2', price: '$18.50', image: 'https://via.placeholder.com/150' },
    { id: 3, name: 'Product 3', price: '$32.99', image: 'https://via.placeholder.com/150' },
    { id: 4, name: 'Product 4', price: '$15.75', image: 'https://via.placeholder.com/150' },
    { id: 5, name: 'Product 5', price: '$49.99', image: 'https://via.placeholder.com/150' },
  ], []);

  // New arrivals data
  const newArrivals = [
    { id: 1, name: 'New Item 1', price: '$21.99' },
    { id: 2, name: 'New Item 2', price: '$34.50' },
    { id: 3, name: 'New Item 3', price: '$19.99' },
    { id: 4, name: 'New Item 4', price: '$27.75' },
    { id: 5, name: 'New Item 5', price: '$45.99' },
  ];

  // Best sellers data
  const bestSellers = [
    { id: 1, name: 'Popular Item 1', price: '$22.99' },
    { id: 2, name: 'Popular Item 2', price: '$17.50' },
    { id: 3, name: 'Popular Item 3', price: '$31.99' },
    { id: 4, name: 'Popular Item 4', price: '$14.75' },
    { id: 5, name: 'Popular Item 5', price: '$39.99' },
  ];

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
      <View style={styles.productImagePlaceholder} />
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>{item.price}</Text>
      </View>
    </TouchableOpacity>
  ), [navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top navigation bar with menu and profile */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.menuButton} onPress={() => console.log("Menu button pressed")}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          
          <Text style={styles.truStudSelText}>TruStudSel</Text>
          
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => {
              console.log('Navigating to Profile');
              navigation.navigate('Profile');
            }}
          >
            <View style={styles.profileCircle}>
              <Text style={styles.profileText}>A</Text>
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Search Bar */}
        <View style={styles.searchBox}>
          <EvilIcon name="search" size={20} color="black" />
          <TextInput 
            placeholder="Search..." 
            style={styles.input}
          />
        </View>
        
        {/* Row with text and buttons */}
        <View style={styles.rowContainer}>
          <Text style={styles.plainText}>All Items</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.smallButton, styles.sortButton]}>
              <Text style={styles.buttonText}> Sort</Text>
              <Icon name="sort" size={14} color="black" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.smallButton, styles.filterButton]}>
              <Text style={styles.buttonText}> Filter</Text>
              <Icon name="filter" size={14} color="black" />
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
          <Text style={styles.sectionHeader}>Featured Items</Text>
          <FlatList
            data={products}
            renderItem={renderProduct}
            keyExtractor={item => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.productScrollView}
          />

          {/* New Arrivals Section */}
          <Text style={styles.sectionHeader}>New Arrivals</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.productScrollView}
          >
            {newArrivals.map(product => (
              <TouchableOpacity key={product.id} style={styles.productCard}>
                <View style={styles.productImagePlaceholder} />
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productPrice}>{product.price}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Best Sellers Section */}
          <Text style={styles.sectionHeader}>Best Sellers</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.productScrollView}
          >
            {bestSellers.map(product => (
              <TouchableOpacity key={product.id} style={styles.productCard}>
                <View style={styles.productImagePlaceholder} />
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productPrice}>{product.price}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {/* Bottom padding to avoid content being hidden behind navigation */}
          <View style={{height: 70}} />
        </ScrollView>

        <TouchableOpacity 
          style={styles.availabilityButton}
          onPress={() => {
            console.log('Button pressed'); // Check if the button is pressed
            navigation.navigate('MessageScreen');
            console.log('Navigating to MessageScreen'); // Check if navigation is called
          }} 
        >
        </TouchableOpacity>
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
    fontSize: 20,
    fontFamily: 'LibreCaslonDisplay',
    color: '#efae1a',
  },
  profileButton: {
    padding: 5,
  },
  profileCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  profileText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  searchBox: {
    height: 40,
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    height: 40,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  plainText: {
    color: 'black',
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
    borderColor: '#ddd',
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortButton: {
    backgroundColor: '#f7b305',
  },
  filterButton: {
    backgroundColor: '#f7b305',
  },
  buttonText: {
    fontSize: 12,
    color: 'black',
    marginLeft: 0,
    marginRight: 5,
  },
  // New styles for categories
  categoryLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
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
    backgroundColor: '#f7b305',
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
    color: '#333',
    textAlign: 'center',
    marginTop: 5,
  },
  // Product card styles
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 10,
    color: '#333',
  },
  productScrollView: {
    marginBottom: 20,
  },
  productCard: {
    width: 150,
    marginRight: 15,
    borderRadius: 8,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  productImagePlaceholder: {
    height: 120,
    backgroundColor: '#e0e0e0',
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'black',
  },
  mobileIcon: {
    marginTop: 5,
  },
  availabilityButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginLeft: 10,
  },
  availabilityButtonText: {
    fontSize: 12,
    color: '#333',
  },
});

export default Homescreen;