import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid } from 'react-native';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebaseService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Auth } from 'aws-amplify';
import { NavigationContainerRef } from '@react-navigation/native';
import { configureStatusBar } from './statusBarManager';
import useChatStore from '../store/chatStore';

// Push notification module
const PushNotification = require('react-native-push-notification');

// Token storage key
const FCM_TOKEN_KEY = '@fcm_token';

// Navigation reference to allow navigation from outside React components
let navigationRef: NavigationContainerRef<any> | null = null;

// Import queue for when user isn't authenticated yet
let pendingFirestoreOperations: (() => Promise<void>)[] = [];
let isAuthenticated = false;

// Set navigation reference
export const setNavigationReference = (ref: NavigationContainerRef<any>) => {
  navigationRef = ref;
};

/**
 * Should be called after successful login to update tokens
 */
export const updateTokensAfterLogin = async (): Promise<void> => {
  console.log('=========== FCM DEBUG ===========');
  console.log('User logged in, updating FCM token in Firestore');
  isAuthenticated = true;
  
  // Get token from storage
  const fcmToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);
  if (fcmToken) {
    // console.log('Found stored FCM token:', fcmToken);
    await saveTokenToFirestore(fcmToken);
  } else {
    console.log('No FCM token found in storage, requesting new token');
    await registerDevice();
  }
  
  // Process any pending operations
  if (pendingFirestoreOperations.length > 0) {
    console.log(`Processing ${pendingFirestoreOperations.length} pending Firestore operations`);
    for (const operation of [...pendingFirestoreOperations]) {
      try {
        await operation();
      } catch (error) {
        console.error('Error processing pending operation:', error);
      }
    }
    pendingFirestoreOperations = [];
  }
  console.log('======= FCM DEBUG END =======');
};

/**
 * Configure local notifications
 */
export const configureLocalNotifications = () => {
  PushNotification.configure({
    // Called when a remote or local notification is opened or received
    onNotification: function (notification: any) {
      console.log('LOCAL NOTIFICATION:', notification);
      
      // Handle notification navigation
      if (notification.data && notification.data.navigateTo) {
        handleNotificationNavigation(notification.data);
      }
    },
    
    // IOS ONLY
    permissions: {
      alert: true,
      badge: true,
      sound: true,
    },

    popInitialNotification: true,
    requestPermissions: Platform.OS === 'ios', // Only request permissions automatically on iOS
  });

  // Create default channels for Android
  if (Platform.OS === 'android') {
    PushNotification.createChannel(
      {
        channelId: 'default-channel',
        channelName: 'Default Channel',
        channelDescription: 'Default notifications channel',
        soundName: 'default',
        importance: 4, // High importance
        vibrate: true,
      },
      (created: boolean) => console.log(`Default channel created: ${created}`)
    );

    PushNotification.createChannel(
      {
        channelId: 'chat-messages',
        channelName: 'Chat Messages',
        channelDescription: 'Notifications for chat messages',
        soundName: 'default',
        importance: 5, // Maximum importance
        vibrate: true,
      },
      (created: boolean) => console.log(`Chat channel created: ${created}`)
    );
    
    // Add promotional channel
    PushNotification.createChannel(
      {
        channelId: 'promotional-messages',
        channelName: 'Promotions',
        channelDescription: 'Promotional offers and marketing messages',
        soundName: 'default',
        importance: 3, // Medium importance
        vibrate: true,
      },
      (created: boolean) => console.log(`Promotional channel created: ${created}`)
    );
  }
};

/**
 * Request notification permissions and register the device
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    // For Android 13+ (API level 33+), we need to request POST_NOTIFICATIONS permission
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: "Notification Permission",
          message: "Allow TruStudSel to send you notifications",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK"
        }
      );
      
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Android notification permission denied');
        return false;
      }
    }
    
    // Request Firebase Messaging permission
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    
    if (enabled) {
      console.log('Notification permissions granted');
      await registerDevice();
      return true;
    } else {
      console.log('Notification permissions denied');
      return false;
    }
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

/**
 * Get the FCM token, store it locally, and register in Firestore
 */
export const registerDevice = async (): Promise<string | null> => {
  console.log('===== REGISTERING DEVICE FOR FCM =====');
  try {
    // Get current FCM token
    console.log('Requesting FCM token from Firebase...');
    const fcmToken = await messaging().getToken();
    // console.log('Received FCM token from Firebase:', fcmToken);
    
    // Save token to local storage
    await AsyncStorage.setItem(FCM_TOKEN_KEY, fcmToken);
    console.log('FCM token saved to AsyncStorage');
    
    // Register token with the server
    await saveTokenToFirestore(fcmToken);
    
    // console.log('Device registered with FCM token:', fcmToken);
    console.log('===== DEVICE REGISTRATION COMPLETE =====');
    return fcmToken;
  } catch (error) {
    console.error('Failed to register device:', error);
    console.log('===== DEVICE REGISTRATION FAILED =====');
    return null;
  }
};

/**
 * Save the FCM token to Firestore
 */
export const saveTokenToFirestore = async (fcmToken: string): Promise<void> => {
  console.log('===== FCM TOKEN SAVE =====');
  if (!fcmToken || fcmToken.trim() === '') {
    console.log('Invalid FCM token, not saving to Firestore');
    return;
  }

  // Always update the token in AsyncStorage
  await AsyncStorage.setItem(FCM_TOKEN_KEY, fcmToken);
  console.log('FCM token saved to AsyncStorage with key:', FCM_TOKEN_KEY);

  try {
    let user = null;
    
    try {
      // Try to get current user - don't retry, as we'll queue if not authenticated
      user = await Auth.currentAuthenticatedUser();
    //   console.log('Retrieved authenticated user with email:', user.attributes.email);
    } catch (error) {
      console.log('User not authenticated, saving token operation for later');
      
      // Queue this operation to run after login
      if (!isAuthenticated) {
        pendingFirestoreOperations.push(async () => {
          await saveTokenToFirestore(fcmToken);
        });
        console.log('Added token save operation to pending queue');
        return;
      }
    }
    
    if (!user || !user.attributes.email) {
      console.log('No authenticated user found or missing email, token saved locally only');
      return;
    }
    
    const userEmail = user.attributes.email;
    
    // Get basic device info
    const deviceInfo = {
      token: fcmToken,
      device: Platform.OS,
      deviceModel: Platform.OS === 'ios' ? 'iOS Device' : 'Android Device', 
      appVersion: '1.0.0', // Replace with your app's version or get dynamically
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastActive: serverTimestamp()
    };
    
    // Save to user's devices collection
    const deviceRef = doc(db, 'users', userEmail, 'devices', fcmToken);
    // console.log(`Saving FCM token to Firestore path: users/${userEmail}/devices/${fcmToken}`);
    
    await setDoc(deviceRef, deviceInfo, { merge: true });
    
    // console.log('FCM token saved to Firestore for user:', userEmail);
    console.log('===== FCM TOKEN SAVE COMPLETE =====');
  } catch (error) {
    console.error('Error saving FCM token to Firestore:', error);
    console.log('===== FCM TOKEN SAVE FAILED =====');
  }
};

/**
 * Set up message handlers for both foreground and background messages
 */
export const setupMessageListeners = () => {
  // Handle foreground messages
  const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
    console.log('Foreground message received:', remoteMessage);

    // Process notification data
    const notification = remoteMessage.notification || {};
    const data = remoteMessage.data || {};
    
    // Default to 'default' type for fallback behavior
    const notificationType = data.type || 'default';
    
    // Check if this is a promotional message
    const isPromoMessage = notificationType === 'promo' || notificationType === 'promotional' || notificationType === 'PROMO' || notificationType === 'PROMOTIONAL';
    
    // Extract image URL if present in the notification payload
    const imageUrl = data.image || remoteMessage.notification?.android?.imageUrl || null;
    
    console.log(`Processing ${notificationType} notification${imageUrl ? ' with image' : ''}`);
    
    // Update conversation data if this is a message notification
    if ((notificationType === 'message' || data.conversationId) && !isPromoMessage) {
      try {
        // Update unread count
        const chatStore = useChatStore.getState();
        
        // If user has a current email (is logged in), fetch new data
        if (chatStore.currentUserEmail) {
          console.log('[Foreground] Updating conversations due to incoming message');
          
          // Refresh conversations to update unread count in the store
          await chatStore.fetchConversations(true);
          
          // Force a re-calculation of the unread count
          const totalUnread = chatStore.getTotalUnreadCount();
          
          // Update the badge count
          if (Platform.OS === 'ios') {
            PushNotification.setApplicationIconBadgeNumber(totalUnread);
          }
          
          // Persist the updated count for next app launch
          await chatStore.persistUnreadCount(totalUnread);
          
          console.log(`[Foreground] Updated unread count to ${totalUnread}`);
        }
      } catch (error) {
        console.error('Error processing foreground message:', error);
      }
    }
    
    // Display even if app is in foreground with high priority
    showLocalNotification({
      title: notification.title || (notificationType === 'message' ? 'New Message' : isPromoMessage ? 'Special Offer' : 'New Notification'),
      body: notification.body || (notificationType === 'message' ? 'You have a new message' : isPromoMessage ? 'Check out our latest offers' : 'New notification'),
      data: {
        ...data,
        // Ensure these fields are present for navigation
        id: `${Date.now()}`,
        type: notificationType,
        foreground: true, // Flag that this was received in foreground
        image: imageUrl, // Pass the image URL if present
      }
    });
  });
  
  // Handle background messages
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('Background message received:', remoteMessage);
    
    // Most background messages on Android are already displayed as notifications
    // by the FCM SDK. This handler is for additional processing.
    const data = remoteMessage.data || {};
    
    // Update conversation data if this is a message notification
    if (data.type === 'message' || data.conversationId) {
      try {
        // Update unread message count in background
        const chatStore = useChatStore.getState();
        
        // If we have a current user, update the count
        if (chatStore.currentUserEmail) {
          console.log('[Background] Updating conversations due to incoming message');
          
          // Fetch conversations to refresh the unread count
          await chatStore.fetchConversations(true);
          
          // Force a re-calculation of the unread count
          const totalUnread = chatStore.getTotalUnreadCount();
          
          // Persist the updated count
          await chatStore.persistUnreadCount(totalUnread);
        }
      } catch (error) {
        console.error('Error processing background message:', error);
      }
    }
    
    return Promise.resolve();
  });
  
  // Handle notification open events (when user taps a notification)
  messaging().onNotificationOpenedApp(remoteMessage => {
    console.log('Notification opened app from background state:', remoteMessage);
    
    if (remoteMessage.data) {
      // Log before navigating
      console.log('Navigating from notification tap:', remoteMessage.data);
      
      // Check if this is a message notification and update unread count
      const data = remoteMessage.data;
      if (data.type === 'message' || data.conversationId) {
        try {
          // Update unread counts when notification is tapped
          const chatStore = useChatStore.getState();
          if (chatStore.currentUserEmail) {
            console.log('[NotificationOpen] Updating conversations due to notification tap');
            
            // Fetch fresh conversations and update counts
            setTimeout(() => {
              chatStore.fetchConversations(true);
              
              // The navigation to the chat screen will handle marking as read
            }, 300);
          }
        } catch (error) {
          console.error('Error updating data after notification tap:', error);
        }
      }
      
      // Handle navigation
      handleNotificationNavigation(remoteMessage.data);
    }
  });
  
  // Check if app was opened from a notification (cold start)
  messaging()
    .getInitialNotification()
    .then(remoteMessage => {
      if (remoteMessage) {
        console.log('[PushNotification] App opened from quit state notification:', 
            JSON.stringify(remoteMessage, null, 2));
        
        if (remoteMessage.data) {
          // Process the notification data more carefully
          try {
            // Check for critical fields
            const data = remoteMessage.data;
            
            // Ensure we have either a conversationId or senderEmail for chat navigation
            if (data.type === 'message' || data.type === 'chat' || data.type === 'NEW_MESSAGE') {
              // For chat messages, explicitly add senderEmail from available data
              if (!data.senderEmail && data.conversationId) {
                console.log('[PushNotification] Using conversationId as senderEmail for navigation');
                data.senderEmail = data.conversationId;
              }
              
              if (!data.senderName && remoteMessage.notification?.title) {
                const title = remoteMessage.notification.title;
                if (title.includes('from')) {
                  // If title has format "Message from XYZ", extract XYZ as senderName
                  const match = title.match(/from\s+(.+)/i);
                  if (match && match[1]) {
                    data.senderName = match[1];
                    console.log('[PushNotification] Extracted senderName from notification title:', data.senderName);
                  }
                }
              }
            }
            
            // Store enhanced data and set explicit navigation flag for cold start
            const enhancedData = {
              ...data,
              // Flag this as a cold start notification
              _coldStart: true,
              _notificationTitle: remoteMessage.notification?.title || 'Notification',
              _notificationBody: remoteMessage.notification?.body || '',
              // Ensure we preserve sender data for navigation
              senderEmail: data.senderEmail || data.conversationId || '',
              senderName: data.senderName || 'Chat'
            };
            
            // Store the notification data to handle after navigation is ready
            AsyncStorage.setItem('INITIAL_NOTIFICATION', JSON.stringify(enhancedData));
            console.log('[PushNotification] Stored enhanced notification data for cold start navigation');
          } catch (error) {
            console.error('[PushNotification] Error processing cold start notification:', error);
            // Store original data as fallback
            AsyncStorage.setItem('INITIAL_NOTIFICATION', JSON.stringify(remoteMessage.data));
          }
        }
      }
    })
    .catch(error => {
      console.error('[PushNotification] Error checking for initial notification:', error);
    });
    
  // Listen for token refreshes and update stored token
  const unsubscribeTokenRefresh = messaging().onTokenRefresh(async (token) => {
    console.log('FCM token refreshed:', token);
    
    // Save the new token
    await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
    
    // Update the token in Firestore
    await saveTokenToFirestore(token);
  });
  
  // Return cleanup function that unsubscribes from all listeners
  return () => {
    unsubscribeForeground();
    unsubscribeTokenRefresh();
  };
};

/**
 * Subscribe to a specific topic
 */
export const subscribeToTopic = async (topic: string): Promise<boolean> => {
  try {
    await messaging().subscribeToTopic(topic);
    console.log(`Subscribed to topic: ${topic}`);
    return true;
  } catch (error) {
    console.error(`Failed to subscribe to topic ${topic}:`, error);
    return false;
  }
};

/**
 * Unsubscribe from a specific topic
 */
export const unsubscribeFromTopic = async (topic: string): Promise<boolean> => {
  try {
    await messaging().unsubscribeFromTopic(topic);
    console.log(`Unsubscribed from topic: ${topic}`);
    return true;
  } catch (error) {
    console.error(`Failed to unsubscribe from topic ${topic}:`, error);
    return false;
  }
};

/**
 * Show a local notification
 */
export const showLocalNotification = ({ 
  title, 
  body, 
  data = {} 
}: { 
  title: string; 
  body: string; 
  data?: any;
}) => {
  const isMessageNotification = data.type === 'message' || data.conversationId;
  
  // Make sure the channelId is set properly
  const channelId = isMessageNotification ? 'chat-messages' : 'default-channel';
  
  // Create notification configuration with maximum priority
  PushNotification.localNotification({
    channelId: channelId,
    title,
    message: body,
    playSound: true,
    soundName: 'default',
    importance: 'max', // Maximum importance
    priority: 'max', // Maximum priority
    visibility: 'public', // Show on lock screen
    vibrate: true,
    vibration: 300,
    autoCancel: true, // Auto cancel when clicked
    largeIcon: "ic_launcher", // Use app icon
    smallIcon: "ic_notification", // Use notification icon
    // Add image support for promotional messages
    bigPictureUrl: data.image || null, // Support for image in notification (Android)
    bigLargeIcon: data.image ? "ic_launcher" : null, // Use app icon in expanded layout
    // iOS image support
    attachments: data.image ? [{ url: data.image }] : null,
    // Make notification appear even when app is in foreground
    ignoreInForeground: false,
    // Ensure notification wakes up device when screen is off
    userInfo: {
      ...data,
      id: data.id || `msg_${Date.now()}`,
      // Add explicit navigation info if not present
      navigateTo: data.navigateTo || (isMessageNotification ? 'Conversation' : undefined)
    },
    // For Android, allow notification while idle
    allowWhileIdle: true
  });
};

/**
 * Handle navigation based on notification data
 */
export const handleNotificationNavigation = (data: any) => {
  if (!navigationRef || !navigationRef.isReady()) {
    console.log('Navigation not ready, cannot navigate from notification');
    return;
  }
  
  try {
    // Configure status bar with consistent settings
    configureStatusBar();
    
    console.log('[PushNotification] Navigating from notification with data:', JSON.stringify(data, null, 2));
    
    // Check if we have the essential data needed for navigation
    if (!data) {
      console.error('[PushNotification] No data provided for navigation');
      return;
    }
    
    // Get current user email for comparison with conversation ID
    const getCurrentUserEmail = async () => {
      try {
        // First check chatStore (fastest)
        const chatStore = (await import('../store/chatStore')).default.getState();
        if (chatStore.currentUserEmail) {
          return chatStore.currentUserEmail;
        }
        
        // Otherwise try to get it from Firebase
        const getCurrentUser = (await import('../services/firebaseChatService')).getCurrentUser;
        const user = await getCurrentUser();
        return user?.email || null;
      } catch (error) {
        console.error('[PushNotification] Error getting current user email:', error);
        return null;
      }
    };

    // Improve extraction from conversation ID (format: user1_user2)
    const extractOtherUserEmail = (conversationId: string, currentUserEmail: string): string => {
      if (!conversationId || !currentUserEmail) return conversationId;
      
      // Check if the conversationId contains the userEmail
      if (!conversationId.includes(currentUserEmail)) {
        console.log('[PushNotification] Current user email not found in conversationId, using conversationId as fallback');
        return conversationId;
      }
      
      // If conversationId contains underscore, it's likely in the format user1_user2
      if (conversationId.includes('_')) {
        const parts = conversationId.split('_');
        
        // Find the part that doesn't match current user's email
        for (const part of parts) {
          // Skip empty parts
          if (!part) continue;
          
          // Skip parts that match current user email
          if (part === currentUserEmail) continue;
          
          // If part contains @ symbol, it's likely an email
          if (part.includes('@')) {
            console.log('[PushNotification] Extracted recipient email from conversationId:', part);
            return part;
          }
        }
      }
      
      // Return the entire conversationId as fallback
      return conversationId;
    };
    
    // Delay navigation to ensure the UI is ready and give time to extract user email
    setTimeout(async () => {
      // At this point we know navigationRef is not null from the check above
      const nav = navigationRef!;
      
      // Provide detailed debugging for what's available
      console.log('[PushNotification] Navigation data check:');
      console.log('- Has conversationId:', !!data.conversationId);
      console.log('- Has senderEmail:', !!data.senderEmail);
      console.log('- Has senderId:', !!data.senderId);
      console.log('- Has navigateTo:', !!data.navigateTo);
      console.log('- Has type:', data.type);
      
      // If we have a senderId that looks like an email, use it directly
      if (data.senderId && data.senderId.includes('@') && data.senderId !== await getCurrentUserEmail()) {
        console.log('[PushNotification] Using senderId as recipient email:', data.senderId);
        nav.navigate('FirebaseChatScreen', { 
          recipientEmail: data.senderId,
          recipientName: data.senderName || 'Chat'
        });
        return;
      }
      
      // Check for conversation with proper recipient extraction
      if (data.conversationId) {
        const currentUserEmail = await getCurrentUserEmail();
        console.log('[PushNotification] Current user email:', currentUserEmail);
        
        // Extract the other user's email from the conversation ID
        const recipientEmail = data.senderId || extractOtherUserEmail(data.conversationId, currentUserEmail);
        const recipientName = data.senderName || 'Chat';
        
        console.log(`[PushNotification] Navigation params: recipientEmail=${recipientEmail}, recipientName=${recipientName}`);
        
        // Navigate to FirebaseChatScreen with available data
        nav.navigate('FirebaseChatScreen', { 
          recipientEmail,
          recipientName
        });
      } 
      // If we have sender email but no conversation ID, still navigate to chat
      else if (data.senderEmail) {
        // Try to extract correct email from senderEmail if it looks like a conversation ID
        const currentUserEmail = await getCurrentUserEmail();
        const recipientEmail = data.senderEmail.includes('_') ? 
          extractOtherUserEmail(data.senderEmail, currentUserEmail) : 
          data.senderEmail;
        
        console.log('[PushNotification] Navigating to chat with extracted sender email:', recipientEmail);
        nav.navigate('FirebaseChatScreen', { 
          recipientEmail,
          recipientName: data.senderName || 'Chat'
        });
      }
      // If we have explicit navigateTo parameter, use that
      else if (data.navigateTo) {
        console.log(`[PushNotification] Navigating to specified screen: ${data.navigateTo}`);
        nav.navigate(data.navigateTo, data.params || {});
      }
      // For other chat-type notifications without enough data, try to go to messages
      else if (data.type === 'message' || data.type === 'chat' || data.type === 'NEW_MESSAGE') {
        console.log('[PushNotification] Generic chat notification - navigating to MessagesScreen');
        nav.navigate('MessagesScreen');
      }
      // Fallback for any other notification
      else {
        console.log('[PushNotification] No specific navigation target found, navigating to Home');
        nav.navigate('Home');
      }
    }, 500); // Increased from 300ms to 500ms for more reliability
  } catch (error) {
    console.error('[PushNotification] Error navigating from notification:', error);
  }
};

/**
 * Check for initial notification when app starts
 */
export const checkInitialNotification = async () => {
  try {
    // Configure status bar for consistent appearance
    configureStatusBar();
    
    console.log('[PushNotification] Checking for initial notification data in storage');
    const initialNotificationData = await AsyncStorage.getItem('INITIAL_NOTIFICATION');
    
    if (initialNotificationData) {
      console.log('[PushNotification] Found initial notification data:', initialNotificationData);
      
      try {
        // Parse the notification data
        const data = JSON.parse(initialNotificationData);
        console.log('[PushNotification] Parsed notification data:', JSON.stringify(data, null, 2));
        
        // Check if payload contains the necessary fields
        if (!data) {
          console.error('[PushNotification] Invalid notification data format');
          await AsyncStorage.removeItem('INITIAL_NOTIFICATION');
          return;
        }
        
        // Clear the stored notification
        await AsyncStorage.removeItem('INITIAL_NOTIFICATION');
        console.log('[PushNotification] Cleared initial notification from storage');
        
        // Make sure fields are strings where needed
        if (data.conversationId && typeof data.conversationId !== 'string') {
          data.conversationId = String(data.conversationId);
        }
        
        if (data.senderEmail && typeof data.senderEmail !== 'string') {
          data.senderEmail = String(data.senderEmail);
        }
        
        // Check if this is a message notification with a conversation ID but no sender email
        if (data.conversationId && !data.senderEmail) {
          console.log('[PushNotification] Found conversationId but no senderEmail, using conversationId as recipientEmail');
          // For compatibility, add senderEmail field using conversationId when missing
          data.senderEmail = data.conversationId;
        }
        
        // Handle the navigation with enhanced data
        console.log('[PushNotification] Handling initial notification navigation');
        setTimeout(() => {
          handleNotificationNavigation(data);
        }, 500); // Small delay to ensure navigation is stable
      } catch (parseError) {
        console.error('[PushNotification] Error parsing initial notification data:', parseError);
        await AsyncStorage.removeItem('INITIAL_NOTIFICATION');
      }
    } else {
      console.log('[PushNotification] No initial notification data found');
    }
  } catch (error) {
    console.error('[PushNotification] Error checking initial notification:', error);
    
    // Clean up if there was an error to avoid persistent bad notification data
    try {
      await AsyncStorage.removeItem('INITIAL_NOTIFICATION');
    } catch {
      // Ignore cleanup errors
    }
  }
};

/**
 * Update the device's last active timestamp
 */
export const updateDeviceActivity = async (): Promise<void> => {
  try {
    const fcmToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);
    if (!fcmToken) return;
    
    try {
      const user = await Auth.currentAuthenticatedUser();
      if (!user || !user.attributes.email) {
        console.log('No authenticated user found, skipping device activity update');
        return;
      }
      
      const deviceRef = doc(db, 'users', user.attributes.email, 'devices', fcmToken);
      
      await setDoc(deviceRef, {
        updatedAt: serverTimestamp(),
        lastActive: serverTimestamp()
      }, { merge: true });
      
    //   console.log('Device activity updated for user:', user.attributes.email);
    } catch (error) {
      // If not authenticated, silently skip - this is expected behavior
      if ((error as Error).toString().includes('not authenticated')) {
        console.log('User not authenticated, skipping device activity update');
        return;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error updating device activity:', error);
  }
};

// Initialize module
export const initPushNotifications = async () => {
  console.log('Initializing push notifications...');
  
  try {
    // Step 1: Configure local notifications with improved settings
    configureLocalNotifications();
    console.log('Local notifications configured');
    
    // Step 2: Request necessary permissions - comprehensive approach
    const permissionsGranted = await requestNotificationPermissions();
    if (!permissionsGranted) {
      console.log('Notification permissions were denied, continuing with limited functionality');
      
      // On Android, we can still show a dialog explaining the benefits of notifications
      if (Platform.OS === 'android') {
        PushNotification.createChannel(
          {
            channelId: 'reminder-channel',
            channelName: 'Permission Reminder',
            channelDescription: 'Used to remind you about enabling notifications',
            importance: 3,
            vibrate: true,
          },
          (created: boolean) => console.log(`Reminder channel created: ${created}`)
        );
        
        // Show a local-only notification explaining the benefits
        PushNotification.localNotification({
          channelId: 'reminder-channel',
          title: 'Enable Notifications',
          message: 'Enable notifications to stay updated with your messages and conversations',
          importance: 'high',
          priority: 'high',
          visibility: 'public',
        });
      }
    } else {
      console.log('Notification permissions granted successfully');
    }
    
    // Step 3: Set up message listeners (even if permissions denied, as the user may grant them later)
    setupMessageListeners();
    console.log('Message listeners set up');
    
    // Step 4: Create all necessary notification channels with the right settings for Android
    if (Platform.OS === 'android') {
      // Ensure chat notifications have the highest priority
      PushNotification.createChannel(
        {
          channelId: 'chat-messages',
          channelName: 'Chat Messages',
          channelDescription: 'Notifications for new chat messages',
          soundName: 'default',
          importance: 5, // Maximum importance (IMPORTANCE_HIGH)
          vibrate: true,
          vibration: 300,
        },
        (created: boolean) => console.log(`Chat channel created: ${created}`)
      );
      
      // Default channel for other notifications
      PushNotification.createChannel(
        {
          channelId: 'default-channel',
          channelName: 'General Notifications',
          channelDescription: 'General app notifications',
          soundName: 'default',
          importance: 4, // High importance
          vibrate: true,
        },
        (created: boolean) => console.log(`Default channel created: ${created}`)
      );
      
      // Promotional channel for marketing messages
      PushNotification.createChannel(
        {
          channelId: 'promotional-messages',
          channelName: 'Promotions',
          channelDescription: 'Promotional offers and marketing messages',
          soundName: 'default',
          importance: 3, // Medium importance
          vibrate: true,
        },
        (created: boolean) => console.log(`Promotional channel created: ${created}`)
      );
    }
    
    // Step 5: Check for existing token in AsyncStorage
    const existingToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);
    if (existingToken) {
    //   console.log('Found existing FCM token in storage:', existingToken.substring(0, 10) + '...');
      
      try {
        // Try to update token but don't throw error if not authenticated
        // It will be handled by saveTokenToFirestore function with queueing
        await saveTokenToFirestore(existingToken);
      } catch (error) {
        console.error('Error updating existing token:', error);
      }
    } else {
      // Attempt to get a new token if none exists
      try {
        const newToken = await messaging().getToken();
        console.log('Generated new FCM token:', newToken.substring(0, 10) + '...');
        await AsyncStorage.setItem(FCM_TOKEN_KEY, newToken);
        await saveTokenToFirestore(newToken);
      } catch (tokenError) {
        console.error('Error getting new FCM token:', tokenError);
      }
    }
    
    // Step 6: Subscribe to essential topics for broadcast notifications
    try {
      // Subscribe to general announcements topic
      await messaging().subscribeToTopic('announcements');
      console.log('Subscribed to announcements topic');
    } catch (topicError) {
      console.error('Error subscribing to topic:', topicError);
    }
    
    // Step 7: Try to update device activity but with silent failure if not authenticated
    try {
      await updateDeviceActivity();
      console.log('Device activity updated successfully');
    } catch (error) {
      console.log('Could not update device activity yet, will retry after login');
    }
    
    // Step 8: Check for initial notification that might have opened the app
    try {
      await checkInitialNotification();
    } catch (error) {
      console.error('Error checking initial notification:', error);
    }
    
    return { success: true, permissionsGranted };
  } catch (error) {
    console.error('Failed to initialize push notifications:', error);
    return { success: false, error: String(error) };
  }
}; 