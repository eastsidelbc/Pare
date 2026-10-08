/**
 * Sticky filter row (design-system §9.4, P4 final mockup): position pills with
 * counts side by side ("QB 3" — 30px, padding 0 9, gap 5, 12px label + 11px
 * count; gold-bright active ring) and "Expand all / Collapse all" (12/700 gold)
 * pinned on the right. Real leagues add K / DEF / IR-Taxi pills, so the pill
 * group scrolls sideways inside its own row (hidden scrollbar) — nothing clips
 * and "Expand all" never moves. `.pare-hit44` keeps 44px taps; the scroller's
 * 7px block padding gives that tap zone room inside the overflow box.
 */

'use client';

import type { FantasyPosition } from '@/lib/myteam/types';

export type PositionFilter = 'ALL' | FantasyPosition | 'RES';

interface Props {
  counts: ReadonlyArray<{ id: PositionFilter; label: string; aria: string; count: number }>;
  value: PositionFilter;
  onChange: (f: PositionFilter) => void;
  anyExpanded: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export default function FilterRow({ counts, value, onChange, anyExpanded, onExpandAll, onCollapseAll }: Props) {
  return (
    <div
      data-filter-row
      className="sticky top-0 z-10 -mx-4 flex items-center px-4"
      style={{ gap: 6, padding: '1px 16px', marginTop: 2, background: 'var(--bg-deep)', borderBottom: '1px solid var(--hairline)' }}
    >
      <div
        role="group"
        aria-label="Filter by position"
        data-pill-scroller
        className="flex min-w-0 flex-1 overflow-x-auto"
        style={{ gap: 5, padding: '7px 0', scrollbarWidth: 'none', overscrollBehaviorX: 'contain' }}
      >
        {counts.map(({ id, label, aria, count }) => {
          const on = id === value;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              aria-label={aria}
              onClick={() => onChange(id)}
              className="pare-hit44 touch-optimized inline-flex flex-none items-center whitespace-nowrap rounded-full active:opacity-70"
              style={{
                height: 30,
                minWidth: 44,
                justifyContent: 'center',
                gap: 4,
                padding: '0 9px',
                fontSize: 12,
                fontWeight: on ? 800 : 600,
                color: on ? 'var(--gold-bright)' : 'var(--subtext)',
                background: on ? 'color-mix(in srgb, var(--gold-bright) 8%, var(--nav-bg))' : 'var(--nav-bg)',
                border: on ? '1.5px solid var(--gold-bright)' : '1px solid var(--glass-edge)',
              }}
            >
              <span>{label}</span>
              <span className="tabular-nums" style={{ fontSize: 11, fontWeight: 700, color: on ? 'var(--gold-bright)' : 'var(--subtext)' }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={anyExpanded ? onCollapseAll : onExpandAll}
        className="touch-optimized flex-none whitespace-nowrap active:opacity-70"
        style={{ height: 44, minWidth: 44, paddingLeft: 6, fontSize: 12, fontWeight: 700, color: 'var(--gold-bright)' }}
      >
        {anyExpanded ? 'Collapse all' : 'Expand all'}
      </button>
    </div>
  );
}
