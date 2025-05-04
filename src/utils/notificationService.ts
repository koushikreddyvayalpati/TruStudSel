import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Auth } from 'aws-amplify';
// Import using require since TypeScript can't find the module definition
const PushNotification = require('react-native-push-notification');

// Define constants for storage keys
const NOTIFICATION_STORAGE_KEY = '@notifications';

// Define notification types
type NotificationType = 'NEW_MESSAGE' | 'NEW_CONVERSATION' | 'GENERAL' | 'PROMO' | 'PROMOTIONAL';

// Define notification data structure
interface NotificationData {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: any;
  timestamp: number;
  read: boolean;
}

export default class NotificationService {
  private static instance: NotificationService;
  private initialized: boolean = false;
  private fcmToken: string | null = null;
  private unsubscribeTokenRefresh: (() => void) | null = null;
  private unsubscribeMessages: (() => void) | null = null;
  
  constructor() {
    if (NotificationService.instance) {
      return NotificationService.instance;
    }
    
    NotificationService.instance = this;
  }
  
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    try {
      // Configure local notifications
      PushNotification.configure({
        onNotification: function(notification: any) {
          console.log('LOCAL NOTIFICATION:', notification);
        },
        permissions: {
          alert: true,
          badge: true,
          sound: true,
        },
        popInitialNotification: true,
        requestPermissions: true,
      });
      
      // iOS specific setup for rich notifications
      if (Platform.OS === 'ios') {
        // Import iOS specific notification module
        const PushNotificationIOS = require('@react-native-community/push-notification-ios');
        
        // Register notification categories for iOS
        PushNotificationIOS.setNotificationCategories([
          {
            id: 'PROMOTIONAL',
            actions: [
              {
                id: 'view',
                title: 'View',
                options: { foreground: true }
              }
            ]
          }
        ]);
      }
      
      // Create notification channels for Android
      if (Platform.OS === 'android') {
        PushNotification.createChannel(
          {
            channelId: 'chat-messages',
            channelName: 'Chat Messages',
            channelDescription: 'Notifications for new chat messages',
            soundName: 'default',
            importance: 4,
            vibrate: true,
          },
          (created: boolean) => console.log(`Channel 'chat-messages' created: ${created}`)
        );
        
        PushNotification.createChannel(
          {
            channelId: 'general-notifications',
            channelName: 'General Notifications',
            channelDescription: 'General app notifications',
            soundName: 'default',
            importance: 3,
            vibrate: true,
          },
          (created: boolean) => console.log(`Channel 'general-notifications' created: ${created}`)
        );
        
        // Add promotional notification channel
        PushNotification.createChannel(
          {
            channelId: 'promotional-messages',
            channelName: 'Promotional Messages',
            channelDescription: 'Promotions and special offers',
            soundName: 'default',
            importance: 4, // High importance for promotions
            vibrate: true,
          },
          (created: boolean) => console.log(`Channel 'promotional-messages' created: ${created}`)
        );
      }
      
      // Import modular Firebase libraries
      const { getApp } = await import('@react-native-firebase/app');
      const { 
        getMessaging, 
        requestPermission, 
        getToken, 
        onTokenRefresh, 
        onMessage, 
        setBackgroundMessageHandler,
        AuthorizationStatus
      } = await import('@react-native-firebase/messaging');
      
      // Use modular API
      const app = getApp();
      const messagingInstance = getMessaging(app);
      
      // Request notification permissions
      const authStatus = await requestPermission(messagingInstance);
      const enabled =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL;
      
      if (!enabled) {
        console.log('User notification permissions denied or restricted');
        return;
      }
      
      // Check for existing FCM token
      this.fcmToken = await getToken(messagingInstance);
      console.log('FCM Token:', this.fcmToken);
      
      // Save the token to Firestore
      if (this.fcmToken) {
        await this.updateUserDeviceToken(this.fcmToken);
      }
      
      // Subscribe to token refresh
      this.unsubscribeTokenRefresh = onTokenRefresh(messagingInstance, async fcmToken => {
        this.fcmToken = fcmToken;
        console.log('FCM Token refreshed:', fcmToken);
        await this.updateUserDeviceToken(fcmToken);
      });
      
      // Set up message handlers for background and foreground
      this.unsubscribeMessages = onMessage(messagingInstance, async remoteMessage => {
        console.log('Foreground message received:', remoteMessage);
        await NotificationService.handleNotification(remoteMessage);
      });
      
      setBackgroundMessageHandler(messagingInstance, async remoteMessage => {
        console.log('Background message received:', remoteMessage);
        await NotificationService.handleNotification(remoteMessage);
        return Promise.resolve();
      });
      
      // Get current user and subscribe to their notifications
      try {
        const currentUser = await Auth.currentAuthenticatedUser();
        if (currentUser && currentUser.attributes && currentUser.attributes.email) {
          await this.subscribeToUserNotifications(currentUser.attributes.email);
        }
      } catch (userError) {
        console.log('No authenticated user found for notifications:', userError);
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing notification service:', error);
      throw error;
    }
  }
  
  async updateUserDeviceToken(token: string): Promise<void> {
    try {
      const currentUser = await Auth.currentAuthenticatedUser();
      if (currentUser) {
        // Store token in Firestore
        try {
          const { db } = await import('../services/firebaseService');
          const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
          
          // Create a reference to user's devices collection
          const deviceRef = doc(
            db, 
            'users', 
            currentUser.attributes.email, 
            'devices', 
            token
          );
          
          // Store the token with device info
          await setDoc(deviceRef, {
            token,
            platform: Platform.OS,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastActive: serverTimestamp(),
            appVersion: '1.0.0', // Replace with your app version
          });
          
          console.log(`FCM token stored in Firestore for user ${currentUser.attributes.email}`);
        } catch (firestoreError) {
          console.error('Error storing FCM token in Firestore:', firestoreError);
        }
        
        console.log(`Updated device token for user ${currentUser.attributes.email}: ${token}`);
      }
    } catch (error) {
      console.error('Error updating user device token:', error);
    }
  }
  
  // Handle notifications based on type
  static async handleNotification(remoteMessage: any): Promise<void> {
    try {
      if (!remoteMessage || !remoteMessage.data) {
        console.log('Received notification without data');
        return;
      }
      
      const { type, ...data } = remoteMessage.data;
      
      // Store notification for later retrieval
      await NotificationService.storeNotification({
        id: remoteMessage.messageId || `notification-${Date.now()}`,
        type: type as NotificationType || 'GENERAL',
        title: remoteMessage.notification?.title || '',
        body: remoteMessage.notification?.body || '',
        data,
        timestamp: Date.now(),
        read: false,
      });
      
      // Handle based on notification type
      switch (type) {
        case 'NEW_MESSAGE':
          await NotificationService.handleChatMessageNotification(data);
          break;
        case 'NEW_CONVERSATION':
          await NotificationService.handleNewConversationNotification(data);
          break;
        case 'PROMO':
        case 'PROMOTIONAL':
          console.log('Handling promotional notification:', data);
          // For iOS, ensure the notification payload has the correct structure for image display
          if (Platform.OS === 'ios') {
            // iOS requires a Notification Service Extension to handle images in background
            // Log the full data to help with debugging
            console.log('iOS promotional notification - full data:', JSON.stringify(remoteMessage));
            
            // For iOS 10+ we need to ensure the notification uses mutable-content flag
            PushNotification.localNotification({
              channelId: 'promotional-messages',
              title: remoteMessage.notification?.title || 'Special Offer',
              message: remoteMessage.notification?.body || 'Check out our latest offers',
              playSound: true,
              soundName: 'default',
              // iOS specific properties for rich media
              userInteraction: false,
              category: 'PROMOTIONAL',
              attachments: data.image ? [{ url: data.image, options: { typeHint: 'public.image' } }] : [],
              // Other iOS flags
              mutableContent: true,
              // User info
              userInfo: {
                ...data,
                type: 'PROMO',
                id: `promo_${Date.now()}`,
                navigateTo: data.navigateTo || 'Home',
                imageUrl: data.image || null,
                // Essential for iOS rich notifications
                'media-url': data.image || null,
                'fcm-options': { 
                  'image': data.image || null 
                }
              }
            });
          } else {
            // Android notification with image
            PushNotification.localNotification({
              channelId: 'promotional-messages',
              title: remoteMessage.notification?.title || 'Special Offer',
              message: remoteMessage.notification?.body || 'Check out our latest offers',
              playSound: true,
              soundName: 'default',
              // Image support for Android
              bigPictureUrl: data.image || null,
              bigLargeIcon: data.image ? "ic_launcher" : null,
              largeIconUrl: data.image || null,
              // Other settings
              priority: 'high',
              importance: 'high',
              userInfo: {
                ...data,
                type: 'PROMO',
                id: `promo_${Date.now()}`,
                navigateTo: data.navigateTo || 'Home',
                imageUrl: data.image || null
              }
            });
          }
          break;
        default:
          console.log('Handling general notification:', data);
          // Check for iOS vs Android to handle platform-specific features
          if (Platform.OS === 'ios' && data.image) {
            console.log('iOS general notification with image:', data.image);
            PushNotification.localNotification({
              channelId: 'general-notifications',
              title: remoteMessage.notification?.title || 'New Notification',
              message: remoteMessage.notification?.body || 'You have a new notification',
              playSound: true,
              soundName: 'default',
              // iOS specific for rich media
              category: 'GENERAL',
              attachments: [{ url: data.image, options: { typeHint: 'public.image' } }],
              // Critical for iOS rich notifications
              mutableContent: true,
              userInfo: {
                ...data,
                'media-url': data.image,
                'fcm-options': { 'image': data.image },
                type: 'GENERAL',
                id: `notification_${Date.now()}`
              }
            });
          } else {
            // Show local notification (Android or iOS without image)
            PushNotification.localNotification({
              channelId: 'general-notifications',
              title: remoteMessage.notification?.title || 'New Notification',
              message: remoteMessage.notification?.body || 'You have a new notification',
              playSound: true,
              soundName: 'default',
              // Check if there's an image for Android
              bigPictureUrl: data.image || null,
              bigLargeIcon: data.image ? "ic_launcher" : null,
              userInfo: {
                ...data,
                type: 'GENERAL',
                id: `notification_${Date.now()}`
              }
            });
          }
      }
    } catch (error) {
      console.error('Error handling notification:', error);
    }
  }
  
  // Handle new chat message notifications
  static async handleChatMessageNotification(data: any): Promise<void> {
    try {
      const { conversationId, senderId, message, text, senderName } = data;
      
      // Use text from data.text or data.message or default to empty string
      const messageContent = text || message || 'New message';
      
      if (!conversationId || !senderId) {
        console.log('Missing required data for chat notification', data);
        return;
      }
      
      // Update conversation in store if it's cached
    //   console.log(`Conversation needs refresh: ${conversationId}`);
      
      // Show high-priority local notification with all required settings
      PushNotification.localNotification({
        // Use chat-specific channel
        channelId: 'chat-messages',
        
        // Notification content
        title: data.title || `New message from ${senderName || 'Someone'}`,
        message: messageContent,
        
        // Sound and vibration
        playSound: true,
        soundName: 'default',
        vibrate: true,
        vibration: 300,
        
        // Maximum priority settings
        priority: 'max',
        importance: 'max',
        
        // UI display options
        visibility: 'public',  // Show on lock screen
        autoCancel: true,      // Auto dismiss when tapped
        largeIcon: "ic_launcher",         // Use app icon as large icon
        smallIcon: "ic_notification",     // Use notification icon
        
        // Wake options (essential for notifications while device is sleeping)
        allowWhileIdle: true,  // Show even when device is in low-power idle mode
        
        // Navigation data
        userInfo: { 
          conversationId, 
          senderId, 
          senderName,
          messageText: messageContent,
          navigateTo: 'Conversation',
          type: 'NEW_MESSAGE',
          id: `msg_${Date.now()}`,
          timestamp: Date.now()
        },
        
        // Force notification to show as a heads-up notification on Android
        ignoreInForeground: false,
        onlyAlertOnce: false,  // Alert every time, not just once
      });
      
      console.log('Processed chat message notification:', { conversationId, messageContent, senderName });
    } catch (error) {
      console.error('Error handling chat message notification:', error);
    }
  }
  
  // Handle new conversation notifications
  static async handleNewConversationNotification(data: any): Promise<void> {
    try {
      const { conversationId, creatorId, creatorName } = data;
      
      if (!conversationId) {
        console.log('Missing conversation ID in notification');
        return;
      }
      
      // Refresh conversations list when needed
      console.log(`Conversations list needs refresh for new conversation: ${conversationId}`);
      
      // Show high-priority notification for new conversation
      PushNotification.localNotification({
        // Channel ID for chat notifications
        channelId: 'chat-messages',
        
        // Notification content
        title: data.title || 'New Conversation',
        message: data.body || `${creatorName || 'Someone'} started a conversation with you`,
        
        // Sound and vibration
        playSound: true,
        soundName: 'default',
        vibrate: true,
        vibration: 300,
        
        // Maximum priority settings
        priority: 'max',
        importance: 'max',
        
        // UI display options
        visibility: 'public',  // Show on lock screen
        autoCancel: true,     // Auto dismiss when tapped
        largeIcon: "ic_launcher",         // Use app icon as large icon
        smallIcon: "ic_notification",     // Use notification icon
        
        // Wake options
        allowWhileIdle: true,  // Show even when device is in low-power idle mode
        
        // Navigation data
        userInfo: { 
          conversationId, 
          creatorId,
          creatorName,
          navigateTo: 'Messages',
          type: 'NEW_CONVERSATION',
          id: `conv_${Date.now()}`,
          timestamp: Date.now()
        },
        
        // Force notification to show as a heads-up notification
        ignoreInForeground: false,
        onlyAlertOnce: false,
      });
      
      console.log('Processed new conversation notification:', { conversationId, creatorName });
    } catch (error) {
      console.error('Error handling new conversation notification:', error);
    }
  }
  
  // Subscribe to a specific conversation's notifications
  async subscribeToConversation(conversationId: string): Promise<void> {
    try {
      // Import modular Firebase libraries
      const { getApp } = await import('@react-native-firebase/app');
      const { getMessaging, subscribeToTopic } = await import('@react-native-firebase/messaging');
      
      // Use modular API
      const app = getApp();
      const messagingInstance = getMessaging(app);
      await subscribeToTopic(messagingInstance, `conversation_${conversationId}`);
      
      console.log(`Subscribed to conversation: ${conversationId}`);
    } catch (error) {
      console.error(`Error subscribing to conversation ${conversationId}:`, error);
      throw error;
    }
  }
  
  // Unsubscribe from a conversation's notifications
  async unsubscribeFromConversation(conversationId: string): Promise<void> {
    try {
      // Import modular Firebase libraries
      const { getApp } = await import('@react-native-firebase/app');
      const { getMessaging, unsubscribeFromTopic } = await import('@react-native-firebase/messaging');
      
      // Use modular API
      const app = getApp();
      const messagingInstance = getMessaging(app);
      await unsubscribeFromTopic(messagingInstance, `conversation_${conversationId}`);
      
      console.log(`Unsubscribed from conversation: ${conversationId}`);
    } catch (error) {
      console.error(`Error unsubscribing from conversation ${conversationId}:`, error);
      throw error;
    }
  }
  
  // Subscribe to user-specific notifications
  async subscribeToUserNotifications(email: string): Promise<void> {
    if (!email) {
      console.error('No email provided for user notifications subscription');
      return;
    }
    
    try {
      // Format email to be valid for FCM topic (replace @ and . with _)
      const formattedEmail = email.replace(/[@.]/g, '_');
      
      // Import modular Firebase libraries
      const { getApp } = await import('@react-native-firebase/app');
      const { getMessaging, subscribeToTopic } = await import('@react-native-firebase/messaging');
      
      // Use modular API
      const app = getApp();
      const messagingInstance = getMessaging(app);
      await subscribeToTopic(messagingInstance, `user_${formattedEmail}`);
      
      console.log(`Subscribed to notifications for user: ${email}`);
    } catch (error) {
      console.error(`Error subscribing to user notifications for ${email}:`, error);
      throw error;
    }
  }
  
  // Method to subscribe to a topic (for backward compatibility with chatStore)
  static async subscribeToTopic(topic: string): Promise<void> {
    try {
      // Ensure topic name complies with Firebase requirements [a-zA-Z0-9-_.~%]{1,900}
      const sanitizedTopic = topic.replace(/[^a-zA-Z0-9\-_.~%]/g, '_');
      
      if (sanitizedTopic !== topic) {
        console.log(`Topic name sanitized from "${topic}" to "${sanitizedTopic}"`);
      }
      
      // Import modular Firebase libraries
      const { getApp } = await import('@react-native-firebase/app');
      const { getMessaging, subscribeToTopic } = await import('@react-native-firebase/messaging');
      
      // Use modular API
      const app = getApp();
      const messagingInstance = getMessaging(app);
      await subscribeToTopic(messagingInstance, sanitizedTopic);
    } catch (error) {
      console.error(`Error subscribing to topic ${topic}:`, error);
      throw error;
    }
  }
  
  // Store notification for later retrieval
  static async storeNotification(notification: NotificationData): Promise<void> {
    try {
      const storedNotifications = await this.getStoredNotifications();
      storedNotifications.push(notification);
      
      // Keep only last 50 notifications
      const limitedNotifications = storedNotifications
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 50);
      
      await AsyncStorage.setItem(
        NOTIFICATION_STORAGE_KEY,
        JSON.stringify(limitedNotifications)
      );
    } catch (error) {
      console.error('Error storing notification:', error);
    }
  }
  
  // Get all stored notifications
  static async getStoredNotifications(): Promise<NotificationData[]> {
    try {
      const notifications = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
      return notifications ? JSON.parse(notifications) : [];
    } catch (error) {
      console.error('Error getting stored notifications:', error);
      return [];
    }
  }
  
  // Mark notification as read
  static async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      const notifications = await this.getStoredNotifications();
      const updatedNotifications = notifications.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true } 
          : notification
      );
      
      await AsyncStorage.setItem(
        NOTIFICATION_STORAGE_KEY,
        JSON.stringify(updatedNotifications)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }
  
  // Get unread notifications count
  static async getUnreadCount(): Promise<number> {
    try {
      const notifications = await this.getStoredNotifications();
      return notifications.filter(notification => !notification.read).length;
    } catch (error) {
      console.error('Error getting unread notifications count:', error);
      return 0;
    }
  }
  
  // Clear all notifications
  static async clearAllNotifications(): Promise<void> {
    try {
      await AsyncStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify([]));
      PushNotification.cancelAllNotifications();
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }
  
  // Helper method to create iOS-compatible rich notification payload
  static formatIOSBackgroundImagePayload(title: string, body: string, imageUrl: string, data: any = {}): any {
    return {
      notification: {
        title,
        body,
        sound: 'default',
      },
      data: {
        ...data,
        image: imageUrl,
        // iOS background image notification requires these fields
        'media-url': imageUrl,
        'fcm-options': {
          'image': imageUrl
        },
      },
      android: {
        notification: {
          imageUrl,
          sound: 'default',
          priority: 'high',
          channelId: 'promotional-messages'
        }
      },
      apns: {
        payload: {
          aps: {
            'mutable-content': 1, // Required for iOS images in background notifications
            sound: 'default',
            'content-available': 1 // Ensures background processing
          }
        },
        fcm_options: {
          image: imageUrl
        }
      }
    };
  }
  
  // Send a chat notification to another user
  static async sendChatNotification(
    recipientEmail: string,
    senderName: string,
    messageContent: string,
    conversationId: string
  ): Promise<void> {
    try {
      // Sanitize recipient email for topic subscription
      const sanitizedRecipientEmail = recipientEmail.replace(/[@.]/g, '_');
      
      // Prepare the notification data
      const notificationData = {
        // Message details
        title: `Message from ${senderName}`,
        body: messageContent.length > 60 ? messageContent.substring(0, 57) + '...' : messageContent,
        
        // For routing when notification is tapped
        conversationId,
        senderName,
        type: 'NEW_MESSAGE',
        
        // Add a timestamp
        timestamp: new Date().toISOString()
      };
      
      console.log(`Preparing to send notification to ${recipientEmail} via topic user_${sanitizedRecipientEmail}`);
      
      // If you have a backend endpoint that sends FCM messages, use it here
      // For now, we'll just log the notification data
      console.log('⚠️ NOTIFICATION WOULD BE SENT:', {
        to: `user_${sanitizedRecipientEmail}`,
        data: notificationData
      });
      
      console.log('⚠️ NOTE: To actually send notifications, you need to set up Firebase Cloud Functions.');
      console.log('⚠️ See Firebase Console > Functions and deploy a Cloud Function to send FCM messages.');
      
      // Show a local notification as a fallback on the sender's device
      PushNotification.localNotification({
        channelId: 'chat-messages',
        title: `Message sent to ${recipientEmail.split('@')[0]}`,
        message: 'Your message was sent successfully',
        playSound: false,
      });
      
    } catch (error) {
      console.error('Error sending chat notification:', error);
    }
  }
  
  // Add a cleanup method to unsubscribe from Firebase listeners
  cleanup(): void {
    if (this.unsubscribeTokenRefresh) {
      this.unsubscribeTokenRefresh();
      this.unsubscribeTokenRefresh = null;
    }
    
    if (this.unsubscribeMessages) {
      this.unsubscribeMessages();
      this.unsubscribeMessages = null;
    }
    
    this.initialized = false;
    console.log('NotificationService cleaned up');
  }
} 