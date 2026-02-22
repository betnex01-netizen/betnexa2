import { createContext, useContext, useState, ReactNode } from "react";

export interface GameOdds {
  id: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
  time: string;
  status: "upcoming" | "live" | "finished";
  markets: Record<string, number>;
  homeScore?: number;
  awayScore?: number;
  minute?: number;
  kickoffStartTime?: number; // Timestamp when kickoff started
  isKickoffStarted?: boolean;
  gamePaused?: boolean;
  kickoffPausedAt?: number; // Timestamp when paused
}

interface OddsContextType {
  games: GameOdds[];
  addGame: (game: GameOdds) => void;
  updateGame: (id: string, game: Partial<GameOdds>) => void;
  removeGame: (id: string) => void;
  getGame: (id: string) => GameOdds | undefined;
  updateGameMarkets: (id: string, markets: Record<string, number>) => void;
}

const OddsContext = createContext<OddsContextType | undefined>(undefined);

export function OddsProvider({ children }: { children: ReactNode }) {
  const [games, setGames] = useState<GameOdds[]>([]);

  const addGame = (game: GameOdds) => {
    setGames((prev) => [...prev, game]);
  };

  const updateGame = (id: string, updates: Partial<GameOdds>) => {
    setGames((prev) =>
      prev.map((game) => (game.id === id ? { ...game, ...updates } : game))
    );
  };

  const removeGame = (id: string) => {
    setGames((prev) => prev.filter((game) => game.id !== id));
  };

  const getGame = (id: string) => {
    return games.find((game) => game.id === id);
  };

  const updateGameMarkets = (id: string, markets: Record<string, number>) => {
    updateGame(id, { markets });
  };

  return (
    <OddsContext.Provider
      value={{ games, addGame, updateGame, removeGame, getGame, updateGameMarkets }}
    >
      {children}
    </OddsContext.Provider>
  );
}

export function useOdds() {
  const context = useContext(OddsContext);
  if (context === undefined) {
    throw new Error("useOdds must be used within an OddsProvider");
  }
  return context;
}
