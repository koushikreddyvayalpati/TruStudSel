import React, { useState, useRef, useCallback, useEffect, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Keyboard,
  Animated,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import LinearGradient from 'react-native-linear-gradient';
import { MainStackParamList } from '../../types/navigation.types';
import { getMessages, sendMessage, subscribeToMessages, updateMessageStatus, getCurrentUser, getOrCreateConversation } from '../../services/chatService';
import { Message, MessageStatus, Conversation } from '../../types/chat.types';
import { format, isToday, isYesterday } from 'date-fns';

// Define proper navigation type for MessageScreen
type MessageScreenNavigationProp = StackNavigationProp<MainStackParamList, 'MessageScreen'>;

// Define route params type
type MessageScreenRouteParams = {
  conversationId: string;
  recipientName: string;
  recipientId?: string;
  recipientUserId?: string; // Add this for user ID when available
  productId?: string;
  productName?: string;
};

// Use the params type with RouteProp
type MessageScreenRouteProp = RouteProp<{ MessageScreen: MessageScreenRouteParams }, 'MessageScreen'>;

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Add a Message Item component for optimized rendering
const MessageItem = memo(({ 
  item, 
  index, 
  messages, 
  currentUserId, 
  formatMessageTime,
  formatDateHeader,
  isDateEqual,
  recipientInitials
}: { 
  item: Message, 
  index: number,
  messages: Message[],
  currentUserId: string | null,
  formatMessageTime: (dateString: string) => string,
  formatDateHeader: (dateString: string) => string,
  isDateEqual: (date1: Date, date2: Date) => boolean,
  recipientInitials: string
}) => {
  const isUser = currentUserId === item.senderId;
  const showDate = index === 0 || 
    !isDateEqual(new Date(item.createdAt), new Date(messages[index - 1].createdAt));
  
  return (
    <View style={styles.messageWrapper}>
      {showDate && (
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>{formatDateHeader(item.createdAt)}</Text>
        </View>
      )}
      
      <View style={[
        styles.messageRow,
        isUser ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }
      ]}>
        {!isUser && (
          <View style={{
            marginRight: 8,
            alignSelf: 'flex-end',
            marginBottom: 2
          }}>
            <View style={styles.recipientInitialsContainer}>
              <Text style={styles.avatarText}>{recipientInitials}</Text>
            </View>
          </View>
        )}
        
        <View style={[
          { maxWidth: '65%' }
        ]}>
          <View style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.otherBubble
          ]}>
            <Text style={[
              styles.messageText,
              isUser ? styles.userText : styles.otherText,
            ]}>
              {item.content}
            </Text>
            
            <View style={styles.messageFooter}>
              <Text style={[
                styles.timeText,
                isUser ? styles.userTimeText : styles.otherTimeText
              ]}>
                {formatMessageTime(item.createdAt)}
              </Text>
              
              {isUser && item.status && (
                <View style={styles.statusContainer}>
                  {item.status === MessageStatus.SENT && 
                    <Ionicons name="checkmark" size={14} color="rgba(255, 255, 255, 0.7)" />}
                  {item.status === MessageStatus.DELIVERED && 
                    <Ionicons name="checkmark-done" size={14} color="rgba(255, 255, 255, 0.7)" />}
                  {item.status === MessageStatus.READ && 
                    <Ionicons name="checkmark-done" size={14} color="#fff" />}
                </View>
              )}
            </View>
          </View>
        </View>
        
        {isUser && (
          <View style={{
            marginLeft: 8,
            alignSelf: 'flex-end'
          }}>
            <View style={styles.userInitialsContainer}>
              <Text style={styles.avatarText}>KR</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
});

const MessageScreen = () => {
  const navigation = useNavigation<MessageScreenNavigationProp>();
  const route = useRoute<MessageScreenRouteProp>();
  const insets = useSafeAreaInsets();
  
  // Get parameters from navigation
  const { conversationId: routeConversationId, recipientName, recipientId } = route.params || {};
  
  // State for messages and input
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [actualConversationId, setActualConversationId] = useState<string | null>(
    routeConversationId !== 'new' ? routeConversationId : null
  );
  const [_conversation, setConversation] = useState<Conversation | null>(null);
  
  // Refs
  const flatListRef = useRef<FlatList<Message>>(null);
  const inputRef = useRef<TextInput>(null);
  const messageSubscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  
  // Animation refs for header only
  const headerHeightJS = useRef(new Animated.Value(60)).current; // JS-driven for layout
  const headerOpacityNative = useRef(new Animated.Value(1)).current; // Native-driven for opacity
  
  // State for recipient initials (for avatar)
  const [recipientInitials, setRecipientInitials] = useState('');
  const [_userInitials, setUserInitials] = useState('');
  
  // Function to scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages.length]);
  
  // Render Avatar Component
  const renderAvatar = useCallback((initials: string, isUser = false) => {
    const colors = isUser 
      ? ['#2D2D2D', '#000000'] // Black gradient for user
      : ['#f7b305', '#f9a825']; // Gold gradient for recipient
    
    return (
      <View style={styles.avatarShadowContainer}>
        <LinearGradient
          colors={colors}
          style={styles.avatarContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </LinearGradient>
      </View>
    );
  }, []);
  
  // Format message time
  const formatMessageTime = useCallback((dateString: string) => {
    try {
      const date = new Date(dateString);
      
      if (isToday(date)) {
        return format(date, 'h:mm a');
      } else if (isYesterday(date)) {
        return 'Yesterday, ' + format(date, 'h:mm a');
      } else {
        return format(date, 'MMM d, h:mm a');
      }
    } catch (error) {
      return dateString;
    }
  }, []);
  
  // Use useMemo for static values to prevent unnecessary rerenders
  const isDateEqual = useMemo(() => {
    return (date1: Date, date2: Date) => {
      return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
      );
    };
  }, []);
  
  // Format date header with useMemo
  const formatDateHeader = useMemo(() => {
    return (dateString: string) => {
      try {
        const date = new Date(dateString);
        
        if (isToday(date)) {
          return 'Today';
        } else if (isYesterday(date)) {
          return 'Yesterday';
        } else {
          return format(date, 'MMMM d, yyyy');
        }
      } catch (error) {
        return dateString;
      }
    };
  }, []);
  
  // Enhanced message sending with animation
  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !actualConversationId) return;
    
    Keyboard.dismiss();
    
    // Clear input before sending to make UI feel more responsive
    const messageText = inputText.trim();
    setInputText('');
    
    // Show typing indicator briefly for visual feedback
    setIsLoading(true);
    
    // Apply layout animation for smooth UI updates
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    try {
      // Send message
      await sendMessage(actualConversationId, messageText);
      setError(null);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
      // Restore input text if sending failed
      setInputText(messageText);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, actualConversationId]);
  
  // Effect to get current user
  useEffect(() => {
    const loadUser = async () => {
      const user = await getCurrentUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    
    loadUser();
  }, []);
  
  // Effect to handle new conversation creation
  useEffect(() => {
    // Only run this if we need to create a new conversation
    if (routeConversationId === 'new' && recipientId && recipientName && currentUserId) {
      const createNewConversation = async () => {
        try {
          console.log('[MessageScreen] Creating new conversation:', {
            recipientName,
            recipientId,
            currentUserId
          });
          
          // Check if recipientId is an email and try to find the user ID
          let effectiveRecipientId = recipientId;
          if (recipientId.includes('@')) {
            // This is probably an email, we should try to find the actual user ID if available
            console.log('[MessageScreen] Recipient ID appears to be an email, trying to map to user ID');
            
            try {
              // You could also check the route params to see if user ID was provided
              if (route.params.recipientUserId) {
                effectiveRecipientId = route.params.recipientUserId;
                console.log('[MessageScreen] Found recipient user ID in params:', effectiveRecipientId);
              } else {
                console.log('[MessageScreen] No user ID mapping available, using email as ID');
              }
            } catch (err) {
              console.warn('[MessageScreen] Error looking up user ID from email:', err);
            }
          }
          
          const newConversation = await getOrCreateConversation(
            effectiveRecipientId,
            recipientName
          );
          
          console.log('[MessageScreen] New conversation created:', {
            id: newConversation.id,
            participants: newConversation.participants,
            name: newConversation.name
          });
          
          setActualConversationId(newConversation.id);
          setConversation(newConversation);
          setError(null);
        } catch (err) {
          console.error('[MessageScreen] Error creating conversation:', err);
          setError('Failed to create conversation. Please try again.');
        }
      };
      
      createNewConversation();
    }
  }, [routeConversationId, recipientId, recipientName, currentUserId, route.params]);
  
  // Effect to load conversation messages
  useEffect(() => {
    if (!actualConversationId) return;
    
    const loadMessages = async () => {
      try {
        console.log('[MessageScreen] Loading messages for conversation:', actualConversationId);
        setIsLoading(true);
        const fetchedMessages = await getMessages(actualConversationId);
        console.log('[MessageScreen] Messages loaded:', {
          count: fetchedMessages.length,
          messages: fetchedMessages.map(m => ({
            id: m.id,
            senderId: m.senderId,
            content: m.content
          }))
        });
        setMessages(fetchedMessages);
        setError(null);
      } catch (err) {
        console.error('[MessageScreen] Error loading messages:', err);
        setError('Failed to load messages. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadMessages();
  }, [actualConversationId]);
  
  // Set up real-time subscription
  useEffect(() => {
    if (!actualConversationId) return;
    
    // Subscribe to new messages
    const subscription = subscribeToMessages(actualConversationId, (newMessage) => {
      setMessages(prevMessages => {
        // Check if we already have this message
        const exists = prevMessages.some(msg => msg.id === newMessage.id);
        if (exists) return prevMessages;
        
        // If it's from the other user, mark it as read
        if (currentUserId && newMessage.senderId !== currentUserId) {
          updateMessageStatus(newMessage.id, actualConversationId, MessageStatus.READ);
        }
        
        return [...prevMessages, newMessage];
      });
      
      // Show typing indicator and then hide it
      setIsTyping(false);
    });
    
    messageSubscriptionRef.current = subscription;
    
    // Clean up subscription on unmount
    return () => {
      if (messageSubscriptionRef.current) {
        messageSubscriptionRef.current.unsubscribe();
      }
    };
  }, [actualConversationId, currentUserId]);
  
  // Effect to scroll to bottom on load and when new messages arrive
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [messages, scrollToBottom]);
  
  // Determine initials for avatar display
  useEffect(() => {
    if (recipientName) {
      const nameArr = recipientName.split(' ');
      const initials = nameArr.map((name: string) => name.charAt(0).toUpperCase()).slice(0, 2).join('');
      setRecipientInitials(initials);
    }
    
    // Get current user's initials
    const getUserInitials = async () => {
      const user = await getCurrentUser();
      if (user && user.name) {
        const nameArr = user.name.split(' ');
        const initials = nameArr.map((name: string) => name.charAt(0).toUpperCase()).slice(0, 2).join('');
        setUserInitials(initials);
      } else {
        setUserInitials('ME');
      }
    };
    
    getUserInitials();
  }, [recipientName]);
  
  // Render item function for FlatList
  const renderItem = useCallback(({ item, index }: { item: Message; index: number }) => {
    return (
      <MessageItem 
        item={item}
        index={index}
        messages={messages}
        currentUserId={currentUserId}
        formatMessageTime={formatMessageTime}
        formatDateHeader={formatDateHeader}
        isDateEqual={isDateEqual}
        recipientInitials={recipientInitials}
      />
    );
  }, [messages, currentUserId, formatMessageTime, recipientInitials, formatDateHeader, isDateEqual]);
  
  // Add optimized window size parameters for FlatList
  const getItemLayout = useCallback((data: ArrayLike<Message> | null | undefined, index: number) => ({
    length: 80, // approximate height of a message
    offset: 80 * index,
    index,
  }), []);
  
  // Update the keyboardAvoidingView to be more responsive
  const keyboardVerticalOffset = useMemo(() => Platform.OS === 'ios' ? 90 : 0, []);
  
  // Enhanced typing indicator with smoother animation
  const renderTypingIndicator = useCallback(() => {
    if (!isTyping) return null;
    
    return (
      <View style={styles.typingContainer}>
        <View style={styles.typingBubble}>
          <View style={styles.typingDot} />
          <View style={styles.typingDot} />
          <View style={styles.typingDot} />
        </View>
      </View>
    );
  }, [isTyping]);
  
  // Enhanced error message without animation
  const renderErrorMessage = useCallback(() => {
    if (!error) return null;
    
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          onPress={() => setError(null)}
        >
          <Text style={styles.dismissText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    );
  }, [error]);
  
  // Enhanced loading state
  if ((isLoading && messages.length === 0) || (routeConversationId === 'new' && !actualConversationId)) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={{ height: insets.top, backgroundColor: '#fff' }} />
        
        <Animated.View style={[
          styles.header,
          { 
            height: headerHeightJS,
            opacity: headerOpacityNative 
          }
        ]}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <MaterialIcons name="arrow-back-ios-new" size={22} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            {renderAvatar(recipientInitials)}
            <Text style={styles.headerTitle}>{recipientName}</Text>
          </View>
        </Animated.View>
        
        <View style={styles.loadingContainer}>
          <MaterialIcons name="chat" size={48} color="#f7b305" />
          <Text style={styles.loadingText}>
            {routeConversationId === 'new' && !actualConversationId 
              ? 'Setting up conversation...' 
              : 'Loading messages...'}
          </Text>
        </View>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={{ height: insets.top, backgroundColor: '#fff' }} />
      
      {/* Header with animation */}
      <Animated.View 
        style={[
          styles.header,
          { 
            height: headerHeightJS,
            opacity: headerOpacityNative 
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => {
            // Simple navigation without animation
            navigation.goBack();
          }}
          testID="back-button"
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          accessibilityLabel="Back"
          accessibilityRole="button"
        >
          <MaterialIcons name="arrow-back-ios-new" size={22} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          {renderAvatar(recipientInitials)}
          <Text style={styles.headerTitle} numberOfLines={1}>
            {recipientName || 'Chat'}
          </Text>
        </View>
      </Animated.View>
      
      {renderErrorMessage()}
      
      {/* Messages */}
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <LinearGradient
          colors={['#f8f8f8', '#f0f0f0']}
          style={styles.messagesBackground}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={[
              styles.messagesList,
              { paddingBottom: 30, paddingTop: 10 }
            ]}
            showsVerticalScrollIndicator={false}
            inverted={false}
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={true}
            getItemLayout={getItemLayout}
            updateCellsBatchingPeriod={50}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <FontAwesome name="comments-o" size={50} color="#ccc" style={{ marginBottom: 20 }} />
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySubtitle}>Send a message to start the conversation</Text>
              </View>
            }
            onEndReached={scrollToBottom}
            onEndReachedThreshold={0.1}
          />
          
          {renderTypingIndicator()}
        </LinearGradient>
        
        {/* Input Bar without animation */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <View style={styles.inputBackground}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="Type a message..."
                placeholderTextColor="#999"
                value={inputText}
                onChangeText={text => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setInputText(text);
                }}
                multiline
                maxLength={1000}
                accessibilityLabel="Message input"
                returnKeyType="send"
                onSubmitEditing={inputText.trim() ? handleSend : undefined}
              />
            </View>
            
            <View style={{
              position: 'absolute',
              right: 10,
              bottom: 5
            }}>
              <TouchableOpacity 
                style={[
                  styles.sendButton,
                  !inputText.trim() && styles.sendButtonDisabled
                ]}
                onPress={handleSend}
                disabled={!inputText.trim()}
                accessibilityLabel="Send message"
                accessibilityRole="button"
              >
                <Ionicons 
                  name="send" 
                  size={20} 
                  color={inputText.trim() ? "#FFFFFF" : "#CCCCCC"} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

// Updated styles to fix shadow issues
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  messagesBackground: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingLeft: 8,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: 'rgba(0, 0, 0, 0.15)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 100,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 4,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    flex: 1,
  },
  avatarShadowContainer: {
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 4,
    borderRadius: 16,
    backgroundColor: '#808080', // Fallback color
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  keyboardAvoidView: {
    flex: 1,
  },
  messagesList: {
    padding: 15,
    paddingBottom: 20,
  },
  messageWrapper: {
    marginBottom: 4,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  dateContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateText: {
    fontSize: 13,
    color: '#505050',
    backgroundColor: '#e8e8e8',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    overflow: 'hidden',
    fontWeight: '500',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 1,
    elevation: 1,
  },
  messageBubble: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 1,
    elevation: 1,
  },
  userBubble: {
    backgroundColor: '#ffb300',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 6,
    shadowColor: 'rgba(255, 179, 0, 0.2)',
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 2,
  },
  userText: {
    color: '#000',
  },
  otherText: {
    color: '#000',
  },
  timeText: {
    fontSize: 11,
    marginRight: 4,
  },
  userTimeText: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  otherTimeText: {
    color: '#999',
  },
  statusContainer: {
    marginLeft: 2,
  },
  userInitialsContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 3,
  },
  recipientInitialsContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7b305',
    shadowColor: 'rgba(247, 179, 5, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 3,
  },
  inputContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 10,
    marginTop: -8,
  },
  inputWrapper: {
    position: 'relative',
  },
  inputBackground: {
    backgroundColor: '#fff',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  input: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingRight: 50,
    minHeight: 46,
    maxHeight: 120,
    fontSize: 16,
    borderRadius: 25,
    color: '#333',
  },
  sendButton: {
    backgroundColor: '#ffb300',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(255, 179, 0, 0.4)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#f0f0f0',
    shadowOpacity: 0,
    elevation: 0,
  },
  typingContainer: {
    paddingLeft: 15,
    marginBottom: 10,
  },
  typingBubble: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '60%',
    shadowColor: 'rgba(0, 0, 0, 0.12)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#888',
    marginHorizontal: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#888',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#888',
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: 'rgba(211, 47, 47, 0.15)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1, 
    shadowRadius: 5,
    elevation: 4,
    zIndex: 5,
  },
  errorText: {
    color: '#d32f2f',
    flex: 1,
    fontSize: 14,
  },
  dismissText: {
    color: '#d32f2f',
    fontWeight: 'bold',
    marginLeft: 10,
    fontSize: 14,
  }
});

export default MessageScreen; 