/**
 * QuadrantMetricsButton — per-quadrant metrics editor for the Compare quadrant view.
 *
 * A small button that opens a centered modal with the existing MetricsSelector
 * (Offense | Defense tabs), scoped to ONE comparison's metric settings. Unlike
 * the workspace-level FloatingMetricsButton (fixed, single, edits the active
 * comparison), this lives inside a quadrant so each of the four visible
 * comparisons edits its own metrics directly.
 */

'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { SlidersHorizontal, X } from 'lucide-react';

const MetricsSelector = dynamic(() => import('@/components/MetricsSelector'), { ssr: false });

interface Props {
  offenseMetrics: string[];
  defenseMetrics: string[];
  onOffenseMetricsChange: (m: string[]) => void;
  onDefenseMetricsChange: (m: string[]) => void;
}

export default function QuadrantMetricsButton({
  offenseMetrics,
  defenseMetrics,
  onOffenseMetricsChange,
  onDefenseMetricsChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'offense' | 'defense'>('offense');

  // Lock body scroll while the modal is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Edit metrics"
        className="flex h-7 w-7 items-center justify-center rounded-lg touch-optimized active:opacity-60"
        style={{ color: 'var(--muted)' }}
      >
        <SlidersHorizontal size={15} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-120 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', maxHeight: '80vh' }}
            >
              {/* Header: Offense | Defense tabs + close */}
              <div
                className="flex flex-none items-center gap-2 border-b px-3 py-2"
                style={{ borderColor: 'var(--border)' }}
              >
                {(['offense', 'defense'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className="rounded-full px-3 py-1 touch-optimized"
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      background: tab === t ? 'color-mix(in srgb, var(--gold) 15%, transparent)' : 'transparent',
                      color: tab === t ? 'var(--gold)' : 'var(--muted)',
                    }}
                  >
                    {t}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg active:opacity-60"
                  style={{ color: 'var(--muted)' }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto p-3" style={{ maxHeight: '70vh' }}>
                {tab === 'offense' ? (
                  <MetricsSelector
                    type="offense"
                    selectedMetrics={offenseMetrics}
                    onMetricsChange={onOffenseMetricsChange}
                  />
                ) : (
                  <MetricsSelector
                    type="defense"
                    selectedMetrics={defenseMetrics}
                    onMetricsChange={onDefenseMetricsChange}
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
