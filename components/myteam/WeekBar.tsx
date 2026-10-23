/**
 * Week bar (design-system §9.4, P4 final mockup), above the sticky pills:
 * "WEEK n" (13/900, .08em) + date range (11/600 subtext). The Season | Last 4
 * toggle lives in the sticky filter row (WindowControl) so it stays in reach.
 */

'use client';

interface Props {
  week: number | null;
  dateRange: string | null;
}

export default function WeekBar({ week, dateRange }: Props) {
  return (
    <div data-weekbar className="flex items-center" style={{ minHeight: 42, padding: '10px 0 2px' }}>
      <div className="flex min-w-0 items-baseline" style={{ gap: 8 }}>
        <span className="whitespace-nowrap tabular-nums" style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.08em', color: 'var(--text)' }}>
          {week ? `WEEK ${week}` : 'THIS WEEK'}
        </span>
        {dateRange && (
          <span className="truncate" style={{ fontSize: 11, fontWeight: 600, color: 'var(--subtext)' }}>
            {dateRange}
          </span>
        )}
      </div>
    </div>
  );
}
