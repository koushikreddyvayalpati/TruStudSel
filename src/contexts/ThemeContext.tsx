/**
 * Theme context for the app
 *
 * This provides theme values and theme switching functionality
 * throughout the application.
 */
import React, { createContext, useCallback, useContext, useEffect } from 'react';
import { lightTheme, Theme, ThemeMode } from '../theme';
import { useLocalStorage } from '../hooks';

// Define theme context shape
interface ThemeContextType {
  theme: Theme;
  mode: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
  useSystemTheme: boolean;
  setUseSystemTheme: (value: boolean) => void;
}

// Create context with default values
const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  mode: 'light',
  isDark: false,
  toggleTheme: () => {},
  setMode: () => {},
  useSystemTheme: false,
  setUseSystemTheme: () => {},
});

// Storage keys
const THEME_MODE_KEY = '@theme:mode';
const USE_SYSTEM_THEME_KEY = '@theme:useSystem';

export interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * Theme Provider component
 * Manages theme state and provides theme values to the app
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
}) => {
  // Storage hooks - we won't use these values but need the setters
  const [, setStoredMode, loadingMode] = useLocalStorage<ThemeMode>(
    THEME_MODE_KEY,
    'light'
  );

  const [, setUseSystemTheme, loadingSystem] = useLocalStorage<boolean>(
    USE_SYSTEM_THEME_KEY,
    false
  );

  // Determine the current theme mode - always returns light
  const getThemeMode = useCallback((): ThemeMode => {
    return 'light';
  }, []);

  // Update theme when dependencies change
  useEffect(() => {
    if (loadingMode || loadingSystem) {return;}
  }, [getThemeMode, loadingMode, loadingSystem]);

  // Handle theme mode change - always sets to light
  const handleSetMode = useCallback(
    (_newMode: ThemeMode) => {
      setStoredMode('light');
    },
    [setStoredMode]
  );

  // Toggle theme does nothing
  const toggleTheme = useCallback(() => {
    // No-op, we always stay in light mode
  }, []);

  // Handle system theme preference change
  const handleSetUseSystemTheme = useCallback(
    (_value: boolean) => {
      setUseSystemTheme(false); // Always set to false
      // Always use light mode
      handleSetMode('light');
    },
    [setUseSystemTheme, handleSetMode]
  );

  // Context value
  const contextValue: ThemeContextType = {
    theme: lightTheme,
    mode: 'light',
    isDark: false,
    toggleTheme,
    setMode: handleSetMode,
    useSystemTheme: false,
    setUseSystemTheme: handleSetUseSystemTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Hook for accessing the theme context
 * @returns ThemeContextType
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};

export default ThemeContext;
