import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Animated,
  StatusBar,
  Dimensions,
  Keyboard
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { MainStackParamList } from '../../types/navigation.types';
import {
  getMessages,
  subscribeToMessages,
  sendMessage,
  getOrCreateConversation,
  getCurrentUser
} from '../../services/firebaseChatService';
import { Message, ReceiptStatus, MessageStatus } from '../../types/chat.types';
import { formatMessageTime, formatMessageDate, isSameDay } from '../../utils/timestamp';

// Define route params type
type FirebaseChatScreenRouteProp = RouteProp<MainStackParamList, 'FirebaseChatScreen'>;
type FirebaseChatScreenNavigationProp = StackNavigationProp<MainStackParamList, 'FirebaseChatScreen'>;

// Window dimensions for responsive sizing
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FirebaseChatScreen = () => {
  const navigation = useNavigation<FirebaseChatScreenNavigationProp>();
  const route = useRoute<FirebaseChatScreenRouteProp>();
  
  // Get parameters from navigation
  const { recipientEmail, recipientName } = route.params || {};
  
  // Format the recipient name consistently
  const getFormattedRecipientName = useCallback(() => {
    if (!recipientEmail) return recipientName || 'Chat';
    
    if (recipientName && 
        recipientName !== recipientEmail && 
        recipientName !== recipientEmail.split('@')[0]) {
      return recipientName;
    }
    
    if (recipientEmail.includes('@')) {
      const username = recipientEmail.split('@')[0];
      return username.charAt(0).toUpperCase() + username.slice(1);
    }
    
    return recipientName || recipientEmail;
  }, [recipientEmail, recipientName]);
  
  // Calculate the proper display name once
  const displayName = getFormattedRecipientName();
  
  // States
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [_currentUserName, setCurrentUserName] = useState<string>('');
  const [otherUserName, setOtherUserName] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [_keyboardVisible, setKeyboardVisible] = useState(false);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollButtonAnim = useRef(new Animated.Value(0)).current;
  
  // Refs
  const flatListRef = useRef<FlatList<Message>>(null);
  const messageSubscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const inputRef = useRef<TextInput>(null);
  
  // Generate avatar initials
  const getInitials = useCallback((name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, []);

  // Keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        // Scroll to bottom when keyboard appears
        setTimeout(() => {
          if (flatListRef.current && messages.length > 0) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [messages.length]);
  
  // Animate fade-in effect
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);
  
  // Subscribe to new messages
  const subscribeToNewMessages = useCallback((conversationId: string) => {
    const subscription = subscribeToMessages(conversationId, (updatedMessages) => {
      setMessages(updatedMessages);
      // Scroll to bottom on new messages if user is already at bottom
      if (updatedMessages.length > messages.length) {
        setTimeout(() => {
          if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
      }
    });
    
    messageSubscriptionRef.current = subscription;
  }, [messages.length]);
  
  // Initialize chat
  useEffect(() => {
    const initializeChat = async () => {
      try {
        setIsLoading(true);
        
        // Get current user
        const user = await getCurrentUser();
        if (!user || !user.email) {
          Alert.alert('Error', 'You must be logged in to chat.');
          navigation.goBack();
          return;
        }
        
        setCurrentUserEmail(user.email);
        
        // Format current user's name
        const formattedCurrentUserName = user.name || 
          (user.email.includes('@') ? 
            user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) : 
            user.email);
        setCurrentUserName(formattedCurrentUserName);
        
        // Create or get existing conversation
        if (!recipientEmail) {
          Alert.alert('Error', 'Recipient email is required.');
          navigation.goBack();
          return;
        }

        // Format recipient name
        let otherUserFormattedName = '';
        if (recipientEmail.includes('@')) {
          const username = recipientEmail.split('@')[0];
          otherUserFormattedName = username.charAt(0).toUpperCase() + username.slice(1);
        } else {
          otherUserFormattedName = recipientName || recipientEmail;
        }
        
        // Set the properly formatted name for the other user
        setOtherUserName(otherUserFormattedName);
        
        // Use the otherUserFormattedName when creating the conversation
        const conversation = await getOrCreateConversation(
          recipientEmail,
          displayName // Use our consistently formatted display name
        );
        
        // Check for user-specific name mapping in the conversation
        const nameKey = `name_${user.email.replace(/[.@]/g, '_')}`;
        if (conversation[nameKey]) {
          setOtherUserName(conversation[nameKey]);
        }
        
        setConversationId(conversation.id);
        
        // Load initial messages
        const initialMessages = await getMessages(conversation.id);
        setMessages(initialMessages);
        
        // Subscribe to new messages
        subscribeToNewMessages(conversation.id);
        
        // Apply fade-in animation
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
        
      } catch (error) {
        console.error('Error initializing chat:', error);
        Alert.alert('Error', 'Failed to initialize chat. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeChat();
    
    // Cleanup
    return () => {
      if (messageSubscriptionRef.current) {
        messageSubscriptionRef.current.unsubscribe();
      }
    };
  }, [recipientEmail, recipientName, navigation, subscribeToNewMessages, displayName, fadeAnim]);
  
  // Send a message
  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || !conversationId) return;
    
    try {
      // Optimistic update - add message locally immediately
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        conversationId: conversationId,
        senderId: currentUserEmail || '',
        senderName: _currentUserName,
        content: inputText.trim(),
        status: MessageStatus.SENT,
        receiptStatus: ReceiptStatus.SENT,
        createdAt: new Date().toISOString(),
      };
      
      // Clear input before the async operation
      setInputText('');
      
      // Add temporary message to UI
      setMessages(prev => [...prev, tempMessage]);
      
      // Scroll to bottom
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 50);
      
      // Actually send the message
      await sendMessage(conversationId, inputText.trim());
      
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  }, [inputText, conversationId, currentUserEmail, _currentUserName]);
  
  // Handle scroll events
  const handleScroll = useCallback((event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const layoutHeight = event.nativeEvent.layoutMeasurement.height;
    
    // Show scroll button when not at bottom and have enough content
    const isAtBottom = offsetY >= contentHeight - layoutHeight - 100;
    const hasEnoughContent = contentHeight > layoutHeight * 1.5;
    
    if (!isAtBottom && hasEnoughContent && !showScrollButton) {
      setShowScrollButton(true);
      Animated.timing(scrollButtonAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else if ((isAtBottom || !hasEnoughContent) && showScrollButton) {
      Animated.timing(scrollButtonAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setShowScrollButton(false);
      });
    }
  }, [showScrollButton, scrollButtonAnim]);
  
  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, []);
  
  // Determine if we should show date header
  const shouldShowDateHeader = useCallback((index: number) => {
    if (index === 0) return true;
    
    const currentMessageDate = new Date(messages[index].createdAt);
    const previousMessageDate = new Date(messages[index - 1].createdAt);
    
    return !isSameDay(currentMessageDate, previousMessageDate);
  }, [messages]);
  
  // Render a message bubble
  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
    const isCurrentUser = item.senderId === currentUserEmail;
    const messageTime = formatMessageTime(item.createdAt);
    const showDateHeader = shouldShowDateHeader(index);
    
    return (
      <>
        {showDateHeader && (
          <View style={styles.dateHeaderContainer}>
            <Text style={styles.dateHeaderText}>
              {formatMessageDate(item.createdAt)}
            </Text>
          </View>
        )}
        <View
          style={[
            styles.messageBubbleContainer,
            isCurrentUser ? styles.sentMessageContainer : styles.receivedMessageContainer,
          ]}
        >
          {!isCurrentUser && (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getInitials(otherUserName || displayName)}
              </Text>
            </View>
          )}
          
          <View
            style={[
              styles.messageBubble,
              isCurrentUser ? styles.sentMessage : styles.receivedMessage,
            ]}
          >
            <Text style={styles.messageText}>{item.content}</Text>
            <View style={styles.messageFooter}>
              <Text style={styles.messageTime}>{messageTime}</Text>
              
              {isCurrentUser && (
                <View style={styles.receiptStatus}>
                  {item.receiptStatus === ReceiptStatus.READ ? (
                    <Icon name="checkmark-done" size={15} color="#4CAF50" />
                  ) : item.receiptStatus === ReceiptStatus.DELIVERED ? (
                    <Icon name="checkmark-done" size={15} color="#888" />
                  ) : (
                    <Icon name="checkmark" size={15} color="#888" />
                  )}
                </View>
              )}
            </View>
          </View>
        </View>
      </>
    );
  }, [currentUserEmail, otherUserName, displayName, getInitials, shouldShowDateHeader]);
  
  // Key extractor for FlatList
  const keyExtractor = useCallback((item: Message) => item.id, []);
  
  // Get item layout for FlatList optimization
  const getItemLayout = useCallback(
    (data: ArrayLike<Message> | null | undefined, index: number) => ({
      length: 80, // Approximate height of an item
      offset: 80 * index,
      index,
    }),
    []
  );
  
  // Loading screen
  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <ActivityIndicator size="large" color="#ffb300" />
        <Text style={styles.loadingText}>Loading conversation...</Text>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.headerCenter}
          activeOpacity={0.7}
          onPress={() => {
            try {
              // Navigate to user profile using the recipient email
              (navigation as any).navigate('Profile', { 
                sellerEmail: recipientEmail 
              });
            } catch (error) {
              console.error('Navigation error when viewing profile:', error);
            }
          }}
        >
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {getInitials(otherUserName || displayName)}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {otherUserName || displayName}
            </Text>
            {isTyping && (
              <Text style={styles.typingIndicator}>typing...</Text>
            )}
          </View>
        </TouchableOpacity>
        
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.profileButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => {
              try {
                // Navigate to user profile using the recipient email
                (navigation as any).navigate('Profile', { 
                  sellerEmail: recipientEmail 
                });
              } catch (error) {
                console.error('Navigation error when viewing profile:', error);
              }
            }}
          >
            {/* <Icon name="ellipsis-vertical" size={20} color="#000" /> */}
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Message List with optimized rendering */}
      <Animated.View style={[styles.messagesContainer, { opacity: fadeAnim }]}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.messageList}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={21}
          getItemLayout={getItemLayout}
          removeClippedSubviews={Platform.OS === 'android'}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="chatbubble-ellipses-outline" size={60} color="#ddd" />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>
                Start the conversation by sending a message
              </Text>
            </View>
          }
        />
        
        {/* Scroll to bottom button */}
        {showScrollButton && (
          <Animated.View 
            style={[
              styles.scrollToBottomButton, 
              { 
                opacity: scrollButtonAnim,
                transform: [{ 
                  scale: scrollButtonAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1]
                  }) 
                }]
              }
            ]}
          >
            <TouchableOpacity
              onPress={scrollToBottom}
              style={styles.scrollToBottomTouchable}
            >
              <Icon name="chevron-down" size={24} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
        )}
      </Animated.View>
      
      {/* Enhanced Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={inputText}
            onChangeText={(text) => {
              setInputText(text);
              // Simulate typing indicator
              if (text.length > 0 && !isTyping) {
                setIsTyping(true);
                // In a real app, you would send typing status to Firebase here
              } else if (text.length === 0 && isTyping) {
                setIsTyping(false);
                // In a real app, you would clear typing status in Firebase here
              }
            }}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            multiline
            maxLength={500}
            returnKeyType="default"
            blurOnSubmit={false}
          />
          <TouchableOpacity 
            style={[
              styles.sendButton, 
              !inputText.trim() && styles.sendButtonDisabled
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim()}
            activeOpacity={0.7}
          >
            <Icon 
              name="send" 
              size={24} 
              color={inputText.trim() ? "#ffb300" : "#ccc"} 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  // Enhanced header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 3,
  },
  headerLeft: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  backButton: {
    padding: 5,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  headerInfo: {
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginRight: 5,
  },
  typingIndicator: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  profileButton: {
    padding: 5,
  },
  // Message container
  messagesContainer: {
    flex: 1,
    position: 'relative',
  },
  messageList: {
    padding: 10,
    paddingBottom: 30,
    backgroundColor: '#fff',
  },
  // Enhanced message bubbles
  messageBubbleContainer: {
    flexDirection: 'row',
    marginVertical: 4,
    maxWidth: SCREEN_WIDTH * 0.85,
    alignItems: 'flex-end',
  },
  sentMessageContainer: {
    alignSelf: 'flex-end',
    marginLeft: 40,
  },
  receivedMessageContainer: {
    alignSelf: 'flex-start',
    marginRight: 40,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  messageBubble: {
    padding: 10,
    borderRadius: 18,
    maxWidth: '90%',
  },
  sentMessage: {
    backgroundColor: '#ffb300',
    borderBottomRightRadius: 4,
    marginLeft: 'auto',
  },
  receivedMessage: {
    backgroundColor: '#f8f8f8',
    borderBottomLeftRadius: 4,
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  messageText: {
    fontSize: 16,
    color: '#000',
    lineHeight: 22,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    color: 'rgba(0,0,0,0.5)',
    marginRight: 4,
  },
  receiptStatus: {
    marginLeft: 2,
  },
  // Better date headers
  dateHeaderContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateHeaderText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  // Enhanced input area
  keyboardAvoidingView: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 16,
    maxHeight: 100,
    color: '#000',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sendButtonDisabled: {
    opacity: 0.7,
    backgroundColor: '#f5f5f5',
  },
  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#888',
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 15,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
  // Scroll to bottom button
  scrollToBottomButton: {
    position: 'absolute',
    right: 15,
    bottom: 15,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffb300',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 5,
    zIndex: 10,
  },
  scrollToBottomTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FirebaseChatScreen; 