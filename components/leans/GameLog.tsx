/**
 * GameLog — the player screen's season game log (Wave C1), newest first, with a
 * Stats | Usage toggle (prop research v3, 2026-10-23 — ten columns don't fit 393px):
 *
 *   Stats  W · Opp · Rush · Rec · Rec yd · TD
 *   Usage  W · Opp · Tgt · Car · Share · Snap · aDOT · RZ
 *
 * Share = his share of team targets (WR / TE) or touches (RB / QB); RZ = red-zone targets +
 * carries. Share needs the bundle's prop tables for the team totals (else "—").
 */

'use client';

import { useState } from 'react';
import { LIST_CARD } from '@/components/myteam/style';
import { TeamAbbr } from '@/components/standings/StandingsRow';
import { pct } from '@/lib/leans/format';
import { playerWeeks } from '@/lib/leans/history';
import type { PropTables } from '@/lib/leans/tables';
import type { LeansPlayer } from '@/lib/leans/types';
import { LABEL9 } from './ui';
import ViewToggle from './ViewToggle';

type View = 'stats' | 'usage';
const VIEWS: ReadonlyArray<{ id: View; label: string }> = [
  { id: 'stats', label: 'Stats' },
  { id: 'usage', label: 'Usage' },
];
const COLS: Readonly<Record<View, string>> = {
  stats: '34px minmax(0,1fr) repeat(4, minmax(0,.9fr))',
  usage: '28px minmax(0,1fr) repeat(6, minmax(0,.8fr))',
};
const HEAD: Readonly<Record<View, readonly string[]>> = {
  stats: ['W', 'Opp', 'Rush', 'Rec', 'Rec yd', 'TD'],
  usage: ['W', 'Opp', 'Tgt', 'Car', 'Share', 'Snap', 'aDOT', 'RZ'],
};

const dash = (v: number | null, f: (n: number) => string) => (v === null ? '—' : f(v));

export interface GameLogProps {
  games: LeansPlayer['games'];
  position?: LeansPlayer['position'];
  tables?: PropTables | null;
  /** Start on this view (tests). */
  initialView?: View;
}

export default function GameLog({ games, position = 'RB', tables = null, initialView = 'stats' }: GameLogProps) {
  const [view, setView] = useState<View>(initialView);
  if (games.length === 0) return null;
  const rows = playerWeeks(games, position, tables, 'rush_yd', null);
  const byWeek = new Map(games.map((g) => [g.week, g] as const));
  const cell = { fontSize: 12, fontWeight: 700, color: 'var(--text)', textAlign: 'center' as const };
  return (
    <section data-gamelog aria-label="Season game log" className="flex flex-col" style={{ ...LIST_CARD, padding: '10px 12px', gap: 6 }}>
      <div className="flex items-center justify-between" style={{ gap: 8 }}>
        <div style={LABEL9}>Season game log</div>
        <ViewToggle id="leans-gamelog" label="Game log columns" options={VIEWS} value={view} onChange={setView} />
      </div>
      <div role="table" aria-label="Season game log" data-view={view}>
        <div role="row" className="grid items-center" style={{ gridTemplateColumns: COLS[view], height: 22, borderBottom: '1px solid var(--hairline)', ...LABEL9 }}>
          {HEAD[view].map((h, i) => (
            <span key={h} role="columnheader" style={{ textAlign: i < 2 ? 'left' : 'center' }}>
              {h}
            </span>
          ))}
        </div>
        {rows.map((r, i) => {
          const g = byWeek.get(r.week);
          if (!g) return null;
          return (
            <div key={r.week} role="row" className="grid items-center tabular-nums" style={{ gridTemplateColumns: COLS[view], height: 32, borderTop: i > 0 ? '1px solid var(--hairline)' : 'none' }}>
              <span role="cell" style={{ ...cell, textAlign: 'left', color: 'var(--subtext)' }}>{r.week}</span>
              <span role="cell" style={{ textAlign: 'left' }}>
                <TeamAbbr abbr={r.opp} size={12} />
              </span>
              {view === 'stats' ? (
                <>
                  <span role="cell" style={cell}>{g.rush_yd}</span>
                  <span role="cell" style={cell}>{g.rec}</span>
                  <span role="cell" style={cell}>{g.rec_yd}</span>
                  <span role="cell" style={{ ...cell, color: r.td > 0 ? 'var(--text)' : 'var(--muted)' }}>{r.td}</span>
                </>
              ) : (
                <>
                  <span role="cell" style={cell}>{r.tgt}</span>
                  <span role="cell" style={cell}>{r.att}</span>
                  <span role="cell" style={cell}>{dash(r.share, pct)}</span>
                  <span role="cell" style={cell}>{dash(r.snapPct, pct)}</span>
                  <span role="cell" style={cell}>{dash(r.adot, (n) => n.toFixed(1))}</span>
                  <span role="cell" style={{ ...cell, color: r.rz > 0 ? 'var(--text)' : 'var(--muted)' }}>{r.rz}</span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
