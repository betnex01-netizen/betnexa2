/**
 * Time Formatter Utilities
 * Converts times to East African Time (EAT - UTC+3) with smart date display
 */

/**
 * Format kickoff time to "Today HH:mm" or "DD MMM HH:mm" in 24-hour format (EAT)
 * @param isoTime - ISO format time string (e.g., "2026-02-25T17:45:00.000Z")
 * @returns Formatted time string (e.g., "Today 23:00" or "26 Feb 18:30")
 */
export function formatKickoffTimeEAT(isoTime: string): string {
  try {
    // Parse the ISO time
    const kickoffDate = new Date(isoTime);
    
    // Convert to EAT (UTC+3)
    const eatTime = new Date(kickoffDate.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
    
    // Get today's date in EAT
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
    
    // Get just the date parts for comparison (ignoring time)
    const kickoffDate_only = new Date(eatTime.getFullYear(), eatTime.getMonth(), eatTime.getDate());
    const today_only = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Format time in 24-hour format
    const hours = String(eatTime.getHours()).padStart(2, '0');
    const minutes = String(eatTime.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;
    
    // Check if it's today
    if (kickoffDate_only.getTime() === today_only.getTime()) {
      return `Today ${timeStr}`;
    }
    
    // Format as "DD MMM HH:mm"
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(eatTime.getDate()).padStart(2, '0');
    const month = monthNames[eatTime.getMonth()];
    
    return `${day} ${month} ${timeStr}`;
  } catch (error) {
    console.warn('Error formatting time:', error);
    // Fallback to original time if parsing fails
    return 'N/A';
  }
}

/**
 * Get EAT timezone offset display
 * @returns String like "EAT (UTC+3)"
 */
export function getEATTimezone(): string {
  return 'EAT (UTC+3)';
}
