/**
 * My Team matchup visuals (design-system §9.4) — always color + text, never
 * color alone:
 *   MatchupMeter  5-bar signal meter + "Great #28" (bye: dashed empty bars + "Bye")
 *   NextFiveBar   micro-bar of the next 5 weeks (one segment per week)
 *   WeekCells     5 labelled week cells (week · opponent · tier + rank)
 * `data-tier` / `data-bye` stay as stable hooks for tests.
 */

import type { MatchupCell } from '@/lib/myteam/viewModel';
import { tierColor, TIER_LEVEL } from './style';

const BAR_HEIGHTS = [6, 8, 10, 12, 14];

/** "Great #28", tied "Great T-28". */
export function meterText(cell: MatchupCell): string {
  if (cell.kind === 'bye') return 'Bye';
  if (!cell.rating) return '—';
  return `${cell.rating.label} ${cell.rating.isTied ? 'T-' : '#'}${cell.rating.rank}`;
}

export function MatchupMeter({ cell }: { cell: MatchupCell }) {
  const level = cell.rating ? TIER_LEVEL[cell.rating.tier] : 0;
  const color = cell.rating ? tierColor(cell.rating.tier) : 'var(--subtext)';
  const bye = cell.kind === 'bye';
  return (
    <span
      data-tier={cell.rating?.tier}
      data-bye={bye ? 'true' : undefined}
      className="inline-flex items-center gap-1.5 whitespace-nowrap"
    >
      <span aria-hidden className="flex items-end gap-[2px]" style={{ height: 14 }}>
        {BAR_HEIGHTS.map((h, i) => (
          <span
            key={h}
            style={{
              width: 4,
              height: h,
              borderRadius: 1.5,
              ...(bye
                ? { border: '1px dashed var(--matchup-bye)' }
                : { background: i < level ? color : 'var(--matchup-track)' }),
            }}
          />
        ))}
      </span>
      <span className="tabular-nums" style={{ fontSize: 11, fontWeight: 800, color: bye ? 'var(--subtext)' : color }}>
        {meterText(cell)}
      </span>
    </span>
  );
}

/** "Next 5 weeks: Great, Bye, Avg, …" for screen readers. */
function stripLabel(cells: readonly MatchupCell[]): string {
  return `Next ${cells.length} weeks: ${cells.map((c) => (c.kind === 'bye' ? 'Bye' : (c.rating?.label ?? 'no rating'))).join(', ')}`;
}

export function NextFiveBar({ cells }: { cells: readonly MatchupCell[] }) {
  if (cells.length === 0) return null;
  return (
    <span role="img" aria-label={stripLabel(cells)} className="flex gap-[2px]">
      {cells.map((c) => (
        <span
          key={c.week}
          style={{
            width: 9,
            height: 4,
            borderRadius: 1,
            ...(c.kind === 'bye'
              ? { border: '1px dashed var(--matchup-bye)' }
              : { background: c.rating ? tierColor(c.rating.tier) : 'var(--matchup-track)' }),
          }}
        />
      ))}
    </span>
  );
}

/** Week cells (expanded row, pinned card). */
export function WeekCells({ cells }: { cells: readonly MatchupCell[] }) {
  if (cells.length === 0) return null;
  return (
    <ol aria-label="Next weeks" className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}>
      {cells.map((c) => (
        <WeekCell key={c.week} cell={c} />
      ))}
    </ol>
  );
}

export function WeekCell({ cell, compact = false }: { cell: MatchupCell; compact?: boolean }) {
  const bye = cell.kind === 'bye';
  const color = cell.rating ? tierColor(cell.rating.tier) : 'var(--subtext)';
  const opp = bye ? 'BYE' : cell.opp ? `${cell.home ? 'vs' : '@'}${cell.opp}` : '—';
  return (
    <li
      data-tier={cell.rating?.tier}
      data-bye={bye ? 'true' : undefined}
      className="flex min-w-0 flex-col items-center justify-center rounded-sm text-center"
      style={{
        minHeight: compact ? 34 : 50,
        padding: '4px 2px',
        background: 'var(--nav-bg)',
        border: bye ? '1px dashed var(--matchup-bye)' : '1px solid var(--hairline)',
        borderTop: bye ? '1px dashed var(--matchup-bye)' : `3px solid ${cell.rating ? color : 'var(--matchup-track)'}`,
      }}
    >
      {!compact && (
        <span className="tabular-nums" style={{ fontSize: 10, fontWeight: 700, color: 'var(--subtext)' }}>
          W{cell.week}
        </span>
      )}
      {!compact && (
        <span className="w-full truncate" style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>
          {opp}
        </span>
      )}
      <span className="tabular-nums" style={{ fontSize: 10, fontWeight: 800, color: bye ? 'var(--subtext)' : color }}>
        {bye ? 'Bye' : cell.rating ? `${compact ? '' : `${cell.rating.label} `}${cell.rating.isTied ? 'T-' : '#'}${cell.rating.rank}` : '—'}
      </span>
    </li>
  );
}
