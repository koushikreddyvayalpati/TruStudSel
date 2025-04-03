import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MainStackParamList } from '../../types/navigation.types';
import { Conversation } from '../../types/chat.types';
import { getConversations } from '../../services/chatService';
import { formatDistanceToNow } from 'date-fns';

// Navigation prop type with stack methods
type MessagesScreenNavigationProp = StackNavigationProp<MainStackParamList, 'MessagesScreen'>;

// Remove unused 'width' variable
// const { width } = Dimensions.get('window');

const MessagesScreen = () => {
  const navigation = useNavigation<MessagesScreenNavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const fetchedConversations = await getConversations();
      setConversations(fetchedConversations);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
      setError('Failed to load conversations. Please try again.');
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

  // Render conversation item
  const renderItem = useCallback(({ item }: { item: Conversation }) => (
    <TouchableOpacity 
      style={styles.messageContainer}
      onPress={() => goToConversation(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name?.charAt(0) || '?'}</Text>
      </View>
      
      <View style={styles.messageContent}>
        <View style={styles.headerRow}>
          <Text style={styles.senderName} numberOfLines={1}>
            {item.name || 'Unknown Contact'}
          </Text>
          <Text style={styles.messageTime}>
            {formatRelativeTime(item.lastMessageTime)}
          </Text>
        </View>
        
        <View style={styles.messagePreviewRow}>
          <Text 
            style={styles.messageText} 
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
  ), [goToConversation, formatRelativeTime]);

  // Render empty state when no conversations match search
  const renderEmptyComponent = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Icon name="comments-o" size={70} color="#CCCCCC" />
      <Text style={styles.emptyTitle}>
        {isLoading ? 'Loading conversations...' : 
         error ? 'Error loading conversations' :
         searchQuery ? 'No matching conversations' : 'No conversations yet'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {isLoading ? 'Please wait...' :
         error ? error :
         searchQuery ? 'Try a different search term' : 'When you start a conversation, it will appear here'}
      </Text>
    </View>
  ), [searchQuery, isLoading, error]);

  // Render loader at the bottom of the list
  const renderFooter = useCallback(() => {
    if (!isLoading || isRefreshing) return null;
    
    return (
      <View style={styles.loaderFooter}>
        <ActivityIndicator size="small" color="#f7b305" />
      </View>
    );
  }, [isLoading, isRefreshing]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7b305" />
      
      {/* Header */}
      <View style={styles.headerContainer}>
        {isSearchActive ? (
          /* Search Header */
          <View style={styles.searchHeader}>
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
          </View>
        ) : (
          /* Normal Header */
          <>
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
          </>
        )}
      </View>
      
      {/* Message List */}
      <FlatList
        data={filteredConversations}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.listContainer,
          filteredConversations.length === 0 && styles.emptyListContainer
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#f7b305']}
            tintColor="#f7b305"
          />
        }
        ListEmptyComponent={renderEmptyComponent}
        ListFooterComponent={renderFooter}
      />
      
      {/* Compose Button - Navigate to User Search Screen */}
      <TouchableOpacity 
        style={styles.composeButton}
        onPress={() => navigation.navigate('UserSearchScreen')}
      >
        <Icon name="user-plus" size={22} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 5,
  },
  header: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  headerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 5,
    marginLeft: 10,
  },
  searchHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBackButton: {
    padding: 5,
  },
  searchInput: {
    flex: 1,
    height: 40,
    marginLeft: 10,
    fontSize: 16,
  },
  listContainer: {
    padding: 10,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f7b305',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  messageContent: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  senderName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 5,
  },
  messageTime: {
    fontSize: 12,
    color: '#999',
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
    marginRight: 5,
  },
  productBadge: {
    backgroundColor: '#e0f7fa',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    maxWidth: 120,
  },
  productText: {
    fontSize: 11,
    color: '#0277bd',
  },
  unreadBadge: {
    backgroundColor: '#f7b305',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadCount: {
    fontSize: 11,
    color: '#fff',
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 15,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
  },
  loaderFooter: {
    paddingVertical: 20,
  },
  composeButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f7b305',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});

export default MessagesScreen;