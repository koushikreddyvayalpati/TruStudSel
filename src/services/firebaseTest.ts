import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebaseService';

/**
 * Tests if Firestore connection is working properly
 * Performs basic CRUD operations on a test collection
 */
export const testFirebaseConnection = async (): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> => {
  try {
    console.log('[FirebaseTest] Starting Firestore connection test...');
    
    // Check if we can get the Firestore instance
    if (!db) {
      console.error('[FirebaseTest] Firestore db instance is null or undefined');
      return { 
        success: false, 
        message: 'Firestore db instance is not initialized' 
      };
    }
    
    // Create a test document ID
    const testId = `test_${Date.now()}`;
    const testData = {
      message: 'Test message',
      timestamp: serverTimestamp(),
      testValue: 'Working properly'
    };
    
    // TEST 1: Write to Firestore
    console.log('[FirebaseTest] Attempting to write test document...');
    const testDocRef = doc(db, 'test_collection', testId);
    
    try {
      await setDoc(testDocRef, testData);
      console.log('[FirebaseTest] Successfully wrote test document');
    } catch (writeError) {
      console.error('[FirebaseTest] Error writing test document:', writeError);
      return { 
        success: false, 
        message: 'Failed to write to Firestore', 
        details: writeError 
      };
    }
    
    // TEST 2: Read from Firestore
    console.log('[FirebaseTest] Attempting to read test collection...');
    try {
      const testCollectionRef = collection(db, 'test_collection');
      const querySnapshot = await getDocs(testCollectionRef);
      
      console.log('[FirebaseTest] Successfully read from test collection');
      console.log('[FirebaseTest] Found documents:', querySnapshot.size);
    } catch (readError) {
      console.error('[FirebaseTest] Error reading from test collection:', readError);
      return { 
        success: false, 
        message: 'Failed to read from Firestore', 
        details: readError 
      };
    }
    
    // TEST 3: Delete the test document
    console.log('[FirebaseTest] Cleaning up test document...');
    try {
      await deleteDoc(testDocRef);
      console.log('[FirebaseTest] Successfully deleted test document');
    } catch (deleteError) {
      console.error('[FirebaseTest] Error deleting test document:', deleteError);
      // This is not a critical failure, so we'll just log it
    }
    
    // All tests passed
    return {
      success: true,
      message: 'Firebase Firestore connection is working properly'
    };
    
  } catch (error) {
    console.error('[FirebaseTest] Connection test failed with error:', error);
    return {
      success: false,
      message: 'Firebase connection test failed',
      details: error
    };
  }
};

/**
 * Test if the current user's Cognito auth can be retrieved
 * @param email Optional email to verify against the retrieved user
 */
export const testCurrentUserRetrieval = async (email?: string): Promise<{
  success: boolean;
  message: string;
  user?: any;
  details?: any;
}> => {
  try {
    console.log('[FirebaseTest] Testing user retrieval...');
    
    // Import getCurrentUser dynamically to avoid circular dependency
    const { getCurrentUser } = await import('./firebaseChatService');
    const user = await getCurrentUser();
    
    if (!user) {
      return {
        success: false,
        message: 'Failed to retrieve current user - not authenticated'
      };
    }
    
    // If an email was provided, verify it matches
    if (email && user.email !== email) {
      return {
        success: false,
        message: `Retrieved user email (${user.email}) does not match expected email (${email})`,
        user
      };
    }
    
    return {
      success: true,
      message: 'Successfully retrieved current user',
      user
    };
    
  } catch (error) {
    console.error('[FirebaseTest] Error retrieving current user:', error);
    return {
      success: false,
      message: 'Error retrieving current user',
      details: error
    };
  }
};

/**
 * Test sending a direct message to a test conversation
 */
export const testSendDirectMessage = async (): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> => {
  try {
    console.log('[FirebaseTest] Testing direct message sending...');
    
    // Create a test conversation ID
    const testId = `test_conversation_${Date.now()}`;
    const testMessage = `Test message sent at ${new Date().toISOString()}`;
    
    // Check if we can get the Firestore instance
    if (!db) {
      console.error('[FirebaseTest] Firestore db instance is null or undefined');
      return { 
        success: false, 
        message: 'Firestore db instance is not initialized' 
      };
    }
    
    // Step 1: Create a test conversation
    console.log('[FirebaseTest] Creating test conversation...');
    const conversationData = {
      name: 'Test Conversation',
      participants: ['test_user_1@example.com', 'test_user_2@example.com'],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // Create the conversation document
    const conversationRef = doc(db, 'conversations', testId);
    await setDoc(conversationRef, conversationData);
    console.log('[FirebaseTest] Test conversation created:', testId);
    
    // Step 2: Add a test message to the conversation
    console.log('[FirebaseTest] Adding test message...');
    const messageData = {
      senderId: 'test_user_1@example.com',
      senderName: 'Test User 1',
      content: testMessage,
      status: 'SENT',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const messageRef = doc(collection(db, 'conversations', testId, 'messages'));
    await setDoc(messageRef, messageData);
    console.log('[FirebaseTest] Test message added:', messageRef.id);
    
    // Step 3: Read back the conversation data to verify
    console.log('[FirebaseTest] Verifying message was saved...');
    const messageSnapshot = await getDocs(collection(db, 'conversations', testId, 'messages'));
    
    const messages: any[] = [];
    messageSnapshot.forEach(doc => {
      messages.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log('[FirebaseTest] Found messages:', messages.length);
    
    // Step 4: Clean up the test data
    console.log('[FirebaseTest] Cleaning up test data...');
    
    // Delete messages
    for (const message of messages) {
      await deleteDoc(doc(db, 'conversations', testId, 'messages', message.id));
    }
    
    // Delete conversation
    await deleteDoc(conversationRef);
    
    console.log('[FirebaseTest] Test data cleaned up successfully');
    
    return {
      success: true,
      message: `Successfully sent and verified test message in conversation ${testId}`,
      details: {
        conversationId: testId,
        messageCount: messages.length,
        testMessage
      }
    };
    
  } catch (error) {
    console.error('[FirebaseTest] Error sending direct message:', error);
    return {
      success: false,
      message: 'Failed to send test message',
      details: error
    };
  }
}; 