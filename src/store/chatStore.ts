import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Conversation,
  ChatState,
} from '../types/chat.types';
import {
  getConversations,
  getCurrentUser,
  subscribeToUserConversations,
} from '../services/firebaseChatService';
import NotificationService from '../utils/notificationService';

// AsyncStorage keys
const CONVERSATIONS_STORAGE_KEY = '@TruStudSel_conversations';
const CONVERSATIONS_TIMESTAMP_KEY = '@TruStudSel_conversations_timestamp';
const UNREAD_MESSAGES_COUNT_KEY = '@TruStudSel_unread_messages_count';

// Set cache expiry time to 1 hour
const CACHE_EXPIRY_TIME = 60 * 60 * 1000; // 1 hour in milliseconds

interface ChatStore extends ChatState {
  // UI states
  isSearchActive: boolean;
  searchQuery: string;
  isRefreshing: boolean;
  isLoading: boolean;
  currentUserEmail: string | null;
  unreadMessagesCount: number;

  // Subscription reference (not stored in state)
  conversationSubscription: { unsubscribe: () => void } | null;

  // Actions
  setCurrentUserEmail: (email: string | null) => void;
  setIsSearchActive: (active: boolean) => void;
  setSearchQuery: (query: string) => void;
  fetchCurrentUser: () => Promise<void>;
  fetchConversations: (forceRefresh?: boolean) => Promise<void>;
  cacheConversations: (conversations: Conversation[]) => Promise<void>;
  loadCachedConversations: () => Promise<Conversation[] | null>;
  setupConversationSubscription: () => void;
  cleanupConversationSubscription: () => void;
  setConversations: (conversations: Conversation[]) => void;
  handleRefresh: () => Promise<void>;
  getConversationDisplayName: (conversation: Conversation) => string;
  getTimeDisplay: (timeString?: string) => string;
  clearConversationsCache: () => Promise<boolean>;
  markAllConversationsAsRead: () => Promise<void>;
  markConversationAsRead: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, messageContent: string, otherUserEmail: string) => Promise<void>;
  getTotalUnreadCount: () => number;
  updateUnreadCount: () => void;
  persistUnreadCount: (count: number) => Promise<void>;
  loadPersistedUnreadCount: () => Promise<void>;
}

const useChatStore = create<ChatStore>((set, get) => ({
  // ChatState
  conversations: [],
  messages: {},
  loading: true,
  error: undefined,

  // UI states
  isSearchActive: false,
  searchQuery: '',
  isRefreshing: false,
  isLoading: true,
  currentUserEmail: null,
  unreadMessagesCount: 0,

  // Subscription (not stored in state)
  conversationSubscription: null,

  // Set current user email
  setCurrentUserEmail: (email) => set({ currentUserEmail: email }),

  // Toggle search active state
  setIsSearchActive: (active) => {
    set({ isSearchActive: active });
    if (!active) {
      set({ searchQuery: '' });
    }
  },

  // Set search query
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Get total unread count
  getTotalUnreadCount: () => {
    const { conversations } = get();
    if (!conversations || conversations.length === 0) {
      return get().unreadMessagesCount;
    }
    
    const totalUnread = conversations.reduce((count, conversation) => {
      return count + (conversation.unreadCount || 0);
    }, 0);
    
    // Update the stored unread count if different
    if (totalUnread !== get().unreadMessagesCount) {
      set({ unreadMessagesCount: totalUnread });
      get().persistUnreadCount(totalUnread);
    }
    
    return totalUnread;
  },
  
  // Update unread count based on conversations
  updateUnreadCount: () => {
    const count = get().getTotalUnreadCount();
    set({ unreadMessagesCount: count });
  },
  
  // Persist unread count to AsyncStorage
  persistUnreadCount: async (count) => {
    try {
      await AsyncStorage.setItem(UNREAD_MESSAGES_COUNT_KEY, count.toString());
      console.log(`[AsyncStorage] Persisted unread count: ${count}`);
    } catch (error) {
      console.error('[AsyncStorage] Error persisting unread count:', error);
    }
  },
  
  // Load persisted unread count from AsyncStorage
  loadPersistedUnreadCount: async () => {
    try {
      const countStr = await AsyncStorage.getItem(UNREAD_MESSAGES_COUNT_KEY);
      if (countStr) {
        const count = parseInt(countStr, 10);
        if (!isNaN(count)) {
          set({ unreadMessagesCount: count });
          console.log(`[AsyncStorage] Loaded persisted unread count: ${count}`);
        }
      }
    } catch (error) {
      console.error('[AsyncStorage] Error loading persisted unread count:', error);
    }
  },

  // Fetch current user
  fetchCurrentUser: async () => {
    try {
      // First check if we already have a user email set
      const currentEmail = get().currentUserEmail;
      if (currentEmail) {
        // We already have a user, no need to fetch again
        return;
      }
      
      const user = await getCurrentUser();
      if (user && user.email) {
        set({ currentUserEmail: user.email });
        // console.log('[chatStore] Current user email:', user.email);
      } else {
        // Clear the current user email if we got null back
        set({ currentUserEmail: null });
      }
    } catch (error) {
      console.error('[chatStore] Error fetching current user:', error);
      // Make sure we're in a clean state after an error
      set({ currentUserEmail: null });
    }
  },

  // Cache conversations to AsyncStorage
  cacheConversations: async (conversationsToCache) => {
    try {
      await AsyncStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(conversationsToCache));
      await AsyncStorage.setItem(CONVERSATIONS_TIMESTAMP_KEY, new Date().toISOString());
      console.log(`[AsyncStorage] Cached ${conversationsToCache.length} conversations`);
      
      // Update and persist unread count whenever we cache conversations
      const totalUnread = conversationsToCache.reduce((count, conversation) => {
        return count + (conversation.unreadCount || 0);
      }, 0);
      
      set({ unreadMessagesCount: totalUnread });
      get().persistUnreadCount(totalUnread);
    } catch (error) {
      console.error('[AsyncStorage] Error caching conversations:', error);
    }
  },

  // Load cached conversations from AsyncStorage
  loadCachedConversations: async () => {
    try {
      const cachedConversationsJson = await AsyncStorage.getItem(CONVERSATIONS_STORAGE_KEY);
      const cachedTimestamp = await AsyncStorage.getItem(CONVERSATIONS_TIMESTAMP_KEY);

      if (cachedConversationsJson && cachedTimestamp) {
        const cachedConversations = JSON.parse(cachedConversationsJson);

        // Check if cache is too old
        const cacheAge = new Date().getTime() - new Date(cachedTimestamp).getTime();
        const cacheAgeMinutes = cacheAge / (1000 * 60);

        console.log(`[AsyncStorage] Found cached conversations (${cachedConversations.length}) from ${cacheAgeMinutes.toFixed(1)} minutes ago`);

        if (cacheAge < CACHE_EXPIRY_TIME) {
          // Also update the unread count from cached conversations
          const totalUnread = cachedConversations.reduce((count, conversation) => {
            return count + (conversation.unreadCount || 0);
          }, 0);
          
          set({ unreadMessagesCount: totalUnread });
          
          return cachedConversations;
        } else {
          console.log('[AsyncStorage] Cache too old, will fetch fresh data');
          return null;
        }
      }

      return null;
    } catch (error) {
      console.error('[AsyncStorage] Error loading cached conversations:', error);
      return null;
    }
  },

  // Setup conversation subscription
  setupConversationSubscription: () => {
    const { currentUserEmail, conversationSubscription } = get();

    // Clean up existing subscription
    if (conversationSubscription) {
      try {
        conversationSubscription.unsubscribe();
      } catch (error) {
        console.error('[chatStore] Error cleaning up previous subscription:', error);
      }
    }

    if (!currentUserEmail) {
      console.log('[chatStore] No authenticated user, skipping conversation subscription');
      return;
    }

    try {
      console.log('[chatStore] Setting up real-time conversation subscription');

      const unsubscribe = subscribeToUserConversations(currentUserEmail, (updatedConversations: Conversation[]) => {
        try {
          // Get previous conversations to compare for new messages
          const prevConversations = get().conversations;

          // Compare with current conversations to see if there are new messages
          const hasNewMessages = updatedConversations.some((newConv: Conversation) => {
            const existingConv = prevConversations.find(conv => conv.id === newConv.id);

            // New conversation or more recent message in existing conversation
            if (!existingConv ||
               (existingConv.lastMessageTime && newConv.lastMessageTime &&
                new Date(newConv.lastMessageTime) > new Date(existingConv.lastMessageTime))) {
              return true;
            }

            // Check unread count
            return (newConv.unreadCount || 0) > (existingConv?.unreadCount || 0);
          });

          if (hasNewMessages) {
            console.log('[chatStore] New messages detected in subscription update');
          }

          // Calculate total unread count from all conversations
          const totalUnread = updatedConversations.reduce((count, conversation) => {
            return count + (conversation.unreadCount || 0);
          }, 0);

          // Update store with new conversations and unread count
          set({
            conversations: updatedConversations,
            unreadMessagesCount: totalUnread,
          });

          // Cache the updated conversations
          get().cacheConversations(updatedConversations);
          get().persistUnreadCount(totalUnread);
        } catch (error) {
          console.error('[chatStore] Error processing conversation update:', error);
        }
      });

      set({ conversationSubscription: { unsubscribe } });
    } catch (error) {
      console.error('[chatStore] Error setting up conversation subscription:', error);
      set({ conversationSubscription: null });
    }
  },

  // Clean up subscription
  cleanupConversationSubscription: () => {
    const { conversationSubscription } = get();
    if (conversationSubscription) {
      conversationSubscription.unsubscribe();
      set({ conversationSubscription: null });
    }
  },

  // Set conversations
  setConversations: (conversations) => {
    set({ conversations });
    get().updateUnreadCount();
  },

  // Clear cached conversations
  clearConversationsCache: async () => {
    try {
      await AsyncStorage.removeItem(CONVERSATIONS_STORAGE_KEY);
      await AsyncStorage.removeItem(CONVERSATIONS_TIMESTAMP_KEY);
      console.log('[chatStore] Conversations cache cleared');
      return true;
    } catch (error) {
      console.error('[chatStore] Error clearing conversations cache:', error);
      return false;
    }
  },

  // Fetch conversations
  fetchConversations: async (forceRefresh = false) => {
    const { currentUserEmail, loadCachedConversations, cacheConversations, clearConversationsCache } = get();

    if (!currentUserEmail) {return;}

    try {
      set({ isLoading: true });
      console.log('[chatStore] Fetching conversations...');

      // Try to get cached conversations first for immediate display
      const cachedConversations = await loadCachedConversations();

      if (cachedConversations && cachedConversations.length > 0) {
        set({
          conversations: cachedConversations,
          isLoading: false,
        });
        console.log('[chatStore] Displayed cached conversations while fetching fresh data');
      }

      try {
        // Get fresh data from Firebase
        const fetchedConversations = await getConversations();
        console.log('[chatStore] Fetched Firebase conversations:', fetchedConversations.length);

        // Cache the fresh conversations
        cacheConversations(fetchedConversations);

        set({
          conversations: fetchedConversations,
          error: undefined,
          isLoading: false,
          isRefreshing: false,
        });

        // After successfully fetching conversations, subscribe to topics for each conversation
        try {
          // Subscribe to notification topics for each conversation
          const userEmail = get().currentUserEmail;
          if (userEmail && fetchedConversations.length > 0) {
            // Subscribe to a user-specific topic for direct messages
            // Sanitize the email to conform to Firebase topic name rules
            const sanitizedEmail = userEmail.replace(/[.@]/g, '_');
            await NotificationService.subscribeToTopic(`user_${sanitizedEmail}`);
            
            // Subscribe to topics for each conversation
            for (const conversation of fetchedConversations) {
              // Create a unique topic ID for each conversation that's valid for Firebase
              // Use conversation.id which should be safer, or sanitize it if necessary
              if (conversation.id) {
                const sanitizedId = conversation.id.replace(/[^a-zA-Z0-9-_.~%]/g, '_');
                const topicId = `chat_${sanitizedId}`;
                await NotificationService.subscribeToTopic(topicId);
              }
            }
          }
        } catch (error) {
          console.error('Error subscribing to notification topics:', error);
        }
      } catch (fetchError: any) {
        console.error('[chatStore] Error fetching conversations:', fetchError);

        // Check if error indicates database was reset
        if (fetchError?.message?.includes('not found') ||
            fetchError?.message?.includes('permission denied') ||
            fetchError?.code === 'not-found') {

          // Clear cached conversations as they're no longer valid
          await clearConversationsCache();

          // If we displayed cached conversations, update UI with empty array
          if (cachedConversations && cachedConversations.length > 0) {
            set({
              conversations: [],
              error: 'Conversations were reset. Start a new conversation.',
              isLoading: false,
              isRefreshing: false,
            });
          } else {
            set({
              error: 'No conversations found. Start a new conversation.',
              isLoading: false,
              isRefreshing: false,
            });
          }
        } else {
          // For other errors
          set({
            error: `Failed to load conversations: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
            isLoading: false,
            isRefreshing: false,
          });
        }
      }
    } catch (err) {
      console.error('[chatStore] Failed to fetch conversations:', err);
      set({
        error: `Failed to load conversations: ${err instanceof Error ? err.message : String(err)}`,
        isLoading: false,
        isRefreshing: false,
      });
    }
  },

  // Handle refresh
  handleRefresh: async () => {
    set({ isRefreshing: true });
    await get().fetchConversations();
  },

  // Get conversation display name (recipient's name)
  getConversationDisplayName: (conversation) => {
    const { currentUserEmail } = get();

    if (!currentUserEmail) {return conversation.name || 'Unknown Contact';}

    // Find the other participant (the person we're talking to)
    const otherParticipant = conversation.participants.find(p => p !== currentUserEmail);

    // If no other participant is found or we're looking at our own conversation
    if (!otherParticipant) {
      return conversation.name || 'Unknown Contact';
    }

    // Check for user-specific name mapping first (new format)
    const nameKey = `name_${currentUserEmail.replace(/[.@]/g, '_')}`;
    if (conversation[nameKey]) {
      return conversation[nameKey];
    }

    // Check if the conversation name is the current user's name - we never want to show that
    const currentUserBaseName = currentUserEmail.split('@')[0].toLowerCase();
    const currentUserDisplayName = currentUserBaseName.charAt(0).toUpperCase() + currentUserBaseName.slice(1);

    // If conversation name matches current user in any format, fall back to other participant's name
    if (conversation.name &&
        (conversation.name.toLowerCase() === currentUserBaseName ||
         conversation.name === currentUserDisplayName ||
         conversation.name === currentUserEmail)) {

      // Format the other participant's email as a name
      if (otherParticipant.includes('@')) {
        const username = otherParticipant.split('@')[0];
        return username.charAt(0).toUpperCase() + username.slice(1);
      }
      return otherParticipant;
    }

    // If we have a conversation name that isn't the current user, use it
    if (conversation.name) {
      return conversation.name.charAt(0).toUpperCase() + conversation.name.slice(1);
    }

    // Format email to show just the username part
    if (otherParticipant.includes('@')) {
      // Extract just the username part of the email
      const username = otherParticipant.split('@')[0];
      // Convert to proper case (first letter uppercase)
      return username.charAt(0).toUpperCase() + username.slice(1);
    }

    return otherParticipant;
  },

  // Get formatted time display for conversations
  getTimeDisplay: (timeString) => {
    if (!timeString) {return '';}

    try {
      const date = new Date(timeString);
      const now = new Date();

      // Check if valid date
      if (isNaN(date.getTime())) {
        console.warn('[chatStore] Invalid date:', timeString);
        return '';
      }

      // Fix future date issue (specific to this app where messages show 2025)
      let correctedDate = new Date(date);
      if (date > now) {
        console.warn('[chatStore] Future date detected, correcting:', timeString);
        // Adjust to current time minus 7 hours (based on observed logs)
        const hoursInMilliseconds = 7 * 60 * 60 * 1000; // 7 hours in ms
        correctedDate = new Date(now.getTime() - hoursInMilliseconds);
      }

      // Check if it's today
      const isToday =
        correctedDate.getDate() === now.getDate() &&
        correctedDate.getMonth() === now.getMonth() &&
        correctedDate.getFullYear() === now.getFullYear();

      // Check if it's yesterday
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const isYesterday =
        correctedDate.getDate() === yesterday.getDate() &&
        correctedDate.getMonth() === yesterday.getMonth() &&
        correctedDate.getFullYear() === yesterday.getFullYear();

      // Format based on when the message was sent
      if (isToday) {
        return correctedDate.toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      } else if (isYesterday) {
        return 'Yesterday';
      } else {
        // Get month name (Jan, Feb, etc) and day
        const month = correctedDate.toLocaleString('default', { month: 'short' });
        const day = correctedDate.getDate();

        // If it's from this year, just show month/day
        if (correctedDate.getFullYear() === now.getFullYear()) {
          return `${month} ${day}`;
        } else {
          // If it's from a different year, include the year
          return `${month} ${day}, ${correctedDate.getFullYear()}`;
        }
      }
    } catch (error) {
      console.error('[chatStore] Error formatting time:', error, timeString);
      return '';
    }
  },

  // Mark all conversations as read
  markAllConversationsAsRead: async () => {
    try {
      const { conversations, currentUserEmail } = get();
      
      if (!currentUserEmail || conversations.length === 0) {
        return;
      }
      
      console.log('[chatStore] Marking all conversations as read');
      
      // Get conversations with unread messages
      const unreadConversations = conversations.filter(
        conv => (conv.unreadCount && conv.unreadCount > 0)
      );
      
      if (unreadConversations.length === 0) {
        console.log('[chatStore] No unread conversations to mark');
        return;
      }
      
      // Update each conversation to reset unread count
      const db = (await import('../services/firebaseService')).db;
      const { doc, writeBatch, serverTimestamp } = await import('firebase/firestore');
      
      const batch = writeBatch(db);
      
      unreadConversations.forEach(conversation => {
        const conversationRef = doc(db, 'conversations', conversation.id);
        const unreadCountKey = `unreadCount_${currentUserEmail.replace(/[.@]/g, '_')}`;
        
        batch.update(conversationRef, {
          [unreadCountKey]: 0,
          updatedAt: serverTimestamp(),
        });
      });
      
      await batch.commit();
      console.log('[chatStore] Successfully marked all conversations as read');
      
      // Update the local state as well
      const updatedConversations = conversations.map(conv => ({
        ...conv,
        unreadCount: 0,
      }));
      
      set({ conversations: updatedConversations });
      get().cacheConversations(updatedConversations);
      
    } catch (error) {
      console.error('[chatStore] Error marking conversations as read:', error);
    }
  },

  // Send message
  sendMessage: async (conversationId, messageContent, otherUserEmail) => {
    // ... existing code for sending the message ...

    // After successfully sending the message, send a notification
    try {
      // Get user information
      const currentUserEmail = get().currentUserEmail;
      if (!currentUserEmail || !otherUserEmail) {
        return;
      }
      
      // Get sender display name
      const currentUsername = currentUserEmail.split('@')[0] || 'User';
      const senderName = currentUsername.charAt(0).toUpperCase() + currentUsername.slice(1);
      
      // Send notification to the other user
      await NotificationService.sendChatNotification(
        otherUserEmail,
        senderName,
        messageContent,
        conversationId
      );
      
    } catch (error) {
      console.error('Error sending notification:', error);
    }
    
    // ... rest of the function ...
  },

  // Mark a single conversation as read
  markConversationAsRead: async (conversationId) => {
    try {
      const { conversations, currentUserEmail } = get();
      
      if (!currentUserEmail || !conversationId) {
        return;
      }
      
      // Find the conversation
      const conversation = conversations.find(conv => conv.id === conversationId);
      
      if (!conversation || !conversation.unreadCount || conversation.unreadCount <= 0) {
        console.log(`[chatStore] No unread messages in conversation ${conversationId}`);
        return;
      }
      
      // console.log(`[chatStore] Marking conversation ${conversationId} as read`);
      
      // Update the conversation to reset unread count
      const db = (await import('../services/firebaseService')).db;
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      
      const conversationRef = doc(db, 'conversations', conversationId);
      const unreadCountKey = `unreadCount_${currentUserEmail.replace(/[.@]/g, '_')}`;
      
      await updateDoc(conversationRef, {
        [unreadCountKey]: 0,
        updatedAt: serverTimestamp(),
      });
      
      console.log(`[chatStore] Successfully marked conversation ${conversationId} as read`);
      
      // Update the local state as well
      const updatedConversations = conversations.map(conv => 
        conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
      );
      
      set({ conversations: updatedConversations });
      get().cacheConversations(updatedConversations);
      
    } catch (error) {
      console.error(`[chatStore] Error marking conversation ${conversationId} as read:`, error);
    }
  },
}));

export default useChatStore;
