/**
 * Compact Panel Header — slim section bar inside a neon-frame card (Round 5 "R").
 *
 *   OFFENSE                                   PG | TOT
 *
 * Team identity moved up to <MatchupHero> (wordmarks), so this is just the
 * section label + the per-game / total toggle. ~28px tall so Offense AND
 * Defense fit on one iPhone 14 Pro screen.
 */

'use client';

interface CompactPanelHeaderProps {
  type: 'offense' | 'defense';
  displayMode: 'per-game' | 'total';
  onDisplayModeChange: (mode: 'per-game' | 'total') => void;
}

export default function CompactPanelHeader({ type, displayMode, onDisplayModeChange }: CompactPanelHeaderProps) {
  const option = (mode: 'per-game' | 'total', label: string) => {
    const active = displayMode === mode;
    return (
      <button
        type="button"
        onClick={() => !active && onDisplayModeChange(mode)}
        className="touch-optimized px-1.5 py-1"
        style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.14em',
          color: active ? 'var(--gold-bright)' : 'var(--muted)',
          transition: 'color .15s',
        }}
        aria-label={mode === 'per-game' ? 'Switch to per-game' : 'Switch to total'}
        aria-pressed={active}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="flex h-[28px] items-center justify-between pl-3 pr-1.5">
      <h2 style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text)' }}>
        {type}
      </h2>
      <div className="flex items-center">
        {option('per-game', 'PG')}
        <span aria-hidden="true" style={{ color: 'var(--border)', fontSize: 9 }}>|</span>
        {option('total', 'TOT')}
      </div>
    </div>
  );
}
