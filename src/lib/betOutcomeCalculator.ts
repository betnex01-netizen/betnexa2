// Bet classification types
export type BetClassification = "1X2" | "BTTS" | "O/U" | "DC" | "HT/FT" | "CS";

export interface BetSelection {
  matchId: string;
  match: string;
  type: string;
  market: BetClassification;
  odds: number;
}

export interface FinalScore {
  home: number;
  away: number;
}

// Determine if a single bet pick won
export function determineBetPickWinner(
  selection: BetSelection,
  finalScore: FinalScore
): boolean {
  const { market, type } = selection;
  const { home, away } = finalScore;

  switch (market) {
    case "1X2":
      if (type === "home" || type === "Home Win" || type === "1") {
        return home > away;
      } else if (type === "draw" || type === "Draw" || type === "X") {
        return home === away;
      } else if (type === "away" || type === "Away Win" || type === "2") {
        return away > home;
      }
      return false;

    case "O/U": {
      const total = home + away;
      if (type.toLowerCase().includes("over 2.5") || type === "over25") return total > 2.5;
      if (type.toLowerCase().includes("under 2.5") || type === "under25") return total < 2.5;
      if (type.toLowerCase().includes("over 1.5") || type === "over15") return total > 1.5;
      if (type.toLowerCase().includes("under 1.5") || type === "under15") return total < 1.5;
      return false;
    }

    case "BTTS": {
      const btts = home > 0 && away > 0;
      if (type.toLowerCase().includes("yes")) return btts;
      if (type.toLowerCase().includes("no")) return !btts;
      return false;
    }

    case "DC": {
      const homeWin = home > away;
      const draw = home === away;
      const awayWin = away > home;
      
      if (type.includes("1X") || type === "doubleChanceHomeOrDraw") return homeWin || draw;
      if (type.includes("X2") || type === "doubleChanceAwayOrDraw") return draw || awayWin;
      if (type.includes("12") || type === "doubleChanceHomeOrAway") return homeWin || awayWin;
      return false;
    }

    case "CS": {
      const scoreStr = `${home}${away}`;
      return type.includes(scoreStr) || type === `cs${home}${away}`;
    }

    default:
      return false;
  }
}

// Determine if entire bet won (all selections must win)
export function determineBetOutcome(
  selections: BetSelection[],
  matchScores: Record<string, FinalScore>
): "won" | "lost" | "void" {
  // Check if all matches have final scores
  const allScoresAvailable = selections.every((sel) => matchScores[sel.matchId]);
  
  if (!allScoresAvailable) {
    return "void"; // Can't determine yet
  }

  // Check if all selections won
  const allWon = selections.every((sel) => {
    const finalScore = matchScores[sel.matchId];
    return determineBetPickWinner(sel, finalScore);
  });

  return allWon ? "won" : "lost";
}

// Get human-readable bet pick result
export function getBetPickResult(
  selection: BetSelection,
  finalScore: FinalScore | undefined
): { won: boolean; description: string } {
  if (!finalScore) {
    return { won: false, description: "Match not finished" };
  }

  const won = determineBetPickWinner(selection, finalScore);
  const scoreStr = `${finalScore.home}:${finalScore.away}`;

  let description = `${scoreStr} - `;

  if (selection.market === "1X2") {
    if (finalScore.home > finalScore.away) {
      description += "Home Win";
    } else if (finalScore.home === finalScore.away) {
      description += "Draw";
    } else {
      description += "Away Win";
    }
  } else if (selection.market === "O/U") {
    const total = finalScore.home + finalScore.away;
    description += `Total: ${total}`;
  } else if (selection.market === "BTTS") {
    const btts = finalScore.home > 0 && finalScore.away > 0;
    description += btts ? "Both Scored" : "Not Both Scored";
  } else if (selection.market === "CS") {
    description = `Correct Score: ${scoreStr}`;
  } else {
    description += selection.type;
  }

  return { won, description };
}
