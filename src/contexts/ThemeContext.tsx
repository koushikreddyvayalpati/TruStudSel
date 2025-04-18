/**
 * Theme context for the app
 *
 * This provides theme values and theme switching functionality
 * throughout the application.
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, Theme, ThemeMode } from '../theme';
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
  useSystemTheme: true,
  setUseSystemTheme: () => {},
});

// Storage keys
const THEME_MODE_KEY = '@theme:mode';
const USE_SYSTEM_THEME_KEY = '@theme:useSystem';

export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultMode?: ThemeMode;
  defaultUseSystemTheme?: boolean;
}

/**
 * Theme Provider component
 * Manages theme state and provides theme values to the app
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultMode = 'light',
  defaultUseSystemTheme = true,
}) => {
  // Get system color scheme
  const systemColorScheme = useColorScheme();

  // State for theme preferences with local storage
  const [storedMode, setStoredMode, loadingMode] = useLocalStorage<ThemeMode>(
    THEME_MODE_KEY,
    defaultMode
  );

  const [useSystemTheme, setUseSystemTheme, loadingSystem] = useLocalStorage<boolean>(
    USE_SYSTEM_THEME_KEY,
    defaultUseSystemTheme
  );

  // Determine the current theme mode
  const getThemeMode = useCallback((): ThemeMode => {
    if (useSystemTheme && systemColorScheme) {
      return systemColorScheme as ThemeMode;
    }
    return storedMode;
  }, [useSystemTheme, systemColorScheme, storedMode]);

  // State for the current theme
  const [mode, setMode] = useState<ThemeMode>(defaultMode);
  const [theme, setTheme] = useState<Theme>(mode === 'dark' ? darkTheme : lightTheme);

  // Update theme when dependencies change
  useEffect(() => {
    if (loadingMode || loadingSystem) {return;}

    const newMode = getThemeMode();
    setMode(newMode);
    setTheme(newMode === 'dark' ? darkTheme : lightTheme);
  }, [getThemeMode, loadingMode, loadingSystem]);

  // Handle theme mode change
  const handleSetMode = useCallback(
    (newMode: ThemeMode) => {
      setStoredMode(newMode);
      setMode(newMode);
      setTheme(newMode === 'dark' ? darkTheme : lightTheme);
    },
    [setStoredMode]
  );

  // Toggle between light and dark mode
  const toggleTheme = useCallback(() => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    handleSetMode(newMode);
  }, [mode, handleSetMode]);

  // Handle system theme preference change
  const handleSetUseSystemTheme = useCallback(
    (value: boolean) => {
      setUseSystemTheme(value);

      if (value && systemColorScheme) {
        handleSetMode(systemColorScheme as ThemeMode);
      }
    },
    [setUseSystemTheme, systemColorScheme, handleSetMode]
  );

  // Context value
  const contextValue: ThemeContextType = {
    theme,
    mode,
    isDark: mode === 'dark',
    toggleTheme,
    setMode: handleSetMode,
    useSystemTheme,
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
