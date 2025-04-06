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
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MainStackParamList } from '../../types/navigation.types';
import { Conversation } from '../../types/chat.types';
import { getConversations, getCurrentUser } from '../../services/firebaseChatService';

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

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const searchBarAnim = useRef(new Animated.Value(0)).current;
  
  // App theme colors - memoized to prevent re-renders
  const COLORS = useMemo(() => ({
    primary: '#ffb300',
    primaryDark: '#f57c00',
    background: '#f8f8f8',
    surface: '#ffffff',
    text: '#333333', 
    textSecondary: '#666666',
    textLight: '#888888',
    border: '#eeeeee',
    shadow: 'rgba(0, 0, 0, 0.12)'
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
  
  // Fetch current user email on component mount
  useEffect(() => {
    fetchCurrentUser();
    
    // Trigger fade-in animation on mount
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fetchCurrentUser, fadeAnim]);

  // Animate search bar in/out
  useEffect(() => {
    Animated.timing(searchBarAnim, {
      toValue: isSearchActive ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isSearchActive, searchBarAnim]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('[MessagesScreen] Fetching Firebase conversations...');
      const fetchedConversations = await getConversations();
      console.log('[MessagesScreen] Fetched Firebase conversations:', 
        fetchedConversations.map(c => ({
          id: c.id,
          name: c.name,
          participants: c.participants,
          lastMessage: c.lastMessageContent
        }))
      );
      
      setConversations(fetchedConversations);
      setError(null);
    } catch (err) {
      console.error('[MessagesScreen] Failed to fetch Firebase conversations:', err);
      setError(`Failed to load conversations: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

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
    const otherParticipant = conversation.participants.find(p => p !== currentUserEmail) || '';
    
    // Navigate to Firebase chat screen with recipient info
    navigation.navigate('FirebaseChatScreen', { 
      recipientEmail: otherParticipant,
      recipientName: conversation.name || otherParticipant
    });
  }, [navigation, currentUserEmail]);

  // Get display name for a conversation (the other participant's name)
  const getConversationDisplayName = useCallback((conversation: Conversation) => {
    if (!currentUserEmail) return conversation.name || 'Unknown Contact';
    
    // Find the other participant (the person we're talking to)
    const otherParticipant = conversation.participants.find(p => p !== currentUserEmail);
    
    // If we're not the owner of the conversation, show the owner's name
    if (conversation.owner && conversation.owner !== currentUserEmail) {
      return conversation.name || 'Unknown Contact';
    }
    
    // Show the recipient's name or email
    if (otherParticipant) {
      if (conversation.name && conversation.name !== otherParticipant) {
        return conversation.name;
      }
      
      // Format email to show just the username part
      if (otherParticipant.includes('@')) {
        return otherParticipant.split('@')[0];
      }
      
      return otherParticipant;
    }
    
    // Default fallback
    return conversation.name || 'Unknown Contact';
  }, [currentUserEmail]);

  // Get conversation timestamp for today/yesterday handling
  const getTimeDisplay = useCallback((timestamp?: string) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      
      const isToday = date.getDate() === now.getDate() && 
                      date.getMonth() === now.getMonth() && 
                      date.getFullYear() === now.getFullYear();
                      
      const isYesterday = date.getDate() === yesterday.getDate() && 
                          date.getMonth() === yesterday.getMonth() && 
                          date.getFullYear() === yesterday.getFullYear();
      
      if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (isYesterday) {
        return 'Yesterday';
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
    } catch (error) {
      console.error('[MessagesScreen] Error formatting time:', error);
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
      .map(word => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
    
    // Generate consistent color based on name
    const nameHash = displayName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = nameHash % 360;
    const avatarColor = `hsl(${hue}, 60%, 60%)`;
    
    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => goToConversation(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        
        <View style={styles.conversationContent}>
          <View style={styles.topRow}>
            <Text style={styles.conversationName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.timeText}>
              {timeDisplay}
            </Text>
          </View>
          
          <View style={styles.bottomRow}>
            <Text style={styles.messagePreview} numberOfLines={1}>
              {truncatedMessage}
            </Text>
            
            {/* Optional dot for unread messages */}
            {false && (
              <View style={styles.unreadDot} />
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
          <Ionicons name="chatbubble-ellipses-outline" size={60} color="#ccc" />
          <Text style={styles.emptyTitle}>No Conversations Yet</Text>
          <Text style={styles.emptyText}>
            When you start chatting with other users, your conversations will appear here.
          </Text>
          <TouchableOpacity 
            style={styles.startChatButton}
            onPress={() => navigation.navigate('FirebaseChatTest')}
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
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
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
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          windowSize={10}
          removeClippedSubviews={Platform.OS === 'android'}
        />
      </Animated.View>
      
      {/* Compose Button - Navigate to Chat Test Screen */}
      <TouchableOpacity 
        style={styles.composeButton}
        onPress={() => navigation.navigate('FirebaseChatTest')}
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
    backgroundColor: '#f8f8f8',
  },
  headerContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 3,
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
  },
  header: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
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
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 80,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 0,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    shadowColor: 'rgba(0, 0, 0, 0.06)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ffb300',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: 'rgba(0, 0, 0, 0.15)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  conversationContent: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  timeText: {
    fontSize: 12,
    color: '#888',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messagePreview: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginRight: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffb300',
    marginLeft: 8,
  },
  separator: {
    height: 0,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#555',
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
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffb300',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 5,
  }
});

export default MessagesScreen;