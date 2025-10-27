'use client';

import React from 'react';
import ScoreboardRail from './ScoreboardRail';

interface SiteLayoutShellProps {
  children: React.ReactNode;
}

export default function SiteLayoutShell({ children }: SiteLayoutShellProps) {
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<{ awayAbbr: string; homeAbbr: string } | null>(null);

  const handleSelect = (match: { awayAbbr: string; homeAbbr: string }) => {
    setSelected(match);
    setIsDrawerOpen(false);
  };

  return (
    <div className="min-h-screen-dynamic w-full text-white bg-gradient-to-br from-[#070d16] via-[#0b1120] to-[#1e293b]">
      {/* Mobile Header */}
      <div className="flex md:hidden items-center justify-between h-12 px-3 border-b border-slate-800/60 bg-slate-900/50 backdrop-blur-md sticky top-0 z-20">
        <button
          aria-label="Open Games Drawer"
          className="px-2 py-1 rounded-md bg-slate-800/70 border border-slate-700/60"
          onClick={() => setIsDrawerOpen(true)}
        >
          ☰
        </button>
        <div className="text-sm text-slate-300 truncate">
          {selected ? `Selected: ${selected.awayAbbr} @ ${selected.homeAbbr}` : 'Selected: —'}
        </div>
        <div className="w-8" />
      </div>

      {/* Layout */}
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex">
          {/* Desktop Left Rail */}
          <div className="hidden md:block shrink-0" style={{ width: 340 }}>
            <div className="sticky top-0 max-h-screen-dynamic overflow-y-auto border-r border-slate-800/60 bg-slate-900/40">
              <ScoreboardRail onSelect={handleSelect} />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="hidden md:block text-sm text-slate-300 px-4 py-3 border-b border-slate-800/60">
              {selected ? `Selected: ${selected.awayAbbr} @ ${selected.homeAbbr}` : 'Selected: —'}
            </div>
            <div className="px-4 py-4">
              {children}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-30">
          {/* Backdrop */}
          <button
            aria-label="Close Drawer"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsDrawerOpen(false)}
          />
          {/* Drawer Panel */}
          <div
            className="absolute top-0 left-0 h-full bg-slate-900/95 border-r border-slate-800/60 shadow-xl w-[88vw] max-w-[320px]"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between h-12 px-3 border-b border-slate-800/60">
              <div className="text-sm text-slate-300">Games</div>
              <button
                aria-label="Close Drawer"
                className="px-2 py-1 rounded-md bg-slate-800/70 border border-slate-700/60"
                onClick={() => setIsDrawerOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="h-[calc(100%-3rem)] overflow-y-auto">
              <ScoreboardRail onSelect={handleSelect} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


