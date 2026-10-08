/**
 * Sticky filter row (design-system §9.4): position pills with counts ("QB 3"),
 * 30px drawn / 44px tap (`.pare-hit44`), gold-bright active ring, plus an
 * "Expand all / Collapse all" text button.
 */

'use client';

import type { FantasyPosition } from '@/lib/myteam/types';

export type PositionFilter = 'ALL' | FantasyPosition;

interface Props {
  counts: ReadonlyArray<{ id: PositionFilter; label: string; count: number }>;
  value: PositionFilter;
  onChange: (f: PositionFilter) => void;
  allExpanded: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export default function FilterRow({ counts, value, onChange, allExpanded, onExpandAll, onCollapseAll }: Props) {
  return (
    <div className="sticky top-0 z-10 -mx-4 flex items-center gap-2 px-4 py-1.5" style={{ background: 'var(--bg-deep)' }}>
      <div role="group" aria-label="Filter by position" className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-[7px]" style={{ scrollbarWidth: 'none' }}>
        {counts.map(({ id, label, count }) => {
          const on = id === value;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(id)}
              className="pare-hit44 touch-optimized flex flex-none items-center justify-center gap-1 rounded-full active:opacity-70"
              style={{
                height: 30,
                minWidth: 44,
                padding: '0 10px',
                background: on ? 'color-mix(in srgb, var(--gold-bright) 8%, var(--nav-bg))' : 'var(--nav-bg)',
                border: on ? '1.5px solid var(--gold-bright)' : '1px solid var(--glass-edge)',
              }}
            >
              <span style={{ fontSize: 11.5, fontWeight: 700, color: on ? 'var(--gold-bright)' : 'var(--text)' }}>{label}</span>
              <span className="tabular-nums" style={{ fontSize: 11, fontWeight: 600, color: on ? 'var(--gold-bright)' : 'var(--subtext)' }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={allExpanded ? onCollapseAll : onExpandAll}
        className="touch-optimized flex-none whitespace-nowrap active:opacity-70"
        style={{ minHeight: 44, minWidth: 44, fontSize: 12, fontWeight: 700, color: 'var(--subtext)' }}
      >
        {allExpanded ? 'Collapse all' : 'Expand all'}
      </button>
    </div>
  );
}
