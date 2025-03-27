/**
 * Theme typography system
 * Provides consistent text styles throughout the app
 */
import { Platform, TextStyle } from 'react-native';
import { lightColors, darkColors } from './colors';

// Font family definitions
export const fontFamily = {
  regular: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
  medium: Platform.select({
    ios: 'System',
    android: 'Roboto-Medium',
    default: 'System',
  }),
  light: Platform.select({
    ios: 'System',
    android: 'Roboto-Light',
    default: 'System',
  }),
  thin: Platform.select({
    ios: 'System',
    android: 'Roboto-Thin',
    default: 'System',
  }),
  bold: Platform.select({
    ios: 'System',
    android: 'Roboto-Bold',
    default: 'System',
  }),
  brandFont: 'LibreCaslonDisplay', // Used for brand elements like logo
};

// Font sizes
export const fontSize = {
  xs: 13,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 48,
};

// Line heights
export const lineHeight = {
  xs: 18,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 32,
  '2xl': 36,
  '3xl': 40,
  '4xl': 44,
  '5xl': 64,
};

// Font weights
export const fontWeight = {
  thin: '100' as TextStyle['fontWeight'],
  extraLight: '200' as TextStyle['fontWeight'],
  light: '300' as TextStyle['fontWeight'],
  normal: '400' as TextStyle['fontWeight'],
  medium: '500' as TextStyle['fontWeight'],
  semiBold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
  extraBold: '800' as TextStyle['fontWeight'],
  black: '900' as TextStyle['fontWeight'],
};

// Create text styles for a theme
const createTextStyles = (colors: typeof lightColors) => ({
  // Headings
  h1: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['4xl'],
    lineHeight: lineHeight['4xl'],
    fontWeight: fontWeight.bold,
    color: colors.text,
  } as TextStyle,
  
  h2: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['3xl'],
    lineHeight: lineHeight['3xl'],
    fontWeight: fontWeight.bold,
    color: colors.text,
  } as TextStyle,
  
  h3: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.text,
  } as TextStyle,
  
  h4: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xl,
    lineHeight: lineHeight.xl,
    fontWeight: fontWeight.semiBold,
    color: colors.text,
  } as TextStyle,
  
  h5: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
    fontWeight: fontWeight.semiBold,
    color: colors.text,
  } as TextStyle,
  
  // Body text
  body1: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    fontWeight: fontWeight.normal,
    color: colors.text,
  } as TextStyle,
  
  body2: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    fontWeight: fontWeight.normal,
    color: colors.textSecondary,
  } as TextStyle,
  
  // Button text
  button: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.buttonText,
  } as TextStyle,
  
  // Caption text
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
    fontWeight: fontWeight.normal,
    color: colors.textSecondary,
  } as TextStyle,
  
  // Label text
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  } as TextStyle,
  
  // Brand text (for logos, etc.)
  brand: {
    fontFamily: fontFamily.brandFont,
    fontSize: fontSize.xl,
    color: colors.primary,
  } as TextStyle,
});

// Text styles for light and dark themes
export const lightTextStyles = createTextStyles(lightColors);
export const darkTextStyles = createTextStyles(darkColors);

export type TextStyles = typeof lightTextStyles;

export default {
  fontFamily,
  fontSize,
  lineHeight,
  fontWeight,
  createTextStyles,
  light: lightTextStyles,
  dark: darkTextStyles,
}; 