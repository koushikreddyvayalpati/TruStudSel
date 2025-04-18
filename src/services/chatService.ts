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
      email: user.attributes.email,
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
    if (!user) {throw new Error('User not authenticated');}

    console.log('Current user:', user);

    // We'll query for conversations where the user's ID is in the participants
    // OR where the conversation ID contains the user's email (older style)
    const filter = {
      or: [
        { participants: { contains: user.id } },
        ...(user.email ? [{ id: { contains: user.email } }] : []),
      ],
    };

    console.log('[chatService] getConversations - Executing GraphQL query with filter:', filter);
    console.log('[chatService] getConversations - User ID being searched for:', user.id);
    if (user.email) {
      console.log('[chatService] getConversations - Also searching for email in ID:', user.email);
    }

    const result = await API.graphql(
      graphqlOperation(queries.listConversations, { filter })
    );

    console.log('[chatService] getConversations - Query result:', JSON.stringify(result, null, 2));

    // Log the items structure
    if (result && result.data && result.data.listConversations) {
      const items = result.data.listConversations.items;
      console.log('[chatService] getConversations - Found items:', items.length);
      items.forEach((conversation: Conversation, index: number) => {
        console.log(`[chatService] getConversations - Conversation ${index}:`, {
          id: conversation.id,
          name: conversation.name,
          participants: conversation.participants,
          lastMessageTime: conversation.lastMessageTime,
        });
      });

      // Deduplicate conversations - if we have multiple conversations with the same person
      // (due to email vs ID issues), keep only the most recent one
      const deduplicatedItems = dedupConversationsByParticipant(items, user.id, user.email);
      console.log('[chatService] getConversations - After deduplication:', deduplicatedItems.length);

      // @ts-ignore - API.graphql return type is complex
      return deduplicatedItems;
    } else {
      console.log('[chatService] getConversations - No items found in result');
    }

    // @ts-ignore - API.graphql return type is complex
    return result.data.listConversations.items;
  } catch (error) {
    console.error('[chatService] Error fetching conversations:', error);
    return [];
  }
};

/**
 * Helper function to deduplicate conversations
 * This helps when we have conversations both by user ID and email
 */
function dedupConversationsByParticipant(
  conversations: Conversation[],
  userId: string,
  userEmail?: string
): Conversation[] {
  // Map to track other participants and their most recent conversation
  const otherParticipantMap = new Map<string, {
    conversation: Conversation,
    lastMessageTime: number
  }>();

  // Process each conversation
  conversations.forEach(conversation => {
    // Find the other participant (not the current user)
    const otherParticipants = conversation.participants.filter(
      p => p !== userId && (userEmail ? p !== userEmail : true)
    );

    if (otherParticipants.length === 0) {
      // This might be a conversation with self or a group chat
      return;
    }

    // Use the first other participant as the key
    const otherParticipant = otherParticipants[0];
    const lastMessageTime = conversation.lastMessageTime
      ? new Date(conversation.lastMessageTime).getTime()
      : 0;

    console.log(`[chatService] Checking conversation with ${otherParticipant}:`, {
      id: conversation.id,
      lastMessageTime,
    });

    // If we haven't seen this participant before, or if this conversation is more recent
    const existing = otherParticipantMap.get(otherParticipant);
    if (!existing || lastMessageTime > existing.lastMessageTime) {
      otherParticipantMap.set(otherParticipant, {
        conversation,
        lastMessageTime,
      });
      console.log(`[chatService] Using conversation ${conversation.id} for ${otherParticipant}`);
    }
  });

  // Extract the most recent conversations
  const deduplicatedConversations = Array.from(otherParticipantMap.values()).map(v => v.conversation);

  // Special case: if no other participants found (self conversations or problematic data)
  // just return the original array
  return deduplicatedConversations.length > 0 ? deduplicatedConversations : conversations;
}

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
    if (!currentUser) {throw new Error('User not authenticated');}

    console.log('[chatService] getOrCreateConversation - Parameters:', {
      currentUserId: currentUser.id,
      otherUserId,
      otherUserName,
      productId,
      productName,
    });

    // Check if otherUserId looks like an email - if so, we need to try to lookup the user ID
    let actualOtherUserId = otherUserId;
    if (otherUserId.includes('@')) {
      console.log('[chatService] getOrCreateConversation - otherUserId appears to be an email, searching for existing conversations with this email...');

      // Look for existing conversations where this email is a participant
      const existingConversations = await getConversations();

      // Try to find a conversation where the other participant matches this email or has it in the ID
      const matchingConversation = existingConversations.find(conv => {
        // Find the other participant (not the current user)
        const otherParticipant = conv.participants.find(p => p !== currentUser.id);
        return otherParticipant === otherUserId || // Exact match
               conv.id.includes(otherUserId); // ID contains the email
      });

      if (matchingConversation) {
        console.log('[chatService] getOrCreateConversation - Found existing conversation with this email:', matchingConversation.id);
        const extractedOtherId = matchingConversation.participants.find(p => p !== currentUser.id);
        if (extractedOtherId) {
          actualOtherUserId = extractedOtherId;
          console.log('[chatService] getOrCreateConversation - Using extracted user ID:', actualOtherUserId);
        }
      } else {
        console.log('[chatService] getOrCreateConversation - No existing conversation found with this email, keeping email as ID');
      }
    }

    // For consistent conversation IDs between users, we need to normalize participants
    // - Ensure current user is represented by ID (not email)
    // - If other user's ID is known, use it; otherwise use email
    const normalizedParticipants = [currentUser.id];

    // Add the other participant - either their ID or email
    normalizedParticipants.push(actualOtherUserId);

    // Sort participants to ensure consistent conversation ID
    const participants = normalizedParticipants.sort();
    const conversationId = participants.join('_');
    console.log('[chatService] getOrCreateConversation - Normalized participants:', participants);
    console.log('[chatService] getOrCreateConversation - Generated conversationId:', conversationId);

    // Try to fetch existing conversation
    console.log('[chatService] getOrCreateConversation - Checking if conversation exists...');
    const existingConversation = await getConversation(conversationId);

    if (existingConversation) {
      console.log('[chatService] getOrCreateConversation - Found existing conversation:', {
        id: existingConversation.id,
        name: existingConversation.name,
        participants: existingConversation.participants,
      });
      return existingConversation;
    }

    // If not found, create a new conversation
    console.log('[chatService] getOrCreateConversation - No existing conversation found, creating new one');
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

    console.log('[chatService] getOrCreateConversation - Creating with input:', conversationInput);

    const result = await API.graphql(
      graphqlOperation(mutations.createConversation, { input: conversationInput })
    );

    console.log('[chatService] getOrCreateConversation - Creation result:', result);

    // @ts-ignore - API.graphql return type is complex
    return result.data.createConversation;
  } catch (error) {
    console.error('[chatService] Error in getOrCreateConversation:', error);
    throw error;
  }
};

/**
 * Get messages for a conversation
 */
export const getMessages = async (conversationId: string): Promise<Message[]> => {
  try {
    console.log('[chatService] Fetching messages for conversation:', conversationId);

    const result = await API.graphql(
      graphqlOperation(queries.messagesByConversationIdAndCreatedAt, {
        conversationId,
        sortDirection: 'ASC',
        limit: 100,
      })
    );

    console.log('[chatService] Messages fetched:', result);

    // @ts-ignore - API.graphql return type is complex
    return result.data.messagesByConversationIdAndCreatedAt.items;
  } catch (error) {
    console.error('[chatService] Error fetching messages:', error);
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
    if (!currentUser) {throw new Error('User not authenticated');}

    console.log('[chatService] Sending message:', {
      conversationId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      content,
    });

    const messageInput = {
      id: uuidv4(),
      conversationId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      content,
      status: MessageStatus.SENT,
      createdAt: new Date().toISOString(),
    };

    const result = await API.graphql(
      graphqlOperation(mutations.createMessage, { input: messageInput })
    );

    console.log('[chatService] Message sent successfully:', result);

    // Try to update conversation with last message
    try {
      await API.graphql(
        graphqlOperation(mutations.updateConversation, {
          input: {
            id: conversationId,
            lastMessageContent: content,
            lastMessageTime: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        })
      );
    } catch (updateError) {
      // This is expected for recipients (non-owners) of conversations
      // For now, we'll log it but continue - the message was still sent successfully
      console.log('[chatService] Note: Could not update conversation metadata (normal for recipients):', updateError);

      // In a production app, we could implement a lambda trigger or server function
      // to allow both parties to update conversation metadata regardless of ownership
    }

    // @ts-ignore - API.graphql return type is complex
    return result.data.createMessage;
  } catch (error) {
    console.error('[chatService] Error sending message:', error);
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
          updatedAt: new Date().toISOString(),
        },
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
