/**
 * My Team matchup visuals (design-system §9.4, P4 final mockup) — always color +
 * text, never color alone:
 *   MatchupMeter  right-aligned 60px column: 5 bars (7px, 4→20px) over "Good #27"
 *                 (bye: transparent dashed bars + "Bye")
 *   NextFiveBar   micro-bar of the next 5 weeks (18×4 per week, under line 2)
 *   WeekCells     week label ABOVE each 36px cell; cell = opp ("@SEA") over "#11"
 *                 (bye: dashed + "BYE"). Rated cell = solid tier fill, dark text.
 * `data-tier` / `data-bye` stay as stable hooks for tests.
 */

import type { MatchupCell } from '@/lib/myteam/viewModel';
import { rankText, tierColor, TIER_LEVEL } from './style';

const BAR_W = 7;
const BAR_MAX_H = 20;
/** 4→20px in even steps (7.2, 10.4, 13.6, 16.8, 20). */
const BAR_HEIGHTS = [1, 2, 3, 4, 5].map((i) => 4 + (i * (BAR_MAX_H - 4)) / 5);

/** "Great #28", tied "Great T-28", "Bye". */
export function meterText(cell: MatchupCell): string {
  if (cell.kind === 'bye') return 'Bye';
  if (!cell.rating) return '—';
  return `${cell.rating.label} ${rankText(cell.rating.rank, cell.rating.isTied)}`;
}

export function MatchupMeter({ cell, width = 60 }: { cell: MatchupCell; width?: number }) {
  const level = cell.rating ? TIER_LEVEL[cell.rating.tier] : 0;
  const color = cell.rating ? tierColor(cell.rating.tier) : 'var(--subtext)';
  const bye = cell.kind === 'bye';
  return (
    <span
      data-meter
      data-tier={cell.rating?.tier}
      data-bye={bye ? 'true' : undefined}
      className="flex flex-none flex-col items-end"
      style={{ width, gap: 4 }}
    >
      <span data-meter-bars aria-hidden className="flex items-end" style={{ gap: 2, height: BAR_MAX_H }}>
        {BAR_HEIGHTS.map((h, i) => (
          <span
            key={h}
            style={{
              width: BAR_W,
              height: h,
              boxSizing: 'border-box',
              borderRadius: 2,
              ...(bye
                ? { background: 'transparent', border: '1px dashed var(--matchup-bye)' }
                : { background: i < level ? color : 'var(--matchup-track)' }),
            }}
          />
        ))}
      </span>
      <span data-meter-label className="whitespace-nowrap tabular-nums" style={{ fontSize: 11, fontWeight: 800, color: bye ? 'var(--subtext)' : color }}>
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
    <span data-microbar role="img" aria-label={stripLabel(cells)} className="flex" style={{ gap: 3, marginTop: 3 }}>
      {cells.map((c) => (
        <span
          key={c.week}
          style={{
            width: 18,
            height: 4,
            boxSizing: 'border-box',
            borderRadius: 2,
            ...(c.kind === 'bye'
              ? { border: '1px dashed var(--matchup-bye)' }
              : { background: c.rating ? tierColor(c.rating.tier) : 'var(--matchup-track)' }),
          }}
        />
      ))}
    </span>
  );
}

/** Opponent as the mockup writes it: "@SEA" away, "BUF" home, "BYE". */
export function oppShort(cell: MatchupCell): string {
  if (cell.kind === 'bye') return 'BYE';
  if (!cell.opp) return '—';
  return `${cell.home ? '' : '@'}${cell.opp}`;
}

/**
 * One 36px week cell: opp over rank. Rated games are filled solid with the tier
 * color + dark text (bright tier colors only pass contrast with dark text);
 * byes (dashed) and unrated weeks stay dark. `weekInside` puts the week inside (pinned cards).
 */
export function WeekCell({ cell, height = 36, weekInside = false }: { cell: MatchupCell; height?: number; weekInside?: boolean }) {
  const bye = cell.kind === 'bye';
  const filled = !bye && !!cell.rating;
  const fill = cell.rating ? tierColor(cell.rating.tier) : 'var(--nav-bg)';
  const second = weekInside ? `W${cell.week}` : bye ? null : cell.rating ? rankText(cell.rating.rank, cell.rating.isTied) : '—';
  return (
    <span
      data-weekcell
      data-tier={cell.rating?.tier}
      data-bye={bye ? 'true' : undefined}
      className="flex w-full min-w-0 flex-col items-center justify-center"
      style={{
        height,
        borderRadius: 'var(--radius-sm)',
        background: filled ? fill : 'var(--nav-bg)',
        border: bye ? '1px dashed var(--matchup-bye)' : filled ? `1px solid ${fill}` : '1px solid var(--hairline)',
        lineHeight: 1.15,
      }}
    >
      <span className="max-w-full truncate" style={{ fontSize: 11, fontWeight: 800, color: filled ? 'var(--bg)' : bye ? 'var(--subtext)' : 'var(--text)' }}>
        {oppShort(cell)}
      </span>
      {second && (
        <span
          className="tabular-nums"
          style={{
            fontSize: 11,
            fontWeight: weekInside ? 700 : 800,
            color: filled ? 'var(--bg)' : 'var(--subtext)',
            opacity: filled && weekInside ? 0.7 : undefined,
          }}
        >
          {second}
        </span>
      )}
    </span>
  );
}

/** Next-5 cells for an expanded row: "W6" label above each cell. */
export function WeekCells({ cells }: { cells: readonly MatchupCell[] }) {
  if (cells.length === 0) return null;
  return (
    <ol aria-label="Next weeks" className="grid" style={{ gap: 4, gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}>
      {cells.map((c) => (
        <li key={c.week} className="flex min-w-0 flex-col items-center" style={{ gap: 3 }}>
          <span data-weeklabel className="tabular-nums" style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtext)' }}>
            W{c.week}
          </span>
          <WeekCell cell={c} />
        </li>
      ))}
    </ol>
  );
}
