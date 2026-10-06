/**
 * Compact Team Selector
 * 
 * Team picker dropdown (Floating UI). Neon Frame "R" look (components/ui/neonMenu):
 * deep gradient card, hairline rows, gold header. 40px rows with a <TeamMark>
 * (2–3 letter wordmark — no logo artwork). Height follows the screen: as tall
 * as the space below/above the trigger allows, minus the bottom-nav reserve.
 * INTERACTION: Sleek dropdown — spring pop, dimmed backdrop, CSS-staggered rows; listbox/option a11y
 * POSITIONING: Floating UI with auto-flip, shift, and boundary detection
 * FAVORITES (Setup 3): every team row has a star on the right (tap = add/remove
 * from "Your teams", separate from picking the team), and favorites are listed
 * first under a "★ Your teams" header.
 */

'use client';

import { useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useFloating, flip, shift, offset, autoUpdate, useDismiss, useInteractions, FloatingPortal, size, inline } from '@floating-ui/react';
import type { TeamData } from '@/lib/useNflStats';
import { isAverageTeam, isNonSelectableSpecialTeam, getTeamDisplayLabel } from '@/utils/teamHelpers';
import { BarChart3, Star } from 'lucide-react';
import { useFavorites } from '@/components/FavoritesProvider';
import TeamMark from '@/components/ui/TeamMark';
import { getTeamByName } from '@/lib/teams';
import { MENU_VIEWPORT_PADDING, menuBackdrop, menuHeader, menuMaxHeight, menuRowStyle, menuSurface } from '@/components/ui/neonMenu';

interface CompactTeamSelectorProps {
  allTeams: TeamData[];
  currentTeam: string;
  onTeamChange: (teamName: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  triggerElement?: HTMLElement | null;
}

export default function CompactTeamSelector({
  allTeams,
  currentTeam,
  onTeamChange,
  isOpen,
  onToggle,
  triggerElement
}: CompactTeamSelectorProps) {
  
  // Floating UI setup with auto-positioning
  const { refs, context, x, y, strategy: floatingStrategy } = useFloating({
    strategy: 'fixed',  // Phase 2B: Use viewport positioning
    open: isOpen,
    onOpenChange: onToggle,
    placement: 'bottom',
    elements: {
      reference: triggerElement
    },
    middleware: [
      offset(8),
      flip({
        fallbackPlacements: ['top'],  // vertical only — never place sideways off a narrow screen
        padding: MENU_VIEWPORT_PADDING
      }),
      shift({
        padding: MENU_VIEWPORT_PADDING
      }),
      size({  // HEIGHT follows the screen: all the room the viewport allows (width set up-front below)
        padding: MENU_VIEWPORT_PADDING,
        apply({ availableHeight, elements }) {
          elements.floating.style.maxHeight = `${menuMaxHeight(availableHeight)}px`;
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
    dismiss
  ]);

  // Phase 2H: Body scroll lock (mobile only)
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // Sort teams alphabetically, append average last
  const sortedTeams = useMemo(() => {
    const avgTeam = allTeams.find(t => isAverageTeam(t.team));
    const regularTeams = allTeams.filter(t => 
      !isAverageTeam(t.team) &&
      !isNonSelectableSpecialTeam(t.team)
    );
    
    // Sort alphabetically
    const sorted = regularTeams.sort((a, b) => a.team.localeCompare(b.team));
    
    // Add average team last
    if (avgTeam) {
      sorted.push(avgTeam);
    }
    
    return sorted;
  }, [allTeams]);
  
  const handleTeamSelect = (teamName: string) => {
    onTeamChange(teamName);
    onToggle();
  };

  // Favorites first (in Your-teams order), then everyone A→Z as before.
  const { teams: favAbbrs, isFavorite, toggleFavorite } = useFavorites();
  const favoriteTeams = useMemo(
    () =>
      favAbbrs
        .map((abbr) => sortedTeams.find((t) => getTeamByName(t.team)?.abbr === abbr))
        .filter((t): t is TeamData => t != null),
    [favAbbrs, sortedTeams],
  );

  const renderRow = (team: TeamData, index: number, keyPrefix: string) => {
    const isAverage = isAverageTeam(team.team);
    const displayLabel = isAverage ? getTeamDisplayLabel(team.team) : team.team;
    const isCurrent = team.team === currentTeam;
    const info = isAverage ? null : getTeamByName(team.team);
    const fav = info ? isFavorite(info.abbr) : false;

    return (
      <div
        key={`${keyPrefix}-${team.team}`}
        className="pare-row-in flex w-full items-center"
        style={{ ...menuRowStyle(index, isCurrent), animationDelay: `${Math.min(index, 18) * 12}ms` }}
      >
        <button
          role="option"
          aria-selected={isCurrent}
          aria-label={displayLabel}
          onClick={() => handleTeamSelect(team.team)}
          className="flex h-full min-w-0 flex-1 items-center gap-2 pl-1.5 transition-transform active:scale-[0.98] active:opacity-50"
        >
          {isAverage ? (
            <span className="flex w-[38px] shrink-0 justify-center" style={{ color: 'var(--muted)' }}>
              <BarChart3 size={16} />
            </span>
          ) : (
            <TeamMark teamName={team.team} size={15} />
          )}

          {/* City (small caps) over nickname — the wordmark voice, compressed */}
          <span className="min-w-0 flex-1 text-left leading-none">
            {info ? (
              <>
                <span className="block truncate" style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--muted)' }}>
                  {info.location.toUpperCase()}
                </span>
                <span className="mt-[3px] block truncate" style={{ fontSize: 14, fontWeight: 800, color: isCurrent ? 'var(--gold-bright)' : 'var(--text)' }}>
                  {info.nickname}
                </span>
              </>
            ) : (
              <span className="block truncate" style={{ fontSize: 13, fontWeight: 700, color: 'var(--subtext)' }}>
                {displayLabel}
              </span>
            )}
          </span>

          {isCurrent && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--gold-bright)', boxShadow: '0 0 6px var(--gold-bright)' }} />
          )}
        </button>

        {info && (
          <button
            type="button"
            onClick={() => toggleFavorite(info.abbr)}
            aria-pressed={fav}
            aria-label={fav ? `Remove ${info.name} from Your teams` : `Add ${info.name} to Your teams`}
            className="flex h-full w-11 shrink-0 items-center justify-center touch-optimized active:scale-90"
          >
            <Star
              size={17}
              strokeWidth={1.8}
              fill={fav ? 'currentColor' : 'none'}
              style={{ color: fav ? 'var(--gold-bright)' : 'var(--muted)' }}
              aria-hidden
            />
          </button>
        )}
      </div>
    );
  };
  
  return (
    <>
      {/* Trigger element - managed by parent (team logo in header) */}
      {/* Parent should wrap logo with: <div ref={refs.setReference} {...getReferenceProps()} onClick={onToggle}>...</div> */}
      
      {/* Dropdown Portal - renders at document.body level */}
      <FloatingPortal>
        <AnimatePresence>
          {isOpen && triggerElement && (  // Phase 2G: Guard null reference
            <>
              {/* Backdrop — dim + subtle blur for depth */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-40"
                style={menuBackdrop}
                onClick={onToggle}
              />
              
              {/* Dropdown Menu - Positioned by Floating UI */}
              <motion.div
                ref={refs.setFloating}
                style={{
                  position: floatingStrategy,  // Phase 2E: Direct positioning
                  top: y ?? 0,
                  left: x ?? 0,
                  // Clamp width UP FRONT so Floating UI measures the real width
                  // before shift/flip run — otherwise it positions a too-wide box
                  // then shrinks it, leaving it off-screen on narrow phones.
                  width: 'min(280px, calc(100vw - 24px))',
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
                  {/* Header */}
                  <div className="flex h-8 shrink-0 items-center px-3.5" style={{ borderBottom: '1px solid var(--hairline)' }}>
                    <h3 id="team-selector-label" style={menuHeader}>
                      Select Team
                    </h3>
                  </div>

                  {/* Scrollable Team List — fills whatever height the screen allows */}
                  <div
                    role="listbox"
                    aria-labelledby="team-selector-label"
                    className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
                  >
                {favoriteTeams.length > 0 && (
                  <>
                    <div className="flex h-7 items-center gap-1.5 px-3.5" style={{ ...menuHeader, borderBottom: '1px solid var(--hairline)' }}>
                      <Star size={10} fill="currentColor" strokeWidth={0} aria-hidden />
                      Your teams
                    </div>
                    {favoriteTeams.map((team, index) => renderRow(team, index, 'fav'))}
                    <div className="flex h-7 items-center px-3.5" style={{ ...menuHeader, color: 'var(--muted)', borderTop: '1px solid var(--hairline)', borderBottom: '1px solid var(--hairline)' }}>
                      All teams
                    </div>
                  </>
                )}
                {sortedTeams.map((team, index) => renderRow(team, index, 'all'))}
                  </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </FloatingPortal>
    </>
  );
}
