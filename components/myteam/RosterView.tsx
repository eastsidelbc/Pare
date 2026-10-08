/**
 * Roster list (design-system §9.4) — STARTERS · BENCH · IR / TAXI, each a deep
 * list card with hairline rows. IR / TAXI is always open. Rows expand in place.
 */

'use client';

import type { ReactNode } from 'react';
import type { RosterRow } from '@/lib/myteam/viewModel';
import type { DetailContext } from './MatchupDetails';
import RosterRowItem, { type RowActions } from './RosterRowItem';
import { LIST_CARD } from './style';

export interface RosterSection {
  id: 'starters' | 'bench' | 'reserve';
  title: string;
  rows: RosterRow[];
}

/** Gold-rule section label: 11px/800/.18em + hairline; `right` reserves the P6 starters total. */
export function SectionHeading({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div
      className="mb-2 mt-4 flex items-center gap-2"
      style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--gold-bright)' }}
    >
      {children}
      <span className="h-px flex-1" style={{ background: 'var(--hairline)' }} />
      {right}
    </div>
  );
}

interface Props {
  sections: RosterSection[];
  allRows: readonly RosterRow[];
  expanded: ReadonlySet<string>;
  onToggle: (playerId: string) => void;
  ctx: DetailContext;
  actions: RowActions;
  /** Sandbox: rows that open on the Start / Sit panel. */
  startSitIds?: ReadonlySet<string>;
}

export default function RosterView({ sections, allRows, expanded, onToggle, ctx, actions, startSitIds }: Props) {
  return (
    <div data-state="roster">
      {sections.map((section) =>
        section.rows.length === 0 ? null : (
          <section key={section.id} data-section={section.id} aria-label={section.title}>
            <SectionHeading>{section.title}</SectionHeading>
            <ul className="divide-y divide-[var(--hairline)] overflow-hidden" style={LIST_CARD}>
              {section.rows.map((row) => (
                <RosterRowItem
                  key={row.player.playerId}
                  row={row}
                  allRows={allRows}
                  expanded={expanded.has(row.player.playerId)}
                  onToggle={onToggle}
                  ctx={ctx}
                  actions={actions}
                  initialStartSit={startSitIds?.has(row.player.playerId)}
                />
              ))}
            </ul>
          </section>
        ),
      )}
    </div>
  );
}
