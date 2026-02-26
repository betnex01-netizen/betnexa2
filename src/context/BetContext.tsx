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
  updateBetStatus: (betId: string, status: PlacedBet["status"], amountWon?: number) => void;
  setBalance: (amount: number) => void;
  syncBalance: (newBalance: number) => void;
  setBets: (bets: PlacedBet[]) => void;
}

const BetContext = createContext<BetContextType | undefined>(undefined);

export function BetProvider({ children }: { children: ReactNode }) {
  const [bets, setBets] = useState<PlacedBet[]>([]);

  const [balance, setBalance] = useState<number>(0); // New accounts start with 0 balance

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
  }, []);

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

  const updateBetStatus = (betId: string, status: PlacedBet["status"], amountWon?: number) => {
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
