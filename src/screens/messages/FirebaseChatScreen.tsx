import React, { useCallback, useEffect, useRef, useState, useLayoutEffect, useMemo } from 'react';
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
  Keyboard,
  RefreshControl,
  AppState,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { MainStackParamList } from '../../types/navigation.types';
import {
  getMessages,
  subscribeToMessages,
  sendMessage,
  getOrCreateConversation,
  getCurrentUser,
} from '../../services/firebaseChatService';
import { Message, ReceiptStatus, MessageStatus } from '../../types/chat.types';
import { formatMessageTime, formatMessageDate, isSameDay } from '../../utils/timestamp';

// Define route params type
type FirebaseChatScreenRouteProp = RouteProp<MainStackParamList, 'FirebaseChatScreen'>;
type FirebaseChatScreenNavigationProp = StackNavigationProp<MainStackParamList, 'FirebaseChatScreen'>;

// Window dimensions for responsive sizing
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// AsyncStorage key prefixes
const MESSAGES_STORAGE_KEY_PREFIX = '@TruStudSel_messages_';
const CONVERSATION_STORAGE_KEY_PREFIX = '@TruStudSel_conversation_';

const FirebaseChatScreen = () => {
  const navigation = useNavigation<FirebaseChatScreenNavigationProp>();
  const route = useRoute<FirebaseChatScreenRouteProp>();

  // Get parameters from navigation
  const { recipientEmail, recipientName } = route.params || {};

  // States and refs
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Start with false to prevent flashing
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [_currentUserName, setCurrentUserName] = useState<string>('');
  const [otherUserName, setOtherUserName] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [_keyboardVisible, setKeyboardVisible] = useState(false);

  // Format the recipient name consistently
  const getFormattedRecipientName = useCallback(() => {
    if (!recipientEmail) {return recipientName || 'Chat';}

    // If we have a specific recipientName provided and it's different from the email,
    // use it (this comes from the navigation params)
    if (recipientName &&
        recipientName !== recipientEmail &&
        recipientName !== recipientEmail.split('@')[0] &&
        recipientName !== currentUserEmail?.split('@')[0] &&  // Make sure it's not the current user
        recipientName.toLowerCase() !== currentUserEmail?.split('@')[0].toLowerCase()) {
      return recipientName;
    }

    // Otherwise, format the email username part
    if (recipientEmail.includes('@')) {
      const username = recipientEmail.split('@')[0];
      return username.charAt(0).toUpperCase() + username.slice(1);
    }

    return recipientName || recipientEmail;
  }, [recipientEmail, recipientName, currentUserEmail]);

  // Calculate the proper display name once
  const displayName = getFormattedRecipientName();

  // Refs for tracking animation and component state
  const isInitializedRef = useRef<boolean>(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollButtonAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList<Message>>(null);
  const messageSubscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const inputRef = useRef<TextInput>(null);
  const isMountedRef = useRef<boolean>(true);
  const shouldShowScrollButtonRef = useRef<boolean>(false);
  const previousMessagesRef = useRef<Message[]>([]);

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

  // Set up component mount/unmount tracking
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Animate fade-in effect using useLayoutEffect to run before browser paint
  useLayoutEffect(() => {
    if (isMountedRef.current) {
      // Start with 1 opacity instead of animating from 0 to prevent invisibility
      fadeAnim.setValue(1);

      // Optional subtle fade in if desired
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      // Make sure animations are stopped on unmount
      fadeAnim.stopAnimation();
      scrollButtonAnim.stopAnimation();
    };
  }, [fadeAnim, scrollButtonAnim]);

  // Handle scroll events with improved animation safety
  const handleScroll = useCallback((event: any) => {
    if (!isMountedRef.current) {return;}

    const offsetY = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const layoutHeight = event.nativeEvent.layoutMeasurement.height;

    // Show scroll button when not at bottom and have enough content
    const isAtBottom = offsetY >= contentHeight - layoutHeight - 100;
    const hasEnoughContent = contentHeight > layoutHeight * 1.5;

    // Only update state and animate when there's an actual change needed
    const shouldShowButton = !isAtBottom && hasEnoughContent;

    // Store current state in ref to avoid issues during unmount
    if (shouldShowButton !== shouldShowScrollButtonRef.current) {
      shouldShowScrollButtonRef.current = shouldShowButton;

      if (shouldShowButton) {
        // First update state, then animate - but check if still mounted
        if (isMountedRef.current) {
          setShowScrollButton(true);
          // Use requestAnimationFrame to ensure state update completes first
          requestAnimationFrame(() => {
            if (isMountedRef.current) {
              Animated.timing(scrollButtonAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
              }).start();
            }
          });
        }
      } else {
        // For hiding, animate first, then update state after confirming still mounted
        Animated.timing(scrollButtonAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(({ finished }) => {
          // Only update state if animation completed and component is mounted
          if (finished && isMountedRef.current) {
            setShowScrollButton(false);
          }
        });
      }
    }
  }, [scrollButtonAnim]);

  // Cancel animations in effect cleanup for messages
  useEffect(() => {
    return () => {
      console.log('[FirebaseChatScreen] Component unmounting, cleaning up resources');
      // Cleanup message subscription
      if (messageSubscriptionRef.current) {
        console.log('[FirebaseChatScreen] Unsubscribing from message updates');
        messageSubscriptionRef.current.unsubscribe();
        messageSubscriptionRef.current = null;
      }

      // Reset state ref
      isMountedRef.current = false;

      // Cancel any animations
      fadeAnim.stopAnimation();
      scrollButtonAnim.stopAnimation();
    };
  }, [fadeAnim, scrollButtonAnim]);

  // Load cached messages with improved cache invalidation
  const loadCachedMessages = useCallback(async (conversationId: string): Promise<Message[] | null> => {
    try {
      const storageKey = `${MESSAGES_STORAGE_KEY_PREFIX}${conversationId}`;
      const cachedData = await AsyncStorage.getItem(storageKey);

      if (cachedData) {
        const { messages, timestamp } = JSON.parse(cachedData);
        const cacheAge = new Date().getTime() - new Date(timestamp).getTime();
        const cacheAgeMinutes = cacheAge / (1000 * 60);

        console.log(`[AsyncStorage] Found cached messages (${messages.length}) from ${cacheAgeMinutes.toFixed(1)} minutes ago`);

        // Always use fresh data for better real-time experience
        // This ensures we don't miss any messages and app stays responsive
        console.log('[AsyncStorage] Cache exists, but fetching fresh data for real-time updates');
        return null;
      }
      return null;
    } catch (error) {
      console.error('[AsyncStorage] Error loading cached messages:', error);
      return null;
    }
  }, []);

  // Process messages before caching to ensure consistent timestamps
  const processMessagesForCache = useCallback((messages: Message[]): Message[] => {
    return messages.map(message => {
      // Create a new message object with validated timestamps
      return {
        ...message,
        // Ensure createdAt is a valid ISO string (not a serverTimestamp reference)
        createdAt: message.createdAt || new Date().toISOString(),
        // Only include updatedAt if it exists and is valid
        updatedAt: message.updatedAt || undefined,
        // Only include readAt if it exists and is valid
        readAt: message.readAt || undefined,
      };
    });
  }, []);

  // Enhanced caching with timestamp validation
  const cacheMessages = useCallback(async (conversationId: string, messages: Message[]) => {
    try {
      const storageKey = `${MESSAGES_STORAGE_KEY_PREFIX}${conversationId}`;
      // Process messages to ensure valid timestamps
      const processedMessages = processMessagesForCache(messages);

      const dataToStore = JSON.stringify({
        messages: processedMessages,
        timestamp: new Date().toISOString(),
      });
      await AsyncStorage.setItem(storageKey, dataToStore);
      console.log(`[AsyncStorage] Cached ${messages.length} messages for conversation ${conversationId}`);
    } catch (error) {
      console.error('[AsyncStorage] Error caching messages:', error);
      // Don't throw - this is a background operation
    }
  }, [processMessagesForCache]);

  // Subscribe to new messages with improved handling for real-time updates
  const subscribeToNewMessages = useCallback((conversationId: string) => {
    console.log(`[FirebaseChatScreen] Setting up message subscription for conversation ${conversationId}`);

    // Store previous messages in a ref to avoid dependency issues
    const subscription = subscribeToMessages(conversationId, (updatedMessages) => {
      console.log('[FirebaseChatScreen] Received updated messages:', updatedMessages.length);

      if (updatedMessages && updatedMessages.length > 0) {
        // Compare with previous messages to avoid unnecessary updates
        const prevMessages = previousMessagesRef.current;

        // Check if there are actually changes worth updating
        const hasNewMessages = updatedMessages.length > prevMessages.length;
        const newMessageExists = updatedMessages.some(
          newMsg => !prevMessages.some(existingMsg => existingMsg.id === newMsg.id)
        );
        const hasChangedMessages = updatedMessages.some((newMsg) => {
          const existingMsg = prevMessages.find(msg => msg.id === newMsg.id);
          return existingMsg &&
                 (existingMsg.content !== newMsg.content ||
                  existingMsg.status !== newMsg.status ||
                  existingMsg.receiptStatus !== newMsg.receiptStatus);
        });

        // Only update state if we have actual changes
        if (hasNewMessages || newMessageExists || hasChangedMessages) {
          console.log('[FirebaseChatScreen] Detected message changes, updating UI');
          setMessages(updatedMessages);
          previousMessagesRef.current = [...updatedMessages];

          // Cache in the background without blocking UI updates - only when needed
          setTimeout(() => {
            cacheMessages(conversationId, updatedMessages);
          }, 0);

          // Scroll to bottom on new messages if there are additions
          if (hasNewMessages || newMessageExists) {
            setTimeout(() => {
              if (flatListRef.current) {
                flatListRef.current.scrollToEnd({ animated: true });
              }
            }, 100);
          }
        } else {
          console.log('[FirebaseChatScreen] No significant changes, skipping update');
        }
      } else if (updatedMessages && updatedMessages.length === 0) {
        console.warn('[FirebaseChatScreen] Received empty messages from subscription');
        setMessages([]);
        previousMessagesRef.current = [];
      }
    });

    messageSubscriptionRef.current = subscription;

    // Return cleanup function
    return () => {
      console.log(`[FirebaseChatScreen] Cleaning up message subscription for ${conversationId}`);
      if (messageSubscriptionRef.current) {
        messageSubscriptionRef.current.unsubscribe();
        messageSubscriptionRef.current = null;
      }
    };
  }, [cacheMessages]); // Only depend on cacheMessages

  // Cache conversation data
  const cacheConversation = useCallback(async (conversation: any) => {
    if (!conversation?.id) {return;}

    try {
      const storageKey = `${CONVERSATION_STORAGE_KEY_PREFIX}${conversation.id}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify({
        conversation,
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('[AsyncStorage] Error caching conversation:', error);
    }
  }, []);

  // Load cached conversation
  const loadCachedConversation = useCallback(async (recipientEmail: string): Promise<any | null> => {
    try {
      // This is an approximation since we don't know the conversation ID yet
      // We'll scan for a conversation that contains this recipient
      const keys = await AsyncStorage.getAllKeys();
      const conversationKeys = keys.filter(k => k.startsWith(CONVERSATION_STORAGE_KEY_PREFIX));

      for (const key of conversationKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const { conversation, timestamp } = JSON.parse(data);
          if (conversation.participants?.includes(recipientEmail)) {
            const cacheAge = new Date().getTime() - new Date(timestamp).getTime();
            const cacheAgeMinutes = cacheAge / (1000 * 60);

            // Only use cache if it's less than 1 hour old
            if (cacheAgeMinutes < 60) {
              return conversation;
            }
          }
        }
      }
      return null;
    } catch (error) {
      console.error('[AsyncStorage] Error loading cached conversation:', error);
      return null;
    }
  }, []);

  // Add debug console logs to track state changes
  useEffect(() => {
    console.log('[FirebaseChatScreen] isLoading state changed:', isLoading);
  }, [isLoading]);

  // Initialize chat with improved safety
  useEffect(() => {
    // Skip initialization if already done
    if (isInitializedRef.current && conversationId) {
      return;
    }

    // Track mounted state locally within this effect
    let effectMounted = true;

    const initializeChat = async () => {
      try {
        if (!effectMounted || !isMountedRef.current) {return;}

        setIsLoading(true);

        // Get current user
        const user = await getCurrentUser();
        if (!user || !user.email) {
          if (!effectMounted || !isMountedRef.current) {return;}
          Alert.alert('Error', 'You must be logged in to chat.');
          navigation.goBack();
          return;
        }

        if (!effectMounted || !isMountedRef.current) {return;}
        setCurrentUserEmail(user.email);

        // Format current user's name
        const formattedCurrentUserName = user.name ||
          (user.email.includes('@') ?
            user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) :
            user.email);
        setCurrentUserName(formattedCurrentUserName);

        // Create or get existing conversation
        if (!recipientEmail) {
          if (!effectMounted || !isMountedRef.current) {return;}
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
        if (!effectMounted || !isMountedRef.current) {return;}
        setOtherUserName(otherUserFormattedName);

        let conversation;
        let usingCachedConversation = false;

        // Try to get cached conversation first for faster load
        try {
          const cachedConversation = await loadCachedConversation(recipientEmail);

          if (cachedConversation) {
            console.log('[AsyncStorage] Using cached conversation');
            conversation = cachedConversation;
            usingCachedConversation = true;
          }
        } catch (cacheError) {
          console.error('[AsyncStorage] Error loading cached conversation:', cacheError);
        }

        // If no valid cached conversation, create or get one from Firebase
        if (!conversation) {
          try {
            // Get conversation from Firebase
            conversation = await getOrCreateConversation(
              recipientEmail,
              displayName
            );

            // Cache the conversation for future use
            cacheConversation(conversation);
          } catch (convError) {
            console.error('[FirebaseChatScreen] Error creating/getting conversation:', convError);

            if (!effectMounted || !isMountedRef.current) {return;}
            Alert.alert('Error', 'Failed to start conversation. Please try again.');
            navigation.goBack();
            return;
          }
        }

        // Check for user-specific name mapping in the conversation
        const nameKey = `name_${user.email.replace(/[.@]/g, '_')}`;
        if (conversation[nameKey]) {
          if (!effectMounted || !isMountedRef.current) {return;}
          setOtherUserName(conversation[nameKey]);
        }

        if (!effectMounted || !isMountedRef.current) {return;}
        setConversationId(conversation.id);

        // Load messages with verification for cached conversations
        try {
          let initialMessages: Message[] = [];
          let cachedMessages = null;

          // Only try to load cached messages if we're using a valid cached conversation
          if (usingCachedConversation) {
            cachedMessages = await loadCachedMessages(conversation.id);
          }

          if (cachedMessages && cachedMessages.length > 0) {
            // Use cached messages for immediate display
            initialMessages = cachedMessages;

            if (!effectMounted || !isMountedRef.current) {return;}
            setMessages(initialMessages);

            // Mark as initialized to prevent re-initialization
            isInitializedRef.current = true;

            // We can set loading to false early since we have cached data
            setIsLoading(false);

            // Verify cached conversation still exists by fetching fresh messages
            try {
              const freshMessages = await getMessages(conversation.id);

              if (freshMessages.length >= 0) {
                // Conversation still valid
                if (effectMounted && isMountedRef.current &&
                    (freshMessages.length !== initialMessages.length ||
                    JSON.stringify(freshMessages) !== JSON.stringify(initialMessages))) {
                  setMessages(freshMessages);
                  cacheMessages(conversation.id, freshMessages);
                }
              }
            } catch (verifyError: any) {
              // Handle case where cached conversation no longer exists
              if (verifyError?.message?.includes('Conversation not found')) {
                console.log('[FirebaseChatScreen] Cached conversation no longer exists, recreating...');

                // Clear cached conversation and messages
                const conversationKey = `${CONVERSATION_STORAGE_KEY_PREFIX}${conversation.id}`;
                const messagesKey = `${MESSAGES_STORAGE_KEY_PREFIX}${conversation.id}`;

                await AsyncStorage.removeItem(conversationKey);
                await AsyncStorage.removeItem(messagesKey);

                // Create a new conversation
                const newConversation = await getOrCreateConversation(
                  recipientEmail,
                  displayName
                );

                // Update state with new conversation
                if (effectMounted && isMountedRef.current) {
                  setConversationId(newConversation.id);
                  setMessages([]);
                  cacheConversation(newConversation);

                  // Reset subscription with new conversation ID
                  if (messageSubscriptionRef.current) {
                    console.log('[FirebaseChatScreen] Unsubscribing from previous conversation before resubscribing');
                    messageSubscriptionRef.current.unsubscribe();
                    messageSubscriptionRef.current = null;
                  }

                  // Clear the previous messages ref before resubscribing
                  previousMessagesRef.current = [];

                  subscribeToNewMessages(newConversation.id);
                }
              } else {
                console.error('[FirebaseChatScreen] Error verifying conversation:', verifyError);
              }
            }
          } else {
            // No cached messages or invalid cache, fetch from Firebase
            try {
              initialMessages = await getMessages(conversation.id);

              if (!effectMounted || !isMountedRef.current) {return;}
              setMessages(initialMessages);

              // Cache the messages
              cacheMessages(conversation.id, initialMessages);
            } catch (loadError: any) {
              // Handle case where conversation doesn't exist
              if (loadError?.message?.includes('Conversation not found')) {
                console.log('[FirebaseChatScreen] Conversation not found, recreating...');

                // Clear any cached data
                const conversationKey = `${CONVERSATION_STORAGE_KEY_PREFIX}${conversation.id}`;
                const messagesKey = `${MESSAGES_STORAGE_KEY_PREFIX}${conversation.id}`;

                await AsyncStorage.removeItem(conversationKey);
                await AsyncStorage.removeItem(messagesKey);

                // Create a new conversation
                const newConversation = await getOrCreateConversation(
                  recipientEmail,
                  displayName
                );

                // Update state with new conversation
                if (effectMounted && isMountedRef.current) {
                  setConversationId(newConversation.id);
                  setMessages([]);
                  cacheConversation(newConversation);

                  // Reset subscription with new conversation ID
                  if (messageSubscriptionRef.current) {
                    console.log('[FirebaseChatScreen] Unsubscribing from previous conversation before resubscribing');
                    messageSubscriptionRef.current.unsubscribe();
                    messageSubscriptionRef.current = null;
                  }

                  // Clear the previous messages ref before resubscribing
                  previousMessagesRef.current = [];

                  subscribeToNewMessages(newConversation.id);
                }
              } else {
                throw loadError; // Re-throw if it's a different error
              }
            }
          }
        } catch (error) {
          console.error('[FirebaseChatScreen] Error loading messages:', error);
          if (effectMounted && isMountedRef.current) {
            Alert.alert('Error', 'Failed to load messages. Please try again.');
            navigation.goBack();
          }
          return;
        }

        // Subscribe to new messages
        if (effectMounted && isMountedRef.current && conversation?.id) {
          // Set initial values for comparison in the subscription
          if (messages.length > 0) {
            previousMessagesRef.current = [...messages];
          }

          subscribeToNewMessages(conversation.id);

          // Mark as initialized to prevent re-initialization
          isInitializedRef.current = true;
        }

      } catch (error) {
        if (!effectMounted || !isMountedRef.current) {return;}
        console.error('Error initializing chat:', error);
        Alert.alert('Error', 'Failed to initialize chat. Please try again.');
      } finally {
        if (effectMounted && isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    initializeChat();

    // Cleanup
    return () => {
      effectMounted = false;

      // Don't unsubscribe from messages here - we do that in component unmount
    };
  }, [recipientEmail, recipientName, navigation, subscribeToNewMessages, displayName, conversationId, loadCachedMessages, cacheMessages, loadCachedConversation, cacheConversation, messages]);

  // Send a message - premium style with AsyncStorage
  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || !conversationId) {return;}

    try {
      // Store message content before clearing
      const messageContent = inputText.trim();

      // Clear input immediately for responsive feel
      setInputText('');

      // Generate a unique ID for this message
      const tempId = `temp-${Date.now()}`;

      // Optimistic update - add message locally immediately
      const tempMessage: Message = {
        id: tempId,
        conversationId: conversationId,
        senderId: currentUserEmail || '',
        senderName: _currentUserName,
        content: messageContent,
        status: MessageStatus.SENT,
        receiptStatus: ReceiptStatus.SENT,
        createdAt: new Date().toISOString(),
      };

      // Add to UI immediately
      const updatedMessages = [...messages, tempMessage];
      setMessages(updatedMessages);

      // Update cache immediately for offline access
      cacheMessages(conversationId, updatedMessages);

      // Scroll to bottom immediately
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 10);

      // Send in background without showing any loading state
      try {
        await sendMessage(conversationId, messageContent);
      } catch (error: any) {
        console.error('Error sending message:', error);

        // Handle "Conversation not found" error specifically
        if (error?.message?.includes('Conversation not found')) {
          console.log('Conversation not found in database. Clearing cache and recreating conversation...');

          // Clear cached conversation and messages
          try {
            const conversationKey = `${CONVERSATION_STORAGE_KEY_PREFIX}${conversationId}`;
            const messagesKey = `${MESSAGES_STORAGE_KEY_PREFIX}${conversationId}`;

            await AsyncStorage.removeItem(conversationKey);
            await AsyncStorage.removeItem(messagesKey);

            // Create a new conversation
            if (recipientEmail) {
              const newConversation = await getOrCreateConversation(
                recipientEmail,
                displayName
              );

              // Update conversation ID
              setConversationId(newConversation.id);

              // Cache the new conversation
              cacheConversation(newConversation);

              // Now try to send the message again with the new conversation ID
              await sendMessage(newConversation.id, messageContent);

              // Update temporary message with new conversation ID
              const updatedMessagesWithNewConvId = updatedMessages.map(msg => {
                if (msg.id === tempId) {
                  return {
                    ...msg,
                    conversationId: newConversation.id,
                  };
                }
                return msg;
              });

              setMessages(updatedMessagesWithNewConvId);
              cacheMessages(newConversation.id, updatedMessagesWithNewConvId);

              // Subscribe to new messages with the new conversation ID
              if (messageSubscriptionRef.current) {
                console.log('[FirebaseChatScreen] Unsubscribing from previous conversation before resubscribing');
                messageSubscriptionRef.current.unsubscribe();
                messageSubscriptionRef.current = null;
              }

              // Clear the previous messages ref before resubscribing
              previousMessagesRef.current = [];

              subscribeToNewMessages(newConversation.id);

              console.log('Successfully recreated conversation and sent message');
            }
          } catch (cleanupError) {
            console.error('Error clearing cache and recreating conversation:', cleanupError);
            Alert.alert(
              'Error',
              'Failed to send message. Please try again later.'
            );
          }
        } else {
          // For other errors, show an alert
          Alert.alert(
            'Error',
            'Failed to send message. Please try again.'
          );
        }
      }

    } catch (error) {
      console.error('Error in message sending flow:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  }, [inputText, conversationId, currentUserEmail, _currentUserName, messages, cacheMessages,
      recipientEmail, displayName, cacheConversation, subscribeToNewMessages]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, []);

  // Determine if we should show date header
  const shouldShowDateHeader = useCallback((index: number) => {
    if (index === 0) {return true;}

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
            <Text style={styles.messageText}>
              {item.content || ''}
            </Text>
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

  // Add pull-to-refresh functionality
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!conversationId) {return;}

    setRefreshing(true);
    try {
      console.log('[FirebaseChatScreen] Manually refreshing messages');
      // Force fetch new messages from Firebase
      const freshMessages = await getMessages(conversationId);

      if (freshMessages.length > 0) {
        setMessages(freshMessages);
        // Update cache with latest messages
        cacheMessages(conversationId, freshMessages);
      }
    } catch (error) {
      console.error('[FirebaseChatScreen] Error refreshing messages:', error);
    } finally {
      setRefreshing(false);
    }
  }, [conversationId, cacheMessages]);

  // Properly handle app state changes to optimize Firebase subscriptions
  useEffect(() => {
    // Add app state change listeners to optimize subscriptions
    const handleAppStateChange = (nextAppState: string) => {
      console.log('[FirebaseChatScreen] App state changed:', nextAppState);

      // When app comes to foreground, refresh messages to ensure we have latest data
      if (nextAppState === 'active' && conversationId && isInitializedRef.current) {
        console.log('[FirebaseChatScreen] App became active, refreshing messages');
        handleRefresh();
      }
    };

    // Add app state change listener
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      // Clean up app state change listener
      appStateSubscription.remove();
    };
  }, [conversationId, handleRefresh]);

  // Using memo to create persistent component references
  const MessagesList = useMemo(() => {
    return (
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
        extraData={[currentUserEmail, otherUserName]} // Only depend on props that affect rendering
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#f7b305"
            colors={['#f7b305']}
          />
        }
      />
    );
  }, [
    messages,
    renderMessage,
    keyExtractor,
    handleScroll,
    getItemLayout,
    currentUserEmail,
    otherUserName,
    refreshing,
    handleRefresh,
  ]);

  // Input area component memoized
  const ChatInputArea = useMemo(() => {
    return (
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
              !inputText.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim()}
            activeOpacity={0.7}
          >
            <Icon
              name="send"
              size={Platform.OS === 'android' ? 22 : 24}
              color={inputText.trim() ? (Platform.OS === 'android' ? '#fff' : '#ffb300') : '#ccc'}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }, [inputText, isTyping, handleSendMessage]);

  // Modify the renderContent function to avoid animation issues
  const renderContent = useCallback(() => {
    // Only show loading on initial load
    if (isLoading && !isInitializedRef.current) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffb300" />
          <Text style={styles.loadingText}>Loading conversation...</Text>
        </View>
      );
    }

    return (
      <>
        {/* Message List with optimized rendering */}
        <Animated.View
          style={[
            styles.messagesContainer,
            // Set opacity to 1 to ensure messages are always visible
            { opacity: 1 },
          ]}
          collapsable={false}
        >
          {MessagesList}

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
                      outputRange: [0.5, 1],
                    }),
                  }],
                },
              ]}
              collapsable={false}
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
        {ChatInputArea}
      </>
    );
  }, [isLoading, MessagesList, showScrollButton, scrollButtonAnim, scrollToBottom, ChatInputArea]);

  // Clear all conversation and message cache
  const clearAllConversationCache = useCallback(async () => {
    try {
      console.log('[FirebaseChatScreen] Clearing all conversation and message cache');

      // Get all keys from AsyncStorage
      const keys = await AsyncStorage.getAllKeys();

      // Filter for conversation and message keys
      const conversationKeys = keys.filter(k =>
        k.startsWith(CONVERSATION_STORAGE_KEY_PREFIX) ||
        k.startsWith(MESSAGES_STORAGE_KEY_PREFIX)
      );

      if (conversationKeys.length > 0) {
        // Remove all matching keys
        await AsyncStorage.multiRemove(conversationKeys);
        console.log(`[FirebaseChatScreen] Cleared ${conversationKeys.length} cached items`);
      }

      return true;
    } catch (error) {
      console.error('[FirebaseChatScreen] Error clearing conversation cache:', error);
      return false;
    }
  }, []);

  // Update the error handler in handleSendMessage to call this function when appropriate
  useEffect(() => {
    // Add event listener for database reset detection
    const handleDatabaseReset = (error: any) => {
      if (error?.message?.includes('Conversation not found')) {
        // This might indicate the database was reset or cleared
        clearAllConversationCache()
          .then(() => console.log('[FirebaseChatScreen] Cache cleared after database reset detection'))
          .catch(err => console.error('[FirebaseChatScreen] Failed to clear cache:', err));
      }
    };

    // Subscribe to conversation errors (in a real app, this would be a proper event system)
    const errorListener = { current: handleDatabaseReset };

    return () => {
      // Clean up listener in a real event system
      errorListener.current = () => {};
    };
  }, [clearAllConversationCache]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={Platform.OS === 'android' ? 'dark-content' : 'dark-content'}
        backgroundColor={Platform.OS === 'android' ? '#f7b305' : '#fff'}
      />

      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="arrow-back" size={24} color={Platform.OS === 'android' ? '#333' : '#000'} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.headerCenter}
          activeOpacity={0.7}
          onPress={() => {
            try {
              // Navigate to user profile using the recipient email
              (navigation as any).navigate('Profile', {
                sellerEmail: recipientEmail,
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
                  sellerEmail: recipientEmail,
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

      {renderContent()}
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
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.15)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
        paddingTop: 40,
        paddingBottom: 15,
        backgroundColor: '#f7b305',
        borderBottomWidth: 0,
      },
    }),
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
    ...Platform.select({
      android: {
        backgroundColor: '',
        padding: 8,
        borderRadius: 20,
        marginLeft: 5,
      },
    }),
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    ...Platform.select({
      android: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.5)',
      },
    }),
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
    ...Platform.select({
      android: {
        color: '#333',
        fontSize: 18,
        fontWeight: '700',
      },
    }),
  },
  typingIndicator: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    ...Platform.select({
      android: {
        color: '#333',
      },
    }),
  },
  profileButton: {
    padding: 5,
  },
  // Message container
  messagesContainer: {
    flex: 1,
    position: 'relative',
    ...Platform.select({
      android: {
        backgroundColor: '#f9f9f9',
      },
    }),
  },
  messageList: {
    padding: 10,
    paddingBottom: 30,
    ...Platform.select({
      ios: {
        backgroundColor: '#fff',
      },
      android: {
        backgroundColor: '#f9f9f9',
        paddingHorizontal: 12,
      },
    }),
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
    ...Platform.select({
      android: {
        elevation: 0,
        borderWidth: 0,
        borderColor: '',
      },
    }),
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
    ...Platform.select({
      android: {
        elevation: 0,
      },
    }),
  },
  receivedMessage: {
    backgroundColor: '#f8f8f8',
    borderBottomLeftRadius: 4,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.06)',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 1,
        shadowRadius: 2,
        borderWidth: 1,
        borderColor: '#f0f0f0',
      },
      android: {
        backgroundColor: '#fff',
        elevation: 0,
        borderWidth: 0,
      },
    }),
  },
  messageText: {
    fontSize: 16,
    color: '#000',
    lineHeight: 22,
    opacity: 1,
    fontWeight: '400',
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
    ...Platform.select({
      android: {
        backgroundColor: 'rgba(0,0,0,0.06)',
        color: '#333',
        elevation: 0,
        paddingVertical: 5,
      },
    }),
  },
  // Enhanced input area
  keyboardAvoidingView: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
      },
      android: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingBottom: 16,
        borderTopWidth: 0,
        elevation: 4,
        shadowColor: 'transparent',
        alignItems: 'center',
      },
    }),
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
    ...Platform.select({
      android: {
        paddingTop: 8,
        paddingBottom: 8,
        backgroundColor: '#fff',
        elevation: 0,
        borderColor: '#e0e0e0',
        borderRadius: 25,
        height: 48,
        paddingHorizontal: 18,
      },
    }),
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
    ...Platform.select({
      android: {
        backgroundColor: '#ffb300',
        borderWidth: 0,
        elevation: 0,
        width: 50,
        height: 50,
        borderRadius: 25,
        marginLeft: 8,
        shadowColor: 'transparent',
      },
    }),
  },
  sendButtonDisabled: {
    opacity: 0.7,
    backgroundColor: '#f5f5f5',
    ...Platform.select({
      android: {
        backgroundColor: 'rgba(247, 179, 5, 0.5)',
        opacity: 0.8,
        elevation: 0,
      },
    }),
  },
  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 20,
    ...Platform.select({
      ios: {
        backgroundColor: '#fff',
      },
      android: {
        backgroundColor: '#f9f9f9',
      },
    }),
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
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.3)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 3,
      },
      android: {
        elevation: 6,
        shadowColor: 'transparent',
      },
    }),
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
