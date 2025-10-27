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
    // Map strings to medium severity by default
    return (data.chips || []).map((t, i) => ({ id: `${i}`, text: t, severity: i === 0 ? 'high' : 'moderate' }));
  } catch {
    return [];
  }
}

export default function MismatchChips() {
  const { selectedGame } = useSelection();
  const [chips, setChips] = React.useState<Chip[]>([]);
  React.useEffect(() => {
    fetchChips(selectedGame?.awayAbbr, selectedGame?.homeAbbr).then((res) => setChips(res.slice(0, 2)));
  }, [selectedGame?.awayAbbr, selectedGame?.homeAbbr]);

  if (!selectedGame?.awayAbbr || !selectedGame?.homeAbbr) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
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
  );
}


