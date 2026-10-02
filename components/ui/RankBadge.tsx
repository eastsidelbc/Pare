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

import { ordinalSuffix } from '@/utils/ordinal';
import { getRankTier } from '@/lib/rankTier';

interface RankBadgeProps {
  /** 1-based rank, or null when unranked (e.g. league-average row). */
  rank: number | null;
  /** Whether this rank is shared with other teams. */
  isTied?: boolean;
  /** Size of the ranked field (defaults to a full 32-team league). */
  totalTeams?: number;
  /** Visual size. */
  size?: 'sm' | 'md';
  /**
   * Opt-in neon effect (Compare rows only — Standings etc. stay static):
   * #32 → solid red ember glow. (#28–31 keep the plain red outline.)
   */
  effects?: boolean;
}

// --- tier tokens (dark mode) — values live in globals.css :root ---
const GOLD       = 'var(--badge-gold)';
const GOLD_TINT  = 'color-mix(in srgb, var(--badge-gold) 14%, transparent)';
const GOLD_BORDER= 'color-mix(in srgb, var(--badge-gold) 45%, transparent)';
const GOLD_FILL_TEXT = 'var(--badge-gold-text)';

const RED        = 'var(--badge-red)';
const RED_TINT   = 'color-mix(in srgb, var(--badge-red) 14%, transparent)';
const RED_BORDER = 'color-mix(in srgb, var(--badge-red) 45%, transparent)';
const RED_FILL_TEXT = 'white';

const SLATE       = 'var(--badge-slate)';
const SLATE_TINT  = 'color-mix(in srgb, var(--badge-slate) 14%, transparent)';
const SLATE_BORDER= 'color-mix(in srgb, var(--badge-slate) 30%, transparent)';

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
      background: `linear-gradient(180deg, ${GOLD}, var(--badge-gold-deep))`,
      border: `1px solid ${GOLD_BORDER}`,
      boxShadow: `0 1px 7px -1px color-mix(in srgb, var(--badge-gold) 55%, transparent)`,
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
      background: `linear-gradient(180deg, ${RED}, var(--badge-red-deep))`,
      border: `1px solid ${RED_BORDER}`,
      boxShadow: `0 1px 7px -1px color-mix(in srgb, var(--badge-red) 55%, transparent)`,
    };
  }
  // bottom 5 (excluding worst) — red outline
  if (rank >= bottomThreshold && rank > 5) {
    return { color: RED, background: RED_TINT, border: `1px solid ${RED_BORDER}`, boxShadow: 'none' };
  }
  // middle — slate
  return { color: SLATE, background: SLATE_TINT, border: `1px solid ${SLATE_BORDER}`, boxShadow: 'none' };
}

export default function RankBadge({ rank, isTied = false, totalTeams = 32, size = 'sm', effects = false }: RankBadgeProps) {
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
  const ember = effects && getRankTier(rank, totalTeams) === 'last'; // #32: solid red, smoldering

  return (
    <span
      className={`inline-flex items-center justify-center font-bold tabular-nums leading-none whitespace-nowrap ${dims} ${ember ? 'pare-ember' : ''}`}
      style={{
        borderRadius: 'var(--radius-sm)',
        color: tier.color,
        background: tier.background,
        border: tier.border,
        boxShadow: ember ? undefined : tier.boxShadow,
      }}
    >
      {label}
    </span>
  );
}
