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
  setDoc,
  increment,
  Unsubscribe,
  writeBatch,
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { db } from './firebaseService';
import { Conversation, Message, MessageStatus, ReceiptStatus } from '../types/chat.types';
import { Auth } from 'aws-amplify';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    // First check if we have a stored user in AsyncStorage to avoid auth errors
    const cachedUserData = await AsyncStorage.getItem('@cached_user_data');
    if (cachedUserData) {
      try {
        const { userData } = JSON.parse(cachedUserData);
        if (userData && userData.email) {
          console.log('[firebaseChatService] Using cached user data');
          return {
            id: userData.attributes?.sub || 'unknown',
            username: userData.username || userData.email,
            name: userData.name || userData.email,
            email: userData.email,
          };
        }
      } catch (cacheError) {
        console.log('[firebaseChatService] Failed to parse cached user data:', cacheError);
        // Continue to try Auth.currentAuthenticatedUser
      }
    }
    
    // Try to get the authenticated user from Amplify Auth
    try {
      const user = await Auth.currentAuthenticatedUser();
      
      // Ensure user and attributes exist before accessing them
      if (!user || !user.attributes) {
        console.error('[firebaseChatService] User or user attributes missing');
        return null;
      }
      
      return {
        id: user.attributes.sub,
        username: user.username,
        name: user.attributes.name || user.username,
        email: user.attributes.email,
      };
    } catch (authError) {
      console.log('[firebaseChatService] User not authenticated:', authError);
      return null;
    }
  } catch (error) {
    console.error('[firebaseChatService] Error getting current user:', error);
    return null;
  }
};

// Safe timestamp conversion helper function
const safeTimestampToISOString = (timestamp: any): string => {
  try {
    // For debugging
    console.log('[firebaseChatService] Processing timestamp:',
      typeof timestamp,
      typeof timestamp === 'string' ? timestamp : '',
      timestamp instanceof Date ? 'Date object' : '',
      timestamp && typeof timestamp.toDate === 'function' ? 'Firestore timestamp' : ''
    );

    // Check if it's a serverTimestamp() function reference
    if (timestamp &&
        typeof timestamp === 'object' &&
        '_methodName' in timestamp &&
        timestamp._methodName === 'serverTimestamp') {
      // For serverTimestamp() that hasn't been committed yet, use current date
      return new Date().toISOString();
    }

    // Check if timestamp exists and has toDate method (Firestore Timestamp)
    if (timestamp && typeof timestamp.toDate === 'function') {
      const date = timestamp.toDate();
      return normalizeFutureDate(date).toISOString();
    }

    // Handle server timestamp objects with seconds and nanoseconds
    if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
      // Convert seconds to milliseconds, add nanoseconds converted to milliseconds
      const milliseconds = (timestamp.seconds * 1000) +
        (timestamp.nanoseconds ? timestamp.nanoseconds / 1000000 : 0);
      const date = new Date(milliseconds);
      return normalizeFutureDate(date).toISOString();
    }

    // If timestamp is a string that looks like an ISO date
    if (typeof timestamp === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(timestamp)) {
      // Ensure it's a valid date
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return normalizeFutureDate(date).toISOString(); // Check and fix future dates
      }
    }

    // If timestamp is a number (milliseconds since epoch)
    if (typeof timestamp === 'number') {
      const date = new Date(timestamp);
      return normalizeFutureDate(date).toISOString();
    }

    // Return current date as fallback
    console.warn('[firebaseChatService] Using current date for invalid timestamp:',
      typeof timestamp === 'object' ? JSON.stringify(timestamp) : timestamp);
    return new Date().toISOString();
  } catch (error) {
    console.error('[firebaseChatService] Error converting timestamp:', error, timestamp);
    return new Date().toISOString();
  }
};

// Helper function to normalize future dates
const normalizeFutureDate = (date: Date): Date => {
  const now = new Date();
  // If date is more than a day in the future or is in a future year
  if (date.getTime() > now.getTime() + 86400000 || date.getFullYear() > now.getFullYear()) {
    console.log('[firebaseChatService] Normalizing future date:', date.toISOString());
    // Create a new date to avoid modifying the original
    const normalizedDate = new Date(date);
    // Set the year to current year
    normalizedDate.setFullYear(now.getFullYear());
    return normalizedDate;
  }
  return date;
};

/**
 * Delete a conversation for a specific user
 * The conversation will still exist for other users
 */
export const deleteConversationForUser = async (conversationId: string): Promise<void> => {
  try {
    const user = await getCurrentUser();
    if (!user) {throw new Error('User not authenticated');}

    // Get the conversation to ensure it exists
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationRef);

    if (!conversationDoc.exists()) {
      throw new Error('Conversation not found');
    }

    const data = conversationDoc.data();
    
    // Create or update the deletedBy array
    let deletedBy = data.deletedBy || [];
    
    // Check if the user has already deleted this conversation
    if (deletedBy.includes(user.email)) {
      console.log(`[firebaseChatService] Conversation ${conversationId} already deleted by ${user.email}`);
      return;
    }
    
    // Add the user's email to the deletedBy array
    deletedBy.push(user.email);
    
    // Update the conversation with the new deletedBy array
    await updateDoc(conversationRef, {
      deletedBy,
      updatedAt: serverTimestamp(),
    });

    console.log(`[firebaseChatService] Conversation ${conversationId} deleted by ${user.email}`);
  } catch (error) {
    console.error('[firebaseChatService] Error deleting conversation:', error);
    throw error;
  }
};

/**
 * Delete conversation history for a specific user
 * This keeps the conversation but marks a timestamp from which older messages are hidden
 */
export const deleteConversationHistoryForUser = async (conversationId: string): Promise<void> => {
  try {
    const user = await getCurrentUser();
    if (!user) {throw new Error('User not authenticated');}

    // Get the conversation to ensure it exists
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationRef);

    if (!conversationDoc.exists()) {
      throw new Error('Conversation not found');
    }
    
    // Create a user-specific field name for the deletion timestamp
    const deletionTimestampField = `deletedAtTimestamp_${user.email.replace(/[.@]/g, '_')}`;
    
    // Set the current time as the deletion timestamp for this user
    const now = new Date();
    const deletionTimestamp = now.toISOString();
    
    // Update the conversation with the new deletion timestamp
    await updateDoc(conversationRef, {
      [deletionTimestampField]: deletionTimestamp,
      updatedAt: serverTimestamp(),
    });

    console.log(`[firebaseChatService] Conversation history ${conversationId} deleted by ${user.email} at ${deletionTimestamp}`);
    
    // Remove user from deletedBy array if they were in it
    // This makes the conversation visible again, but with history deleted
    const data = conversationDoc.data();
    const deletedBy = data.deletedBy || [];
    if (deletedBy.includes(user.email)) {
      const updatedDeletedBy = deletedBy.filter((email: string) => email !== user.email);
      await updateDoc(conversationRef, {
        deletedBy: updatedDeletedBy,
      });
    }
    
  } catch (error) {
    console.error('[firebaseChatService] Error deleting conversation history:', error);
    throw error;
  }
};

/**
 * Restore a deleted conversation for a user
 */
export const restoreConversationForUser = async (conversationId: string): Promise<void> => {
  try {
    const user = await getCurrentUser();
    if (!user) {throw new Error('User not authenticated');}

    // Get the conversation
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationRef);

    if (!conversationDoc.exists()) {
      throw new Error('Conversation not found');
    }

    const data = conversationDoc.data();
    
    // Get the current deletedBy array
    let deletedBy = data.deletedBy || [];
    
    // Check if the user has deleted this conversation
    if (!deletedBy.includes(user.email)) {
      console.log(`[firebaseChatService] Conversation ${conversationId} not deleted by ${user.email}`);
      return;
    }
    
    // Remove the user's email from the deletedBy array
    deletedBy = deletedBy.filter((email: string) => email !== user.email);
    
    // Update the conversation
    await updateDoc(conversationRef, {
      deletedBy,
      updatedAt: serverTimestamp(),
    });

    console.log(`[firebaseChatService] Conversation ${conversationId} restored for ${user.email}`);
  } catch (error) {
    console.error('[firebaseChatService] Error restoring conversation:', error);
    throw error;
  }
};

/**
 * Get all conversations for the current user with unread counts
 */
export const getConversations = async (): Promise<Conversation[]> => {
  try {
    const user = await getCurrentUser();
    if (!user) {throw new Error('User not authenticated');}

    // console.log('[firebaseChatService] Getting conversations for user:', user.email);

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

      // Skip conversations that the user has deleted
      const deletedBy = data.deletedBy || [];
      if (deletedBy.includes(user.email)) {
        return;
      }

      // Get user-specific unread count
      const unreadCountKey = `unreadCount_${user.email.replace(/[.@]/g, '_')}`;
      const unreadCount = data[unreadCountKey] || 0;

      // Get user-specific name mappings for all participants
      const userSpecificFields: Record<string, any> = {};

      // Copy all fields that look like name mappings (name_*) from the data
      Object.keys(data).forEach(key => {
        if (key.startsWith('name_')) {
          userSpecificFields[key] = data[key];
        }
      });

      // Create the conversation object with both general fields and user-specific mappings
      const conversation: Conversation = {
        id: doc.id,
        name: data.name,
        participants: data.participants || [],
        lastMessageContent: data.lastMessageContent,
        lastMessageTime: safeTimestampToISOString(data.lastMessageTime),
        createdAt: safeTimestampToISOString(data.createdAt),
        updatedAt: safeTimestampToISOString(data.updatedAt),
        owner: data.owner,
        lastSenderId: data.lastSenderId,
        unreadCount: unreadCount,
        lastReadMessageId: data[`lastReadMessageId_${user.email.replace(/[.@]/g, '_')}`],
        blockedBy: data.blockedBy || null, // Include blocked status
        deletedBy: data.deletedBy || [], // Include deleted status
        ...userSpecificFields, // Include all name mappings
      };

      conversations.push(conversation);
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

    // Get user-specific name mappings
    const userSpecificFields: Record<string, any> = {};

    // Copy all fields that look like name mappings (name_*) from the data
    Object.keys(data).forEach(key => {
      if (key.startsWith('name_')) {
        userSpecificFields[key] = data[key];
      }
    });

    // Create conversation with both general fields and user-specific mappings
    return {
      id: conversationSnapshot.id,
      name: data.name,
      participants: data.participants || [],
      lastMessageContent: data.lastMessageContent,
      lastMessageTime: safeTimestampToISOString(data.lastMessageTime),
      createdAt: safeTimestampToISOString(data.createdAt),
      updatedAt: safeTimestampToISOString(data.updatedAt),
      owner: data.owner,
      blockedBy: data.blockedBy || null, // Include blocked status
      ...userSpecificFields, // Include all name mappings
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
    if (!currentUser) {throw new Error('User not authenticated');}

    console.log('[firebaseChatService] Getting/creating conversation with:', otherUserEmail);

    // Create a unique ID based on the participants' emails (sorted alphabetically)
    const participants = [currentUser.email, otherUserEmail].sort();
    const conversationId = participants.join('_');

    // Format the current user's name properly
    const formattedCurrentUserName = currentUser.name ||
      (currentUser.email.includes('@') ?
        currentUser.email.split('@')[0].charAt(0).toUpperCase() + currentUser.email.split('@')[0].slice(1) :
        currentUser.email);

    // Format the other user's name if it's not provided
    const formattedOtherUserName = otherUserName ||
      (otherUserEmail.includes('@') ?
        otherUserEmail.split('@')[0].charAt(0).toUpperCase() + otherUserEmail.split('@')[0].slice(1) :
        otherUserEmail);

    // Create the name mapping keys - these are used to store user-specific display names
    const currentUserNameKey = `name_${currentUser.email.replace(/[.@]/g, '_')}`;
    const otherUserNameKey = `name_${otherUserEmail.replace(/[.@]/g, '_')}`;

    // Try to fetch existing conversation
    const existingConversation = await getConversation(conversationId);
    if (existingConversation) {
      // For existing conversations, make sure we have the correct name mapping for this user
      try {
        // Update the conversation with the user-specific name mappings if needed
        const conversationRef = doc(db, 'conversations', conversationId);

        const updates: Record<string, any> = {};

        // Current user should see the other user's name
        updates[currentUserNameKey] = formattedOtherUserName;

        // Other user should see the current user's name
        updates[otherUserNameKey] = formattedCurrentUserName;

        // Add general name for backward compatibility
        if (!existingConversation.name) {
          updates.name = formattedOtherUserName;
        }

        await updateDoc(conversationRef, updates);

        // console.log(`[firebaseChatService] Updated conversation with user-specific names: ${currentUserNameKey}=${formattedOtherUserName}, ${otherUserNameKey}=${formattedCurrentUserName}`);

        // Add the user-specific name mappings to the returned conversation
        return {
          ...existingConversation,
          [currentUserNameKey]: formattedOtherUserName,
          [otherUserNameKey]: formattedCurrentUserName,
        };
      } catch (error) {
        console.error('[firebaseChatService] Error updating conversation with user names:', error);
      }

      return existingConversation;
    }

    // Create raw conversation data with user-specific name mappings
    const rawConversationData = {
      // Default name (general)
      name: formattedOtherUserName,

      // Store specific name mappings:
      // For current user, store the other user's name
      [currentUserNameKey]: formattedOtherUserName,

      // For other user, store the current user's name
      [otherUserNameKey]: formattedCurrentUserName,

      participants: participants,
      productId: productId,
      productName: productName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      owner: currentUser.email,
    };

    // Log the conversation data for debugging
    console.log('[firebaseChatService] Creating new conversation with name mappings:', {
      conversationId,
      currentUserEmail: currentUser.email,
      currentUserName: formattedCurrentUserName,
      otherUserEmail: otherUserEmail,
      otherUserName: formattedOtherUserName,
      currentUserNameKey,
      otherUserNameKey,
    });

    // Sanitize data for Firestore
    const conversationData = sanitizeDataForFirestore(rawConversationData);

    // Use the conversationId as the document ID
    await setDoc(doc(db, 'conversations', conversationId), conversationData);

    // Return the newly created conversation with all needed properties
    return {
      id: conversationId,
      name: formattedOtherUserName,
      [currentUserNameKey]: formattedOtherUserName, // Add user-specific name mapping
      [otherUserNameKey]: formattedCurrentUserName, // Add other user-specific name mapping
      participants,
      productId,
      productName,
      createdAt: normalizeFutureDate(new Date()).toISOString(),
      owner: currentUser.email,
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
    const user = await getCurrentUser();
    if (!user) {throw new Error('User not authenticated');}
    
    // First check if the user has a deletion timestamp for this conversation
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationRef);
    
    if (!conversationDoc.exists()) {
      console.log(`[firebaseChatService] Conversation ${conversationId} not found, returning empty messages array`);
      // Return empty array instead of throwing error for fresh conversations
      return [];
    }
    
    const conversationData = conversationDoc.data();
    const deletionTimestampField = `deletedAtTimestamp_${user.email.replace(/[.@]/g, '_')}`;
    const deletionTimestamp = conversationData[deletionTimestampField];
    
    // Set up the messages query
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    let q = query(messagesRef, orderBy('createdAt', 'asc'));
    
    // If there's a deletion timestamp, only get messages created after that time
    if (deletionTimestamp) {
      console.log(`[firebaseChatService] Filtering messages after ${deletionTimestamp} for user ${user.email}`);
      q = query(messagesRef, 
        orderBy('createdAt', 'asc'), 
        where('createdAt', '>', deletionTimestamp)
      );
    }

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
      // console.log('[firebaseChatService] Message timestamp conversion:', {
      //   original: data.createdAt,
      //   convertedString: createdAtStr,
      //   parsedDate: parsedDate.toString(),
      //   valid: !isNaN(parsedDate.getTime()),
      //   finalCreatedAt: validCreatedAt,
      // });

      // Add message with validated timestamp
      messages.push({
        id: doc.id,
        conversationId,
        senderId: data.senderId || '',
        senderName: data.senderName || '',
        content: data.content || '',
        status: data.status || MessageStatus.SENT,
        receiptStatus: data.receiptStatus || ReceiptStatus.NONE,
        readAt: data.readAt ? safeTimestampToISOString(data.readAt) : undefined,
        createdAt: validCreatedAt,
        updatedAt: safeTimestampToISOString(data.updatedAt),
      });
    });

    return messages;
  } catch (error) {
    console.error('[firebaseChatService] Error fetching messages:', error);
    return [];
  }
};

/**
 * Block a conversation
 * Only the user who blocks can unblock the conversation
 */
export const blockConversation = async (conversationId: string): Promise<void> => {
  try {
    const user = await getCurrentUser();
    if (!user) {throw new Error('User not authenticated');}

    // Get the conversation to ensure it exists
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationRef);

    if (!conversationDoc.exists()) {
      throw new Error('Conversation not found');
    }

    // Update the conversation to mark it as blocked by this user
    await updateDoc(conversationRef, {
      blockedBy: user.email,
      updatedAt: serverTimestamp(),
    });

    console.log(`[firebaseChatService] Conversation ${conversationId} blocked by ${user.email}`);
  } catch (error) {
    console.error('[firebaseChatService] Error blocking conversation:', error);
    throw error;
  }
};

/**
 * Unblock a conversation
 * Only the user who blocked can unblock the conversation
 */
export const unblockConversation = async (conversationId: string): Promise<void> => {
  try {
    const user = await getCurrentUser();
    if (!user) {throw new Error('User not authenticated');}

    // Get the conversation to check who blocked it
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationRef);

    if (!conversationDoc.exists()) {
      throw new Error('Conversation not found');
    }

    const data = conversationDoc.data();
    
    // Only the user who blocked can unblock
    if (data.blockedBy !== user.email) {
      throw new Error('Only the user who blocked this conversation can unblock it');
    }

    // Update the conversation to remove the block
    await updateDoc(conversationRef, {
      blockedBy: null, // Remove the blockedBy field
      updatedAt: serverTimestamp(),
    });

    console.log(`[firebaseChatService] Conversation ${conversationId} unblocked by ${user.email}`);
  } catch (error) {
    console.error('[firebaseChatService] Error unblocking conversation:', error);
    throw error;
  }
};

/**
 * Check if a conversation is blocked and by whom
 */
export const isConversationBlocked = async (conversationId: string): Promise<{blocked: boolean, blockedBy: string | null}> => {
  try {
    // Check if there's a valid conversationId
    if (!conversationId) {
      console.log('[firebaseChatService] No conversation ID provided for block check');
      return { blocked: false, blockedBy: null };
    }
    
    // Get the conversation
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationRef);

    if (!conversationDoc.exists()) {
      // Conversation doesn't exist yet, so it's not blocked
      console.log('[firebaseChatService] Conversation not found when checking block status, assuming not blocked');
      return { blocked: false, blockedBy: null };
    }

    const data = conversationDoc.data();
    
    return {
      blocked: !!data.blockedBy,
      blockedBy: data.blockedBy || null
    };
  } catch (error) {
    console.error('[firebaseChatService] Error checking block status:', error);
    // Return not blocked in case of any errors
    return { blocked: false, blockedBy: null };
  }
};

/**
 * Send a message in a conversation
 */
export const sendMessage = async (conversationId: string, content: string): Promise<void> => {
  try {
    const user = await getCurrentUser();
    if (!user) {throw new Error('User not authenticated');}

    // Check if the conversation is blocked before sending
    const blockStatus = await isConversationBlocked(conversationId);
    if (blockStatus.blocked) {
      // If conversation is blocked by the current user, they can't send messages
      if (blockStatus.blockedBy === user.email) {
        throw new Error('You have blocked this conversation. Unblock to send messages.');
      } 
      // If blocked by the other user, current user can't send messages
      else {
        throw new Error('This conversation has been blocked by the recipient.');
      }
    }

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
    
    // Date normalization: Check if the date is suspiciously in the future
    // This can happen with misconfigured device clocks
    const normalizedNow = new Date();
    const currentYear = new Date().getFullYear();
    if (now.getFullYear() > currentYear) {
      console.log('[firebaseChatService] Detected future date, normalizing timestamp');
      normalizedNow.setFullYear(currentYear);
    }
    
    const nowISO = normalizedNow.toISOString();

    // Log the exact timestamp we're using for debugging
    console.log('[firebaseChatService] Creating message with explicit timestamp:', {
      iso: nowISO,
      localTime: normalizedNow.toLocaleString(),
      year: normalizedNow.getFullYear(),
      month: normalizedNow.getMonth(),
      day: normalizedNow.getDate(),
      hours: normalizedNow.getHours(),
      minutes: normalizedNow.getMinutes(),
    });

    // Get the conversation to find the other participant
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationRef);

    if (!conversationDoc.exists()) {
      throw new Error('Conversation not found');
    }

    const conversationData = conversationDoc.data();
    const otherParticipant = conversationData.participants.find((p: string) => p !== user.email);

    if (!otherParticipant) {throw new Error('Recipient not found in conversation');}

    // Create message data with explicit timestamp values
    const messageData = {
      id: messageId,
      conversationId,
      senderId: user.email,
      senderName: senderName,
      content,
      status: MessageStatus.SENT,
      receiptStatus: ReceiptStatus.SENT,
      // Use explicit date strings instead of serverTimestamp()
      createdAt: nowISO,
      updatedAt: nowISO,
    };

    // Use a batch to optimize performance
    const batch = writeBatch(db);

    // Add message to conversation's messages subcollection
    const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    batch.set(messageRef, messageData);

    // Check if the recipient has previously deleted this conversation and restore it
    const deletedBy = conversationData.deletedBy || [];
    let updatedDeletedBy = deletedBy;
    
    // If recipient previously deleted the conversation, remove them from deletedBy array
    if (deletedBy.includes(otherParticipant)) {
      console.log(`[firebaseChatService] Recipient ${otherParticipant} previously deleted conversation, restoring it`);
      updatedDeletedBy = deletedBy.filter((email: string) => email !== otherParticipant);
    }

    // Create the update object for the conversation
    const updateData: Record<string, any> = {
      lastMessageContent: content,
      lastMessageTime: nowISO,
      updatedAt: nowISO,
      lastSenderId: user.email,
      deletedBy: updatedDeletedBy, // Update the deletedBy array to restore for recipient if needed
    };
    
    // Increment unread count for the recipient
    const recipientUnreadCountKey = `unreadCount_${otherParticipant.replace(/[.@]/g, '_')}`;
    updateData[recipientUnreadCountKey] = increment(1);
    
    // If the recipient has an active deletion timestamp, clear it so they can see new messages
    const recipientDeletionTimestampField = `deletedAtTimestamp_${otherParticipant.replace(/[.@]/g, '_')}`;
    if (conversationData[recipientDeletionTimestampField]) {
      console.log(`[firebaseChatService] Recipient ${otherParticipant} has history deletion timestamp, not changing it`);
      // We don't update the timestamp anymore - we keep the original deletion timestamp
      // This allows all messages after the original deletion to remain visible
      // updateData[recipientDeletionTimestampField] = adjustedTime.toISOString();
    }
    
    // Update the conversation with all our changes
    batch.update(conversationRef, updateData);

    // Commit all changes at once
    await batch.commit();

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
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('[firebaseChatService] Error updating message status:', error);
    throw error;
  }
};

/**
 * Subscribe to messages in a conversation with optimized real-time handling
 */
export const subscribeToMessages = (
  conversationId: string,
  callback: (messages: Message[]) => void
) => {
  try {
    // console.log(`[firebaseChatService] Setting up message subscription for conversation ${conversationId}`);
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    let currentDeletionTimestamp: string | null = null;
    let messageUnsubscribe: () => void = () => {};
    let conversationUnsubscribe: () => void = () => {};
    
    // First get the current user and check for deletion timestamps
    getCurrentUser().then(user => {
      if (!user) {
        console.error('[firebaseChatService] Cannot subscribe to messages - user not authenticated');
        callback([]);
        return;
      }

      // Check if we need to create the conversation first
      // This handles the case of fresh conversations that don't exist yet
      if (conversationId && conversationId.includes('_') && !conversationId.includes('/')) {
        // This looks like a valid conversation ID (email_email format)
        const possibleParticipants = conversationId.split('_');
        if (possibleParticipants.length === 2) {
          const otherParticipant = possibleParticipants[0] === user.email ? 
            possibleParticipants[1] : possibleParticipants[0];
            
          // Check if conversation exists first
          const conversationRef = doc(db, 'conversations', conversationId);
          getDoc(conversationRef).then(doc => {
            if (!doc.exists()) {
              console.log(`[firebaseChatService] Conversation ${conversationId} does not exist yet, initializing it`);
              
              // Extract recipient name from email
              let recipientName = '';
              if (otherParticipant.includes('@')) {
                const username = otherParticipant.split('@')[0];
                recipientName = username.charAt(0).toUpperCase() + username.slice(1);
              } else {
                recipientName = otherParticipant;
              }
              
              // Initialize the conversation
              getOrCreateConversation(otherParticipant, recipientName)
                .then(() => {
                  console.log(`[firebaseChatService] Successfully created conversation ${conversationId}`);
                  setupSubscription();
                })
                .catch(error => {
                  console.error(`[firebaseChatService] Failed to create conversation: ${error.message}`);
                  callback([]);
                });
            } else {
              // Conversation exists, set up subscription normally
              setupSubscription();
            }
          }).catch(error => {
            console.error(`[firebaseChatService] Error checking conversation: ${error.message}`);
            callback([]);
          });
        } else {
          // Not a valid conversation ID format, proceed with normal subscription
          setupSubscription();
        }
      } else {
        // Not a conversation ID we can parse, proceed with normal subscription
        setupSubscription();
      }
      
      // Set up the actual subscription to messages
      function setupSubscription() {
        // We know user is not null here because we checked at the beginning of the promise
        const userEmail = user!.email; // Use non-null assertion since we've already checked
        
        // Set up a subscription to the conversation document to detect changes to the deletion timestamp
        const conversationRef = doc(db, 'conversations', conversationId);
        conversationUnsubscribe = onSnapshot(conversationRef, (conversationDoc) => {
          if (!conversationDoc.exists()) {
            console.log(`[firebaseChatService] Cannot subscribe to messages - conversation ${conversationId} not found, but not throwing error`);
            // Return empty array for fresh conversations instead of error
            callback([]);
            return;
          }
          
          const conversationData = conversationDoc.data();
          const deletionTimestampField = `deletedAtTimestamp_${userEmail.replace(/[.@]/g, '_')}`;
          const deletionTimestamp = conversationData[deletionTimestampField];
          
          // If the deletion timestamp has changed, we need to update our message query
          if (deletionTimestamp !== currentDeletionTimestamp) {
            console.log(`[firebaseChatService] Deletion timestamp changed from ${currentDeletionTimestamp} to ${deletionTimestamp}`);
            currentDeletionTimestamp = deletionTimestamp;
            
            // Unsubscribe from the current message subscription (if any)
            if (messageUnsubscribe) {
              messageUnsubscribe();
            }
            
            // Base query with sorting
            let q = query(messagesRef, orderBy('createdAt', 'asc'));
            
            // If user has deletion timestamp, only show messages after that time
            if (deletionTimestamp) {
              console.log(`[firebaseChatService] Filtering real-time messages after ${deletionTimestamp}`);
              q = query(messagesRef, 
                orderBy('createdAt', 'asc'), 
                where('createdAt', '>', deletionTimestamp)
              );
            }
      
            // Store the last processed snapshot for deduplication
            let lastProcessedSnapshot = '';
      
            // Use snapshot metadata to efficiently detect various update types
            messageUnsubscribe = onSnapshot(q, (querySnapshot) => {
              try {
                // Skip processing if we're getting duplicate snapshots (can happen with poor connections)
                const snapshotId = querySnapshot.metadata.hasPendingWrites ? 'pending' : 'server';
                const currentSnapshotKey = `${snapshotId}-${querySnapshot.size}`;
      
                if (currentSnapshotKey === lastProcessedSnapshot && !querySnapshot.metadata.hasPendingWrites) {
                  console.log('[firebaseChatService] Skipping duplicate snapshot update');
                  return;
                }
      
                lastProcessedSnapshot = currentSnapshotKey;
      
                const messages: Message[] = [];
                let hasChanges = false;
                let hasNewMessages = false;
      
                // Don't process document changes unless we need them to optimize performance
                if (querySnapshot.docChanges().length > 0) {
                  // Track which messages have changed to log details
                  const changedMessages: string[] = [];
      
                  querySnapshot.docChanges().forEach(change => {
                    if (change.type === 'added' || change.type === 'modified') {
                      hasChanges = true;
                      changedMessages.push(`${change.doc.id} (${change.type})`);
                    }
                  });
      
                  if (hasChanges) {
                    // console.log(`[firebaseChatService] Detected ${changedMessages.length} changed messages:`,changedMessages.join(', '));
                  }
                }
      
                querySnapshot.forEach((doc) => {
                  try {
                    const data = doc.data();
      
                    // Parse the createdAt timestamp and ensure it's valid
                    const createdAtStr = safeTimestampToISOString(data.createdAt);
      
                    // Get real-time state tracking for this message
                    const isPendingWrite = doc.metadata.hasPendingWrites;
      
                    // If this document is newly added or pending, count it as a new message
                    if (isPendingWrite || querySnapshot.docChanges().some(change =>
                        change.type === 'added' && change.doc.id === doc.id)) {
                      hasNewMessages = true;
                    }
      
                    // Add message with pending state tracking for UI feedback
                    messages.push({
                      id: doc.id,
                      conversationId,
                      senderId: data.senderId || '',
                      senderName: data.senderName || '',
                      content: data.content || '',
                      status: isPendingWrite ? MessageStatus.SENDING : (data.status || MessageStatus.SENT),
                      receiptStatus: isPendingWrite ? ReceiptStatus.SENDING : (data.receiptStatus || ReceiptStatus.NONE),
                      readAt: data.readAt ? safeTimestampToISOString(data.readAt) : undefined,
                      createdAt: createdAtStr,
                      updatedAt: safeTimestampToISOString(data.updatedAt),
                      isPending: isPendingWrite,
                    });
                  } catch (docError) {
                    console.error('[firebaseChatService] Error processing message document:', docError, doc.id);
                  }
                });
      
                // Sort messages by timestamp to ensure correct display order
                messages.sort((a, b) => {
                  const dateA = new Date(a.createdAt).getTime();
                  const dateB = new Date(b.createdAt).getTime();
                  return dateA - dateB;
                });
      
                // If new messages detected, log for debugging
                if (hasNewMessages) {
                  console.log('[firebaseChatService] New messages detected in real-time update');
                }
      
                // Return messages immediately for real-time UI update
                callback(messages);
      
                // Only mark messages as read if:
                // 1. There are actually messages to process
                // 2. This is a server-side (not cached or pending) snapshot
                // 3. There are actual changes in the messages
                // 4. This is not a duplicate from a bad connection
                if (messages.length > 0 &&
                    !querySnapshot.metadata.fromCache &&
                    !querySnapshot.metadata.hasPendingWrites &&
                    hasChanges) {
                  setTimeout(() => {
                    markMessagesAsRead(conversationId, messages).catch(error => {
                      console.error('[firebaseChatService] Error marking messages as read:', error);
                    });
                  }, 100); // Small delay to prioritize UI updates
                }
              } catch (snapshotError) {
                console.error('[firebaseChatService] Error processing message snapshot:', snapshotError);
                // Return empty array in case of error to avoid UI crashes
                callback([]);
              }
            }, (error) => {
              console.error('[firebaseChatService] Error in messages subscription:', error);
              // Try to recover from subscription errors if possible
              setTimeout(() => {
                try {
                  // Notify UI that we're in error state
                  callback([]);
                  console.log('[firebaseChatService] Attempting to recover from subscription error');
      
                  // Attempt to get messages via regular fetch as fallback
                  getMessages(conversationId)
                    .then(messages => {
                      if (messages.length > 0) {
                        callback(messages);
                        console.log('[firebaseChatService] Successfully recovered messages via fallback fetch');
                      }
                    })
                    .catch(fallbackError => {
                      console.error('[firebaseChatService] Failed to recover via fallback fetch:', fallbackError);
                    });
                } catch (recoveryError) {
                  console.error('[firebaseChatService] Error during subscription recovery attempt:', recoveryError);
                }
              }, 2000);
            });
          }
        });
      }
    });

    // Return a function that unsubscribes from both the conversation and message listeners
    return {
      unsubscribe: () => {
        try {
          if (messageUnsubscribe) messageUnsubscribe();
          if (conversationUnsubscribe) conversationUnsubscribe();
          console.log('[firebaseChatService] Unsubscribed from conversation and messages');
        } catch (error) {
          console.error('[firebaseChatService] Error unsubscribing:', error);
        }
      },
    };
  } catch (error) {
    console.error('[firebaseChatService] Error setting up message subscription:', error);
    return {
      unsubscribe: () => {
        console.log('[firebaseChatService] No subscription to unsubscribe from.');
      },
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
    if (!currentUser) {return;}

    const currentUserEmail = currentUser.email;

    // Find messages from other users that are not marked as READ
    const messagesToUpdate = messages.filter(
      msg => msg.senderId !== currentUserEmail &&
             (msg.status !== MessageStatus.READ || msg.receiptStatus !== ReceiptStatus.READ)
    );

    // Skip the database operation entirely if no messages need updates
    if (messagesToUpdate.length === 0) {
      console.log('[firebaseChatService] No messages need to be marked as read');
      return;
    }

    console.log('[firebaseChatService] Marking messages as read:', messagesToUpdate.length);

    // Get the conversation reference to update unread counts
    const conversationRef = doc(db, 'conversations', conversationId);

    // Use batch writes for better performance
    const batch = writeBatch(db);
    const now = new Date().toISOString();

    // Add all message updates to the batch
    messagesToUpdate.forEach((message) => {
      const messageRef = doc(db, 'conversations', conversationId, 'messages', message.id);
      batch.update(messageRef, {
        status: MessageStatus.READ,
        receiptStatus: ReceiptStatus.READ,
        readAt: now,
        updatedAt: now,
      });
    });

    // Add the unread count reset to the batch
    const unreadCountKey = `unreadCount_${currentUserEmail.replace(/[.@]/g, '_')}`;
    batch.update(conversationRef, {
      [unreadCountKey]: 0,
      updatedAt: now,
    });

    // Commit all updates at once
    await batch.commit();

    console.log('[firebaseChatService] Successfully marked messages as read');

  } catch (error) {
    console.error('[firebaseChatService] Error marking messages as read:', error);
  }
};

/**
 * Subscribe to all conversations for a specific user
 * This enables real-time updates to the conversation list
 */
export const subscribeToUserConversations = (
  userEmail: string,
  callback: (conversations: Conversation[]) => void
): Unsubscribe => {
  // console.log(`Setting up subscription for user ${userEmail}`);

  // Query conversations where the user is a participant
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', userEmail)
  );

  // Set up the listener
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    try {
      const conversationData: Conversation[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();

        // Skip conversations that the user has deleted
        const deletedBy = data.deletedBy || [];
        if (deletedBy.includes(userEmail)) {
          return;
        }

        // Convert timestamps to strings
        const lastMessageTime = data.lastMessageTime
          ? safeTimestampToISOString(data.lastMessageTime)
          : undefined;

        const createdAt = data.createdAt
          ? safeTimestampToISOString(data.createdAt)
          : new Date().toISOString(); // Default to current time if missing

        // Get user-specific unread count
        const unreadCountKey = `unreadCount_${userEmail.replace(/[.@]/g, '_')}`;
        const unreadCount = data[unreadCountKey] || 0;

        // Get user-specific name mappings
        const userSpecificFields: Record<string, any> = {};

        // Copy all fields that look like name mappings (name_*) from the data
        Object.keys(data).forEach(key => {
          if (key.startsWith('name_')) {
            userSpecificFields[key] = data[key];
          }
        });

        conversationData.push({
          id: doc.id,
          name: data.name || '',
          participants: data.participants || [],
          lastMessageContent: data.lastMessageContent || '',
          lastMessage: data.lastMessage || '',
          lastMessageTime,
          createdAt: createdAt,
          updatedAt: data.updatedAt ? safeTimestampToISOString(data.updatedAt) : undefined,
          owner: data.owner,
          unreadCount: unreadCount,
          lastSenderId: data.lastSenderId,
          lastReadMessageId: data[`lastReadMessageId_${userEmail.replace(/[.@]/g, '_')}`],
          productId: data.productId,
          productName: data.productName,
          blockedBy: data.blockedBy || null, // Make sure to include blocked status
          deletedBy: data.deletedBy || [], // Include deleted status
          ...userSpecificFields, // Include all name mappings
        });
      });

      // Sort by most recent message first
      conversationData.sort((a, b) => {
        if (!a.lastMessageTime) {return 1;}
        if (!b.lastMessageTime) {return -1;}
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      });

      console.log(`Received ${conversationData.length} conversations from subscription`);
      callback(conversationData);

    } catch (error) {
      console.error('Error in conversation subscription:', error);
    }
  });

  return unsubscribe;
};
