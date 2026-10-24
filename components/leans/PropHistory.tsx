/**
 * PropHistory — week by week under the prop's matchup data (prop research v3, 2026-10-23;
 * Kobe: "history like week 5 and week 6 and going on"). One table, two views:
 *
 *   His weeks   W · Opp · <stat> (● over / ○ under tonight's line) · Tgt or Car · Share · Snap · aDOT or RZ
 *   <OPP> weeks W · Faced · <stat> allowed to his position · his role's player that week
 *
 * Newest first. The dot uses the hit-dot meaning (green = cleared tonight's line on the side
 * shown); the number is always written next to it.
 */

'use client';

import { useState } from 'react';
import { TeamAbbr } from '@/components/standings/StandingsRow';
import { pct, PROP_STAT_SHORT } from '@/lib/leans/format';
import type { DefenseWeek, PlayerWeek } from '@/lib/leans/history';
import type { PropPosition, PropSide, PropStat, Role } from '@/lib/leans/types';
import { shortPlayerName } from '@/lib/playerName';
import { LABEL9, WHY_BOX } from './ui';
import ViewToggle from './ViewToggle';

type View = 'his' | 'def';

const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const dash = (v: number | null, f: (n: number) => string) => (v === null ? '—' : f(v));

function Dot({ hit }: { hit: boolean }) {
  return (
    <span
      aria-hidden
      className="inline-block flex-none rounded-full"
      style={{
        width: 8,
        height: 8,
        boxSizing: 'border-box',
        ...(hit ? { background: 'var(--green)' } : { border: '1.5px solid var(--muted)' }),
      }}
    />
  );
}

const HEAD_STYLE = { ...LABEL9, height: 24, padding: '0 10px', borderBottom: '1px solid var(--hairline)' } as const;
const ROW_STYLE = (i: number) => ({ height: 32, padding: '0 10px', borderTop: i > 0 ? '1px solid var(--hairline)' : 'none' }) as const;
const CELL = { fontSize: 12, fontWeight: 700, color: 'var(--text)', textAlign: 'center' as const };

export interface PropHistoryProps {
  his: readonly PlayerWeek[];
  defense: readonly DefenseWeek[];
  name: string;
  opp: string;
  position: PropPosition;
  stat: PropStat;
  side: PropSide;
  role: Role | null;
  /** Start on this view (tests). */
  initialView?: View;
}

export default function PropHistory({ his, defense, name, opp, position, stat, side, role, initialView = 'his' }: PropHistoryProps) {
  const [view, setView] = useState<View>(initialView);
  if (his.length === 0 && defense.length === 0) return null;
  const rushing = stat === 'rush_yd' || stat === 'rush_rec_yd';
  const word = PROP_STAT_SHORT[stat];
  const hitOf = (over: boolean | null) => (over === null ? false : side === 'over' ? over : !over);
  const first = name.split(/\s+/)[0] ?? name;
  const options = [
    { id: 'his' as const, label: `${first}` },
    { id: 'def' as const, label: opp },
  ];
  const hisCols = '28px minmax(0,1fr) minmax(0,1.3fr) repeat(4, minmax(0,.8fr))';
  const defCols = '28px minmax(0,.9fr) minmax(0,1fr) minmax(0,2fr)';
  return (
    <section data-prop-history aria-label="Week by week" className="flex flex-col" style={{ gap: 6 }}>
      <div className="flex items-center justify-between" style={{ gap: 8 }}>
        <div style={LABEL9}>Week by week</div>
        <ViewToggle id="leans-prop-history" label="Whose weeks" options={options} value={view} onChange={setView} />
      </div>
      {view === 'his' ? (
        <div role="table" aria-label={`${name} week by week`} data-view="his" style={WHY_BOX}>
          <div role="row" className="grid items-center" style={{ gridTemplateColumns: hisCols, ...HEAD_STYLE }}>
            {['W', 'Opp', word, rushing ? 'Car' : 'Tgt', 'Share', 'Snap', rushing ? 'RZ' : 'aDOT'].map((h, i) => (
              <span key={h} role="columnheader" style={{ textAlign: i < 2 ? 'left' : 'center' }}>
                {h}
              </span>
            ))}
          </div>
          {his.map((w, i) => (
            <div key={w.week} role="row" data-hit={hitOf(w.over) ? 'yes' : 'no'} className="grid items-center tabular-nums" style={{ gridTemplateColumns: hisCols, ...ROW_STYLE(i) }}>
              <span role="cell" style={{ ...CELL, textAlign: 'left', color: 'var(--subtext)' }}>{w.week}</span>
              <span role="cell" style={{ textAlign: 'left' }}>
                <TeamAbbr abbr={w.opp} size={12} />
              </span>
              <span role="cell" className="flex items-center justify-center" style={{ ...CELL, gap: 5 }}>
                <Dot hit={hitOf(w.over)} />
                {num(w.value)}
              </span>
              <span role="cell" style={CELL}>{rushing ? w.att : w.tgt}</span>
              <span role="cell" style={CELL}>{dash(w.share, pct)}</span>
              <span role="cell" style={CELL}>{dash(w.snapPct, pct)}</span>
              <span role="cell" style={CELL}>{rushing ? w.rz : dash(w.adot, (n) => n.toFixed(1))}</span>
            </div>
          ))}
        </div>
      ) : (
        <div role="table" aria-label={`${opp} week by week`} data-view="def" style={WHY_BOX}>
          <div role="row" className="grid items-center" style={{ gridTemplateColumns: defCols, ...HEAD_STYLE }}>
            {['W', 'Faced', `to ${position}s`, role ? `${role} that week` : 'His role'].map((h, i) => (
              <span key={h} role="columnheader" style={{ textAlign: i < 2 ? 'left' : 'center' }}>
                {h}
              </span>
            ))}
          </div>
          {defense.map((w, i) => (
            <div key={w.week} role="row" className="grid items-center tabular-nums" style={{ gridTemplateColumns: defCols, ...ROW_STYLE(i) }}>
              <span role="cell" style={{ ...CELL, textAlign: 'left', color: 'var(--subtext)' }}>{w.week}</span>
              <span role="cell" style={{ textAlign: 'left' }}>
                <TeamAbbr abbr={w.faced} size={12} />
              </span>
              <span role="cell" style={CELL}>{num(w.allowed)}</span>
              <span role="cell" className="flex min-w-0 items-center justify-center" style={{ ...CELL, gap: 5 }}>
                {w.role ? (
                  <>
                    <Dot hit={hitOf(w.role.over)} />
                    <span>{num(w.role.value)}</span>
                    <span className="truncate" style={{ fontWeight: 600, color: 'var(--subtext)' }}>
                      {w.role.name ? shortPlayerName(w.role.name) : ''}
                    </span>
                  </>
                ) : (
                  <span style={{ color: 'var(--muted)' }}>—</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
