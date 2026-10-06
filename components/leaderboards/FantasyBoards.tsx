/**
 * FantasyBoards — the Fantasy section (client), with an embedded Total | PPG toggle.
 *
 * The server sends up to 50 candidates per board (scored by total points). This
 * component re-ranks per mode: Total shows the top 25 by season points; PPG shows
 * the top 25 by points per game, filtered to players with enough games so a
 * one-game fluke can't top the board.
 *
 * Look (§9.3): "D1 · Gold rule" label + the same glass capsule toggle as the
 * Standings header (30px drawn, 44px tap area). The header sticks while the
 * section is in view, on a solid --bg-deep (no backdrop blur — it re-blurred every
 * scroll frame on iPhone).
 */

'use client';

import { useMemo, useState } from 'react';
import type { LeaderBoard, LeaderRow } from '@/lib/leaders';
import LeaderCard from './LeaderCard';
import CardGrid from '@/components/ui/CardGrid';
import { LEADER_GRID } from './grid';

const DISPLAY_COUNT = 25;
type Mode = 'total' | 'ppg';

const MODES: ReadonlyArray<{ id: Mode; label: string }> = [
  { id: 'total', label: 'Total' },
  { id: 'ppg', label: 'PPG' },
];

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
      <div
        className="sticky top-0 z-20 flex items-center gap-2"
        style={{ background: 'var(--bg-deep)', paddingTop: 6, paddingBottom: 6, marginBottom: 4 }}
      >
        <span
          className="whitespace-nowrap"
          style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-bright)' }}
        >
          {label}
        </span>
        <span className="h-px flex-1" style={{ background: 'var(--hairline)' }} />
        <div
          role="group"
          aria-label="Fantasy points"
          className="flex flex-none items-center rounded-full"
          style={{ height: 36, padding: 3, gap: 2, background: 'var(--nav-bg)', border: '1px solid var(--glass-edge)' }}
        >
          {MODES.map(({ id, label: text }) => {
            const on = id === mode;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                onClick={() => setMode(id)}
                // pare-hit44: looks 30px tall, taps like 44px (Apple HIG).
                className="pare-hit44 touch-optimized rounded-full px-3 font-bold active:opacity-70"
                style={{
                  height: 30, fontSize: '11.5px',
                  color: on ? 'var(--gold-bright)' : 'var(--subtext)',
                  background: on ? 'color-mix(in srgb, var(--gold-bright) 8%, transparent)' : 'transparent',
                  boxShadow: on ? 'inset 0 0 0 1.5px var(--gold-bright)' : 'none',
                }}
              >
                {text}
              </button>
            );
          })}
        </div>
      </div>

      <CardGrid {...LEADER_GRID}>
        {view.map((b) => (
          <LeaderCard key={b.key} board={b} />
        ))}
      </CardGrid>
    </section>
  );
}
