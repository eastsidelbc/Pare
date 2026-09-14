/**
 * Mobile Top Bar
 *
 * Compare-view header: back-to-schedule affordance, current matchup context,
 * and Pare branding. Styleguide tokens only.
 */

'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { teamNameToAbbr } from '@/lib/teams';

interface MobileTopBarProps {
  teamA?: string;
  teamB?: string;
}

export default function MobileTopBar({ teamA, teamB }: MobileTopBarProps) {
  const abbrA = teamNameToAbbr(teamA);
  const abbrB = teamNameToAbbr(teamB);
  const hasMatchup = Boolean(abbrA && abbrB);

  return (
    <div
      className="flex-none z-10 border-b"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        background: 'var(--surface)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="h-14 px-2 grid grid-cols-[44px_1fr_44px] items-center">
        {/* Back to schedule */}
        <Link
          href="/"
          aria-label="Back to schedule"
          className="flex h-11 w-11 items-center justify-center rounded-lg touch-optimized active:opacity-60"
          style={{ color: 'var(--text)' }}
        >
          <ChevronLeft size={22} />
        </Link>

        {/* Center: matchup or branding */}
        <div className="flex flex-col items-center justify-center">
          {hasMatchup ? (
            <>
              <div
                className="font-bold tabular-nums leading-none"
                style={{ fontSize: '15px', color: 'var(--text)' }}
              >
                {abbrA} <span style={{ color: 'var(--muted)', fontWeight: 500 }}>vs</span> {abbrB}
              </div>
              <div
                className="mt-1 font-semibold leading-none"
                style={{ fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--gold)' }}
              >
                Compare
              </div>
            </>
          ) : (
            <h1 className="font-black tracking-tight" style={{ fontSize: '18px', color: 'var(--text)' }}>
              Pare
              <span
                className="ml-1.5 font-bold"
                style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--gold)' }}
              >
                NFL
              </span>
            </h1>
          )}
        </div>

        {/* Right spacer keeps the center visually centered */}
        <div />
      </div>
    </div>
  );
}
