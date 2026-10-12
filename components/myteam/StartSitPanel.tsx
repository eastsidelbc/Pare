/**
 * Start / Sit (design-system §9.4, P4 final mockup) — the panel the expanded
 * card's button area slides to: ‹ Back + "START / SIT · QBS", 44px chips of my
 * other players at the position (dot = their this-week tier; likely swap
 * pre-picked), a 74px-name + 5-week grid for both players, the verdicts, and
 * "Matchup only (…) — not a projection." Logic: lib/myteam/startSit.ts.
 */

'use client';

import { ChevronLeft } from 'lucide-react';
import { shortPlayerName } from '@/lib/playerName';
import type { LeagueBundle } from '@/lib/myteam/apiTypes';
import { compareStartSit, goodWeeks, type Verdict } from '@/lib/myteam/startSit';
import type { RosterRow } from '@/lib/myteam/viewModel';
import { WeekCell } from './MatchupMeter';
import { positionPlural, scoringLabel, tierColor } from './style';

interface Props {
  row: RosterRow;
  candidates: RosterRow[];
  pickId: string | null;
  onPick: (playerId: string) => void;
  onBack: () => void;
  format: LeagueBundle['league']['format'];
}

const GRID = { display: 'grid', gridTemplateColumns: '74px repeat(5, minmax(0, 1fr))', gap: 4, alignItems: 'center' } as const;

function thisWeekLine(v: Verdict, a: string, b: string, bothBye: boolean): string {
  if (v === 'a' || v === 'b') return `This week, easier matchup: ${v === 'a' ? a : b}`;
  if (v === 'tie') return 'This week: same matchup rank';
  return bothBye ? 'This week: both on bye' : 'This week: no rating yet';
}

export default function StartSitPanel({ row, candidates, pickId, onPick, onBack, format }: Props) {
  const other = candidates.find((c) => c.player.playerId === pickId) ?? candidates[0] ?? null;
  const position = row.player.position;
  if (!other || !position) return null;
  const result = compareStartSit(row, other);
  const plural = positionPlural(position);
  const aName = shortPlayerName(row.player.name);
  const bName = shortPlayerName(other.player.name);
  const weeks = row.strip.slice(0, 5).map((c) => c.week);
  const nextLine =
    result.next.verdict === 'tie'
      ? `Next ${weeks.length} weeks: even (${result.next.a} good weeks each)`
      : `Next ${weeks.length} weeks: ${result.next.verdict === 'a' ? aName : bName} (${Math.max(result.next.a, result.next.b)} good weeks vs ${Math.min(result.next.a, result.next.b)})`;

  const lane = (r: RosterRow, name: string, side: 'a' | 'b') => (
    <div
      key={r.player.playerId}
      data-lane={side}
      style={{
        ...GRID,
        padding: 3,
        borderRadius: 'var(--radius-md)',
        border: result.easier === side ? '1.5px solid var(--gold-bright)' : '1.5px solid var(--hairline)',
      }}
    >
      <span className="min-w-0 truncate" style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>
        {name}
        <span className="block" style={{ fontSize: 11, fontWeight: 600, color: 'var(--subtext)' }}>
          {goodWeeks(r.strip.slice(0, 5))} good wks
        </span>
      </span>
      {r.strip.slice(0, 5).map((c) => (
        <WeekCell key={c.week} cell={c} />
      ))}
    </div>
  );

  return (
    <div data-state="start-sit" className="flex flex-col" style={{ gap: 8 }}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="touch-optimized flex items-center active:opacity-70"
          style={{ height: 44, minWidth: 44, gap: 4, paddingRight: 8, fontSize: 13, fontWeight: 800, color: 'var(--gold-bright)' }}
        >
          <ChevronLeft size={18} strokeWidth={2.4} aria-hidden /> Back
        </button>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', color: 'var(--subtext)' }}>START / SIT · {plural.toUpperCase()}</span>
      </div>

      <div role="group" aria-label={`Compare with another ${position}`} className="flex overflow-x-auto" style={{ gap: 6, scrollbarWidth: 'none' }}>
        {candidates.map((c) => {
          const on = c.player.playerId === other.player.playerId;
          const dot = c.thisWeek.rating ? tierColor(c.thisWeek.rating.tier) : 'var(--matchup-bye)';
          return (
            <button
              key={c.player.playerId}
              type="button"
              aria-pressed={on}
              onClick={() => onPick(c.player.playerId)}
              className="touch-optimized inline-flex flex-none items-center whitespace-nowrap rounded-full active:opacity-70"
              style={{
                height: 44,
                gap: 6,
                padding: '0 12px',
                fontSize: 13,
                fontWeight: on ? 800 : 600,
                border: on ? '1.5px solid var(--gold-bright)' : '1px solid var(--frame-mid)',
                background: on ? 'color-mix(in srgb, var(--gold-bright) 8%, var(--nav-bg))' : 'var(--nav-bg)',
                color: on ? 'var(--gold-bright)' : 'var(--text)',
              }}
            >
              <span aria-hidden className="flex-none rounded-full" style={{ width: 8, height: 8, background: dot }} />
              {shortPlayerName(c.player.name)}
            </button>
          );
        })}
      </div>

      <div style={{ ...GRID, padding: '0 4.5px' }} aria-hidden>
        <span />
        {weeks.map((w) => (
          <span key={w} className="text-center tabular-nums" style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtext)' }}>
            W{w}
          </span>
        ))}
      </div>
      {lane(row, aName, 'a')}
      {lane(other, bName, 'b')}

      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>
        {thisWeekLine(result.thisWeek, aName, bName, row.thisWeek.kind === 'bye' && other.thisWeek.kind === 'bye')}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', opacity: 0.85 }}>{nextLine}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--subtext)' }}>
        Matchup only ({scoringLabel(format)} pts/g allowed to {plural}) — not a projection.
      </div>
    </div>
  );
}
