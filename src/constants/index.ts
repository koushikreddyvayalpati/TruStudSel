/**
 * Centralized exports for constants
 */
import colors from './colors';
import typography from './typography';

export { colors };
export { typography };

// App constants
export const APP_NAME = 'TruStudSel';
export const APP_VERSION = '1.0.0';

// API constants
export const API_TIMEOUT = 30000; // 30 seconds

// Feature flags
export const FEATURES = {
  MESSAGING_ENABLED: true,
  WISHLIST_ENABLED: true,
  NOTIFICATIONS_ENABLED: true,
  RATINGS_ENABLED: false,
};

// Authentication constants
export const AUTH = {
  MIN_PASSWORD_LENGTH: 8,
  TOKEN_STORAGE_KEY: '@auth_token',
  REFRESH_TOKEN_STORAGE_KEY: '@refresh_token',
  USER_STORAGE_KEY: '@user_data',
};

// Navigation constants
export const ROUTES = {
  // Auth routes
  GET_STARTED: 'GetStarted',
  SIGN_IN: 'SignIn',
  SIGN_UP: 'SignUp',
  EMAIL_VERIFICATION: 'EmailVerification',
  OTP_INPUT: 'OtpInput',
  PROFILE_FILLING: 'ProfileFillingPage',
  FORGOT_PASSWORD: 'ForgotPassword',

  // Main app routes
  HOME: 'Home',
  PROFILE: 'Profile',
  MESSAGES: 'MessagesScreen',
  MESSAGE_DETAIL: 'MessageScreen',
  POSTING: 'PostingScreen',
  PRODUCT_INFO: 'ProductInfoPage',
  WISHLIST: 'Wishlist',
};

export default {
  colors,
  typography,
  APP_NAME,
  APP_VERSION,
  API_TIMEOUT,
  FEATURES,
  AUTH,
  ROUTES,
};
