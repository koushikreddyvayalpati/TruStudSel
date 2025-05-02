// amplifyConfig.js - Hardcoded AWS Amplify configuration for development

import { Platform } from 'react-native';
import Config from 'react-native-config';

// Function to get the Amplify configuration based on platform
export const getAmplifyConfig = () => {
  // For iOS in development, use hardcoded values
  if (Platform.OS === 'ios') {
    return {
      Auth: {
        // Values from ios/tmp.xcconfig
        region: 'us-east-2',
        userPoolId: 'us-east-2_NFqhqiTLZ',
        userPoolWebClientId: '5gs6g6t5mtscmlfoe0767mpdo4',
      },
      // Add other Amplify categories if needed (Storage, API, etc.)
    };
  } 
  
  // For Android or production iOS, use environment variables
  return {
    Auth: {
      region: Config.AMPLIFY_AUTH_REGION,
      userPoolId: Config.AMPLIFY_AUTH_USER_POOL_ID,
      userPoolWebClientId: Config.AMPLIFY_AUTH_USER_POOL_WEB_CLIENT_ID,
    },
    // Add other Amplify categories if needed
  };
};

export default getAmplifyConfig; 