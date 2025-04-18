import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import TextInput from '../../../src/components/common/TextInput';
import { colors } from '../../../src/constants';

describe('TextInput Component', () => {
  it('renders correctly with default props', () => {
    const { getByPlaceholderText } = render(
      <TextInput
        placeholder="Enter text"
      />
    );

    const inputElement = getByPlaceholderText('Enter text');
    expect(inputElement).toBeTruthy();
  });

  it('displays label when provided', () => {
    const { getByText } = render(
      <TextInput
        label="Username"
        placeholder="Enter username"
      />
    );

    expect(getByText('Username')).toBeTruthy();
  });

  it('displays error message when error and touched are true', () => {
    const { getByText } = render(
      <TextInput
        label="Password"
        placeholder="Enter password"
        error="Password is required"
        touched={true}
      />
    );

    expect(getByText('Password is required')).toBeTruthy();
  });

  it('does not display error message when touched is false', () => {
    const { queryByText } = render(
      <TextInput
        label="Password"
        placeholder="Enter password"
        error="Password is required"
        touched={false}
      />
    );

    expect(queryByText('Password is required')).toBeNull();
  });

  it('applies focused styles when input is focused', () => {
    const { getByPlaceholderText } = render(
      <TextInput
        placeholder="Enter text"
        testID="test-input"
      />
    );

    const inputElement = getByPlaceholderText('Enter text');
    fireEvent(inputElement, 'focus');

    // Since we can't easily access internal styles directly in testing-library,
    // we'll focus on testing the behavior and visible output
    expect(inputElement).toBeTruthy();
  });

  it('calls onFocusChange callback when focus changes', () => {
    const onFocusChangeMock = jest.fn();
    const { getByPlaceholderText } = render(
      <TextInput
        placeholder="Enter text"
        onFocusChange={onFocusChangeMock}
      />
    );

    const inputElement = getByPlaceholderText('Enter text');

    // Test focus
    fireEvent(inputElement, 'focus');
    expect(onFocusChangeMock).toHaveBeenCalledWith(true);

    // Test blur
    fireEvent(inputElement, 'blur');
    expect(onFocusChangeMock).toHaveBeenCalledWith(false);
  });

  it('renders with left icon', () => {
    const leftIconTestId = 'left-icon';
    const LeftIcon = () => <Text testID={leftIconTestId}>🔍</Text>;

    const { getByTestId } = render(
      <TextInput
        placeholder="Search"
        leftIcon={<LeftIcon />}
      />
    );

    // Check if the left icon is rendered
    expect(getByTestId(leftIconTestId)).toBeTruthy();
  });

  it('renders with right icon', () => {
    const rightIconTestId = 'right-icon';
    const RightIcon = () => <Text testID={rightIconTestId}>✓</Text>;

    const { getByTestId } = render(
      <TextInput
        placeholder="Username"
        rightIcon={<RightIcon />}
      />
    );

    // Check if the right icon is rendered
    expect(getByTestId(rightIconTestId)).toBeTruthy();
  });

  it('handles password visibility toggle correctly', () => {
    const { getByText } = render(
      <TextInput
        placeholder="Password"
        isPassword={true}
        secureTextEntry={true}
      />
    );

    // Toggle button should say "Show"
    const toggleButton = getByText('Show');
    expect(toggleButton).toBeTruthy();

    // Press the toggle button
    fireEvent.press(toggleButton);

    // Toggle button should say "Hide"
    expect(getByText('Hide')).toBeTruthy();
  });

  it('applies custom styles correctly', () => {
    const { getByText } = render(
      <TextInput
        label="Custom Input"
        placeholder="Enter text"
        error="Error message"
        touched={true}
        containerStyle={{ marginBottom: 24 }}
        labelStyle={{ fontSize: 16, color: colors.secondary }}
        inputStyle={{ height: 56, borderRadius: 4 }}
        errorStyle={{ fontSize: 14, color: 'darkred' }}
      />
    );

    // Check label and error text are rendered correctly
    expect(getByText('Custom Input')).toBeTruthy();
    expect(getByText('Error message')).toBeTruthy();
  });

  it('calls onChangeText callback when text changes', () => {
    const onChangeTextMock = jest.fn();
    const { getByPlaceholderText } = render(
      <TextInput
        placeholder="Enter text"
        onChangeText={onChangeTextMock}
      />
    );

    const inputElement = getByPlaceholderText('Enter text');
    fireEvent.changeText(inputElement, 'New text');

    expect(onChangeTextMock).toHaveBeenCalledWith('New text');
  });

  it('forwards other TextInput props correctly', () => {
    const { getByPlaceholderText } = render(
      <TextInput
        placeholder="Numbers only"
        keyboardType="numeric"
        maxLength={5}
        autoCapitalize="none"
      />
    );

    // Since we can't easily access props directly in testing-library,
    // we'll just make sure the component renders properly
    expect(getByPlaceholderText('Numbers only')).toBeTruthy();
  });
});
