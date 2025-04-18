/**
 * Validation utility functions
 */
import { AUTH } from '../constants';

/**
 * Check if an email is valid
 * @param email - The email to validate
 * @returns Boolean indicating if email is valid
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Check if a password meets minimum requirements
 * @param password - The password to validate
 * @param minLength - Minimum length required (default: from AUTH.MIN_PASSWORD_LENGTH)
 * @returns Boolean indicating if password is valid
 */
export const isValidPassword = (
  password: string,
  minLength = AUTH.MIN_PASSWORD_LENGTH
): boolean => {
  // Check minimum length
  if (password.length < minLength) {
    return false;
  }

  // Check if it contains at least one number
  if (!/\d/.test(password)) {
    return false;
  }

  // Check if it contains at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return false;
  }

  // Check if it contains at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return false;
  }

  // Check if it contains at least one special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return false;
  }

  return true;
};

/**
 * Checks if a phone number is valid
 * @param phone - The phone number to validate
 * @returns Boolean indicating if phone number is valid
 */
export const isValidPhone = (phone: string): boolean => {
  // Remove any non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');

  // Check if it has at least 10 digits (US phone number format)
  return digitsOnly.length >= 10;
};

/**
 * Format the password requirements as a string
 * @returns String with password requirements
 */
export const getPasswordRequirements = (): string => {
  return `Password must have at least ${AUTH.MIN_PASSWORD_LENGTH} characters, including 1 uppercase, 1 lowercase, 1 number, and 1 special character.`;
};

/**
 * Get validation error for an email
 * @param email - The email to validate
 * @returns Error message or empty string if valid
 */
export const getEmailValidationError = (email: string): string => {
  if (!email) {
    return 'Email is required';
  }

  if (!isValidEmail(email)) {
    return 'Please enter a valid email address';
  }

  return '';
};

/**
 * Get validation error for a password
 * @param password - The password to validate
 * @returns Error message or empty string if valid
 */
export const getPasswordValidationError = (password: string): string => {
  if (!password) {
    return 'Password is required';
  }

  if (password.length < AUTH.MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${AUTH.MIN_PASSWORD_LENGTH} characters`;
  }

  if (!/\d/.test(password)) {
    return 'Password must include at least one number';
  }

  if (!/[A-Z]/.test(password)) {
    return 'Password must include at least one uppercase letter';
  }

  if (!/[a-z]/.test(password)) {
    return 'Password must include at least one lowercase letter';
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return 'Password must include at least one special character';
  }

  return '';
};

/**
 * Get validation error for a phone number
 * @param phone - The phone number to validate
 * @returns Error message or empty string if valid
 */
export const getPhoneValidationError = (phone: string): string => {
  if (!phone) {
    return 'Phone number is required';
  }

  if (!isValidPhone(phone)) {
    return 'Please enter a valid phone number';
  }

  return '';
};

export default {
  isValidEmail,
  isValidPassword,
  isValidPhone,
  getPasswordRequirements,
  getEmailValidationError,
  getPasswordValidationError,
  getPhoneValidationError,
};
