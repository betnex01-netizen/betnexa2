import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface MatchScore {
  home: number;
  away: number;
}

export type MatchStatus = "upcoming" | "live" | "halftime" | "finished";

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  scheduledTime: Date;
  status: MatchStatus;
  currentMinute: number;
  score: MatchScore;
  finalScore?: MatchScore;
}

interface MatchContextType {
  matches: Match[];
  updateScore: (matchId: string, homeGoals: number, awayGoals: number) => void;
  setFinalScore: (matchId: string, homeGoals: number, awayGoals: number) => void;
  getMatchStatus: (matchId: string) => MatchStatus;
  getCurrentMinute: (matchId: string) => number;
  addMatch: (match: Match) => void;
}

const MatchContext = createContext<MatchContextType | undefined>(undefined);

export function MatchProvider({ children }: { children: ReactNode }) {
  const [matches, setMatches] = useState<Match[]>([
    {
      id: "m1",
      homeTeam: "Bayern Munich",
      awayTeam: "PSG",
      league: "Champions League",
      scheduledTime: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour from now
      status: "upcoming",
      currentMinute: 0,
      score: { home: 0, away: 0 },
    },
    {
      id: "m2",
      homeTeam: "Arsenal",
      awayTeam: "Chelsea",
      league: "Premier League",
      scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      status: "upcoming",
      currentMinute: 0,
      score: { home: 0, away: 0 },
    },
  ]);

  // Update match status based on time
  useEffect(() => {
    const interval = setInterval(() => {
      setMatches((prevMatches) =>
        prevMatches.map((match) => {
          const now = new Date();
          const timeDiff = (now.getTime() - match.scheduledTime.getTime()) / 1000 / 60; // in minutes

          if (timeDiff < 0) {
            // Not started yet
            return { ...match, status: "upcoming", currentMinute: 0 };
          } else if (timeDiff >= 0 && timeDiff < 45) {
            // First half
            return { ...match, status: "live", currentMinute: Math.floor(timeDiff) };
          } else if (timeDiff >= 45 && timeDiff < 48) {
            // Halftime break (2-3 minutes)
            return { ...match, status: "halftime", currentMinute: 45 };
          } else if (timeDiff >= 48 && timeDiff < 90) {
            // Second half
            return { ...match, status: "live", currentMinute: Math.floor(timeDiff - 3) };
          } else {
            // Match finished
            return { ...match, status: "finished", currentMinute: 90 };
          }
        })
      );
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const updateScore = (matchId: string, homeGoals: number, awayGoals: number) => {
    setMatches((prevMatches) =>
      prevMatches.map((match) =>
        match.id === matchId
          ? { ...match, score: { home: homeGoals, away: awayGoals } }
          : match
      )
    );
  };

  const setFinalScore = (matchId: string, homeGoals: number, awayGoals: number) => {
    setMatches((prevMatches) =>
      prevMatches.map((match) =>
        match.id === matchId
          ? {
              ...match,
              status: "finished",
              currentMinute: 90,
              finalScore: { home: homeGoals, away: awayGoals },
              score: { home: homeGoals, away: awayGoals },
            }
          : match
      )
    );
  };

  const getMatchStatus = (matchId: string): MatchStatus => {
    const match = matches.find((m) => m.id === matchId);
    return match?.status || "upcoming";
  };

  const getCurrentMinute = (matchId: string): number => {
    const match = matches.find((m) => m.id === matchId);
    return match?.currentMinute || 0;
  };

  const addMatch = (match: Match) => {
    setMatches((prev) => [...prev, match]);
  };

  return (
    <MatchContext.Provider
      value={{ matches, updateScore, setFinalScore, getMatchStatus, getCurrentMinute, addMatch }}
    >
      {children}
    </MatchContext.Provider>
  );
}

export function useMatches() {
  const context = useContext(MatchContext);
  if (context === undefined) {
    throw new Error("useMatches must be used within a MatchProvider");
  }
  return context;
}
