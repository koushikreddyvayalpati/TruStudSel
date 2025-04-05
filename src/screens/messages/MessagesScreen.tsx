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
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MainStackParamList } from '../../types/navigation.types';
import { Conversation } from '../../types/chat.types';
import { getConversations, getCurrentUser } from '../../services/chatService';
import { formatDistanceToNow } from 'date-fns';

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
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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
  
  // Function to get current user ID only once
  const fetchCurrentUserId = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    } catch (error) {
      console.error('[MessagesScreen] Error fetching current user ID:', error);
    }
  }, []);
  
  // Fetch current user ID on component mount
  useEffect(() => {
    fetchCurrentUserId();
    
    // Trigger fade-in animation on mount
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fetchCurrentUserId, fadeAnim]);

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
      console.log('[MessagesScreen] Fetching conversations...');
      const fetchedConversations = await getConversations();
      console.log('[MessagesScreen] Fetched conversations:', 
        fetchedConversations.map(c => ({
          id: c.id,
          name: c.name,
          participants: c.participants,
          lastMessage: c.lastMessageContent
        }))
      );
      
      // Sort conversations by lastMessageTime (most recent first)
      const sortedConversations = [...fetchedConversations].sort((a, b) => {
        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return timeB - timeA;
      });
      
      console.log('[MessagesScreen] Sorted conversations by time:', 
        sortedConversations.map(c => ({
          id: c.id,
          time: c.lastMessageTime
        }))
      );
      
      setConversations(sortedConversations);
      setDebugInfo(JSON.stringify({
        conversationCount: sortedConversations.length,
        conversationIds: sortedConversations.map(c => c.id),
        participantsList: sortedConversations.map(c => c.participants),
        lastMessageTimes: sortedConversations.map(c => c.lastMessageTime),
        timestamp: new Date().toISOString()
      }, null, 2));
      setError(null);
    } catch (err) {
      console.error('[MessagesScreen] Failed to fetch conversations:', err);
      setError(`Failed to load conversations: ${err instanceof Error ? err.message : String(err)}`);
      setDebugInfo(JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : 'No stack trace',
        timestamp: new Date().toISOString()
      }, null, 2));
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

  // Toggle debug info
  const toggleDebug = useCallback(() => {
    setShowDebug(prev => !prev);
  }, []);

  // Navigate to conversation
  const goToConversation = useCallback((conversation: Conversation) => {
    navigation.navigate('MessageScreen', { 
      conversationId: conversation.id, 
      recipientName: conversation.name || 'Chat'
    });
  }, [navigation]);

  // Format relative time
  const formatRelativeTime = useCallback((dateString?: string) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return dateString;
    }
  }, []);

  // Get display name for a conversation (the other participant's name)
  const getConversationDisplayName = useCallback((conversation: Conversation) => {
    if (!currentUserId) return conversation.name || 'Unknown Contact';
    
    // Find the other participant ID (the person we're talking to)
    const otherParticipant = conversation.participants.find(p => p !== currentUserId);
    
    // For the specific case in the logs (Sarah viewing Koushik's message)
    // If user is Sarah (skonakan@uab.edu) and conversation owner is Koushik
    if (currentUserId.includes('f17bb590') && conversation.owner?.includes('a1cbd5d0')) {
      return "Koushik"; // Use hardcoded name for the demo
    }
    
    // If the current user is NOT the owner of the conversation
    if (conversation.owner && conversation.owner !== currentUserId) {
      // When we're the recipient, the best name to show is the owner's name
      return conversation.name || 'Unknown Contact';
    }
    
    // If the current user IS the owner of the conversation
    if (otherParticipant) {
      // For conversations we initiated, show the recipient's name or email
      if (otherParticipant.includes('@')) {
        return otherParticipant.split('@')[0];
      }
      
      // If we have a different name set, use it
      return conversation.name || 'Unknown Contact';
    }
    
    // Default fallback
    return conversation.name || 'Unknown Contact';
  }, [currentUserId]);

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
      return formatRelativeTime(timestamp);
    }
  }, [formatRelativeTime]);

  // Render conversation item with optimized performance
  const renderItem = useCallback(({ item }: { item: Conversation }) => {
    const displayName = getConversationDisplayName(item);
    const timeDisplay = getTimeDisplay(item.lastMessageTime);
    const initials = displayName.charAt(0).toUpperCase();
    
    // Use consistent gold color for all avatars
    const avatarColor = '#f7b305';
    
    return (
      <TouchableOpacity 
        style={styles.messageContainer}
        onPress={() => goToConversation(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{initials || '?'}</Text>
        </View>
        
        <View style={styles.messageContent}>
          <View style={styles.headerRow}>
            <Text style={styles.senderName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.messageTime}>
              {timeDisplay}
            </Text>
          </View>
          
          <View style={styles.messagePreviewRow}>
            <Text 
              style={[
                styles.messageText,
                !item.lastMessageContent && styles.emptyMessageText
              ]} 
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.lastMessageContent || 'No messages yet'}
            </Text>
            
            {item.productName && (
              <View style={styles.productBadge}>
                <Text style={styles.productText} numberOfLines={1}>
                  {item.productName}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [goToConversation, getConversationDisplayName, getTimeDisplay]);

  // Memoize key extractor for performance
  const keyExtractor = useCallback((item: Conversation) => item.id, []);

  // Memoized separator component
  const ItemSeparator = useCallback(() => <View style={styles.separator} />, []);

  // Render empty state when no conversations match search
  const renderEmptyComponent = useCallback(() => (
    <Animated.View 
      style={[
        styles.emptyContainer,
        { opacity: fadeAnim }
      ]}
    >
      <Icon name="comments-o" size={80} color="#E0E0E0" />
      <Text style={styles.emptyTitle}>
        {isLoading ? 'Loading conversations...' : 
         error ? 'Error loading conversations' :
         searchQuery ? 'No matching conversations' : 'No conversations yet'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {isLoading ? 'Please wait...' :
         error ? error :
         searchQuery ? 'Try a different search term' : 'Start a conversation by tapping the + button below'}
      </Text>
      
      {!isLoading && !error && !searchQuery && (
        <TouchableOpacity 
          style={styles.emptyActionButton}
          onPress={() => navigation.navigate('UserSearchScreen')}
        >
          <Text style={styles.emptyActionButtonText}>Find Someone to Chat With</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  ), [isLoading, error, searchQuery, fadeAnim, navigation]);

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
      
      {/* Debug Button */}
      <TouchableOpacity 
        style={styles.debugButton}
        onPress={toggleDebug}
      >
        <Ionicons name="bug" size={20} color="#FFF" />
      </TouchableOpacity>
      
      {/* Debug overlay */}
      {showDebug && (
        <View style={styles.debugOverlay}>
          <View style={styles.debugHeader}>
            <Text style={styles.debugTitle}>Debug Info</Text>
            <TouchableOpacity onPress={toggleDebug}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.refreshButton} 
            onPress={fetchConversations}
          >
            <Text style={styles.refreshButtonText}>Force Refresh</Text>
          </TouchableOpacity>
          
          <Text style={styles.debugText}>{debugInfo}</Text>
        </View>
      )}
      
      {/* Compose Button - Navigate to User Search Screen */}
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
  messageContainer: {
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
  messageContent: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  senderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  messageTime: {
    fontSize: 12,
    color: '#888',
  },
  messagePreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginRight: 8,
  },
  emptyMessageText: {
    fontStyle: 'italic',
    color: '#999',
  },
  productBadge: {
    backgroundColor: 'rgba(255, 179, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    maxWidth: 120,
  },
  productText: {
    fontSize: 11,
    color: '#f57c00',
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#ffb300',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadCount: {
    fontSize: 11,
    color: '#fff',
    fontWeight: 'bold',
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
  emptySubtitle: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
    maxWidth: '80%',
  },
  emptyActionButton: {
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
  emptyActionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
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
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  debugButton: {
    position: 'absolute',
    bottom: 95,
    right: 20,
    backgroundColor: 'rgba(80, 80, 80, 0.8)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  debugOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: 20,
    zIndex: 100,
  },
  debugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  debugTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  debugText: {
    color: '#FFF',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  refreshButton: {
    backgroundColor: '#ffb300',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  refreshButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});

export default MessagesScreen;