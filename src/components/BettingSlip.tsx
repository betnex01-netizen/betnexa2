import { useState } from "react";
import { X, Trash2, ChevronUp, ChevronDown, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useBets } from "@/context/BetContext";
import type { PlacedBet } from "@/context/BetContext";

export interface BetSlipItem {
  matchId: string;
  match: string;
  type: string;
  market: string;
  odds: number;
}

export function getMarketName(market: string): string {
  const marketMap: Record<string, string> = {
    '1X2': '1X2',
    'BTTS': 'Both Teams To Score',
    'O/U': 'Over/Under',
    'DC': 'Double Chance',
    'HT/FT': 'Half Time/Full Time',
    'CS': 'Correct Score',
  };
  return marketMap[market] || market;
}

export function getPickLabel(type: string): string {
  // Correct Score (cs43 -> 4:3)
  if (type.startsWith('cs') && type.length === 4) {
    const homeScore = type[2];
    const awayScore = type[3];
    return `${homeScore}:${awayScore}`;
  }
  
  // 1X2
  if (type === 'home') return 'Home Win';
  if (type === 'draw') return 'Draw';
  if (type === 'away') return 'Away Win';
  
  // BTTS
  if (type === 'bttsYes') return 'YES';
  if (type === 'bttsNo') return 'NO';
  
  // Over/Under
  if (type === 'over25') return 'Over 2.5';
  if (type === 'under25') return 'Under 2.5';
  if (type === 'over15') return 'Over 1.5';
  if (type === 'under15') return 'Under 1.5';
  
  // Double Chance
  if (type === 'dcHomeOrDraw') return 'Home/Draw';
  if (type === 'doubleChanceHomeOrDraw') return 'Home/Draw';
  if (type === 'dcAwayOrDraw') return 'Away/Draw';
  if (type === 'doubleChanceAwayOrDraw') return 'Away/Draw';
  if (type === 'dcHomeOrAway') return 'Home/Away';
  if (type === 'doubleChanceHomeOrAway') return 'Home/Away';
  
  // Half Time/Full Time
  if (type === 'htftHomeHome') return 'Home/Home';
  if (type === 'htftDrawDraw') return 'Draw/Draw';
  if (type === 'htftAwayAway') return 'Away/Away';
  if (type === 'htftDrawHome') return 'Draw/Home';
  if (type === 'htftDrawAway') return 'Draw/Away';
  if (type === 'htftHomeAway') return 'Home/Away';
  if (type === 'htftAwayHome') return 'Away/Home';
  
  return type;
}

interface BettingSlipProps {
  items: BetSlipItem[];
  onRemove: (matchId: string) => void;
  onClear: () => void;
}

export function BettingSlip({ items, onRemove, onClear }: BettingSlipProps) {
  const [stake, setStake] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const [isPlacing, setIsPlacing] = useState(false);
  const { addBet, placeBet } = useBets();

  const stakeNum = parseFloat(stake) || 0;
  const totalOdds = items.reduce((acc, item) => acc * item.odds, 1);
  const potentialWin = stakeNum * totalOdds;

  const generateBetId = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handlePlaceBet = () => {
    if (stakeNum < 500) {
      toast({
        title: "Invalid Stake",
        description: "Minimum stake amount is KSH 500",
        variant: "destructive",
      });
      return;
    }

    setIsPlacing(true);

    // Attempt to deduct from balance
    const betPlaced = placeBet(stakeNum);
    
    if (!betPlaced) {
      toast({
        title: "Insufficient Balance",
        description: `You need at least KSH ${stakeNum.toFixed(2)} to place this bet`,
        variant: "destructive",
      });
      setIsPlacing(false);
      return;
    }

    // Simulate bet placement
    setTimeout(() => {
      const now = new Date();
      const betId = generateBetId();
      const newBet: PlacedBet = {
        id: `bet_${Date.now()}`,
        betId,
        date: `${now.getDate()}/${now.getMonth() + 1}`,
        time: `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`,
        stake: stakeNum,
        potentialWin: Math.round(potentialWin),
        totalOdds: Number(totalOdds.toFixed(2)),
        selections: items,
        status: "Open",
      };

      addBet(newBet);

      toast({
        title: "Bet Placed Successfully! 🎉",
        description: `BetID: ${betId} | KSH ${stakeNum.toFixed(2)} on ${items.length} selection${items.length > 1 ? "s" : ""} - Potential win: KSH ${potentialWin.toFixed(2)}`,
      });

      // Reset the slip
      setStake("");
      onClear();
      setIsPlacing(false);
      setIsOpen(false);
    }, 1000);
  };

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto z-40 w-auto sm:w-80 animate-slide-in rounded-t-xl border border-border bg-card shadow-2xl">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-t-xl bg-primary px-4 py-3"
      >
        <span className="font-display text-sm font-bold text-primary-foreground">
          Bet Slip ({items.length})
        </span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-primary-foreground" />
        ) : (
          <ChevronUp className="h-4 w-4 text-primary-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="max-h-72 overflow-y-auto p-4">
          {/* Items */}
          {items.map((item) => (
            <div key={item.matchId} className="mb-3 flex items-start justify-between rounded-lg bg-secondary p-3">
              <div>
                <p className="text-xs font-medium text-foreground">{item.match}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.market === 'CS' ? 'CORRECT SCORE' : item.market === 'O/U' ? 'OVER/UNDER' : item.market === 'HT/FT' ? 'HALF TIME/FULL TIME' : item.market === 'DC' ? 'DOUBLE CHANCE' : item.market === 'BTTS' ? 'BOTH TEAMS TO SCORE' : item.market} - <span className="font-semibold text-primary">{getPickLabel(item.type)}</span> — <span className="font-mono font-bold text-primary">{item.odds.toFixed(2)}</span>
                </p>
              </div>
              <button onClick={() => onRemove(item.matchId)} className="text-muted-foreground hover:text-destructive">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {/* Stake */}
          <div className="mt-3">
            <label className="mb-1 block text-xs text-muted-foreground">Stake (KSH)</label>
            <input
              type="number"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          {/* Summary */}
          <div className="mt-3 space-y-1 border-t border-border pt-3">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Total Odds</span>
              <span className="font-mono font-bold text-foreground">{totalOdds.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium text-foreground">Potential Win</span>
              <span className="font-mono font-bold text-primary">KSH {potentialWin.toFixed(2)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClear} className="flex-1 text-xs" disabled={isPlacing}>
              <Trash2 className="mr-1 h-3 w-3" /> Clear
            </Button>
            <Button 
              variant="hero" 
              size="sm" 
              className="flex-1 text-xs" 
              onClick={handlePlaceBet}
              disabled={isPlacing || items.length === 0}
            >
              {isPlacing ? (
                <>
                  <span className="animate-spin mr-1 inline-block">⏳</span> Placing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-1 h-3 w-3" /> Place Bet
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
