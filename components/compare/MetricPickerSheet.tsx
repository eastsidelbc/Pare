/**
 * MetricPickerSheet — choose the stats a Compare card shows (Wave B3). Opened from the
 * "Stats" button in a panel header. Lists only metrics the data layer fills for that
 * side (`getAvailableMetrics`), grouped by category; at least 1 picked, no upper limit
 * ("Select all" at the top picks every stat; unticking it goes back to the defaults).
 * Order = the order you picked them (new ones go last). Changes apply as you tap;
 * the host persists them (Compare tabs) or keeps them for the view (Home peek, Leans).
 */

'use client';

import { Check } from 'lucide-react';
import BottomSheet from '@/components/ui/BottomSheet';
import { DEFAULT_DEFENSE_METRICS, DEFAULT_OFFENSE_METRICS, getAvailableMetrics, type MetricDefinition } from '@/lib/metricsConfig';

const CATEGORY_LABEL: Readonly<Record<MetricDefinition['category'], string>> = {
  scoring: 'Scoring',
  passing: 'Passing',
  rushing: 'Rushing',
  efficiency: 'Efficiency',
  defense: 'Defense',
  special: 'Special teams',
  advanced: 'Advanced',
};
const CATEGORY_ORDER: readonly MetricDefinition['category'][] = ['scoring', 'passing', 'rushing', 'efficiency', 'special', 'defense', 'advanced'];

/** Toggle one metric, keeping the picked order; never below 1. */
export function toggleMetric(selected: readonly string[], field: string): string[] {
  if (selected.includes(field)) return selected.length > 1 ? selected.filter((f) => f !== field) : [...selected];
  return [...selected, field];
}

/** Pick every field: what's already picked keeps its order, the rest follow in list order. */
export function selectAllMetrics(selected: readonly string[], fields: readonly string[]): string[] {
  return [...selected.filter((f) => fields.includes(f)), ...fields.filter((f) => !selected.includes(f))];
}

function CheckBox({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className="flex flex-none items-center justify-center"
      style={{ width: 20, height: 20, borderRadius: 'var(--radius-sm)', border: on ? '1.5px solid var(--gold-bright)' : '1.5px solid var(--frame-mid)', background: on ? 'color-mix(in srgb, var(--gold-bright) 18%, transparent)' : 'transparent' }}
    >
      {on && <Check size={13} strokeWidth={3} style={{ color: 'var(--gold-bright)' }} />}
    </span>
  );
}

export default function MetricPickerSheet({
  open,
  onClose,
  type,
  selected,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  type: 'offense' | 'defense';
  selected: readonly string[];
  onChange: (metrics: string[]) => void;
}) {
  const available = getAvailableMetrics(type);
  // `g` (games) is a denominator, not a stat to compare.
  const fields = Object.keys(available).filter((f) => f !== 'g');
  const groups = CATEGORY_ORDER.map((c) => ({ c, fields: fields.filter((f) => available[f].category === c) })).filter((g) => g.fields.length > 0);
  const listed = groups.flatMap((g) => g.fields);
  const defaults = type === 'offense' ? DEFAULT_OFFENSE_METRICS : DEFAULT_DEFENSE_METRICS;
  const allOn = listed.every((f) => selected.includes(f));
  const title = type === 'offense' ? 'Offense stats' : 'Defense stats (allowed)';

  const header = (
    <div className="flex items-center justify-between" style={{ padding: '8px 16px 10px' }}>
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{title}</h2>
        <p className="tabular-nums" aria-live="polite" style={{ fontSize: 11, fontWeight: 600, color: 'var(--subtext)' }}>
          {selected.length} of {listed.length} picked
        </p>
      </div>
      <div className="flex items-center" style={{ gap: 4 }}>
        <button type="button" onClick={() => onChange([...defaults])} className="touch-optimized active:opacity-70" style={{ minHeight: 44, padding: '0 10px', fontSize: 12, fontWeight: 700, color: 'var(--subtext)' }}>
          Reset
        </button>
        <button type="button" onClick={onClose} className="touch-optimized active:opacity-70" style={{ minHeight: 44, padding: '0 10px', fontSize: 13, fontWeight: 800, color: 'var(--gold-bright)' }}>
          Done
        </button>
      </div>
    </div>
  );

  return (
    <BottomSheet open={open} onClose={onClose} label={title} grab="header" header={header} style={{ maxHeight: '80dvh' }}>
      <div className="overflow-y-auto" style={{ padding: '0 12px 16px', overscrollBehavior: 'contain' }}>
        <button
          type="button"
          role="checkbox"
          aria-checked={allOn}
          onClick={() => onChange(allOn ? [...defaults] : selectAllMetrics(selected, listed))}
          className="flex w-full items-center touch-optimized active:opacity-70"
          style={{ minHeight: 44, gap: 10, padding: '0 12px', marginTop: 8, borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline)', background: 'var(--nav-bg)', textAlign: 'left' }}
        >
          <CheckBox on={allOn} />
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>Select all</span>
        </button>
        {groups.map(({ c, fields: list }) => (
          <section key={c} aria-label={CATEGORY_LABEL[c]} style={{ marginTop: 8 }}>
            <h3 style={{ padding: '6px 4px', fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>{CATEGORY_LABEL[c]}</h3>
            <div style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline)', background: 'var(--nav-bg)', overflow: 'hidden' }}>
              {list.map((f, i) => {
                const on = selected.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => onChange(toggleMetric(selected, f))}
                    className="flex w-full items-center touch-optimized active:opacity-70"
                    style={{ minHeight: 44, gap: 10, padding: '0 12px', borderTop: i > 0 ? '1px solid var(--hairline)' : 'none', textAlign: 'left' }}
                  >
                    <CheckBox on={on} />
                    <span className="min-w-0 flex-1">
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{available[f].name}</span>
                      {available[f].description && (
                        <span className="truncate" style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: 'var(--subtext)' }}>
                          {available[f].description}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </BottomSheet>
  );
}
