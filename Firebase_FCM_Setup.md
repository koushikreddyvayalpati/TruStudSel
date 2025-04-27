# Firebase Cloud Messaging Setup Guide

This guide will help you set up Firebase Cloud Messaging (FCM) to enable push notifications in your TruStudSel app.

## Prerequisites

1. Firebase project with Firestore database
2. Firebase CLI installed (`npm install -g firebase-tools`)
3. Basic knowledge of Node.js

## Step 1: Enable Cloud Messaging in Firebase Console

1. Go to your [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to Engage → Cloud Messaging
4. Follow the setup flow if you haven't enabled it yet

## Step 2: Set Up Cloud Functions for FCM

1. Initialize Firebase functions in your project folder:

```bash
# Navigate to your project root
cd /Users/vayalpatikoushikreddy/Desktop/Studentapp/TruStudSel

# Login to Firebase CLI
firebase login

# Initialize Firebase Functions
firebase init functions
```

2. Choose JavaScript or TypeScript for your functions.

3. Create a function to send FCM messages. Replace the contents of `functions/index.js` with:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Send notification when a new message is created
exports.sendMessageNotification = functions.firestore
  .document('conversations/{conversationId}/messages/{messageId}')
  .onCreate(async (snapshot, context) => {
    try {
      const messageData = snapshot.data();
      const { conversationId, messageId } = context.params;
      
      // Get the conversation details to find recipients
      const conversationRef = admin.firestore().collection('conversations').doc(conversationId);
      const conversationSnapshot = await conversationRef.get();
      
      if (!conversationSnapshot.exists) {
        console.log('Conversation not found:', conversationId);
        return null;
      }
      
      const conversation = conversationSnapshot.data();
      const { participants } = conversation;
      
      // Don't send notification to the sender
      const recipientEmails = participants.filter(email => email !== messageData.senderEmail);
      
      if (recipientEmails.length === 0) {
        console.log('No recipients found for notification');
        return null;
      }
      
      // Format sender name
      const senderName = messageData.senderName || messageData.senderEmail.split('@')[0];
      
      // Create notification payload
      const payload = {
        notification: {
          title: `Message from ${senderName}`,
          body: messageData.content.length > 100 ? 
            messageData.content.substring(0, 97) + '...' : 
            messageData.content,
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        },
        data: {
          type: 'NEW_MESSAGE',
          conversationId: conversationId,
          messageId: messageId,
          senderEmail: messageData.senderEmail,
          senderName: senderName,
          timestamp: messageData.timestamp.toDate().toISOString()
        }
      };
      
      // Send to each recipient via their topic subscription
      const sendPromises = recipientEmails.map(email => {
        const sanitizedEmail = email.replace(/[@.]/g, '_');
        const topic = `user_${sanitizedEmail}`;
        console.log(`Sending notification to topic: ${topic}`);
        return admin.messaging().sendToTopic(topic, payload);
      });
      
      await Promise.all(sendPromises);
      console.log(`Sent notifications to ${sendPromises.length} recipients`);
      
      return null;
    } catch (error) {
      console.error('Error sending notification:', error);
      return null;
    }
  });

// Optional: Send notification when a user is added to a conversation
exports.sendNewConversationNotification = functions.firestore
  .document('conversations/{conversationId}')
  .onCreate(async (snapshot, context) => {
    // Similar implementation for new conversation notifications
  });
```

4. Deploy the functions to Firebase:

```bash
firebase deploy --only functions
```

## Step 3: Testing FCM Setup

1. Make sure your app is registering FCM tokens correctly
2. Send a test message:
   - In Firebase Console, go to Messaging → Send your first message
   - Choose "Send test message"
   - Enter a FCM registration token from your app logs
   - Fill in notification details and send

## Troubleshooting

1. Check Firebase Functions logs in the console for any errors
2. Verify that FCM tokens are being properly stored in Firestore
3. Make sure your app has notification permissions
4. Check that topic subscriptions are working by testing with the Firebase console
5. Verify the app is handling received notifications properly

## Next Steps

- Set up analytics to track notification open rates
- Implement notification settings in your app
- Add support for different notification types
- Configure notification channels for Android

Remember that FCM tokens may change, so make sure your app updates them regularly! 