/**
 * MatchupCard — a single tappable schedule row (accordion header, Vision Step 4).
 *
 * STYLE: Neon Frame "Frame Row" (Home Round 2 pick: A + G1 · C2 · N3 · 24px —
 * recipe in docs/design-system.md §9). A mini Compare card:
 *
 *   ┌ team A color ── neutral ── team B color ┐   ← 1.5px fading frame, subtle side glow
 *   │ MIA        17   ● Q3 5:20   20       BUF │   ← abbr = solid team color, 24px/900
 *   │ Dolphins 2–3                   4–1 Bills │   ← nickname + record (label role)
 *   └──────────────────────────────────────────┘
 *
 * Center by game state:
 *   • pre  → kickoff time, network, betting line on two lines (spread / O/U). No scores.
 *   • in   → live scores flank the center; red pulsing dot + clock (e.g. "Q3 5:20").
 *   • post → final scores flank "FINAL": winner white, loser dimmed to --muted
 *            (standard sports-app result treatment; §9.1). No arrow — the
 *            brightness difference alone reads clearly (and isn't hue-based).
 *            Live scores both stay white — the lead can still change.
 *
 * No logo artwork (licensing, §9 rule 4). Team colors come from the same
 * getMatchupPalettes() as Compare, so clash swaps (KC vs TB) match everywhere.
 * Tapping toggles the inline compare peek (handled by <MatchupAccordion>);
 * the open card wears a gold-bright ring.
 */

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { formatKickoff, type Matchup, type MatchupOdds } from '@/lib/schedule';
import { getMatchupPalettes, type BarPalette } from '@/lib/teamColors';

interface MatchupCardProps {
  matchup: Matchup;
  /** Whether the accordion row is expanded. */
  isOpen?: boolean;
  /** Toggle the accordion for this row. */
  onToggle?: () => void;
}

/** Small uppercase label style (§9 "Labels" role). */
const LABEL = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--subtext)',
} as const;

function formatRecord(record: string | null): string | null {
  return record ? record.replace(/-/g, '–') : null;
}

function TeamBlock({
  abbr,
  nickname,
  record,
  palette,
  align,
}: {
  abbr: string;
  nickname: string;
  record: string | null;
  palette: BarPalette;
  align: 'left' | 'right';
}) {
  const isRight = align === 'right';
  const rec = formatRecord(record);
  return (
    <div className={`min-w-0 ${isRight ? 'text-right' : 'text-left'}`}>
      {/* Solid team color (N3) — 24px bold text clears WCAG large-text 3:1 on the deep card. */}
      <div
        className="whitespace-nowrap"
        style={{ fontSize: 24, fontWeight: 900, lineHeight: 1, letterSpacing: '0.01em', color: palette.line }}
      >
        {abbr}
      </div>
      <div
        className="truncate"
        style={{ marginTop: 4, fontSize: 10, fontWeight: 600, color: 'var(--subtext)' }}
      >
        {isRight ? (
          <>
            {rec && <span className="tabular-nums" style={{ color: 'var(--muted)' }}>{rec} </span>}
            {nickname}
          </>
        ) : (
          <>
            {nickname}
            {rec && <span className="tabular-nums" style={{ color: 'var(--muted)' }}> {rec}</span>}
          </>
        )}
      </div>
    </div>
  );
}

function Score({
  value,
  lose,
}: {
  value: number | null;
  /** Final-game loser → dimmed. Never set while live (the lead can flip). */
  lose: boolean;
}) {
  return (
    <span
      className="flex items-center justify-center tabular-nums leading-none"
      style={{ fontSize: 20, fontWeight: 800, color: lose ? 'var(--muted)' : 'var(--text)' }}
    >
      {value ?? ''}
    </span>
  );
}

/**
 * Betting line as TWO short lines ("SEA -8.5" over "O/U 40.5") so it always fits
 * the fixed 64px center column — one line ("SEA -8.5 · O/U 40.5", ~90px) used to
 * spill into the score slots and bunch the scores up.
 */
function OddsText({ odds }: { odds: MatchupOdds }) {
  const style = { fontSize: 9, fontWeight: 500, color: 'var(--muted)' } as const;
  return (
    <span className="flex flex-col items-center tabular-nums leading-none" style={{ gap: 2 }}>
      <span className="whitespace-nowrap" style={style}>{odds.spread}</span>
      {odds.overUnder != null && (
        <span className="whitespace-nowrap" style={style}>O/U {odds.overUnder}</span>
      )}
    </span>
  );
}

export default function MatchupCard({ matchup, isOpen = false, onToggle }: MatchupCardProps) {
  const { away, home, kickoff, state, statusDetail, awayScore, homeScore, winner, odds, awayRecord, homeRecord, network } = matchup;
  const { time } = formatKickoff(kickoff);
  const showScores = state !== 'pre' && awayScore != null && homeScore != null;
  // Only a FINAL game has a loser (ties → winner null → nobody dimmed).
  const final = state === 'post';

  // Same resolver as Compare (lift → clash swap → fallback). Away = left = A.
  const { a, b } = useMemo(() => getMatchupPalettes(away.name, home.name), [away.name, home.name]);

  // Frame: line color → neutral → line color (same as CompactPanel), but 1.5px and a
  // SUBTLE side glow (G1: 14px / 25%) — Home stacks ~16 cards, Compare shows one.
  const frameStyle = {
    padding: 1.5,
    borderRadius: 'var(--radius-lg)',
    background: `linear-gradient(90deg, ${a.line}, var(--frame-mid) 50%, ${b.line})`,
    boxShadow: isOpen
      ? '0 0 0 1.5px var(--gold-bright), 0 0 14px color-mix(in srgb, var(--gold-bright) 25%, transparent)'
      : `-9px 0 14px -10px rgba(${a.rgb}, 0.25), 9px 0 14px -10px rgba(${b.rgb}, 0.25)`,
  };

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-label={`Compare ${away.name} at ${home.name}`}
      whileTap={{ scale: 0.985 }}
      className="block w-full touch-optimized"
      style={frameStyle}
    >
      <div
        className="grid items-center"
        style={{
          // Fixed, symmetric slots: team | score 36 | center 64 | score 36 | team.
          // Scores always sit the same distance from the center on every card.
          gridTemplateColumns: 'minmax(0, 1fr) 36px 64px 36px minmax(0, 1fr)',
          columnGap: 6,
          minHeight: 64,
          padding: '9px 12px',
          borderRadius: 'calc(var(--radius-lg) - 1.5px)',
          background: 'linear-gradient(90deg, var(--card-deep-a), var(--card-deep-mid) 50%, var(--card-deep-b))',
        }}
      >
        <TeamBlock abbr={away.abbr} nickname={away.nickname} record={awayRecord} palette={a} align="left" />

        {showScores ? <Score value={awayScore} lose={final && winner === 'home'} /> : <span />}

        {/* Center — status-driven */}
        <div className="flex flex-col items-center text-center" style={{ gap: 3 }}>
          {state === 'post' ? (
            <>
              <span style={LABEL}>Final</span>
              {odds && <OddsText odds={odds} />}
            </>
          ) : state === 'in' ? (
            <span
              className="inline-flex items-center whitespace-nowrap tabular-nums leading-none"
              style={{ gap: 5, fontSize: 11, fontWeight: 700, color: 'var(--red)' }}
            >
              <span className="pare-live-dot" aria-hidden />
              {statusDetail || 'Live'}
            </span>
          ) : (
            <>
              <span className="tabular-nums leading-none" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                {time}
              </span>
              {network && <span style={LABEL}>{network}</span>}
              {odds && <OddsText odds={odds} />}
            </>
          )}
        </div>

        {showScores ? <Score value={homeScore} lose={final && winner === 'away'} /> : <span />}

        <TeamBlock abbr={home.abbr} nickname={home.nickname} record={homeRecord} palette={b} align="right" />
      </div>
    </motion.button>
  );
}
