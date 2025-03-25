/**
 * Application typography styles
 */
import { Platform, TextStyle } from 'react-native';
import colors from './colors';

// Font family definitions
export const fontFamily = {
  regular: Platform.select({
    ios: 'System',
    android: 'Roboto',
  }),
  medium: Platform.select({
    ios: 'System',
    android: 'Roboto-Medium',
  }),
  light: Platform.select({
    ios: 'System',
    android: 'Roboto-Light',
  }),
  thin: Platform.select({
    ios: 'System',
    android: 'Roboto-Thin',
  }),
  bold: Platform.select({
    ios: 'System',
    android: 'Roboto-Bold',
  }),
  brandFont: 'LibreCaslonDisplay', // Used for brand elements like logo
};

// Font sizes
export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
};

// Line heights
export const lineHeight = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 32,
  '2xl': 36,
  '3xl': 42,
  '4xl': 48,
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

// Predefined text styles
export const textStyles = {
  // Headings
  h1: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['4xl'],
    lineHeight: lineHeight['4xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  } as TextStyle,
  
  h2: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['3xl'],
    lineHeight: lineHeight['3xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  } as TextStyle,
  
  h3: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  } as TextStyle,
  
  h4: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xl,
    lineHeight: lineHeight.xl,
    fontWeight: fontWeight.semiBold,
    color: colors.textPrimary,
  } as TextStyle,
  
  h5: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
    fontWeight: fontWeight.semiBold,
    color: colors.textPrimary,
  } as TextStyle,
  
  // Body text
  body1: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    fontWeight: fontWeight.normal,
    color: colors.textPrimary,
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
    color: colors.white,
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
    color: colors.textPrimary,
  } as TextStyle,
  
  // Brand text (for logos, etc.)
  brand: {
    fontFamily: fontFamily.brandFont,
    fontSize: fontSize.xl,
    color: colors.primary,
  } as TextStyle,
};

export default {
  fontFamily,
  fontSize,
  lineHeight,
  fontWeight,
  textStyles,
}; 