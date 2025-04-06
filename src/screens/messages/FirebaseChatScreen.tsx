import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainStackParamList } from '../../types/navigation.types';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  getCurrentUser,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  subscribeToMessages
} from '../../services/firebaseChatService';
import { Message } from '../../types/chat.types';

// Define route params type
type FirebaseChatScreenRouteProp = RouteProp<MainStackParamList, 'FirebaseChatScreen'>;
type FirebaseChatScreenNavigationProp = StackNavigationProp<MainStackParamList, 'FirebaseChatScreen'>;

const FirebaseChatScreen = () => {
  const navigation = useNavigation<FirebaseChatScreenNavigationProp>();
  const route = useRoute<FirebaseChatScreenRouteProp>();
  
  // Get parameters from navigation
  const { recipientEmail, recipientName } = route.params || {};
  
  // Log route params to debug name issue
  console.log('[FirebaseChatScreen] Route params:', {
    recipientEmail,
    recipientName
  });
  
  // Format the recipient name consistently
  const getFormattedRecipientName = useCallback(() => {
    if (!recipientEmail) return recipientName || 'Chat';
    
    // If we have a proper name that's not just the email, use it
    if (recipientName && 
        recipientName !== recipientEmail && 
        recipientName !== recipientEmail.split('@')[0]) {
      return recipientName;
    }
    
    // Format email to show just the username part
    if (recipientEmail.includes('@')) {
      // Extract just the username part of the email
      const username = recipientEmail.split('@')[0];
      // Convert to proper case (first letter uppercase)
      return username.charAt(0).toUpperCase() + username.slice(1);
    }
    
    return recipientName || recipientEmail;
  }, [recipientEmail, recipientName]);
  
  // Calculate the proper display name once
  const displayName = getFormattedRecipientName();
  
  // Log the display name being used
  console.log('[FirebaseChatScreen] Using display name:', displayName);
  
  // States
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [otherUserName, setOtherUserName] = useState<string>('');
  
  // Refs
  const flatListRef = useRef<FlatList<Message>>(null);
  const messageSubscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  
  // Subscribe to new messages
  const subscribeToNewMessages = useCallback((conversationId: string) => {
    const subscription = subscribeToMessages(conversationId, (updatedMessages) => {
      console.log('[FirebaseChatScreen] Received messages update:', 
        updatedMessages.map(msg => ({
          id: msg.id.substring(0, 8),
          content: msg.content.substring(0, 15) + (msg.content.length > 15 ? '...' : ''),
          time: new Date(msg.createdAt).toLocaleString(),
          timestamp: msg.createdAt
        }))
      );
      
      setMessages(updatedMessages);
      // Scroll to bottom on new messages
      setTimeout(() => {
        if (flatListRef.current && updatedMessages.length > 0) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    });
    
    messageSubscriptionRef.current = subscription;
  }, []);
  
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

        // Format recipient name (other user)
        let otherUserFormattedName = '';
        if (recipientEmail.includes('@')) {
          const username = recipientEmail.split('@')[0];
          otherUserFormattedName = username.charAt(0).toUpperCase() + username.slice(1);
        } else {
          otherUserFormattedName = recipientName || recipientEmail;
        }
        
        // Set the properly formatted name for the other user
        setOtherUserName(otherUserFormattedName);
        
        console.log('[FirebaseChatScreen] Users in conversation:', {
          currentUser: formattedCurrentUserName,
          otherUser: otherUserFormattedName
        });
        
        // Use the otherUserFormattedName when creating the conversation
        const conversation = await getOrCreateConversation(
          recipientEmail,
          otherUserFormattedName
        );
        
        // Check for user-specific name mapping in the conversation
        const nameKey = `name_${user.email.replace(/[.@]/g, '_')}`;
        if (conversation[nameKey]) {
          console.log(`[FirebaseChatScreen] Found user-specific name mapping: ${nameKey} = ${conversation[nameKey]}`);
          setOtherUserName(conversation[nameKey]);
        }
        
        setConversationId(conversation.id);
        
        // Load initial messages
        const initialMessages = await getMessages(conversation.id);
        setMessages(initialMessages);
        
        // Subscribe to new messages
        subscribeToNewMessages(conversation.id);
        
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
  }, [recipientEmail, recipientName, navigation, subscribeToNewMessages]);
  
  // Send a message
  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || !conversationId) return;
    
    try {
      await sendMessage(conversationId, inputText.trim());
      setInputText('');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  }, [inputText, conversationId]);
  
  // Format message time
  const formatMessageTime = (dateString: string) => {
    try {
      // Parse the date from string
      const date = new Date(dateString);
      const now = new Date();
      
      // Check if valid date
      if (isNaN(date.getTime())) {
        console.warn('[FirebaseChatScreen] Invalid date:', dateString);
        return now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      }

      // Correct date if it's in the future (in this case, looks like 2025)
      // This could be due to time zone issues in Firebase or client-side
      if (date > now) {
        console.warn('[FirebaseChatScreen] Future date corrected:', dateString);
        // Calculate how many hours ago (based on current time)
        const hoursInMilliseconds = 7 * 60 * 60 * 1000; // 7 hours in ms
        const correctedDate = new Date(now.getTime() - hoursInMilliseconds);
        
        // Return the corrected time
        return correctedDate.toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }
      
      // If date is valid and not in the future, return formatted time
      return date.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('[FirebaseChatScreen] Error formatting message time:', error, dateString);
      return '';
    }
  };
  
  // Message item renderer
  const renderMessage = ({ item, index }: { item: Message, index: number }) => {
    const isCurrentUser = item.senderId === currentUserEmail;
    
    // Check if we need to show a date header
    const showDateHeader = index === 0 || 
      !isSameDay(new Date(item.createdAt), new Date(messages[index - 1].createdAt));
    
    // Create a unique key for this message that includes the timestamp
    const messageKey = `${item.id}_${item.createdAt}_${index}`;
    
    // Debug log the message timestamp for troubleshooting
    console.log(`[FirebaseChatScreen] Rendering message ${index}:`, {
      id: item.id,
      content: item.content?.substring(0, 20),
      createdAt: item.createdAt,
      parsedDate: new Date(item.createdAt).toString()
    });
    
    return (
      <View key={messageKey}>
        {showDateHeader && (
          <View style={styles.dateHeaderContainer}>
            <Text style={styles.dateHeaderText}>
              {formatMessageDate(item.createdAt)}
            </Text>
          </View>
        )}
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.userBubble : styles.otherBubble
        ]}>
          <Text style={styles.senderName}>
            {isCurrentUser ? currentUserName || 'You' : otherUserName || item.senderName || 'User'}
          </Text>
          <Text style={styles.messageText}>{item.content}</Text>
          <Text style={styles.timeText}>{formatMessageTime(item.createdAt)}</Text>
        </View>
      </View>
    );
  };
  
  // Helper to check if two dates are the same day
  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };
  
  // Format just the date part for the header
  const formatMessageDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      
      // Debug info
      console.log('[FirebaseChatScreen] Formatting date:', {
        dateString,
        dateObject: date.toString(), 
        timestamp: date.getTime()
      });
      
      // Check if valid date
      if (isNaN(date.getTime())) {
        console.warn('[FirebaseChatScreen] Invalid date in header:', dateString);
        return 'Today'; // Default to today
      }
      
      // Correct date if it's in the future
      let correctedDate = new Date(date);
      if (date > now) {
        console.warn('[FirebaseChatScreen] Future date corrected in header:', dateString);
        // Calculate how many hours ago (based on current time)
        const hoursInMilliseconds = 7 * 60 * 60 * 1000; // 7 hours in ms
        correctedDate = new Date(now.getTime() - hoursInMilliseconds);
      }
      
      // Check if it's today
      const isToday = isSameDay(correctedDate, now);
      
      // Check if it's yesterday
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const isYesterday = isSameDay(correctedDate, yesterday);
      
      // Return appropriate format based on when the message was sent
      if (isToday) {
        return 'Today';
      } else if (isYesterday) {
        return 'Yesterday';
      } else {
        // Format date as Month Day, Year
        return correctedDate.toLocaleDateString([], {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
      }
    } catch (error) {
      console.error('[FirebaseChatScreen] Error formatting message date:', error, dateString);
      return 'Today'; // Default to today
    }
  };
  
  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffb300" />
        <Text style={styles.loadingText}>Loading conversation...</Text>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{otherUserName || displayName}</Text>
        <TouchableOpacity 
          style={styles.profileButton}
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
          <Ionicons name="person" size={20} color="#000" />
        </TouchableOpacity>
      </View>
      
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => `${item.id}_${item.createdAt}`}
        contentContainerStyle={styles.messageList}
        initialNumToRender={20}
        maxToRenderPerBatch={15}
        windowSize={10}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No messages yet. Send a message to start the conversation!</Text>
          </View>
        }
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={24} color={inputText.trim() ? "#ffb300" : "#ccc"} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  profileButton: {
    width: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  messageList: {
    padding: 15,
    paddingBottom: 30,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 20,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  userBubble: {
    backgroundColor: '#ffb300',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 5,
  },
  otherBubble: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 5,
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 3,
    color: '#333',
  },
  messageText: {
    fontSize: 16,
    color: '#000',
  },
  timeText: {
    fontSize: 11,
    color: '#666',
    alignSelf: 'flex-end',
    marginTop: 4,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    backgroundColor: '#f1f1f1',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    color: '#000',
    maxHeight: 100,
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 24,
  },
  dateHeaderContainer: {
    alignItems: 'center',
    marginVertical: 10,
    marginHorizontal: 16,
  },
  dateHeaderText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
});

export default FirebaseChatScreen; 