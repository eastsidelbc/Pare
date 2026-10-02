/**
 * LeaderCard — one leaderboard box (client).
 *
 * Renders the top 5 by default and expands to the full top 25 on tap, with a
 * smooth height animation. Each row is compact — rank/medal, team logo, name,
 * value — so two cards fit side by side on mobile. Cards fade/slide in on scroll.
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

const PREVIEW_COUNT = 5;

export default function LeaderCard({ board }: { board: LeaderBoard }) {
  const [expanded, setExpanded] = useState(false);

  const all = board.leaders;
  const preview = all.slice(0, PREVIEW_COUNT);
  const rest = all.slice(PREVIEW_COUNT);
  const hasMore = rest.length > 0;

  // Competition ranking: tied values share a number and the next value skips —
  // e.g. 1, 1, 3, 4, 5, 5, 7. Aligned to `all`.
  const ranks = all.map((r) => 1 + all.reduce((n, x) => (x.value > r.value ? n + 1 : n), 0));

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
        className="px-2 pt-2.5 pb-2 uppercase"
        style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', color: 'var(--gold)' }}
      >
        {board.label}
      </div>

      {all.length === 0 ? (
        <div className="px-2 pb-3" style={{ fontSize: '12px', color: 'var(--muted)' }}>
          No data
        </div>
      ) : (
        <>
          {preview.map((row, i) => (
            <Row key={row.athleteId || i} row={row} rank={ranks[i]} />
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
                  <Row key={row.athleteId || i + PREVIEW_COUNT} row={row} rank={ranks[i + PREVIEW_COUNT]} />
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

function Row({ row, rank }: { row: LeaderRow; rank: number }) {
  const isLeader = rank === 1;

  return (
    <div className="py-1.5 pl-1.5 pr-2" style={{ background: isLeader ? 'color-mix(in srgb, var(--gold) 8%, transparent)' : 'transparent' }}>
      <div className="flex items-center gap-0.5">
        {/* Rank — hugs the left edge, tight to the logo */}
        <span
          className="text-left tabular-nums"
          style={{ flex: 'none', marginRight: 2, fontSize: '11px', fontWeight: 700, color: isLeader ? 'var(--gold)' : 'var(--muted)' }}
        >
          {rank}
        </span>

        {/* Team logo (falls back to abbr if missing) */}
        {row.teamLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.teamLogo} alt={row.teamAbbr} width={16} height={16} loading="lazy" style={{ flex: 'none' }} />
        ) : (
          <span className="tabular-nums" style={{ flex: 'none', width: 16, fontSize: '9px', color: 'var(--muted)' }}>
            {row.teamAbbr}
          </span>
        )}

        {/* Name — gets the remaining room */}
        <span className="flex-1 min-w-0 truncate" style={{ fontSize: '12px', fontWeight: isLeader ? 700 : 500, color: 'var(--text)' }}>
          {row.name}
        </span>

        {/* Value */}
        <span className="tabular-nums" style={{ flex: 'none', marginLeft: 6, fontSize: '13px', fontWeight: 700, color: isLeader ? 'var(--gold)' : 'var(--text)' }}>
          {row.displayValue}
        </span>
      </div>
    </div>
  );
}
