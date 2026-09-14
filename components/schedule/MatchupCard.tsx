/**
 * MatchupCard — a single tappable "away @ home" pill for the schedule home.
 *
 * Compact, dense, Sleeper-style. The whole card is a link into the compare view
 * with both teams preloaded via query params (`/compare?away=XXX&home=YYY`).
 */

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import TeamLogo from '@/components/TeamLogo';
import { formatKickoff, type Matchup } from '@/lib/schedule';

interface MatchupCardProps {
  matchup: Matchup;
  /** Stagger index for entrance animation. */
  index?: number;
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
      className={`flex min-w-0 flex-1 items-center gap-2.5 ${isRight ? 'flex-row-reverse text-right' : 'text-left'}`}
    >
      <TeamLogo teamName={name} size="38" />
      <div className="min-w-0">
        <div
          className="truncate font-bold leading-tight tracking-tight"
          style={{ fontSize: '15px', color: 'var(--text)' }}
        >
          {abbr}
        </div>
        <div
          className="truncate leading-tight"
          style={{ fontSize: '11px', color: 'var(--subtext)' }}
        >
          {nickname}
        </div>
      </div>
    </div>
  );
}

export default function MatchupCard({ matchup, index = 0 }: MatchupCardProps) {
  const { away, home, kickoff } = matchup;
  const { day, time } = formatKickoff(kickoff);
  const href = `/compare?away=${away.abbr}&home=${home.abbr}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut', delay: Math.min(index * 0.03, 0.3) }}
    >
      <Link href={href} className="block touch-optimized" aria-label={`Compare ${away.name} at ${home.name}`}>
        <motion.div
          whileTap={{ scale: 0.985 }}
          className="flex items-center gap-3"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-card)',
            padding: '12px 14px',
          }}
        >
          <TeamBlock name={away.name} abbr={away.abbr} nickname={away.nickname} align="left" />

          {/* Center: kickoff + @ */}
          <div className="flex flex-none flex-col items-center px-1" style={{ minWidth: 56 }}>
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
            <span
              className="mt-1 font-medium leading-none"
              style={{ fontSize: '9px', letterSpacing: '1px', color: 'var(--muted)' }}
            >
              @
            </span>
          </div>

          <TeamBlock name={home.name} abbr={home.abbr} nickname={home.nickname} align="right" />

          <ChevronRight size={16} className="flex-none" style={{ color: 'var(--muted)' }} aria-hidden />
        </motion.div>
      </Link>
    </motion.div>
  );
}
