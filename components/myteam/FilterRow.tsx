/**
 * Sticky filter row (design-system §9.4, P4 final mockup): position pills with
 * counts side by side ("QB 3" — 30px, padding 0 9, gap 5, 12px label + 11px
 * count; gold-bright active ring) and "Expand all / Collapse all" (12/700 gold)
 * pinned on the right. No IR/Taxi pill — that section is always open (P4 G5).
 *
 * When K / DEF make the pills wider than the row, the pill group scrolls
 * sideways inside its own row (hidden scrollbar) and FADES at the edge that
 * has more pills past it (right while not at the end, left once scrolled), so a
 * clipped pill reads as "more this way". No fade when everything fits.
 * `.pare-hit44` keeps 44px taps; the scroller's 7px block padding gives that
 * tap zone room inside the overflow box.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FantasyPosition } from '@/lib/myteam/types';

export type PositionFilter = 'ALL' | FantasyPosition;

/** Which edges have pills hidden past them. */
type Fade = 'none' | 'left' | 'right' | 'both';

const FADE_PX = 28;
/** Mask (alpha only) — opaque in the middle, transparent at a faded edge. */
const MASK: Record<Exclude<Fade, 'none'>, string> = {
  right: `linear-gradient(to right, black calc(100% - ${FADE_PX}px), transparent)`,
  left: `linear-gradient(to right, transparent, black ${FADE_PX}px)`,
  both: `linear-gradient(to right, transparent, black ${FADE_PX}px, black calc(100% - ${FADE_PX}px), transparent)`,
};

interface Props {
  counts: ReadonlyArray<{ id: PositionFilter; label: string; aria: string; count: number }>;
  value: PositionFilter;
  onChange: (f: PositionFilter) => void;
  anyExpanded: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export default function FilterRow({ counts, value, onChange, anyExpanded, onExpandAll, onCollapseAll }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [fade, setFade] = useState<Fade>('none');

  const measure = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const left = el.scrollLeft > 1;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setFade(left && right ? 'both' : left ? 'left' : right ? 'right' : 'none');
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    el.addEventListener('scroll', measure, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', measure);
    };
  }, [measure, counts.length]);

  const mask = fade === 'none' ? undefined : MASK[fade];

  return (
    <div
      data-filter-row
      className="sticky top-0 z-10 -mx-4 flex items-center px-4"
      style={{ gap: 6, padding: '1px 16px', marginTop: 2, background: 'var(--bg-deep)', borderBottom: '1px solid var(--hairline)' }}
    >
      <div
        ref={scrollerRef}
        role="group"
        aria-label="Filter by position"
        data-pill-scroller
        data-fade={fade}
        className="flex min-w-0 flex-1 overflow-x-auto"
        style={{
          gap: 5,
          padding: '7px 0',
          scrollbarWidth: 'none',
          overscrollBehaviorX: 'contain',
          // Horizontal swipes scroll the pills; vertical ones still scroll the page.
          touchAction: 'pan-x pan-y',
          maskImage: mask,
          WebkitMaskImage: mask,
        }}
      >
        {counts.map(({ id, label, aria, count }) => {
          const on = id === value;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              aria-label={aria}
              onClick={(e) => {
                onChange(id);
                // A tapped pill half under the fade slides fully into view.
                e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
              }}
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
