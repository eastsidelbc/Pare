'use client';

import React from 'react';

export type GameStatus = 'LIVE' | 'UPCOMING' | 'FINAL';

export interface TeamSide {
  abbr: string;
  score: number | null;
}

export interface Game {
  id: string;
  away: TeamSide;
  home: TeamSide;
  status: GameStatus;
  quarter?: number; // LIVE
  clock?: string;   // LIVE e.g., "04:31"
  spread?: string;  // e.g., "KC -2.5" or "PK"
  total?: string;   // e.g., "46.5"
  kickoffIso?: string; // UPCOMING ISO string
}

export interface ScoreboardRailProps {
  onSelect?: (matchup: { awayAbbr: string; homeAbbr: string }) => void;
  className?: string;
}

const MOCK_GAMES: Game[] = [
  {
    id: '1',
    away: { abbr: 'KC', score: 24 },
    home: { abbr: 'BUF', score: 20 },
    status: 'LIVE',
    quarter: 3,
    clock: '04:31',
    spread: 'KC -2.5',
    total: '46.5',
  },
  {
    id: '2',
    away: { abbr: 'SF', score: 17 },
    home: { abbr: 'SEA', score: 14 },
    status: 'LIVE',
    quarter: 2,
    clock: '08:15',
    spread: 'SF -3',
    total: '44.0',
  },
  {
    id: '3',
    away: { abbr: 'MIN', score: null },
    home: { abbr: 'DET', score: null },
    status: 'UPCOMING',
    kickoffIso: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    spread: 'DET -2.5',
    total: '48.5',
  },
  {
    id: '4',
    away: { abbr: 'DAL', score: 31 },
    home: { abbr: 'NYG', score: 28 },
    status: 'FINAL',
    spread: 'DAL -1.5',
    total: '45.5',
  },
  {
    id: '5',
    away: { abbr: 'BAL', score: null },
    home: { abbr: 'MIA', score: null },
    status: 'UPCOMING',
    kickoffIso: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    spread: 'BAL -1.0',
    total: '50.5',
  },
  {
    id: '6',
    away: { abbr: 'GB', score: 10 },
    home: { abbr: 'CHI', score: 20 },
    status: 'FINAL',
    spread: 'CHI -3.0',
    total: '42.0',
  },
];

function formatRightMeta(game: Game): string {
  const spread = game.spread || '';
  const ou = game.total ? `· O/U ${game.total}` : '';
  return `${spread} ${ou}`.trim();
}

function formatStatusOrKick(game: Game): string {
  if (game.status === 'LIVE') {
    const q = game.quarter ? `Q${game.quarter}` : '';
    return `${q} ${game.clock || ''}`.trim();
  }
  if (game.status === 'FINAL') return 'Final';
  // UPCOMING → local time like "3:25 PM"
  if (game.kickoffIso) {
    try {
      const d = new Date(game.kickoffIso);
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return 'TBD';
    }
  }
  return 'TBD';
}

export default function ScoreboardRail({ onSelect, className = '' }: ScoreboardRailProps) {
  const live = React.useMemo(() => MOCK_GAMES.filter(g => g.status === 'LIVE'), []);
  const upcoming = React.useMemo(
    () => MOCK_GAMES.filter(g => g.status === 'UPCOMING').sort((a, b) => {
      const at = a.kickoffIso ? new Date(a.kickoffIso).getTime() : 0;
      const bt = b.kickoffIso ? new Date(b.kickoffIso).getTime() : 0;
      return at - bt;
    }),
    []
  );
  const final = React.useMemo(() => MOCK_GAMES.filter(g => g.status === 'FINAL'), []);

  const Section: React.FC<{ title: string; games: Game[] }> = ({ title, games }) => (
    <div className="mb-3">
      <div className="px-3 py-1 text-xs tracking-wider text-slate-400/90 uppercase">{title}</div>
      <div className="divide-y divide-slate-800/60">
        {games.map((game) => (
          <button
            key={game.id}
            onClick={() => onSelect?.({ awayAbbr: game.away.abbr, homeAbbr: game.home.abbr })}
            className="w-full text-left px-3 py-2 hover:bg-slate-800/50 focus:outline-none focus-ring"
          >
            {/* Line 1 */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[13px] font-medium text-slate-200">{game.away.abbr}</span>
                <span className="text-[14px] font-semibold text-white font-mono">{game.away.score ?? '\u2013'}</span>
              </div>
              <div className="text-[12px] text-slate-400 font-mono">
                {formatRightMeta(game)}
              </div>
            </div>
            {/* Line 2 */}
            <div className="flex items-center justify-between gap-3 mt-0.5">
              <div className="flex items-baseline gap-2">
                <span className="text-[13px] font-medium text-slate-200">{game.home.abbr}</span>
                <span className="text-[14px] font-semibold text-white font-mono">{game.home.score ?? '\u2013'}</span>
              </div>
              <div className="text-[12px] text-slate-400">
                {formatStatusOrKick(game)}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <aside className={`w-full ${className}`} aria-label="Scoreboard Rail">
      <div className="text-slate-300 text-sm px-3 py-2 border-b border-slate-800/60">LIVE GAMES</div>
      <div className="py-2 text-slate-200">
        <Section title="Live" games={live} />
        <Section title="Upcoming" games={upcoming} />
        <Section title="Final" games={final} />
      </div>
    </aside>
  );
}


