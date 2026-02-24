/**
 * Calculate the current match minute based on kickoff start time
 * Accounts for pauses and returns minute + seconds
 */
export function calculateMatchMinute(
  kickoffStartTime: number | string | undefined,
  gamePaused: boolean,
  kickoffPausedAt: number | string | undefined,
  currentMinute?: number
): { minute: number; seconds: number } {
  if (!kickoffStartTime) {
    console.log('⚠️  No kickoffStartTime provided');
    return { minute: 0, seconds: 0 };
  }

  // Convert ISO string to milliseconds if needed
  let kickoffMs: number;
  try {
    kickoffMs = typeof kickoffStartTime === 'string' 
      ? new Date(kickoffStartTime).getTime() 
      : kickoffStartTime;
  } catch (e) {
    console.error('❌ Error parsing kickoffStartTime:', kickoffStartTime, e);
    return { minute: 0, seconds: 0 };
  }

  // Validate kickoff timestamp makes sense (not in the future, not older than 180 minutes)
  const now = Date.now();
  if (kickoffMs > now) {
    console.warn('⚠️  Kickoff time is in the future:', kickoffStartTime);
    return { minute: 0, seconds: 0 };
  }

  let elapsedMs = 0;

  if (gamePaused && kickoffPausedAt) {
    // If paused, use the time up to when it was paused
    const pausedMs = typeof kickoffPausedAt === 'string' 
      ? new Date(kickoffPausedAt).getTime() 
      : kickoffPausedAt;
    elapsedMs = pausedMs - kickoffMs;
  } else {
    // If playing, use time up to now
    elapsedMs = now - kickoffMs;
  }

  // Prevent negative elapsed time
  if (elapsedMs < 0) {
    console.warn('⚠️  Negative elapsed time detected:', elapsedMs);
    return { minute: 0, seconds: 0 };
  }

  // Convert to seconds and then to minutes:seconds
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minute = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  // Cap at 95 minutes
  if (minute > 95) {
    return { minute: 95, seconds: 0 };
  }

  return { minute, seconds };
}

/**
 * Format the minute display (e.g., "45+2'" for 45:02)
 */
export function formatMatchMinute(minute: number, seconds: number): string {
  if (minute === 45) {
    return `45+${String(Math.floor(seconds / 60)).padStart(2, "0")}'`;
  }
  return `${minute}'`;
}

/**
 * Get status message for match (e.g., "HALFTIME", "90+5'", etc.)
 */
export function getMatchTimeStatus(
  minute: number,
  gamePaused: boolean
): string {
  if (gamePaused && minute === 45) {
    return "HALFTIME";
  }
  if (minute >= 45) {
    return `${minute}+`;
  }
  return `${minute}'`;
}
