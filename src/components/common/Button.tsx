import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacityProps,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors } from '../../constants';

export type ButtonProps = TouchableOpacityProps & {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
  ...rest
}) => {
  // Determine button styles based on variant and size
  const getButtonStyles = (): StyleProp<ViewStyle> => {
    let variantStyle: StyleProp<ViewStyle> = {};

    // Variant styles
    switch (variant) {
      case 'primary':
        variantStyle = styles.primaryButton;
        break;
      case 'secondary':
        variantStyle = styles.secondaryButton;
        break;
      case 'outline':
        variantStyle = styles.outlineButton;
        break;
      case 'text':
        variantStyle = styles.textButton;
        break;
    }

    // Size styles
    let sizeStyle: StyleProp<ViewStyle> = {};
    switch (size) {
      case 'small':
        sizeStyle = styles.smallButton;
        break;
      case 'medium':
        sizeStyle = styles.mediumButton;
        break;
      case 'large':
        sizeStyle = styles.largeButton;
        break;
    }

    const disabledStyle = disabled ? styles.disabledButton : {};

    return [styles.button, variantStyle, sizeStyle, disabledStyle, style];
  };

  // Determine text styles based on variant
  const getTextStyles = (): StyleProp<TextStyle> => {
    let variantTextStyle: StyleProp<TextStyle> = {};

    switch (variant) {
      case 'primary':
        variantTextStyle = styles.primaryText;
        break;
      case 'secondary':
        variantTextStyle = styles.secondaryText;
        break;
      case 'outline':
        variantTextStyle = styles.outlineText;
        break;
      case 'text':
        variantTextStyle = styles.textButtonText;
        break;
    }

    const disabledTextStyle = disabled ? styles.disabledText : {};

    switch (size) {
      case 'small':
        return [styles.text, variantTextStyle, styles.smallText, disabledTextStyle, textStyle];
      case 'medium':
        return [styles.text, variantTextStyle, styles.mediumText, disabledTextStyle, textStyle];
      case 'large':
        return [styles.text, variantTextStyle, styles.largeText, disabledTextStyle, textStyle];
      default:
        return [styles.text, variantTextStyle, disabledTextStyle, textStyle];
    }
  };

  return (
    <TouchableOpacity
      style={getButtonStyles()}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'text' ? colors.primary : colors.white}
        />
      ) : (
        <Text style={getTextStyles()}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  // Variant styles
  primaryButton: {
    backgroundColor: colors.primary,
    borderWidth: 0,
  },
  secondaryButton: {
    backgroundColor: colors.secondary,
    borderWidth: 0,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  textButton: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 0,
  },
  // Size styles
  smallButton: {
    height: 32,
    paddingHorizontal: 12,
  },
  mediumButton: {
    height: 44,
    paddingHorizontal: 16,
  },
  largeButton: {
    height: 54,
    paddingHorizontal: 20,
  },
  // Text styles
  text: {
    fontWeight: '600',
  },
  primaryText: {
    color: colors.white,
  },
  secondaryText: {
    color: colors.white,
  },
  outlineText: {
    color: colors.primary,
  },
  textButtonText: {
    color: colors.primary,
  },
  // Text sizes
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
  // Disabled styles
  disabledButton: {
    opacity: 0.6,
  },
  disabledText: {
    opacity: 0.8,
  },
});

export default Button;
