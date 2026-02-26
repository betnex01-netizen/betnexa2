/**
 * Timezone Formatter Utility
 * Converts times to East African Time (EAT / Nairobi timezone)
 */

/**
 * Format a time string or ISO timestamp to East African Time (EAT)
 * Handles both HH:mm format and full ISO timestamps
 */
export const formatTimeInEAT = (timeInput: string | undefined | null): string => {
  if (!timeInput) return 'N/A';

  try {
    // Check if it's a full ISO timestamp
    if (timeInput.includes('T') || timeInput.includes('-')) {
      // Parse as ISO timestamp
      const date = new Date(timeInput);
      if (isNaN(date.getTime())) {
        return timeInput; // Return original if invalid
      }
      
      return new Intl.DateTimeFormat('en-US', {
        timeZone: 'Africa/Nairobi',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(date);
    }

    // If it's just HH:mm format (e.g., "11:49")
    if (timeInput.includes(':')) {
      const [hours, minutes] = timeInput.split(':');
      
      // Create a date object with the time
      // Since we don't know the original timezone, we'll assume it's already in the server's timezone
      // and format it as EAT
      const tempDate = new Date();
      tempDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      
      return new Intl.DateTimeFormat('en-US', {
        timeZone: 'Africa/Nairobi',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(tempDate);
    }

    return timeInput;
  } catch (error) {
    console.warn('⚠️ Error formatting time in EAT:', error, 'Input:', timeInput);
    return timeInput || 'N/A';
  }
};

/**
 * Format a date and time combination to East African Time
 * Combines date string and time string
 */
export const formatDateTimeInEAT = (dateStr: string | undefined, timeStr: string | undefined): string => {
  if (!dateStr && !timeStr) return 'N/A';
  if (!timeStr) return dateStr || 'N/A';

  try {
    // Try to create an ISO string from date and time
    // Assuming date format: "DD/MM/YYYY" or "D/M/YYYY"
    // and time format: "HH:mm"
    
    if (dateStr && timeStr) {
      const [day, month, year] = dateStr.split('/').map(Number);
      const [hours, minutes] = timeStr.split(':').map(Number);
      
      // Create ISO string: YYYY-MM-DDTHH:mm:00Z
      const isoString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00Z`;
      
      const date = new Date(isoString);
      if (isNaN(date.getTime())) {
        return `${dateStr}, ${timeStr}`;
      }

      const timeInEAT = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Africa/Nairobi',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(date);

      return `${dateStr}, ${timeInEAT}`;
    }

    return `${dateStr || ''} ${timeStr || ''}`;
  } catch (error) {
    console.warn('⚠️ Error formatting date and time in EAT:', error);
    return `${dateStr || ''} ${timeStr || ''}`;
  }
};

/**
 * Format a date string (in various formats) to EAT
 * Accepts: ISO strings, locale strings, and custom date formats
 */
export const formatDateInEAT = (dateInput: string | Date | undefined | null): string => {
  if (!dateInput) return 'N/A';

  try {
    let date: Date;
    
    if (typeof dateInput === 'string') {
      date = new Date(dateInput);
      if (isNaN(date.getTime())) {
        return dateInput;
      }
    } else {
      date = dateInput;
    }

    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Nairobi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  } catch (error) {
    console.warn('⚠️ Error formatting date in EAT:', error);
    return String(dateInput);
  }
};

/**
 * Convert a transaction date string to EAT format
 * Handles locale strings like "26/2/2026, 11:49 AM"
 */
export const formatTransactionDateInEAT = (dateStr: string | undefined | null): string => {
  if (!dateStr) return 'N/A';

  try {
    // Try to parse the date string
    const date = new Date(dateStr);
    
    if (isNaN(date.getTime())) {
      return dateStr; // Return original if can't parse
    }

    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Nairobi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(date);
  } catch (error) {
    console.warn('⚠️ Error formatting transaction date in EAT:', error);
    return dateStr;
  }
};
