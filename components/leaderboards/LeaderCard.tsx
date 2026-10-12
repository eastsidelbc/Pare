/**
 * LeaderCard — one leaderboard card (client), design-system §9.3 (R3 "edge-to-edge").
 *
 * Same shell as a Standings division card (deep gradient, hairline border, white
 * small-caps title) with a tight 32px row: rank · team abbr · short name · value.
 * Shows the top 5; a tap anywhere on the card (or the 44px footer button) shows all
 * (up to 25) and back. The card keeps its width and only grows down. The team
 * cell is an 18px logo or the abbr per config/teamIdentity.ts ('leaders' surface).
 * No headshots, no motion — calm on a dense screen.
 *
 * Client component for the expand toggle; types are imported type-only, so the
 * `server-only` `lib/leaders` module never enters this bundle.
 */

'use client';

import { useRef, useState, type CSSProperties } from 'react';
import { ChevronDown } from 'lucide-react';
import type { LeaderBoard, LeaderRow } from '@/lib/leaders';
import { TeamAbbr } from '@/components/standings/StandingsRow';
import TeamIdentity from '@/components/ui/TeamIdentity';
import { shortPlayerName } from '@/lib/playerName';
import { normalizeTeamAbbr } from '@/lib/teams';

const PREVIEW_COUNT = 5;
const ROW_H = 32;

/**
 * Row grid (R3 "edge-to-edge", §9.3): rank 14px · team 30px · name · value.
 * Rank is right-aligned so 1–25 line up against the team column; the team column is a
 * fixed width so names start at the same spot down the card. Tight edge padding
 * (3px left, 6px right) puts the numbers near both card edges and gives the name room.
 */
const ROW_STYLE: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '14px 30px minmax(0, 1fr) auto',
  alignItems: 'center',
  columnGap: 4,
  height: ROW_H,
  padding: '0 6px 0 3px',
  borderTop: '1px solid var(--hairline)',
};

export default function LeaderCard({ board }: { board: LeaderBoard }) {
  const [expanded, setExpanded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const all = board.leaders;
  const hasMore = all.length > PREVIEW_COUNT;
  const shown = expanded ? all : all.slice(0, PREVIEW_COUNT);

  // Competition ranking: tied values share a number and the next value skips —
  // e.g. 1, 1, 3, 4, 5, 5, 7. Aligned to `all`.
  const ranks = all.map((r) => 1 + all.reduce((n, x) => (x.value > r.value ? n + 1 : n), 0));

  // On collapse the card shrinks by up to 20 rows; if its top has scrolled out of
  // view, bring it back so you land on the card you closed. Never scroll on expand.
  const toggle = () => {
    const collapsing = expanded;
    setExpanded(!expanded);
    if (!collapsing) return;
    requestAnimationFrame(() => {
      const el = cardRef.current;
      if (el && el.getBoundingClientRect().top < scrollPaneTop(el)) el.scrollIntoView({ block: 'nearest' });
    });
  };

  return (
    <div
      ref={cardRef}
      // Whole card = tap target (mouse/touch convenience only). The footer <button> stays
      // the accessible control, so no role/tabIndex here — a button inside a "button" breaks a11y.
      onClick={hasMore ? toggle : undefined}
      className={`min-w-0 select-none overflow-hidden${hasMore ? ' cursor-pointer' : ''}`}
      style={{
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--hairline)',
        background: 'linear-gradient(90deg, var(--card-deep-a), var(--card-deep-mid) 50%, var(--card-deep-b))',
      }}
    >
      <h3
        className="truncate"
        style={{
          padding: '10px 6px 8px 7px',
          fontSize: '11px', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text)',
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
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation(); // the card's onClick would toggle it straight back
            toggle();
          }}
          aria-expanded={expanded}
          aria-label={`${board.label}: ${expanded ? 'show top 5' : `show all ${all.length}`}`}
          className="touch-optimized flex w-full items-center justify-center gap-1 active:opacity-60"
          style={{
            height: 44, borderTop: '1px solid var(--hairline)',
            fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--subtext)',
          }}
        >
          {expanded ? 'Show top 5' : `All ${all.length}`}
          <ChevronDown size={14} aria-hidden style={{ transform: expanded ? 'rotate(180deg)' : 'none' }} />
        </button>
      )}
    </div>
  );
}

/** Top edge of the scroll pane the card lives in (below the fixed header), else the window's. */
function scrollPaneTop(el: HTMLElement): number {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p);
    if (overflowY === 'auto' || overflowY === 'scroll') return p.getBoundingClientRect().top;
  }
  return 0;
}

function Row({ row, rank }: { row: LeaderRow; rank: number }) {
  const lead = rank === 1;
  return (
    <div style={{ ...ROW_STYLE, background: lead ? 'var(--leader-tint)' : 'transparent' }}>
      <span
        className="text-right tabular-nums"
        style={{ fontSize: '11px', fontWeight: lead ? 800 : 700, color: lead ? 'var(--gold-bright)' : 'var(--subtext)' }}
      >
        {rank}
      </span>
      <span className="text-center">
        {/* ESPN sends a few legacy abbrs (WSH, JAC, LA) — map to ours so the team color applies. */}
        {/* Logo mode: block + mx-auto centers the 18px img in the 30px column with no
            inline line-box gap. Free agents (empty abbr) fall back to the abbr markup. */}
        <TeamIdentity abbr={normalizeTeamAbbr(row.teamAbbr)} surface="leaders" size={18} className="mx-auto block">
          <TeamAbbr abbr={normalizeTeamAbbr(row.teamAbbr)} size={11} />
        </TeamIdentity>
      </span>
      <span className="truncate" title={row.name} style={{ fontSize: '12px', fontWeight: lead ? 700 : 600, color: 'var(--text)' }}>
        {shortPlayerName(row.name)}
      </span>
      <span className="tabular-nums" style={{ paddingLeft: 2, fontSize: '12px', fontWeight: 800, color: 'var(--text)' }}>
        {row.displayValue}
      </span>
    </div>
  );
}
