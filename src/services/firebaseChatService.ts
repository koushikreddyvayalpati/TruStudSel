import { 
  collection, 
  getDocs, 
  getDoc,
  doc, 
  query, 
  where, 
  orderBy, 
  updateDoc,
  onSnapshot,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { db } from './firebaseService';
import { Conversation, Message, MessageStatus } from '../types/chat.types';
import { Auth } from 'aws-amplify';

/**
 * Helper function to sanitize objects for Firestore
 * Ensures all values are correctly serializable
 */
const sanitizeDataForFirestore = (data: Record<string, any>): Record<string, any> => {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    // Handle different types of values
    if (value === undefined) {
      // Replace undefined with null
      sanitized[key] = null;
    } else if (value === null) {
      // Keep null as is
      sanitized[key] = null;
    } else if (typeof value === 'function') {
      // Skip functions
      continue;
    } else if (value instanceof Date) {
      // Convert Date objects to Firestore timestamp
      sanitized[key] = serverTimestamp();
    } else if (Array.isArray(value)) {
      // Recursively sanitize arrays
      sanitized[key] = value.map(item => 
        typeof item === 'object' && item !== null 
          ? sanitizeDataForFirestore(item) 
          : (item === undefined ? null : item)
      );
    } else if (typeof value === 'object') {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeDataForFirestore(value);
    } else {
      // For simple types (string, number, boolean), just use the value
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

/**
 * Get the current authenticated user from AWS Cognito
 * This keeps the same authentication flow while using Firebase for chat
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

// Safe timestamp conversion helper function
const safeTimestampToISOString = (timestamp: any): string => {
  // Check if timestamp exists and has toDate method
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
  }
  
  // Return current date if timestamp is a server timestamp placeholder
  if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
    return new Date(timestamp.seconds * 1000).toISOString();
  }
  
  // Return current date as fallback
  return new Date().toISOString();
};

/**
 * Get all conversations for the current user
 */
export const getConversations = async (): Promise<Conversation[]> => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    console.log('[firebaseChatService] Getting conversations for user:', user.email);

    // Query conversations where the user's email is in participants
    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef, 
      where('participants', 'array-contains', user.email)
    );
    
    const querySnapshot = await getDocs(q);
    console.log('[firebaseChatService] Found conversations:', querySnapshot.size);
    
    const conversations: Conversation[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      conversations.push({
        id: doc.id,
        name: data.name,
        participants: data.participants || [],
        lastMessageContent: data.lastMessageContent,
        lastMessageTime: safeTimestampToISOString(data.lastMessageTime),
        createdAt: safeTimestampToISOString(data.createdAt),
        updatedAt: safeTimestampToISOString(data.updatedAt),
        owner: data.owner
      });
    });
    
    // Sort conversations by lastMessageTime (most recent first)
    return conversations.sort((a, b) => {
      const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      return timeB - timeA;
    });
  } catch (error) {
    console.error('[firebaseChatService] Error fetching conversations:', error);
    return [];
  }
};

/**
 * Get a specific conversation by ID
 */
export const getConversation = async (conversationId: string): Promise<Conversation | null> => {
  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnapshot = await getDoc(conversationRef);
    
    if (!conversationSnapshot.exists()) {
      return null;
    }
    
    const data = conversationSnapshot.data();
    return {
      id: conversationSnapshot.id,
      name: data.name,
      participants: data.participants || [],
      lastMessageContent: data.lastMessageContent,
      lastMessageTime: safeTimestampToISOString(data.lastMessageTime),
      createdAt: safeTimestampToISOString(data.createdAt),
      updatedAt: safeTimestampToISOString(data.updatedAt),
      owner: data.owner
    };
  } catch (error) {
    console.error('[firebaseChatService] Error fetching conversation:', error);
    return null;
  }
};

/**
 * Get or create a conversation between two users
 */
export const getOrCreateConversation = async (
  otherUserEmail: string,
  otherUserName: string,
  productId?: string,
  productName?: string
): Promise<Conversation> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    console.log('[firebaseChatService] Getting/creating conversation with:', otherUserEmail);
    
    // Create a unique ID based on the participants' emails (sorted alphabetically)
    const participants = [currentUser.email, otherUserEmail].sort();
    const conversationId = participants.join('_');
    
    // Try to fetch existing conversation
    const existingConversation = await getConversation(conversationId);
    if (existingConversation) {
      return existingConversation;
    }
    
    // Create raw conversation data
    const rawConversationData = {
      name: otherUserName || 'Chat',
      participants: participants,
      productId: productId,
      productName: productName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      owner: currentUser.email
    };
    
    // Sanitize data for Firestore
    const conversationData = sanitizeDataForFirestore(rawConversationData);
    
    // Use the conversationId as the document ID
    await setDoc(doc(db, 'conversations', conversationId), conversationData);
    
    // Return the newly created conversation
    return {
      id: conversationId,
      name: otherUserName || 'Chat',
      participants,
      productId,
      productName,
      createdAt: new Date().toISOString(),
      owner: currentUser.email
    };
  } catch (error) {
    console.error('[firebaseChatService] Error creating conversation:', error);
    throw error;
  }
};

/**
 * Get messages for a conversation
 */
export const getMessages = async (conversationId: string): Promise<Message[]> => {
  try {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    
    const querySnapshot = await getDocs(q);
    const messages: Message[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        conversationId,
        senderId: data.senderId,
        senderName: data.senderName,
        content: data.content,
        status: data.status || MessageStatus.SENT,
        createdAt: safeTimestampToISOString(data.createdAt),
        updatedAt: safeTimestampToISOString(data.updatedAt)
      });
    });
    
    return messages;
  } catch (error) {
    console.error('[firebaseChatService] Error fetching messages:', error);
    return [];
  }
};

/**
 * Send a message to a conversation
 */
export const sendMessage = async (
  conversationId: string,
  content: string
): Promise<Message> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');
    
    // Get the conversation to update its last message
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationRef);
    
    if (!conversationDoc.exists()) {
      throw new Error('Conversation not found');
    }
    
    // Create raw message data
    const messageId = uuidv4();
    const rawMessageData = {
      senderId: currentUser.email,
      senderName: currentUser.name,
      content: content,
      status: MessageStatus.SENT,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // Sanitize data for Firestore
    const messageData = sanitizeDataForFirestore(rawMessageData);
    
    // Add the message to the conversation's messages subcollection
    const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    await setDoc(messageRef, messageData);
    
    // Update the conversation with the last message data
    const lastMessageData = sanitizeDataForFirestore({
      lastMessageContent: content,
      lastMessageTime: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    await updateDoc(conversationRef, lastMessageData);
    
    // Return the newly created message
    return {
      id: messageId,
      conversationId,
      senderId: currentUser.email || '',
      senderName: currentUser.name || '',
      content: content || '',
      status: MessageStatus.SENT,
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('[firebaseChatService] Error sending message:', error);
    throw error;
  }
};

/**
 * Update a message's status
 */
export const updateMessageStatus = async (
  conversationId: string,
  messageId: string,
  status: MessageStatus
): Promise<void> => {
  try {
    const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    await updateDoc(messageRef, {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('[firebaseChatService] Error updating message status:', error);
    throw error;
  }
};

/**
 * Subscribe to messages in a conversation
 */
export const subscribeToMessages = (
  conversationId: string,
  callback: (messages: Message[]) => void
) => {
  try {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      try {
        const messages: Message[] = [];
        querySnapshot.forEach((doc) => {
          try {
            const data = doc.data();
            
            messages.push({
              id: doc.id,
              conversationId,
              senderId: data.senderId || '',
              senderName: data.senderName || '',
              content: data.content || '',
              status: data.status || MessageStatus.SENT,
              createdAt: safeTimestampToISOString(data.createdAt),
              updatedAt: safeTimestampToISOString(data.updatedAt)
            });
          } catch (docError) {
            console.error('[firebaseChatService] Error processing message document:', docError);
          }
        });
        
        // If there are messages and they have a recipient who is different from the sender,
        // mark the messages as read
        markMessagesAsRead(conversationId, messages).catch(error => {
          console.error('[firebaseChatService] Error marking messages as read:', error);
        });
        
        callback(messages);
      } catch (snapshotError) {
        console.error('[firebaseChatService] Error processing snapshot:', snapshotError);
        callback([]);
      }
    }, (error) => {
      console.error('[firebaseChatService] Error in messages subscription:', error);
    });
    
    return { unsubscribe };
  } catch (error) {
    console.error('[firebaseChatService] Error setting up message subscription:', error);
    return { 
      unsubscribe: () => {
        console.log('[firebaseChatService] No subscription to unsubscribe from.');
      } 
    };
  }
};

/**
 * Mark messages as read if they're from the other user
 */
const markMessagesAsRead = async (
  conversationId: string,
  messages: Message[]
) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return;
    
    const currentUserEmail = currentUser.email;
    
    // Find messages from other users that are not marked as READ
    const messagesToUpdate = messages.filter(
      msg => msg.senderId !== currentUserEmail && msg.status !== MessageStatus.READ
    );
    
    // Update each message status
    for (const message of messagesToUpdate) {
      await updateMessageStatus(conversationId, message.id, MessageStatus.READ);
    }
  } catch (error) {
    console.error('[firebaseChatService] Error marking messages as read:', error);
  }
}; 