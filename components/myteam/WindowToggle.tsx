/**
 * Season / Last 4 — the shared glass toggle recipe (design-system §9 rule 7),
 * same as Standings' view toggle. Own LayoutGroup + unique layoutId.
 */

'use client';

import { LayoutGroup } from 'framer-motion';
import ActivePill from '@/components/ui/ActivePill';
import { GlassLabel, glassCapsule } from '@/components/ui/glassControl';
import type { RatingWindow } from '@/lib/myteam/types';

const OPTIONS: ReadonlyArray<{ id: RatingWindow; label: string }> = [
  { id: 'season', label: 'Season' },
  { id: 'last4', label: 'Last 4' },
];

export default function WindowToggle({ value, onChange }: { value: RatingWindow; onChange: (w: RatingWindow) => void }) {
  return (
    <LayoutGroup id="myteam-window">
      <div role="group" aria-label="Rating window" className="flex flex-none items-center rounded-full" style={glassCapsule}>
        {OPTIONS.map(({ id, label }) => {
          const on = id === value;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(id)}
              // pare-hit44: looks 30px tall, taps like 44px (Apple HIG).
              className="pare-hit44 touch-optimized relative rounded-full px-2.5 active:opacity-70"
              style={{ height: 30, fontSize: '11.5px' }}
            >
              {on && <ActivePill layoutId="myteam-window" />}
              <GlassLabel active={on}>{label}</GlassLabel>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
