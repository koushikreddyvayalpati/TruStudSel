import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { MainStackParamList } from '../../types/navigation.types';
import { Conversation } from '../../types/chat.types';
import useChatStore from '../../store/chatStore';
import * as PushNotificationHelper from '../../utils/pushNotificationHelper';
import { configureStatusBar } from '../../utils/statusBarManager';

// Navigation prop type with stack methods
type MessagesScreenNavigationProp = StackNavigationProp<MainStackParamList, 'MessagesScreen'>;

const MessagesScreen = () => {
  const navigation = useNavigation<MessagesScreenNavigationProp>();

  // Get state and actions from Zustand store
  const {
    conversations,
    isSearchActive,
    searchQuery,
    isRefreshing,
    isLoading,
    error,
    currentUserEmail,

    setIsSearchActive,
    setSearchQuery,
    fetchCurrentUser,
    fetchConversations,
    setupConversationSubscription,
    cleanupConversationSubscription,
    getConversationDisplayName,
    getTimeDisplay,
    markConversationAsRead,
    updateUnreadCount,
  } = useChatStore();

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
    shadow: 'rgba(0, 0, 0, 0.08)',
  }), []);

  // State to track keyboard visibility
  const [_keyboardVisible, setKeyboardVisible] = React.useState(false);

  // Fetch current user email only once
  useEffect(() => {
    fetchCurrentUser();

    // Configure status bar consistently
    configureStatusBar();

    // Trigger fade-in animation on mount
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Cleanup subscription on unmount
    return () => {
      cleanupConversationSubscription();
    };
  }, [fetchCurrentUser, fadeAnim, cleanupConversationSubscription]);

  // Set up real-time subscription when user email is available
  useEffect(() => {
    if (currentUserEmail) {
      setupConversationSubscription();
    }
  }, [currentUserEmail, setupConversationSubscription]);

  // Setup keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Animate search bar in/out
  useEffect(() => {
    Animated.timing(searchBarAnim, {
      toValue: isSearchActive ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isSearchActive, searchBarAnim]);

  // Initial load - remove auto-marking as read
  useEffect(() => {
    if (currentUserEmail) {
      fetchConversations();
    }
  }, [fetchConversations, currentUserEmail]);

  // Update the useFocusEffect callback to not mark all conversations as read
  useFocusEffect(
    useCallback(() => {
      if (currentUserEmail && conversations.length > 0) {
        console.log('[MessagesScreen] Screen focused');
        
        // Just refresh conversations and update the unread count
        // but don't mark them as read automatically
        fetchConversations(true);
        updateUnreadCount();
      }
      return () => {
        // Cleanup when screen loses focus (optional)
      };
    }, [currentUserEmail, conversations.length, fetchConversations, updateUnreadCount])
  );

  // Memoize filtered conversations for performance
  const filteredConversations = useMemo(() => {
    // First filter out conversations without messages
    const conversationsWithMessages = conversations.filter(
      conversation => !!conversation.lastMessageContent
    );
    
    if (!searchQuery.trim()) {return conversationsWithMessages;}

    const normalizedQuery = searchQuery.toLowerCase();
    return conversationsWithMessages.filter(
      conversation =>
        conversation.name?.toLowerCase().includes(normalizedQuery) ||
        conversation.lastMessageContent?.toLowerCase().includes(normalizedQuery)
    );
  }, [searchQuery, conversations]);

  // Toggle search mode
  const toggleSearch = useCallback(() => {
    setIsSearchActive(!isSearchActive);
  }, [isSearchActive, setIsSearchActive]);

  // Navigate to conversation using FirebaseChatScreen
  const goToConversation = useCallback((conversation: Conversation) => {
    // Find the other participant in the conversation (not the current user)
    const otherParticipantEmail = conversation.participants.find(p => p !== currentUserEmail) || '';

    // Get the name from conversation using our helper function
    // This handles user-specific name mappings and formatting automatically
    const displayName = getConversationDisplayName(conversation);

    // Ensure we're passing the other participant's name, not the current user's name
    let otherParticipantName = displayName;

    // Extra safety check - if displayName somehow still matches current user's name
    if (currentUserEmail) {
      const currentUserBaseName = currentUserEmail.split('@')[0].toLowerCase();
      const currentUserDisplayName = currentUserBaseName.charAt(0).toUpperCase() + currentUserBaseName.slice(1);

      // If the displayed name is somehow still the current user's name, use the other email username
      if (otherParticipantName === currentUserDisplayName ||
          otherParticipantName.toLowerCase() === currentUserBaseName) {

        if (otherParticipantEmail.includes('@')) {
          const username = otherParticipantEmail.split('@')[0];
          otherParticipantName = username.charAt(0).toUpperCase() + username.slice(1);
        }
      }
    }

    // console.log('[MessagesScreen] Navigating to chat with:', {
    //   otherParticipant: otherParticipantEmail,
    //   displayName: otherParticipantName,
    //   conversationName: conversation.name,
    //   // For debugging, also log user-specific name mapping if available
    //   nameMapping: currentUserEmail ?
    //     conversation[`name_${currentUserEmail.replace(/[.@]/g, '_')}`] :
    //     undefined,
    // });

    // Mark this specific conversation as read immediately in the UI and database
    if (conversation.unreadCount && conversation.unreadCount > 0) {
      console.log(`[MessagesScreen] Marking conversation ${conversation.id} as read before navigation`);
      markConversationAsRead(conversation.id);
    }

    // Navigate to Firebase chat screen with recipient info
    navigation.navigate('FirebaseChatScreen', {
      recipientEmail: otherParticipantEmail,
      recipientName: otherParticipantName,
    });
  }, [navigation, currentUserEmail, getConversationDisplayName, markConversationAsRead]);

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
          hasUnreadMessages && styles.unreadConversationItem,
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
                hasUnreadMessages && styles.unreadText,
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
        { opacity: fadeAnim },
      ]}
    >
      {!isLoading && !error && searchQuery.trim() === '' && (
        <>
          <Ionicons name="chatbubble-ellipses-outline" size={80} color="#eee" />
          <Text style={styles.emptyTitle}>No Conversations Yet</Text>
          <Text style={styles.emptyText}>
            When you start chatting with other users, your conversations will appear here.
          </Text>
          {/* <TouchableOpacity
            style={styles.startChatButton}
            onPress={() => navigation.navigate('UserSearchScreen')}
          >
            <Text style={styles.startChatButtonText}>Start a New Chat</Text>
          </TouchableOpacity> */}
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
            onPress={() => fetchConversations()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </>
      )}
    </Animated.View>
  ), [isLoading, error, searchQuery, fadeAnim, fetchConversations, setSearchQuery]);

  // Render loader at the bottom of the list
  const renderFooter = useCallback(() => {
    if (!isLoading || isRefreshing) {return null;}

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

  // FCM Token and notification setup
  useEffect(() => {
    // Request permission and register for push notifications
    const setupMessaging = async () => {
      try {
        // Import modular Firebase libraries
        const { getApp } = await import('@react-native-firebase/app');
        const { 
          getMessaging, 
          getToken, 
          subscribeToTopic,
        } = await import('@react-native-firebase/messaging');
        
        // Get messaging instance using modular API
        const app = getApp();
        const messagingInstance = getMessaging(app);
        
        // Get FCM token
        const token = await getToken(messagingInstance);
        
        // Register the token with Firestore via PushNotificationHelper
        PushNotificationHelper.saveTokenToFirestore(token);
        
        // Subscribe to the messages topic
        await subscribeToTopic(messagingInstance, 'messages');
      } catch (error) {
        console.error('Failed to get FCM token:', error);
      }
    };
    
    setupMessaging();
    
    // Import additional functions for creating listeners
    const setupListeners = async () => {
      try {
        const { getApp } = await import('@react-native-firebase/app');
        const { getMessaging, onTokenRefresh, onMessage } = await import('@react-native-firebase/messaging');
        
        const app = getApp();
        const messagingInstance = getMessaging(app);
        
        // Listen for token refresh
        const unsubscribeTokenRefresh = onTokenRefresh(messagingInstance, async () => {
          await PushNotificationHelper.registerDevice();
        });
        
        // Handle notifications when app is in foreground
        const unsubscribeForegroundMessage = onMessage(messagingInstance, async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
          console.log('Foreground Message received:', remoteMessage);
          
          // Check if notification is related to messages
          if (remoteMessage.data?.type === 'message') {
            // Refresh conversations to show new message
            fetchConversations(true);
            
            // Show a local notification
            PushNotificationHelper.showLocalNotification({
              title: remoteMessage.notification?.title || 'New Message',
              body: remoteMessage.notification?.body || 'You have received a new message',
              data: remoteMessage.data,
            });
          } else if (remoteMessage.data?.type === 'conversation') {
            // Handle new conversation notifications
            fetchConversations(true);
            
            PushNotificationHelper.showLocalNotification({
              title: remoteMessage.notification?.title || 'New Conversation',
              body: remoteMessage.notification?.body || 'A new conversation has been started',
              data: remoteMessage.data,
            });
          }
        });
        
        return () => {
          // Clean up listeners
          unsubscribeTokenRefresh();
          unsubscribeForegroundMessage();
        };
      } catch (error) {
        console.error('Error setting up listeners:', error);
        return () => {};
      }
    };
    
    const unsubscribe = setupListeners();
    
    return () => {
      // Call the cleanup function returned by setupListeners
      unsubscribe.then(cleanup => cleanup());
    };
  }, [fetchConversations]);
  
  // Set up notification opened handler
  useEffect(() => {
    // Import required functions and set up handlers
    const setupNotificationHandlers = async () => {
      try {
        // Import modular Firebase libraries
        const { getApp } = await import('@react-native-firebase/app');
        const { getMessaging, onNotificationOpenedApp, getInitialNotification } = await import('@react-native-firebase/messaging');
        
        // Get messaging instance using modular API
        const app = getApp();
        const messagingInstance = getMessaging(app);
        
        // Handle notification open events (when app is in background)
        const unsubscribe = onNotificationOpenedApp(messagingInstance, remoteMessage => {
          console.log('Notification opened app:', remoteMessage);
          
          // Check if notification has data
          if (remoteMessage.data) {
            const data = remoteMessage.data;
            
            // Check if notification is related to messages
            if (data.type === 'message' && data.conversationId) {
              // Navigate to the specific conversation
              navigation.navigate('FirebaseChatScreen', {
                recipientEmail: String(data.conversationId),
                recipientName: String(data.senderName || 'Chat'),
              });
            } else if (data.type === 'conversation' && data.conversationId) {
              // Navigate to the new conversation
              navigation.navigate('FirebaseChatScreen', {
                recipientEmail: String(data.conversationId),
                recipientName: String(data.creatorName || 'Chat'),
              });
            }
          }
        });
        
        // Check if app was opened from a notification
        getInitialNotification(messagingInstance)
          .then(remoteMessage => {
            if (remoteMessage && remoteMessage.data) {
              console.log('App opened from notification:', remoteMessage);
              
              const data = remoteMessage.data;
              // Check notification type
              if (data.type === 'message' && data.conversationId) {
                // Wait a short time to ensure navigation is ready
                setTimeout(() => {
                  navigation.navigate('FirebaseChatScreen', {
                    recipientEmail: String(data.conversationId),
                    recipientName: String(data.senderName || 'Chat'),
                  });
                }, 1000);
              } else if (data.type === 'conversation' && data.conversationId) {
                // Wait a short time to ensure navigation is ready
                setTimeout(() => {
                  navigation.navigate('FirebaseChatScreen', {
                    recipientEmail: String(data.conversationId),
                    recipientName: String(data.creatorName || 'Chat'),
                  });
                }, 1000);
              }
            }
          });
          
        return unsubscribe;
      } catch (error) {
        console.error('Error setting up notification handlers:', error);
        return () => {};
      }
    };
    
    // Set up handlers and store cleanup function
    const handlerPromise = setupNotificationHandlers();
    
    return () => {
      // Cleanup when component unmounts
      handlerPromise.then(unsubscribe => unsubscribe());
    };
  }, [navigation]);

  // Properly type the onRefresh handler to work with RefreshControl
  const onRefresh = useCallback(() => {
    // Use fetchConversations which will internally handle the refreshing state
    fetchConversations(true);
  }, [fetchConversations]);

  return (
    <>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <SafeAreaView
          style={styles.container}
          edges={Platform.OS === 'ios' ? ['top', 'bottom', 'left', 'right'] : ['bottom', 'left', 'right']}
        >
          {/* Header */}
          <View style={[styles.headerContainer]}>
            {isSearchActive && (
              <Animated.View
                style={[
                  styles.searchHeader,
                  {
                    opacity: searchBarAnim,
                    transform: [{
                      translateY: searchBarAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-20, 0],
                      }),
                    }],
                  },
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
                  onSubmitEditing={() => Keyboard.dismiss()}
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
                      outputRange: [1, 0],
                    }),
                  },
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
                filteredConversations.length === 0 && styles.emptyListContainer,
              ]}
              ItemSeparatorComponent={ItemSeparator}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={onRefresh}
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
        </SafeAreaView>
      </KeyboardAvoidingView>
    </>
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
        height: 56,
      },
      android: {
        height: 56,
        marginTop: 0,
        paddingTop: 0,
        borderBottomWidth: 0,
        elevation: 4,
      },
    }),
    zIndex: 0,
  },
  normalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        paddingVertical: 0,
        height: '100%',
        justifyContent: 'space-between',
      },
      android: {
        paddingVertical: 14,
        height: '100%',
        justifyContent: 'space-between',
      },
    }),
  },
  backButton: {
    padding: 8,
    marginRight: 4,
    paddingLeft: 0,
    ...Platform.select({
      ios: {
        marginRight: 4,
        width: 40,
        alignItems: 'center',
        justifyContent: 'center',
      },
      android: {
        backgroundColor: 'transparent',
        borderRadius: 20,
        padding: 0,
        marginLeft: 0,
        width: 40,
        alignItems: 'center',
        justifyContent: 'center',
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
      ios: {
        flex: 2,
        marginHorizontal: 10,
      },
      android: {
        flex: 2,
        marginHorizontal: 10,
      },
    }),
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        width: 40,
        alignItems: 'center',
        justifyContent: 'center',
      },
      android: {
        width: 40,
        alignItems: 'center',
        justifyContent: 'center',
      },
    }),
  },
  actionButton: {
    padding: 8,
    ...Platform.select({
      ios: {
        alignItems: 'center',
        justifyContent: 'center',
      },
      android: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
      },
    }),
  },
  searchHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        paddingVertical: 5,
        height: '100%',
      },
      android: {
        paddingVertical: 10,
        height: '100%',
      },
    }),
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
