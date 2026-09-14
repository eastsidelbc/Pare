/**
 * MatchupCard — a single tappable schedule row (accordion header, Vision Step 4).
 *
 * Layout (tight, Sleeper-style): team abbreviations on the OUTER edges, each
 * team's score just inboard of its abbr, and status-driven content in the CENTER:
 *
 *   AWAY  <awayScore>   <center>   <homeScore>  HOME   ⌄
 *
 * Center by game state:
 *   • pre  → day + kickoff time, plus the betting line (`<spread> · O/U <total>`)
 *            where the "@" used to be. No scores. Line omitted if no odds.
 *   • post → each final score flanks the center (winner highlighted), "FINAL".
 *   • in   → live scores flank the center with the short status (e.g. "Q3 5:20").
 *
 * Tapping toggles the inline compare peek (handled by <MatchupAccordion>), so
 * this is a button; the far-right chevron rotates to reflect open state.
 */

'use client';

import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import TeamLogo from '@/components/TeamLogo';
import { formatKickoff, type Matchup, type MatchupOdds } from '@/lib/schedule';

interface MatchupCardProps {
  matchup: Matchup;
  /** Whether the accordion row is expanded. */
  isOpen?: boolean;
  /** Toggle the accordion for this row. */
  onToggle?: () => void;
}

function TeamBlock({
  name,
  abbr,
  nickname,
  align,
}: {
  name: string;
  abbr: string;
  nickname: string;
  align: 'left' | 'right';
}) {
  const isRight = align === 'right';
  return (
    <div
      className={`flex min-w-0 flex-1 items-center gap-2 ${isRight ? 'flex-row-reverse text-right' : 'text-left'}`}
    >
      <TeamLogo teamName={name} size="32" />
      <div className="min-w-0">
        <div
          className="truncate font-bold leading-tight tracking-tight"
          style={{ fontSize: '14px', color: 'var(--text)' }}
        >
          {abbr}
        </div>
        <div className="truncate leading-tight" style={{ fontSize: '10px', color: 'var(--subtext)' }}>
          {nickname}
        </div>
      </div>
    </div>
  );
}

function Score({ value, highlight, dim }: { value: number; highlight: boolean; dim: boolean }) {
  return (
    <span
      className="flex-none tabular-nums font-black leading-none"
      style={{
        fontSize: '17px',
        minWidth: 20,
        textAlign: 'center',
        color: highlight ? 'var(--gold)' : dim ? 'var(--muted)' : 'var(--text)',
      }}
    >
      {value}
    </span>
  );
}

function oddsLine(odds: MatchupOdds | null): string | null {
  if (!odds) return null;
  return odds.overUnder != null ? `${odds.spread} · O/U ${odds.overUnder}` : odds.spread;
}

export default function MatchupCard({ matchup, isOpen = false, onToggle }: MatchupCardProps) {
  const { away, home, kickoff, state, statusDetail, awayScore, homeScore, winner, odds } = matchup;
  const { day, time } = formatKickoff(kickoff);

  const showScores = state !== 'pre' && awayScore != null && homeScore != null;
  const line = oddsLine(odds);

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-label={`Compare ${away.name} at ${home.name}`}
      whileTap={{ scale: 0.985 }}
      className="flex w-full items-center gap-2 touch-optimized"
      style={{
        background: 'var(--card)',
        border: `1px solid ${isOpen ? 'var(--gold)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        padding: '10px 12px',
      }}
    >
      <TeamBlock name={away.name} abbr={away.abbr} nickname={away.nickname} align="left" />

      {showScores && (
        <Score value={awayScore!} highlight={winner === 'away'} dim={state === 'post' && winner === 'home'} />
      )}

      {/* Center — status-driven */}
      <div className="flex flex-none flex-col items-center px-1" style={{ minWidth: 54 }}>
        {state === 'post' ? (
          <span
            className="font-bold leading-none"
            style={{ fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--gold)' }}
          >
            Final
          </span>
        ) : state === 'in' ? (
          <span
            className="font-bold leading-none text-center"
            style={{ fontSize: '10px', letterSpacing: '.5px', color: 'var(--red)' }}
          >
            {statusDetail || 'Live'}
          </span>
        ) : (
          <>
            <span
              className="font-bold tabular-nums leading-none"
              style={{ fontSize: '10px', letterSpacing: '1px', color: 'var(--gold)' }}
            >
              {day.toUpperCase()}
            </span>
            <span
              className="mt-1 font-semibold tabular-nums leading-none"
              style={{ fontSize: '11px', color: 'var(--subtext)' }}
            >
              {time}
            </span>
            {line && (
              <span
                className="mt-1 whitespace-nowrap font-medium leading-none"
                style={{ fontSize: '9px', color: 'var(--muted)' }}
              >
                {line}
              </span>
            )}
          </>
        )}
      </div>

      {showScores && (
        <Score value={homeScore!} highlight={winner === 'home'} dim={state === 'post' && winner === 'away'} />
      )}

      <TeamBlock name={home.name} abbr={home.abbr} nickname={home.nickname} align="right" />

      <motion.span
        className="flex-none"
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{ color: isOpen ? 'var(--gold)' : 'var(--muted)', lineHeight: 0 }}
        aria-hidden
      >
        <ChevronDown size={15} />
      </motion.span>
    </motion.button>
  );
}
