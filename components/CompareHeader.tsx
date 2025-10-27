'use client';

import React from 'react';
import TeamLogo from './TeamLogo';
import { useSelection } from './SelectionContext';
import { abbrToName } from '@/utils/teamAbbr';
import { formatHomeSpread, formatTotal } from '@/utils/odds';

function formatStatus(selected?: { status?: string; quarter?: number; clock?: string; kickoffIso?: string | null }) {
  if (!selected) return '';
  const status = selected.status as ('LIVE' | 'UPCOMING' | 'FINAL' | undefined);
  if (status === 'LIVE') {
    const q = selected.quarter ? `Q${selected.quarter}` : '';
    return `${q} ${selected.clock || ''}`.trim();
  }
  if (status === 'FINAL') return 'Final';
  if (status === 'UPCOMING' && selected.kickoffIso) {
    try {
      const d = new Date(selected.kickoffIso);
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return 'TBD';
    }
  }
  return '';
}

export default function CompareHeader() {
  const { selectedGame, swap, toggleSwap } = useSelection();

  const awayAbbr = selectedGame?.awayAbbr || '';
  const homeAbbr = selectedGame?.homeAbbr || '';
  const showSkeleton = !awayAbbr || !homeAbbr;
  const leftAbbr = swap ? homeAbbr : awayAbbr;
  const rightAbbr = swap ? awayAbbr : homeAbbr;

  const leftName = abbrToName(leftAbbr) || leftAbbr;
  const rightName = abbrToName(rightAbbr) || rightAbbr;

  const status = formatStatus(selectedGame || undefined);
  const spread = selectedGame?.spread !== undefined ? formatHomeSpread(rightAbbr, selectedGame.spread as any) : '';
  const total = selectedGame?.total !== undefined ? `O/U ${formatTotal(selectedGame.total as any)}` : '';

  // logging removed

  if (showSkeleton) {
    return (
      <div className="w-full bg-slate-900/60 border border-slate-800/60 rounded-xl px-3 py-2">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-slate-800/70 rounded w-1/2" />
          <div className="h-3 bg-slate-800/70 rounded w-1/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800/60 rounded-xl px-3 py-2 flex items-center gap-3">
      {/* Left team */}
      <div className="flex items-center gap-2 min-w-0">
        <TeamLogo teamName={leftName} size="24" />
        <span className="text-sm font-semibold text-white truncate" title={leftAbbr}>{leftAbbr || '—'}</span>
      </div>

      {/* Separator */}
      <div className="text-slate-400 text-sm">@</div>

      {/* Right team */}
      <div className="flex items-center gap-2 min-w-0">
        <TeamLogo teamName={rightName} size="24" />
        <span className="text-sm font-semibold text-white truncate" title={rightAbbr}>{rightAbbr || '—'}</span>
      </div>

      {/* Middle dot + status + odds */}
      <div className="flex-1 min-w-0" />
      <div className="hidden sm:flex items-center gap-2 text-[13px] text-slate-300">
        {status && <span className="text-slate-400">•</span>}
        {status && <span className="whitespace-nowrap">{status}</span>}
        {(spread || total) && <span className="text-slate-400">•</span>}
        {spread && <span className="whitespace-nowrap">{spread}</span>}
        {total && <span className="whitespace-nowrap">{total}</span>}
      </div>

      {/* Swap */}
      <button
        type="button"
        onClick={toggleSwap}
        className="ml-2 px-2 py-1 text-[12px] rounded-md bg-slate-800/70 border border-slate-700/60 hover:bg-slate-800"
        aria-label="Swap teams visually"
      >
        ⇅ Swap
      </button>
    </div>
  );
}


