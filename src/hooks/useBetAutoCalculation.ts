import { useEffect } from "react";
import { useBets } from "@/context/BetContext";
import { useMatches } from "@/context/MatchContext";
import { determineBetOutcome, determineBetPickWinner } from "@/lib/betOutcomeCalculator";

export function useBetAutoCalculation() {
  const { bets, updateBetStatus } = useBets();
  const { matches } = useMatches();

  useEffect(() => {
    // Check each open bet
    const processBets = async () => {
      for (const bet of bets) {
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
              const result = await updateBetStatus(bet.id, "Won", amountWon);
              if (result.success) {
                console.log(`✅ Auto-settled: Bet ${bet.id} Won with KSH ${amountWon}`);
              } else {
                console.error(`❌ Failed to auto-settle bet ${bet.id}:`, result.error);
              }
            } else if (outcome === "lost") {
              const result = await updateBetStatus(bet.id, "Lost");
              if (result.success) {
                console.log(`✅ Auto-settled: Bet ${bet.id} Lost`);
              } else {
                console.error(`❌ Failed to auto-settle bet ${bet.id}:`, result.error);
              }
            }
          }
        }
      }
    };

    processBets();
  }, [matches, bets, updateBetStatus]);
}
