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

// AsyncStorage keys
const CONVERSATIONS_STORAGE_KEY = '@TruStudSel_conversations';
const CONVERSATIONS_TIMESTAMP_KEY = '@TruStudSel_conversations_timestamp';

// Set cache expiry time to 1 hour
const CACHE_EXPIRY_TIME = 60 * 60 * 1000; // 1 hour in milliseconds

interface ChatStore extends ChatState {
  // UI states
  isSearchActive: boolean;
  searchQuery: string;
  isRefreshing: boolean;
  isLoading: boolean;
  currentUserEmail: string | null;

  // Subscription reference (not stored in state)
  conversationSubscription: { unsubscribe: () => void } | null;

  // Actions
  setCurrentUserEmail: (email: string | null) => void;
  setIsSearchActive: (active: boolean) => void;
  setSearchQuery: (query: string) => void;
  fetchCurrentUser: () => Promise<void>;
  fetchConversations: () => Promise<void>;
  cacheConversations: (conversations: Conversation[]) => Promise<void>;
  loadCachedConversations: () => Promise<Conversation[] | null>;
  setupConversationSubscription: () => void;
  cleanupConversationSubscription: () => void;
  setConversations: (conversations: Conversation[]) => void;
  handleRefresh: () => Promise<void>;
  getConversationDisplayName: (conversation: Conversation) => string;
  getTimeDisplay: (timeString?: string) => string;
  clearConversationsCache: () => Promise<boolean>;
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

  // Fetch current user
  fetchCurrentUser: async () => {
    try {
      const user = await getCurrentUser();
      if (user && user.email) {
        set({ currentUserEmail: user.email });
        console.log('[chatStore] Current user email:', user.email);
      }
    } catch (error) {
      console.error('[chatStore] Error fetching current user:', error);
    }
  },

  // Cache conversations to AsyncStorage
  cacheConversations: async (conversationsToCache) => {
    try {
      await AsyncStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(conversationsToCache));
      await AsyncStorage.setItem(CONVERSATIONS_TIMESTAMP_KEY, new Date().toISOString());
      console.log(`[AsyncStorage] Cached ${conversationsToCache.length} conversations`);
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
      conversationSubscription.unsubscribe();
    }

    if (!currentUserEmail) {return;}

    try {
      console.log('[chatStore] Setting up real-time conversation subscription');

      const unsubscribe = subscribeToUserConversations(currentUserEmail, (updatedConversations: Conversation[]) => {
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

        // Update state and cache
        set({ conversations: updatedConversations });
        get().cacheConversations(updatedConversations);
      });

      set({ conversationSubscription: { unsubscribe } });
    } catch (error) {
      console.error('[chatStore] Error setting up conversation subscription:', error);
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
  setConversations: (conversations) => set({ conversations }),

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
  fetchConversations: async () => {
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
}));

export default useChatStore;
