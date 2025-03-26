import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
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
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MainStackParamList } from '../../types/navigation.types';

interface MessageItem {
  id: string;
  time: string;
  text: string;
  sender: 'user' | 'other';
  status?: 'sent' | 'delivered' | 'read';
}

type MessageScreenRouteProp = RouteProp<MainStackParamList, 'MessageScreen'>;

const MessageScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<MessageScreenRouteProp>();
  
  // Get parameters from navigation
  const { recipientName } = route.params || {};
  const isOnline = useMemo(() => Math.random() > 0.5, []); // Randomly determine online status for demo
  
  // State for messages and input
  const [messages, setMessages] = useState<MessageItem[]>([
    { id: '1', time: 'Yesterday, 10:30 PM', text: 'Hey, are you still selling that calculus textbook?', sender: 'user', status: 'read' },
    { id: '2', time: 'Yesterday, 10:32 PM', text: 'Yes, it\'s still available! Are you interested?', sender: 'other' },
    { id: '3', time: 'Yesterday, 10:34 PM', text: 'Great! What condition is it in? And would you be willing to meet on campus?', sender: 'user', status: 'read' },
    { id: '4', time: 'Yesterday, 10:40 PM', text: 'It\'s in excellent condition, barely used. And yes, I can meet you on campus. How about tomorrow at the library?', sender: 'other' },
    { id: '5', time: 'Today, 8:15 AM', text: 'That works for me. What time were you thinking?', sender: 'user', status: 'read' },
    { id: '6', time: 'Today, 8:30 AM', text: 'How about 2pm? I\'ll be at the main entrance.', sender: 'other' },
    { id: '7', time: 'Today, 8:32 AM', text: 'Perfect, see you then!', sender: 'user', status: 'read' },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Refs
  const flatListRef = useRef<FlatList<MessageItem>>(null);
  const inputRef = useRef<TextInput>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Animation values
  const typingIndicatorOpacity = useRef(new Animated.Value(0)).current;
  const typingDotScale = useRef(new Animated.Value(1)).current;
  
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

  // Handle sending a message
  const handleSend = useCallback(() => {
    if (!inputText.trim()) return;
    
    Keyboard.dismiss();
    
    const newMessage: MessageItem = {
      id: Date.now().toString(),
      time: 'Just now',
      text: inputText.trim(),
      sender: 'user',
      status: 'sent',
    };
    
    setMessages(prevMessages => [...prevMessages, newMessage]);
    setInputText('');
    
    // Simulate typing indicator from other person
    setIsLoading(true);
    
    setTimeout(() => {
      setIsLoading(false);
      
      // Show typing indicator
      setIsTyping(true);
      Animated.timing(typingIndicatorOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      // After some time, add a reply
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        // Hide typing indicator
        setIsTyping(false);
        Animated.timing(typingIndicatorOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
        
        // Add simulated response
        const responses = [
          "I'll get back to you on that soon.",
          "Let me check and get back to you.",
          "Sounds good!",
          "Great, thanks!",
        ];
        
        const responseIndex = Math.floor(Math.random() * responses.length);
        
        const replyMessage: MessageItem = {
          id: (Date.now() + 1).toString(),
          time: 'Just now',
          text: responses[responseIndex],
          sender: 'other',
        };
        
        setMessages(prevMessages => [...prevMessages, replyMessage]);
      }, 1500 + Math.random() * 1500); // Random typing time between 1.5 and 3 seconds
    }, 1000);
  }, [inputText, typingIndicatorOpacity]);
  
  // Render individual message
  const renderMessage = useCallback(({ item, index }: { item: MessageItem; index: number }) => {
    const isUser = item.sender === 'user';
    const showTime = index === 0 || item.time.split(',')[0] !== messages[index - 1]?.time.split(',')[0];
    
    return (
      <View style={styles.messageWrapper}>
        {showTime && (
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{item.time.split(',')[0]}</Text>
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
            {item.text}
          </Text>
          
          <Text style={styles.timeText}>{item.time.includes(',') ? item.time.split(', ')[1] : item.time}</Text>
          
          {isUser && item.status && (
            <View style={styles.statusContainer}>
              {item.status === 'sent' && <Ionicons name="checkmark" size={14} color="#8E8E8E" />}
              {item.status === 'delivered' && <Ionicons name="checkmark-done" size={14} color="#8E8E8E" />}
              {item.status === 'read' && <Ionicons name="checkmark-done" size={14} color="#4fc3f7" />}
            </View>
          )}
        </View>
      </View>
    );
  }, [messages]);
  
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
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{recipientName || 'Chat'}</Text>
          <Text style={styles.headerStatus}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
        
        <TouchableOpacity style={styles.headerButton}>
          <MaterialIcons name="more-vert" size={22} color="#333" />
        </TouchableOpacity>
      </View>
      
      {/* Messages list */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
        onLayout={scrollToBottom}
      />
      
      {/* Typing indicator */}
      {renderTypingIndicator()}
      
      {/* Message input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <View style={styles.inputContainer}>
          <View style={styles.textInputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
          </View>
          
          <TouchableOpacity 
            style={[
              styles.sendButton,
              !inputText.trim() ? styles.sendButtonDisabled : null
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 12,
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
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'column',
    marginLeft: 10,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerStatus: {
    fontSize: 12,
    color: '#555',
  },
  headerButton: {
    padding: 8,
    marginLeft: 10,
  },
  messagesContainer: {
    padding: 10,
    paddingBottom: 16,
  },
  messageWrapper: {
    marginBottom: 8,
  },
  dateContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateText: {
    fontSize: 12,
    color: '#888',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
    marginBottom: 2,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#f7b305',
    borderBottomRightRadius: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  otherBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    marginRight: 40,
  },
  userText: {
    color: '#333',
  },
  otherText: {
    color: '#333',
  },
  timeText: {
    fontSize: 10,
    color: 'rgba(0,0,0,0.5)',
    alignSelf: 'flex-end',
    position: 'absolute',
    right: 10,
    bottom: 6,
  },
  statusContainer: {
    position: 'absolute',
    right: 24,
    bottom: 6,
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 10,
    width: 60,
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#888',
    marginHorizontal: 2,
    opacity: 0.6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  textInputContainer: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 12,
    minHeight: 40,
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    maxHeight: 100,
    paddingTop: Platform.OS === 'ios' ? 10 : 6,
    paddingBottom: Platform.OS === 'ios' ? 10 : 6,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f7b305',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
});

export default MessageScreen; 