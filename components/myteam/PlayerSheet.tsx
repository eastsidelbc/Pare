/**
 * Player sheet — tap a roster row → the opponent's position-specific "why"
 * stats (ranked like Compare, same window as the chip) + Open in Compare.
 * `PlayerSheetBody` is presentational (the sandbox renders it inline);
 * `PlayerSheet` wraps it in the app's one BottomSheet.
 * SKELETON styling (P3) — restyled in P5.
 */

'use client';

import { useRef } from 'react';
import { GitCompareArrows } from 'lucide-react';
import BottomSheet from '@/components/ui/BottomSheet';
import { whyStats, type DefenseGame, type OffenseGame } from '@/lib/myteam/defenseProfile';
import type { RatingWindow } from '@/lib/myteam/types';
import { matchupText, type RosterRow } from '@/lib/myteam/viewModel';
import { InjuryTag, MatchupChip } from './MatchupChip';

interface BodyProps {
  row: RosterRow;
  window: RatingWindow;
  defenseLog: readonly DefenseGame[];
  offenseLog: readonly OffenseGame[];
  onOpenCompare: (teamAbbr: string, oppAbbr: string) => void;
}

const WINDOW_TEXT: Record<RatingWindow, string> = { season: 'Season', last4: 'Last 4 games' };

function formatValue(key: string, value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (key === 'rz_per_drive') return value.toFixed(2);
  return value.toFixed(1);
}

export function PlayerSheetBody({ row, window, defenseLog, offenseLog, onOpenCompare }: BodyProps) {
  const { player, thisWeek } = row;
  const opp = thisWeek.kind === 'game' ? thisWeek.opp : null;
  const stats = opp && player.position ? whyStats(player.position, opp, defenseLog, offenseLog, window) : [];
  const vsWhat = player.position === 'DEF' ? `${opp ?? ''} offense` : `${opp ?? ''} defense vs ${player.position ?? 'position'}`;
  const canCompare = !!(player.nflTeam && opp);

  return (
    <div data-state="sheet" className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate" style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
              {player.name}
            </span>
            {player.injury && <InjuryTag tag={player.injury} />}
          </div>
          <div style={{ fontSize: 12, color: 'var(--subtext)' }}>
            {player.position ?? '—'} · {player.nflTeam ?? 'FA'} · Week {thisWeek.week} {matchupText(thisWeek)}
          </div>
        </div>
        <MatchupChip cell={thisWeek} />
      </div>

      {stats.length > 0 ? (
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-bright)' }}>
            {vsWhat} · {WINDOW_TEXT[window]}
          </div>
          <dl className="mt-1.5 overflow-hidden rounded-lg" style={{ border: '1px solid var(--frame-mid)' }}>
            {stats.map((s, i) => (
              <div
                key={s.key}
                className="flex items-center justify-between px-3"
                style={{ minHeight: 40, borderTop: i > 0 ? '1px solid var(--hairline)' : 'none' }}
              >
                <dt style={{ fontSize: 13, color: 'var(--subtext)' }}>{s.label}</dt>
                <dd className="flex items-center gap-2 tabular-nums" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                  {formatValue(s.key, s.value)}
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtext)' }}>{s.formattedRank}</span>
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-1" style={{ fontSize: 11, color: 'var(--subtext)' }}>
            Per game; rank #1 = best in the league at that stat.
          </p>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--subtext)' }}>
          {thisWeek.kind === 'bye' ? 'On bye this week.' : 'No opponent stats for this week yet.'}
        </p>
      )}

      <button
        type="button"
        disabled={!canCompare}
        onClick={() => player.nflTeam && opp && onOpenCompare(player.nflTeam, opp)}
        className="touch-optimized flex items-center justify-center gap-2 rounded-lg active:opacity-70"
        style={{
          height: 52,
          border: '1px solid var(--frame-mid)',
          background: 'var(--card-deep-a)',
          fontSize: 14,
          fontWeight: 800,
          color: canCompare ? 'var(--text)' : 'var(--subtext)',
        }}
      >
        <GitCompareArrows size={17} aria-hidden />
        Open in Compare
      </button>
    </div>
  );
}

export default function PlayerSheet({
  row,
  onClose,
  ...body
}: Omit<BodyProps, 'row'> & { row: RosterRow | null; onClose: () => void }) {
  // Keep the last row while the sheet slides out.
  const last = useRef(row);
  if (row) last.current = row;
  const shown = row ?? last.current;
  if (!shown) return null;
  return (
    <BottomSheet
      open={row !== null}
      onClose={onClose}
      label={`${shown.player.name} matchup`}
      closeLabel="Close player details"
      className="gap-2.5 px-4 pt-2.5"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)', maxHeight: 'calc(var(--app-h, 100dvh) * 0.88)', overflowY: 'auto' }}
    >
      <PlayerSheetBody row={shown} {...body} />
    </BottomSheet>
  );
}
