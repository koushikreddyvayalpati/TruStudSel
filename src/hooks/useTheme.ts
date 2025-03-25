/**
 * Extended theme hook with additional utilities
 * 
 * This hook provides the theme context plus additional helper functions
 * for working with themes and styling.
 */

import { useContext } from 'react';
import { StyleSheet } from 'react-native';
import ThemeContext from '../contexts/ThemeContext';
import { applyShadow } from '../theme/shadows';
import { Theme } from '../theme';

/**
 * Enhanced useTheme hook with styling utilities
 * @returns Theme context and additional utilities
 */
export const useTheme = () => {
  const themeContext = useContext(ThemeContext);
  
  if (!themeContext) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  const { theme, isDark } = themeContext;
  
  /**
   * Create styles with the current theme
   * @param styleCreator - Function that creates styles with the theme
   * @returns StyleSheet styles
   */
  const createThemedStyles = <T extends StyleSheet.NamedStyles<T>>(
    styleCreator: (theme: Theme) => T
  ) => {
    return StyleSheet.create(styleCreator(theme));
  };
  
  /**
   * Apply a shadow to a style object using the current theme
   * @param style - The base style object
   * @param shadowKey - The shadow key (none, xs, sm, md, lg, xl)
   * @returns Style with shadow applied
   */
  const applyThemeShadow = (style: any, shadowKey: keyof typeof theme.shadows) => {
    return applyShadow(style, shadowKey, isDark);
  };
  
  /**
   * Get a themed color value with optional opacity
   * @param colorKey - The color key from theme.colors
   * @param opacity - Optional opacity value (0-1)
   * @returns Color string (hex, rgb, or rgba)
   */
  const getColor = (colorKey: keyof typeof theme.colors, opacity?: number) => {
    const color = theme.colors[colorKey];
    
    if (opacity !== undefined && opacity >= 0 && opacity <= 1) {
      // Convert hex to rgba if opacity is provided
      if (color.startsWith('#')) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
      }
      
      // Handle rgba
      if (color.startsWith('rgba')) {
        return color.replace(/[\d\.]+\)$/, `${opacity})`);
      }
      
      // Handle rgb
      if (color.startsWith('rgb')) {
        return color.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
      }
    }
    
    return color;
  };
  
  return {
    ...themeContext,
    createThemedStyles,
    applyThemeShadow,
    getColor,
  };
};

export default useTheme; 