/**
 * RankBadge — custom-designed rank indicator (NO emoji).
 *
 * Replaces medal emoji / plain gold ordinal text with a consistent, tiered
 * badge system. Top-3 ranks get a filled gold treatment; everything else is a
 * quiet outlined chip. Ties are marked with a leading "T-".
 */

'use client';

interface RankBadgeProps {
  /** 1-based rank, or null when unranked (e.g. league-average row). */
  rank: number | null;
  /** Whether this rank is shared with other teams. */
  isTied?: boolean;
  /** Visual size. */
  size?: 'sm' | 'md';
}

function ordinalSuffix(rank: number): string {
  const lastTwo = rank % 100;
  const lastOne = rank % 10;
  if (lastTwo < 11 || lastTwo > 13) {
    if (lastOne === 1) return 'st';
    if (lastOne === 2) return 'nd';
    if (lastOne === 3) return 'rd';
  }
  return 'th';
}

export default function RankBadge({ rank, isTied = false, size = 'sm' }: RankBadgeProps) {
  const isTop3 = rank !== null && rank <= 3;
  const label =
    rank === null
      ? '—'
      : `${isTied ? 'T-' : ''}${rank}${ordinalSuffix(rank)}`;

  const dims = size === 'md' ? 'text-[12px] px-2 py-[3px]' : 'text-[11px] px-1.5 py-[2px]';

  return (
    <span
      className={`inline-flex items-center justify-center font-bold tabular-nums leading-none whitespace-nowrap ${dims}`}
      style={{
        borderRadius: 'var(--radius-sm)',
        color: isTop3 ? '#1a1400' : 'var(--gold-bright)',
        background: isTop3
          ? 'linear-gradient(180deg, var(--gold-bright), var(--gold))'
          : 'rgba(245, 200, 66, 0.10)',
        border: isTop3 ? '1px solid rgba(245,200,66,0.6)' : '1px solid rgba(245,200,66,0.22)',
        boxShadow: isTop3 ? '0 1px 6px -1px rgba(245,200,66,0.5)' : 'none',
      }}
    >
      {label}
    </span>
  );
}
