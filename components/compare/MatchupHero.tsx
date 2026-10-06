/**
 * MatchupHero — team-name wordmarks at the top of a comparison (Round 5 "R").
 *
 * Wordmarks by default; config/teamIdentity.ts 'compareHero' = 'logo' swaps the
 * nickname for the team logo (city · record line stays).
 *   KANSAS CITY · 4–1          BUFFALO · 3–2
 *   CHIEFS (outlined)          BILLS (outlined)
 * Each nickname is outlined in its team's bar color (lib/teamColors) with a soft
 * glow, and auto-shrinks for long names (Commanders, Buccaneers) so it never
 * wraps at 393px. Tapping a team opens the existing CompactTeamSelector.
 *
 * Presentational + its own open/closed picker state; team changes go up through
 * the same onTeamAChange/onTeamBChange handlers as before.
 */

'use client';

import { memo, useRef, useState } from 'react';
import type { TeamData } from '@/lib/useNflStats';
import { getTeamByName } from '@/lib/teams';
import type { BarPalette } from '@/lib/teamColors';
import CompactTeamSelector from '@/components/mobile/CompactTeamSelector';
import TeamIdentity from '@/components/ui/TeamIdentity';

interface MatchupHeroProps {
  teamA: string;
  teamB: string;
  teamARecord?: string | null;
  teamBRecord?: string | null;
  paletteA: BarPalette;
  paletteB: BarPalette;
  /** Teams offered in the picker (offense rows — same list the logo picker used). */
  allTeams: TeamData[];
  onTeamAChange: (team: string) => void;
  onTeamBChange: (team: string) => void;
  /** 'lg' = phone Compare tab, 'sm' = Home peek + tablet quadrants. */
  size?: 'lg' | 'sm';
}

/** Nickname font size by length so the longest names fit half of a 393px screen. */
export function wordmarkSize(nickname: string, size: 'lg' | 'sm'): number {
  // Wide letters (M, W) count extra so "SEAHAWKS"/"COMMANDERS" don't clip.
  const n = nickname.length + 0.3 * (nickname.match(/[MW]/gi)?.length ?? 0);
  const lg = n <= 6 ? 32 : n <= 8 ? 27 : n <= 9.5 ? 24 : 20;
  return size === 'lg' ? lg : Math.round(lg * 0.72);
}

function formatRecord(record?: string | null): string | null {
  return record ? record.replace('-', '–') : null;
}

function MatchupHero({
  teamA,
  teamB,
  teamARecord,
  teamBRecord,
  paletteA,
  paletteB,
  allTeams,
  onTeamAChange,
  onTeamBChange,
  size = 'lg',
}: MatchupHeroProps) {
  const [open, setOpen] = useState<'A' | 'B' | null>(null);
  const refA = useRef<HTMLButtonElement>(null);
  const refB = useRef<HTMLButtonElement>(null);

  const side = (which: 'A' | 'B') => {
    const isA = which === 'A';
    const name = isA ? teamA : teamB;
    const team = getTeamByName(name);
    const pal = isA ? paletteA : paletteB;
    const record = formatRecord(isA ? teamARecord : teamBRecord);
    const nickname = (team?.nickname ?? name).toUpperCase();
    const city = (team?.location ?? '').toUpperCase();
    const fontSize = wordmarkSize(nickname, size);
    return (
      <button
        ref={isA ? refA : refB}
        type="button"
        onClick={() => setOpen((o) => (o === which ? null : which))}
        className={`min-w-0 touch-optimized active:opacity-60 ${isA ? 'text-left' : 'text-right'}`}
        aria-label={`${name}${record ? `, record ${record}` : ''} — tap to change team`}
        aria-haspopup="listbox"
        aria-expanded={open === which}
      >
        <div
          className="truncate"
          style={{ fontSize: size === 'lg' ? 10 : 9, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--subtext)' }}
        >
          {city}
          {record && <span style={{ color: 'var(--muted)', letterSpacing: '0.04em' }}>{` · ${record}`}</span>}
        </div>
        {/* Logo mode: inline-block img follows the button's text-left/right, so A hugs
            the left edge and B the right edge; align-bottom drops the baseline gap. */}
        <TeamIdentity
          abbr={team?.abbr ?? ''}
          surface="compareHero"
          size={size === 'lg' ? 40 : 32}
          className="mt-1 inline-block align-bottom"
          decorative
        >
          <div
            className="whitespace-nowrap"
            style={{
              fontSize,
              fontWeight: 900,
              lineHeight: 1.05,
              color: 'transparent',
              WebkitTextStroke: `${size === 'lg' ? 1.4 : 1.1}px ${pal.line}`,
              textShadow: `0 0 16px rgba(${pal.rgb}, 0.55)`,
            }}
          >
            {nickname}
          </div>
        </TeamIdentity>
      </button>
    );
  };

  return (
    <>
      <div
        className="grid grid-cols-2 items-end gap-3"
        style={{ padding: size === 'lg' ? '2px 18px 6px' : '4px 10px 6px' }}
      >
        {side('A')}
        {side('B')}
      </div>
      {open === 'A' && (
        <CompactTeamSelector
          allTeams={allTeams}
          currentTeam={teamA}
          onTeamChange={(t) => { onTeamAChange(t); setOpen(null); }}
          isOpen
          onToggle={() => setOpen(null)}
          triggerElement={refA.current}
        />
      )}
      {open === 'B' && (
        <CompactTeamSelector
          allTeams={allTeams}
          currentTeam={teamB}
          onTeamChange={(t) => { onTeamBChange(t); setOpen(null); }}
          isOpen
          onToggle={() => setOpen(null)}
          triggerElement={refB.current}
        />
      )}
    </>
  );
}

export default memo(MatchupHero);
