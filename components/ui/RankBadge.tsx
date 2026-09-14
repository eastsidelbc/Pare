/**
 * RankBadge — custom-designed rank indicator (NO emoji), 3-tier system.
 *
 * Dark-mode only. Tiers by rank across the ranked field:
 *   • Top 5 → GOLD      (#1 = filled gold "crown"; 2–5 = gold outline)
 *   • Middle → SLATE    (quiet neutral outline)
 *   • Bottom 5 → RED    (worst = filled red; others = red outline)
 *
 * Tie-aware: tied teams share a rank → same tier/colour. Ranks come from
 * useRanking; this component never computes rankings. Unranked → neutral "—".
 */

'use client';

interface RankBadgeProps {
  /** 1-based rank, or null when unranked (e.g. league-average row). */
  rank: number | null;
  /** Whether this rank is shared with other teams. */
  isTied?: boolean;
  /** Size of the ranked field (defaults to a full 32-team league). */
  totalTeams?: number;
  /** Visual size. */
  size?: 'sm' | 'md';
}

// --- tier tokens (dark mode) ---
const GOLD = '#e8b923';
const GOLD_TINT = 'rgba(232,185,35,.14)';
const GOLD_BORDER = 'rgba(232,185,35,.45)';
const GOLD_FILL_TEXT = '#1a1400';

const RED = '#e5484d';
const RED_TINT = 'rgba(229,72,77,.14)';
const RED_BORDER = 'rgba(229,72,77,.45)';
const RED_FILL_TEXT = '#ffffff';

const SLATE = '#7c8698';
const SLATE_TINT = 'rgba(124,134,152,.14)';
const SLATE_BORDER = 'rgba(124,134,152,.30)';

/** Correct English ordinal suffix (1st, 2nd, 3rd, 21st, 31st, …). */
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

interface TierStyle {
  color: string;
  background: string;
  border: string;
  boxShadow: string;
}

/**
 * Resolve the visual tier for a rank within a field of `total` teams.
 * Top checks win over bottom checks in the (rare) tiny-field overlap.
 */
function tierStyle(rank: number, total: number): TierStyle {
  const worst = Math.max(total, 1);
  const bottomThreshold = worst - 4; // last 5 ranks

  // #1 — filled gold crown
  if (rank === 1) {
    return {
      color: GOLD_FILL_TEXT,
      background: `linear-gradient(180deg, ${GOLD}, #c99a12)`,
      border: `1px solid ${GOLD_BORDER}`,
      boxShadow: `0 1px 7px -1px rgba(232,185,35,.55)`,
    };
  }
  // 2–5 — gold outline
  if (rank <= 5) {
    return { color: GOLD, background: GOLD_TINT, border: `1px solid ${GOLD_BORDER}`, boxShadow: 'none' };
  }
  // worst — filled red
  if (rank === worst && worst > 5) {
    return {
      color: RED_FILL_TEXT,
      background: `linear-gradient(180deg, ${RED}, #c93b40)`,
      border: `1px solid ${RED_BORDER}`,
      boxShadow: `0 1px 7px -1px rgba(229,72,77,.55)`,
    };
  }
  // bottom 5 (excluding worst) — red outline
  if (rank >= bottomThreshold && rank > 5) {
    return { color: RED, background: RED_TINT, border: `1px solid ${RED_BORDER}`, boxShadow: 'none' };
  }
  // middle — slate
  return { color: SLATE, background: SLATE_TINT, border: `1px solid ${SLATE_BORDER}`, boxShadow: 'none' };
}

export default function RankBadge({ rank, isTied = false, totalTeams = 32, size = 'sm' }: RankBadgeProps) {
  const dims = size === 'md' ? 'text-[12px] px-2 py-[3px]' : 'text-[11px] px-1.5 py-[2px]';

  // Unranked → neutral placeholder (no tier), don't crash.
  if (rank === null || !Number.isFinite(rank)) {
    return (
      <span
        className={`inline-flex items-center justify-center font-bold tabular-nums leading-none whitespace-nowrap ${dims}`}
        style={{
          borderRadius: 'var(--radius-sm)',
          color: SLATE,
          background: SLATE_TINT,
          border: `1px solid ${SLATE_BORDER}`,
        }}
      >
        —
      </span>
    );
  }

  const tier = tierStyle(rank, totalTeams);
  const label = `${isTied ? 'T-' : ''}${rank}${ordinalSuffix(rank)}`;

  return (
    <span
      className={`inline-flex items-center justify-center font-bold tabular-nums leading-none whitespace-nowrap ${dims}`}
      style={{
        borderRadius: 'var(--radius-sm)',
        color: tier.color,
        background: tier.background,
        border: tier.border,
        boxShadow: tier.boxShadow,
      }}
    >
      {label}
    </span>
  );
}
