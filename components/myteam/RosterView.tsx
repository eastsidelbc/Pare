/**
 * Roster list (design-system §9.4, P4 final mockup) — STARTERS · BENCH ·
 * IR / TAXI, each a deep list card (radius 14, hairline rows) under a gold-rule
 * label with its count on the right. IR / TAXI is always open.
 */

'use client';

import type { ReactNode } from 'react';
import type { RosterRow } from '@/lib/myteam/viewModel';
import type { RowLive } from './LivePoints';
import type { DetailContext } from './MatchupDetails';
import RosterRowItem, { type RowActions } from './RosterRowItem';
import { LIST_CARD } from './style';

export interface RosterSection {
  id: 'starters' | 'bench' | 'reserve';
  title: string;
  rows: RosterRow[];
}

/** Gold-rule section label: 11px/800/.18em gold · hairline · count (11/700 subtext) or a control on the right. */
export function SectionHeading({ children, count, right }: { children: ReactNode; count?: number; right?: ReactNode }) {
  return (
    <div data-section-label className="flex items-center" style={{ gap: 10, marginBottom: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', color: 'var(--gold-bright)' }}>{children}</span>
      <span className="h-px flex-1" style={{ background: 'var(--hairline)' }} />
      {count !== undefined && (
        <span data-section-count className="tabular-nums" style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtext)' }}>
          {count}
        </span>
      )}
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
  /** Game day: per-row live points (null = not game week). */
  liveFor?: (row: RosterRow) => RowLive | null;
  /** Game day: the small starters total, right of the STARTERS count. */
  startersRight?: ReactNode;
}

export default function RosterView({ sections, allRows, expanded, onToggle, ctx, actions, startSitIds, liveFor, startersRight }: Props) {
  return (
    <div data-state="roster">
      {sections.map((section) =>
        section.rows.length === 0 ? null : (
          <section key={section.id} data-section={section.id} aria-label={section.title} style={{ paddingTop: 12 }}>
            <SectionHeading count={section.rows.length} right={section.id === 'starters' ? startersRight : undefined}>
              {section.title}
            </SectionHeading>
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
                  live={liveFor?.(row) ?? null}
                />
              ))}
            </ul>
          </section>
        ),
      )}
    </div>
  );
}
