'use client';

import React from 'react';
import TeamLogo from './TeamLogo';
import { abbrToName } from '@/utils/teamAbbr';
import type { ScoreboardGame } from '@/types/matchup';
import { useScoreboardMock } from '@/lib/hooks/useScoreboardMock';
import { formatKickoffChicago } from '@/utils/time';
import { formatHomeSpread, formatTotal } from '@/utils/odds';

export interface ScoreboardRailProps {
  onSelect?: (game: ScoreboardGame) => void;
  className?: string;
}

function formatRightMeta(game: ScoreboardGame): string {
  const left = formatHomeSpread(game.home.abbr, game.spread);
  const ou = formatTotal(game.total);
  return `${left} · O/U ${ou}`;
}

function formatStatusOrKick(game: ScoreboardGame): string {
  if (game.status === 'LIVE') {
    return `${game.quarter || ''} ${game.clock || ''}`.trim();
  }
  if (game.status === 'FINAL') return 'Final';
  return formatKickoffChicago(game.kickoffIso);
}

export default function ScoreboardRail({ onSelect, className = '' }: ScoreboardRailProps) {
  const { games, showSkeleton } = useScoreboardMock(5000);

  const live = React.useMemo(() => (games || []).filter(g => g.status === 'LIVE'), [games]);
  const upcoming = React.useMemo(
    () => (games || []).filter(g => g.status === 'UPCOMING').sort((a, b) => {
      const at = a.kickoffIso ? new Date(a.kickoffIso).getTime() : 0;
      const bt = b.kickoffIso ? new Date(b.kickoffIso).getTime() : 0;
      return at - bt;
    }),
    [games]
  );
  const final = React.useMemo(() => (games || []).filter(g => g.status === 'FINAL'), [games]);

  const Section: React.FC<{ title: string; games: ScoreboardGame[] }> = ({ title, games }) => (
    <div className="mb-3">
      <div className="px-3 py-1 text-xs tracking-wider text-slate-400/90 uppercase">{title}</div>
      <div className="divide-y divide-slate-800/60">
        {games.map((game) => (
          <button
            key={game.gameId}
            onClick={() => onSelect?.(game)}
            className="w-full text-left px-3 py-2 hover:bg-slate-800/50 focus:outline-none focus-ring"
          >
            {/* Line 1 */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <TeamLogo teamName={abbrToName(game.away.abbr) || game.away.abbr} size="24" />
                <span className="text-[13px] font-medium text-slate-200">{game.away.abbr}</span>
                <span className="text-[14px] font-semibold text-white font-mono">{game.away.score ?? '\u2013'}</span>
              </div>
              <div className="text-[12px] text-slate-400 font-mono">
                {formatRightMeta(game)}
              </div>
            </div>
            {/* Line 2 */}
            <div className="flex items-center justify-between gap-3 mt-0.5">
              <div className="flex items-center gap-2">
                <TeamLogo teamName={abbrToName(game.home.abbr) || game.home.abbr} size="24" />
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


