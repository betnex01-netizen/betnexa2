import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useMatches } from "@/context/MatchContext";
import { useOdds } from "@/context/OddsContext";
import { calculateMatchMinute } from "@/lib/gameTimeCalculator";

export interface MatchMarkets {
  bttsYes: number;
  bttsNo: number;
  over25: number;
  under25: number;
  over15: number;
  under15: number;
  doubleChanceHomeOrDraw: number;
  doubleChanceAwayOrDraw: number;
  doubleChanceHomeOrAway: number;
  htftHomeHome: number;
  htftDrawDraw: number;
  htftAwayAway: number;
  htftDrawHome: number;
  htftDrawAway: number;
  [key: string]: number; // For correct scores (cs00, cs01, cs02, etc.)
}

export interface Match {
  id: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
  time: string;
  isLive?: boolean;
  homeScore?: number;
  awayScore?: number;
  minute?: string;
  markets?: MatchMarkets;
}

interface MatchCardProps {
  match: Match;
  onSelectOdd?: (matchId: string, type: string, odds: number) => void;
  selectedOdd?: string | null;
}

export function generateMarketOdds(homeOdds: number, drawOdds: number, awayOdds: number): MatchMarkets {
  const h = homeOdds;
  const d = drawOdds;
  const a = awayOdds;
  const markets: MatchMarkets = {
    bttsYes: +(1.6 + Math.random() * 0.5).toFixed(2),
    bttsNo: +(2.0 + Math.random() * 0.5).toFixed(2),
    over25: +(1.7 + Math.random() * 0.6).toFixed(2),
    under25: +(1.9 + Math.random() * 0.5).toFixed(2),
    over15: +(1.2 + Math.random() * 0.3).toFixed(2),
    under15: +(3.5 + Math.random() * 1.0).toFixed(2),
    doubleChanceHomeOrDraw: +(1 / (1/h + 1/d) * 0.9).toFixed(2),
    doubleChanceAwayOrDraw: +(1 / (1/a + 1/d) * 0.9).toFixed(2),
    doubleChanceHomeOrAway: +(1 / (1/h + 1/a) * 0.9).toFixed(2),
    htftHomeHome: +(h * 1.8).toFixed(2),
    htftDrawDraw: +(d * 2.0).toFixed(2),
    htftAwayAway: +(a * 1.8).toFixed(2),
    htftDrawHome: +(d * h * 0.7).toFixed(2),
    htftDrawAway: +(d * a * 0.7).toFixed(2),
  };

  // Generate correct scores from 0:0 to 4:4
  for (let hScore = 0; hScore <= 4; hScore++) {
    for (let aScore = 0; aScore <= 4; aScore++) {
      const key = `cs${hScore}${aScore}`;
      markets[key] = +(3.0 + Math.random() * 20).toFixed(2);
    }
  }

  return markets;
}

type MarketTab = "1X2" | "BTTS" | "O/U" | "DC" | "HT/FT" | "CS";

export function MatchCard({ match, onSelectOdd, selectedOdd }: MatchCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<MarketTab>("1X2");
  const [liveStatus, setLiveStatus] = useState<{ isLive: boolean; minute: number; status: string }>({
    isLive: match.isLive || false,
    minute: match.minute ? parseInt(match.minute) : 0,
    status: "upcoming",
  });

  const { matches } = useMatches();
  const { getGame } = useOdds();

  // Get game from OddsContext if available, otherwise use match prop
  const gameFromContext = getGame(match.id);
  const displayGame = gameFromContext || match;

  // Update live status from context and set up real-time minute updates
  useEffect(() => {
    if (gameFromContext) {
      const updateStatus = () => {
        // Calculate real-time minute based on kickoff start time
        let minute = gameFromContext.minute || 0;
        
        if (gameFromContext.isKickoffStarted && gameFromContext.kickoffStartTime !== undefined) {
          const { minute: calculatedMinute } = calculateMatchMinute(
            gameFromContext.kickoffStartTime,
            gameFromContext.gamePaused || false,
            gameFromContext.kickoffPausedAt,
            gameFromContext.minute
          );
          minute = calculatedMinute;
        }

        setLiveStatus({
          isLive: gameFromContext.status === "live" && gameFromContext.isKickoffStarted,
          minute: minute,
          status: gameFromContext.status,
        });
      };

      updateStatus(); // Update immediately

      // Update every second to keep time in sync
      const interval = setInterval(updateStatus, 1000);
      return () => clearInterval(interval);
    }
  }, [gameFromContext]);

  const markets = displayGame.markets || generateMarketOdds(displayGame.homeOdds, displayGame.drawOdds, displayGame.awayOdds);

  const handleSelect = (type: string, odds: number) => {
    onSelectOdd?.(match.id, type, odds);
  };

  const OddBtn = ({ label, value, type }: { label: string; value: number; type: string }) => (
    <button
      onClick={() => !displayGame.status === "live" && handleSelect(type, value)}
      disabled={displayGame.status === "live"}
      className={`odds-btn text-center ${selectedOdd === `${match.id}-${type}` ? "selected" : ""} ${
        displayGame.status === "live" ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      <span className="block text-[10px] text-muted-foreground">{label}</span>
      <span className="block font-mono text-sm font-bold">{value.toFixed(2)}</span>
    </button>
  );

  const tabs: MarketTab[] = ["1X2", "BTTS", "O/U", "DC", "HT/FT", "CS"];

  return (
    <div className="gradient-card rounded-xl border border-border/50 p-4 transition-all hover:border-primary/20 card-glow">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{match.league}</span>
        {liveStatus.isLive ? (
          <Badge variant="live">
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-live" />
            {liveStatus.minute}'
          </Badge>
        ) : displayGame.gamePaused && displayGame.minute === 45 ? (
          <Badge variant="live">
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-yellow-500" />
            HALFTIME
          </Badge>
        ) : displayGame.status === "finished" ? (
          <Badge variant="secondary">
            FT
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">{match.time}</span>
        )}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">{displayGame.homeTeam}</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{displayGame.awayTeam}</p>
        </div>
        {(liveStatus.isLive || displayGame.status === "finished") && (
          <div className="text-right">
            <p className="text-lg font-bold text-primary">{displayGame.homeScore || 0}</p>
            <p className="text-lg font-bold text-primary">{displayGame.awayScore || 0}</p>
          </div>
        )}
      </div>

      {/* 1X2 always visible */}
      <div className="grid grid-cols-3 gap-2">
        <OddBtn label="1" value={displayGame.homeOdds} type="home" />
        <OddBtn label="X" value={displayGame.drawOdds} type="draw" />
        <OddBtn label="2" value={displayGame.awayOdds} type="away" />
      </div>

      {displayGame.status === "live" && (
        <div className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-center">
          <p className="text-xs font-semibold text-red-600">🔴 Betting Closed - Match is Live</p>
        </div>
      )}

      {/* More markets toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 flex w-full items-center justify-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
      >
        {expanded ? "Less markets" : `+${tabs.length - 1} more markets`}
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {expanded && (
        <div className="mt-3 animate-fade-up">
          {/* Market tabs */}
          <div className="mb-3 flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                  activeTab === tab
                    ? "bg-primary/20 text-primary border border-primary/40"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Market content */}
          {activeTab === "1X2" && (
            <div className="grid grid-cols-3 gap-2">
              <OddBtn label="1" value={match.homeOdds} type="home" />
              <OddBtn label="X" value={match.drawOdds} type="draw" />
              <OddBtn label="2" value={match.awayOdds} type="away" />
            </div>
          )}

          {activeTab === "BTTS" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {displayGame.status === "live" ? (
                (() => {
                  const homeScore = displayGame.homeScore || 0;
                  const awayScore = displayGame.awayScore || 0;
                  const homeHasScored = homeScore > 0;
                  const awayHasScored = awayScore > 0;
                  
                  if (homeHasScored && awayHasScored) {
                    // Both have scored - BTTS Yes is settled
                    return <div className="col-span-2 text-center text-xs text-muted-foreground py-2">Both teams have scored</div>;
                  } else if ((homeScore > 0 && awayScore === 0) || (homeScore === 0 && awayScore > 0)) {
                    // One has scored, other hasn't - only one team can score now
                    return <div className="col-span-2 text-center text-xs text-muted-foreground py-2">Only one more team can score</div>;
                  } else {
                    // Neither has scored yet
                    return (
                      <>
                        <OddBtn label="Yes" value={markets.bttsYes} type="btts-yes" />
                        <OddBtn label="No" value={markets.bttsNo} type="btts-no" />
                      </>
                    );
                  }
                })()
              ) : (
                <>
                  <OddBtn label="Yes" value={markets.bttsYes} type="btts-yes" />
                  <OddBtn label="No" value={markets.bttsNo} type="btts-no" />
                </>
              )}
            </div>
          )}

          {activeTab === "O/U" && (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground font-medium">Over/Under 1.5</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {displayGame.status !== "live" || (displayGame.homeScore || 0) + (displayGame.awayScore || 0) <= 1 ? (
                  <>
                    <OddBtn label="Over 1.5" value={markets.over15} type="over15" />
                    <OddBtn label="Under 1.5" value={markets.under15} type="under15" />
                  </>
                ) : (displayGame.homeScore || 0) + (displayGame.awayScore || 0) > 1 ? (
                  <div className="col-span-2 text-center text-xs text-muted-foreground py-2">
                    Over 1.5 already settled
                  </div>
                ) : (
                  <>
                    <OddBtn label="Over 1.5" value={markets.over15} type="over15" />
                    <OddBtn label="Under 1.5" value={markets.under15} type="under15" />
                  </>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground font-medium mt-2">Over/Under 2.5</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {displayGame.status !== "live" || (displayGame.homeScore || 0) + (displayGame.awayScore || 0) <= 2 ? (
                  <>
                    <OddBtn label="Over 2.5" value={markets.over25} type="over25" />
                    <OddBtn label="Under 2.5" value={markets.under25} type="under25" />
                  </>
                ) : (displayGame.homeScore || 0) + (displayGame.awayScore || 0) > 2 ? (
                  <div className="col-span-2 text-center text-xs text-muted-foreground py-2">
                    Over 2.5 already settled
                  </div>
                ) : (
                  <>
                    <OddBtn label="Over 2.5" value={markets.over25} type="over25" />
                    <OddBtn label="Under 2.5" value={markets.under25} type="under25" />
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === "DC" && (
            <div className="grid grid-cols-3 gap-2">
              <OddBtn label="1X" value={markets.doubleChanceHomeOrDraw} type="dc-1x" />
              <OddBtn label="X2" value={markets.doubleChanceAwayOrDraw} type="dc-x2" />
              <OddBtn label="12" value={markets.doubleChanceHomeOrAway} type="dc-12" />
            </div>
          )}

          {activeTab === "HT/FT" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <OddBtn label="H/H" value={markets.htftHomeHome} type="htft-hh" />
              <OddBtn label="D/D" value={markets.htftDrawDraw} type="htft-dd" />
              <OddBtn label="A/A" value={markets.htftAwayAway} type="htft-aa" />
              <OddBtn label="D/H" value={markets.htftDrawHome} type="htft-dh" />
              <OddBtn label="D/A" value={markets.htftDrawAway} type="htft-da" />
            </div>
          )}

          {activeTab === "CS" && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4].flatMap((home) =>
                [0, 1, 2, 3, 4].map((away) => {
                  const currentHome = displayGame.homeScore || 0;
                  const currentAway = displayGame.awayScore || 0;
                  
                  // Only show correct scores that are >= current score (possible futures)
                  const isPossible = home >= currentHome && away >= currentAway;
                  
                  if (!isPossible && displayGame.status === "live") {
                    return null; // Don't render impossible scores during live matches
                  }
                  
                  const key = `cs${home}${away}`;
                  const isOther = home === 4 && away === 4;
                  return (
                    <OddBtn 
                      key={key}
                      label={isOther ? "OTHER" : `${home}:${away}`} 
                      value={markets[key] || 50} 
                      type={isOther ? "cs-other" : `cs-${home}${away}`} 
                    />
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
