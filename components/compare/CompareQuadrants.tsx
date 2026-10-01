/**
 * CompareQuadrants — the tablet/desktop Compare layout: a swipeable 2×2 grid.
 *
 * Shows up to four comparisons at once (each its own stacked Offense/Defense
 * compare pane). Empty quadrants show a "+" to add a comparison. You can still
 * swipe left/right — now paging between sets of four (the store caps at 8, so at
 * most two pages). Phones keep the single-pane swipe in CompareWorkspace; this
 * component is only mounted at tablet width and up.
 *
 * Each quadrant has its own remove (×) and its own metrics button, so the four
 * visible comparisons are edited independently.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, animate, type PanInfo } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { useComparisons, type Comparison, type ComparisonPatch } from '@/components/ComparisonsProvider';
import { APP_CONSTANTS } from '@/config/constants';
import type { TeamData } from '@/lib/useNflStats';
import ComparePane from '@/components/compare/ComparePane';
import BlankComparePicker from '@/components/compare/BlankComparePicker';
import QuadrantMetricsButton from '@/components/compare/QuadrantMetricsButton';

const PAGE = 4; // 2×2

interface Props {
  offenseData: TeamData[];
  defenseData: TeamData[];
  isLoading: boolean;
  isLoadingOffense: boolean;
  isLoadingDefense: boolean;
}

type Cell =
  | { kind: 'cmp'; id: string }
  | { kind: 'add' }
  | { kind: 'empty' };

export default function CompareQuadrants({
  offenseData,
  defenseData,
  isLoading,
  isLoadingOffense,
  isLoadingDefense,
}: Props) {
  const { comparisons, addComparison, removeComparison, updateComparison } = useComparisons();

  const canAdd = comparisons.length < APP_CONSTANTS.MAX_COMPARISONS;
  // One trailing slot's worth of "+" room when there's capacity to add.
  const pageCount = Math.max(1, Math.ceil((comparisons.length + (canAdd ? 1 : 0)) / PAGE));

  const [page, setPage] = useState(0);
  // Keep the active page in range when comparisons are added/removed.
  useEffect(() => {
    setPage((p) => Math.min(p, pageCount - 1));
  }, [pageCount]);

  // ── Pager measurement + x track ─────────────────────────────────────────────
  const viewportRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const x = useMotionValue(0);

  useEffect(() => {
    const measure = () => {
      if (viewportRef.current) setWidth(viewportRef.current.offsetWidth);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Snap the track to the active page on page/width change (not mid-drag).
  useEffect(() => {
    const controls = animate(x, -page * width, { type: 'spring', stiffness: 320, damping: 34 });
    return controls.stop;
  }, [page, width, pageCount, x]);

  const handleDragEnd = useCallback(
    (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const threshold = Math.max(60, width * 0.18);
      let target = page;
      if (info.offset.x < -threshold || info.velocity.x < -500) target = Math.min(page + 1, pageCount - 1);
      else if (info.offset.x > threshold || info.velocity.x > 500) target = Math.max(page - 1, 0);
      if (target !== page) setPage(target);
      else animate(x, -page * width, { type: 'spring', stiffness: 320, damping: 34 });
    },
    [page, width, pageCount, x],
  );

  const canDrag = pageCount > 1 && width > 0;

  const handleAdd = useCallback(() => {
    addComparison('', ''); // blank → BlankComparePicker in that quadrant
  }, [addComparison]);

  // Build the cells for one page.
  const cellsForPage = (p: number): Cell[] => {
    const out: Cell[] = [];
    for (let i = 0; i < PAGE; i++) {
      const idx = p * PAGE + i;
      if (idx < comparisons.length) out.push({ kind: 'cmp', id: comparisons[idx].id });
      else if (canAdd) out.push({ kind: 'add' });
      else out.push({ kind: 'empty' });
    }
    return out;
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Pager viewport */}
      <div ref={viewportRef} className="relative flex-1 overflow-hidden">
        <motion.div
          className="flex h-full"
          style={{ x }}
          drag={canDrag ? 'x' : false}
          dragDirectionLock
          dragConstraints={{ left: -(pageCount - 1) * width, right: 0 }}
          dragElastic={0.12}
          onDragEnd={handleDragEnd}
        >
          {Array.from({ length: pageCount }).map((_, p) => {
            // Windowing: only mount the active page and its neighbors.
            const mounted = Math.abs(p - page) <= 1;
            return (
              <div
                key={p}
                className="h-full shrink-0 overflow-y-auto"
                style={{ width: width || '100%', touchAction: 'pan-y', overscrollBehavior: 'contain' }}
              >
                {mounted && (
                  <div
                    className="grid grid-cols-2 gap-3 p-3"
                    style={{ paddingBottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom) + 16px)' }}
                  >
                    {cellsForPage(p).map((cell, i) => (
                      <Quadrant
                        key={cell.kind === 'cmp' ? cell.id : `${p}-${i}-${cell.kind}`}
                        cell={cell}
                        offenseData={offenseData}
                        defenseData={defenseData}
                        isLoading={isLoading}
                        isLoadingOffense={isLoadingOffense}
                        isLoadingDefense={isLoadingDefense}
                        canRemove={comparisons.length > 1}
                        onAdd={handleAdd}
                        onRemove={removeComparison}
                        onUpdate={updateComparison}
                        comparison={
                          cell.kind === 'cmp'
                            ? comparisons.find((c) => c.id === cell.id)
                            : undefined
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* Page dots (only when more than one page) */}
      {pageCount > 1 && (
        <div className="flex flex-none items-center justify-center gap-1.5 py-2">
          {Array.from({ length: pageCount }).map((_, p) => (
            <button
              key={p}
              type="button"
              aria-label={`Page ${p + 1}`}
              onClick={() => setPage(p)}
              className="rounded-full touch-optimized"
              style={{
                width: p === page ? 18 : 7,
                height: 7,
                background: p === page ? 'var(--gold)' : 'var(--border)',
                transition: 'width .2s, background .2s',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── One quadrant cell ─────────────────────────────────────────────────────────

interface QuadrantProps {
  cell: Cell;
  comparison?: Comparison;
  offenseData: TeamData[];
  defenseData: TeamData[];
  isLoading: boolean;
  isLoadingOffense: boolean;
  isLoadingDefense: boolean;
  canRemove: boolean;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: ComparisonPatch) => void;
}

function Quadrant({
  cell,
  comparison,
  offenseData,
  defenseData,
  isLoading,
  isLoadingOffense,
  isLoadingDefense,
  canRemove,
  onAdd,
  onRemove,
  onUpdate,
}: QuadrantProps) {
  const shell = 'rounded-xl overflow-hidden relative';
  const shellStyle = { background: 'var(--card)', border: '1px solid var(--border)' } as const;

  // Empty "+" quadrant.
  if (cell.kind !== 'cmp' || !comparison) {
    if (cell.kind === 'empty') {
      return <div className={shell} style={{ ...shellStyle, minHeight: 160, opacity: 0.4 }} />;
    }
    return (
      <button
        type="button"
        onClick={onAdd}
        className={`${shell} flex min-h-[160px] flex-col items-center justify-center gap-2 touch-optimized active:opacity-70`}
        style={shellStyle}
        aria-label="Add comparison"
      >
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: 'rgba(245,200,66,0.15)', color: 'var(--gold)' }}
        >
          <Plus size={20} strokeWidth={2.5} />
        </div>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>Add comparison</span>
      </button>
    );
  }

  const c = comparison;
  const hasTeams = Boolean(c.teamA && c.teamB);

  return (
    <div className={shell} style={shellStyle}>
      {/* Inner wrapper hugs the content so the control box centers to the
          comparison itself, not to the (grid-stretched) card height. */}
      <div className="relative">
      {hasTeams ? (
        <ComparePane
          isMobile
          inline
          quadrant
          teamA={c.teamA}
          teamB={c.teamB}
          offenseData={offenseData}
          defenseData={defenseData}
          selectedOffenseMetrics={c.settings.offenseMetrics}
          selectedDefenseMetrics={c.settings.defenseMetrics}
          isLoading={isLoading}
          isLoadingOffense={isLoadingOffense}
          isLoadingDefense={isLoadingDefense}
          onTeamAChange={(t) => onUpdate(c.id, { teamA: t })}
          onTeamBChange={(t) => onUpdate(c.id, { teamB: t })}
          onOffenseMetricsChange={(m) => onUpdate(c.id, { settings: { offenseMetrics: m } })}
          onDefenseMetricsChange={(m) => onUpdate(c.id, { settings: { defenseMetrics: m } })}
        />
      ) : (
        <div className="p-3">
          <BlankComparePicker
            teamA={c.teamA}
            teamB={c.teamB}
            offenseData={offenseData}
            onTeamAChange={(t) => onUpdate(c.id, { teamA: t })}
            onTeamBChange={(t) => onUpdate(c.id, { teamB: t })}
          />
        </div>
      )}

      {/* Controls float as a small VERTICAL box (× over ⚙) in the reserved right
          gap, vertically centered — dark-blue card shows above, below, around. */}
      {(hasTeams || canRemove) && (
        <div
          className="absolute top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-0.5 rounded-lg"
          style={{
            // Centered in the reserved right gap. The quadrant body uses a uniform
            // 6px dark-blue band everywhere (padLeft/top/bottom + between panels);
            // padRight is 6 + boxWidth(≈34) + 6 = 46, so right:6 leaves a matching
            // 6px band on BOTH sides of the control box.
            right: 6,
            background: 'color-mix(in srgb, var(--card) 85%, transparent)',
            border: '1px solid var(--border)',
            padding: 2,
          }}
        >
          {canRemove && (
            <button
              type="button"
              onClick={() => onRemove(c.id)}
              aria-label="Remove comparison"
              className="flex h-7 w-7 items-center justify-center rounded-lg touch-optimized active:opacity-60"
              style={{ color: 'var(--muted)' }}
            >
              <X size={15} />
            </button>
          )}
          {hasTeams && (
            <QuadrantMetricsButton
              offenseMetrics={c.settings.offenseMetrics}
              defenseMetrics={c.settings.defenseMetrics}
              onOffenseMetricsChange={(m) => onUpdate(c.id, { settings: { offenseMetrics: m } })}
              onDefenseMetricsChange={(m) => onUpdate(c.id, { settings: { defenseMetrics: m } })}
            />
          )}
        </div>
      )}
      </div>
    </div>
  );
}
