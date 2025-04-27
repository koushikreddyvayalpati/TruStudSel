/**
 * Notification Test Script
 * 
 * This script simulates sending notifications through Firebase Cloud Messaging
 * to test our notification implementation.
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Find the service account file
const findServiceAccountFile = () => {
  const possiblePaths = [
    'serviceAccountKey.json',
    'firebase-service-account.json',
    './firebase/serviceAccountKey.json',
    path.join(process.env.HOME, '.firebase', 'serviceAccountKey.json')
  ];
  
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      console.log(`Found service account file at: ${filePath}`);
      return filePath;
    }
  }
  
  return null;
};

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  try {
    const serviceAccountPath = findServiceAccountFile();
    
    if (!serviceAccountPath) {
      console.error('ERROR: No service account file found. Please download your Firebase service account key and place it in the project root as "serviceAccountKey.json"');
      console.error('You can download it from Firebase Console > Project Settings > Service Accounts > Generate New Private Key');
      process.exit(1);
    }
    
    const serviceAccount = require(serviceAccountPath);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    console.log('Firebase Admin SDK initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    return false;
  }
};

// Send a test notification to a topic
const sendTestNotification = async (topic, title, body, data) => {
  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      topic,
    };
    
    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
    return response;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Main test function
const runTests = async () => {
  if (!initializeFirebase()) {
    return;
  }
  
  try {
    // Test 1: Send a general notification
    console.log('\n--- TEST 1: General Notification ---');
    await sendTestNotification(
      'general', // Replace with a topic your app is subscribed to
      'Test Notification',
      'This is a test notification from the command line',
      {
        type: 'GENERAL',
        timestamp: new Date().toISOString(),
      }
    );
    
    // Test 2: Simulate a chat message notification
    console.log('\n--- TEST 2: Chat Message Notification ---');
    await sendTestNotification(
      'chat_test', // Replace with a conversation topic
      'New Message from Test User',
      'Hello! This is a test chat message notification.',
      {
        type: 'NEW_MESSAGE',
        conversationId: 'test-conversation-id',
        senderId: 'test-sender-id',
        message: 'Hello! This is a test chat message notification.',
        senderName: 'Test User',
        timestamp: new Date().toISOString(),
      }
    );
    
    // Test 3: Simulate a new conversation notification
    console.log('\n--- TEST 3: New Conversation Notification ---');
    await sendTestNotification(
      'user_test_example_com', // Replace with a user topic
      'New Conversation',
      'Test User started a conversation with you',
      {
        type: 'NEW_CONVERSATION',
        conversationId: 'test-new-conversation-id',
        timestamp: new Date().toISOString(),
      }
    );
    
    console.log('\n✅ All test notifications sent successfully!');
    console.log('Check your device to see if notifications were received.');
    console.log('NOTE: Make sure your app is subscribed to the topics you\'re testing with.');
    
  } catch (error) {
    console.error('Error running tests:', error);
  }
};

// Run the tests
runTests(); 