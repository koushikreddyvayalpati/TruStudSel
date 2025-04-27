/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/https";
 * import {onDocumentWritten} from "firebase-functions/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v1';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Initialize Firestore
const db = admin.firestore();
const fcm = admin.messaging();

// Configure Firebase Admin SDK
const settings = {
  timestampsInSnapshots: true,
};
db.settings(settings);

// Define Types
interface MessageData {
  senderId: string;
  senderName?: string;
  text?: string;
  timestamp?: any;
  recipientId?: string; // Add recipientId for direct recipient identification
  // other message properties
}

interface ConversationData {
  users: string[];
  lastMessage: string;
  lastTimestamp: FirebaseFirestore.Timestamp;
}

interface DeviceData {
  token: string;
  device: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  lastActive: FirebaseFirestore.Timestamp;
}

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// Helper function to get user's FCM tokens
async function getUserFcmTokens(userId: string): Promise<string[]> {
  try {
    // Check if userId is likely an email (contains @)
    const isEmail = userId.includes('@');
    
    // Log the user ID type we're looking up
    console.log(`Looking up FCM tokens for user: ${userId} (${isEmail ? 'email format' : 'ID format'})`);
    
    // Get all devices for the user
    let devicesSnapshot;
    
    // First try the direct path with the userId as provided
    devicesSnapshot = await db.collection("users").doc(userId).collection("devices").get();
    
    // If no devices found and userId doesn't look like an email, try to find the user's email
    if (devicesSnapshot.empty && !isEmail) {
      console.log(`No devices found at path users/${userId}/devices - checking if we can find user's email`);
      
      // Try to lookup the user document to find their email
      const userDoc = await db.collection("users").doc(userId).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        // Check if the user document has an email field
        if (userData && userData.email) {
          console.log(`Found email ${userData.email} for user ID ${userId}`);
          // Try again with the email
          devicesSnapshot = await db.collection("users").doc(userData.email).collection("devices").get();
        }
      } else {
        console.log(`User document not found for ID: ${userId}`);
      }
    }
    
    if (devicesSnapshot.empty) {
      console.log(`No devices found for user: ${userId}`);
      return [];
    }
    
    // Extract token from each device
    const tokens: string[] = [];
    devicesSnapshot.forEach(doc => {
      const deviceData = doc.data() as DeviceData;
      if (deviceData.token) {
        tokens.push(deviceData.token);
      }
    });
    
    console.log(`Found ${tokens.length} tokens for user: ${userId}`);
    return tokens;
  } catch (error) {
    console.error(`Error getting FCM tokens for user ${userId}:`, error);
    return [];
  }
}

// Function triggered when a new message is created
exports.onNewMessage = functions.firestore
  .document("conversations/{conversationId}/messages/{messageId}")
  .onCreate(async (snapshot, context) => {
    try {
      const messageId = context.params.messageId;
      const conversationId = context.params.conversationId;
      console.log(`Processing message ${messageId} in conversation ${conversationId}`);
      
      // Debug: Log the message data
      const messageData = snapshot.data() as MessageData;
      console.log("Message data:", JSON.stringify({
        senderId: messageData.senderId,
        senderName: messageData.senderName,
        text: messageData.text ? (messageData.text.length > 50 ? messageData.text.substring(0, 50) + '...' : messageData.text) : 'null',
        timestamp: messageData.timestamp ? 'valid timestamp' : 'null timestamp'
      }));

      // Update last message in conversation document with null checks
      try {
        await db.collection("conversations").doc(conversationId).update({
          lastMessage: messageData.text || '',
          lastTimestamp: messageData.timestamp || admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Successfully updated conversation ${conversationId} with last message`);
      } catch (updateError) {
        console.error(`Error updating conversation last message: ${updateError}`);
        // Continue processing even if update fails - we still want to send the notification
      }

      // Get conversation data to find participating users
      console.log(`Fetching conversation document: ${conversationId}`);
      const conversationDoc = await db
        .collection("conversations")
        .doc(conversationId)
        .get();

      if (!conversationDoc.exists) {
        console.log(`Conversation document not found: ${conversationId}`);
        
        // Try alternative approach - check if the conversation might have a different structure
        console.log("Attempting to infer recipients from message data");
        if (messageData.recipientId) {
          // If message contains recipient info directly, use that
          const recipientId = messageData.recipientId;
          console.log(`Using recipientId ${recipientId} from message data`);
          
          // Get recipient's FCM tokens
          const recipientTokens = await getUserFcmTokens(recipientId);
          
          if (recipientTokens.length === 0) {
            console.log(`No FCM tokens found for recipient ${recipientId}`);
            return null;
          }
          
          // Send notification with available data
          await sendNotificationToTokens(
            recipientTokens, 
            messageData.senderName || 'Someone', 
            messageData.text || 'New message',
            {
              conversationId,
              senderId: messageData.senderId,
              senderName: messageData.senderName || 'Someone'
            }
          );
          
          return null;
        }
        
        return null;
      }

      // Get the conversation data and log it for debugging
      const conversationData = conversationDoc.data();
      console.log("Conversation data keys:", Object.keys(conversationData || {}));
      
      // Look for users array or participants array
      let participantsArray: string[] = [];
      
      // Check for the expected users field
      if (conversationData && conversationData.users && Array.isArray(conversationData.users)) {
        console.log("Found users array:", conversationData.users);
        participantsArray = conversationData.users;
      } 
      // Check for participants field as an alternative
      else if (conversationData && conversationData.participants && Array.isArray(conversationData.participants)) {
        console.log("Found participants array:", conversationData.participants);
        participantsArray = conversationData.participants;
      } 
      // Another possible structure - direct keys for 1:1 chats
      else if (conversationData && (conversationData.user1 || conversationData.user2)) {
        console.log("Found user1/user2 structure");
        participantsArray = [];
        if (conversationData.user1) participantsArray.push(conversationData.user1);
        if (conversationData.user2) participantsArray.push(conversationData.user2);
      } 
      // Check if we can parse user IDs from the conversation ID (often emails separated by underscore)
      else if (conversationId.includes('_') && conversationId.includes('@')) {
        console.log("Attempting to parse user emails from conversation ID:", conversationId);
        const possibleEmails = conversationId.split('_');
        participantsArray = possibleEmails.filter(part => part.includes('@'));
        console.log("Extracted possible email participants:", participantsArray);
      }
      else {
        console.log("Could not identify any user structure in the conversation document");
        return null;
      }

      if (participantsArray.length === 0) {
        console.log("No participants found after checking all possible structures");
        return null;
      }
      
      // Log the format of user IDs to help debugging
      participantsArray.forEach((userId, index) => {
        console.log(`Participant ${index+1}: ${userId} (${userId.includes('@') ? 'Email format' : 'ID format'})`);
      });

      // Get the recipient users (everyone except the sender)
      console.log(`Filtering recipients from ${participantsArray.length} users`);
      const recipientIds = participantsArray.filter(
        (userId: string) => userId !== messageData.senderId
      );

      console.log(`Found ${recipientIds.length} recipients: ${recipientIds.join(', ')}`);
      if (recipientIds.length === 0) {
        console.log("No recipients found after filtering");
        return null;
      }

      // Get FCM tokens for all recipients
      console.log(`Fetching FCM tokens for ${recipientIds.length} recipients`);
      const tokenPromises = recipientIds.map(userId => getUserFcmTokens(userId));
      const tokensArrays = await Promise.all(tokenPromises);
      
      // Flatten the array of arrays into a single array of tokens
      const validTokens = tokensArrays.flat().filter(token => token && token.length > 0);

      if (validTokens.length === 0) {
        console.log(`No valid FCM tokens found for recipients: ${recipientIds.join(', ')}`);
        return null;
      }

      console.log(`Sending notifications to ${validTokens.length} devices`);

      // Send the notification with available data
      await sendNotificationToTokens(
        validTokens, 
        messageData.senderName || 'Someone', 
        messageData.text || 'New message',
        {
          conversationId,
          senderId: messageData.senderId || '',
          senderName: messageData.senderName || 'Someone'
        }
      );

      return null;
    } catch (error) {
      console.error("Error sending message notification:", error);
      return null;
    }
  });

// Helper function to send notifications to tokens
async function sendNotificationToTokens(
  tokens: string[], 
  senderName: string, 
  messageText: string,
  data: any
): Promise<void> {
  try {
    if (!tokens || tokens.length === 0) {
      console.log("No tokens provided to send notifications to");
      return;
    }
    
    // Process tokens in smaller batches
    const MAX_TOKENS_PER_REQUEST = 500;
    let successCount = 0;
    let failureCount = 0;
    
    // Process tokens in batches
    for (let i = 0; i < tokens.length; i += MAX_TOKENS_PER_REQUEST) {
      const tokenBatch = tokens.slice(i, i + MAX_TOKENS_PER_REQUEST);
      console.log(`Processing batch ${i/MAX_TOKENS_PER_REQUEST + 1} with ${tokenBatch.length} tokens`);
      
      try {
        // Create proper MulticastMessage (correct format for Admin SDK)
        const message: admin.messaging.MulticastMessage = {
          tokens: tokenBatch,
          notification: {
            title: `New message from ${senderName}`,
            body: messageText,
          },
          data: {
            type: "message",
            ...data,
            timestamp: new Date().toISOString(),
          },
          android: {
            notification: {
              clickAction: "FLUTTER_NOTIFICATION_CLICK",
              icon: "@mipmap/ic_launcher",
              color: "#F7b305", // Use your app's primary color here
              priority: "high",
              channelId: "chat-messages"
            },
            priority: "high"
          },
          apns: {
            payload: {
              aps: {
                badge: 1,
                sound: "default",
                contentAvailable: true
              }
            },
            headers: {
              "apns-priority": "10"
            }
          }
        };
        
        // Ensure all data values are strings (FCM requirement)
        Object.keys(message.data || {}).forEach(key => {
          if (message.data) {
            message.data[key] = String(message.data[key]);
          }
        });
        
        console.log(`Sending notification to ${tokenBatch.length} devices`);
        
        // Use the correct method for MulticastMessage
        const response = await fcm.sendEachForMulticast(message);
        
        successCount += response.successCount;
        failureCount += response.failureCount;
        
        // Log detailed failures
        if (response.failureCount > 0) {
          response.responses.forEach((resp, index) => {
            if (!resp.success) {
              const token = tokenBatch[index];
              console.error(`Failed to send to token [${token.substring(0, 10)}...]: ${resp.error?.message}`);
              
              // Log invalid tokens for potential cleanup
              if (resp.error?.code === 'messaging/invalid-registration-token' || 
                  resp.error?.code === 'messaging/registration-token-not-registered') {
                console.log(`Invalid token found: ${token}`);
                // Here you could implement logic to remove invalid tokens from your database
              }
            }
          });
        }
      } catch (batchError) {
        console.error(`Error sending batch of notifications:`, batchError);
        failureCount += tokenBatch.length;
      }
    }

    console.log(`Notification summary: ${successCount} sent successfully, ${failureCount} failed`);
  } catch (error) {
    console.error("Error in sendNotificationToTokens:", error);
  }
}

// Function triggered when a new conversation is created
exports.onNewConversation = functions.firestore
  .document("conversations/{conversationId}")
  .onCreate(async (snapshot, context) => {
    try {
      const conversationData = snapshot.data() as ConversationData & { createdBy: string };
      const conversationId = context.params.conversationId;

      if (!conversationData || !conversationData.users || !conversationData.createdBy) {
        console.log("Invalid conversation data");
        return null;
      }

      // Get creator info for notification
      const creatorId = conversationData.createdBy;
      const creatorDoc = await db.collection("users").doc(creatorId).get();

      if (!creatorDoc.exists) {
        console.log("Creator document not found");
        return null;
      }

      const creatorData = creatorDoc.data();
      const creatorName = creatorData?.displayName || "Someone";

      // Get recipients (everyone except creator)
      const recipientIds = conversationData.users.filter(
        (userId: string) => userId !== creatorId
      );

      if (recipientIds.length === 0) {
        console.log("No recipients found");
        return null;
      }

      // Get FCM tokens for all recipients using the new helper function
      const tokenPromises = recipientIds.map(userId => getUserFcmTokens(userId));
      const tokensArrays = await Promise.all(tokenPromises);
      
      // Flatten the array of arrays into a single array of tokens
      const validTokens = tokensArrays.flat().filter(token => token && token.length > 0);

      if (validTokens.length === 0) {
        console.log("No valid FCM tokens found for any recipients");
        return null;
      }

      console.log(`Sending notifications to ${validTokens.length} devices`);

      // Prepare notification payload
      const notificationPayload: admin.messaging.MessagingPayload = {
        notification: {
          title: "New Conversation",
          body: `${creatorName} started a conversation with you`,
          clickAction: "FLUTTER_NOTIFICATION_CLICK",
        },
        data: {
          type: "conversation",
          conversationId: conversationId,
          creatorId: creatorId,
          creatorName: creatorName,
        },
      };

      // Send notification to all recipients
      const response = await fcm.sendToDevice(validTokens, notificationPayload);

      console.log("Notifications sent:", response.successCount);

      if (response.failureCount > 0) {
        console.error("Notification failures:", response.results);
      }

      return null;
    } catch (error) {
      console.error("Error sending conversation notification:", error);
      return null;
    }
  });

// HTTP function to send a topic notification
exports.sendTopicNotification = functions.https.onCall((data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Only authenticated users can send topic notifications"
    );
  }

  const topicData = data as unknown as {topic: string; title: string; body: string};
  const {topic, title, body} = topicData;

  // Validate parameters
  if (!topic || !title || !body) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing required parameters (topic, title, body)"
    );
  }

  const message: admin.messaging.Message = {
    notification: {
      title,
      body,
    },
    topic,
  };

  return fcm.send(message)
    .then((response) => {
      console.log("Successfully sent topic notification:", response);
      return {success: true, messageId: response};
    })
    .catch((error) => {
      console.error("Error sending topic notification:", error);
      throw new functions.https.HttpsError("internal", (error as Error).message);
    });
});
