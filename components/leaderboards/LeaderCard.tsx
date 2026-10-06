/**
 * LeaderCard — one leaderboard card (client), design-system §9.3 "Standings match".
 *
 * Same shell as a Standings division card (deep gradient, hairline border, white
 * small-caps title) with a tight 32px row: rank · team abbr · name · value.
 * Shows the top 5; tap anywhere on the card to show all (up to 25) and tap again
 * to collapse. No logos, no headshots, no motion — calm on a dense screen.
 *
 * Client component for the expand toggle; types are imported type-only, so the
 * `server-only` `lib/leaders` module never enters this bundle.
 */

'use client';

import { useState, type CSSProperties, type KeyboardEvent } from 'react';
import { ChevronDown } from 'lucide-react';
import type { LeaderBoard, LeaderRow } from '@/lib/leaders';
import { TeamAbbr } from '@/components/standings/StandingsRow';

const PREVIEW_COUNT = 5;
const ROW_H = 32;

/**
 * Row grid (Kobe's tight spacing): rank 12px · team 28px · name · value.
 * Left padding equals the column gap and the rank is centered, so every rank number
 * sits evenly between the card edge and the team abbreviation (1 or 2 digits).
 * The team column is a fixed width so names line up down the card.
 */
const ROW_STYLE: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '12px 28px minmax(0, 1fr) auto',
  alignItems: 'center',
  columnGap: 3,
  height: ROW_H,
  padding: '0 10px 0 3px',
  borderTop: '1px solid var(--hairline)',
};

export default function LeaderCard({ board }: { board: LeaderBoard }) {
  const [expanded, setExpanded] = useState(false);

  const all = board.leaders;
  const hasMore = all.length > PREVIEW_COUNT;
  const shown = expanded ? all : all.slice(0, PREVIEW_COUNT);

  // Competition ranking: tied values share a number and the next value skips —
  // e.g. 1, 1, 3, 4, 5, 5, 7. Aligned to `all`.
  const ranks = all.map((r) => 1 + all.reduce((n, x) => (x.value > r.value ? n + 1 : n), 0));

  const toggle = () => setExpanded((v) => !v);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <div
      className="min-w-0 overflow-hidden"
      // The whole card is the toggle when there are more than 5 rows.
      onClick={hasMore ? toggle : undefined}
      onKeyDown={hasMore ? onKey : undefined}
      role={hasMore ? 'button' : undefined}
      tabIndex={hasMore ? 0 : undefined}
      aria-expanded={hasMore ? expanded : undefined}
      aria-label={hasMore ? `${board.label}, ${expanded ? 'show top 5' : `show all ${all.length}`}` : undefined}
      style={{
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--hairline)',
        background: 'linear-gradient(90deg, var(--card-deep-a), var(--card-deep-mid) 50%, var(--card-deep-b))',
        cursor: hasMore ? 'pointer' : 'default',
      }}
    >
      <h3
        className="truncate"
        style={{
          padding: '10px 10px 8px',
          fontSize: '10px', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text)',
        }}
      >
        {board.label}
      </h3>

      {all.length === 0 ? (
        <div style={{ ...ROW_STYLE, display: 'flex', justifyContent: 'center', fontSize: '12px', color: 'var(--subtext)' }}>
          No data
        </div>
      ) : (
        shown.map((row, i) => <Row key={row.athleteId || i} row={row} rank={ranks[i]} />)
      )}

      {hasMore && (
        <div
          className="flex items-center justify-center gap-1"
          style={{
            height: ROW_H, borderTop: '1px solid var(--hairline)',
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--subtext)',
          }}
        >
          {expanded ? 'Show less' : `Show all ${all.length}`}
          <ChevronDown size={12} aria-hidden style={{ transform: expanded ? 'rotate(180deg)' : 'none' }} />
        </div>
      )}
    </div>
  );
}

function Row({ row, rank }: { row: LeaderRow; rank: number }) {
  return (
    <div style={{ ...ROW_STYLE, background: rank === 1 ? 'var(--leader-tint)' : 'transparent' }}>
      <span className="text-center tabular-nums" style={{ fontSize: '10px', fontWeight: 700, color: 'var(--subtext)' }}>
        {rank}
      </span>
      <TeamAbbr abbr={row.teamAbbr} size={12} />
      <span className="truncate" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
        {row.name}
      </span>
      <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text)' }}>
        {row.displayValue}
      </span>
    </div>
  );
}
