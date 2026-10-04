/**
 * SplitCapsuleBar — the Round 5 "R" neon comparison bar.
 *
 * One capsule split at the exact ratio from useBarCalculation (math untouched —
 * we only re-normalize the two percentages so the halves meet with no gap).
 * Each half is a see-through neon tube in its team's color (lib/teamColors).
 *
 * Tier effects (lib/rankTier):
 *   first (#1)  → gold ring hugging the half + gold sparks + fast team-color breathe
 *   top (#2–5)  → slow, soft team-color breathe (no gold — gold is #1's alone)
 *   others      → plain tube
 * The leading half glows brighter; a short white divider marks where they meet.
 *
 * Widths animate with a framer-motion spring: grow-in on mount, smooth slide on
 * team swap / PG↔TOT. Glow layers are opacity-only CSS animations (cheap).
 * PERF (Pass 2): tier effects PLAY ON CHANGE, THEN SETTLE. The aura stays
 * invisible while the bar slides (so its blur isn't re-drawn every frame of the
 * spring), breathes twice, then holds a steady glow. `effectKey` re-mounts the
 * effect layers so they replay on a team swap / PG↔TOT.
 * Purely visual → aria-hidden (the row already announces values + ranks).
 */

'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import type { BarPalette } from '@/lib/teamColors';
import type { RankTier } from '@/lib/rankTier';

interface SplitCapsuleBarProps {
  /** Team A share from useBarCalculation (any scale; normalized here). */
  teamAPercentage: number;
  teamBPercentage: number;
  paletteA: BarPalette;
  paletteB: BarPalette;
  tierA: RankTier;
  tierB: RankTier;
  /** Tube height in px (default 11). */
  height?: number;
  /** Change this (e.g. teams + display mode) to replay the tier effects. */
  effectKey?: string;
}

const SPRING = { type: 'spring' as const, stiffness: 200, damping: 28 };
const RING_GAP = 4; // px between tube and the #1 gold ring

function SplitCapsuleBar({
  teamAPercentage,
  teamBPercentage,
  paletteA,
  paletteB,
  tierA,
  tierB,
  height = 11,
  effectKey = '',
}: SplitCapsuleBarProps) {
  const total = teamAPercentage + teamBPercentage;
  const aP = total > 0 ? (teamAPercentage / total) * 100 : 50;
  const bP = 100 - aP;
  const aLeads = aP >= bP;

  const side = (which: 'a' | 'b') => {
    const isA = which === 'a';
    const p = isA ? aP : bP;
    const pal = isA ? paletteA : paletteB;
    const tier = isA ? tierA : tierB;
    const leads = isA ? aLeads : !aLeads;
    const anchor = isA ? { left: 0 } : { right: 0 };
    const radius = isA ? '999px 0 0 999px' : '0 999px 999px 0';
    const dir = isA ? '90deg' : '270deg';
    // Border widths per side (top right bottom left) — the inner edge is 0 so the
    // halves meet cleanly. Longhands only: mixing `border` with `borderLeft`
    // makes React re-apply all 4 sides on re-render (team swap) and warn.
    const edgeWidths = isA ? '1.5px 0 1.5px 1.5px' : '1.5px 1.5px 1.5px 0';
    return { isA, p, pal, tier, leads, anchor, radius, dir, edgeWidths };
  };

  return (
    <div className="relative w-full" style={{ height }} aria-hidden="true">
      {[side('a'), side('b')].map((s) => (
        <div key={s.isA ? 'a' : 'b'}>
          {/* Breathing aura — #1 fast + strong, #2–5 slow + soft */}
          {(s.tier === 'first' || s.tier === 'top') && (
            <motion.div
              key={`aura-${effectKey}`}
              className={s.tier === 'first' ? 'pare-breathe-fast' : 'pare-breathe'}
              initial={false}
              animate={{ width: `${s.p}%` }}
              transition={SPRING}
              style={{
                position: 'absolute',
                ...s.anchor,
                top: -5,
                bottom: -5,
                borderRadius: s.radius,
                background: `rgba(${s.pal.rgb}, ${s.tier === 'first' ? 0.75 : 0.5})`,
                filter: 'blur(10px)',
              }}
            />
          )}

          {/* The neon tube */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${s.p}%` }}
            transition={SPRING}
            style={{
              position: 'absolute',
              ...s.anchor,
              top: 0,
              bottom: 0,
              boxSizing: 'border-box',
              borderStyle: 'solid',
              borderColor: s.pal.line,
              borderWidth: s.edgeWidths,
              borderRadius: s.radius,
              background: `linear-gradient(${s.dir}, rgba(${s.pal.rgb}, 0.08), rgba(${s.pal.rgb}, 0.55))`,
              boxShadow: `0 0 ${s.leads ? 14 : 3}px rgba(${s.pal.rgb}, 0.7), inset 0 0 10px rgba(${s.pal.rgb}, 0.35)`,
            }}
          />

          {/* #1 only — gold ring + rising gold sparks */}
          {s.tier === 'first' && (
            <>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `calc(${s.p}% + ${RING_GAP}px)` }}
                transition={SPRING}
                style={{
                  position: 'absolute',
                  ...(s.isA ? { left: -RING_GAP } : { right: -RING_GAP }),
                  top: -RING_GAP,
                  bottom: -RING_GAP,
                  boxSizing: 'border-box',
                  borderStyle: 'solid',
                  borderColor: 'var(--gold-bright)',
                  borderWidth: s.edgeWidths,
                  borderRadius: s.radius,
                  boxShadow:
                    '0 0 10px color-mix(in srgb, var(--gold-bright) 55%, transparent), inset 0 0 6px color-mix(in srgb, var(--gold-bright) 45%, transparent)',
                }}
              />
              <div
                key={`sparks-${effectKey}`}
                style={{ position: 'absolute', ...s.anchor, top: -2, height: height + 4, width: `${s.p}%`, pointerEvents: 'none' }}
              >
                <span className="pare-spark" style={{ left: '18%', bottom: 0 }} />
                <span className="pare-spark" style={{ left: '48%', bottom: 2, animationDelay: '0.55s' }} />
                <span className="pare-spark" style={{ left: '78%', bottom: 0, animationDelay: '1.1s' }} />
              </div>
            </>
          )}
        </div>
      ))}

      {/* Meeting point — short, flush with the tube, STATIC (no pulse: 20 of these
          per screen pulsing cost a full repaint per frame on iPhone; Kobe OK'd). */}
      <motion.div
        initial={{ left: '50%' }}
        animate={{ left: `${aP}%` }}
        transition={SPRING}
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: 2,
          marginLeft: -1,
          borderRadius: 1,
          background: 'var(--text)',
          opacity: 0.9, // ≈ the old pulse's average (0.75 ↔ 1)
          boxShadow: `0 0 5px color-mix(in srgb, var(--text) 80%, transparent), 0 0 10px rgba(${(aLeads ? paletteA : paletteB).rgb}, 0.7)`,
        }}
      />
    </div>
  );
}

export default memo(SplitCapsuleBar);
