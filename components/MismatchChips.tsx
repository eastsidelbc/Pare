// PHASE3_UX: Keep previous chips visible during selection; no overlay/skeleton during switches.
'use client';

import React from 'react';
import { useSelection } from './SelectionContext';

interface Chip {
  id: string;
  text: string;
  severity: 'extreme' | 'high' | 'moderate';
}

async function fetchChips(awayAbbr?: string, homeAbbr?: string): Promise<Chip[]> {
  if (!awayAbbr || !homeAbbr) return [];
  try {
    const res = await fetch(`/api/mock/matchup?away=${encodeURIComponent(awayAbbr)}&home=${encodeURIComponent(homeAbbr)}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: { chips: string[] } = await res.json();
    // Stable IDs per selection + chip text
    return (data.chips || []).map((t, i) => ({ id: `${awayAbbr}-${homeAbbr}-${t}`, text: t, severity: i === 0 ? 'high' : 'moderate' }));
  } catch {
    return [];
  }
}

export default function MismatchChips() {
  const { selectedGame } = useSelection();
  const [chips, setChips] = React.useState<Chip[]>([]);
  const hasLoadedOnceRef = React.useRef(false);

  const away = selectedGame?.awayAbbr;
  const home = selectedGame?.homeAbbr;
  const idsKey = React.useMemo(() => chips.map(c => c.id).join('|'), [chips]);

  React.useEffect(() => {
    let cancelled = false;
    fetchChips(away, home).then((res) => {
      if (!cancelled) {
        setChips(res.slice(0, 2));
        hasLoadedOnceRef.current = true;
      }
    }).catch(() => {
      // preserve existing chips on error; do not blank
      hasLoadedOnceRef.current = true;
    });
    return () => { cancelled = true; };
  }, [away, home]);

  // Initial skeleton allowed only before first successful load
  const showInitialSkeleton = !hasLoadedOnceRef.current && chips.length === 0;

  if (!away || !home) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
      {showInitialSkeleton ? (
        <>
          <span className="inline-flex h-7 rounded-full px-6 bg-slate-800/70 animate-pulse" />
          <span className="inline-flex h-7 rounded-full px-10 bg-slate-800/70 animate-pulse" />
        </>
      ) : (
        chips.map((c) => (
          <span
            key={c.id}
            className={
              'inline-flex items-center h-7 rounded-full px-3 text-[12px] font-medium whitespace-nowrap border ' +
              (c.severity === 'extreme'
                ? 'bg-red-500/10 text-red-300 border-red-500/30'
                : c.severity === 'high'
                ? 'bg-orange-500/10 text-orange-300 border-orange-500/30'
                : 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30')
            }
          >
            {c.text}
          </span>
        ))
      )}
    </div>
  );
}


