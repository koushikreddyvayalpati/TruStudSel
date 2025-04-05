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
  Easing,
  LayoutAnimation,
  UIManager,
  InteractionManager,
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
  messageAnimations,
  formatMessageTime,
  formatDateHeader,
  isDateEqual,
  recipientInitials
}: { 
  item: Message, 
  index: number,
  messages: Message[],
  currentUserId: string | null,
  messageAnimations: Map<string, { fadeAnim: Animated.Value, slideAnim: Animated.Value }>,
  formatMessageTime: (dateString: string) => string,
  formatDateHeader: (dateString: string) => string,
  isDateEqual: (date1: Date, date2: Date) => boolean,
  recipientInitials: string
}) => {
  const isUser = currentUserId === item.senderId;
  const showDate = index === 0 || 
    !isDateEqual(new Date(item.createdAt), new Date(messages[index - 1].createdAt));
  
  // Determine if we need to show the avatar (first message in sequence)
  const showAvatar = index === 0 || 
    (messages[index - 1] && messages[index - 1].senderId !== item.senderId);
  
  // Use existing animation values
  const { fadeAnim, slideAnim } = messageAnimations.get(item.id) || { 
    fadeAnim: new Animated.Value(1), 
    slideAnim: new Animated.Value(0) 
  };
  
  return (
    <View style={styles.messageWrapper}>
      {showDate && (
        <Animated.View 
          style={[
            styles.dateContainer,
            { opacity: fadeAnim }
          ]}
        >
          <Text style={styles.dateText}>{formatDateHeader(item.createdAt)}</Text>
        </Animated.View>
      )}
      
      <View style={[
        styles.messageRow,
        isUser ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }
      ]}>
        {!isUser && showAvatar && (
          <Animated.View style={{
            opacity: fadeAnim,
            marginRight: 8,
            alignSelf: 'flex-end',
            marginBottom: 2
          }}>
            <View style={styles.recipientInitialsContainer}>
              <Text style={styles.avatarText}>{recipientInitials}</Text>
            </View>
          </Animated.View>
        )}
        
        <View style={[
          { maxWidth: '65%' }
        ]}>
          <Animated.View style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.otherBubble,
            { 
              opacity: fadeAnim,
              transform: [
                { translateX: slideAnim },
                { scale: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1]
                  })
                }
              ] 
            }
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
                  {item.status === MessageStatus.READ && (
                    <Animated.View style={{ 
                      opacity: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 1]
                      }) 
                    }}>
                      <Ionicons name="checkmark-done" size={14} color="#fff" />
                    </Animated.View>
                  )}
                </View>
              )}
            </View>
          </Animated.View>
        </View>
        
        {isUser && (
          <Animated.View style={{
            opacity: fadeAnim,
            marginLeft: 8,
            alignSelf: 'flex-end'
          }}>
            <View style={styles.userInitialsContainer}>
              <Text style={styles.avatarText}>KR</Text>
            </View>
          </Animated.View>
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
  
  // Enhanced animation refs
  const typingIndicatorOpacity = useRef(new Animated.Value(0)).current;
  const typingDotScale = useRef(new Animated.Value(1)).current;
  const headerHeight = useRef(new Animated.Value(60)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const sendButtonScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const errorSlideAnim = useRef(new Animated.Value(-50)).current;
  const errorOpacityAnim = useRef(new Animated.Value(0)).current;
  const inputFocusAnim = useRef(new Animated.Value(0)).current;
  const loadingRotation = useRef(new Animated.Value(0)).current;
  
  // State for recipient initials (for avatar)
  const [recipientInitials, setRecipientInitials] = useState('');
  const [_userInitials, setUserInitials] = useState('');
  
  // Map to track message animations
  const messageAnimations = useRef(new Map()).current;
  
  // Function to scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages.length]);
  
  // Render Avatar Component
  const renderAvatar = useCallback((initials: string, isUser = false) => {
    const colors = isUser 
      ? ['#f7b305', '#f9a825'] 
      : ['#808080', '#606060'];
    
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
  
  // Run entry animation when screen mounts
  useEffect(() => {
    // Custom layout animation config
    const customLayoutAnimation = {
      duration: 300,
      create: {
        type: LayoutAnimation.Types.spring,
        property: LayoutAnimation.Properties.scaleXY,
        springDamping: 0.7,
      },
      update: {
        type: LayoutAnimation.Types.spring,
        springDamping: 0.7,
      },
    };
    
    // Start the entry animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
    
    // Run layout animation after navigation transition completes
    InteractionManager.runAfterInteractions(() => {
      LayoutAnimation.configureNext(customLayoutAnimation);
    });
  }, [fadeAnim, slideAnim]);

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
  
  // Effect to scroll to bottom on load and when new messages arrive
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [messages, scrollToBottom]);
  
  // Animate typing dots with enhanced animation
  useEffect(() => {
    if (isTyping) {
      // Show typing indicator
      Animated.timing(typingIndicatorOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      // Animate typing dots
      Animated.loop(
        Animated.sequence([
          Animated.timing(typingDotScale, {
            toValue: 1.3,
            duration: 400,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: true,
          }),
          Animated.timing(typingDotScale, {
            toValue: 1,
            duration: 400,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Hide typing indicator
      Animated.timing(typingIndicatorOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      // Reset typing dot scale
      typingDotScale.setValue(1);
    }
    
    return () => {
      typingDotScale.setValue(1);
    };
  }, [isTyping, typingIndicatorOpacity, typingDotScale]);

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
  
  // Animate loading spinner for a more professional look
  useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.timing(loadingRotation, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      loadingRotation.setValue(0);
    }
  }, [isLoading, loadingRotation]);

  // Enhanced message sending with animation
  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !actualConversationId) return;
    
    Keyboard.dismiss();
    
    // Animate send button when pressed
    Animated.sequence([
      Animated.timing(sendButtonScale, {
        toValue: 0.8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(sendButtonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
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
      
      // Show error with animation
      Animated.parallel([
        Animated.timing(errorOpacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(errorSlideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    } finally {
      setIsLoading(false);
    }
  }, [inputText, actualConversationId, sendButtonScale, errorOpacityAnim, errorSlideAnim]);
  
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
  
  // Render item function for FlatList
  const renderItem = useCallback(({ item, index }: { item: Message; index: number }) => {
    // Create animation value for this message if it doesn't exist
    if (!messageAnimations.has(item.id)) {
      const fadeAnim = new Animated.Value(0);
      const slideAnim = new Animated.Value(currentUserId === item.senderId ? 20 : -20);
      messageAnimations.set(item.id, { fadeAnim, slideAnim });
      
      // Start animation for this message
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          delay: index * 30, // Slightly faster stagger
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          delay: index * 30,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }
    
    return (
      <MessageItem 
        item={item}
        index={index}
        messages={messages}
        currentUserId={currentUserId}
        messageAnimations={messageAnimations}
        formatMessageTime={formatMessageTime}
        formatDateHeader={formatDateHeader}
        isDateEqual={isDateEqual}
        recipientInitials={recipientInitials}
      />
    );
  }, [messages, currentUserId, formatMessageTime, messageAnimations, recipientInitials, formatDateHeader, isDateEqual]);
  
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
      <Animated.View 
        style={[
          styles.typingContainer, 
          { 
            opacity: typingIndicatorOpacity,
            transform: [{
              translateY: typingIndicatorOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 0]
              })
            }]
          }
        ]}
      >
        <View style={styles.typingBubble}>
          <Animated.View style={[
            styles.typingDot,
            { transform: [{ scale: typingDotScale.interpolate({
              inputRange: [1, 1.3],
              outputRange: [1, 1]
            }) }] }
          ]} />
          <Animated.View style={[
            styles.typingDot, 
            { transform: [{ scale: typingDotScale }] }
          ]} />
          <Animated.View style={[
            styles.typingDot,
            { transform: [{ scale: typingDotScale.interpolate({
              inputRange: [1, 1.3],
              outputRange: [1, 1]
            }) }] }
          ]} />
        </View>
      </Animated.View>
    );
  }, [isTyping, typingIndicatorOpacity, typingDotScale]);
  
  // Enhanced error message with animation
  const renderErrorMessage = useCallback(() => {
    if (!error) return null;
    
    return (
      <Animated.View style={[
        styles.errorContainer,
        {
          opacity: errorOpacityAnim,
          transform: [{ translateY: errorSlideAnim }]
        }
      ]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          onPress={() => {
            // Animate out before removing
            Animated.parallel([
              Animated.timing(errorOpacityAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }),
              Animated.timing(errorSlideAnim, {
                toValue: -50,
                duration: 200,
                useNativeDriver: true,
              }),
            ]).start(() => setError(null));
          }}
        >
          <Text style={styles.dismissText}>Dismiss</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [error, errorOpacityAnim, errorSlideAnim]);
  
  // Enhanced keyboard handling
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        // Animate input focus
        Animated.timing(inputFocusAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: false,
        }).start();
        
        // Shrink header height and reduce opacity
        Animated.parallel([
          Animated.timing(headerHeight, {
            toValue: 48,
            duration: 200,
            easing: Easing.ease,
            useNativeDriver: false,
          }),
          Animated.timing(headerOpacity, {
            toValue: 0.9,
            duration: 200,
            useNativeDriver: false,
          }),
        ]).start();
        
        // Make sure we scroll to the bottom
        setTimeout(scrollToBottom, 100);
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        // Animate input blur
        Animated.timing(inputFocusAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start();
        
        // Restore header height and opacity
        Animated.parallel([
          Animated.timing(headerHeight, {
            toValue: 60,
            duration: 200,
            easing: Easing.ease,
            useNativeDriver: false,
          }),
          Animated.timing(headerOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
          }),
        ]).start();
      }
    );
    
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [headerHeight, headerOpacity, inputFocusAnim, scrollToBottom]);
  
  // Enhanced loading state
  if ((isLoading && messages.length === 0) || (routeConversationId === 'new' && !actualConversationId)) {
    const spin = loadingRotation.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg']
    });
    
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={{ height: insets.top, backgroundColor: '#fff' }} />
        
        <Animated.View style={[
          styles.header,
          { 
            height: headerHeight,
            opacity: headerOpacity 
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
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <MaterialIcons name="chat" size={48} color="#f7b305" />
          </Animated.View>
          <Animated.Text 
            style={[
              styles.loadingText,
              {
                opacity: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1]
                }),
                transform: [{
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0]
                  })
                }]
              }
            ]}
          >
            {routeConversationId === 'new' && !actualConversationId 
              ? 'Setting up conversation...' 
              : 'Loading messages...'}
          </Animated.Text>
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
            height: headerHeight,
            opacity: headerOpacity 
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => {
            // Animate out before navigating back
            Animated.parallel([
              Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }),
              Animated.timing(slideAnim, {
                toValue: 50,
                duration: 200,
                useNativeDriver: true,
              }),
            ]).start(() => {
              navigation.goBack();
            });
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
              { paddingBottom: 24 }
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
              <Animated.View 
                style={[
                  styles.emptyContainer,
                  {
                    opacity: fadeAnim,
                    transform: [{
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0]
                      })
                    }]
                  }
                ]}
              >
                <FontAwesome name="comments-o" size={50} color="#ccc" style={{ marginBottom: 20 }} />
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySubtitle}>Send a message to start the conversation</Text>
              </Animated.View>
            }
            onEndReached={scrollToBottom}
            onEndReachedThreshold={0.1}
          />
          
          {renderTypingIndicator()}
        </LinearGradient>
        
        {/* Input Bar with enhanced animation */}
        <Animated.View 
          style={[
            styles.inputContainer,
            {
              transform: [{
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0]
                })
              }],
              shadowOpacity: inputFocusAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.1, 0.2]
              }),
              shadowRadius: inputFocusAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [3, 5]
              }),
              marginTop: -8,
            }
          ]}
        >
          <View style={styles.inputWrapper}>
            <Animated.View style={[
              styles.inputBackground,
              {
                backgroundColor: inputFocusAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['#f0f0f0', '#f5f5f5']
                }),
                shadowOpacity: inputFocusAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.05, 0.1]
                }),
              }
            ]}>
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
            </Animated.View>
            
            <Animated.View 
              style={{
                position: 'absolute',
                right: 8,
                bottom: 8,
                transform: [{ scale: sendButtonScale }]
              }}
            >
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
                  size={25} 
                  color={inputText.trim() ? "#FFFFFF" : "#CCCCCC"} 
                />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Animated.View>
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
    marginVertical: 14,
  },
  dateText: {
    fontSize: 13,
    color: '#505050',
    backgroundColor: '#e8e8e8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    overflow: 'hidden',
    fontWeight: '600',
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageBubble: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    shadowColor: 'rgba(0, 0, 0, 0.12)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  userBubble: {
    backgroundColor: '#ffb300',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
    shadowColor: 'rgba(255, 179, 0, 0.4)',
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
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
    backgroundColor: '#ffb300',
    shadowColor: 'rgba(255, 179, 0, 0.4)',
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
    backgroundColor: '#808080',
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 3,
  },
  inputContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    shadowColor: 'rgba(0, 0, 0, 0.18)',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 12,
    zIndex: 10,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginBottom: 10,
  },
  inputWrapper: {
    position: 'relative',
  },
  inputBackground: {
    borderRadius: 20,
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
  },
  input: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingRight: 50,
    minHeight: 46,
    maxHeight: 120,
    fontSize: 16,
    borderRadius: 20,
    color: '#333',
  },
  sendButton: {
    backgroundColor: '#f7b305',
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(247, 179, 5, 0.4)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
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