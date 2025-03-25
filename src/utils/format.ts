/**
 * Formatting utility functions
 */

/**
 * Format a number as currency
 * @param value - The number to format
 * @param currency - The currency code (default: USD)
 * @param locale - The locale to use for formatting (default: en-US)
 * @returns Formatted currency string
 */
export const formatCurrency = (
  value: number,
  currency = 'USD',
  locale = 'en-US'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value);
};

/**
 * Format a date
 * @param date - The date to format (Date object or ISO string)
 * @param format - The format to use (default: 'short')
 * @param locale - The locale to use for formatting (default: en-US)
 * @returns Formatted date string
 */
export const formatDate = (
  date: Date | string,
  format: 'short' | 'medium' | 'long' | 'full' = 'short',
  locale = 'en-US'
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat(locale, {
    dateStyle: format,
  }).format(dateObj);
};

/**
 * Format a relative time (e.g., "2 hours ago")
 * @param date - The date to format (Date object or ISO string)
 * @param locale - The locale to use for formatting (default: en-US)
 * @returns Relative time string
 */
export const formatRelativeTime = (
  date: Date | string,
  locale = 'en-US'
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInMilliseconds = now.getTime() - dateObj.getTime();
  
  // Convert to seconds
  const diffInSeconds = Math.floor(diffInMilliseconds / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  }
  
  // Convert to minutes
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }
  
  // Convert to hours
  const diffInHours = Math.floor(diffInMinutes / 60);
  
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }
  
  // Convert to days
  const diffInDays = Math.floor(diffInHours / 24);
  
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }
  
  // If more than a week, use standard date format
  return formatDate(dateObj, 'medium', locale);
};

/**
 * Truncate text to a specified length
 * @param text - The text to truncate
 * @param maxLength - The maximum length (default: 100)
 * @param suffix - The suffix to add if truncated (default: '...')
 * @returns Truncated text
 */
export const truncateText = (
  text: string,
  maxLength = 100,
  suffix = '...'
): string => {
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength).trim() + suffix;
};

export default {
  formatCurrency,
  formatDate,
  formatRelativeTime,
  truncateText,
}; 