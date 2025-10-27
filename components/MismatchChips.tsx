'use client';

import React from 'react';
import { useSelection } from './SelectionContext';
import { logDebug } from '@/lib/logger';

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
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [fade, setFade] = React.useState(false);

  const away = selectedGame?.awayAbbr;
  const home = selectedGame?.homeAbbr;
  const DEBUG = process.env.NEXT_PUBLIC_DEBUG_CHIPS === '1';

  const idsKey = React.useMemo(() => chips.map(c => c.id).join('|'), [chips]);

  React.useEffect(() => {
    let cancelled = false;
    setIsRefreshing(true);
    if (DEBUG) logDebug('MismatchChips/refresh', { refreshing: true, key: `${away}@${home}`, beforeIds: idsKey });
    fetchChips(away, home).then((res) => {
      if (!cancelled) {
        setChips(res.slice(0, 2));
        setIsRefreshing(false);
        if (DEBUG) logDebug('MismatchChips/refresh', { refreshing: false, key: `${away}@${home}`, afterIds: res.slice(0,2).map(c=>c.id) });
      }
    }).catch(() => setIsRefreshing(false));
    return () => { cancelled = true; };
  }, [away, home]);

  // Cross-fade on chips change
  React.useEffect(() => {
    if (!chips.length) return;
    setFade(true);
    const id = requestAnimationFrame(() => setFade(false));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  if (!away || !home) {
    return null;
  }

  return (
    <div className="relative flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
      {/* Overlay shimmer during refresh (no layout shift) */}
      {isRefreshing && (
        <div className="absolute inset-0 pointer-events-none animate-pulse bg-gradient-to-r from-transparent via-slate-100/10 to-transparent rounded" />
      )}

      <div className={`flex items-center gap-2 transition-opacity duration-200 ${fade ? 'opacity-0' : 'opacity-100'}`}>
        {chips.map((c) => (
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
        ))}
      </div>
    </div>
  );
}


