import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getPickLabel } from "@/components/BettingSlip";
import { useBets } from "@/context/BetContext";
import { useOdds } from "@/context/OddsContext";
import { calculateMatchMinute } from "@/lib/gameTimeCalculator";
import { validateBetOutcome } from "@/lib/betOutcomeValidator";
import {
  Share2,
  RotateCcw,
  Clock,
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

export default function MyBets() {
  const { bets } = useBets();
  const { games } = useOdds();
  const [expandedBetId, setExpandedBetId] = useState<string | null>(null);
  const [liveMinutes, setLiveMinutes] = useState<Record<string, number>>({});

  // Update real-time minutes for live games
  useEffect(() => {
    const interval = setInterval(() => {
      const newMinutes: Record<string, number> = {};
      games.forEach((game) => {
        if (game.isKickoffStarted && game.kickoffStartTime !== undefined) {
          const { minute } = calculateMatchMinute(
            game.kickoffStartTime,
            game.gamePaused || false,
            game.kickoffPausedAt,
            game.minute
          );
          newMinutes[game.id] = minute;
        }
      });
      if (Object.keys(newMinutes).length > 0) {
        setLiveMinutes(newMinutes);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [games]);

  // Helper function to get match status and outcome - MUST BE DEFINED FIRST
  const getMatchStatus = (matchId: string, selection: typeof bets[0]["selections"][0]) => {
    const game = games.find((g) => g.id === matchId);
    
    if (!game) return { status: "pending", outcome: "pending" };

    if (game.status === "finished" && game.homeScore !== undefined && game.awayScore !== undefined) {
      const homeScore = game.homeScore;
      const awayScore = game.awayScore;
      
      // Use comprehensive bet outcome validation
      const betWon = validateBetOutcome(selection.type, homeScore, awayScore);
      const outcome = betWon ? "won" : "lost";
      
      return { status: "finished", outcome };
    }

    if (game.status === "live" && game.isKickoffStarted) return { status: "live", outcome: "pending" };
    
    return { status: "pending", outcome: "pending" };
  };

  // Calculate bet outcome based on selections
  const calculateBetOutcome = (bet: typeof bets[0]) => {
    if (bet.status !== "Open") return bet.status;
    
    // Check if any selection is lost - if so, bet is lost
    const hasLostSelection = bet.selections.some(sel => {
      const matchStatus = getMatchStatus(sel.matchId, sel);
      return matchStatus.status === "finished" && matchStatus.outcome === "lost";
    });
    
    if (hasLostSelection) return "Lost";
    
    // Check if all selections are finished and won
    const allFinished = bet.selections.every(sel => getMatchStatus(sel.matchId, sel).status === "finished");
    const allWon = bet.selections.every(sel => getMatchStatus(sel.matchId, sel).outcome === "won");
    
    if (allFinished && allWon) return "Won";
    
    return "Open";
  };

  // Organize bets by match status
  const upcomingBets = bets.filter((b) => {
    const allStatuses = b.selections.map(sel => getMatchStatus(sel.matchId, sel).status);
    return allStatuses.every(s => s === "pending");
  });
  
  const liveBets = bets.filter((b) => {
    const statuses = b.selections.map(sel => getMatchStatus(sel.matchId, sel).status);
    return statuses.includes("live") && !statuses.every(s => s === "finished");
  });
  
  const settledBets = bets.filter((b) => {
    // If bet has been manually settled by admin, show it in settled section
    if (b.status !== "Open") return true;
    
    // Otherwise, only show if all games are finished
    const allStatuses = b.selections.map(sel => getMatchStatus(sel.matchId, sel).status);
    return allStatuses.every(s => s === "finished");
  });

  const activeBets = bets.filter((b) => {
    const outcome = calculateBetOutcome(b);
    return outcome === "Open";
  });

  const totalStake = bets.reduce((sum, b) => sum + b.stake, 0);
  const totalWinnings = bets
    .filter((b) => calculateBetOutcome(b) === "Won")
    .reduce((sum, b) => sum + b.potentialWin, 0);

  const BetSummary = ({ bet }: { bet: typeof bets[0] }) => {
    const betOutcome = calculateBetOutcome(bet);
    return (
      <button
        onClick={() => setExpandedBetId(bet.id)}
        className="w-full text-left"
      >
        <Card className="border-border bg-card overflow-hidden hover:bg-card/80 transition-colors">
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">#{bet.betId}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {bet.date}, {bet.time}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Stake</p>
                    <p className="font-bold text-foreground">KSH {bet.stake.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Possible Win</p>
                    <p className="font-bold text-gold">KSH {bet.potentialWin.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <Badge
                className={
                  betOutcome === "Open"
                    ? "bg-blue-500/20 text-blue-500"
                    : betOutcome === "Won"
                      ? "bg-green-500/20 text-green-500"
                      : "bg-red-500/20 text-red-500"
                }
              >
                {betOutcome}
              </Badge>
            </div>
          </div>
        </Card>
      </button>
    );
  };

  const FullScreenBetDetail = ({ bet }: { bet: typeof bets[0] }) => {
    const betOutcome = calculateBetOutcome(bet);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const scrollPositionRef = useRef<number>(0);

    // Preserve scroll position when component updates
    useEffect(() => {
      const scrollContainer = scrollContainerRef.current;
      if (!scrollContainer) return;

      const handleScroll = () => {
        scrollPositionRef.current = scrollContainer.scrollTop;
      };

      scrollContainer.addEventListener("scroll", handleScroll);
      return () => scrollContainer.removeEventListener("scroll", handleScroll);
    }, []);

    // Restore scroll position on re-render (when liveMinutes updates)
    useEffect(() => {
      const scrollContainer = scrollContainerRef.current;
      if (scrollContainer && scrollPositionRef.current > 0) {
        scrollContainer.scrollTop = scrollPositionRef.current;
      }
    });

    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col pb-24">
      {/* Header */}
      <div className="border-b border-border/50 p-4 flex items-center justify-between">
        <Button
          onClick={() => setExpandedBetId(null)}
          variant="ghost"
          size="icon"
          className="text-primary"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h2 className="font-display text-lg font-bold text-foreground">
          Bet Details
        </h2>
        <div className="w-10" /> {/* Spacer for alignment */}
      </div>

      {/* Content */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {/* Bet ID and Status */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-2xl font-bold text-foreground">
                {bet.betId}
              </h3>
              <Badge
                className={
                  betOutcome === "Open"
                    ? "bg-blue-500/20 text-blue-500"
                    : betOutcome === "Won"
                      ? "bg-green-500/20 text-green-500"
                      : "bg-red-500/20 text-red-500"
                }
              >
                {betOutcome}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Prematch Bet placed at {bet.time}PM on {bet.date}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="bg-secondary/50 border-border p-4">
              <p className="text-xs text-muted-foreground mb-2">Amount</p>
              <p className="font-bold text-foreground">KSH {bet.stake.toLocaleString()}</p>
            </Card>
            <Card className="bg-secondary/50 border-border p-4">
              <p className="text-xs text-muted-foreground mb-2">Possible Payout</p>
              <p className="font-bold text-gold">KSH {bet.potentialWin.toLocaleString()}</p>
            </Card>
            <Card className="bg-secondary/50 border-border p-4">
              <p className="text-xs text-muted-foreground mb-2">W/L/T</p>
              <p className="font-bold text-foreground">
                {bet.selections.filter(sel => getMatchStatus(sel.matchId, sel).outcome === "won").length}/
                {bet.selections.filter(sel => getMatchStatus(sel.matchId, sel).outcome === "lost" && getMatchStatus(sel.matchId, sel).status === "finished").length}/
                {bet.selections.filter(sel => getMatchStatus(sel.matchId, sel).outcome === "pending").length}
              </p>
            </Card>
          </div>

          {/* Bet Status Summary */}
          <Card className="border-l-4 p-4 mb-4" style={{
            borderColor: bet.status === "Won" ? "#10b981" : bet.status === "Lost" ? "#ef4444" : "#3b82f6"
          }}>
            <p className="text-xs text-muted-foreground mb-2">Bet Status</p>
            <div className="flex items-center gap-2">
              {bet.status === "Won" && (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <p className="font-bold text-green-500 text-lg">Won</p>
                </>
              )}
              {bet.status === "Lost" && (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <p className="font-bold text-red-500 text-lg">Lost</p>
                </>
              )}
              {bet.status === "Open" && (
                <>
                  <AlertCircle className="h-5 w-5 text-blue-500" />
                  <p className="font-bold text-blue-500 text-lg">Open</p>
                </>
              )}
              {(bet.status === "Void" || bet.status === "Closed") && (
                <>
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <p className="font-bold text-yellow-500 text-lg">{bet.status}</p>
                </>
              )}
            </div>
          </Card>

          {/* Cashout Button */}
          {bet.status === "Open" && (
            <div className="space-y-3">
              <Button className="w-full text-gold border border-gold/30 hover:bg-gold/10 bg-transparent">
                Request Cashout
              </Button>
            </div>
          )}

          {/* Events */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-display text-lg font-bold text-foreground">
                Events (Odds {bet.totalOdds})
              </h4>
              <button className="text-xs text-primary hover:underline">
                Collapse All
              </button>
            </div>

            <div className="space-y-4">
              {bet.selections.map((selection, idx) => (
                <Card key={idx} className="border-border bg-card p-4">
                  <div className="space-y-3">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-3">
                        <div className="flex-1 text-right">
                          <p className="font-bold text-foreground text-lg">
                            {selection.match.split(" vs ")[0]}
                          </p>
                        </div>
                        <Badge className="bg-gold/30 text-gold border border-gold/50 px-3 py-1 text-xs font-bold">
                          vs
                        </Badge>
                        <div className="flex-1 text-left">
                          <p className="font-bold text-foreground text-lg">
                            {selection.match.split(" vs ")[1]}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Market</p>
                        <p className="font-medium text-foreground">
                          {selection.market === 'CS' ? 'CORRECT SCORE' : selection.market === 'O/U' ? 'OVER/UNDER' : selection.market === 'HT/FT' ? 'HALF TIME/FULL TIME' : selection.market === 'DC' ? 'DOUBLE CHANCE' : selection.market === 'BTTS' ? 'BOTH TEAMS TO SCORE' : selection.market}
                        </p>
                      </div>
                      {getMatchStatus(selection.matchId, selection).status === "live" ? (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Score</p>
                          <div>
                            {games.find((g) => g.id === selection.matchId) && (
                              <p className="font-medium text-foreground">
                                {games.find((g) => g.id === selection.matchId)?.homeScore || 0} - {games.find((g) => g.id === selection.matchId)?.awayScore || 0}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Start Time
                          </p>
                          <p className="font-medium text-foreground">
                            20 Feb, {3 + idx}:45 PM
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="px-3 py-2 bg-secondary/50 rounded">
                      <p className="text-xs text-muted-foreground mb-1">Pick</p>
                      <p className="font-bold text-primary">
                        ({selection.market}) {getPickLabel(selection.type)} @ {selection.odds}
                      </p>
                    </div>

                    {/* Outcome and Match Status */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="px-3 py-2 bg-secondary/50 rounded">
                        <p className="text-xs text-muted-foreground mb-1">Outcome</p>
                        <div className="flex items-center gap-1">
                          {getMatchStatus(selection.matchId, selection).outcome === "won" && (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <p className="font-bold text-green-500">Won</p>
                            </>
                          )}
                          {getMatchStatus(selection.matchId, selection).outcome === "lost" && getMatchStatus(selection.matchId, selection).status === "finished" && (
                            <>
                              <XCircle className="h-4 w-4 text-red-500" />
                              <p className="font-bold text-red-500">Lost</p>
                            </>
                          )}
                          {getMatchStatus(selection.matchId, selection).outcome === "pending" && (
                            <>
                              <AlertCircle className="h-4 w-4 text-yellow-500" />
                              <p className="font-bold text-yellow-500">Pending</p>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="px-3 py-2 bg-secondary/50 rounded">
                        <p className="text-xs text-muted-foreground mb-1">Match Status</p>
                        <div className="flex items-center gap-1">
                          {getMatchStatus(selection.matchId, selection).status === "finished" && (
                            <Badge variant="secondary" className="text-[10px]">
                              FT {games.find((g) => g.id === selection.matchId)?.homeScore || 0}:{games.find((g) => g.id === selection.matchId)?.awayScore || 0}
                            </Badge>
                          )}
                          {getMatchStatus(selection.matchId, selection).status === "live" && (
                            <Badge variant="live" className="text-[10px]">
                              LIVE {liveMinutes[selection.matchId] ?? games.find((g) => g.id === selection.matchId)?.minute ?? 0}'
                            </Badge>
                          )}
                          {getMatchStatus(selection.matchId, selection).status === "pending" && (
                            <Badge variant="outline" className="text-[10px]">PENDING</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Full-screen bet detail modal */}
      {expandedBetId && (
        <FullScreenBetDetail
          bet={bets.find((b) => b.id === expandedBetId)!}
        />
      )}

      {/* Main content - hidden when modal is open */}
      {!expandedBetId && (
        <>
          <Header />

          <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
              <h1 className="font-display text-3xl font-bold uppercase tracking-wider text-foreground">
                My Bets
              </h1>
              <p className="mt-2 text-muted-foreground">
                View your active and settled bets
              </p>
            </div>

            {/* Stats */}
            <div className="mb-8 grid gap-4 md:grid-cols-3">
              <Card className="border-primary/30 bg-card p-4">
                <p className="text-sm text-muted-foreground">Total Stake</p>
                <p className="mt-2 text-2xl font-bold text-foreground">
                  KSH {totalStake.toLocaleString()}
                </p>
              </Card>
              <Card className="border-primary/30 bg-card p-4">
                <p className="text-sm text-muted-foreground">Winnings</p>
                <p className="mt-2 text-2xl font-bold text-green-500">
                  KSH {totalWinnings.toLocaleString()}
                </p>
              </Card>
              <Card className="border-primary/30 bg-card p-4">
                <p className="text-sm text-muted-foreground">Active Bets</p>
                <p className="mt-2 text-2xl font-bold text-primary">
                  {activeBets.length}
                </p>
              </Card>
            </div>

            {/* Bets Tabs */}
            <Tabs defaultValue="active">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="active">
                  Active ({activeBets.length})
                </TabsTrigger>
                <TabsTrigger value="settled">
                  Settled ({settledBets.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="mt-6 space-y-3">
                {activeBets.length === 0 ? (
                  <Card className="border-border bg-card p-8 text-center">
                    <p className="text-muted-foreground">No active bets</p>
                  </Card>
                ) : (
                  activeBets.map((bet) => (
                    <BetSummary key={bet.id} bet={bet} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="settled" className="mt-6 space-y-3">
                {settledBets.length === 0 ? (
                  <Card className="border-border bg-card p-8 text-center">
                    <p className="text-muted-foreground">No settled bets</p>
                  </Card>
                ) : (
                  settledBets.map((bet) => (
                    <BetSummary key={bet.id} bet={bet} />
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>

          <BottomNav />
        </>
      )}
    </div>
  );
}
