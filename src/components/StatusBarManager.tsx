import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { configureStatusBar } from '../utils/statusBarManager';

/**
 * Global StatusBarManager component that provides consistent status bar behavior
 * 
 * This component should be mounted at the root of the app to ensure consistent
 * status bar behavior across the entire application, especially when launched
 * from a killed state via notification.
 */
const StatusBarManager: React.FC = () => {
  // Set up status bar on mount
  useEffect(() => {
    // Ensures consistent status bar configuration immediately
    configureStatusBar();

    // Set up app state change listener
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      // Reconfigure status bar when app becomes active
      if (nextAppState === 'active') {
        configureStatusBar();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // No need for a placeholder view; SafeAreaView will handle insets
  return null;
};

export default StatusBarManager; 