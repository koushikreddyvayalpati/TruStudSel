import { StatusBar, Platform } from 'react-native';

/**
 * Consistent status bar settings for the app
 * These settings ensure a consistent look when navigating from notifications
 */

/**
 * Configure status bar for all screens with consistent settings
 * This is the main function that should be called from App.tsx and when navigating
 * @param barStyle 'dark-content' | 'light-content' (default: 'dark-content')
 * @param backgroundColor string (default: '#fff')
 */
export const configureStatusBar = (
  barStyle: 'dark-content' | 'light-content' = 'dark-content',
  backgroundColor: string = '#fff'
) => {
  if (Platform.OS === 'android') {
    StatusBar.setTranslucent(false);
    StatusBar.setBackgroundColor(backgroundColor);
    StatusBar.setBarStyle(barStyle);
  } else {
    StatusBar.setBarStyle(barStyle);
  }
};

// Legacy functions maintained for backward compatibility
export const setMainScreenStatusBar = configureStatusBar;
export const setAuthScreenStatusBar = configureStatusBar;
export const resetStatusBarForNavigation = configureStatusBar; 