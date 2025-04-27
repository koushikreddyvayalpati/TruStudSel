#import <UserNotifications/UserNotifications.h>
#import <RNCPushNotificationIOS.h>
#import <Firebase.h>

// Add this method to the AppDelegate implementation
- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken
{
  [FIRMessaging messaging].APNSToken = deviceToken;
}

// Add this method to the AppDelegate implementation
- (void)application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo
fetchCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler
{
  [[FIRMessaging messaging] appDidReceiveMessage:userInfo];
  completionHandler(UIBackgroundFetchResultNewData);
}

// Add this method to the AppDelegate implementation
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  // Configure Firebase
  [FIRApp configure];

  // Register for remote notifications
  if ([UNUserNotificationCenter class] != nil) {
    UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
    center.delegate = self;
    
    UNAuthorizationOptions options = UNAuthorizationOptionAlert |
                                     UNAuthorizationOptionSound |
                                     UNAuthorizationOptionBadge;
    
    [center requestAuthorizationWithOptions:options
                          completionHandler:^(BOOL granted, NSError * _Nullable error) {
                            if (error) {
                              NSLog(@"Error requesting notification authorization: %@", error);
                            }
                          }];
  }
  
  [application registerForRemoteNotifications];
  
  // Initialize React Native
  // (rest of existing code)
} 