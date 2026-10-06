/**
 * Compact Ranking Dropdown
 * 
 * Rank-badge dropdown (Floating UI): every team ranked by this metric.
 * Neon Frame "R" look (components/ui/neonMenu) — 40px rows:
 *   [rank badge] [TeamMark] Nickname ............ value
 * TeamMark becomes the team logo when config/teamIdentity.ts 'compareMenus' = 'logo'. Height follows the screen (viewport minus bottom-nav reserve).
 * INTERACTION: Sleek dropdown — spring pop, dimmed backdrop, CSS-staggered rows; listbox/option a11y
 * POSITIONING: Floating UI with auto-flip, shift, and boundary detection
 * PERF (2026-10-03): the badge (trigger) is cheap and always rendered; the menu
 *   (Floating UI + portal + 32-team ranking + sort) only MOUNTS while open, and
 *   unmounts after its exit animation. A Compare pane has 20 badges — before,
 *   every one carried a full hidden menu (60 with neighbor panes mounted).
 */

'use client';

import { memo, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useFloating, flip, shift, offset, autoUpdate, useDismiss, useInteractions, FloatingPortal, size, inline } from '@floating-ui/react';
import type { TeamData } from '@/lib/useNflStats';
import { calculateBulkRanking, type RankingOptions } from '@/lib/useRanking';
import { AVAILABLE_METRICS, formatMetricValue } from '@/lib/metricsConfig';
import { isAverageTeam, isNonSelectableSpecialTeam } from '@/utils/teamHelpers';
import { BarChart3 } from 'lucide-react';
import TeamMark from '@/components/ui/TeamMark';
import TeamIdentity from '@/components/ui/TeamIdentity';
import { getTeamByName, teamNameToAbbr } from '@/lib/teams';
import { MENU_VIEWPORT_PADDING, menuBackdrop, menuHeader, menuMaxHeight, menuRowStyle, menuSurface } from '@/components/ui/neonMenu';
import RankBadge from '@/components/ui/RankBadge';

interface CompactRankingDropdownProps {
  allData: TeamData[];
  metricKey: string;
  currentTeam: string;
  panelType: 'offense' | 'defense';
  onTeamChange: (teamName: string) => void;
  isOpen: boolean;
  /** Trigger tap: open (or close if already open). */
  onToggle: () => void;
  /** Close only (backdrop, outside tap, Esc, team picked). Idempotent — safe if
   *  several close paths fire on the same tap. */
  onClose: () => void;
  ranking: { rank: number; formattedRank: string; isTied: boolean; totalTeams?: number } | null;
  position: 'left' | 'right'; // Team A = left (dropdown appears right), Team B = right (dropdown appears left)
}

interface TeamWithRanking {
  team: TeamData;
  ranking: {
    rank: number;
    formattedRank: string;
    isTied: boolean;
  } | null;
  value: string;
  formattedValue: string;
}

type RankingMenuProps = Omit<CompactRankingDropdownProps, 'onToggle' | 'ranking'> & {
  triggerElement: HTMLElement;
  /** Called after the exit animation finishes → parent unmounts the menu. */
  onExited: () => void;
};

/** The open menu. Mounted only while open (+ its exit animation). */
function RankingMenu({
  allData,
  metricKey,
  currentTeam,
  panelType,
  onTeamChange,
  isOpen,
  onClose,
  position,
  triggerElement,
  onExited,
}: RankingMenuProps) {
  
  const metric = AVAILABLE_METRICS[metricKey];
  
  // Floating UI setup with smart positioning
  // Team A (left) → dropdown appears RIGHT of badge
  // Team B (right) → dropdown appears LEFT of badge
  const { refs, context, x, y, strategy: floatingStrategy } = useFloating({
    strategy: 'fixed',  // Phase 2B: Use viewport positioning
    open: isOpen,
    onOpenChange: (open) => { if (!open) onClose(); },
    elements: { reference: triggerElement },
    placement: position === 'left' ? 'right-start' : 'left-start',
    middleware: [
      offset(8), // 8px gap from trigger
      flip({
        fallbackPlacements: ['bottom-start', 'top-start', 'right-start', 'left-start'],  // Phase 2C: Robust fallbacks
        padding: MENU_VIEWPORT_PADDING
      }),
      shift({
        padding: MENU_VIEWPORT_PADDING // clear of screen edges + bottom nav
      }),
      size({  // HEIGHT follows the screen (taller list on bigger devices)
        padding: MENU_VIEWPORT_PADDING,
        apply({ availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${menuMaxHeight(availableHeight)}px`,
            width: 'min(272px, calc(100vw - 24px))'
          });
        }
      }),
      inline()  // Phase 2C: Better inline element positioning
    ],
    whileElementsMounted: autoUpdate
  });

  const dismiss = useDismiss(context, {
    outsidePress: true,
    escapeKey: true
  });

  const { getFloatingProps } = useInteractions([
    dismiss  // No useClick — open/close is controlled by the parent (isOpen / onToggle / onClose)
  ]);

  // Phase 2H: Body scroll lock (mobile only)
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // Calculate rankings for all teams
  const allTeamRankings = useMemo(() => {
    if (!allData || allData.length === 0 || !metricKey) return {};
    
    const isDefenseMetric = panelType === 'defense';
    const higherIsBetter = isDefenseMetric ? !metric?.higherIsBetter : metric?.higherIsBetter;
    const teamNames = allData.map(team => team.team);
    
    const rankingOptions: RankingOptions = {
      higherIsBetter,
      excludeSpecialTeams: true
    };
    
    return calculateBulkRanking(allData, metricKey, teamNames, rankingOptions);
  }, [allData, metricKey, panelType, metric?.higherIsBetter]);
  
  // Sort teams by rank, append average last
  const sortedTeams: TeamWithRanking[] = useMemo(() => {
    const avgTeam = allData.find(t => isAverageTeam(t.team));
    const regularTeams = allData.filter(t => 
      !isAverageTeam(t.team) &&
      !isNonSelectableSpecialTeam(t.team)
    );
    
    const sorted = regularTeams
      .map(team => {
        const ranking = allTeamRankings[team.team];
        const rawValue = String(team[metricKey] || '0');
        const formattedValue = formatMetricValue(rawValue, metric?.format || 'number');
        
        return {
          team,
          ranking,
          value: rawValue,
          formattedValue
        };
      })
      .filter(item => item.ranking)
      .sort((a, b) => {
        const rankDiff = (a.ranking?.rank || 999) - (b.ranking?.rank || 999);
        if (rankDiff !== 0) return rankDiff;
        // Same rank → alphabetical by team name
        return a.team.team.localeCompare(b.team.team);
      });
    
    // Add average team last
    if (avgTeam) {
      const rawValue = String(avgTeam[metricKey] || '0');
      const formattedValue = formatMetricValue(rawValue, metric?.format || 'number');
      sorted.push({
        team: avgTeam,
        ranking: null,
        value: rawValue,
        formattedValue
      });
    }
    
    return sorted;
  }, [allData, allTeamRankings, metricKey, metric?.format]);
  
  const handleTeamSelect = (teamName: string) => {
    onTeamChange(teamName);
    onClose();
  };

  return (
    <>
      {/* Dropdown Portal - renders at document.body level */}
      <FloatingPortal>
        <AnimatePresence onExitComplete={onExited}>
          {isOpen && (
            <>
              {/* Backdrop — dim + subtle blur for depth */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-40"
                style={menuBackdrop}
                onClick={onClose}
              />
              
              {/* Dropdown Menu - Positioned by Floating UI */}
              <motion.div
                ref={refs.setFloating}
                style={{
                  position: floatingStrategy,  // Phase 2E: Direct positioning
                  top: y ?? 0,
                  left: x ?? 0,
                  ...menuSurface,
                  opacity: (x != null && y != null) ? 1 : 0  // Phase 2F: Hide first-frame flash
                }}
                {...getFloatingProps()}
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                className="z-100 flex flex-col overflow-hidden rounded-[var(--radius-xl)]"
              >
                {/* Header — which stat this list is ranked by */}
                <div className="flex h-8 shrink-0 items-center px-3.5" style={{ borderBottom: '1px solid var(--hairline)' }}>
                  <h3 className="truncate" style={menuHeader}>
                    Ranked · {metric?.name ?? metricKey}
                  </h3>
                </div>
                <div
                  role="listbox"
                  aria-label="Teams ranked by this metric"
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
                >
                {sortedTeams.map((item, index) => {
                  const isAverage = isAverageTeam(item.team.team);
                  const isCurrent = item.team.team === currentTeam;
                  const info = isAverage ? null : getTeamByName(item.team.team);
                  const label = info?.nickname ?? (isAverage ? 'League Avg' : item.team.team);
                  const rankTotal = item.ranking ? allTeamRankings[item.team.team]?.totalTeams : undefined;

                  return (
                    <button
                      key={item.team.team}
                      role="option"
                      aria-selected={isCurrent}
                      aria-label={`${item.ranking ? `${item.ranking.formattedRank}, ` : ''}${item.team.team}, ${item.formattedValue}`}
                      onClick={() => handleTeamSelect(item.team.team)}
                      className="pare-row-in flex w-full items-center gap-1.5 pl-2 pr-3.5 transition-transform active:scale-[0.98] active:opacity-50"
                      style={{ ...menuRowStyle(index, isCurrent), animationDelay: `${Math.min(index, 18) * 12}ms` }}
                    >
                      {/* Rank — same tiered badge as the row (static: no ember in lists) */}
                      <span className="flex w-[42px] shrink-0 justify-center">
                        {isAverage ? (
                          <span style={{ color: 'var(--muted)' }}><BarChart3 size={14} /></span>
                        ) : (
                          <RankBadge rank={item.ranking?.rank ?? null} isTied={item.ranking?.isTied} totalTeams={rankTotal} />
                        )}
                      </span>

                      {isAverage ? (
                        <span className="w-[35px] shrink-0" />
                      ) : (
                        <TeamIdentity abbr={teamNameToAbbr(item.team.team) ?? ''} surface="compareMenus" size={22} slot={35} decorative>
                          <TeamMark teamName={item.team.team} size={14} />
                        </TeamIdentity>
                      )}

                      <span
                        className="min-w-0 flex-1 truncate text-left"
                        style={{ fontSize: 13.5, fontWeight: 800, color: isCurrent ? 'var(--gold-bright)' : isAverage ? 'var(--subtext)' : 'var(--text)' }}
                      >
                        {label}
                      </span>

                      <span className="shrink-0 tabular-nums" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--subtext)' }}>
                        {item.formattedValue}
                      </span>
                    </button>
                  );
                })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </FloatingPortal>
    </>
  );
}

/**
 * Rank badge trigger. Always rendered; owns no Floating UI state. The menu is
 * mounted on open and kept mounted until its exit animation completes.
 */
function CompactRankingDropdown(props: CompactRankingDropdownProps) {
  const { currentTeam, isOpen, onToggle, ranking } = props;
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);
  const [menuMounted, setMenuMounted] = useState(false);

  useEffect(() => {
    if (isOpen) setMenuMounted(true);
  }, [isOpen]);

  let badge: ReactNode;
  if (isAverageTeam(currentTeam)) {
    badge = (
      <span className="inline-flex items-center gap-1 font-bold" style={{ fontSize: '11px', color: 'var(--muted)' }}>
        <BarChart3 size={11} /> AVG
      </span>
    );
  } else if (!ranking) {
    badge = <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>N/A</span>;
  } else {
    // Tiered badge (no emoji). totalTeams = real ranked field size so the
    // bottom-5 tier is right even while data is partial.
    // key = team → a team swap re-mounts the badge so the #32 ember replays.
    badge = <RankBadge key={currentTeam} rank={ranking.rank} isTied={ranking.isTied} totalTeams={ranking.totalTeams} effects />;
  }

  return (
    <>
      <button
        ref={setTrigger}
        onClick={onToggle}
        className="inline-flex items-center leading-none transition-opacity active:opacity-50"
        aria-label={`Ranked ${ranking?.formattedRank || 'N/A'} - tap to change`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {badge}
      </button>
      {(isOpen || menuMounted) && trigger && (
        <RankingMenu {...props} triggerElement={trigger} onExited={() => setMenuMounted(false)} />
      )}
    </>
  );
}

export default memo(CompactRankingDropdown);
