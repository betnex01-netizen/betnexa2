/**
 * Calculate the current match minute based on kickoff start time
 * Accounts for pauses and returns minute + seconds
 */
export function calculateMatchMinute(
  kickoffStartTime: number | undefined,
  gamePaused: boolean,
  kickoffPausedAt: number | undefined,
  currentMinute?: number
): { minute: number; seconds: number } {
  if (!kickoffStartTime) {
    return { minute: 0, seconds: 0 };
  }

  const now = Date.now();
  let elapsedMs = 0;

  if (gamePaused && kickoffPausedAt) {
    // If paused, use the time up to when it was paused
    elapsedMs = kickoffPausedAt - kickoffStartTime;
  } else {
    // If playing, use time up to now
    elapsedMs = now - kickoffStartTime;
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
