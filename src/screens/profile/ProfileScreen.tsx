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
import { useTheme } from '../../hooks';
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
  const { theme } = useTheme();
  const { colors } = theme;

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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-left" size={20} color={colors.text} />
        </TouchableOpacity>
        
        <Button 
          title="Sign Out"
          onPress={handleSignOut}
          variant="secondary"
          style={styles.signOutButton}
        />

        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          <View style={styles.profileLeft}>
            <View style={[styles.profileImageContainer, { backgroundColor: colors.background }]}>
              {user2.profileImage ? (
                <Image source={{ uri: user2.profileImage }} style={styles.profileImage} />
              ) : (
                <View style={[styles.profileImagePlaceholder, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.profileInitial, { color: '#FFFFFF' }]}>{getInitial()}</Text>
                </View>
              )}
              {user2.isVerified && (
                <Icon 
                  name="check-circle" 
                  size={25}
                  color={colors.primary}
                  style={styles.verifiedBadge}
                />
              )}
            </View>
            <View style={styles.nameContainer}>
              <Text style={[styles.profileName, { color: colors.text }]}>{user2.name || 'User'}</Text>
              <TouchableOpacity style={styles.editButton}>
                <Icon name="edit" size={16} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.profileRight}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.text }]}>{user2.stats.sold}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sold</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <FontAwesome5 name="university" size={16} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>{user2.university}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <MaterialIcons name="email" size={16} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {user?.email || 'No email available'}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={[styles.textRow, { borderColor: colors.border }]}>
          <TouchableOpacity style={[styles.rowButton, { borderColor: colors.border }]}>
            <Text style={[styles.rowText, { color: colors.text }]}>InMarket</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.rowButton, { borderColor: colors.border }]}>
            <Text style={[styles.rowText, { color: colors.text }]}>Sold</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.rowButton, { borderColor: colors.border }]}>
            <Text style={[styles.rowText, { color: colors.text }]}>Purchased</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.rowButton, { borderRightWidth: 0, borderColor: colors.border }]}>
            <Text style={[styles.rowText, { color: colors.text }]}>Archive</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={posts}
          renderItem={({ item }) => (
            <View style={[styles.postContainer, { backgroundColor: colors.card }]}>
              <Image source={{ uri: item.image }} style={styles.postImage} />
              <Text style={[styles.postCaption, { color: colors.text }]}>{item.caption}</Text>
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
          style={styles.availabilityButton}
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
  },
  profileLeft: {
    width: '35%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  editButton: {
    padding: 4,
  },
  profileRight: {
    width: '65%',
    paddingHorizontal: 10,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statItem: {
    marginRight: 20,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
  },
  textRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  rowButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRightWidth: 1,
  },
  rowText: {
    fontSize: 14,
    fontWeight: '500',
  },
  gridContainer: {
    paddingBottom: 20,
  },
  postContainer: {
    width: (width - 32 - 16) / 3, // Account for padding and gap
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: 100,
  },
  postCaption: {
    padding: 8,
    fontSize: 12,
  },
  availabilityButton: {
    marginTop: 20,
  },
});

export default ProfileScreen; 