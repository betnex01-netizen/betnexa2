import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export interface PlacedBet {
  id: string;
  betId: string;
  date: string;
  time: string;
  stake: number;
  potentialWin: number;
  totalOdds: number;
  selections: Array<{
    matchId: string;
    match: string;
    type: string;
    market: string;
    odds: number;
  }>;
  status: "Open" | "Closed" | "Won" | "Lost" | "Void";
  amountWon?: number;
}

interface BetContextType {
  bets: PlacedBet[];
  addBet: (bet: PlacedBet) => void;
  removeBet: (betId: string) => void;
  balance: number;
  deposit: (amount: number) => void;
  withdraw: (amount: number) => boolean;
  placeBet: (betAmount: number) => boolean;
  updateBetStatus: (betId: string, status: PlacedBet["status"], amountWon?: number) => Promise<{ success: boolean; error?: string; data?: any }>;
  setBalance: (amount: number) => void;
  syncBalance: (newBalance: number) => void;
  setBets: (bets: PlacedBet[]) => void;
}

const BetContext = createContext<BetContextType | undefined>(undefined);

export function BetProvider({ children }: { children: ReactNode }) {
  const [bets, setBets] = useState<PlacedBet[]>([]);

  // Initialize balance from localStorage user data on mount
  const [balance, setBalance] = useState<number>(() => {
    try {
      const savedUser = sessionStorage.getItem('betnexa_user') || localStorage.getItem('betnexa_user');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        return user.accountBalance || 0;
      }
    } catch (error) {
      console.warn('⚠️ Failed to initialize balance from localStorage');
    }
    return 0;
  });

  // Listen for balance updates from UserContext (e.g., when admin edits balance in database)
  useEffect(() => {
    const handleBalanceUpdate = (event: CustomEvent) => {
      const { newBalance } = event.detail;
      if (typeof newBalance === 'number') {
        console.log(`💰 BetContext: Syncing balance from UserContext: ${balance} → ${newBalance}`);
        setBalance(newBalance);
      }
    };

    window.addEventListener('balance_updated', handleBalanceUpdate as EventListener);
    return () => window.removeEventListener('balance_updated', handleBalanceUpdate as EventListener);
  }, [balance]);

  const addBet = (bet: PlacedBet) => {
    setBets([bet, ...bets]);
  };

  const removeBet = (betId: string) => {
    setBets(bets.filter((b) => b.id !== betId));
  };

  const deposit = (amount: number) => {
    if (amount > 0) {
      setBalance((prev) => prev + amount);
    }
  };

  const withdraw = (amount: number): boolean => {
    if (amount > 0 && balance >= amount) {
      setBalance((prev) => prev - amount);
      return true;
    }
    return false;
  };

  const placeBet = (betAmount: number): boolean => {
    if (betAmount > 0 && balance >= betAmount) {
      setBalance((prev) => prev - betAmount);
      return true;
    }
    return false;
  };

  const updateBetStatus = async (betId: string, status: PlacedBet["status"], amountWon?: number) => {
    // Update local state first
    setBets((prev) =>
      prev.map((bet) =>
        bet.id === betId
          ? {
              ...bet,
              status,
              amountWon: amountWon || bet.amountWon,
            }
          : bet
      )
    );

    // If bet won, add winnings to balance
    if (status === "Won" && amountWon) {
      setBalance((prev) => prev + amountWon);
    }

    // Now sync with backend database
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://server-tau-puce.vercel.app';
      const response = await fetch(`${apiUrl}/api/bets/${betId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          amountWon: amountWon || 0
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Failed to update bet status in database:', data.error);
        return {
          success: false,
          error: data.error || 'Failed to update bet status'
        };
      }

      console.log(`✅ Bet ${betId} status updated to ${status} in database`);
      if (status === 'Won') {
        console.log(`✅ Amount won KSH ${amountWon} recorded in database`);
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('❌ Error syncing bet status to database:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const setBalanceHandler = (amount: number) => {
    if (amount >= 0) {
      setBalance(amount);
    }
  };

  const syncBalance = (newBalance: number) => {
    if (newBalance >= 0) {
      setBalance(newBalance);
    }
  };

  return (
    <BetContext.Provider value={{ bets, addBet, removeBet, balance, deposit, withdraw, placeBet, updateBetStatus, setBalance: setBalanceHandler, syncBalance, setBets }}>
      {children}
    </BetContext.Provider>
  );
}

export function useBets() {
  const context = useContext(BetContext);
  if (context === undefined) {
    throw new Error("useBets must be used within a BetProvider");
  }
  return context;
}
