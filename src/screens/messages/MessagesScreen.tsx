import React, { useState, useCallback, useMemo } from 'react';
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
  Platform,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MainStackParamList } from '../../types/navigation.types';

// Remove unused 'width' variable
// const { width } = Dimensions.get('window');

interface MessageData {
  id: string;
  name: string;
  message: string;
  time: string;
  status: 'online' | 'offline';
  unreadCount?: number;
  avatar?: string; // Would hold the image URL in a real app
}

// Sample data - in a real app this would come from an API
const messagesData: MessageData[] = [
  { id: '1', name: 'Fauziah', message: 'I will do the voice over', time: '10:30 PM', status: 'online', unreadCount: 2 },
  { id: '2', name: 'Nicole', message: 'just open la', time: '3:15 PM', status: 'online', unreadCount: 1 },
  { id: '3', name: 'Brian', message: 'bye', time: 'Yesterday', status: 'offline' },
  { id: '4', name: 'Cheng', message: 'call me when you get the chance, wanted to discuss about the project', time: 'Yesterday', status: 'offline' },
  { id: '5', name: 'Model', message: 'ready for another adventure? I found some cool places', time: 'Yesterday', status: 'offline' },
  { id: '6', name: 'Ash King', message: 'whatsapp my frnd', time: '2d', status: 'offline' },
  { id: '7', name: 'Remote Guy', message: 'here is your bill for the engineering textbook', time: 'Mar 10', status: 'offline' },
  { id: '8', name: 'Kg1', message: 'LOL!!!', time: 'Mar 7', status: 'offline' },
  { id: '9', name: 'Stephen', message: 'that would be great!', time: 'Mar 3', status: 'offline' },
];

const MessagesScreen = () => {
  const navigation = useNavigation<NavigationProp<MainStackParamList>>();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Memoize filtered messages for performance - fix dependency array
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messagesData;
    
    const normalizedQuery = searchQuery.toLowerCase();
    return messagesData.filter(
      message => 
        message.name.toLowerCase().includes(normalizedQuery) || 
        message.message.toLowerCase().includes(normalizedQuery)
    );
  }, [searchQuery]); // Remove messagesData from dependencies as it's static

  // Handle refresh - in a real app would refetch from API
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    
    // Simulate network request
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1500);
  }, []);

  // Load more messages - in a real app would fetch next page
  const handleLoadMore = useCallback(() => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    // Simulate network request
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
  }, [isLoading]);

  // Toggle search mode
  const toggleSearch = useCallback(() => {
    setIsSearchActive(prev => !prev);
    if (isSearchActive) {
      setSearchQuery('');
    }
  }, [isSearchActive]);

  // Navigate to conversation
  const goToConversation = useCallback((item: MessageData) => {
    navigation.navigate('MessageScreen', { conversationId: item.id, recipientName: item.name });
  }, [navigation]);

  // Render message item
  const renderItem = useCallback(({ item }: { item: MessageData }) => (
    <TouchableOpacity 
      style={styles.messageContainer}
      onPress={() => goToConversation(item)}
      activeOpacity={0.7}
    >
      <View style={[
        styles.avatar,
        { backgroundColor: item.status === 'online' ? '#4CAF50' : '#8E8E8E' },
      ]}>
        <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
        {item.status === 'online' && (
          <View style={styles.onlineIndicator} />
        )}
      </View>
      
      <View style={styles.messageContent}>
        <View style={styles.headerRow}>
          <Text style={styles.senderName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.messageTime}>{item.time}</Text>
        </View>
        
        <View style={styles.messagePreviewRow}>
          <Text 
            style={styles.messageText} 
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.message}
          </Text>
          
          {item.unreadCount ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{item.unreadCount}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  ), [goToConversation]);

  // Render empty state when no messages match search
  const renderEmptyComponent = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Icon name="comments-o" size={70} color="#CCCCCC" />
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'No matching conversations' : 'No conversations yet'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery 
          ? 'Try a different search term'
          : 'When you start a conversation, it will appear here'
        }
      </Text>
    </View>
  ), [searchQuery]);

  // Render loader at the bottom of the list
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
              onPress={() => navigation.navigate('Home')} 
              style={styles.backButton}
              testID="back-button"
            >
              <MaterialIcons name="arrow-back-ios-new" size={22} color="#333" />
            </TouchableOpacity>
            
            <Text style={styles.header}>Messages</Text>
            
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.actionButton} onPress={toggleSearch}>
                <Ionicons name="search-outline" size={22} color="#333" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('Home')}
              >
                <Icon name="home" size={22} color="#333" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
      
      {/* Message List */}
      <FlatList
        data={filteredMessages}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
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
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
      />
      
      {/* Compose Button */}
      <TouchableOpacity style={styles.composeButton}>
        <Icon name="edit" size={22} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 10,
    paddingBottom: 15,
    backgroundColor: '#f7b305',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  searchHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBackButton: {
    padding: 8,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 15,
    fontSize: 15,
    color: '#333',
  },
  backButton: {
    padding: 8,
  },
  header: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '600',
  },
  onlineIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    position: 'absolute',
    bottom: 2,
    right: 2,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  messageContent: {
    flex: 1,
    flexDirection: 'column',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  messagePreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  senderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
    marginRight: 8,
  },
  messageText: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
    marginRight: 10,
  },
  messageTime: {
    fontSize: 12,
    color: '#888888',
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: 70,
  },
  composeButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#f7b305',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  listContainer: {
    flexGrow: 1,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f7b305',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    marginTop: 50,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 20,
  },
  loaderFooter: {
    paddingVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MessagesScreen;