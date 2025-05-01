/**
 * Safely converts a Firestore Timestamp to ISO string
 * Handles different timestamp formats from Firestore
 */
export const safeTimestampToISOString = (timestamp: any): string => {
  try {
    // If it's already a string, return it
    if (typeof timestamp === 'string') {
      return timestamp;
    }

    // If it's a number (seconds since epoch), convert to date
    if (typeof timestamp === 'number') {
      return new Date(timestamp * 1000).toISOString();
    }

    // If it's a Date object
    if (timestamp instanceof Date) {
      return timestamp.toISOString();
    }

    // Check for serverTimestamp() references
    if (timestamp &&
        typeof timestamp === 'object' &&
        '_methodName' in timestamp &&
        timestamp._methodName === 'serverTimestamp') {
      return new Date().toISOString();
    }

    // If it's a Firestore Timestamp with seconds and nanoseconds
    if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
      return new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000).toISOString();
    }

    // If it's a Firestore Timestamp object with toDate method
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toISOString();
    }

    // If none of the above, return current time
    return new Date().toISOString();
  } catch (error) {
    console.error('[timestampUtils] Error converting timestamp:', error);
    return new Date().toISOString();
  }
};

/**
 * Formats a timestamp for message time display
 */
export const formatMessageTime = (timestamp: string | Date): string => {
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn('[timestampUtils] Invalid date in formatMessageTime:', timestamp);
      return '';
    }

    // Always format the time consistently
    const timeFormat = { hour: '2-digit' as const, minute: '2-digit' as const };
    const timeString = date.toLocaleTimeString([], timeFormat);

    const now = new Date();
    const isToday = isSameDay(date, now);
    
    // Set up yesterday date for comparison
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = isSameDay(date, yesterday);
    
    // Set up current year comparison
    const isCurrentYear = date.getFullYear() === now.getFullYear();
    
    // For today's messages, just show time
    if (isToday) {
      return timeString;
    } 
    // For yesterday's messages, show "Yesterday" with time
    else if (isYesterday) {
      return `Yesterday ${timeString}`;
    }
    // For messages from current year, show month/day with time
    else if (isCurrentYear) {
      const dateString = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      return `${dateString}, ${timeString}`;
    } 
    // For older messages, show full date with time
    else {
      const dateString = date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
      return `${dateString}, ${timeString}`;
    }
  } catch (error) {
    console.error('[timestampUtils] Error formatting message time:', error);
    return '';
  }
};

/**
 * Formats a timestamp for message date display
 */
export const formatMessageDate = (timestamp: string | Date): string => {
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return '';
    }

    // If it's today, just return "Today"
    const today = new Date();
    if (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    ) {
      return 'Today';
    }

    // If it's yesterday, just return "Yesterday"
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()
    ) {
      return 'Yesterday';
    }

    // Otherwise return the full date
    return date.toLocaleDateString([], {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    console.error('[timestampUtils] Error formatting message date:', error);
    return '';
  }
};

/**
 * Checks if two dates are the same day
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
};
