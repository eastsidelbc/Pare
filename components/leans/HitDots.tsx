/**
 * HitDots — one column per recent game: dot (hit = `--green` + soft glow, its "win"
 * meaning; miss = hollow `--muted` ring), the stat value, the week (B2).
 * Hit = on the side the user typed (an UNDER line: under the number = hit).
 */

import { LEAN_CONFIG } from '@/lib/leans/config';
import type { PropHit } from '@/lib/leans/propLean';
import type { PropSide } from '@/lib/leans/types';

export default function HitDots({ hits, side }: { hits: readonly PropHit[]; side: PropSide }) {
  const shown = hits.slice(-LEAN_CONFIG.prop.dotsShown);
  return (
    <ol
      data-hits
      aria-label="Recent games vs your line"
      className="grid"
      style={{ gap: 4, gridTemplateColumns: `repeat(${LEAN_CONFIG.prop.dotsShown}, minmax(0, 1fr))`, lineHeight: 'normal' }}
    >
      {shown.map((h) => {
        const hit = side === 'over' ? h.over : !h.over;
        return (
          <li key={h.week} data-hit={hit ? 'yes' : 'no'} className="flex flex-col items-center" style={{ gap: 3 }}>
            <span
              aria-hidden
              className="rounded-full"
              style={{
                width: 12,
                height: 12,
                boxSizing: 'border-box',
                ...(hit
                  ? { background: 'var(--green)', boxShadow: '0 0 6px color-mix(in srgb, var(--green) 45%, transparent)' }
                  : { border: '2px solid var(--muted)' }),
              }}
            />
            <span className="tabular-nums" style={{ fontSize: 11, fontWeight: 800, color: 'var(--text)' }}>
              {Number.isInteger(h.value) ? h.value : h.value.toFixed(1)}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--subtext)' }}>W{h.week}</span>
            <span className="sr-only">{hit ? 'hit' : 'miss'}</span>
          </li>
        );
      })}
    </ol>
  );
}
