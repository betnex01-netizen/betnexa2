/**
 * Validate if a bet selection won based on the final match score
 */
export function validateBetOutcome(
  selectionType: string,
  homeScore: number,
  awayScore: number
): boolean {
  // 1X2 Market
  if (selectionType === "home") return homeScore > awayScore;
  if (selectionType === "draw") return homeScore === awayScore;
  if (selectionType === "away") return awayScore > homeScore;

  // Correct Score Market (cs43 or cs-43 or CS-43 means 4-3)
  // Handle multiple formats: cs31, CS31, cs-31, CS-31
  const lowerType = selectionType.toLowerCase();
  if (lowerType.startsWith("cs")) {
    // Extract the score digits from any format
    let scoreStr = '';
    if (lowerType.includes('-')) {
      scoreStr = lowerType.replace('cs-', '');
    } else {
      scoreStr = lowerType.substring(2); // Remove 'cs' prefix
    }
    // Extract first two digits
    const digits = scoreStr.match(/\d/g);
    if (digits && digits.length >= 2) {
      const expectedHome = parseInt(digits[0]);
      const expectedAway = parseInt(digits[1]);
      return homeScore === expectedHome && awayScore === expectedAway;
    }
  }

  // BTTS Market
  if (selectionType === "bttsYes") {
    return homeScore > 0 && awayScore > 0;
  }
  if (selectionType === "bttsNo") {
    return homeScore === 0 || awayScore === 0;
  }

  // Over/Under Markets
  if (selectionType === "over25") return homeScore + awayScore > 2.5;
  if (selectionType === "under25") return homeScore + awayScore < 2.5;
  if (selectionType === "over15") return homeScore + awayScore > 1.5;
  if (selectionType === "under15") return homeScore + awayScore < 1.5;

  // Double Chance Markets
  if (selectionType === "dcHomeOrDraw" || selectionType === "doubleChanceHomeOrDraw") {
    return homeScore >= awayScore; // Home win or draw
  }
  if (selectionType === "dcAwayOrDraw" || selectionType === "doubleChanceAwayOrDraw") {
    return awayScore >= homeScore; // Away win or draw
  }
  if (selectionType === "dcHomeOrAway" || selectionType === "doubleChanceHomeOrAway") {
    return homeScore !== awayScore; // Any win (not draw)
  }

  // Half Time / Full Time Markets - these would need HT score which we don't have yet
  // For now, treating them as pending
  if (selectionType.startsWith("htft")) {
    return false; // Mark as pending/cannot determine without HT score
  }

  // Unknown type - mark as lost
  return false;
}

/**
 * Format the expected outcome for display
 */
export function formatExpectedOutcome(selectionType: string): string {
  // Correct Score
  if (selectionType.startsWith("cs") && selectionType.length === 4) {
    const home = selectionType[2];
    const away = selectionType[3];
    return `${home}:${away}`;
  }

  // 1X2
  if (selectionType === "home") return "Home Win";
  if (selectionType === "draw") return "Draw";
  if (selectionType === "away") return "Away Win";

  // BTTS
  if (selectionType === "bttsYes") return "Both Teams Score";
  if (selectionType === "bttsNo") return "One Team Fails to Score";

  // Over/Under
  if (selectionType === "over25") return "Over 2.5";
  if (selectionType === "under25") return "Under 2.5";
  if (selectionType === "over15") return "Over 1.5";
  if (selectionType === "under15") return "Under 1.5";

  // Double Chance
  if (selectionType === "dcHomeOrDraw" || selectionType === "doubleChanceHomeOrDraw") {
    return "Home/Draw";
  }
  if (selectionType === "dcAwayOrDraw" || selectionType === "doubleChanceAwayOrDraw") {
    return "Away/Draw";
  }
  if (selectionType === "dcHomeOrAway" || selectionType === "doubleChanceHomeOrAway") {
    return "Home/Away";
  }

  return selectionType;
}
