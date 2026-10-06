/**
 * WeekMatchupPills — one-tap presets on a blank comparison: this NFL week's
 * games as pills ("IND VS WAS"). Tap → both teams fill at once.
 *
 *   WEEK 5
 *   ( IND VS WAS )  ( NE VS BUF )
 *   ( NYG VS CHI )  ( ...       )
 *
 * Abbreviations are plain white text (readable at pill size); the pill's
 * two-team color wash carries the team identity.
 * Games come from the app-wide schedule store (<ScheduleProvider>, already
 * loaded for Home) — no extra fetch, and its live poll keeps these updating
 * while you sit on Compare. Away = Team A (left), home = Team B, same
 * orientation as Home.
 *
 *   pre   →  ( IND VS WAS )      / "Sun 12:00 PM"
 *   live  →  ( IND 14 · 10 WAS ) / clock in red   (both scores white)
 *   final →  ( IND 24 · 17 WAS ) / "Final"        (loser's score dimmed, like Home)
 *
 * If the week isn't loaded / is empty, renders nothing (the slots still work).
 */

'use client';

import { memo } from 'react';
import { useSchedule } from '@/components/schedule/ScheduleProvider';
import { getTeamPalette } from '@/lib/teamColors';
import TeamIdentity from '@/components/ui/TeamIdentity';
import { formatKickoff, type Matchup } from '@/lib/schedule';

/**
 * Pills are tap targets, so they use the "control" text style (plain, solid,
 * 700) — NOT the outlined wordmark style, which only reads at 20px+.
 * Team identity comes from the two-color wash behind the text.
 */
const ABBR_STYLE = {
  minWidth: 30,
  textAlign: 'center',
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: '0.04em',
  color: 'var(--text)',
} as const;

/** Score next to each abbr (live/final). Same size as the abbr, tabular digits. */
function PillScore({ value, lose }: { value: number; lose: boolean }) {
  return (
    <span
      className="tabular-nums"
      style={{ fontSize: 13, fontWeight: 800, color: lose ? 'var(--muted)' : 'var(--text)' }}
    >
      {value}
    </span>
  );
}

/** Second line: kickoff (local time) → live clock (red) → "Final". */
function statusLine(m: Matchup): { text: string; live: boolean } {
  if (m.state === 'in') return { text: m.statusDetail || 'Live', live: true };
  if (m.state === 'post') return { text: 'Final', live: false };
  const { day, time } = formatKickoff(m.kickoff);
  return { text: `${day} ${time}`, live: false };
}

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
          const status = statusLine(m);
          // Scores show once the game has started (live or final).
          const hasScores = m.state !== 'pre' && m.awayScore != null && m.homeScore != null;
          // Only a FINAL game has a loser (ties → winner null → nobody dimmed).
          const final = m.state === 'post';
          const scoreLabel = hasScores ? ` ${m.awayScore} to ${m.homeScore}` : '';
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onPick(m.away.name, m.home.name)}
              aria-label={`Compare ${m.away.name} vs ${m.home.name}, ${status.text}${scoreLabel}`}
              className="flex h-11 flex-col items-center justify-center gap-[3px] rounded-full touch-optimized active:opacity-60"
              style={{
                border: '1px solid var(--frame-mid)',
                background: `linear-gradient(90deg, rgba(${pa?.rgb ?? '255, 255, 255'}, 0.14), var(--card-deep-mid) 50%, rgba(${pb?.rgb ?? '255, 255, 255'}, 0.14))`,
              }}
            >
              <span className="flex items-center gap-1.5 leading-none">
                <TeamIdentity abbr={m.away.abbr} surface="comparePills" size={20} slot={30} decorative>
                  <span style={ABBR_STYLE}>{m.away.abbr}</span>
                </TeamIdentity>
                {hasScores ? (
                  <>
                    <PillScore value={m.awayScore ?? 0} lose={final && m.winner === 'home'} />
                    <span aria-hidden style={{ fontSize: 9, fontWeight: 800, color: 'var(--muted)' }}>·</span>
                    <PillScore value={m.homeScore ?? 0} lose={final && m.winner === 'away'} />
                  </>
                ) : (
                  <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.14em', color: 'var(--muted)' }}>VS</span>
                )}
                <TeamIdentity abbr={m.home.abbr} surface="comparePills" size={20} slot={30} decorative>
                  <span style={ABBR_STYLE}>{m.home.abbr}</span>
                </TeamIdentity>
              </span>
              <span
                className="leading-none tabular-nums"
                style={{ fontSize: 9.5, fontWeight: 600, color: status.live ? 'var(--red)' : 'var(--subtext)' }}
              >
                {status.text}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default memo(WeekMatchupPills);
