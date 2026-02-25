import { createContext, useContext, useState, ReactNode, useEffect } from "react";

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
  seconds?: number; // Seconds component for display
  kickoffStartTime?: number | string; // Timestamp when kickoff started (ISO string or milliseconds)
  isKickoffStarted?: boolean;
  gamePaused?: boolean;
  kickoffPausedAt?: number | string; // Timestamp when paused (ISO string or milliseconds)
  isHalftime?: boolean;
}

interface OddsContextType {
  games: GameOdds[];
  addGame: (game: GameOdds) => void;
  updateGame: (id: string, game: Partial<GameOdds>) => void;
  removeGame: (id: string) => void;
  getGame: (id: string) => GameOdds | undefined;
  updateGameMarkets: (id: string, markets: Record<string, number>) => void;
  refreshGames: () => Promise<void>;
}

const OddsContext = createContext<OddsContextType | undefined>(undefined);

export function OddsProvider({ children }: { children: ReactNode }) {
  const [games, setGames] = useState<GameOdds[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Fetch games from database on component mount
  useEffect(() => {
    const fetchGames = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'https://server-tau-puce.vercel.app';
        
        console.log('🔄 Fetching games from:', apiUrl);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(`${apiUrl}/api/admin/games`, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log('📊 Fetch response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          
          if (data.success && Array.isArray(data.games)) {
            console.log('✅ Successfully loaded', data.games.length, 'games');
            
            // Transform database games to GameOdds format
            const transformedGames: GameOdds[] = data.games.map((g: any) => ({
              id: g.game_id || g.id,
              league: g.league || '',
              homeTeam: g.home_team,
              awayTeam: g.away_team,
              homeOdds: parseFloat(g.home_odds) || 2.0,
              drawOdds: parseFloat(g.draw_odds) || 3.0,
              awayOdds: parseFloat(g.away_odds) || 3.0,
              time: g.scheduled_time || g.time || new Date().toISOString(),
              status: g.status || 'upcoming',
              markets: g.markets || {},
              homeScore: g.home_score || 0,
              awayScore: g.away_score || 0,
              minute: g.minute || 0,
              seconds: 0, // Initialize seconds to 0 - calculated on frontend
              kickoffStartTime: g.kickoff_start_time || undefined,
              isKickoffStarted: g.is_kickoff_started || false,
              gamePaused: g.game_paused || false,
              kickoffPausedAt: g.kickoff_paused_at || undefined,
            }));
            setGames(transformedGames);
            setLoadError(null);
          } else {
            console.warn('⚠️ Invalid response format:', data);
            setLoadError(null); // Don't show error, just start with empty games
          }
        } else {
          console.warn('⚠️ API returned non-OK status:', response.status);
          setLoadError(null); // Don't block app from loading
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.warn('⏱️ Game fetch timeout (10s)');
        } else {
          console.error('❌ Error fetching games:', error);
        }
        setLoadError(null); // Don't block app from loading
      } finally {
        setIsLoading(false);
      }
    };

    fetchGames();

    // Auto-refresh games every 5 seconds when there are live games
    const autoRefreshInterval = setInterval(async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'https://server-tau-puce.vercel.app';
        const response = await fetch(`${apiUrl}/api/admin/games`, {
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.games)) {
            const transformedGames: GameOdds[] = data.games.map((g: any) => ({
              id: g.game_id || g.id,
              league: g.league || '',
              homeTeam: g.home_team,
              awayTeam: g.away_team,
              homeOdds: parseFloat(g.home_odds) || 2.0,
              drawOdds: parseFloat(g.draw_odds) || 3.0,
              awayOdds: parseFloat(g.away_odds) || 3.0,
              time: g.scheduled_time || g.time || new Date().toISOString(),
              status: g.status || 'upcoming',
              markets: g.markets || {},
              homeScore: g.home_score || 0,
              awayScore: g.away_score || 0,
              minute: g.minute || 0,
              kickoffStartTime: g.kickoff_start_time || undefined,
              isKickoffStarted: g.is_kickoff_started || false,
              gamePaused: g.game_paused || false,
              kickoffPausedAt: g.kickoff_paused_at || undefined,
            }));
            setGames(transformedGames);
          }
        }
      } catch (error) {
        console.warn('⚠️ Auto-refresh failed:', error);
      }
    }, 5000);

    return () => {
      clearInterval(autoRefreshInterval);
    };
  }, []);

  // Timer polling for live games - fetch server time to sync across all users/admin
  useEffect(() => {
    const timerInterval = setInterval(async () => {
      // Find all live games that are in kickoff  
      const liveGames = games.filter(g => g.isKickoffStarted && (g.status === 'live' || g.minute === undefined));
      
      if (liveGames.length === 0) return; // No live games, skip fetch

      const apiUrl = import.meta.env.VITE_API_URL || 'https://server-tau-puce.vercel.app';

      // Fetch timer for each live game in parallel
      const timerPromises = liveGames.map(async (game) => {
        try {
          const response = await fetch(`${apiUrl}/api/admin/games/${game.id}/time`, {
            signal: AbortSignal.timeout(2000), // Shorter timeout for timer
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              return {
                gameId: game.id,
                minute: data.minute ?? 0,
                seconds: data.seconds ?? 0
              };
            }
          }
        } catch (error) {
          // Silently fail for individual games
        }
        return null;
      });

      // Wait for all timer fetches to complete
      const results = await Promise.all(timerPromises);

      // Update all games with their new times
      results.forEach(result => {
        if (result) {
          setGames(prev =>
            prev.map(g =>
              g.id === result.gameId
                ? { ...g, minute: result.minute, seconds: result.seconds }
                : g
            )
          );
        }
      });
    }, 1000); // Poll every second for live games

    return () => clearInterval(timerInterval);
  }, [games]);

  const refreshGames = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://server-tau-puce.vercel.app';
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${apiUrl}/api/admin/games`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.games)) {
          // Transform database games to GameOdds format
          const transformedGames: GameOdds[] = data.games.map((g: any) => ({
            id: g.game_id || g.id,
            league: g.league || '',
            homeTeam: g.home_team,
            awayTeam: g.away_team,
            homeOdds: parseFloat(g.home_odds) || 2.0,
            drawOdds: parseFloat(g.draw_odds) || 3.0,
            awayOdds: parseFloat(g.away_odds) || 3.0,
            time: g.scheduled_time || g.time || new Date().toISOString(),
            status: g.status || 'upcoming',
            markets: g.markets || {},
            homeScore: g.home_score || 0,
            awayScore: g.away_score || 0,
            minute: g.minute || 0,
            seconds: 0, // Initialize seconds to 0 - calculated on frontend
            kickoffStartTime: g.kickoff_start_time || undefined,
            isKickoffStarted: g.is_kickoff_started || false,
            gamePaused: g.game_paused || false,
            kickoffPausedAt: g.kickoff_paused_at || undefined,
          }));
          setGames(transformedGames);
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn('⏱️ Game refresh timeout (10s)');
      } else {
        console.error('❌ Error refreshing games:', error);
      }
    }
  };

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
      value={{ games, addGame, updateGame, removeGame, getGame, updateGameMarkets, refreshGames }}
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


