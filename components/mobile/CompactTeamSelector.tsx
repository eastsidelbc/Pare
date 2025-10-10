/**
 * Compact Team Selector
 * 
 * Team logo dropdown for mobile using Floating UI for professional positioning
 * LAYOUT: theScore compact structure (borderless, responsive height clamp(320px, 50vh, 420px))
 * STYLE: Pare visual design (purple accents, NO borders)
 * INTERACTION: Sleek dropdown, opacity feedback
 * POSITIONING: Floating UI with auto-flip, shift, and boundary detection
 */

'use client';

import { useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useFloating, flip, shift, offset, autoUpdate, useClick, useDismiss, useInteractions, FloatingPortal, size, inline } from '@floating-ui/react';
import type { TeamData } from '@/lib/useNflStats';
import { isAverageTeam, isNonSelectableSpecialTeam, getTeamEmoji, getTeamDisplayLabel } from '@/utils/teamHelpers';
import TeamLogo from '@/components/TeamLogo';
import { d, dumpBox, firstClip, dumpMenuStyles } from '@/debug/traceDropdown';

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
  const { refs, floatingStyles, context, x, y, strategy: floatingStrategy } = useFloating({
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
        fallbackPlacements: ['bottom-start', 'top-start', 'right-start', 'left-start'],  // Phase 2C: Robust fallbacks
        padding: 12
      }),
      shift({
        padding: 12
      }),
      size({  // Phase 2C: Dynamic sizing based on available space
        apply({ availableHeight, elements }) {
          const maxH = Math.min(420, Math.max(280, availableHeight - 16));
          Object.assign(elements.floating.style, {
            maxHeight: `${maxH}px`,
            width: 'min(300px, calc(100vw - 24px))'
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
    dismiss
  ]);

  // Phase 2H: Body scroll lock (mobile only)
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // DEBUG: Trace team selector open/close and ref state
  useEffect(() => {
    if (isOpen) {
      d('team-selector:open', { 
        currentTeam, 
        triggerElement: triggerElement ? 'present' : 'NULL',
        placement: context.placement 
      });
      
      if (triggerElement) {
        dumpBox(triggerElement, 'team-selector:trigger');
      } else {
        d('team-selector:ERROR', 'triggerElement is NULL - Floating UI cannot position!');
      }
      
      firstClip(triggerElement);
      
      // Check menu styles after render
      requestAnimationFrame(() => {
        if (refs.floating.current) {
          dumpMenuStyles(refs.floating.current as HTMLElement, 'team-selector:menu-styles');
          dumpBox(refs.floating.current, 'team-selector:menu-after-update');
        }
      });
    } else {
      d('team-selector:close', { currentTeam });
    }
  }, [isOpen, triggerElement, context, refs, currentTeam]);
  
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
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                style={{ background: 'rgba(0, 0, 0, 0.6)' }}
                onClick={onToggle}
              />
              
              {/* Dropdown Menu - Positioned by Floating UI */}
              <motion.div
                ref={refs.setFloating}
                style={{
                  position: floatingStrategy,  // Phase 2E: Direct positioning
                  top: y ?? 0,
                  left: x ?? 0,
                  opacity: (x != null && y != null) ? 1 : 0  // Phase 2F: Hide first-frame flash
                }}
                {...getFloatingProps()}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="z-[100] rounded-2xl shadow-2xl overflow-auto overscroll-contain pb-[calc(64px+env(safe-area-inset-bottom)+12px)]"  // Phase 2E: Safe area padding
              >
                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.98)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
                  }}
                >
                  {/* Header */}
                  <div 
                    className="px-4 py-3 border-b"
                    style={{ borderColor: 'rgba(139, 92, 246, 0.2)' }}
                  >
                    <h3 className="text-[13px] font-semibold text-slate-300 uppercase tracking-wide">
                      Select Team
                    </h3>
                  </div>
                  
                  {/* Scrollable Team List */}
                  <div 
                    className="overflow-y-auto"
                    style={{ maxHeight: 'clamp(320px, 50vh, 420px)' }}
                  >
                {sortedTeams.map((team, index) => {
                  const isAverage = isAverageTeam(team.team);
                  const emoji = getTeamEmoji(team.team);
                  const displayLabel = isAverage ? getTeamDisplayLabel(team.team) : team.team;
                  const isCurrent = team.team === currentTeam;
                  
                  return (
                    <button
                      key={team.team}
                      onClick={() => handleTeamSelect(team.team)}
                      className="w-full px-4 py-3 flex items-center gap-3 transition-all active:opacity-50"
                      style={{
                        background: isCurrent 
                          ? 'rgba(139, 92, 246, 0.2)' 
                          : 'transparent',
                        borderTop: index > 0 && isAverage 
                          ? '1px solid rgba(139, 92, 246, 0.2)' 
                          : 'none'
                      }}
                    >
                      {/* Logo or Emoji */}
                      {isAverage && emoji ? (
                        <div 
                          className="w-10 h-10 rounded flex items-center justify-center font-bold text-[16px] flex-shrink-0"
                          style={{
                            background: 'rgba(139, 92, 246, 0.3)',
                            color: 'rgb(196, 181, 253)'
                          }}
                        >
                          {emoji}
                        </div>
                      ) : (
                        <div className="flex-shrink-0">
                          <TeamLogo teamName={team.team} size="40" />
                        </div>
                      )}
                      
                      {/* Team Name */}
                      <div className="flex-1 text-left">
                        <div className="text-[14px] font-semibold text-white">
                          {displayLabel}
                        </div>
                      </div>
                      
                      {/* Selected Indicator */}
                      {isCurrent && (
                        <div className="w-2 h-2 rounded-full" style={{ background: 'rgb(139, 92, 246)' }} />
                      )}
                    </button>
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

