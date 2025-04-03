import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Keyboard,
  Animated,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
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

const MessageScreen = () => {
  const navigation = useNavigation<MessageScreenNavigationProp>();
  const route = useRoute<MessageScreenRouteProp>();
  
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
  
  // Animation values
  const typingIndicatorOpacity = useRef(new Animated.Value(0)).current;
  const typingDotScale = useRef(new Animated.Value(1)).current;

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
              // Use Auth.adminGetUser or a similar function if available in your app
              // For this example, we'll skip ahead and use the email as ID
              
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
      Animated.timing(typingIndicatorOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
    
    messageSubscriptionRef.current = subscription;
    
    // Clean up subscription on unmount
    return () => {
      if (messageSubscriptionRef.current) {
        messageSubscriptionRef.current.unsubscribe();
      }
    };
  }, [actualConversationId, currentUserId, typingIndicatorOpacity]);
  
  // Function to scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages.length]);
  
  // Effect to scroll to bottom on load and when new messages arrive
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [messages, scrollToBottom]);
  
  // Animate typing dots
  useEffect(() => {
    if (isTyping) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(typingDotScale, {
            toValue: 1.3,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(typingDotScale, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      typingDotScale.setValue(1);
    }
    
    return () => {
      typingDotScale.setValue(1);
    };
  }, [isTyping, typingDotScale]);

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

  // Handle sending a message
  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !actualConversationId) return;
    
    Keyboard.dismiss();
    
    // Clear input before sending to make UI feel more responsive
    const messageText = inputText.trim();
    setInputText('');
    
    // Show typing indicator briefly
    setIsLoading(true);
    
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
  
  // Render individual message
  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
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
          styles.messageBubble,
          isUser ? styles.userBubble : styles.otherBubble,
        ]}>
          <Text style={[
            styles.messageText,
            isUser ? styles.userText : styles.otherText,
          ]}>
            {item.content}
          </Text>
          
          <Text style={styles.timeText}>{formatMessageTime(item.createdAt)}</Text>
          
          {isUser && item.status && (
            <View style={styles.statusContainer}>
              {item.status === MessageStatus.SENT && <Ionicons name="checkmark" size={14} color="#8E8E8E" />}
              {item.status === MessageStatus.DELIVERED && <Ionicons name="checkmark-done" size={14} color="#8E8E8E" />}
              {item.status === MessageStatus.READ && <Ionicons name="checkmark-done" size={14} color="#4fc3f7" />}
            </View>
          )}
        </View>
      </View>
    );
  }, [messages, currentUserId, formatMessageTime]);
  
  // Helper to check if two dates are the same day
  const isDateEqual = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };
  
  // Format date header
  const formatDateHeader = (dateString: string) => {
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
  
  // Render typing indicator
  const renderTypingIndicator = useCallback(() => {
    if (!isTyping) return null;
    
    return (
      <Animated.View style={[styles.typingContainer, { opacity: typingIndicatorOpacity }]}>
        <View style={styles.typingBubble}>
          <View style={styles.typingDot} />
          <Animated.View style={[
            styles.typingDot, 
            { transform: [{ scale: typingDotScale }] }
          ]} />
          <View style={styles.typingDot} />
        </View>
      </Animated.View>
    );
  }, [isTyping, typingIndicatorOpacity, typingDotScale]);
  
  // Render error message
  const renderErrorMessage = useCallback(() => {
    if (!error) return null;
    
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => setError(null)}>
          <Text style={styles.dismissText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    );
  }, [error]);
  
  // Loading state
  if ((isLoading && messages.length === 0) || (routeConversationId === 'new' && !actualConversationId)) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f7b305" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back-ios-new" size={22} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{recipientName}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f7b305" />
          <Text style={styles.loadingText}>
            {routeConversationId === 'new' && !actualConversationId 
              ? 'Setting up conversation...' 
              : 'Loading messages...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7b305" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          testID="back-button"
        >
          <MaterialIcons name="arrow-back-ios-new" size={22} color="#333" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle} numberOfLines={1}>
          {recipientName || 'Chat'}
        </Text>
      </View>
      
      {renderErrorMessage()}
      
      {/* Messages */}
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          inverted={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtitle}>Send a message to start the conversation</Text>
            </View>
          }
        />
        
        {renderTypingIndicator()}
        
        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />
          
          <TouchableOpacity 
            style={[
              styles.sendButton,
              !inputText.trim() && styles.sendButtonDisabled
            ]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color={inputText.trim() ? "#FFFFFF" : "#CCCCCC"} 
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
    backgroundColor: '#f5f5f5',
  },
  header: {
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    flex: 1,
  },
  keyboardAvoidView: {
    flex: 1,
  },
  messagesList: {
    padding: 10,
    paddingBottom: 20,
  },
  messageWrapper: {
    marginBottom: 8,
  },
  dateContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  dateText: {
    fontSize: 14,
    color: '#888',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    marginBottom: 2,
  },
  userBubble: {
    backgroundColor: '#DCF8C5',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    marginBottom: 4,
  },
  userText: {
    color: '#000',
  },
  otherText: {
    color: '#000',
  },
  timeText: {
    fontSize: 11,
    color: '#888',
    alignSelf: 'flex-end',
  },
  statusContainer: {
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    paddingRight: 42,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    position: 'absolute',
    right: 16,
    backgroundColor: '#f7b305',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#f0f0f0',
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
    marginTop: 10,
    color: '#888',
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#d32f2f',
    flex: 1,
  },
  dismissText: {
    color: '#d32f2f',
    fontWeight: 'bold',
    marginLeft: 10,
  }
});

export default MessageScreen; 