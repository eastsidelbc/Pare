/**
 * ComparePane — the reusable Compare UI for ONE comparison.
 *
 * Renders MobileCompareLayout for every comparison: full (phone pager),
 * inline (Home accordion peek) or quadrant (2×2 grid). Purely presentational —
 * teams, metrics, data + change handlers all arrive as props; NO data fetching,
 * store access, or ranking/bar math here.
 *
 * The desktop panel layout (OffensePanel/DefensePanel → TeamDropdown) was
 * retired 2026-10-02: it was a dead branch. `isMobile` is true at every call
 * site — useIsMobile() is <1024px, the phone pager only runs <768px, and the
 * tablet/desktop quadrant grid hardcodes isMobile — so the desktop `else` never
 * executed. Those components moved to /_to-delete.
 *
 * Fixed-position chrome (offline banner, floating metrics button) is rendered
 * by the parent workspace, NOT here, because a Framer Motion transform on the
 * pager track would otherwise capture `position: fixed` descendants.
 */

'use client';

import { memo } from 'react';
import type { TeamData } from '@/lib/useNflStats';
import MobileCompareLayout from '@/components/mobile/MobileCompareLayout';
import BlankComparePicker from '@/components/compare/BlankComparePicker';

export interface ComparePaneProps {
  /** Retained for call-site compatibility; the desktop layout was retired, so
   *  every pane now renders mobile regardless of this value. */
  isMobile: boolean;
  /** Inline (Home accordion) peek: render the compact panels only, no chrome.
   *  Same Compare UI as the full/tab view — this is the "one component, three
   *  places" from VISION.md, not a duplicate. */
  inline?: boolean;
  /** Quadrant (Compare 2×2) peek: like `inline` but with a tight, balanced
   *  bottom reserve for the floating corner controls. Requires `inline`. */
  quadrant?: boolean;
  teamA: string;
  teamB: string;
  offenseData: TeamData[];
  defenseData: TeamData[];
  selectedOffenseMetrics: string[];
  selectedDefenseMetrics: string[];
  isLoading: boolean;
  /** Retained for call-site compatibility (were used by the retired desktop
   *  panels; the mobile layout uses the single `isLoading`). */
  isLoadingOffense: boolean;
  isLoadingDefense: boolean;
  onTeamAChange: (team: string) => void;
  onTeamBChange: (team: string) => void;
  onOffenseMetricsChange: (metrics: string[]) => void;
  onDefenseMetricsChange: (metrics: string[]) => void;
}

function ComparePane({
  inline = false,
  quadrant = false,
  teamA,
  teamB,
  offenseData,
  defenseData,
  selectedOffenseMetrics,
  selectedDefenseMetrics,
  isLoading,
  onTeamAChange,
  onTeamBChange,
  onOffenseMetricsChange,
  onDefenseMetricsChange,
}: ComparePaneProps) {
  // Blank comparison (created by the "+" on the tab row) → empty state with two
  // inline "Pick team" slots until both teams are chosen. (Never happens for the
  // inline Home/quadrant peek, which always seeds both teams from the matchup.)
  if (!inline && (!teamA || !teamB)) {
    return (
      <BlankComparePicker
        teamA={teamA}
        teamB={teamB}
        offenseData={offenseData}
        onTeamAChange={onTeamAChange}
        onTeamBChange={onTeamBChange}
      />
    );
  }

  // Full (pager) → 'full'; inline Home peek → 'inline'; 2×2 grid → 'quadrant'.
  return (
    <MobileCompareLayout
      variant={inline ? (quadrant ? 'quadrant' : 'inline') : 'full'}
      selectedTeamA={teamA}
      selectedTeamB={teamB}
      onTeamAChange={onTeamAChange}
      onTeamBChange={onTeamBChange}
      offenseData={offenseData}
      defenseData={defenseData}
      selectedOffenseMetrics={selectedOffenseMetrics}
      selectedDefenseMetrics={selectedDefenseMetrics}
      onOffenseMetricsChange={onOffenseMetricsChange}
      onDefenseMetricsChange={onDefenseMetricsChange}
      isLoading={isLoading}
    />
  );
}

// Memoized: props are stable per comparison (teams/metrics/data + handlers keyed
// by id), so an unrelated `setActive` won't re-render other panes.
export default memo(ComparePane);
