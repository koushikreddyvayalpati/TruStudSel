import React, { useState, memo, useCallback } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  TextInputProps as RNTextInputProps,
  StyleProp,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { colors } from '../../constants';
import Entypo from 'react-native-vector-icons/Entypo';
import DeviceInfo from 'react-native-device-info';

const isTablet = DeviceInfo.isTablet();

export type TextInputProps = RNTextInputProps & {
  label?: string;
  error?: string;
  touched?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  inputStyle?: StyleProp<ViewStyle>;
  errorStyle?: StyleProp<TextStyle>;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
  onFocusChange?: (isFocused: boolean) => void;
};

const TextInput: React.FC<TextInputProps> = memo(({
  label,
  error,
  touched,
  containerStyle,
  labelStyle,
  inputStyle,
  errorStyle,
  leftIcon,
  rightIcon,
  isPassword = false,
  onFocusChange,
  secureTextEntry,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(!secureTextEntry);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocusChange?.(true);
  }, [onFocusChange]);

  const handleBlur = useCallback((e: any) => {
    setIsFocused(false);
    onFocusChange?.(false);
    rest.onBlur?.(e);
  }, [onFocusChange, rest.onBlur]);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  const hasError = touched && error;
  const hasContent = rest.value && rest.value.toString().length > 0;

  // Pre-compute styles to reduce style calculations during rendering
  const dynamicInputContainerStyle = [
    styles.inputContainer,
    isFocused && styles.focusedInputContainer,
    hasError && styles.errorInputContainer,
    hasContent && styles.filledInputContainer,
    inputStyle,
  ];

  const dynamicInputStyle = [
    styles.input,
    leftIcon ? { paddingLeft: 8 } : null,
    (rightIcon || isPassword) ? { paddingRight: 8 } : null,
  ];

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, labelStyle]}>{label}</Text>}

      <View style={dynamicInputContainerStyle}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

        <RNTextInput
          style={dynamicInputStyle}
          placeholderTextColor={colors.grey500}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={isPassword ? !showPassword : secureTextEntry}
          {...rest}
        />

        {isPassword && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={togglePasswordVisibility}
            activeOpacity={0.7}
          >
            <Entypo
              name={showPassword ? 'eye' : 'eye-with-line'}
              size={20}
              color={colors.secondary}
            />
          </TouchableOpacity>
        )}

        {rightIcon && !isPassword && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>

      {hasError && <Text style={[styles.errorText, errorStyle]}>{error}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  label: {
    fontSize: isTablet ? 20 : 14,
    fontWeight: '600',
    marginBottom: 8,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    height: isTablet ? 65 : 58,
    ...Platform.select({
      ios: {
        // Simplified shadow with fewer properties for better performance
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 0,
        borderColor: '#e0e0e0',
      },
    }),
  },
  focusedInputContainer: {
    borderColor: colors.primary,
    ...Platform.select({
      ios: {
        // Simplified shadow with fewer properties
        shadowColor: colors.primary,
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        borderColor: colors.primary,
        borderWidth: 1,
      },
    }),
  },
  filledInputContainer: {
    ...Platform.select({
      android: {
        borderColor: 'rgba(0,0,0,0.2)',
      }
    }),
  },
  errorInputContainer: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 16,
    fontSize: isTablet ? 22 : 16,
    color: colors.textPrimary,
  },
  leftIcon: {
    paddingLeft: 16,
  },
  rightIcon: {
    paddingRight: 16,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 6,
  },
  togglePasswordText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default TextInput;
