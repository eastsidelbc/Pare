/**
 * Start / Sit (design-system §9.4) — the panel the expanded card's button area
 * slides to. Compares this player with one of my other players at the same
 * position: this week's matchup rank, then the next 5 weeks' tiers.
 * Matchup only — not a projection. Logic: lib/myteam/startSit.ts.
 */

'use client';

import { ChevronLeft } from 'lucide-react';
import type { LeagueBundle } from '@/lib/myteam/apiTypes';
import { compareStartSit, type Verdict } from '@/lib/myteam/startSit';
import type { RosterRow } from '@/lib/myteam/viewModel';
import { MatchupMeter, WeekCell } from './MatchupMeter';
import { POSITION_PLURAL, scoringLabel } from './style';

interface Props {
  row: RosterRow;
  candidates: RosterRow[];
  pickId: string | null;
  onPick: (playerId: string) => void;
  onBack: () => void;
  format: LeagueBundle['league']['format'];
}

const GROUP_TAG: Record<RosterRow['player']['group'], string> = { starter: 'Starter', bench: 'Bench', ir: 'IR', taxi: 'Taxi' };

function thisWeekLine(v: Verdict, a: RosterRow, b: RosterRow): string {
  if (v === 'a' || v === 'b') return `This week, easier matchup: ${(v === 'a' ? a : b).player.name}`;
  if (v === 'tie') return 'This week: even matchups';
  return a.thisWeek.kind === 'bye' && b.thisWeek.kind === 'bye' ? 'This week: both on bye' : 'This week: no rating yet';
}

export default function StartSitPanel({ row, candidates, pickId, onPick, onBack, format }: Props) {
  const other = candidates.find((c) => c.player.playerId === pickId) ?? candidates[0] ?? null;
  const position = row.player.position;
  if (!other || !position) return null;
  const result = compareStartSit(row, other);
  const plural = POSITION_PLURAL[position];
  const weeks = row.strip.map((c) => c.week);
  const nextName = result.next.verdict === 'a' ? row.player.name : other.player.name;
  const nextLine =
    result.next.verdict === 'tie'
      ? `Next ${weeks.length} weeks: even (${result.next.a} good weeks each)`
      : `Next ${weeks.length} weeks: ${nextName} (${Math.max(result.next.a, result.next.b)} good weeks vs ${Math.min(result.next.a, result.next.b)})`;

  const lane = (r: RosterRow, side: 'a' | 'b') => (
    <div
      key={r.player.playerId}
      className="flex flex-col gap-1.5 p-2"
      style={{
        borderRadius: 'var(--radius-md)',
        background: 'var(--nav-bg)',
        border: result.easier === side ? '1.5px solid var(--gold-bright)' : '1px solid var(--hairline)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
          {r.player.name}
        </span>
        <span className="flex flex-none items-center gap-1.5" style={{ fontSize: 10, color: 'var(--subtext)' }}>
          W{r.thisWeek.week} <MatchupMeter cell={r.thisWeek} />
        </span>
      </div>
      <ol className="grid gap-1" style={{ gridTemplateColumns: `repeat(${r.strip.length}, minmax(0, 1fr))` }}>
        {r.strip.map((c) => (
          <WeekCell key={c.week} cell={c} compact />
        ))}
      </ol>
    </div>
  );

  return (
    <div data-state="start-sit" className="flex flex-col gap-2.5">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onBack}
          className="touch-optimized -ml-2 flex items-center active:opacity-70"
          style={{ minHeight: 44, minWidth: 44, padding: '0 8px', fontSize: 13, fontWeight: 700, color: 'var(--gold-bright)' }}
        >
          <ChevronLeft size={16} aria-hidden /> Back
        </button>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--gold-bright)' }}>
          Start / Sit · {plural}
        </span>
      </div>

      <div role="group" aria-label={`Compare with another ${position}`} className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {candidates.map((c) => {
          const on = c.player.playerId === other.player.playerId;
          return (
            <button
              key={c.player.playerId}
              type="button"
              aria-pressed={on}
              onClick={() => onPick(c.player.playerId)}
              className="touch-optimized flex flex-none flex-col items-start justify-center rounded-full active:opacity-70"
              style={{
                minHeight: 44,
                padding: '0 14px',
                border: on ? '1.5px solid var(--gold-bright)' : '1px solid var(--glass-edge)',
                background: 'var(--nav-bg)',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: on ? 'var(--gold-bright)' : 'var(--text)' }}>{c.player.name}</span>
              <span style={{ fontSize: 10, color: 'var(--subtext)' }}>{GROUP_TAG[c.player.group]}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="grid gap-1 px-2" style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }} aria-hidden>
          {weeks.map((w) => (
            <span key={w} className="text-center tabular-nums" style={{ fontSize: 10, fontWeight: 700, color: 'var(--subtext)' }}>
              W{w}
            </span>
          ))}
        </div>
        {lane(row, 'a')}
        {lane(other, 'b')}
      </div>

      <div className="flex flex-col gap-0.5" style={{ fontSize: 13, lineHeight: 1.4 }}>
        <p style={{ color: 'var(--text)', fontWeight: 700 }}>{thisWeekLine(result.thisWeek, row, other)}</p>
        <p style={{ color: 'var(--text)' }}>{nextLine}</p>
      </div>
      <p style={{ fontSize: 11, color: 'var(--subtext)' }}>
        Matchup only ({scoringLabel(format)} pts/g allowed to {plural}) — not a projection.
      </p>
    </div>
  );
}
