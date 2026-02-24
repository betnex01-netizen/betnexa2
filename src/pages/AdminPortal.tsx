import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Trash2, CheckCircle, XCircle, Clock, DollarSign, Users, BarChart3, Trophy, Settings, RefreshCw, Edit2, Save, ArrowDown, ArrowUp, Play, Pause, Square, Lock, Unlock } from "lucide-react";
import { generateMarketOdds, type MatchMarkets } from "@/components/MatchCard";
import { useMatches } from "@/context/MatchContext";
import { useBets } from "@/context/BetContext";
import { useOdds, type GameOdds } from "@/context/OddsContext";
import { useUserManagement } from "@/context/UserManagementContext";
import { useUser } from "@/context/UserContext";
import { useTransactions } from "@/context/TransactionContext";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { calculateMatchMinute } from "@/lib/gameTimeCalculator";
import balanceSyncService from "@/lib/balanceSyncService";

const marketLabels: Record<string, string> = {
  bttsYes: "BTTS Yes", bttsNo: "BTTS No",
  over25: "Over 2.5", under25: "Under 2.5", over15: "Over 1.5", under15: "Under 1.5",
  doubleChanceHomeOrDraw: "DC 1X", doubleChanceAwayOrDraw: "DC X2", doubleChanceHomeOrAway: "DC 12",
  htftHomeHome: "HT/FT H/H", htftDrawDraw: "HT/FT D/D", htftAwayAway: "HT/FT A/A", htftDrawHome: "HT/FT D/H", htftDrawAway: "HT/FT D/A",
  cs10: "CS 1-0", cs20: "CS 2-0", cs11: "CS 1-1", cs00: "CS 0-0", cs01: "CS 0-1", cs21: "CS 2-1", cs12: "CS 1-2", cs02: "CS 0-2",
  cs30: "CS 3-0", cs03: "CS 0-3", cs31: "CS 3-1", cs13: "CS 1-3", cs32: "CS 3-2", cs23: "CS 2-3", cs40: "CS 4-0", cs04: "CS 0-4",
  cs41: "CS 4-1", cs14: "CS 1-4", cs42: "CS 4-2", cs24: "CS 2-4", cs43: "CS 4-3", cs34: "CS 3-4", cs44: "CS 4-4",
};

const AdminPortal = () => {
  const { matches, updateScore, setFinalScore } = useMatches();
  const { bets, syncBalance, updateBetStatus } = useBets();
  const { games, addGame, updateGame, removeGame, updateGameMarkets, refreshGames } = useOdds();
  const { users, updateUser, getAllUsers, fetchUsersFromBackend } = useUserManagement();
  const { user: loggedInUser, updateUser: updateCurrentUser } = useUser();
  const { getAllTransactions, updateTransactionStatus } = useTransactions();
  
  const [showAddGame, setShowAddGame] = useState(false);
  const [editingGame, setEditingGame] = useState<string | null>(null);
  const [editMarkets, setEditMarkets] = useState<Record<string, number> | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserData, setEditingUserData] = useState<Record<string, any>>({});
  const [newGame, setNewGame] = useState({ league: "", homeTeam: "", awayTeam: "", homeOdds: "", drawOdds: "", awayOdds: "", time: "", status: "upcoming" as const });
  const [scoreUpdate, setScoreUpdate] = useState<Record<string, { home: number; away: number }>>({});
  const [selectionOutcomes, setSelectionOutcomes] = useState<Record<string, Record<number, "won" | "lost">>>({});
  
  // Payment management state
  const [failedPayments, setFailedPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [resolvingPayment, setResolvingPayment] = useState<string | null>(null);
  const [resolutionData, setResolutionData] = useState<Record<string, { mpesaReceipt?: string; resultDesc?: string }>>({});
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [allPayments, setAllPayments] = useState<any[]>([]);
  
  // User balance editing state
  const [editingBalance, setEditingBalance] = useState<string | null>(null);
  const [balanceEditValue, setBalanceEditValue] = useState<string>("");
  const [balanceEditReason, setBalanceEditReason] = useState<string>("");
  
  // Admin withdrawal activation state
  const [activatingUserId, setActivatingUserId] = useState<string | null>(null);

  // Real-time minute calculation for kicked-off games
  useEffect(() => {
    const interval = setInterval(() => {
      games.forEach((game) => {
        if (game.isKickoffStarted && game.kickoffStartTime !== undefined) {
          // Calculate current minute based on elapsed time
          const { minute } = calculateMatchMinute(
            game.kickoffStartTime,
            game.gamePaused || false,
            game.kickoffPausedAt,
            game.minute
          );

          // Update game in context
          if (minute > 95) {
            // Game ends at 95 minutes
            updateGame(game.id, { minute: 95, status: "finished", isKickoffStarted: false });
          } else if (minute === 45 && !game.gamePaused) {
            // Show HALFTIME at 45 minutes (only when not already paused)
            updateGame(game.id, { minute: 45, gamePaused: true });
          } else if (minute !== game.minute) {
            // Update minute if it changed
            updateGame(game.id, { minute });
          }
        }
      });
    }, 1000); // Update every 1 second for real-time feel

    return () => clearInterval(interval);
  }, [games, updateGame]);

  // Fetch users from backend when component mounts
  useEffect(() => {
    console.log('📦 Fetching users from backend...');
    fetchUsersFromBackend();
    
    // Also fetch transactions and payments
    console.log('📦 Fetching transactions and payments...');
    fetchAllTransactions();
    fetchAllPayments();
  }, []);

  const handleAdminActivateWithdrawal = async (userId: string, userName: string) => {
    setActivatingUserId(userId);
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://server-tau-puce.vercel.app';
      const response = await fetch(`${apiUrl}/api/admin/users/${userId}/activate-withdrawal`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: loggedInUser.phone,
          withdrawalId: `withdrawal-${userId}-${Date.now()}`
        })
      });

      const data = await response.json();

      if (data.success) {
        // Update local state
        updateUser(userId, {
          withdrawalActivated: true,
          withdrawalActivationDate: new Date().toISOString()
        });
        alert(`✅ Withdrawal activated for ${userName}`);
      } else {
        alert(`Error: ${data.error || 'Failed to activate withdrawal'}`);
      }
    } catch (error) {
      console.error('Error activating withdrawal:', error);
      alert('Failed to activate withdrawal');
    } finally {
      setActivatingUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    try {
      console.log('🗑️ Deleting user:', userId, userName);
      
      // Log the user out if it's the current user being deleted
      if (userId === loggedInUser.id) {
        alert('⚠️ You cannot delete your own admin account');
        return;
      }

      // Call backend to delete user
      const apiUrl = import.meta.env.VITE_API_URL || 'https://server-tau-puce.vercel.app';
      const response = await fetch(`${apiUrl}/api/payments/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ User deleted successfully:', userId);
        alert(`✅ User account for ${userName} has been permanently deleted.`);
        
        // Refresh user list
        const updatedUsers = users.filter((u) => u.id !== userId);
        // Note: The context will be updated automatically through the provider
      } else {
        console.error('❌ Delete failed:', data.message);
        alert(`❌ Failed to delete user: ${data.message}`);
      }
    } catch (error) {
      console.error('❌ Delete error:', error);
      alert(`❌ Error deleting user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const addGameHandler = async () => {
    if (!newGame.homeTeam || !newGame.awayTeam) return;
    
    const h = parseFloat(newGame.homeOdds) || 2.0;
    const d = parseFloat(newGame.drawOdds) || 3.0;
    const a = parseFloat(newGame.awayOdds) || 3.0;
    const markets = generateMarketOdds(h, d, a);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://server-tau-puce.vercel.app';
      const response = await fetch(`${apiUrl}/api/admin/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: loggedInUser.phone,
          league: newGame.league,
          homeTeam: newGame.homeTeam,
          awayTeam: newGame.awayTeam,
          homeOdds: h,
          drawOdds: d,
          awayOdds: a,
          time: newGame.time,
          status: newGame.status,
          markets
        })
      });

      const data = await response.json();

      if (data.success) {
        // Add game to local context for immediate UI update
        const gameData: GameOdds = {
          id: data.game.game_id || data.game.id,
          league: data.game.league || '',
          homeTeam: data.game.home_team,
          awayTeam: data.game.away_team,
          homeOdds: parseFloat(data.game.home_odds),
          drawOdds: parseFloat(data.game.draw_odds),
          awayOdds: parseFloat(data.game.away_odds),
          time: data.game.time || new Date().toISOString(),
          status: data.game.status || 'upcoming',
          markets: data.game.markets || {},
        };
        addGame(gameData);
        setNewGame({ league: "", homeTeam: "", awayTeam: "", homeOdds: "", drawOdds: "", awayOdds: "", time: "", status: "upcoming" });
        setShowAddGame(false);
        alert("✅ Game added successfully!");
        
        // Refresh games to sync with all users
        setTimeout(() => {
          refreshGames();
        }, 500);
      } else {
        console.error('API Error:', data);
        alert(`Error: ${data.error || 'Failed to add game'}`);
      }
    } catch (error) {
      console.error('Error adding game:', error);
      alert('Failed to add game. Check console for details.');
    }
  };

  const regenerateOdds = async (id: string) => {
    const game = games.find((g) => g.id === id);
    if (!game) return;

    try {
      // Preserve correct score odds from database, only regenerate other odds
      const newMarkets = generateMarketOdds(game.homeOdds, game.drawOdds, game.awayOdds, game.markets);
      
      const apiUrl = import.meta.env.VITE_API_URL || 'https://server-tau-puce.vercel.app';
      const response = await fetch(`${apiUrl}/api/admin/games/${id}/markets`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: loggedInUser.phone,
          markets: newMarkets
        })
      });

      const data = await response.json();

      if (data.success) {
        updateGameMarkets(id, newMarkets);
        alert('✅ Odds regenerated successfully!');
      } else {
        alert(`Error: ${data.error || 'Failed to regenerate odds'}`);
      }
    } catch (error) {
      console.error('Error regenerating odds:', error);
      alert('Failed to regenerate odds');
    }
  };

  const startEditMarkets = (game: GameOdds) => {
    setEditingGame(game.id);
    setEditMarkets({ ...game.markets });
  };

  const saveMarkets = async (id: string) => {
    if (!editMarkets) return;
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://server-tau-puce.vercel.app';
      const response = await fetch(`${apiUrl}/api/admin/games/${id}/markets`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: loggedInUser.phone,
          markets: editMarkets
        })
      });

      const data = await response.json();

      if (data.success) {
        updateGameMarkets(id, editMarkets);
        setEditingGame(null);
        setEditMarkets(null);
        alert('✅ Markets updated successfully!');
      } else {
        alert(`Error: ${data.error || 'Failed to update markets'}`);
      }
    } catch (error) {
      console.error('Error saving markets:', error);
      alert('Failed to save markets');
    }
  };

  const removeGameHandler = async (id: string) => {
    if (!confirm('Are you sure you want to delete this game?')) return;
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://server-tau-puce.vercel.app';
      const response = await fetch(`${apiUrl}/api/admin/games/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loggedInUser.phone })
      });

      const data = await response.json();

      if (data.success) {
        removeGame(id);
        alert('✅ Game deleted successfully!');
      } else {
        alert(`Error: ${data.error || 'Failed to delete game'}`);
      }
    } catch (error) {
      console.error('Error deleting game:', error);
      alert('Failed to delete game');
    }
  };

  // Live play functions
  const startKickoff = async (gameId: string) => {
    const game = games.find((g) => g.id === gameId);
    if (!game) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://server-tau-puce.vercel.app';
      const response = await fetch(`${apiUrl}/api/admin/games/${gameId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: loggedInUser.phone,
          status: "live",
          minute: 0,
          homeScore: 0,
          awayScore: 0,
          isKickoffStarted: true,
          gamePaused: false
        })
      });

      const data = await response.json();

      if (data.success) {
        updateGame(gameId, {
          status: "live",
          minute: 0,
          homeScore: 0,
          awayScore: 0,
          isKickoffStarted: true,
          gamePaused: false
        });
        alert('✅ Kickoff started!');
      } else {
        console.error('Start kickoff error:', data);
        alert(`Error: ${data.details || data.error || 'Failed to start kickoff'}`);
      }
    } catch (error) {
      console.error('Error starting kickoff:', error);
      alert('Failed to start kickoff: ' + error.message);
    }
  };

  const pauseKickoff = async (gameId: string) => {
    const game = games.find((g) => g.id === gameId);
    if (!game || game.minute === undefined) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://server-tau-puce.vercel.app';
      const response = await fetch(`${apiUrl}/api/admin/games/${gameId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: loggedInUser.phone,
          gamePaused: true,
          kickoffPausedAt: new Date().toISOString(),
        })
      });

      const data = await response.json();

      if (data.success) {
        updateGame(gameId, {
          gamePaused: true,
          kickoffPausedAt: new Date().toISOString(),
        });
        alert('⏸️ Game paused!');
      } else {
        console.error('Pause error:', data);
        alert(`Error: ${data.details || data.error || 'Failed to pause game'}`);
      }
    } catch (error) {
      console.error('Error pausing game:', error);
      alert('Failed to pause game: ' + error.message);
    }
  };

  const resumeKickoff = async (gameId: string) => {
    const game = games.find((g) => g.id === gameId);
    if (!game || game.kickoffStartTime === undefined || game.kickoffPausedAt === undefined) return;

    try {
      // Convert ISO strings to milliseconds for calculation
      const kickoffStartMs = typeof game.kickoffStartTime === 'string' 
        ? new Date(game.kickoffStartTime).getTime() 
        : game.kickoffStartTime;
      const pausedAtMs = typeof game.kickoffPausedAt === 'string' 
        ? new Date(game.kickoffPausedAt).getTime() 
        : game.kickoffPausedAt;
      
      // Calculate pause duration and adjust kickoff start time
      const pauseDuration = Date.now() - pausedAtMs;
      const newKickoffStartTimeMs = kickoffStartMs + pauseDuration;
      const newKickoffStartTime = new Date(newKickoffStartTimeMs).toISOString();

      const apiUrl = import.meta.env.VITE_API_URL || 'https://server-tau-puce.vercel.app';
      const response = await fetch(`${apiUrl}/api/admin/games/${gameId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: loggedInUser.phone,
          gamePaused: false,
          isKickoffStarted: true,
          kickoffStartTime: newKickoffStartTime,
          kickoffPausedAt: undefined,
        })
      });

      const data = await response.json();

      if (data.success) {
        updateGame(gameId, {
          gamePaused: false,
          isKickoffStarted: true,
          kickoffStartTime: newKickoffStartTime,
          kickoffPausedAt: undefined,
        });
        alert('▶️ Game resumed!');
      } else {
        console.error('Resume error:', data);
        alert(`Error: ${data.details || data.error || 'Failed to resume game'}`);
      }
    } catch (error) {
      console.error('Error resuming game:', error);
      alert('Failed to resume game: ' + error.message);
    }
  };

  const adjustOddsBasedOnScore = (baseHomeOdds: number, baseDrawOdds: number, baseAwayOdds: number, homeScore: number, awayScore: number) => {
    const scoreDiff = homeScore - awayScore;
    const totalGoals = homeScore + awayScore;
    
    let newHomeOdds = baseHomeOdds;
    let newDrawOdds = baseDrawOdds;
    let newAwayOdds = baseAwayOdds;
    
    if (scoreDiff > 0) {
      // Home is leading - decrease home odds, increase away odds
      const adjustment = Math.min(scoreDiff * 0.15, 0.8);
      newHomeOdds = Math.max(baseHomeOdds - adjustment, 1.1);
      newAwayOdds = baseAwayOdds + (adjustment * 1.5);
      newDrawOdds = baseDrawOdds + (adjustment * 0.8);
    } else if (scoreDiff < 0) {
      // Away is leading - decrease away odds, increase home odds
      const adjustment = Math.min(Math.abs(scoreDiff) * 0.15, 0.8);
      newAwayOdds = Math.max(baseAwayOdds - adjustment, 1.1);
      newHomeOdds = baseHomeOdds + (adjustment * 1.5);
      newDrawOdds = baseDrawOdds + (adjustment * 0.8);
    } else {
      // It's a draw - balance the odds
      const avgOdds = (baseHomeOdds + baseAwayOdds) / 2;
      newHomeOdds = avgOdds;
      newAwayOdds = avgOdds;
      newDrawOdds = Math.max(baseDrawOdds - 0.2, 2.0);
    }
    
    return {
      homeOdds: parseFloat(newHomeOdds.toFixed(2)),
      drawOdds: parseFloat(newDrawOdds.toFixed(2)),
      awayOdds: parseFloat(newAwayOdds.toFixed(2)),
    };
  };

  const updateLiveScore = async (gameId: string, homeScore: number, awayScore: number) => {
    const game = games.find((g) => g.id === gameId);
    if (!game) return;

    try {
      const newOdds = adjustOddsBasedOnScore(game.homeOdds, game.drawOdds, game.awayOdds, homeScore, awayScore);
      // Pass existing markets to preserve correct score odds from database
      const newMarkets = generateMarketOdds(newOdds.homeOdds, newOdds.drawOdds, newOdds.awayOdds, game.markets);

      const apiUrl = import.meta.env.VITE_API_URL || 'https://server-tau-puce.vercel.app';
      const response = await fetch(`${apiUrl}/api/admin/games/${gameId}/score`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: loggedInUser.phone,
          homeScore,
          awayScore,
          minute: game.minute,
          status: game.status
        })
      });

      const data = await response.json();

      if (data.success) {
        // Update local state
        updateGame(gameId, {
          homeScore,
          awayScore,
          homeOdds: newOdds.homeOdds,
          drawOdds: newOdds.drawOdds,
          awayOdds: newOdds.awayOdds,
          markets: newMarkets,
        });
      } else {
        alert(`Error: ${data.error || 'Failed to update score'}`);
      }
    } catch (error) {
      console.error('Error updating score:', error);
      alert('Failed to update score');
    }
  };

  const endGame = async (gameId: string) => {
    const game = games.find((g) => g.id === gameId);
    if (!game) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://server-tau-puce.vercel.app';
      const response = await fetch(`${apiUrl}/api/admin/games/${gameId}/end`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: loggedInUser.phone,
        })
      });

      const data = await response.json();

      if (data.success) {
        updateGame(gameId, {
          status: "finished",
        });
        alert('✅ Game finished!');
      } else {
        console.error('End game error:', data);
        alert(`Error: ${data.details || data.error || 'Failed to end game'}`);
      }
    } catch (error) {
      console.error('Error ending game:', error);
      alert('Failed to end game: ' + error.message);
    }
  };

  const markHalftime = async (gameId: string) => {
    const game = games.find((g) => g.id === gameId);
    if (!game) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://server-tau-puce.vercel.app';
      console.log(`⏱️  Marking halftime for game: ${gameId}`);
      
      const response = await fetch(`${apiUrl}/api/admin/games/${gameId}/halftime`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: loggedInUser.phone,
        })
      });

      const data = await response.json();
      console.log('📊 Halftime response:', data);

      if (data.success) {
        updateGame(gameId, { isHalftime: true });
        alert('✅ Halftime marked!');
      } else {
        console.error('❌ Halftime error:', data);
        alert(`Error: ${data.details || data.error || 'Failed to mark halftime'}`);
      }
    } catch (error) {
      console.error('Error marking halftime:', error);
      alert('Failed to mark halftime: ' + error.message);
    }
  };

  const markGameLive = async (gameId: string) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://server-tau-puce.vercel.app';
      console.log(`🔴 Marking game as live: ${gameId}`);
      
      const response = await fetch(`${apiUrl}/api/admin/games/${gameId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: loggedInUser.phone,
          status: "live"
        })
      });

      const data = await response.json();
      console.log('📊 Mark live response:', data);

      if (data.success) {
        updateGame(gameId, { status: "live" });
        alert('✅ Game marked as live!');
      } else {
        console.error('❌ Mark live error:', data);
        alert(`Error: ${data.details || data.error || 'Failed to mark game as live'}`);
      }
    } catch (error) {
      console.error('Error marking game live:', error);
      alert('Failed to mark game as live: ' + error.message);
    }
  };

  const settleBetBySelections = (betId: string) => {
    const outcomes = selectionOutcomes[betId];
    if (!outcomes || Object.keys(outcomes).length === 0) return;

    const won = Object.values(outcomes).filter(o => o === "won").length;
    const lost = Object.values(outcomes).filter(o => o === "lost").length;
    const total = Object.keys(outcomes).length;

    // For a multibet, all selections must be won for the bet to win
    if (won === total && lost === 0) {
      const bet = bets.find(b => b.id === betId);
      if (bet) {
        updateBetStatus(betId, "Won", bet.potentialWin);
      }
    } else {
      // If any selection is lost, the bet is lost
      updateBetStatus(betId, "Lost", 0);
    }

    // Clear the outcomes after settling
    const newOutcomes = { ...selectionOutcomes };
    delete newOutcomes[betId];
    setSelectionOutcomes(newOutcomes);
  };

  // Fetch failed payments
  const fetchFailedPayments = async () => {
    setLoadingPayments(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://server-tau-puce.vercel.app';
      const response = await fetch(`${apiUrl}/api/payments/admin/failed`);
      const data = await response.json();
      if (data.success) {
        setFailedPayments(data.payments || []);
      }
    } catch (error) {
      console.error("Failed to fetch failed payments:", error);
    } finally {
      setLoadingPayments(false);
    }
  };

  // Fetch all transactions
  const fetchAllTransactions = async () => {
    setLoadingPayments(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://server-tau-puce.vercel.app';
      const response = await fetch(`${apiUrl}/api/admin/transactions`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.success) {
        setAllTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setLoadingPayments(false);
    }
  };

  // Fetch all payments
  const fetchAllPayments = async () => {
    setLoadingPayments(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://server-tau-puce.vercel.app';
      const response = await fetch(`${apiUrl}/api/admin/payments`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.success) {
        setAllPayments(data.payments || []);
      }
    } catch (error) {
      console.error("Failed to fetch payments:", error);
    } finally {
      setLoadingPayments(false);
    }
  };

  // Resolve a failed payment
  const resolveFailedPayment = async (externalReference: string) => {
    try {
      setResolvingPayment(externalReference);
      const data = resolutionData[externalReference] || {};

      const apiUrl = import.meta.env.VITE_API_URL || 'https://server-tau-puce.vercel.app';
      const response = await fetch(
        `${apiUrl}/api/payments/admin/resolve/${externalReference}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mpesaReceipt: data.mpesaReceipt || `ADMIN-RESOLVED-${Date.now()}`,
            resultDesc: data.resultDesc || "Admin resolved - Failed payment marked as success"
          })
        }
      );

      const result = await response.json();
      if (result.success) {
        // Remove from failed payments list
        setFailedPayments(prev => prev.filter(p => p.external_reference !== externalReference));
        // Clear resolution data
        const newData = { ...resolutionData };
        delete newData[externalReference];
        setResolutionData(newData);
        alert("Payment resolved successfully!");
      } else {
        alert("Failed to resolve payment: " + (result.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error resolving payment:", error);
      alert("Error resolving payment");
    } finally {
      setResolvingPayment(null);
    }
  };

  // Calculate real-time stats
  const totalUsers = getAllUsers().length;
  
  const activeBets = bets.filter(b => b.status === "Open").length;
  
  const todayRevenue = getAllTransactions()
    .filter(t => {
      // Check if transaction is from today
      const today = new Date();
      const transDate = new Date(t.date || new Date());
      return t.type === "deposit" && 
             t.status === "completed" &&
             transDate.toDateString() === today.toDateString();
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const stats = [
    { icon: Users, label: "Total Users", value: totalUsers.toLocaleString(), color: "text-primary" },
    { icon: DollarSign, label: "Revenue Today", value: `KSH ${todayRevenue.toLocaleString()}`, color: "text-gold" },
    { icon: BarChart3, label: "Active Bets", value: activeBets.toLocaleString(), color: "text-primary" },
    { icon: Trophy, label: "Games Today", value: games.length.toString(), color: "text-gold" },
  ];

  const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold uppercase tracking-wider text-foreground">
              <Settings className="mr-2 inline h-6 w-6 text-primary" />
              Admin Portal
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage games, users, and withdrawals</p>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="gradient-card rounded-xl border border-border/50 p-5 card-glow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`mt-1 font-display text-2xl font-bold ${s.color}`}>{s.value}</p>
                </div>
                <s.icon className={`h-8 w-8 ${s.color} opacity-30`} />
              </div>
            </div>
          ))}
        </div>

        <Tabs defaultValue="games">
          <TabsList className="mb-6 bg-secondary grid w-full grid-cols-5">
            <TabsTrigger value="games" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Trophy className="mr-1 h-4 w-4" /> Games
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="mr-1 h-4 w-4" /> Users
            </TabsTrigger>
            <TabsTrigger value="transactions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <DollarSign className="mr-1 h-4 w-4" /> Transactions
            </TabsTrigger>
            <TabsTrigger value="bets" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Trophy className="mr-1 h-4 w-4" /> Bets
            </TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <DollarSign className="mr-1 h-4 w-4" /> Payments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="games">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">Manage Games</h3>
              <Button variant="hero" size="sm" onClick={() => setShowAddGame(!showAddGame)}>
                <Plus className="mr-1 h-4 w-4" /> Add Fixture
              </Button>
            </div>

            {showAddGame && (
              <div className="mb-6 animate-fade-up rounded-xl border border-primary/30 bg-card p-6 neon-border">
                <h4 className="mb-2 font-display text-sm font-bold uppercase text-foreground">New Fixture</h4>
                <p className="mb-4 text-xs text-muted-foreground">Enter 1X2 odds and all other markets will be auto-generated. You can edit them after.</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <input className={inputClass} placeholder="League (e.g. Premier League)" value={newGame.league} onChange={(e) => setNewGame({ ...newGame, league: e.target.value })} />
                  <input className={inputClass} placeholder="Match Time" value={newGame.time} onChange={(e) => setNewGame({ ...newGame, time: e.target.value })} />
                  <input className={inputClass} placeholder="Home Team" value={newGame.homeTeam} onChange={(e) => setNewGame({ ...newGame, homeTeam: e.target.value })} />
                  <input className={inputClass} placeholder="Away Team" value={newGame.awayTeam} onChange={(e) => setNewGame({ ...newGame, awayTeam: e.target.value })} />
                  <input className={inputClass} placeholder="Home Odds (1)" value={newGame.homeOdds} onChange={(e) => setNewGame({ ...newGame, homeOdds: e.target.value })} />
                  <input className={inputClass} placeholder="Draw Odds (X)" value={newGame.drawOdds} onChange={(e) => setNewGame({ ...newGame, drawOdds: e.target.value })} />
                  <input className={inputClass} placeholder="Away Odds (2)" value={newGame.awayOdds} onChange={(e) => setNewGame({ ...newGame, awayOdds: e.target.value })} />
                  <select className={inputClass} value={newGame.status} onChange={(e) => setNewGame({ ...newGame, status: e.target.value as "upcoming" | "live" | "finished" })}>
                    <option value="upcoming">Upcoming</option>
                    <option value="live">Live</option>
                    <option value="finished">Finished</option>
                  </select>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="hero" size="sm" onClick={addGameHandler}>
                    <Plus className="mr-1 h-3 w-3" /> Save & Generate Odds
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowAddGame(false)}>Cancel</Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {games.map((game) => (
                <div key={game.id} className="rounded-xl border border-border/50 bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{game.league}</span>
                        <Badge variant={game.status === "live" ? "live" : game.status === "finished" ? "secondary" : "default"} className="text-[10px]">
                          {game.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {game.homeTeam} vs {game.awayTeam}
                      </p>
                      <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                        <span>1: <span className="font-mono font-bold text-primary">{game.homeOdds.toFixed(2)}</span></span>
                        <span>X: <span className="font-mono font-bold text-primary">{game.drawOdds.toFixed(2)}</span></span>
                        <span>2: <span className="font-mono font-bold text-primary">{game.awayOdds.toFixed(2)}</span></span>
                        <span>📅 {game.time}</span>
                      </div>
                      
                      {/* Score Update Section for Live/Finished Games */}
                      {(game.status === "live" || game.status === "finished") && (
                        <div className="mt-4 space-y-3 rounded-lg border border-border/50 bg-background/50 p-3">
                          {/* Live Play Status */}
                          {game.status === "live" && (
                            <div className="grid grid-cols-2 gap-2">
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Minute</p>
                                <p className="text-lg font-bold text-primary">{game.minute ?? 0}'</p>
                                {game.gamePaused && game.minute === 45 && (
                                  <p className="text-xs text-gold font-semibold">HALFTIME</p>
                                )}
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Score</p>
                                <p className="text-lg font-bold">{game.homeScore ?? 0} - {game.awayScore ?? 0}</p>
                              </div>
                            </div>
                          )}

                          {/* Live Play Controls */}
                          <div className="flex flex-wrap gap-2">
                            {game.status === "upcoming" && (
                              <Button
                                size="sm"
                                variant="hero"
                                onClick={() => markGameLive(game.id)}
                                className="text-xs"
                              >
                                Mark Live
                              </Button>
                            )}
                            
                            {game.status === "live" && !game.isKickoffStarted && (
                              <Button
                                size="sm"
                                variant="hero"
                                onClick={() => startKickoff(game.id)}
                                className="text-xs"
                              >
                                <Play className="mr-1 h-3 w-3" /> Kickoff
                              </Button>
                            )}

                            {game.status === "live" && game.isKickoffStarted && !game.gamePaused && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => pauseKickoff(game.id)}
                                className="text-xs"
                              >
                                <Pause className="mr-1 h-3 w-3" /> Pause
                              </Button>
                            )}

                            {game.status === "live" && game.isKickoffStarted && game.gamePaused && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => resumeKickoff(game.id)}
                                className="text-xs"
                              >
                                <Play className="mr-1 h-3 w-3" /> Resume
                              </Button>
                            )}

                            {game.status === "live" && !game.isHalftime && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => markHalftime(game.id)}
                                className="text-xs"
                              >
                                ⏱️ Halftime
                              </Button>
                            )}

                            {game.status === "live" && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => endGame(game.id)}
                                className="text-xs"
                              >
                                <Square className="mr-1 h-3 w-3" /> End Game
                              </Button>
                            )}
                          </div>

                          {/* Score Control */}
                          <div className="flex flex-wrap gap-2">
                            <div className="flex gap-1">
                              <div>
                                <label className="text-xs text-muted-foreground">Home</label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="20"
                                  className="w-16 h-8 px-2"
                                  value={scoreUpdate[game.id]?.home ?? game.homeScore ?? 0}
                                  onChange={(e) => setScoreUpdate({ ...scoreUpdate, [game.id]: { ...(scoreUpdate[game.id] || { home: 0, away: 0 }), home: parseInt(e.target.value) || 0 } })}
                                />
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground">Away</label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="20"
                                  className="w-16 h-8 px-2"
                                  value={scoreUpdate[game.id]?.away ?? game.awayScore ?? 0}
                                  onChange={(e) => setScoreUpdate({ ...scoreUpdate, [game.id]: { ...(scoreUpdate[game.id] || { home: 0, away: 0 }), away: parseInt(e.target.value) || 0 } })}
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const score = scoreUpdate[game.id];
                                  if (score) {
                                    updateLiveScore(game.id, score.home, score.away);
                                  }
                                }}
                                className="text-xs h-8"
                              >
                                Update
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {game.status === "upcoming" && (
                        <Button 
                          variant="hero" 
                          size="sm"
                          onClick={() => markGameLive(game.id)}
                          className="text-xs"
                          title="Mark this match as live"
                        >
                          Mark Live
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => regenerateOdds(game.id)} title="Regenerate all market odds">
                        <RefreshCw className="h-4 w-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => editingGame === game.id ? saveMarkets(game.id) : startEditMarkets(game)} title="Edit market odds">
                        {editingGame === game.id ? <Save className="h-4 w-4 text-primary" /> : <Edit2 className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => removeGameHandler(game.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded market odds editor */}
                  {editingGame === game.id && editMarkets && (
                    <div className="mt-4 border-t border-border pt-4">
                      <p className="mb-3 text-xs font-semibold text-muted-foreground uppercase">Edit All Market Odds</p>
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
                        {(Object.keys(marketLabels) as (keyof typeof marketLabels)[]).map((key) => (
                          <div key={key}>
                            <label className="block text-[10px] text-muted-foreground mb-0.5">{marketLabels[key]}</label>
                            <input
                              type="number"
                              step="0.01"
                              className="w-full rounded border border-border bg-background px-2 py-1 font-mono text-xs text-foreground outline-none focus:border-primary"
                              value={editMarkets[key] || 0}
                              onChange={(e) => setEditMarkets({ ...editMarkets, [key]: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button variant="hero" size="sm" onClick={() => saveMarkets(game.id)}>
                          <Save className="mr-1 h-3 w-3" /> Save Markets
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setEditingGame(null); setEditMarkets(null); }}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  {/* Show current markets summary when not editing */}
                  {editingGame !== game.id && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {["bttsYes", "over25", "doubleChanceHomeOrDraw", "htftHomeHome", "cs10"].map((key) => (
                        <span key={key} className="rounded bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                          {marketLabels[key as keyof typeof marketLabels]}: <span className="font-mono font-bold text-foreground">{(game.markets[key] || 0).toFixed(2)}</span>
                        </span>
                      ))}
                      <span className="text-[10px] text-primary">+{Object.keys(marketLabels).length - 5} more</span>
                    </div>
                  )}
                </div>
              ))}
              {games.length === 0 && (
                <div className="rounded-xl border border-border/50 bg-card p-8 text-center text-muted-foreground">
                  No games added yet. Click "Add Fixture" to get started.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div className="mb-4">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">Manage Users</h3>
            </div>
            <div className="space-y-3">
              {users.map((user) => (
                <Card key={user.id} className="border-border bg-card p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {editingUserId === user.id ? (
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Name</label>
                            <Input
                              value={editingUserData.name || user.name}
                              onChange={(e) => setEditingUserData({ ...editingUserData, name: e.target.value })}
                              className="mt-1 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Email</label>
                            <Input
                              value={editingUserData.email || user.email}
                              onChange={(e) => setEditingUserData({ ...editingUserData, email: e.target.value })}
                              className="mt-1 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Phone</label>
                            <Input
                              value={editingUserData.phone || user.phone}
                              onChange={(e) => setEditingUserData({ ...editingUserData, phone: e.target.value })}
                              className="mt-1 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Password (4 Digits)</label>
                            <Input
                              type="password"
                              inputMode="numeric"
                              maxLength={4}
                              value={editingUserData.password || user.password}
                              onChange={(e) => setEditingUserData({ ...editingUserData, password: e.target.value.replace(/\D/g, "") })}
                              className="mt-1 text-sm"
                            />
                            <p className="mt-1 text-xs text-muted-foreground">Must be 4 digits</p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Account Balance (KSH)</label>
                            <Input
                              type="number"
                              value={editingUserData.accountBalance !== undefined ? editingUserData.accountBalance : user.accountBalance}
                              onChange={(e) => setEditingUserData({ ...editingUserData, accountBalance: parseFloat(e.target.value) || 0 })}
                              className="mt-1 text-sm"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="hero"
                              onClick={async () => {
                                try {
                                  // If balance is being edited, call the backend API
                                  if (editingUserData.accountBalance !== undefined && editingUserData.accountBalance !== user.accountBalance) {
                                    const apiUrl = import.meta.env.VITE_API_URL || 'https://server-tau-puce.vercel.app';
                                    const response = await fetch(`${apiUrl}/api/admin/users/${user.id}/balance`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        phone: loggedInUser.phone,
                                        balance: editingUserData.accountBalance,
                                        reason: 'Admin adjustment'
                                      })
                                    });

                                    const data = await response.json();

                                    if (!data.success) {
                                      alert(`Error: ${data.error || 'Failed to update balance'}`);
                                      return;
                                    }
                                  }

                                  // Update local state
                                  updateUser(user.id, editingUserData);
                                  // If the logged-in user's data was updated, sync it to BetContext and UserContext
                                  if (user.id === loggedInUser.id) {
                                    if (editingUserData.accountBalance !== undefined) {
                                      syncBalance(editingUserData.accountBalance);
                                    }
                                    // Sync all edited fields to UserContext
                                    updateCurrentUser(editingUserData);
                                  }
                                  setEditingUserId(null);
                                  setEditingUserData({});
                                  alert('✅ User data updated successfully!');
                                } catch (error) {
                                  console.error('Error saving user data:', error);
                                  alert('Failed to save user data');
                                }
                              }}
                            >
                              <Save className="mr-1 h-3 w-3" /> Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingUserId(null);
                                setEditingUserData({});
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-foreground">{user.name}</h4>
                            <Badge variant="outline" className="text-[10px]">{user.username}</Badge>
                          </div>
                          <div className="grid gap-2 text-xs text-muted-foreground">
                            <p><strong>Email:</strong> {user.email}</p>
                            <p><strong>Phone:</strong> {user.phone}</p>
                            <p><strong>Password:</strong> <span className="font-mono font-bold text-primary">{user.password}</span></p>
                            <p><strong>Balance:</strong> <span className="text-primary">KSH {user.accountBalance.toLocaleString()}</span></p>
                            <p><strong>Total Bets:</strong> {user.totalBets} | <strong>Winnings:</strong> KSH {user.totalWinnings.toLocaleString()}</p>
                            <p><strong>Verified:</strong> <Badge className={user.verified ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}>{user.verified ? "Yes" : "No"}</Badge></p>
                            <p className="flex items-center gap-2">
                              <strong>Withdrawal:</strong> 
                              {user.withdrawalActivated ? (
                                <Badge className="bg-green-500/20 text-green-500 flex items-center gap-1">
                                  <Unlock className="h-3 w-3" /> Activated
                                </Badge>
                              ) : (
                                <Badge className="bg-yellow-500/20 text-yellow-500 flex items-center gap-1">
                                  <Lock className="h-3 w-3" /> Not Activated
                                </Badge>
                              )}
                            </p>
                          </div>
                          <div className="mt-3 flex gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingUserId(user.id);
                                setEditingUserData(user);
                              }}
                            >
                              <Edit2 className="mr-1 h-3 w-3" /> Edit User
                            </Button>
                            {!user.withdrawalActivated && (
                              <Button
                                size="sm"
                                variant="hero"
                                disabled={activatingUserId === user.id}
                                onClick={() => handleAdminActivateWithdrawal(user.id, user.name)}
                              >
                                {activatingUserId === user.id ? (
                                  <>
                                    <Clock className="mr-1 h-3 w-3 animate-spin" /> Activating...
                                  </>
                                ) : (
                                  <>
                                    <Unlock className="mr-1 h-3 w-3" /> Activate Withdrawal
                                  </>
                                )}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to permanently delete ${user.name}'s account? This cannot be undone.`)) {
                                  handleDeleteUser(user.id, user.name);
                                }
                              }}
                            >
                              <Trash2 className="mr-1 h-3 w-3" /> Delete User
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <div className="mb-4">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">All Transactions</h3>
            </div>
            <div className="space-y-3">
              {getAllTransactions().map((transaction) => (
                <Card key={transaction.id} className="border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className={`rounded-full p-2 ${
                          transaction.type === "deposit"
                            ? "bg-green-500/20"
                            : "bg-blue-500/20"
                        }`}
                      >
                        {transaction.type === "deposit" ? (
                          <ArrowDown className="h-4 w-4 text-green-500" />
                        ) : (
                          <ArrowUp className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {transaction.username} - {transaction.type === "deposit" ? "Deposit" : "Withdrawal"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.date} via {transaction.method}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-bold text-sm ${
                          transaction.type === "deposit"
                            ? "text-green-500"
                            : "text-blue-500"
                        }`}
                      >
                        {transaction.type === "deposit" ? "+" : "-"}KSH {transaction.amount.toLocaleString()}
                      </p>
                      <div className="flex items-center justify-end gap-2 mt-1">
                        {transaction.status === "completed" && (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-xs text-green-500">
                              Completed
                            </span>
                          </>
                        )}
                        {transaction.status === "pending" && (
                          <>
                            <Clock className="h-4 w-4 text-yellow-500" />
                            <span className="text-xs text-yellow-500">
                              Pending
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="ml-2 text-xs h-6 text-green-500 hover:text-green-600"
                              onClick={() => updateTransactionStatus(transaction.id, "completed")}
                            >
                              Approve
                            </Button>
                          </>
                        )}
                        {transaction.status === "failed" && (
                          <>
                            <XCircle className="h-4 w-4 text-red-500" />
                            <span className="text-xs text-red-500">
                              Failed
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="bets" className="space-y-6">
            <div className="mb-4">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">Manage Bets</h3>
              <p className="mt-1 text-xs text-muted-foreground">Settle and manage all player bets - Mark selections individually for multibets</p>
            </div>
            <div className="space-y-3">
              {bets.map((bet) => {
                const betOutcomes = selectionOutcomes[bet.id];
                const wonCount = betOutcomes ? Object.values(betOutcomes).filter(o => o === "won").length : 0;
                const lostCount = betOutcomes ? Object.values(betOutcomes).filter(o => o === "lost").length : 0;
                const totalOutcomes = betOutcomes ? Object.keys(betOutcomes).length : 0;
                
                return (
                  <Card key={bet.id} className="border-border bg-card p-4">
                    <div className="space-y-3">
                      {/* Bet Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-[10px]">#{bet.betId}</Badge>
                            <Badge 
                              variant={bet.status === "Won" ? "default" : bet.status === "Lost" ? "destructive" : "secondary"}
                              className="text-[10px]"
                            >
                              {bet.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{bet.date} {bet.time}</span>
                          </div>
                          <div className="grid gap-2 text-xs mb-2">
                            <p><strong>Stake:</strong> <span className="text-primary">KSH {bet.stake.toLocaleString()}</span></p>
                            <p><strong>Potential Win:</strong> <span className="text-primary">KSH {bet.potentialWin.toLocaleString()}</span></p>
                            <p><strong>Total Odds:</strong> {bet.totalOdds.toFixed(2)} ({bet.selections.length} selections)</p>
                          </div>
                        </div>
                      </div>

                      {/* Individual Selections for Settlement */}
                      {bet.status === "Open" && (
                        <div className="bg-secondary/50 rounded-lg p-3 space-y-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Settle Selections</p>
                          {bet.selections.map((sel, idx) => {
                            const matchGame = games.find(g => g.id === sel.matchId);
                            return (
                              <div key={idx} className="bg-background/50 p-3 rounded space-y-2">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="text-xs font-medium text-foreground">
                                      {idx + 1}. {sel.match} - {sel.type} @ {sel.odds.toFixed(2)}
                                    </p>
                                    {matchGame && (
                                      <div className="mt-1 text-[10px] text-muted-foreground">
                                        <span className="mr-2">Score: {matchGame.homeScore || 0}-{matchGame.awayScore || 0}</span>
                                        <span className="px-1.5 py-0.5 rounded bg-secondary text-xs capitalize">
                                          {matchGame.status === "live" && matchGame.isKickoffStarted ? `LIVE ${matchGame.minute}'` : matchGame.status}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant={betOutcomes?.[idx] === "won" ? "default" : "ghost"}
                                      className={`text-xs h-7 ${betOutcomes?.[idx] === "won" ? "bg-green-500/20 text-green-500" : "bg-transparent"}`}
                                      onClick={() => {
                                        const newOutcomes = { ...selectionOutcomes };
                                        if (!newOutcomes[bet.id]) newOutcomes[bet.id] = {};
                                        newOutcomes[bet.id][idx] = "won";
                                        setSelectionOutcomes(newOutcomes);
                                      }}
                                    >
                                      <CheckCircle className="h-3 w-3" /> Won
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant={betOutcomes?.[idx] === "lost" ? "destructive" : "ghost"}
                                      className={`text-xs h-7 ${betOutcomes?.[idx] === "lost" ? "bg-red-500/20 text-red-500" : "bg-transparent"}`}
                                      onClick={() => {
                                        const newOutcomes = { ...selectionOutcomes };
                                        if (!newOutcomes[bet.id]) newOutcomes[bet.id] = {};
                                        newOutcomes[bet.id][idx] = "lost";
                                        setSelectionOutcomes(newOutcomes);
                                      }}
                                    >
                                      <XCircle className="h-3 w-3" /> Lost
                                    </Button>
                                  </div>
                                </div>
                                {/* Match Status Controls */}
                                {matchGame && matchGame.status === "upcoming" && (
                                  <div className="flex gap-1 text-[10px]">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 text-xs"
                                      onClick={() => startKickoff(matchGame.id)}
                                    >
                                      <Play className="h-2.5 w-2.5 mr-1" /> Start
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 text-xs"
                                      onClick={() => updateGame(matchGame.id, { status: "finished", homeScore: matchGame.homeScore || 0, awayScore: matchGame.awayScore || 0, isKickoffStarted: false })}
                                    >
                                      <Square className="h-2.5 w-2.5 mr-1" /> Finish
                                    </Button>
                                  </div>
                                )}
                                {matchGame && matchGame.status === "live" && (
                                  <div className="flex gap-1 text-[10px]">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 text-xs"
                                      onClick={() => updateGame(matchGame.id, { status: "finished", isKickoffStarted: false })}
                                    >
                                      <Square className="h-2.5 w-2.5 mr-1" /> Finish
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Settlement Summary and Finalize */}
                          {totalOutcomes > 0 && (
                            <div className="border-t border-border pt-2 mt-2">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-muted-foreground">
                                  Progress: {wonCount} Won, {lostCount} Lost, {bet.selections.length - totalOutcomes} Pending
                                </span>
                              </div>
                              {totalOutcomes === bet.selections.length && (
                                <Button
                                  size="sm"
                                  variant="hero"
                                  onClick={() => settleBetBySelections(bet.id)}
                                  className="w-full text-xs"
                                >
                                  <CheckCircle className="mr-1 h-3 w-3" /> Finalize Settlement
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Settled Bet View */}
                      {bet.status !== "Open" && (
                        <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Selections</p>
                          {bet.selections.map((sel, idx) => (
                            <p key={idx} className="text-xs text-muted-foreground">
                              {idx + 1}. {sel.match} - {sel.type} @ {sel.odds.toFixed(2)}
                            </p>
                          ))}
                          <div className="border-t border-border pt-2 mt-2">
                            <Badge variant="secondary" className="text-[10px]">
                              {bet.status === "Won" ? "✓ Settled - Won" : "✗ Settled - Lost"}
                            </Badge>
                          </div>
                        </div>
                      )}

                      {/* Quick Actions */}
                      {bet.status === "Open" && !betOutcomes && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-green-500/10 text-green-500 hover:bg-green-500/20"
                            onClick={() => {
                              updateBetStatus(bet.id, "Won", bet.potentialWin);
                            }}
                          >
                            <CheckCircle className="mr-1 h-3 w-3" /> Quick: Mark All Won
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 bg-red-500/10 text-red-500 hover:bg-red-500/20"
                            onClick={() => {
                              updateBetStatus(bet.id, "Lost", 0);
                            }}
                          >
                            <XCircle className="mr-1 h-3 w-3" /> Quick: Mark All Lost
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
              {bets.length === 0 && (
                <div className="rounded-xl border border-border/50 bg-card p-8 text-center text-muted-foreground">
                  No bets found
                </div>
              )}
            </div>
          </TabsContent>

          {/* Payment Management Tab */}
          <TabsContent value="payments" className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                Failed Payments
              </h3>
              <Button 
                variant="hero" 
                size="sm" 
                onClick={fetchFailedPayments}
                disabled={loadingPayments}
              >
                {loadingPayments ? "Loading..." : "Refresh"}
              </Button>
            </div>

            {failedPayments.length === 0 ? (
              <Card className="border-border bg-card p-8 text-center">
                <p className="text-muted-foreground">
                  {loadingPayments ? "Loading failed payments..." : "No failed payments found"}
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {failedPayments.map((payment) => (
                  <Card key={payment.external_reference} className="border-red-500/30 bg-red-500/5 p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-foreground">
                            KSH {parseFloat(payment.amount).toLocaleString()} - {payment.phone_number}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Ref: {payment.external_reference}
                          </div>
                          <div className="text-xs text-red-500 mt-1">
                            {payment.result_desc || "No callback received within 10 seconds"}
                          </div>
                        </div>
                        <Badge variant="destructive">FAILED</Badge>
                      </div>

                      {/* Resolution Form */}
                      <div className="border-t border-border pt-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="text"
                            placeholder="M-Pesa Receipt (optional)"
                            value={resolutionData[payment.external_reference]?.mpesaReceipt || ""}
                            onChange={(e) =>
                              setResolutionData(prev => ({
                                ...prev,
                                [payment.external_reference]: {
                                  ...prev[payment.external_reference],
                                  mpesaReceipt: e.target.value
                                }
                              }))
                            }
                            className="text-xs"
                            disabled={resolvingPayment === payment.external_reference}
                          />
                          <Input
                            type="text"
                            placeholder="Notes (optional)"
                            value={resolutionData[payment.external_reference]?.resultDesc || ""}
                            onChange={(e) =>
                              setResolutionData(prev => ({
                                ...prev,
                                [payment.external_reference]: {
                                  ...prev[payment.external_reference],
                                  resultDesc: e.target.value
                                }
                              }))
                            }
                            className="text-xs"
                            disabled={resolvingPayment === payment.external_reference}
                          />
                        </div>
                        <Button
                          variant="hero"
                          size="sm"
                          className="w-full"
                          onClick={() => resolveFailedPayment(payment.external_reference)}
                          disabled={resolvingPayment === payment.external_reference}
                        >
                          {resolvingPayment === payment.external_reference ? "Resolving..." : "Mark as Success & Credit"}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPortal;
