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
      console.log(`🔄 Auto-calculation checking ${bets.length} bets, ${matches.length} matches`);
      
      for (const bet of bets) {
        if (bet.status === "Open") {
          console.log(`   📊 Checking bet ${bet.id} (${bet.betId}) - Status: ${bet.status}`);
          
          // Get all matches for this bet
          const betMatches = matches.filter((m) =>
            bet.selections.some((sel) => sel.matchId === m.id)
          );

          console.log(`      Bet has ${bet.selections.length} selections, found ${betMatches.length} matches`);

          // Check if all matches are finished
          const allFinished = betMatches.every((m) => m.status === "finished");
          
          if (allFinished) {
            console.log(`      ✅ All ${betMatches.length} matches finished!`);
            
            // Create score map for outcome determination
            const matchScores: Record<string, { home: number; away: number }> = {};
            betMatches.forEach((m) => {
              matchScores[m.id] = {
                home: m.finalScore?.home || m.score.home,
                away: m.finalScore?.away || m.score.away,
              };
              console.log(`         Match ${m.id}: ${matchScores[m.id].home} - ${matchScores[m.id].away}`);
            });

            // Determine outcome
            const outcome = determineBetOutcome(bet.selections, matchScores);
            console.log(`      🎲 Computed outcome: ${outcome}`);

            if (outcome === "won") {
              // Calculate winnings
              const amountWon = bet.potentialWin;
              console.log(`      💰 Bet WON! Amount: KSH ${amountWon}`);
              console.log(`      🔗 Calling updateBetStatus with ID: ${bet.id}`);
              
              const result = await updateBetStatus(bet.id, "Won", amountWon);
              if (result.success) {
                console.log(`      ✅ Successfully marked bet as Won and updated DB`);
              } else {
                console.error(`      ❌ Failed to mark bet as Won:`, result.error);
              }
            } else if (outcome === "lost") {
              console.log(`      ❌ Bet LOST!`);
              console.log(`      🔗 Calling updateBetStatus with ID: ${bet.id}`);
              
              const result = await updateBetStatus(bet.id, "Lost");
              if (result.success) {
                console.log(`      ✅ Successfully marked bet as Lost and updated DB`);
              } else {
                console.error(`      ❌ Failed to mark bet as Lost:`, result.error);
              }
            } else {
              console.log(`      ⚠️ Outcome undetermined: ${outcome}`);
            }
          } else {
            const finishedCount = betMatches.filter(m => m.status === "finished").length;
            console.log(`      ⏳ Waiting on matches (${finishedCount}/${betMatches.length} finished)`);
          }
        }
      }
    };

    if (bets.length > 0 && matches.length > 0) {
      processBets();
    }
  }, [matches, bets, updateBetStatus]);
}
