import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid } from 'react-native';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebaseService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Auth } from 'aws-amplify';
import { NavigationContainerRef } from '@react-navigation/native';
import { configureStatusBar } from './statusBarManager';

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
        channelId: 'chat-channel',
        channelName: 'Chat Messages',
        channelDescription: 'Notifications for chat messages',
        soundName: 'default',
        importance: 5, // Maximum importance
        vibrate: true,
      },
      (created: boolean) => console.log(`Chat channel created: ${created}`)
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
    
    // Extract notification details
    const notification = remoteMessage.notification || {};
    const data = remoteMessage.data || {};
    
    // Get the notification type to ensure proper handling
    const notificationType = data.type || 
      (data.conversationId ? 'message' : 'general');
    
    // Log notification details for debugging
    console.log(`Processing foreground notification of type: ${notificationType}`, {
      title: notification.title,
      body: notification.body,
      data: data
    });
    
    // Display even if app is in foreground with high priority
    showLocalNotification({
      title: notification.title || (notificationType === 'message' ? 'New Message' : 'New Notification'),
      body: notification.body || (notificationType === 'message' ? 'You have a new message' : 'New notification'),
      data: {
        ...data,
        // Ensure these fields are present for navigation
        id: `${Date.now()}`,
        type: notificationType,
        foreground: true // Flag that this was received in foreground
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
        // We can perform background tasks here if needed
        console.log('Processing background message notification for conversation:', data.conversationId);
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
      
      // Handle navigation
      handleNotificationNavigation(remoteMessage.data);
    }
  });
  
  // Check if app was opened from a notification (cold start)
  messaging()
    .getInitialNotification()
    .then(remoteMessage => {
      if (remoteMessage) {
        console.log('App opened from quit state notification:', remoteMessage);
        
        if (remoteMessage.data) {
          // Store the notification data to handle after navigation is ready
          AsyncStorage.setItem('INITIAL_NOTIFICATION', JSON.stringify(remoteMessage.data));
        }
      }
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
  const channelId = isMessageNotification ? 'chat-channel' : 'default-channel';
  
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
    
    console.log('Navigating from notification with data:', data);
    
    // Give React Navigation enough time to complete its initial layout
    // This longer delay helps ensure the UI is stable before navigation
    setTimeout(() => {
      // At this point we know navigationRef is not null from the check above
      const nav = navigationRef!;
      
      // Handle different navigation scenarios based on notification type
      if (data.conversationId) {
        // Navigate to specific conversation
        nav.navigate('FirebaseChatScreen', { 
          recipientEmail: data.senderEmail,
          recipientName: data.senderName || 'Chat' 
        });
      } else if (data.navigateTo) {
        // Navigate to screen specified in notification
        nav.navigate(data.navigateTo, data.params || {});
      }
    }, 300); // Increased from 50ms to 300ms for more stability
  } catch (error) {
    console.error('Error navigating from notification:', error);
  }
};

/**
 * Check for initial notification when app starts
 */
export const checkInitialNotification = async () => {
  try {
    // Configure status bar for consistent appearance
    configureStatusBar();
    
    const initialNotificationData = await AsyncStorage.getItem('INITIAL_NOTIFICATION');
    
    if (initialNotificationData) {
      console.log('Found initial notification data');
      
      // Clear the stored notification
      await AsyncStorage.removeItem('INITIAL_NOTIFICATION');
      
      // Handle the navigation
      const data = JSON.parse(initialNotificationData);
      handleNotificationNavigation(data);
    }
  } catch (error) {
    console.error('Error checking initial notification:', error);
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
          channelId: 'chat-channel',
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