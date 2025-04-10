import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MainStackParamList } from '../../types/navigation.types';
import { Conversation } from '../../types/chat.types';
import { getConversations, getCurrentUser, subscribeToUserConversations } from '../../services/firebaseChatService';

// AsyncStorage key for conversations
const CONVERSATIONS_STORAGE_KEY = '@TruStudSel_conversations';
const CONVERSATIONS_TIMESTAMP_KEY = '@TruStudSel_conversations_timestamp';

// Navigation prop type with stack methods
type MessagesScreenNavigationProp = StackNavigationProp<MainStackParamList, 'MessagesScreen'>;

const MessagesScreen = () => {
  const navigation = useNavigation<MessagesScreenNavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  
  // Reference for conversation subscription
  const conversationSubscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  
  // Flag to track if we've shown cached data
  const hasCachedDataRef = useRef<boolean>(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const searchBarAnim = useRef(new Animated.Value(0)).current;
  
  // App theme colors - memoized to prevent re-renders
  const COLORS = useMemo(() => ({
    primary: '#ffb300',
    primaryDark: '#f57c00',
    background: '#fff',
    surface: '#ffffff',
    text: '#333333', 
    textSecondary: '#666666',
    textLight: '#888888',
    border: '#f0f0f0',
    shadow: 'rgba(0, 0, 0, 0.08)'
  }), []);
  
  // Function to get current user email only once
  const fetchCurrentUser = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (user && user.email) {
        setCurrentUserEmail(user.email);
        console.log('[MessagesScreen] Current user email:', user.email);
      }
    } catch (error) {
      console.error('[MessagesScreen] Error fetching current user:', error);
    }
  }, []);
  
  // Cache conversations to AsyncStorage
  const cacheConversations = useCallback(async (conversationsToCache: Conversation[]) => {
    try {
      await AsyncStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(conversationsToCache));
      await AsyncStorage.setItem(CONVERSATIONS_TIMESTAMP_KEY, new Date().toISOString());
      console.log(`[AsyncStorage] Cached ${conversationsToCache.length} conversations`);
    } catch (error) {
      console.error('[AsyncStorage] Error caching conversations:', error);
    }
  }, []);
  
  // Load cached conversations from AsyncStorage
  const loadCachedConversations = useCallback(async (): Promise<Conversation[] | null> => {
    try {
      const cachedConversationsJson = await AsyncStorage.getItem(CONVERSATIONS_STORAGE_KEY);
      const cachedTimestamp = await AsyncStorage.getItem(CONVERSATIONS_TIMESTAMP_KEY);
      
      if (cachedConversationsJson && cachedTimestamp) {
        const cachedConversations = JSON.parse(cachedConversationsJson);
        
        // Check if cache is too old (more than 1 hour)
        const cacheAge = new Date().getTime() - new Date(cachedTimestamp).getTime();
        const cacheAgeMinutes = cacheAge / (1000 * 60);
        
        console.log(`[AsyncStorage] Found cached conversations (${cachedConversations.length}) from ${cacheAgeMinutes.toFixed(1)} minutes ago`);
        
        if (cacheAgeMinutes < 60) {
          return cachedConversations;
        } else {
          console.log('[AsyncStorage] Cache too old, will fetch fresh data');
          return null;
        }
      }
      
      return null;
    } catch (error) {
      console.error('[AsyncStorage] Error loading cached conversations:', error);
      return null;
    }
  }, []);
  
  // Subscribe to real-time conversation updates
  const setupConversationSubscription = useCallback(() => {
    // Clean up any existing subscription first
    if (conversationSubscriptionRef.current) {
      conversationSubscriptionRef.current.unsubscribe();
      conversationSubscriptionRef.current = null;
    }
    
    if (!currentUserEmail) return;
    
    try {
      console.log('[MessagesScreen] Setting up real-time conversation subscription');
      
      const unsubscribe = subscribeToUserConversations(currentUserEmail, (updatedConversations: Conversation[]) => {
        // Compare with current conversations to see if there are new messages
        setConversations(prevConversations => {
          const hasNewMessages = updatedConversations.some((newConv: Conversation) => {
            const existingConv = prevConversations.find(conv => conv.id === newConv.id);
            
            // New conversation or more recent message in existing conversation
            if (!existingConv || 
               (existingConv.lastMessageTime && newConv.lastMessageTime && 
                new Date(newConv.lastMessageTime) > new Date(existingConv.lastMessageTime))) {
              return true;
            }
            
            // Check unread count
            return (newConv.unreadCount || 0) > (existingConv?.unreadCount || 0);
          });
          
          if (hasNewMessages) {
            console.log('[MessagesScreen] New messages detected in subscription update');
          }
          
          // Also update cache
          cacheConversations(updatedConversations);
          
          return updatedConversations;
        });
      });
      
      conversationSubscriptionRef.current = { unsubscribe };
      
    } catch (error) {
      console.error('[MessagesScreen] Error setting up conversation subscription:', error);
    }
  }, [currentUserEmail, cacheConversations]);
  
  // Fetch current user email on component mount
  useEffect(() => {
    fetchCurrentUser();
    
    // Trigger fade-in animation on mount
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    // Cleanup subscription on unmount
    return () => {
      if (conversationSubscriptionRef.current) {
        conversationSubscriptionRef.current.unsubscribe();
        conversationSubscriptionRef.current = null;
      }
    };
  }, [fetchCurrentUser, fadeAnim]);
  
  // Set up real-time subscription when user email is available
  useEffect(() => {
    if (currentUserEmail) {
      setupConversationSubscription();
    }
  }, [currentUserEmail, setupConversationSubscription]);

  // Animate search bar in/out
  useEffect(() => {
    Animated.timing(searchBarAnim, {
      toValue: isSearchActive ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isSearchActive, searchBarAnim]);

  // Get display name for a conversation (the other participant's name)
  const getConversationDisplayName = useCallback((conversation: Conversation) => {
    if (!currentUserEmail) return conversation.name || 'Unknown Contact';
    
    // Find the other participant (the person we're talking to)
    const otherParticipant = conversation.participants.find(p => p !== currentUserEmail);
    
    // If no other participant is found or we're looking at our own conversation
    if (!otherParticipant) {
      return conversation.name || 'Unknown Contact';
    }
    
    // Check for user-specific name mapping first (new format)
    const nameKey = `name_${currentUserEmail.replace(/[.@]/g, '_')}`;
    if (conversation[nameKey]) {
      return conversation[nameKey];
    }
    
    // Use conversation name if available - but ONLY if it doesn't match the current user's name
    const currentUserBaseName = currentUserEmail.split('@')[0].toLowerCase();
    if (conversation.name && 
        conversation.name.toLowerCase() !== currentUserBaseName) {
      // Format name with proper capitalization
      return conversation.name.charAt(0).toUpperCase() + conversation.name.slice(1);
    }
    
    // Format email to show just the username part
    if (otherParticipant.includes('@')) {
      // Extract just the username part of the email
      const username = otherParticipant.split('@')[0];
      // Convert to proper case (first letter uppercase)
      return username.charAt(0).toUpperCase() + username.slice(1);
    }
    
    return otherParticipant;
  }, [currentUserEmail]);

  // Fetch conversations with caching
  const fetchConversations = useCallback(async () => {
    if (!currentUserEmail) return;
    
    try {
      setIsLoading(true);
      console.log('[MessagesScreen] Fetching conversations...');
      
      // Try to get cached conversations first for immediate display
      if (!hasCachedDataRef.current) {
        const cachedConversations = await loadCachedConversations();
        
        if (cachedConversations && cachedConversations.length > 0) {
          hasCachedDataRef.current = true;
          setConversations(cachedConversations);
          setIsLoading(false);
          console.log('[MessagesScreen] Displayed cached conversations while fetching fresh data');
          
          // We still continue to fetch fresh data below, but we've already shown something to the user
        }
      }
      
      // Get fresh data from Firebase
      let fetchedConversations = await getConversations();
      console.log('[MessagesScreen] Fetched Firebase conversations:', 
        fetchedConversations.map(c => ({
          id: c.id,
          name: c.name,
          participants: c.participants,
          lastMessage: c.lastMessageContent
        }))
      );
      
      // Ensure all conversation names are properly formatted
      // and update any that need to be corrected
      if (fetchedConversations.length > 0 && currentUserEmail) {
        try {
          // Import the necessary functions for updating Firestore
          const { doc, updateDoc } = await import('firebase/firestore');
          const { db } = await import('../../services/firebaseService');
          
          // Check each conversation and update names if needed
          const updatedConversations = await Promise.all(fetchedConversations.map(async (conv) => {
            // Find the other participant
            const otherParticipant = conv.participants.find(p => p !== currentUserEmail);
            if (!otherParticipant) return conv;
            
            // Get the properly formatted name
            const properName = getConversationDisplayName(conv);
            
            // If the name is different, update it in Firestore
            if (conv.name !== properName) {
              try {
                const conversationRef = doc(db, 'conversations', conv.id);
                await updateDoc(conversationRef, { name: properName });
                console.log(`[MessagesScreen] Updated conversation ${conv.id} name to: ${properName}`);
                
                // Return the conversation with the updated name
                return { ...conv, name: properName };
              } catch (error) {
                console.error(`[MessagesScreen] Error updating conversation ${conv.id} name:`, error);
                return conv;
              }
            }
            
            return conv;
          }));
          
          // Use the updated conversations
          fetchedConversations = updatedConversations;
        } catch (error) {
          console.error('[MessagesScreen] Error updating conversation names:', error);
        }
      }
      
      // Cache the fresh conversations
      cacheConversations(fetchedConversations);
      
      setConversations(fetchedConversations);
      setError(null);
    } catch (err) {
      console.error('[MessagesScreen] Failed to fetch conversations:', err);
      setError(`Failed to load conversations: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentUserEmail, getConversationDisplayName, loadCachedConversations, cacheConversations]);

  // Initial load
  useEffect(() => {
    if (currentUserEmail) {
      fetchConversations();
    }
  }, [fetchConversations, currentUserEmail]);

  // Memoize filtered conversations for performance
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    
    const normalizedQuery = searchQuery.toLowerCase();
    return conversations.filter(
      conversation => 
        conversation.name?.toLowerCase().includes(normalizedQuery) || 
        conversation.lastMessageContent?.toLowerCase().includes(normalizedQuery)
    );
  }, [searchQuery, conversations]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchConversations();
  }, [fetchConversations]);

  // Toggle search mode
  const toggleSearch = useCallback(() => {
    setIsSearchActive(prev => !prev);
    if (isSearchActive) {
      setSearchQuery('');
    }
  }, [isSearchActive]);
  
  // Navigate to conversation using FirebaseChatScreen
  const goToConversation = useCallback((conversation: Conversation) => {
    // Find the other participant in the conversation (not the current user)
    const otherParticipantEmail = conversation.participants.find(p => p !== currentUserEmail) || '';
    
    // Get the name from conversation using our helper function
    // This handles user-specific name mappings and formatting automatically
    const displayName = getConversationDisplayName(conversation);
    
    console.log('[MessagesScreen] Navigating to chat with:', {
      otherParticipant: otherParticipantEmail,
      displayName,
      conversationName: conversation.name,
      // For debugging, also log user-specific name mapping if available
      nameMapping: currentUserEmail ? 
        conversation[`name_${currentUserEmail.replace(/[.@]/g, '_')}`] : 
        undefined
    });
    
    // Navigate to Firebase chat screen with recipient info
    navigation.navigate('FirebaseChatScreen', { 
      recipientEmail: otherParticipantEmail,
      recipientName: displayName
    });
  }, [navigation, currentUserEmail, getConversationDisplayName]);

  // Get time display for conversation list (today, yesterday, or date)
  const getTimeDisplay = useCallback((timeString?: string) => {
    if (!timeString) return '';
    
    try {
      const date = new Date(timeString);
      const now = new Date();
      
      // Check if valid date
      if (isNaN(date.getTime())) {
        console.warn('[MessagesScreen] Invalid date:', timeString);
        return '';
      }
      
      // Fix future date issue (specific to this app where messages show 2025)
      let correctedDate = new Date(date);
      if (date > now) {
        console.warn('[MessagesScreen] Future date detected, correcting:', timeString);
        // Adjust to current time minus 7 hours (based on observed logs)
        const hoursInMilliseconds = 7 * 60 * 60 * 1000; // 7 hours in ms
        correctedDate = new Date(now.getTime() - hoursInMilliseconds);
      }
      
      // Check if it's today
      const isToday = 
        correctedDate.getDate() === now.getDate() &&
        correctedDate.getMonth() === now.getMonth() &&
        correctedDate.getFullYear() === now.getFullYear();
      
      // Check if it's yesterday
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const isYesterday = 
        correctedDate.getDate() === yesterday.getDate() &&
        correctedDate.getMonth() === yesterday.getMonth() &&
        correctedDate.getFullYear() === yesterday.getFullYear();
      
      // Format based on when the message was sent
      if (isToday) {
        return correctedDate.toLocaleTimeString([], { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
      } else if (isYesterday) {
        return 'Yesterday';
      } else {
        // Get month name (Jan, Feb, etc) and day
        const month = correctedDate.toLocaleString('default', { month: 'short' });
        const day = correctedDate.getDate();
        
        // If it's from this year, just show month/day
        if (correctedDate.getFullYear() === now.getFullYear()) {
          return `${month} ${day}`;
        } else {
          // If it's from a different year, include the year
          return `${month} ${day}, ${correctedDate.getFullYear()}`;
        }
      }
    } catch (error) {
      console.error('[MessagesScreen] Error formatting time:', error, timeString);
      return '';
    }
  }, []);

  // Conversation item separator
  const ItemSeparator = useCallback(() => (
    <View style={styles.separator} />
  ), []);

  // Key extractor for FlatList
  const keyExtractor = useCallback((item: Conversation) => item.id, []);

  // Render each conversation item
  const renderItem = useCallback(({ item }: { item: Conversation }) => {
    const displayName = getConversationDisplayName(item);
    const timeDisplay = getTimeDisplay(item.lastMessageTime);
    
    const lastMessage = item.lastMessageContent || 'No messages yet';
    const truncatedMessage = lastMessage.length > 40 
      ? `${lastMessage.substring(0, 40)}...` 
      : lastMessage;
    
    // Generate initials for avatar
    const initials = displayName
      .split(' ')
      .map((word: string) => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
    
    // Check if this conversation has unread messages
    const hasUnreadMessages = !!(item.unreadCount && item.unreadCount > 0);
    
    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          hasUnreadMessages && styles.unreadConversationItem
        ]}
        onPress={() => goToConversation(item)}
        activeOpacity={0.7}
      >
        {/* Unread indicator */}
        {hasUnreadMessages && <View style={styles.unreadIndicator} />}
        
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.conversationName, hasUnreadMessages && styles.unreadText]}>
              {displayName}
              {hasUnreadMessages && <View style={styles.dotIndicator} />}
            </Text>
            <Text style={[styles.conversationTime, hasUnreadMessages && styles.unreadTime]}>
              {timeDisplay}
            </Text>
          </View>
          <View style={styles.conversationPreview}>
            <Text 
              style={[
                styles.conversationMessage, 
                hasUnreadMessages && styles.unreadText
              ]} 
              numberOfLines={2}
            >
              {truncatedMessage}
            </Text>
            {hasUnreadMessages && item.unreadCount && item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {item.unreadCount > 9 ? '9+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [getConversationDisplayName, getTimeDisplay, goToConversation]);

  // Empty state component
  const renderEmptyComponent = useCallback(() => (
    <Animated.View 
      style={[
        styles.emptyContainer, 
        { opacity: fadeAnim }
      ]}
    >
      {!isLoading && !error && searchQuery.trim() === '' && (
        <>
          <Ionicons name="chatbubble-ellipses-outline" size={80} color="#eee" />
          <Text style={styles.emptyTitle}>No Conversations Yet</Text>
          <Text style={styles.emptyText}>
            When you start chatting with other users, your conversations will appear here.
          </Text>
          <TouchableOpacity 
            style={styles.startChatButton}
            onPress={() => navigation.navigate('UserSearchScreen')}
          >
            <Text style={styles.startChatButtonText}>Start a New Chat</Text>
          </TouchableOpacity>
        </>
      )}
      
      {!isLoading && !error && searchQuery.trim() !== '' && (
        <>
          <Ionicons name="search-outline" size={60} color="#ccc" />
          <Text style={styles.emptyTitle}>No Results Found</Text>
          <Text style={styles.emptyText}>
            We couldn't find any conversations matching "{searchQuery}".
          </Text>
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            <Text style={styles.clearButtonText}>Clear Search</Text>
          </TouchableOpacity>
        </>
      )}
      
      {!isLoading && error && (
        <>
          <Ionicons name="alert-circle-outline" size={60} color="#e74c3c" />
          <Text style={styles.errorTitle}>Something Went Wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchConversations}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </>
      )}
    </Animated.View>
  ), [isLoading, error, searchQuery, fadeAnim, navigation, fetchConversations]);

  // Render loader at the bottom of the list
  const renderFooter = useCallback(() => {
    if (!isLoading || isRefreshing) return null;
    
    return (
      <View style={styles.loaderFooter}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }, [isLoading, isRefreshing, COLORS]);

  // Get optimized list layout to improve FlatList performance
  const getItemLayout = useCallback((data: ArrayLike<Conversation> | null | undefined, index: number) => ({
    length: 80, // height of item + margins + separator
    offset: 80 * index,
    index,
  }), []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.headerContainer}>
        {isSearchActive && (
          <Animated.View 
            style={[
              styles.searchHeader,
              {
                opacity: searchBarAnim,
                transform: [{ 
                  translateY: searchBarAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0]
                  })
                }]
              }
            ]}
          >
            <TouchableOpacity 
              onPress={toggleSearch}
              style={styles.searchBackButton}
            >
              <Ionicons name="arrow-back" size={22} color="#333" />
            </TouchableOpacity>
            
            <TextInput
              style={styles.searchInput}
              placeholder="Search conversations..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </Animated.View>
        )}
        
        {!isSearchActive && (
          <Animated.View 
            style={[
              styles.normalHeader,
              {
                opacity: searchBarAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0]
                })
              }
            ]}
          >
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={styles.backButton}
              testID="back-button"
            >
              <MaterialIcons name="arrow-back-ios-new" size={22} color="#333" />
            </TouchableOpacity>
            
            <Text style={styles.header}>Messages</Text>
            
            <View style={styles.headerActions}>
              <TouchableOpacity 
                onPress={toggleSearch}
                style={styles.actionButton}
              >
                <Ionicons name="search" size={24} color="#333" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </View>
      
      {/* Message List */}
      <Animated.View style={[styles.listWrapper, { opacity: fadeAnim }]}>
        <FlatList
          data={filteredConversations}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={[
            styles.listContainer,
            filteredConversations.length === 0 && styles.emptyListContainer
          ]}
          ItemSeparatorComponent={ItemSeparator}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={renderEmptyComponent}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
          getItemLayout={getItemLayout}
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={21}
          removeClippedSubviews={Platform.OS === 'android'}
          onEndReachedThreshold={0.2}
          extraData={currentUserEmail}
        />
      </Animated.View>
      
      {/* Compose Button - Navigate to UserSearchScreen */}
      <TouchableOpacity 
        style={styles.composeButton}
        onPress={() => navigation.navigate('UserSearchScreen')}
        activeOpacity={0.9}
      >
        <Ionicons name="chatbubble-ellipses" size={24} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    backgroundColor: '#f7b305',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.08)',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
      },
      android: {
        marginTop: 0,
        paddingTop: 15,
        borderBottomWidth: 0,
        elevation: 4,
      },
    }),
    zIndex: 10,
  },
  normalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    padding: 8,
    marginRight: 4,
    paddingLeft: 0,
    ...Platform.select({
      android: {
        backgroundColor: '',
        borderRadius: 20,
        padding: 8,
        marginLeft: 5,
      },
    }),
  },
  header: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    ...Platform.select({
      android: {
        marginRight: 40, // Balance the header text when back button is visible
      },
    }),
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
  },
  searchHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBackButton: {
    padding: 8,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
  },
  listWrapper: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 80,
    backgroundColor: '#fff',
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 0,
    backgroundColor: '#fff',
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f5f5f5',
    position: 'relative', // For absolute positioning of unread indicator
    overflow: 'hidden', // To clip the unread indicator
  },
  unreadConversationItem: {
    borderLeftWidth: 0, // We'll use a separate indicator
    borderColor: '#f0f0f0',
  },
  unreadIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#ffb300',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  dotIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffb300',
    marginLeft: 6,
    marginRight: 2,
    marginBottom: 1,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#000', // Black avatar for premium feel
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  conversationTime: {
    fontSize: 12,
    color: '#888',
  },
  unreadTime: {
    color: '#555',
    fontWeight: '600',
  },
  conversationPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversationMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginRight: 8,
  },
  unreadText: {
    fontWeight: '600',
    color: '#000',
  },
  unreadBadge: {
    backgroundColor: '#ff6b6b',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 5,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  separator: {
    height: 0,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
    maxWidth: '80%',
  },
  startChatButton: {
    marginTop: 24,
    backgroundColor: '#ffb300',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  startChatButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  clearButton: {
    marginTop: 24,
    backgroundColor: '#ffb300',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  clearButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: '#ffb300',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  errorTitle: {
    fontSize: 20, 
    fontWeight: 'bold',
    color: '#e74c3c',
    marginTop: 10,
    marginBottom: 5,
  },
  errorText: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    maxWidth: '90%',
    marginBottom: 10,
  },
  loaderFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  composeButton: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f7b305',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default MessagesScreen;