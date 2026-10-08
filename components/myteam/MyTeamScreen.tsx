/**
 * My Team roster screen (design-system §9.4): week bar → sticky filter row →
 * STARTERS · BENCH · IR / TAXI, rows expanding in place. iPad (md+) adds the
 * PINNED side panel. Presentational over a bundle so the live app (MyTeamApp)
 * and the dev sandbox render the exact same markup.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useOpenInCompare } from '@/lib/hooks/useOpenInCompare';
import type { LeagueBundle } from '@/lib/myteam/apiTypes';
import { FANTASY_POSITIONS, type RatingWindow } from '@/lib/myteam/types';
import { buildRosterView, weekKickoffRange, type RosterRow } from '@/lib/myteam/viewModel';
import FilterRow, { type PositionFilter } from './FilterRow';
import type { DetailContext } from './MatchupDetails';
import { MAX_COMPARISONS_NOTICE } from './notice';
import Onboarding from './Onboarding';
import PinnedPanel from './PinnedPanel';
import RosterView, { type RosterSection } from './RosterView';
import { dateRangeText } from './style';
import WeekBar from './WeekBar';

interface Props {
  bundle: LeagueBundle;
  window: RatingWindow;
  onWindowChange: (w: RatingWindow) => void;
  /** Name of the league being switched to (the roster dims meanwhile). */
  switchingName?: string | null;
  /** Pre-draft "Check again". */
  onRetry?: () => void;
  /** Sandbox: initial open rows / pins / Start / Sit panels. */
  initialExpanded?: string[];
  initialPins?: string[];
  initialPinnedOpen?: string[];
  startSitIds?: string[];
}

function toggleIn(set: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export default function MyTeamScreen({
  bundle, window, onWindowChange, switchingName = null, onRetry,
  initialExpanded = [], initialPins = [], initialPinnedOpen = [], startSitIds,
}: Props) {
  const vm = useMemo(() => buildRosterView(bundle, window), [bundle, window]);
  const allRows = useMemo(() => [...vm.starters, ...vm.bench, ...vm.reserve], [vm]);
  const [filter, setFilter] = useState<PositionFilter>('ALL');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(initialExpanded));
  const [pins, setPins] = useState<string[]>(initialPins);
  const [pinnedOpen, setPinnedOpen] = useState<Set<string>>(() => new Set(initialPinnedOpen));
  const [notice, setNotice] = useState<string | null>(null);
  const startSit = useMemo(() => new Set(startSitIds ?? []), [startSitIds]);
  const openInCompare = useOpenInCompare();

  // A different league's roster → start closed, unfiltered, nothing pinned.
  const leagueId = bundle.league.leagueId;
  const [shownLeague, setShownLeague] = useState(leagueId);
  if (shownLeague !== leagueId) {
    setShownLeague(leagueId);
    setFilter('ALL');
    setExpanded(new Set());
    setPins([]);
    setPinnedOpen(new Set());
  }

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2200);
    return () => clearTimeout(t);
  }, [notice]);

  const onOpenCompare = (team: string, opp: string) => {
    if (openInCompare(team, opp) === 'full') setNotice(MAX_COMPARISONS_NOTICE);
  };

  const keep = (r: RosterRow) => filter === 'ALL' || r.player.position === filter;
  const sections: RosterSection[] = [
    { id: 'starters', title: 'Starters', rows: vm.starters.filter(keep) },
    { id: 'bench', title: 'Bench', rows: vm.bench.filter(keep) },
    { id: 'reserve', title: 'IR / Taxi', rows: vm.reserve.filter(keep) },
  ];
  const visibleIds = sections.flatMap((s) => s.rows.map((r) => r.player.playerId));
  const allExpanded = visibleIds.length > 0 && visibleIds.every((id) => expanded.has(id));

  const counts = [
    { id: 'ALL' as const, label: 'All', count: allRows.length },
    ...FANTASY_POSITIONS.map((p) => ({ id: p, label: p, count: allRows.filter((r) => r.player.position === p).length })).filter((c) => c.count > 0),
  ];

  const ctx: DetailContext = { window, format: bundle.league.format, defenseLog: bundle.defenseLog, offenseLog: bundle.offenseLog };
  const pinnedRows = pins.map((id) => allRows.find((r) => r.player.playerId === id)).filter((r): r is RosterRow => !!r);

  const weekBar = (
    <WeekBar week={bundle.week} dateRange={dateRangeText(weekKickoffRange(bundle.schedule, bundle.week))} window={window} onWindowChange={onWindowChange} />
  );

  if (vm.preDraft) {
    return (
      <>
        {weekBar}
        <Onboarding state="predraft" leagueName={bundle.league.name} onRetry={onRetry} />
      </>
    );
  }

  return (
    <>
      {weekBar}
      <FilterRow
        counts={counts}
        value={filter}
        onChange={setFilter}
        allExpanded={allExpanded}
        onExpandAll={() => setExpanded(new Set([...expanded, ...visibleIds]))}
        onCollapseAll={() => setExpanded(new Set())}
      />

      <div className="md:grid md:grid-cols-[minmax(0,1fr)_340px] md:gap-5 lg:grid-cols-[minmax(0,1fr)_440px]">
        <div
          aria-busy={switchingName ? true : undefined}
          style={{ opacity: switchingName ? 0.45 : 1, transition: 'opacity .2s', pointerEvents: switchingName ? 'none' : undefined }}
        >
          <RosterView
            sections={sections}
            allRows={allRows}
            expanded={expanded}
            onToggle={(id) => setExpanded((cur) => toggleIn(cur, id))}
            ctx={ctx}
            startSitIds={startSit}
            actions={{
              onOpenCompare,
              isPinned: (id) => pins.includes(id),
              onTogglePin: (id) => setPins((cur) => (cur.includes(id) ? cur.filter((p) => p !== id) : [...cur, id])),
            }}
          />
        </div>
        <PinnedPanel
          rows={pinnedRows}
          open={pinnedOpen}
          onToggle={(id) => setPinnedOpen((cur) => toggleIn(cur, id))}
          onUnpin={(id) => setPins((cur) => cur.filter((p) => p !== id))}
          onClear={() => setPins([])}
          ctx={ctx}
          onOpenCompare={onOpenCompare}
        />
      </div>

      {(switchingName || notice) && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 z-[70] flex justify-center"
          style={{ bottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom) + 16px)' }}
        >
          <div
            className="whitespace-nowrap rounded-full"
            style={{
              padding: '10px 16px', fontSize: 12, fontWeight: 700, color: 'var(--text)',
              background: 'var(--card-deep-a)', border: '1px solid var(--frame-mid)', boxShadow: 'var(--shadow-pop)',
            }}
          >
            {switchingName ? `Loading ${switchingName}…` : notice}
          </div>
        </div>
      )}
    </>
  );
}
