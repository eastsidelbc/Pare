/**
 * WeekMatchupPills — one-tap presets on a blank comparison: this NFL week's
 * games as pills ("IND VS WAS"). Tap → both teams fill at once.
 *
 *   WEEK 5
 *   ( IND VS WAS )  ( NE VS BUF )
 *   ( NYG VS CHI )  ( ...       )
 *
 * Games come from the app-wide schedule store (<ScheduleProvider>, already
 * loaded for Home) — no extra fetch. Away = Team A (left), home = Team B, same
 * orientation as Home. Live games get a small red dot. If the week isn't
 * loaded / is empty, renders nothing (the slots still work).
 */

'use client';

import { memo } from 'react';
import { useSchedule } from '@/components/schedule/ScheduleProvider';
import { getTeamPalette } from '@/lib/teamColors';
import TeamMark from '@/components/ui/TeamMark';

interface WeekMatchupPillsProps {
  /** Called with (away team name, home team name). */
  onPick: (teamA: string, teamB: string) => void;
}

function WeekMatchupPills({ onPick }: WeekMatchupPillsProps) {
  const { weeks, currentNflWeek } = useSchedule();
  const entry = weeks[currentNflWeek];
  if (!entry || entry.status !== 'ready' || entry.matchups.length === 0) return null;

  return (
    <section className="w-full max-w-md" aria-label={`Week ${currentNflWeek} matchups`}>
      <p
        className="mb-2.5 text-center"
        style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.26em', color: 'var(--gold-bright)' }}
      >
        WEEK {currentNflWeek}
      </p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
        {entry.matchups.map((m) => {
          const pa = getTeamPalette(m.away.name);
          const pb = getTeamPalette(m.home.name);
          const live = m.state === 'in';
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onPick(m.away.name, m.home.name)}
              aria-label={`Compare ${m.away.name} vs ${m.home.name}${live ? ' (live)' : ''}`}
              className="relative flex h-9 items-center justify-center gap-1 rounded-full touch-optimized active:opacity-60"
              style={{
                border: '1px solid var(--frame-mid)',
                background: `linear-gradient(90deg, rgba(${pa?.rgb ?? '255, 255, 255'}, 0.14), var(--card-deep-mid) 50%, rgba(${pb?.rgb ?? '255, 255, 255'}, 0.14))`,
              }}
            >
              <TeamMark teamName={m.away.name} size={12.5} />
              <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.14em', color: 'var(--muted)' }}>VS</span>
              <TeamMark teamName={m.home.name} size={12.5} />
              {live && (
                <span
                  aria-hidden="true"
                  className="absolute right-2.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full"
                  style={{ background: 'var(--red)', boxShadow: '0 0 6px var(--red)' }}
                />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default memo(WeekMatchupPills);
