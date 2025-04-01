import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
  Animated,
  Platform
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../contexts/AuthContext';
import { ProfileScreenNavigationProp } from '../../types/navigation.types';
import { fetchUserProfileById } from '../../api/users';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants
const PROFILE_BANNER_HEIGHT = 180;
const PROFILE_IMAGE_SIZE = 110;
const HEADER_MAX_HEIGHT = Platform.OS === 'ios' ? 60 : 56;
const HEADER_MIN_HEIGHT = Platform.OS === 'ios' ? 60 : 56;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;
const ITEM_HEIGHT = 230; // Estimated post item height for better FlatList performance

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

// Loading component
const LoadingIndicator = React.memo(() => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#f7b305" />
    <Text style={styles.loadingText}>Loading profile...</Text>
  </View>
));

// Error component
const ErrorDisplay = React.memo(({ message, onRetry }: { message: string, onRetry: () => void }) => (
  <View style={styles.errorContainer}>
    <FontAwesome5 name="exclamation-circle" size={50} color="#e74c3c" />
    <Text style={styles.errorMessage}>{message}</Text>
    <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
      <Text style={styles.retryButtonText}>Retry</Text>
    </TouchableOpacity>
  </View>
));

// Sample posts data 
const INITIAL_POSTS: Post[] = [
  { id: 1, image: 'https://via.placeholder.com/150', caption: 'Calculus Textbook', price: '$45', condition: 'Good', status: 'active' },
  { id: 2, image: 'https://via.placeholder.com/150', caption: 'Desk Lamp', price: '$20', condition: 'Like New', status: 'active' },
  { id: 3, image: 'https://via.placeholder.com/150', caption: 'Bluetooth Speaker', price: '$30', condition: 'Fair', status: 'active' },
  { id: 6, image: 'https://via.placeholder.com/150', caption: 'Backpack', price: '$25', condition: 'Good', status: 'archived' },
];

// Add this interface for backend user data
interface BackendUserData {
  email: string;
  city?: string;
  mobile?: string;
  name?: string;
  productsCategoriesIntrested?: string[] | null;
  productsListed?: string;
  productssold?: string;
  productswishlist?: string[];
  state?: string;
  university?: string;
  userphoto?: string;
  zipcode?: string;
}

// Extract profile header component for better code organization and performance
const ProfileHeader = React.memo(({ 
  userData, 
  backendUserData,
  filteredPosts,
  activeTab,
  onTabChange,
  onEditProfile,
}: {
  userData: ReturnType<typeof useUserData>,
  backendUserData: BackendUserData | null,
  filteredPosts: Post[],
  activeTab: TabType,
  onTabChange: (tab: TabType) => void,
  onEditProfile: () => void,
}) => {
  // Get the first letter of the user's name for the profile circle
  const getInitial = useCallback(() => {
    if (userData.name) {
      return userData.name.charAt(0).toUpperCase();
    }
    return 'U';
  }, [userData.name]);

  // Verified badge component - memoized
  const VerifiedBadge = useMemo(() => (
    <View style={styles.verifiedBadge}>
      <View style={styles.verifiedBadgeCircle}>
        <FontAwesome name="check" size={12} color="#FFFFFF" />
      </View>
    </View>
  ), []);

  // Stats card - memoized to prevent unnecessary rerenders
  const StatsCard = useMemo(() => (
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
  ), [userData.stats.sold, filteredPosts.length]);

  return (
    <View style={styles.profileContainer}>
      <View style={styles.profileImageWrapper}>
        {userData.profileImage ? (
          <Image 
            source={{ uri: userData.profileImage }} 
            style={styles.profileImage}
          />
        ) : (
          <View style={styles.profileImagePlaceholder}>
            <Text style={styles.profileInitial}>{getInitial()}</Text>
          </View>
        )}
        {userData.isVerified && VerifiedBadge}
      </View>
      
      <View style={styles.profileDetailsContainer}>
        <View style={styles.nameEditRow}>
          <Text style={styles.profileName}>{userData.name}</Text>
          <TouchableOpacity 
            style={styles.editProfileButton}
            onPress={onEditProfile}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
          {backendUserData?.city && backendUserData?.state && (
            <View style={styles.userInfoItem}>
              <FontAwesome5 name="map-marker-alt" size={16} color="#666" />
              <Text style={styles.userInfoText}>{backendUserData.city}, {backendUserData.state}</Text>
            </View>
          )}
        </View>
      </View>
      
      {/* Stats Card */}
      {StatsCard}
      
      {/* Tab Buttons */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'inMarket' && styles.activeTabButton
          ]}
          onPress={() => onTabChange('inMarket')}
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
          onPress={() => onTabChange('archive')}
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
  );
});

// Post item component extracted for better performance
const PostItem = React.memo(({ item }: { item: Post }) => (
  <TouchableOpacity 
    style={styles.postContainer}
    onPress={() => console.log('Post pressed:', item)}
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
));

// Custom hook for user data to make the component more maintainable
const useUserData = (user: any, backendUser: BackendUserData | null) => {
  return useMemo(() => ({
    name: user?.name || user?.username?.split('@')[0] || "User",
    email: user?.email || user?.username || "No email available",
    university: backendUser?.university || user?.university || "State University",
    stats: {
      sold: backendUser?.productssold ? parseInt(backendUser.productssold) : 0,
    },
    profileImage: backendUser?.userphoto || null,
    isVerified: true,
  }), [user, backendUser]);
};

// Empty state component
const EmptyState = React.memo(({ activeTab }: { activeTab: TabType }) => (
  <View style={styles.emptyState}>
    <FontAwesome5 name="box-open" size={60} color="#e0e0e0" />
    <Text style={styles.emptyStateText}>No items to display</Text>
    <Text style={styles.emptyStateSubtext}>
      Items you {activeTab === 'archive' ? 'archive' : 'post'} will appear here
    </Text>
  </View>
));

// Add this cache manager outside of the component to make it global
// This will serve as an in-memory cache for quick access without AsyncStorage overhead
const profileCache = new Map();

// Add this function for cache cleanup outside of the component
// This limits the in-memory cache size to prevent memory issues
const MAX_CACHE_SIZE = 50; // Maximum number of profiles to keep in memory

function cleanupCache() {
  if (profileCache.size > MAX_CACHE_SIZE) {
    // Convert to array to sort by timestamp
    const cacheEntries = Array.from(profileCache.entries());
    
    // Sort by timestamp (oldest first)
    cacheEntries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove the oldest 20% entries
    const entriesToRemove = Math.floor(profileCache.size * 0.2);
    const oldestEntries = cacheEntries.slice(0, entriesToRemove);
    
    // Delete from Map
    oldestEntries.forEach(([key]) => {
      profileCache.delete(key);
    });
    
    console.log(`Cache cleanup: removed ${entriesToRemove} oldest entries`);
  }
}

// Add these variables outside the component for API request throttling
const USER_PROFILE_CACHE_KEY = 'user_profile_cache_';
const CACHE_EXPIRY_TIME = 15 * 60 * 1000; // 15 minutes in milliseconds
const API_REQUEST_TIMESTAMPS = new Map(); // Track timestamps of API requests by email
const MIN_API_REQUEST_INTERVAL = 30000; // Minimum time between API requests for the same user (30 seconds)

// Add after the MAP_CACHE_SIZE constant
// Background cache refresh mechanism to keep data fresh without blocking UI
async function refreshCacheInBackground(email: string) {
  try {
    // Check if we're rate-limiting this user
    const lastRequestTime = API_REQUEST_TIMESTAMPS.get(email);
    const now = Date.now();
    
    if (lastRequestTime && (now - lastRequestTime < MIN_API_REQUEST_INTERVAL)) {
      console.log(`Skipping background refresh for ${email}: rate limited`);
      return;
    }
    
    console.log(`Background refreshing data for ${email}`);
    API_REQUEST_TIMESTAMPS.set(email, now);
    
    // Fetch fresh data from API
    const data = await fetchUserProfileById(email);
    
    // Update caches
    const cacheData = {
      data,
      timestamp: now
    };
    
    profileCache.set(email, cacheData);
    cleanupCache();
    
    const cacheKey = `${USER_PROFILE_CACHE_KEY}${email}`;
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    
    console.log(`Background refresh completed for ${email}`);
  } catch (error) {
    console.warn(`Background refresh failed for ${email}:`, error);
    // Don't propagate the error since this is a background operation
  }
}

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { signOut, user } = useAuth();
  
  // State for backend user data
  const [backendUserData, setBackendUserData] = useState<BackendUserData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  
  // Fetch user data from backend API with caching
  const fetchUserData = useCallback(async () => {
    if (!user?.email) {
      setIsLoading(false);
      return;
    }
    
    setError(null);
    if (!isRefreshing) setIsLoading(true);
    
    try {
      const cacheKey = `${USER_PROFILE_CACHE_KEY}${user.email}`;
      
      // First, check the in-memory cache for the fastest access
      if (!isRefreshing && profileCache.has(user.email)) {
        const { data, timestamp } = profileCache.get(user.email);
        const isExpired = Date.now() - timestamp > CACHE_EXPIRY_TIME;
        const isStale = Date.now() - timestamp > (CACHE_EXPIRY_TIME / 3);
        
        if (!isExpired) {
          console.log('Using in-memory cached user profile data');
          setBackendUserData(data);
          setIsLoading(false);
          
          // If data is stale but not expired, trigger a background refresh
          if (isStale) {
            console.log('Data is stale, triggering background refresh');
            setTimeout(() => refreshCacheInBackground(user.email), 100);
          }
          
          return;
        }
      }
      
      // Then try AsyncStorage if not refreshing
      if (!isRefreshing) {
        try {
          const cachedData = await AsyncStorage.getItem(cacheKey);
          
          if (cachedData) {
            const { data, timestamp } = JSON.parse(cachedData);
            const isExpired = Date.now() - timestamp > CACHE_EXPIRY_TIME;
            const isStale = Date.now() - timestamp > (CACHE_EXPIRY_TIME / 3);
            
            if (!isExpired) {
              console.log('Using AsyncStorage cached user profile data');
              // Update in-memory cache too
              profileCache.set(user.email, { data, timestamp });
              setBackendUserData(data);
              setIsLoading(false);
              
              // If data is stale but not expired, trigger a background refresh
              if (isStale) {
                console.log('Data is stale, triggering background refresh');
                setTimeout(() => refreshCacheInBackground(user.email), 100);
              }
              
              return;
            } else {
              console.log('Cache expired, fetching fresh data');
            }
          }
        } catch (cacheError) {
          console.warn('Error reading from cache:', cacheError);
          // Continue with API fetch on cache error
        }
      }
      
      // Check if we should rate limit this API request
      const lastRequestTime = API_REQUEST_TIMESTAMPS.get(user.email);
      const now = Date.now();
      
      if (lastRequestTime && (now - lastRequestTime < MIN_API_REQUEST_INTERVAL) && !isRefreshing) {
        console.log(`Rate limiting API request for ${user.email}`);
        // Use cache even if expired, but mark for refresh
        if (profileCache.has(user.email)) {
          const { data } = profileCache.get(user.email);
          setBackendUserData(data);
          setIsLoading(false);
          // Schedule a delayed refresh
          setTimeout(() => refreshCacheInBackground(user.email), MIN_API_REQUEST_INTERVAL);
          return;
        }
      }
      
      // If cache miss or cache expired or explicitly refreshing, fetch from API
      console.log('Fetching user profile from API');
      API_REQUEST_TIMESTAMPS.set(user.email, now);
      
      const data = await fetchUserProfileById(user.email);
      
      // Update state with new data
      setBackendUserData(data);
      
      // Save to both caches
      const cacheData = {
        data,
        timestamp: now
      };
      
      // Update in-memory cache
      profileCache.set(user.email, cacheData);
      
      // Run cache cleanup to prevent memory issues
      cleanupCache();
      
      // Update AsyncStorage cache
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      
    } catch (error: any) {
      console.error('Error fetching user data:', error.message || error);
      
      // If we have cached data, use it despite the error
      if (profileCache.has(user.email)) {
        console.log('Using cached data after API error');
        setBackendUserData(profileCache.get(user.email).data);
      } else {
        setError('Network error while fetching profile data');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.email, isRefreshing]);
  
  // Replace the useEffect with useFocusEffect for better navigation handling
  // Add after the fetchUserData function
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      
      const loadData = async () => {
        if (isActive) {
          await fetchUserData();
        }
      };
      
      loadData();
      
      return () => {
        isActive = false;
      };
    }, [fetchUserData])
  );
  
  // Use custom hook for user data, now with backend data
  const userData = useUserData(user, backendUserData);
  
  // Animated values with useMemo to avoid recreating on every render
  const scrollY = useMemo(() => new Animated.Value(0), []);
  const headerOpacity = useMemo(() => {
    return scrollY.interpolate({
      inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
      outputRange: [0, 0.5, 1],
      extrapolate: 'clamp'
    });
  }, [scrollY]);

  // Component state
  const [posts, _setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [activeTab, setActiveTab] = useState<TabType>('inMarket');

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
    
    // Refresh backend user data
    fetchUserData().finally(() => {
      setIsRefreshing(false);
    });
  }, [fetchUserData]);

  // Sign out handler with proper error handling
  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, [signOut]);

  // Navigate to Edit Profile Screen
  const handleEditProfile = useCallback(() => {
    // Pass profile data to EditProfileScreen
    navigation.navigate('EditProfile', {
      name: backendUserData?.name || user?.name,
      email: backendUserData?.email || user?.email,
      university: backendUserData?.university,
      city: backendUserData?.city,
      mobile: backendUserData?.mobile,
      zipcode: backendUserData?.zipcode,
      userphoto: backendUserData?.userphoto
    });
  }, [navigation, backendUserData, user]);

  // Navigate back
  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Tab change handler
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
  }, []);

  // Scroll handler - optimized with useNativeDriver for better performance
  const handleScroll = useMemo(() => Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  ), [scrollY]);

  // Render post grid item with proper spacing
  const renderItem = useCallback(({ item, index }: { item: Post, index: number }) => {
    const isEven = index % 2 === 0;
    return (
      <View style={[styles.postGridItem, isEven ? { paddingRight: 4 } : { paddingLeft: 4 }]}>
        <PostItem item={item} />
      </View>
    );
  }, []);

  // Keyextractor for FlatList optimization
  const keyExtractor = useCallback((item: Post) => item.id.toString(), []);

  // FlatList performance optimization
  const getItemLayout = useCallback((_: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * Math.floor(index / 2),
    index,
  }), []);

  // ListHeaderComponent for FlatList
  const ListHeaderComponent = useCallback(() => (
    <>
      {/* Profile Banner - Using a black background */}
      <View style={styles.bannerContainer}>
        <View style={styles.bannerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleGoBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.signOutButton}
            onPress={handleSignOut}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="logout" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Profile Info Section */}
      <ProfileHeader 
        userData={userData} 
        backendUserData={backendUserData}
        filteredPosts={filteredPosts} 
        activeTab={activeTab} 
        onTabChange={handleTabChange}
        onEditProfile={handleEditProfile}
      />
    </>
  ), [userData, backendUserData, filteredPosts, activeTab, handleTabChange, handleEditProfile, handleGoBack, handleSignOut]);

  // EmptyList component for better organization
  const ListEmptyComponent = useCallback(() => (
    <EmptyState activeTab={activeTab} />
  ), [activeTab]);

  // Footer component for better organization
  const ListFooterComponent = useCallback(() => (
    <>
      {isLoading && (
        <View style={styles.loaderFooter}>
          <ActivityIndicator size="small" color="#f7b305" />
        </View>
      )}
      <View style={styles.bottomSpacing} />
    </>
  ), [isLoading]);

  // Add component unmount cleanup at the end of the ProfileScreen component
  useEffect(() => {
    // Component cleanup function
    return () => {
      // Remove this user's data from the request timestamp tracking when component unmounts
      if (user?.email) {
        API_REQUEST_TIMESTAMPS.delete(user?.email);
      }
    };
  }, [user?.email]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      {/* Animated Header */}
      <Animated.View 
        style={[
          styles.animatedHeader, 
          { 
            opacity: headerOpacity,
            transform: [{ 
              translateY: scrollY.interpolate({
                inputRange: [0, HEADER_SCROLL_DISTANCE],
                outputRange: [0, -HEADER_MIN_HEIGHT/4],
                extrapolate: 'clamp',
              })
            }]
          }
        ]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButtonHeader}
            onPress={handleGoBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity 
            style={styles.headerAction}
            onPress={handleSignOut}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="logout" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </Animated.View>
      
      {/* Display Loading Indicator */}
      {isLoading && !isRefreshing && <LoadingIndicator />}
      
      {/* Display Error Message */}
      {error && !isLoading && (
        <ErrorDisplay message={error} onRetry={fetchUserData} />
      )}
      
      {/* Using FlatList instead of ScrollView for better performance with large lists */}
      {!isLoading && !error && (
        <Animated.FlatList
          data={filteredPosts}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scrollContent}
          ListHeaderComponent={ListHeaderComponent}
          ListEmptyComponent={ListEmptyComponent}
          ListFooterComponent={ListFooterComponent}
          columnWrapperStyle={styles.columnWrapper}
          getItemLayout={getItemLayout}
          initialNumToRender={6}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#ffffff']}
              tintColor="#ffffff"
              progressBackgroundColor="#f7b305"
            />
          }
        />
      )}
      
      {/* Floating Add Button */}
      <TouchableOpacity 
        style={styles.floatingButton}
        activeOpacity={0.9}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="add" size={30} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  columnWrapper: {
    paddingHorizontal: 12,
  },
  animatedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_MAX_HEIGHT,
    backgroundColor: '#000000',
    zIndex: 100,
    paddingTop: StatusBar.currentHeight || 0,
    paddingBottom: 8,
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
    backgroundColor: '#f7b305', // Pure black background
  },
  bannerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 16 : 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(247, 179, 5, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signOutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(247, 179, 5, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -25,
    paddingTop: 0,
    paddingHorizontal: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      }
    }),
  },
  profileImageWrapper: {
    alignSelf: 'center',
    marginTop: -PROFILE_IMAGE_SIZE / 2,
    marginBottom: 16,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
      },
      android: {
        elevation: 8,
      }
    }),
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
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  profileInitial: {
    fontSize: 38,
    fontWeight: 'bold',
    color: 'white',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'transparent',
  },
  verifiedBadgeCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#FFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      }
    }),
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
    marginBottom: 10,
  },
  profileName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'center',
    marginRight: 10,
  },
  editProfileButton: {
    backgroundColor: 'white',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1b74e4',
  },
  editButtonText: {
    fontSize: 12,
    color: '#1b74e4',
    fontWeight: '600',
  },
  userInfoRow: {
    width: '100%',
    marginVertical: 10,
  },
  userInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'center',
  },
  userInfoText: {
    fontSize: 15,
    color: '#555',
    marginLeft: 10,
    fontWeight: '400',
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    borderRadius: 14,
    padding: 18,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      }
    }),
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '400',
  },
  statDivider: {
    width: 1,
    height: '85%',
    backgroundColor: '#e0e0e0',
    alignSelf: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    padding: 4,
    marginHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: 'black',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      }
    }),
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#999',
  },
  activeTabText: {
    color: 'white',
    fontWeight: '600',
  },
  postsSection: {
    flex: 1,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  postGridItem: {
    width: '50%',
    marginBottom: 20,
    padding: 4,
  },
  postContainer: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      }
    }),
  },
  postImageContainer: {
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: 160,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  postPrice: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#f7b305',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    fontWeight: 'bold',
    color: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      }
    }),
  },
  postInfo: {
    padding: 14,
  },
  postCaption: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  postCondition: {
    fontSize: 14,
    color: '#666',
    fontWeight: '400',
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
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 40,
    minHeight: 300,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#555',
    marginTop: 20,
  },
  emptyStateSubtext: {
    fontSize: 15,
    color: '#777',
    textAlign: 'center',
    marginTop: 10,
  },
  loaderFooter: {
    width: '100%',
    paddingVertical: 20,
    alignItems: 'center',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 8,
      }
    }),
  },
  bottomSpacing: {
    height: 30
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorMessage: {
    marginTop: 15,
    fontSize: 18,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#f7b305',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default React.memo(ProfileScreen); 