/**
 * Look-ahead strip — the next weeks' opponents, each with its chip. Plain CSS
 * horizontal scroll with snap (no JS, no animation). Length comes from the
 * view model (LOOKAHEAD_WEEKS, temporary until the P4 mockup pick).
 */

import { matchupText, type MatchupCell } from '@/lib/myteam/viewModel';
import { MatchupChip } from './MatchupChip';

export default function LookAheadStrip({ cells }: { cells: MatchupCell[] }) {
  if (cells.length === 0) return null;
  return (
    <ol
      aria-label="Upcoming matchups"
      className="flex gap-1.5 overflow-x-auto"
      style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none', overscrollBehaviorX: 'contain' }}
    >
      {cells.map((cell) => (
        <li
          key={cell.week}
          className="flex flex-none flex-col items-start gap-1 rounded-md px-1.5 py-1"
          style={{ scrollSnapAlign: 'start', border: '1px solid var(--hairline)', minWidth: 92 }}
        >
          <span className="tabular-nums" style={{ fontSize: 10, fontWeight: 700, color: 'var(--subtext)' }}>
            W{cell.week} · {matchupText(cell)}
          </span>
          <MatchupChip cell={cell} />
        </li>
      ))}
    </ol>
  );
}
