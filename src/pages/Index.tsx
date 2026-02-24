import { useState } from "react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-stadium.svg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MatchCard, type Match, generateMarketOdds } from "@/components/MatchCard";
import { BettingSlip, type BetSlipItem } from "@/components/BettingSlip";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { PromoBanner } from "@/components/PromoBanner";
import { Zap, TrendingUp, Trophy, Star, LogIn, UserPlus } from "lucide-react";
import { useBetAutoCalculation } from "@/hooks/useBetAutoCalculation";
import { useOdds } from "@/context/OddsContext";
import { useUser } from "@/context/UserContext";

const getMarketFromType = (type: string): string => {
  if (['home', 'draw', 'away'].includes(type)) return '1X2';
  if (type.startsWith('btts')) return 'BTTS';
  if (['over15', 'under15', 'over25', 'under25'].includes(type)) return 'O/U';
  if (type.startsWith('dc')) return 'DC';
  if (type.startsWith('htft')) return 'HT/FT';
  if (type.startsWith('cs')) return 'CS';
  return '1X2';
};

const Index = () => {
  const [betSlip, setBetSlip] = useState<BetSlipItem[]>([]);
  const [selectedOdds, setSelectedOdds] = useState<Record<string, string>>({});
  const { games: apiGames } = useOdds();;
  const { isLoggedIn } = useUser();

  // Enable auto bet calculation
  useBetAutoCalculation();

  // Hardcode Northern Storm game
  const northernStormGame = {
    id: 'northern-storm-rampage-fc',
    league: 'Football',
    homeTeam: 'Northern Storm',
    awayTeam: 'Rampage Fc',
    homeOdds: 2.80,
    drawOdds: 3.58,
    awayOdds: 3.63,
    time: '2026-02-23T23:00:00Z',
    markets: generateMarketOdds(2.80, 3.58, 3.63),
  };

  // Combine hardcoded game with API games, but filter out finished games
  const games = [northernStormGame, ...apiGames].filter(
    (game) => game.status !== "finished"
  );

  const handleSelectOdd = (matchId: string, type: string, odds: number, match: Match) => {
    const key = `${matchId}-${type}`;
    if (selectedOdds[matchId] === key) {
      setSelectedOdds((prev) => { const next = { ...prev }; delete next[matchId]; return next; });
      setBetSlip((prev) => prev.filter((i) => i.matchId !== matchId));
    } else {
      setSelectedOdds((prev) => ({ ...prev, [matchId]: key }));
      const market = getMarketFromType(type);
      setBetSlip((prev) => [
        ...prev.filter((i) => i.matchId !== matchId),
        { matchId, match: `${match.homeTeam} vs ${match.awayTeam}`, type, market, odds },
      ]);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-secondary to-background">
        <div className="absolute inset-0">
          <img src={heroImage} alt="Stadium" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>
        <div className="container relative z-10 mx-auto px-4 py-20 md:py-32">
          <div className="max-w-2xl">
            <Badge variant="gold" className="mb-4">
              <Trophy className="mr-1 h-3 w-3" /> #1 Sportsbook Platform
            </Badge>
            <h1 className="mb-4 font-display text-4xl font-bold uppercase leading-tight tracking-wider text-foreground md:text-6xl">
              Bet <span className="text-glow text-primary">Smarter</span>,<br />
              Win <span className="text-glow text-primary">Bigger</span>
            </h1>
            <p className="mb-8 max-w-lg text-lg text-muted-foreground">
              Experience the thrill of live sports betting with the best odds, instant payouts, and real-time match tracking.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="hero" size="lg">
                <Zap className="mr-1 h-4 w-4" /> Start Betting
              </Button>
              {!isLoggedIn && (
                <>
                  <Link to="/login">
                    <Button variant="glow" size="lg">
                      <LogIn className="mr-1 h-4 w-4" /> Login
                    </Button>
                  </Link>
                  <Link to="/signup">
                    <Button variant="outline" size="lg">
                      <UserPlus className="mr-1 h-4 w-4" /> Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>
            <div className="mt-8 flex gap-6">
              {[
                { label: "Active Users", value: "6M+" },
                { label: "Bets Placed", value: "14M+" },
                { label: "Payout Rate", value: "98.5%" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="font-display text-xl font-bold text-primary">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <PromoBanner />

      {/* Matches */}
      <section className="container mx-auto px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold uppercase tracking-wider text-foreground">
            <TrendingUp className="mr-2 inline h-5 w-5 text-primary" />
            Matches
          </h2>
          <Button variant="ghost" size="sm" className="text-xs text-primary">View All →</Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {games.length > 0 ? (
            games.map((game) => {
              const match: Match = {
                id: game.id,
                league: game.league,
                homeTeam: game.homeTeam,
                awayTeam: game.awayTeam,
                homeOdds: game.homeOdds,
                drawOdds: game.drawOdds,
                awayOdds: game.awayOdds,
                time: game.time,
                markets: game.markets,
              };
              return (
                <MatchCard
                  key={game.id}
                  match={match}
                  onSelectOdd={(id, type, odds) => handleSelectOdd(id, type, odds, match)}
                  selectedOdd={selectedOdds[game.id] || null}
                />
              );
            })
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No matches available. Check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="mb-10 text-center font-display text-2xl font-bold uppercase tracking-wider text-foreground">
          Why <span className="text-primary">BetNexa</span>?
        </h2>
        <div className="grid gap-6 md:grid-cols-4">
          {[
            { icon: Zap, title: "Instant Payouts", desc: "Withdraw your winnings instantly to your wallet." },
            { icon: TrendingUp, title: "Best Odds", desc: "Industry-leading odds on all major sports." },
            { icon: Star, title: "VIP Program", desc: "Exclusive rewards and bonuses for loyal players." },
            { icon: Trophy, title: "Live Betting", desc: "Bet on matches in real-time with live updates." },
          ].map((f) => (
            <div key={f.title} className="gradient-card rounded-xl border border-border/50 p-6 text-center card-glow transition-transform hover:scale-105">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-foreground">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />

      <BettingSlip
        items={betSlip}
        onRemove={(id) => {
          setBetSlip((prev) => prev.filter((i) => i.matchId !== id));
          setSelectedOdds((prev) => { const next = { ...prev }; delete next[id]; return next; });
        }}
        onClear={() => { setBetSlip([]); setSelectedOdds({}); }}
      />

      <BottomNav />
    </div>
  );
};

export default Index;
