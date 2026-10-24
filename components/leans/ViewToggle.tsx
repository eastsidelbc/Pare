/**
 * ViewToggle — two-option glass toggle for Leans tables (design-system §9 rule 7, the
 * WindowToggle recipe): own LayoutGroup + unique layoutId per use.
 */

'use client';

import { LayoutGroup } from 'framer-motion';
import ActivePill from '@/components/ui/ActivePill';
import { GlassLabel, glassCapsule } from '@/components/ui/glassControl';

export interface ViewToggleProps<T extends string> {
  id: string;
  label: string;
  options: ReadonlyArray<{ id: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}

export default function ViewToggle<T extends string>({ id, label, options, value, onChange }: ViewToggleProps<T>) {
  return (
    <LayoutGroup id={id}>
      <div role="group" aria-label={label} className="flex flex-none items-center rounded-full" style={glassCapsule}>
        {options.map((o) => {
          const on = o.id === value;
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(o.id)}
              // pare-hit44: looks 30px tall, taps like 44px (Apple HIG).
              className="pare-hit44 touch-optimized relative rounded-full px-2.5 active:opacity-70"
              style={{ height: 30, fontSize: '11.5px' }}
            >
              {on && <ActivePill layoutId={id} />}
              <GlassLabel active={on}>{o.label}</GlassLabel>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
