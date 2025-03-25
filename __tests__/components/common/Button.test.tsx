import React from 'react';
import { ActivityIndicator } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import Button from '../../../src/components/common/Button';
import { colors } from '../../../src/constants';

describe('Button Component', () => {
  it('renders correctly with default props', () => {
    const { getByText, getByTestId } = render(
      <Button 
        title="Test Button"
        onPress={jest.fn()}
        testID="test-button"
      />
    );
    
    const buttonElement = getByTestId('test-button');
    expect(buttonElement).toBeTruthy();
    expect(getByText('Test Button')).toBeTruthy();
    
    // Check that default styles are applied (primary variant, medium size)
    const buttonStyles = buttonElement.props.style;
    expect(buttonStyles).toMatchObject({
      backgroundColor: colors.primary
    });
  });
  
  it('applies correct styles for each variant', () => {
    // Test primary variant
    const { getByTestId, rerender } = render(
      <Button 
        title="Primary Button"
        variant="primary"
        testID="button"
      />
    );
    
    let buttonElement = getByTestId('button');
    let buttonStyles = buttonElement.props.style;
    expect(buttonStyles).toMatchObject({
      backgroundColor: colors.primary
    });
    
    // Test secondary variant
    rerender(
      <Button 
        title="Secondary Button"
        variant="secondary"
        testID="button"
      />
    );
    
    buttonElement = getByTestId('button');
    buttonStyles = buttonElement.props.style;
    expect(buttonStyles).toMatchObject({
      backgroundColor: colors.secondary
    });
    
    // Test outline variant
    rerender(
      <Button 
        title="Outline Button"
        variant="outline"
        testID="button"
      />
    );
    
    buttonElement = getByTestId('button');
    buttonStyles = buttonElement.props.style;
    expect(buttonStyles).toMatchObject({ 
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.primary 
    });
    
    // Test text variant
    rerender(
      <Button 
        title="Text Button"
        variant="text"
        testID="button"
      />
    );
    
    buttonElement = getByTestId('button');
    buttonStyles = buttonElement.props.style;
    expect(buttonStyles).toMatchObject({ 
      backgroundColor: 'transparent',
      borderWidth: 0
    });
  });
  
  it('applies correct styles for each size', () => {
    // Test small size
    const { getByTestId, rerender } = render(
      <Button 
        title="Small Button"
        size="small"
        testID="button"
      />
    );
    
    let buttonElement = getByTestId('button');
    let buttonStyles = buttonElement.props.style;
    expect(buttonStyles).toMatchObject({ 
      height: 32,
      paddingHorizontal: 12
    });
    
    // Test medium size (default)
    rerender(
      <Button 
        title="Medium Button"
        size="medium"
        testID="button"
      />
    );
    
    buttonElement = getByTestId('button');
    buttonStyles = buttonElement.props.style;
    expect(buttonStyles).toMatchObject({ 
      height: 44,
      paddingHorizontal: 16
    });
    
    // Test large size
    rerender(
      <Button 
        title="Large Button"
        size="large"
        testID="button"
      />
    );
    
    buttonElement = getByTestId('button');
    buttonStyles = buttonElement.props.style;
    expect(buttonStyles).toMatchObject({ 
      height: 54,
      paddingHorizontal: 20
    });
  });
  
  it('shows activity indicator when loading', () => {
    const { queryByText, UNSAFE_getAllByType } = render(
      <Button 
        title="Loading Button"
        loading={true}
        testID="button"
      />
    );
    
    // Title should not be visible
    expect(queryByText('Loading Button')).toBeNull();
    
    // ActivityIndicator should be rendered
    const activityIndicators = UNSAFE_getAllByType(ActivityIndicator);
    expect(activityIndicators.length).toBeGreaterThan(0);
  });
  
  it('applies disabled styles when disabled', () => {
    const { getByTestId } = render(
      <Button 
        title="Disabled Button"
        disabled={true}
        testID="button"
      />
    );
    
    const buttonElement = getByTestId('button');
    const buttonStyles = buttonElement.props.style;
    
    expect(buttonStyles).toMatchObject({ 
      opacity: 0.6 
    });
    
    // Button should be disabled - check touchable prop
    expect(buttonElement.props.accessibilityState).toEqual({ disabled: true });
  });
  
  it('calls onPress handler when pressed', () => {
    const onPressMock = jest.fn();
    const { getByTestId } = render(
      <Button 
        title="Clickable Button"
        onPress={onPressMock}
        testID="button"
      />
    );
    
    const buttonElement = getByTestId('button');
    fireEvent.press(buttonElement);
    
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });
  
  it('does not call onPress when disabled or loading', () => {
    const onPressMock = jest.fn();
    
    // Test disabled button
    const { getByTestId, rerender } = render(
      <Button 
        title="Disabled Button"
        onPress={onPressMock}
        disabled={true}
        testID="button"
      />
    );
    
    let buttonElement = getByTestId('button');
    fireEvent.press(buttonElement);
    expect(onPressMock).not.toHaveBeenCalled();
    
    // Test loading button
    rerender(
      <Button 
        title="Loading Button"
        onPress={onPressMock}
        loading={true}
        testID="button"
      />
    );
    
    buttonElement = getByTestId('button');
    fireEvent.press(buttonElement);
    expect(onPressMock).not.toHaveBeenCalled();
  });
  
  it('accepts and applies custom styles', () => {
    const customStyle = { marginTop: 20, width: 200 };
    const customTextStyle = { letterSpacing: 2, textTransform: 'uppercase' as const };
    
    const { getByTestId, getByText } = render(
      <Button 
        title="Custom Button"
        style={customStyle}
        textStyle={customTextStyle}
        testID="button"
      />
    );
    
    const buttonElement = getByTestId('button');
    const buttonStyles = buttonElement.props.style;
    
    // Custom button styles should be applied
    expect(buttonStyles).toMatchObject(customStyle);
    
    // Check custom text styles
    const textElement = getByText('Custom Button');
    const textStyles = textElement.props.style;
    
    // Since text styles might be nested in arrays, we need to check if any style object
    // in the array contains our custom styles
    let foundCustomTextStyles = false;
    if (Array.isArray(textStyles)) {
      foundCustomTextStyles = textStyles.some(style => 
        style && 
        style.letterSpacing === customTextStyle.letterSpacing &&
        style.textTransform === customTextStyle.textTransform
      );
    } else {
      foundCustomTextStyles = 
        textStyles && 
        textStyles.letterSpacing === customTextStyle.letterSpacing &&
        textStyles.textTransform === customTextStyle.textTransform;
    }
    
    expect(foundCustomTextStyles).toBe(true);
  });
}); 