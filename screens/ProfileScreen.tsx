import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  FlatList,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/FontAwesome';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MaterialIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import BottomNavigation from '../components/BottomNavigation';
import { useAuth } from '../contexts/AuthContext';

// Define the prop types
type RootStackParamList = {
  Home: undefined;
  Profile: undefined;
  MessageScreen: undefined;
};

// Get device dimensions
const { width } = Dimensions.get('window');

// Sample posts data hardcoded
const initialPosts = [
  { id: 1, image: 'https://via.placeholder.com/150', caption: 'Post 1' },
  { id: 2, image: 'https://via.placeholder.com/150', caption: 'Post 2' },
  { id: 3, image: 'https://via.placeholder.com/150', caption: 'Post 3' },
  { id: 4, image: 'https://via.placeholder.com/150', caption: 'Post 4' },
  { id: 5, image: 'https://via.placeholder.com/150', caption: 'Post 5' },
  { id: 6, image: 'https://via.placeholder.com/150', caption: 'Post 6' },
  { id: 7, image: 'https://via.placeholder.com/150', caption: 'Post 7' },
  { id: 8, image: 'https://via.placeholder.com/150', caption: 'Post 8' },
];

const ProfileScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'Profile'>>();
  const { signOut, user } = useAuth();

  const [posts, setPosts] = useState(initialPosts);
  const user2 = {
    name: "Koushik",
    email: "koushik@college.edu",
    university: "State University",
    stats: {
      sold: 24,
      purchased: 18
    },
    profileImage: null,
    isVerified: true,
  };

  // Function to load more posts (simulate fetching more data)  
  const loadMorePosts = () => {
    const newPosts = [
      { id: posts.length + 1, image: 'https://via.placeholder.com/150', caption: `Post ${posts.length + 1}` },
      { id: posts.length + 2, image: 'https://via.placeholder.com/150', caption: `Post ${posts.length + 2}` },
      { id: posts.length + 3, image: 'https://via.placeholder.com/150', caption: `Post ${posts.length + 3}` },
    ];
    setPosts([...posts, ...newPosts]);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      console.log('Successfully signed out');
      navigation.navigate('SignIn');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Get the first letter of the user's name for the profile circle
  const getInitial = () => {
    if (user?.name) {
      return user.name.charAt(0).toUpperCase();
    }
    if (user?.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return 'U'; // Default if no name is available
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-left" size={20} color="#333" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.dotsButton}
          onPress={handleSignOut}
        >
          <Text style={styles.rowText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.profileCard}>
          <View style={styles.profileLeft}>
            <View style={styles.profileImageContainer}>
              {user2.profileImage ? (
                <Image source={{ uri: user2.profileImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Text style={styles.profileInitial}>{getInitial()}</Text>
                </View>
              )}
              {user2.isVerified && (
                <Icon 
                  name="check-circle" 
                  size={25}
                  color="#007BFF"
                  style={styles.verifiedBadge}
                />
              )}
            </View>
            <View style={styles.nameContainer}>
              <Text style={styles.profileName}>{user2.name || 'User'}</Text>
              <TouchableOpacity style={styles.editButton}>
                <Icon name="edit" size={16} color="#333" />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.profileRight}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{user2.stats.sold}</Text>
                <Text style={styles.statLabel}>Sold</Text>
              </View>
              {/* <View style={styles.statItem}>
                <Text style={styles.statNumber}>{user.stats.purchased}</Text>
                <Text style={styles.statLabel}>Purchased</Text>
              </View> */}
            </View>
            
            <View style={styles.infoRow}>
              <FontAwesome5 name="university" size={16} color="black" />
              <Text style={styles.infoText}>{user2.university}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <MaterialIcons name="email" size={16} color="black" />
              <Text style={styles.infoText}>{user.email || 'No email available'}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.textRow}>
          <TouchableOpacity style={styles.rowButton}>
            <Text style={styles.rowText}>InMarket</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowButton}>
            <Text style={styles.rowText}>Sold</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowButton}>
            <Text style={styles.rowText}>Purchased</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.rowButton, { borderRightWidth: 0 }]}>
            <Text style={styles.rowText}>Archive</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={posts}
          renderItem={({ item }) => (
            <View style={styles.postContainer}>
              <Image source={{ uri: item.image }} style={styles.postImage} />
              <Text style={styles.postCaption}>{item.caption}</Text>
            </View>
          )}
          keyExtractor={item => item.id.toString()}
          numColumns={3}
          onEndReached={loadMorePosts}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.gridContainer}
        />

        <TouchableOpacity 
          style={styles.availabilityButton}
          onPress={() => {
            console.log('Button pressed');
            navigation.navigate('MessageScreen');
          }} 
        >
          <Text style={styles.availabilityButtonText}>Is it available?</Text>
        </TouchableOpacity>
      </View>
      <BottomNavigation navigation={navigation} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: StatusBar.currentHeight,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    padding: 16,
  },
  backButton: {
    padding: 10,
    marginBottom: 10,
  },
  dotsButton: {
    position: 'absolute',
    right: 20,
    top: 10,
    padding: 10,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    padding: 16,
  },
  profileText: {
    fontSize: 18,
    color: '#333',
  },
  profileCard: {
    marginBottom: 20,
    width: '95%',
    height: 155,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    paddingLeft: 0,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#eaeaea',
    alignSelf: 'center',
  },
  profileLeft: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 5,
  },
  profileRight: {
    flex: 2,
    justifyContent: 'center',
  },
  profileImageContainer: {
    marginBottom: 10,
    position: 'relative',
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: '#f7b305',
  },
  profileImagePlaceholder: {
    paddingTop: 10,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#f7b305',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#eaeaea',
  },
  profileInitial: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  editButton: {
    marginLeft: 5,
    padding: 3,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 2,
    elevation: 2,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  statItem: {
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#f7b305',
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4a5568',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    justifyContent: 'flex-start',
  },
  infoText: {
    fontSize: 14,
    color: '#4a5568',
    marginLeft: 8,
  },
  textRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    borderRadius: 8,
    padding: 5,
    backgroundColor: '#ffffff',
  },
  rowButton: {
    flex: 1,
    backgroundColor: '#f7b305',
    alignItems: 'center',
    paddingVertical: 8,
    borderColor: '#eaeaea',
    margin: 5,
    borderRadius: 20,
  },
  rowText: {
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
    fontWeight: '500',
  },
  postContainer: {
    width: (width * 0.8 - 10) / 3,
    height: 150,
    marginBottom: 10,
    backgroundColor: '#fff9e6',
    borderRadius: 10,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 9,
  },
  postImage: {
    width: '100%',
    height: '80%',
    borderRadius: 10,
  },
  postCaption: {
    marginTop: 5,
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  gridContainer: {
    justifyContent: 'flex-start',
    padding: 5,
  },
  availabilityButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f7b305',
    borderRadius: 5,
  },
  availabilityButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
});

export default ProfileScreen;