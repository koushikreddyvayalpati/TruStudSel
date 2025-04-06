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
  try {
    // For debugging
    console.log('[firebaseChatService] Processing timestamp:', 
      typeof timestamp, 
      timestamp instanceof Date ? 'Date object' : '',
      timestamp && typeof timestamp.toDate === 'function' ? 'Firestore timestamp' : '',
      timestamp && typeof timestamp === 'object' ? JSON.stringify(timestamp) : timestamp
    );
    
    // Check if timestamp exists and has toDate method (Firestore Timestamp)
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toISOString();
    }
    
    // Handle server timestamp objects with seconds and nanoseconds
    if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
      // Convert seconds to milliseconds, add nanoseconds converted to milliseconds
      const milliseconds = (timestamp.seconds * 1000) + 
        (timestamp.nanoseconds ? timestamp.nanoseconds / 1000000 : 0);
      const date = new Date(milliseconds);
      return date.toISOString();
    }
    
    // If timestamp is a string that looks like an ISO date
    if (typeof timestamp === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(timestamp)) {
      // Ensure it's a valid date
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return timestamp; // Already a valid ISO string
      }
    }
    
    // If timestamp is a number (milliseconds since epoch)
    if (typeof timestamp === 'number') {
      return new Date(timestamp).toISOString();
    }
    
    // Return current date as fallback
    console.warn('[firebaseChatService] Using current date for invalid timestamp:', timestamp);
    return new Date().toISOString();
  } catch (error) {
    console.error('[firebaseChatService] Error converting timestamp:', error, timestamp);
    return new Date().toISOString();
  }
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
      // For existing conversations, make sure we have the correct name mapping for this user
      try {
        // Format the current user's name properly
        const formattedCurrentUserName = currentUser.name || 
          (currentUser.email.includes('@') ? 
            currentUser.email.split('@')[0].charAt(0).toUpperCase() + currentUser.email.split('@')[0].slice(1) : 
            currentUser.email);
            
        // Store separate names for each participant
        const nameKey = `name_${currentUser.email.replace(/[.@]/g, '_')}`;
        const otherUserNameKey = `name_${otherUserEmail.replace(/[.@]/g, '_')}`;
        
        // Update the conversation with the user-specific name if needed
        const conversationRef = doc(db, 'conversations', conversationId);
        await updateDoc(conversationRef, {
          [nameKey]: otherUserName,
          [otherUserNameKey]: formattedCurrentUserName // Make sure the other user sees our name correctly too
        });
        
        console.log(`[firebaseChatService] Updated conversation with user-specific name: ${nameKey} = ${otherUserName}`);
      } catch (error) {
        console.error('[firebaseChatService] Error updating conversation with user names:', error);
      }
      
      return existingConversation;
    }
    
    // Format the current user's name properly
    const formattedCurrentUserName = currentUser.name || 
      (currentUser.email.includes('@') ? 
        currentUser.email.split('@')[0].charAt(0).toUpperCase() + currentUser.email.split('@')[0].slice(1) : 
        currentUser.email);
    
    // For new conversations, store separate names for each participant
    const currentUserNameKey = `name_${currentUser.email.replace(/[.@]/g, '_')}`;
    const otherUserNameKey = `name_${otherUserEmail.replace(/[.@]/g, '_')}`;
    
    // Create raw conversation data with user-specific name mappings
    const rawConversationData = {
      name: otherUserName, // Default name (used for transition period)
      [currentUserNameKey]: otherUserName, // For current user, show other user's name
      [otherUserNameKey]: formattedCurrentUserName, // For other user, show current user's name
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
      name: otherUserName,
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
      
      // Parse the createdAt timestamp and ensure it's valid
      const createdAtStr = safeTimestampToISOString(data.createdAt);
      const parsedDate = new Date(createdAtStr);
      
      // Check if the parsed date is valid (if not, use current time)
      const validCreatedAt = !isNaN(parsedDate.getTime()) 
        ? createdAtStr 
        : new Date().toISOString();
      
      // Log the timestamp conversion for debugging
      console.log('[firebaseChatService] Message timestamp conversion:', {
        original: data.createdAt,
        convertedString: createdAtStr,
        parsedDate: parsedDate.toString(),
        valid: !isNaN(parsedDate.getTime()),
        finalCreatedAt: validCreatedAt
      });
      
      // Add message with validated timestamp
      messages.push({
        id: doc.id,
        conversationId,
        senderId: data.senderId || '',
        senderName: data.senderName || '',
        content: data.content || '',
        status: data.status || MessageStatus.SENT,
        createdAt: validCreatedAt,
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
 * Send a message in a conversation
 */
export const sendMessage = async (conversationId: string, content: string): Promise<void> => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    
    // Format the user's name properly
    const senderName = user.name || 
      (user.email.includes('@') ? 
        user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) : 
        user.username || 'User');
    
    // Create message with ID and current timestamp
    const messageId = uuidv4();
    
    // Create an explicit date object for the current time
    // Ensure we use the exact system time rather than Firebase's serverTimestamp
    const now = new Date();
    const nowISO = now.toISOString();
    
    // Log the exact timestamp we're using for debugging
    console.log('[firebaseChatService] Creating message with explicit timestamp:', {
      iso: nowISO,
      localTime: now.toLocaleString(),
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
      hours: now.getHours(),
      minutes: now.getMinutes()
    });
    
    // Create message data with explicit timestamp values
    const messageData = {
      id: messageId,
      conversationId,
      senderId: user.email,
      senderName: senderName,
      content,
      status: MessageStatus.SENT,
      // Use explicit date strings instead of serverTimestamp()
      createdAt: nowISO,
      updatedAt: nowISO
    };
    
    // Add message to conversation's messages subcollection
    await setDoc(doc(db, 'conversations', conversationId, 'messages', messageId), messageData);
    
    // Update conversation with last message details (also using explicit timestamp)
    await updateDoc(doc(db, 'conversations', conversationId), {
      lastMessageContent: content,
      lastMessageTime: nowISO,
      updatedAt: nowISO
    });
    
    return;
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
            
            // Parse the createdAt timestamp and ensure it's valid
            const createdAtStr = safeTimestampToISOString(data.createdAt);
            const parsedDate = new Date(createdAtStr);
            
            // Check if the parsed date is valid (if not, use current time)
            const validCreatedAt = !isNaN(parsedDate.getTime()) 
              ? createdAtStr 
              : new Date().toISOString();
            
            // Add message with validated timestamp
            messages.push({
              id: doc.id,
              conversationId,
              senderId: data.senderId || '',
              senderName: data.senderName || '',
              content: data.content || '',
              status: data.status || MessageStatus.SENT,
              createdAt: validCreatedAt,
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