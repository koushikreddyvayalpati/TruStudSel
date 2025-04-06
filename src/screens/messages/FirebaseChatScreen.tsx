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
  
  // States
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  
  // Refs
  const flatListRef = useRef<FlatList<Message>>(null);
  const messageSubscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  
  // Subscribe to new messages
  const subscribeToNewMessages = useCallback((conversationId: string) => {
    const subscription = subscribeToMessages(conversationId, (updatedMessages) => {
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
        
        // Create or get existing conversation
        if (!recipientEmail) {
          Alert.alert('Error', 'Recipient email is required.');
          navigation.goBack();
          return;
        }
        
        const conversation = await getOrCreateConversation(
          recipientEmail,
          recipientName || recipientEmail
        );
        
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
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Message item renderer
  const renderMessage = ({ item }: { item: Message }) => {
    const isCurrentUser = item.senderId === currentUserEmail;
    
    return (
      <View style={[
        styles.messageBubble,
        isCurrentUser ? styles.userBubble : styles.otherBubble
      ]}>
        <Text style={styles.senderName}>
          {isCurrentUser ? 'You' : item.senderName || recipientName || 'User'}
        </Text>
        <Text style={styles.messageText}>{item.content}</Text>
        <Text style={styles.timeText}>{formatMessageTime(item.createdAt)}</Text>
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
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{recipientName || recipientEmail}</Text>
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
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
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
});

export default FirebaseChatScreen; 