const liveGames = [
  { teams: "Man Utd 1-2 Liverpool", minute: "67'" },
  { teams: "Real Madrid 0-0 Barcelona", minute: "23'" },
  { teams: "AC Milan 3-1 Juventus", minute: "81'" },
  { teams: "Bayern 2-1 Dortmund", minute: "45'" },
  { teams: "PSG 1-0 Lyon", minute: "55'" },
];

export function LiveMatchTicker() {
  return (
    <div className="overflow-hidden border-b border-border bg-card/50">
      <div className="flex animate-[scroll_30s_linear_infinite] items-center gap-8 whitespace-nowrap py-2">
        {[...liveGames, ...liveGames].map((game, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-live pulse-live" />
            <span className="font-medium text-foreground">{game.teams}</span>
            <span className="text-muted-foreground">{game.minute}</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
