import React, { useState, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  ImageBackground,
  Animated
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../contexts/AuthContext';
import { ProfileScreenNavigationProp } from '../../types/navigation.types';

// Constants
const PROFILE_BANNER_HEIGHT = 160;
const PROFILE_IMAGE_SIZE = 100;

// Post item type
interface Post {
  id: number;
  image: string;
  caption: string;
  price?: string;
  condition?: string;
  status?: 'active' | 'sold' | 'archived';
}

// Define tab types
type TabType = 'inMarket' | 'archive';

// Sample posts data 
const INITIAL_POSTS: Post[] = [
  { id: 1, image: 'https://via.placeholder.com/150', caption: 'Calculus Textbook', price: '$45', condition: 'Good', status: 'active' },
  { id: 2, image: 'https://via.placeholder.com/150', caption: 'Desk Lamp', price: '$20', condition: 'Like New', status: 'active' },
  { id: 3, image: 'https://via.placeholder.com/150', caption: 'Bluetooth Speaker', price: '$30', condition: 'Fair', status: 'active' },
  { id: 6, image: 'https://via.placeholder.com/150', caption: 'Backpack', price: '$25', condition: 'Good', status: 'archived' },
];

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { signOut, user } = useAuth();
  
  // Animated values
  const scrollY = new Animated.Value(0);
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, PROFILE_BANNER_HEIGHT / 2, PROFILE_BANNER_HEIGHT],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp'
  });

  // Component state
  const [posts, _setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [isLoading, _setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>('inMarket');

  // Memoized user data to prevent unnecessary rerenders
  const userData = useMemo(() => ({
    name: user?.name || user?.username?.split('@')[0] || "User",
    email: user?.email || user?.username || "No email available",
    university: user?.university || "State University",
    stats: {
      sold: user?.stats?.sold || 24,
    },
    profileImage: user?.profileImage || null,
    isVerified: true,
  }), [user]);

  // Memoized filtered posts based on active tab
  const filteredPosts = useMemo(() => {
    switch (activeTab) {
      case 'inMarket':
        return posts.filter(post => post.status === 'active');
      case 'archive':
        return posts.filter(post => post.status === 'archived');
      default:
        return posts;
    }
  }, [posts, activeTab]);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    
    // Simulate API refresh
    setTimeout(() => {
      setIsRefreshing(false);
      // In a real app, you would fetch fresh data here
    }, 1500);
  }, []);

  // Sign out handler with proper error handling
  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      // Here you would show an error message to the user
    }
  }, [signOut]);

  // Navigate to Edit Profile Screen
  const handleEditProfile = useCallback(() => {
    navigation.navigate('EditProfile');
  }, [navigation]);

  // Get the first letter of the user's name for the profile circle
  const getInitial = useCallback(() => {
    if (userData.name) {
      return userData.name.charAt(0).toUpperCase();
    }
    return 'U';
  }, [userData.name]);

  // Tab change handler
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
  }, []);

  // Scroll handler
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  // Verified badge component
  const VerifiedBadge = useCallback(() => (
    <View style={styles.verifiedBadge}>
      <View style={styles.verifiedBadgeCircle}>
        <FontAwesome name="check" size={12} color="#FFFFFF" />
      </View>
    </View>
  ), []);

  // Render post item 
  const renderPostItem = useCallback(({ item }: { item: Post }) => (
    <TouchableOpacity 
      style={styles.postContainer}
      onPress={() => {
        // Navigate to product detail in a real app
        console.log('Post pressed:', item);
      }}
      activeOpacity={0.8}
    >
      <View style={styles.postImageContainer}>
        <Image 
          source={{ uri: item.image }} 
          style={styles.postImage}
          resizeMode="cover"
        />
        <Text style={styles.postPrice}>{item.price}</Text>
        {item.status === 'sold' && (
          <View style={styles.soldOverlay}>
            <Text style={styles.soldText}>SOLD</Text>
          </View>
        )}
      </View>
      <View style={styles.postInfo}>
        <Text style={styles.postCaption} numberOfLines={1}>{item.caption}</Text>
        <Text style={styles.postCondition}>{item.condition}</Text>
      </View>
    </TouchableOpacity>
  ), []);

  // Empty state component
  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <FontAwesome5 name="box-open" size={60} color="#e0e0e0" />
      <Text style={styles.emptyStateText}>No items to display</Text>
      <Text style={styles.emptyStateSubtext}>
        Items you {activeTab === 'archive' ? 'archive' : 'post'} will appear here
      </Text>
    </View>
  ), [activeTab]);

  // Footer loader component
  const renderFooter = useCallback(() => {
    if (!isLoading) return null;
    
    return (
      <View style={styles.loaderFooter}>
        <ActivityIndicator size="small" color="#f7b305" />
      </View>
    );
  }, [isLoading]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      {/* Animated Header */}
      <Animated.View style={[styles.animatedHeader, { opacity: headerOpacity }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButtonHeader}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity 
            style={styles.headerAction}
            onPress={handleSignOut}
          >
            <MaterialIcons name="logout" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </Animated.View>
      
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#ffffff']}
            tintColor="#ffffff"
            progressBackgroundColor="#f7b305"
          />
        }
      >
        {/* Profile Banner */}
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1470&auto=format&fit=crop' }}
          style={styles.bannerContainer}
        >
          <View style={styles.bannerOverlay}>
            <View style={styles.bannerContent}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <MaterialIcons name="arrow-back" size={24} color="#FFF" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.signOutButton}
                onPress={handleSignOut}
              >
                <MaterialIcons name="logout" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>
        
        {/* Profile Info Section */}
        <View style={styles.profileContainer}>
          <View style={styles.profileImageWrapper}>
            {userData.profileImage ? (
              <Image source={{ uri: userData.profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Text style={styles.profileInitial}>{getInitial()}</Text>
              </View>
            )}
            {userData.isVerified && <VerifiedBadge />}
          </View>
          
          <View style={styles.profileDetailsContainer}>
            <View style={styles.nameEditRow}>
              <Text style={styles.profileName}>Koushik</Text>
              <TouchableOpacity 
                style={styles.editProfileButton}
                onPress={handleEditProfile}
              >
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.userInfoRow}>
              <View style={styles.userInfoItem}>
                <FontAwesome5 name="university" size={16} color="#666" />
                <Text style={styles.userInfoText}>{userData.university}</Text>
              </View>
              <View style={styles.userInfoItem}>
                <MaterialCommunityIcons name="email-outline" size={16} color="#666" />
                <Text style={styles.userInfoText} numberOfLines={1}>{userData.email}</Text>
              </View>
            </View>
          </View>
          
          {/* Stats Card */}
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userData.stats.sold}</Text>
              <Text style={styles.statLabel}>Items Sold</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{filteredPosts.length}</Text>
              <Text style={styles.statLabel}>Active Listings</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>4.8</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
          
          {/* Tab Buttons */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'inMarket' && styles.activeTabButton
              ]}
              onPress={() => handleTabChange('inMarket')}
            >
              <Text style={[
                styles.tabText,
                activeTab === 'inMarket' && styles.activeTabText
              ]}>
                In Market
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'archive' && styles.activeTabButton
              ]}
              onPress={() => handleTabChange('archive')}
            >
              <Text style={[
                styles.tabText,
                activeTab === 'archive' && styles.activeTabText
              ]}>
                Archive
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Posts Grid */}
        <View style={styles.postsSection}>
          {filteredPosts.length === 0 ? (
            renderEmptyState()
          ) : (
            <View style={styles.postsGrid}>
              {filteredPosts.map(item => (
                <View key={item.id} style={styles.postGridItem}>
                  {renderPostItem({ item })}
                </View>
              ))}
              {isLoading && renderFooter()}
            </View>
          )}
        </View>
        
        {/* Bottom Space for Better UX */}
        <View style={{ height: 20 }} />
      </Animated.ScrollView>
      
      {/* Floating Add Button */}
      <TouchableOpacity style={styles.floatingButton}>
        <Ionicons name="add" size={30} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  animatedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 90,
    backgroundColor: '#f7b305',
    zIndex: 100,
    paddingTop: StatusBar.currentHeight || 0,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButtonHeader: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  headerAction: {
    padding: 8,
  },
  bannerContainer: {
    height: PROFILE_BANNER_HEIGHT,
    width: '100%',
  },
  bannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'space-between',
  },
  bannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 16 : 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signOutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    paddingTop: 0,
    paddingHorizontal: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  profileImageWrapper: {
    alignSelf: 'center',
    marginTop: -PROFILE_IMAGE_SIZE / 2,
    marginBottom: 16,
    position: 'relative',
  },
  profileImage: {
    width: PROFILE_IMAGE_SIZE,
    height: PROFILE_IMAGE_SIZE,
    borderRadius: PROFILE_IMAGE_SIZE / 2,
    borderWidth: 4,
    borderColor: '#fff',
  },
  profileImagePlaceholder: {
    width: PROFILE_IMAGE_SIZE,
    height: PROFILE_IMAGE_SIZE,
    borderRadius: PROFILE_IMAGE_SIZE / 2,
    backgroundColor: '#f7b305',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  profileInitial: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFF',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'transparent',
  },
  verifiedBadgeCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  profileDetailsContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  nameEditRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginRight: 8,
  },
  editProfileButton: {
    backgroundColor: 'transparent',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#f7b305',
  },
  editButtonText: {
    fontSize: 12,
    color: '#f7b305',
    fontWeight: '500',
  },
  userInfoRow: {
    width: '100%',
    marginVertical: 8,
  },
  userInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    justifyContent: 'center',
  },
  userInfoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f7b305',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#e0e0e0',
    alignSelf: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    padding: 4,
    marginHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTabButton: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#999',
  },
  activeTabText: {
    color: '#f7b305',
    fontWeight: '600',
  },
  postsSection: {
    flex: 1,
    paddingHorizontal: 12,
    backgroundColor: '#f7f7f7',
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  postGridItem: {
    width: '48%',
    marginBottom: 16,
  },
  postContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  postImageContainer: {
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: 150,
  },
  postPrice: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#f7b305',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  postInfo: {
    padding: 12,
  },
  postCaption: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  postCondition: {
    fontSize: 13,
    color: '#888',
  },
  soldOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  soldText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 30,
    minHeight: 250,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  loaderFooter: {
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f7b305',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  }
});

export default ProfileScreen; 