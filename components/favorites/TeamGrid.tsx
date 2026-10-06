/**
 * TeamGrid — all 32 teams as tappable chips, grouped by division (4 per row).
 * Shared by the Home picker sheet and the first-launch screen.
 *
 * Starred chips wear their team color (text + border + soft outer glow); when
 * the 3-team cap is reached the rest dim so it's obvious why taps stop adding.
 */

'use client';

import { memo, useMemo } from 'react';
import { Star } from 'lucide-react';
import { NFL_TEAMS, type Conference, type NflTeam } from '@/lib/teams';
import { getTeamPalette } from '@/lib/teamColors';
import { MAX_FAVORITES } from '@/lib/favorites/store';

const DIVISIONS = ['East', 'North', 'South', 'West'] as const;

interface TeamGridProps {
  selected: string[];
  onToggle: (abbr: string) => void;
  /** Only show one conference (first-launch tabs). Omit for all 32. */
  conference?: Conference;
  /** 'chip' = 44px (sheet), 'tile' = 64px with nickname (first launch). */
  variant?: 'chip' | 'tile';
}

function TeamGrid({ selected, onToggle, conference, variant = 'chip' }: TeamGridProps) {
  const groups = useMemo(() => {
    const confs: Conference[] = conference ? [conference] : ['AFC', 'NFC'];
    const out: { label: string; teams: NflTeam[] }[] = [];
    for (const c of confs) {
      for (const d of DIVISIONS) {
        out.push({ label: `${c} ${d}`, teams: NFL_TEAMS.filter((t) => t.conference === c && t.division === d) });
      }
    }
    return out;
  }, [conference]);

  const full = selected.length >= MAX_FAVORITES;
  const tile = variant === 'tile';

  return (
    <div className="grid grid-cols-4 gap-2">
      {groups.map((g) => (
        <div key={g.label} className="contents">
          <div
            className="col-span-4"
            style={{ marginTop: 6, fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)' }}
          >
            {g.label}
          </div>
          {g.teams.map((t) => {
            const on = selected.includes(t.abbr);
            const pal = getTeamPalette(t.name);
            return (
              <button
                key={t.abbr}
                type="button"
                onClick={() => onToggle(t.abbr)}
                aria-pressed={on}
                aria-label={`${t.name}${on ? ', in Your teams' : ''}`}
                className="flex flex-col items-center justify-center touch-optimized active:scale-[0.97]"
                style={{
                  height: tile ? 64 : 44,
                  gap: tile ? 3 : 0,
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${on && pal ? pal.line : 'var(--hairline)'}`,
                  background: on && pal ? `rgba(${pal.rgb}, 0.16)` : 'var(--card-deep-mid)',
                  boxShadow: on && pal ? `0 0 16px -4px rgba(${pal.rgb}, 0.7)` : 'none',
                  opacity: !on && full ? 0.4 : 1,
                  transition: 'background .2s, border-color .2s, box-shadow .2s, opacity .2s',
                }}
              >
                <span
                  className="inline-flex items-center"
                  style={{ gap: 3, fontSize: tile ? 17 : 14, fontWeight: 900, color: on && pal ? pal.line : 'var(--subtext)' }}
                >
                  {on && <Star size={10} fill="currentColor" strokeWidth={0} aria-hidden />}
                  {t.abbr}
                </span>
                {tile && <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--subtext)' }}>{t.nickname}</span>}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default memo(TeamGrid);
