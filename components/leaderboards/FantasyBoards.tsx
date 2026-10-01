/**
 * FantasyBoards — the Fantasy section (client), with an embedded Total | PPG toggle.
 *
 * The server sends up to 50 candidates per board (scored by total points). This
 * component re-ranks per mode: Total shows the top 25 by season points; PPG shows
 * the top 25 by points per game, filtered to players with enough games so a
 * one-game fluke can't top the board. Rank/label styling matches the other
 * sections; the toggle mirrors the compare panel's PG|TOT control.
 */

'use client';

import { useMemo, useState } from 'react';
import type { LeaderBoard, LeaderRow } from '@/lib/leaders';
import LeaderCard from './LeaderCard';
import CardGrid from '@/components/ui/CardGrid';

const DISPLAY_COUNT = 25;
type Mode = 'total' | 'ppg';

export default function FantasyBoards({ boards, label }: { boards: LeaderBoard[]; label: string }) {
  const [mode, setMode] = useState<Mode>('total');

  // Min games for PPG — half the deepest player's game count (rounded up), so a
  // single big game can't crown someone. Early season this is naturally small.
  const minGames = useMemo(() => {
    let max = 0;
    for (const b of boards) for (const r of b.leaders) max = Math.max(max, r.games ?? 0);
    return Math.max(1, Math.ceil(max / 2));
  }, [boards]);

  const view = useMemo<LeaderBoard[]>(() => {
    return boards.map((b) => {
      const rows: LeaderRow[] = b.leaders
        .filter((r) => (mode === 'ppg' ? (r.games ?? 0) >= minGames : true))
        .map((r) => {
          const v = mode === 'ppg' ? r.perGame ?? 0 : r.value;
          return { ...r, value: v, displayValue: v.toFixed(1) };
        })
        .sort((a, z) => z.value - a.value)
        .slice(0, DISPLAY_COUNT);
      return { ...b, leaders: rows };
    });
  }, [boards, mode, minGames]);

  return (
    <section>
      {/* Section header — label + embedded Total | PPG toggle.
          Sticks to the top of the scroll area while the fantasy section is in
          view (so the toggle is always reachable), then releases into the stat
          sections. Glass blur so cards slide under it cleanly. */}
      <div
        className="sticky top-0 z-20 mb-3 flex items-center gap-3"
        style={{
          background: 'color-mix(in srgb, var(--bg) 86%, transparent)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          paddingTop: 8,
          paddingBottom: 8,
        }}
      >
        <span
          className="font-black tracking-tight"
          style={{ fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--gold)' }}
        >
          {label}
        </span>
        <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
        <div
          className="flex items-center"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 3 }}
        >
          {(['total', 'ppg'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className="touch-optimized px-2.5 py-1 active:opacity-70"
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                borderRadius: 6,
                background: mode === m ? 'rgba(212,168,67,0.15)' : 'transparent',
                color: mode === m ? 'var(--gold)' : 'var(--muted)',
                transition: 'color .15s, background .15s',
              }}
            >
              {m === 'total' ? 'Total' : 'PPG'}
            </button>
          ))}
        </div>
      </div>

      <CardGrid minCard={200} maxCard={300} maxCols={5}>
        {view.map((b) => (
          <LeaderCard key={b.key} board={b} />
        ))}
      </CardGrid>
    </section>
  );
}
