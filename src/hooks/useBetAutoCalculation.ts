import { useEffect } from "react";
import { useBets } from "@/context/BetContext";
import { useMatches } from "@/context/MatchContext";
import { determineBetOutcome, determineBetPickWinner } from "@/lib/betOutcomeCalculator";

export function useBetAutoCalculation() {
  const { bets, updateBetStatus } = useBets();
  const { matches } = useMatches();

  useEffect(() => {
    // Check each open bet
    bets.forEach((bet) => {
      if (bet.status === "Open") {
        // Get all matches for this bet
        const betMatches = matches.filter((m) =>
          bet.selections.some((sel) => sel.matchId === m.id)
        );

        // Check if all matches are finished
        const allFinished = betMatches.every((m) => m.status === "finished");

        if (allFinished) {
          // Create score map for outcome determination
          const matchScores: Record<string, { home: number; away: number }> = {};
          betMatches.forEach((m) => {
            matchScores[m.id] = {
              home: m.finalScore?.home || m.score.home,
              away: m.finalScore?.away || m.score.away,
            };
          });

          // Determine outcome
          const outcome = determineBetOutcome(bet.selections, matchScores);

          if (outcome === "won") {
            // Calculate winnings
            const amountWon = bet.potentialWin;
            updateBetStatus(bet.id, "Won", amountWon);
          } else if (outcome === "lost") {
            updateBetStatus(bet.id, "Lost");
          }
        }
      }
    });
  }, [matches, bets, updateBetStatus]);
}
