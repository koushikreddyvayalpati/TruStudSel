import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
  Platform,
  GestureResponderEvent,
  Pressable,
  View,
  TouchableWithoutFeedback,
} from 'react-native';

interface BridgelessButtonProps extends TouchableOpacityProps {
  title: string;
  onPress: () => void;
  isLoading?: boolean;
  buttonStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  loadingColor?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
}

/**
 * A button component specifically designed for React Native Bridgeless mode
 * Uses direct gesture handling to ensure reliable touch detection
 */
const BridgelessButton: React.FC<BridgelessButtonProps> = ({
  title,
  onPress,
  isLoading = false,
  buttonStyle,
  textStyle,
  loadingColor = 'white',
  disabled = false,
  accessibilityLabel,
  ...rest
}) => {
  // For iOS in Bridgeless mode, use a different approach to touch handling
  const [isPressed, setIsPressed] = useState(false);
  
  // Add a debounce to prevent multiple rapid presses
  const [lastPressTime, setLastPressTime] = useState(0);
  const DEBOUNCE_TIME = 300; // ms
  
  // For debugging touch events
  const [touchDebug, setTouchDebug] = useState('');

  // When component is rendered, check if we need debug mode
  useEffect(() => {
    // Log initial mount
    console.log(`[BridgelessButton] Button "${title}" mounted`);
    
    return () => {
      console.log(`[BridgelessButton] Button "${title}" unmounted`);
    };
  }, [title]);

  // Handle press with debounce to prevent multiple accidental clicks
  const handlePress = () => {
    if (disabled || isLoading) return;
    
    const now = Date.now();
    if (now - lastPressTime < DEBOUNCE_TIME) {
      console.log(`[BridgelessButton] Ignoring rapid press: ${title}`);
      return;
    }
    
    console.log(`[BridgelessButton] '${title}' pressed`);
    setLastPressTime(now);
    
    try {
      onPress();
    } catch (error) {
      console.error(`[BridgelessButton] Error in button press:`, error);
    }
  };

  // Direct touch handlers
  const handlePressIn = (e: GestureResponderEvent) => {
    if (disabled || isLoading) return;
    setIsPressed(true);
    setTouchDebug(`Press detected at: ${e.nativeEvent.locationX.toFixed(1)}, ${e.nativeEvent.locationY.toFixed(1)}`);
  };

  const handlePressOut = () => {
    if (disabled || isLoading) return;
    setIsPressed(false);
  };

  // We use different components for iOS vs Android for optimal touch handling
  if (Platform.OS === 'ios') {
    return (
      <View style={{ position: 'relative' }}>
        {/* Base Pressable for visual styling */}
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || isLoading}
          accessibilityLabel={accessibilityLabel || title}
          accessibilityRole="button"
          accessibilityState={{ disabled: isLoading || disabled }}
          style={({ pressed }) => [
            styles.button,
            buttonStyle,
            disabled && styles.disabledButton,
            pressed && styles.pressedButton,
            isPressed && styles.pressedButton
          ]}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          {...rest}
        >
          <View style={styles.contentContainer}>
            {isLoading ? (
              <ActivityIndicator color={loadingColor} size="small" />
            ) : (
              <>
                <Text style={[styles.text, textStyle, disabled && styles.disabledText]}>
                  {title}
                </Text>
                {__DEV__ && touchDebug ? (
                  <Text style={styles.debugText}>{touchDebug}</Text>
                ) : null}
              </>
            )}
          </View>
        </Pressable>
        
        {/* Overlay for additional touch handling - critical for Bridgeless mode */}
        <TouchableWithoutFeedback 
          onPress={handlePress}
          disabled={disabled || isLoading}
        >
          <View style={[
            StyleSheet.absoluteFill, 
            styles.touchOverlay
          ]} />
        </TouchableWithoutFeedback>
      </View>
    );
  }
  
  // For Android, use TouchableOpacity as it works well there
  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || isLoading}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityRole="button"
      style={[
        styles.button,
        buttonStyle,
        disabled && styles.disabledButton,
      ]}
      activeOpacity={0.7}
      {...rest}
    >
      {isLoading ? (
        <ActivityIndicator color={loadingColor} size="small" />
      ) : (
        <Text style={[styles.text, textStyle, disabled && styles.disabledText]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 15,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7b305',
    minHeight: 50,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
    opacity: 0.7,
  },
  disabledText: {
    color: '#999999',
  },
  pressedButton: {
    opacity: 0.8,
    backgroundColor: Platform.OS === 'ios' ? undefined : '#e5a704', // Only change color on Android
    transform: [{ scale: 0.98 }],
  },
  debugText: {
    fontSize: 8,
    color: 'red',
    marginTop: 2,
  },
  touchOverlay: {
    backgroundColor: 'transparent', // Invisible overlay
    zIndex: 10,               // Ensure it's above other components
  },
});

export default BridgelessButton; 