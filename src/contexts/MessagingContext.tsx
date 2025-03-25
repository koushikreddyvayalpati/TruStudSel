import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define message types
export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  lastMessage: Message;
  updatedAt: string;
}

// Define a type for user conversations
export interface ConversationWithUser extends Conversation {
  participant: {
    id: string;
    name: string;
    avatar?: string;
    status: 'online' | 'offline';
  };
}

// Context state
interface MessagingState {
  conversations: ConversationWithUser[];
  currentConversation: string | null;
  messages: Record<string, Message[]>;
  loading: boolean;
  error: Error | null;
}

// Context actions
interface MessagingActions {
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  markAsRead: (conversationId: string, messageId: string) => Promise<void>;
  setCurrentConversation: (conversationId: string | null) => void;
  fetchMessages: (conversationId: string) => Promise<void>;
  fetchConversations: () => Promise<void>;
  createConversation: (participantId: string, initialMessage: string) => Promise<string>;
  getUnreadCount: () => number;
}

// Combined context type
export type MessagingContextType = MessagingState & MessagingActions;

// Create context
const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

// Sample data for testing
const sampleCurrentUserId = '101'; // This would typically come from auth context

const sampleUsers = {
  '102': {
    id: '102',
    name: 'Fauziah',
    status: 'online',
  },
  '103': {
    id: '103',
    name: 'Nicole',
    status: 'online',
  },
  '104': {
    id: '104',
    name: 'Brian',
    status: 'offline',
  },
  '105': {
    id: '105',
    name: 'Cheng',
    status: 'offline',
  },
  '106': {
    id: '106',
    name: 'Model',
    status: 'offline',
  },
};

// Sample conversations
const sampleConversations: ConversationWithUser[] = [
  {
    id: 'conv1',
    participantIds: [sampleCurrentUserId, '102'],
    lastMessage: {
      id: 'msg101',
      senderId: '102',
      receiverId: sampleCurrentUserId,
      content: 'I will do the voice over',
      timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      isRead: false,
    },
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    participant: sampleUsers['102'] as ConversationWithUser['participant'],
  },
  {
    id: 'conv2',
    participantIds: [sampleCurrentUserId, '103'],
    lastMessage: {
      id: 'msg201',
      senderId: '103',
      receiverId: sampleCurrentUserId,
      content: 'just open la',
      timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      isRead: true,
    },
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
    participant: sampleUsers['103'] as ConversationWithUser['participant'],
  },
  {
    id: 'conv3',
    participantIds: [sampleCurrentUserId, '104'],
    lastMessage: {
      id: 'msg301',
      senderId: sampleCurrentUserId,
      receiverId: '104',
      content: 'bye',
      timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      isRead: true,
    },
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    participant: sampleUsers['104'] as ConversationWithUser['participant'],
  },
  {
    id: 'conv4',
    participantIds: [sampleCurrentUserId, '105'],
    lastMessage: {
      id: 'msg401',
      senderId: '105',
      receiverId: sampleCurrentUserId,
      content: 'call me when you get the chance',
      timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      isRead: true,
    },
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
    participant: sampleUsers['105'] as ConversationWithUser['participant'],
  },
];

// Sample messages for conversations
const sampleMessages: Record<string, Message[]> = {
  'conv1': [
    {
      id: 'msg100',
      senderId: sampleCurrentUserId,
      receiverId: '102',
      content: 'Hey, can you help with the project?',
      timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      isRead: true,
    },
    {
      id: 'msg101',
      senderId: '102',
      receiverId: sampleCurrentUserId,
      content: 'I will do the voice over',
      timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      isRead: false,
    },
  ],
  'conv2': [
    {
      id: 'msg200',
      senderId: sampleCurrentUserId,
      receiverId: '103',
      content: 'Are you available to meet?',
      timestamp: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
      isRead: true,
    },
    {
      id: 'msg201',
      senderId: '103',
      receiverId: sampleCurrentUserId,
      content: 'just open la',
      timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      isRead: true,
    },
  ],
};

// Provider component
export const MessagingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<MessagingState>({
    conversations: [],
    currentConversation: null,
    messages: {},
    loading: true,
    error: null,
  });

  // Load conversations and messages from storage on mount
  useEffect(() => {
    const loadMessagingData = async () => {
      try {
        // In a real app, you'd fetch this from a server or AsyncStorage
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate loading delay
        
        setState(prev => ({
          ...prev,
          conversations: sampleConversations,
          messages: sampleMessages,
          loading: false,
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error : new Error('Failed to load messaging data'),
        }));
      }
    };

    loadMessagingData();
  }, []);

  // Set current conversation
  const setCurrentConversation = (conversationId: string | null): void => {
    setState(prev => ({
      ...prev,
      currentConversation: conversationId,
    }));
  };

  // Send a message
  const sendMessage = async (conversationId: string, content: string): Promise<void> => {
    try {
      // In a real app, you'd send this to a server
      const conversation = state.conversations.find(c => c.id === conversationId);
      
      if (!conversation) {
        throw new Error(`Conversation with ID ${conversationId} not found`);
      }
      
      const receiverId = conversation.participantIds.find(id => id !== sampleCurrentUserId);
      
      if (!receiverId) {
        throw new Error('Receiver not found in conversation');
      }
      
      const newMessage: Message = {
        id: `msg${Date.now()}`,
        senderId: sampleCurrentUserId,
        receiverId,
        content,
        timestamp: new Date().toISOString(),
        isRead: false,
      };
      
      // Update messages for this conversation
      const updatedMessages = {
        ...state.messages,
        [conversationId]: [
          ...(state.messages[conversationId] || []),
          newMessage,
        ],
      };
      
      // Update last message in conversation
      const updatedConversations = state.conversations.map(c => 
        c.id === conversationId
          ? {
              ...c,
              lastMessage: newMessage,
              updatedAt: newMessage.timestamp,
            }
          : c
      ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
      setState(prev => ({
        ...prev,
        conversations: updatedConversations,
        messages: updatedMessages,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Failed to send message'),
      }));
    }
  };

  // Mark a message as read
  const markAsRead = async (conversationId: string, messageId: string): Promise<void> => {
    try {
      // Update the message's isRead status
      const conversationMessages = state.messages[conversationId] || [];
      
      const updatedMessages = {
        ...state.messages,
        [conversationId]: conversationMessages.map(message => 
          message.id === messageId
            ? { ...message, isRead: true }
            : message
        ),
      };
      
      // If it was the last message, update the conversation too
      const updatedConversations = state.conversations.map(c => {
        if (c.id === conversationId && c.lastMessage.id === messageId) {
          return {
            ...c,
            lastMessage: {
              ...c.lastMessage,
              isRead: true,
            },
          };
        }
        return c;
      });
      
      setState(prev => ({
        ...prev,
        conversations: updatedConversations,
        messages: updatedMessages,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Failed to mark message as read'),
      }));
    }
  };

  // Fetch messages for a conversation
  const fetchMessages = async (conversationId: string): Promise<void> => {
    try {
      // In a real app, you'd fetch from a server
      // Here we're using the sample data
      if (state.messages[conversationId]) {
        return; // Already loaded
      }
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const messages = sampleMessages[conversationId] || [];
      
      setState(prev => ({
        ...prev,
        messages: {
          ...prev.messages,
          [conversationId]: messages,
        },
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Failed to fetch messages'),
      }));
    }
  };

  // Fetch conversations
  const fetchConversations = async (): Promise<void> => {
    try {
      // In a real app, you'd fetch from a server
      setState(prev => ({
        ...prev,
        loading: true,
      }));
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setState(prev => ({
        ...prev,
        conversations: sampleConversations,
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error : new Error('Failed to fetch conversations'),
      }));
    }
  };

  // Create a new conversation
  const createConversation = async (participantId: string, initialMessage: string): Promise<string> => {
    try {
      // In a real app, you'd send this to a server
      const existingConversation = state.conversations.find(c => 
        c.participantIds.includes(sampleCurrentUserId) && 
        c.participantIds.includes(participantId)
      );
      
      if (existingConversation) {
        // If conversation already exists, just send a message
        await sendMessage(existingConversation.id, initialMessage);
        return existingConversation.id;
      }
      
      // Create a new conversation
      const newConversationId = `conv${Date.now()}`;
      
      const participant = sampleUsers[participantId] || {
        id: participantId,
        name: `User ${participantId}`,
        status: 'offline',
      };
      
      const newMessage: Message = {
        id: `msg${Date.now()}`,
        senderId: sampleCurrentUserId,
        receiverId: participantId,
        content: initialMessage,
        timestamp: new Date().toISOString(),
        isRead: false,
      };
      
      const newConversation: ConversationWithUser = {
        id: newConversationId,
        participantIds: [sampleCurrentUserId, participantId],
        lastMessage: newMessage,
        updatedAt: newMessage.timestamp,
        participant: participant as ConversationWithUser['participant'],
      };
      
      // Update state
      setState(prev => ({
        ...prev,
        conversations: [newConversation, ...prev.conversations],
        messages: {
          ...prev.messages,
          [newConversationId]: [newMessage],
        },
        currentConversation: newConversationId,
      }));
      
      return newConversationId;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Failed to create conversation'),
      }));
      throw error;
    }
  };

  // Get total unread message count
  const getUnreadCount = (): number => {
    return state.conversations.reduce((count, conversation) => {
      if (conversation.lastMessage.receiverId === sampleCurrentUserId && !conversation.lastMessage.isRead) {
        return count + 1;
      }
      return count;
    }, 0);
  };

  return (
    <MessagingContext.Provider value={{
      ...state,
      sendMessage,
      markAsRead,
      setCurrentConversation,
      fetchMessages,
      fetchConversations,
      createConversation,
      getUnreadCount,
    }}>
      {children}
    </MessagingContext.Provider>
  );
};

// Custom hook for using the messaging context
export const useMessaging = (): MessagingContextType => {
  const context = useContext(MessagingContext);
  if (context === undefined) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
};

export default MessagingContext; 