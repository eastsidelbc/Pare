/**
 * PropLine — a prop line as a colored arrow + the number: green ▲ over, red ▼ under
 * (design-system §9 rule 3 exception: red = under on prop lines only, always paired
 * with green ▲). The arrow is an image with an "over" / "under" label, so a screen
 * reader hears "over 85.5"; its shape carries the meaning without the color.
 * Anytime TD has no arrow ("TD yes" / "TD no").
 */

import { Triangle } from 'lucide-react';
import { propLineParts } from '@/lib/leans/format';
import type { PropSide, PropStat } from '@/lib/leans/types';

export default function PropLine({ side, line, stat }: { side: PropSide; line: number; stat: PropStat }) {
  const { dir, text } = propLineParts(side, line, stat);
  return (
    <span className="inline-flex items-center tabular-nums" style={{ gap: '0.15em' }}>
      {dir && (
        <span role="img" aria-label={dir} data-line-dir={dir} className="inline-flex">
          <Triangle
            aria-hidden
            fill="currentColor"
            strokeWidth={0}
            style={{
              width: '0.62em',
              height: '0.62em',
              color: dir === 'over' ? 'var(--green)' : 'var(--red)',
              transform: dir === 'under' ? 'rotate(180deg)' : undefined,
            }}
          />
        </span>
      )}
      {text}
    </span>
  );
}
