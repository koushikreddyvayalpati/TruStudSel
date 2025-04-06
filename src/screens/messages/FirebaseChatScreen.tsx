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
  Alert
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
import { Message, ReceiptStatus } from '../../types/chat.types';
import { formatMessageTime, formatMessageDate, isSameDay } from '../../utils/timestamp';

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
  const [_currentUserName, setCurrentUserName] = useState<string>('');
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
  
  // Render a message bubble
  const renderMessage = ({ item }: { item: Message }) => {
    const isCurrentUser = item.senderId === currentUserEmail;
    const messageTime = formatMessageTime(item.createdAt);
    
    return (
      <View
        style={[
          styles.messageBubbleContainer,
          isCurrentUser ? styles.sentMessageContainer : styles.receivedMessageContainer,
        ]}
      >
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
    );
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
          <Icon name="arrow-back" size={24} color="#000" />
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
          <Icon name="person" size={20} color="#000" />
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
            <Icon name="send" size={24} color={inputText.trim() ? "#ffb300" : "#ccc"} />
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
  messageBubbleContainer: {
    maxWidth: '80%',
    padding: 12,
    marginVertical: 5,
    marginHorizontal: 10,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  messageBubble: {
    padding: 8,
    borderRadius: 15,
  },
  sentMessageContainer: {
    alignSelf: 'flex-end',
  },
  receivedMessageContainer: {
    alignSelf: 'flex-start',
  },
  sentMessage: {
    backgroundColor: '#ffb300',
    borderBottomRightRadius: 5,
  },
  receivedMessage: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 5,
  },
  messageText: {
    fontSize: 16,
    color: '#000',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    color: '#888',
    marginRight: 4,
  },
  receiptStatus: {
    marginLeft: 2,
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