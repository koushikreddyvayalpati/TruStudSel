import React, { memo, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTheme } from '../../hooks';

export type LoadingStep = {
  message: string;
  /**
   * Optional ID for the step. If not provided, the index will be used.
   */
  id?: string | number;
};

export type LoadingOverlayProps = {
  /**
   * Whether the loading overlay is visible
   */
  visible: boolean;
  /**
   * Loading message to display. If messages are provided, this will be ignored.
   */
  message?: string;
  /**
   * Steps for multi-step loading. Each step has a message.
   */
  steps?: LoadingStep[];
  /**
   * Current step index
   */
  currentStep?: number;
  /**
   * Whether to show progress dots
   */
  showProgressDots?: boolean;
  /**
   * Opacity of the overlay background (0-1)
   */
  backgroundOpacity?: number;
  /**
   * Style for the container
   */
  containerStyle?: any;
  /**
   * Style for the text
   */
  textStyle?: any;
  /**
   * Whether the overlay can be dismissed by tapping outside
   */
  dismissable?: boolean;
  /**
   * Callback when the overlay is dismissed
   */
  onDismiss?: () => void;
  /**
   * Size of the activity indicator
   */
  spinnerSize?: 'small' | 'large' | number;
  /**
   * Color of the activity indicator. Will use theme.colors.primary if not provided.
   */
  spinnerColor?: string;
  /**
   * Whether to use a transparent background (more performant)
   */
  useTransparentBackground?: boolean;
};

/**
 * A performance-optimized loading overlay component that can display multi-step loading progress
 */
const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message,
  steps = [],
  currentStep = 0,
  showProgressDots = true,
  backgroundOpacity = 0.7,
  containerStyle,
  textStyle,
  dismissable = false,
  onDismiss,
  spinnerSize = 'large',
  spinnerColor,
  useTransparentBackground = false,
}) => {
  const { theme } = useTheme();

  // Memoize static styles for performance
  const overlayStyle = useMemo(() => ({
    ...styles.loadingOverlay,
    backgroundColor: useTransparentBackground
      ? 'transparent'
      : `rgba(0,0,0,${backgroundOpacity})`,
  }), [backgroundOpacity, useTransparentBackground]);

  // Get current message based on steps or direct message
  const currentMessage = useMemo(() => {
    if (steps.length > 0 && currentStep < steps.length) {
      return steps[currentStep].message;
    }
    return message || 'Loading...';
  }, [steps, currentStep, message]);

  // Handle modal close
  const handleRequestClose = useCallback(() => {
    if (dismissable && onDismiss) {
      onDismiss();
    }
  }, [dismissable, onDismiss]);

  // Performance optimization - only render when visible
  if (!visible) {return null;}

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleRequestClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View style={overlayStyle}>
        <View style={[styles.loadingContainer, containerStyle]}>
          <ActivityIndicator
            size={spinnerSize}
            color={spinnerColor || theme.colors.primary}
          />

          <Text style={[styles.loadingText, { color: theme.colors.text }, textStyle]}>
            {currentMessage}
          </Text>

          {/* Progress dots for multi-step loading */}
          {showProgressDots && steps.length > 1 && (
            <View style={styles.progressDotsContainer}>
              {steps.map((_, index) => (
                <View
                  key={_.id || index}
                  style={[
                    styles.progressDot,
                    {
                      backgroundColor: index <= currentStep
                        ? theme.colors.primary
                        : 'rgba(200,200,200,0.5)',
                      width: index === currentStep ? 12 : 10,
                      height: index === currentStep ? 12 : 10,
                    },
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContainer: {
    padding: 24,
    backgroundColor: 'white',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
    minWidth: 250,
    minHeight: 150,
    maxWidth: '80%',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
  progressDotsContainer: {
    flexDirection: 'row',
    marginTop: 20,
    alignItems: 'center',
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 10,
    marginHorizontal: 6,
  },
});

// Optimize with memo to prevent unnecessary re-renders
export default memo(LoadingOverlay);
