/**
 * LeaderCard — one leaderboard box (client).
 *
 * Renders the top 5 by default and expands to the full top 25 on tap, with a
 * smooth height animation. Each row shows the player's headshot (falling back to
 * the team logo, then a blank), team logo + abbr, value, and a relative bar
 * scaled to the board leader. Cards fade/slide in as they scroll into view.
 *
 * Client component so the expand toggle + animations work; the page stays a
 * server component and passes each board's data in. Types are imported
 * type-only, so the `server-only` `lib/leaders` module never enters this bundle.
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import type { LeaderBoard, LeaderRow } from '@/lib/leaders';

const MEDALS = ['🥇', '🥈', '🥉'];
const PREVIEW_COUNT = 5;

export default function LeaderCard({ board }: { board: LeaderBoard }) {
  const [expanded, setExpanded] = useState(false);

  const all = board.leaders;
  const preview = all.slice(0, PREVIEW_COUNT);
  const rest = all.slice(PREVIEW_COUNT);
  const hasMore = rest.length > 0;

  // Competition ranking (1224-style): tied values share a rank and the next
  // distinct value skips — e.g. T-1, T-1, 3, 4, T-5, T-5, 7. Aligned to `all`.
  const ranks = all.map((r) => {
    const better = all.reduce((n, x) => n + (x.value > r.value ? 1 : 0), 0);
    const same = all.reduce((n, x) => n + (x.value === r.value ? 1 : 0), 0);
    return { rank: better + 1, tied: same > 1 };
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="rounded-xl overflow-hidden"
      // The whole card is the toggle when there are more than 5: tap anywhere to
      // expand, tap anywhere to collapse. Cards with <=5 leaders aren't clickable.
      onClick={hasMore ? () => setExpanded((v) => !v) : undefined}
      role={hasMore ? 'button' : undefined}
      aria-expanded={hasMore ? expanded : undefined}
      style={{ background: 'var(--card)', border: '1px solid var(--border)', cursor: hasMore ? 'pointer' : 'default' }}
    >
      {/* Card title */}
      <div
        className="px-3 pt-3 pb-2 uppercase"
        style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', color: 'var(--gold)' }}
      >
        {board.label}
      </div>

      {all.length === 0 ? (
        <div className="px-3 pb-3" style={{ fontSize: '12px', color: 'var(--muted)' }}>
          No data
        </div>
      ) : (
        <>
          {preview.map((row, i) => (
            <Row key={row.athleteId || i} row={row} rank={ranks[i].rank} tied={ranks[i].tied} />
          ))}

          {/* Rows 6…N reveal with a height animation. */}
          <AnimatePresence initial={false}>
            {expanded && rest.length > 0 && (
              <motion.div
                key="more"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                style={{ overflow: 'hidden' }}
              >
                {rest.map((row, i) => (
                  <Row key={row.athleteId || i + PREVIEW_COUNT} row={row} rank={ranks[i + PREVIEW_COUNT].rank} tied={ranks[i + PREVIEW_COUNT].tied} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {hasMore && (
            // Hint only — the whole card handles the tap (this bubbles up).
            <div
              className="flex w-full items-center justify-center gap-1 border-t py-2"
              style={{ borderColor: 'var(--border)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--muted)' }}
            >
              {expanded ? 'Show less' : `Show all ${all.length}`}
              <ChevronDown
                size={13}
                style={{ transition: 'transform .18s ease', transform: expanded ? 'rotate(180deg)' : 'none' }}
              />
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

function Row({ row, rank, tied }: { row: LeaderRow; rank: number; tied: boolean }) {
  const isLeader = rank === 1;
  // Medal for a clean (untied) podium spot; "T-n" for a tie; plain number otherwise.
  const rankLabel = tied ? `T-${rank}` : rank <= 3 ? MEDALS[rank - 1] : String(rank);
  const isMedal = !tied && rank <= 3;

  return (
    <div className="px-3 py-1.5" style={{ background: isLeader ? 'rgba(212,168,67,0.08)' : 'transparent' }}>
      <div className="flex items-center gap-2">
        {/* Rank / medal */}
        <span
          className="text-center tabular-nums"
          style={{ width: 28, flex: 'none', fontSize: isMedal ? '13px' : '11px', fontWeight: 700, color: 'var(--muted)' }}
        >
          {rankLabel}
        </span>

        {/* Headshot (fallback: team logo, then blank) */}
        <Avatar headshot={row.headshot} logo={row.teamLogo} alt={row.name} />

        {/* Name */}
        <span className="flex-1 min-w-0 truncate" style={{ fontSize: '13px', fontWeight: isLeader ? 700 : 500, color: 'var(--text)' }}>
          {row.name}
        </span>

        {/* Team logo (replaces the abbr text; falls back to abbr if missing) */}
        {row.teamLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.teamLogo} alt={row.teamAbbr} width={16} height={16} loading="lazy" style={{ flex: 'none' }} />
        ) : (
          <span className="tabular-nums" style={{ flex: 'none', fontSize: '10px', color: 'var(--muted)' }}>
            {row.teamAbbr}
          </span>
        )}

        {/* Value */}
        <span className="tabular-nums" style={{ fontSize: '14px', fontWeight: 700, color: isLeader ? 'var(--gold)' : 'var(--text)' }}>
          {row.displayValue}
        </span>
      </div>
    </div>
  );
}

function Avatar({ headshot, logo, alt }: { headshot: string | null; logo: string | null; alt: string }) {
  const src = headshot ?? logo;
  return (
    <span
      className="flex items-center justify-center overflow-hidden rounded-full"
      style={{ width: 26, height: 26, flex: 'none', background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          width={26}
          height={26}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: headshot ? 'cover' : 'contain' }}
        />
      ) : null}
    </span>
  );
}
