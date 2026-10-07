/**
 * My Team chips — SKELETON styling (P3): neutral existing tokens only, text
 * label + rank ("Good · #24"). The 5-step color family arrives in the P5
 * design pass (design-system §9.4); `data-tier` / `data-injury` / `data-bye`
 * stay as stable hooks for tests and that restyle.
 */

import type { CSSProperties } from 'react';
import type { InjuryTag as InjuryTagValue } from '@/lib/myteam/types';
import type { MatchupCell } from '@/lib/myteam/viewModel';

const CHIP: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  height: 22,
  padding: '0 8px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--frame-mid)',
  background: 'var(--card-deep-a)',
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: 'nowrap',
  fontVariantNumeric: 'tabular-nums',
};

/** The rating chip for one matchup cell: tier label + rank, BYE, or a dash. */
export function MatchupChip({ cell }: { cell: MatchupCell }) {
  if (cell.kind === 'bye') {
    return (
      <span data-bye="true" style={{ ...CHIP, color: 'var(--subtext)' }}>
        BYE
      </span>
    );
  }
  if (!cell.rating) {
    return (
      <span aria-label="No rating" style={{ ...CHIP, color: 'var(--subtext)' }}>
        —
      </span>
    );
  }
  const { tier, text, label, formattedRank } = cell.rating;
  return (
    <span data-tier={tier} aria-label={`${label} matchup, ranked ${formattedRank}`} style={{ ...CHIP, color: 'var(--text)' }}>
      {text}
    </span>
  );
}

const INJURY_LABEL: Record<InjuryTagValue, string> = { Q: 'Questionable', D: 'Doubtful', O: 'Out', IR: 'Injured reserve' };

export function InjuryTag({ tag }: { tag: InjuryTagValue }) {
  return (
    <span
      data-injury={tag}
      title={INJURY_LABEL[tag]}
      aria-label={INJURY_LABEL[tag]}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 16,
        padding: '0 4px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--frame-mid)',
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: '0.04em',
        color: 'var(--text)',
      }}
    >
      {tag}
    </span>
  );
}
