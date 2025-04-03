import { API, graphqlOperation, Auth } from 'aws-amplify';
import { Observable } from 'zen-observable-ts';
import { v4 as uuidv4 } from 'uuid';
import { Conversation, Message, MessageStatus } from '../types/chat.types';
import * as queries from '../graphql/queries';
import * as mutations from '../graphql/mutations';
import * as subscriptions from '../graphql/subscriptions';

/**
 * Get the current authenticated user
 */
export const getCurrentUser = async () => {
  try {
    const user = await Auth.currentAuthenticatedUser();
    return {
      id: user.attributes.sub,
      username: user.username,
      name: user.attributes.name || user.username,
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

/**
 * Get all conversations for the current user
 */
export const getConversations = async (): Promise<Conversation[]> => {
  try {
    console.log('API configuration:', API.configure);
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    console.log('Current user:', user);

    const filter = {
      participants: { contains: user.id }
    };

    console.log('Executing GraphQL query with filter:', filter);
    const result = await API.graphql(
      graphqlOperation(queries.listConversations, { filter })
    );
    
    console.log('Query result:', result);

    // @ts-ignore - API.graphql return type is complex
    return result.data.listConversations.items;
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return [];
  }
};

/**
 * Get a specific conversation by ID
 */
export const getConversation = async (conversationId: string): Promise<Conversation | null> => {
  try {
    const result = await API.graphql(
      graphqlOperation(queries.getConversation, { id: conversationId })
    );

    // @ts-ignore - API.graphql return type is complex
    return result.data.getConversation;
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return null;
  }
};

/**
 * Get or create a conversation between two users
 */
export const getOrCreateConversation = async (
  otherUserId: string,
  otherUserName: string,
  productId?: string,
  productName?: string
): Promise<Conversation> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    // Sort participants to ensure consistent conversation ID
    const participants = [currentUser.id, otherUserId].sort();
    const conversationId = participants.join('_');

    // Try to fetch existing conversation
    const existingConversation = await getConversation(conversationId);
    if (existingConversation) {
      return existingConversation;
    }

    // If not found, create a new conversation
    const conversationName = otherUserName || 'New Conversation';
    const conversationInput = {
      id: conversationId,
      name: conversationName,
      participants,
      productId,
      productName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await API.graphql(
      graphqlOperation(mutations.createConversation, { input: conversationInput })
    );

    // @ts-ignore - API.graphql return type is complex
    return result.data.createConversation;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
};

/**
 * Get messages for a conversation
 */
export const getMessages = async (conversationId: string): Promise<Message[]> => {
  try {
    const result = await API.graphql(
      graphqlOperation(queries.messagesByConversationIdAndCreatedAt, {
        conversationId,
        sortDirection: 'ASC',
        limit: 100,
      })
    );

    // @ts-ignore - API.graphql return type is complex
    return result.data.messagesByConversationIdAndCreatedAt.items;
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
};

/**
 * Send a message in a conversation
 */
export const sendMessage = async (
  conversationId: string,
  content: string
): Promise<Message | null> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    const messageInput = {
      id: uuidv4(),
      conversationId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      content,
      status: MessageStatus.SENT,
      createdAt: new Date().toISOString()
    };

    const result = await API.graphql(
      graphqlOperation(mutations.createMessage, { input: messageInput })
    );

    // Update conversation with last message
    await API.graphql(
      graphqlOperation(mutations.updateConversation, {
        input: {
          id: conversationId,
          lastMessageContent: content,
          lastMessageTime: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      })
    );

    // @ts-ignore - API.graphql return type is complex
    return result.data.createMessage;
  } catch (error) {
    console.error('Error sending message:', error);
    return null;
  }
};

/**
 * Update message status (sent, delivered, read)
 */
export const updateMessageStatus = async (
  messageId: string,
  conversationId: string,
  status: MessageStatus
): Promise<boolean> => {
  try {
    await API.graphql(
      graphqlOperation(mutations.updateMessage, {
        input: {
          id: messageId,
          conversationId,
          status,
          updatedAt: new Date().toISOString()
        }
      })
    );
    return true;
  } catch (error) {
    console.error('Error updating message status:', error);
    return false;
  }
};

/**
 * Subscribe to new messages in a conversation
 */
export const subscribeToMessages = (
  conversationId: string,
  onMessageReceived: (message: Message) => void
): { unsubscribe: () => void } => {
  try {
    const subscription = API.graphql(
      graphqlOperation(subscriptions.onCreateMessageByConversationId, {
        conversationId,
      })
    ) as Observable<any>;

    const subscriber = subscription.subscribe({
      next: (result) => {
        const message = result.value.data.onCreateMessageByConversationId;
        if (message) {
          onMessageReceived(message);
        }
      },
      error: (error) => console.error('Subscription error:', error),
    });

    return {
      unsubscribe: () => subscriber.unsubscribe(),
    };
  } catch (error) {
    console.error('Error creating subscription:', error);
    return {
      unsubscribe: () => {},
    };
  }
}; 