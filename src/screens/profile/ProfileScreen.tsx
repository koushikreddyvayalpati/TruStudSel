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
  StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MaterialIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/common';

// Get device dimensions
const { width } = Dimensions.get('window');

// Sample posts data 
const initialPosts = [
  { id: 1, image: 'https://via.placeholder.com/150', caption: 'Post 1' },
  { id: 2, image: 'https://via.placeholder.com/150', caption: 'Post 2' },
  { id: 3, image: 'https://via.placeholder.com/150', caption: 'Post 3' },
  { id: 4, image: 'https://via.placeholder.com/150', caption: 'Post 4' },
  { id: 5, image: 'https://via.placeholder.com/150', caption: 'Post 5' },
  { id: 6, image: 'https://via.placeholder.com/150', caption: 'Post 6' },
];

const ProfileScreen = () => {
  const navigation = useNavigation();
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

  // Function to load more posts  
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
    <SafeAreaView style={[styles.container, { backgroundColor: '#ffffff' }]}>
      <View style={styles.content}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-left" size={20} color="#333" />
        </TouchableOpacity>
        
        <Button 
          title="Sign Out"
          onPress={handleSignOut}
          variant="secondary"
          style={styles.signOutButton}
        />

        <View style={[styles.profileCard, { 
          backgroundColor: '#ffffff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2,
          borderWidth: 1,
          borderColor: '#eaeaea'
        }]}>
          <View style={styles.profileLeft}>
            <View style={styles.profileImageContainer}>
              {user2.profileImage ? (
                <Image source={{ uri: user2.profileImage }} style={styles.profileImage} />
              ) : (
                <View style={[styles.profileImagePlaceholder, { backgroundColor: '#f7b305', borderWidth: 2, borderColor: '#eaeaea' }]}>
                  <Text style={[styles.profileInitial, { color: 'white' }]}>{getInitial()}</Text>
                </View>
              )}
              {user2.isVerified && (
                <Icon 
                  name="check-circle" 
                  size={25}
                  color="#f7b305"
                  style={styles.verifiedBadge}
                />
              )}
            </View>
            <View style={styles.nameContainer}>
              <Text style={[styles.profileName, { color: '#333' }]}>{user2.name || 'User'}</Text>
              <TouchableOpacity style={styles.editButton}>
                <Icon name="edit" size={16} color="#333" />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.profileRight}>
            <View style={styles.statsRow}>
              <View style={[styles.statItem, { backgroundColor: '#f7b305', paddingVertical: 5, paddingHorizontal: 15, borderRadius: 8 }]}>
                <Text style={[styles.statNumber, { color: '#000' }]}>{user2.stats.sold}</Text>
                <Text style={[styles.statLabel, { color: '#4a5568' }]}>Sold</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <FontAwesome5 name="university" size={16} color="#4a5568" />
              <Text style={[styles.infoText, { color: '#4a5568' }]}>{user2.university}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <MaterialIcons name="email" size={16} color="#4a5568" />
              <Text style={[styles.infoText, { color: '#4a5568' }]}>
                {user?.email || 'No email available'}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={[styles.textRow, { borderColor: '#eaeaea' }]}>
          <TouchableOpacity style={[styles.rowButton, { backgroundColor: '#f7b305', margin: 5, borderRadius: 20 }]}>
            <Text style={[styles.rowText, { color: '#333333' }]}>InMarket</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.rowButton, { backgroundColor: '#f7b305', margin: 5, borderRadius: 20 }]}>
            <Text style={[styles.rowText, { color: '#333333' }]}>Sold</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.rowButton, { backgroundColor: '#f7b305', margin: 5, borderRadius: 20 }]}>
            <Text style={[styles.rowText, { color: '#333333' }]}>Purchased</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.rowButton, { backgroundColor: '#f7b305', margin: 5, borderRadius: 20 }]}>
            <Text style={[styles.rowText, { color: '#333333' }]}>Archive</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={posts}
          renderItem={({ item }) => (
            <View style={[styles.postContainer, { 
              backgroundColor: '#fff9e6',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
              elevation: 2,
              margin: 9
            }]}>
              <Image source={{ uri: item.image }} style={styles.postImage} />
              <Text style={[styles.postCaption, { color: '#333' }]}>{item.caption}</Text>
            </View>
          )}
          keyExtractor={item => item.id.toString()}
          numColumns={3}
          onEndReached={loadMorePosts}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.gridContainer}
        />

        <Button 
          title="Is it available?"
          onPress={() => navigation.navigate('MessageScreen' as never)}
          variant="primary"
          style={[styles.availabilityButton, { backgroundColor: '#f7b305' }]}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: StatusBar.currentHeight,
  },
  content: {
    padding: 16,
  },
  backButton: {
    padding: 10,
    marginBottom: 10,
  },
  signOutButton: {
    position: 'absolute',
    right: 20,
    top: 10,
  },
  profileCard: {
    marginBottom: 20,
    width: '95%',
    height: 155,
    borderRadius: 12,
    padding: 20,
    paddingLeft: 0,
    flexDirection: 'row',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 36,
    fontWeight: 'bold',
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
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  editButton: {
    padding: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  statItem: {
    alignItems: 'center',
    marginRight: 10,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    justifyContent: 'flex-start',
  },
  infoText: {
    fontSize: 14,
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
    alignItems: 'center',
    paddingVertical: 8,
  },
  rowText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  gridContainer: {
    justifyContent: 'flex-start',
    padding: 5,
  },
  postContainer: {
    width: (width * 0.8 - 10) / 3,
    height: 150,
    marginBottom: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postImage: {
    width: '100%',
    height: '80%',
    borderRadius: 10,
  },
  postCaption: {
    marginTop: 5,
    fontSize: 12,
    textAlign: 'center',
  },
  availabilityButton: {
    marginTop: 20,
    padding: 10,
    borderRadius: 5,
  },
});

export default ProfileScreen; 