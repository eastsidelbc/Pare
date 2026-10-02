/**
 * Compact Team Selector
 * 
 * Team logo dropdown for mobile using Floating UI for professional positioning
 * LAYOUT: theScore compact structure (borderless, responsive height clamp(320px, 50vh, 420px))
 * STYLE: Pare design tokens (gold accents)
 * INTERACTION: Sleek dropdown — spring pop, blurred backdrop, staggered rows; listbox/option a11y
 * POSITIONING: Floating UI with auto-flip, shift, and boundary detection
 */

'use client';

import { useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useFloating, flip, shift, offset, autoUpdate, useDismiss, useInteractions, FloatingPortal, size, inline } from '@floating-ui/react';
import type { TeamData } from '@/lib/useNflStats';
import { isAverageTeam, isNonSelectableSpecialTeam, getTeamDisplayLabel } from '@/utils/teamHelpers';
import { BarChart3 } from 'lucide-react';
import TeamLogo from '@/components/TeamLogo';

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
        padding: 12
      }),
      shift({
        padding: 12
      }),
      size({  // constrain HEIGHT to available space (width is set up-front below)
        apply({ availableHeight, elements }) {
          const maxH = Math.min(420, Math.max(280, availableHeight - 16));
          elements.floating.style.maxHeight = `${maxH}px`;
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
                style={{
                  background: 'rgba(0, 0, 0, 0.45)',
                  backdropFilter: 'blur(3px)',
                  WebkitBackdropFilter: 'blur(3px)'
                }}
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
                  width: 'min(300px, calc(100vw - 24px))',
                  boxShadow: 'var(--shadow-pop)',
                  opacity: (x != null && y != null) ? 1 : 0  // Phase 2F: Hide first-frame flash
                }}
                {...getFloatingProps()}
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                className="z-100 rounded-[var(--radius-xl)] overflow-auto overscroll-contain pb-[calc(64px+env(safe-area-inset-bottom)+12px)]"  // Phase 2E: Safe area padding
              >
                <div
                  style={{
                    background: 'var(--card)'
                  }}
                >
                  {/* Header */}
                  <div 
                    className="px-4 py-3 border-b"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <h3 id="team-selector-label" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--gold)' }}>
                      Select Team
                    </h3>
                  </div>
                  
                  {/* Scrollable Team List */}
                  <div 
                    role="listbox"
                    aria-labelledby="team-selector-label"
                    className="overflow-y-auto"
                    style={{ maxHeight: 'clamp(320px, 50vh, 420px)' }}
                  >
                {sortedTeams.map((team, index) => {
                  const isAverage = isAverageTeam(team.team);
                  const displayLabel = isAverage ? getTeamDisplayLabel(team.team) : team.team;
                  const isCurrent = team.team === currentTeam;
                  
                  return (
                    <motion.button
                      key={team.team}
                      role="option"
                      aria-selected={isCurrent}
                      onClick={() => handleTeamSelect(team.team)}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, delay: Math.min(index, 18) * 0.015 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full px-4 py-3 flex items-center gap-3 active:opacity-50"
                      style={{
                        background: isCurrent 
                          ? 'color-mix(in srgb, var(--gold) 10%, transparent)' 
                          : 'transparent',
                        borderTop: index > 0 
                          ? `1px solid var(--border)` 
                          : 'none',
                        boxShadow: isCurrent ? 'inset 3px 0 0 0 var(--gold)' : undefined
                      }}
                    >
                      {/* Logo or average icon */}
                      {isAverage ? (
                        <div 
                          className="w-10 h-10 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0"
                          style={{
                            background: 'color-mix(in srgb, var(--muted) 15%, transparent)',
                            color: 'var(--muted)'
                          }}
                        >
                          <BarChart3 size={18} />
                        </div>
                      ) : (
                        <div className="shrink-0">
                          <TeamLogo teamName={team.team} size="40" />
                        </div>
                      )}
                      
                      {/* Team Name */}
                      <div className="flex-1 text-left">
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                          {displayLabel}
                        </div>
                      </div>
                      
                      {/* Selected Indicator — gold dot */}
                      {isCurrent && (
                        <div className="w-2 h-2 rounded-full" style={{ background: 'var(--gold)' }} />
                      )}
                    </motion.button>
                  );
                })}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </FloatingPortal>
    </>
  );
}
