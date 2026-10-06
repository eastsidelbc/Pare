/**
 * FavoritesOverlays — every favorites overlay, mounted once in the root layout
 * (inside <FavoritesProvider> + <ComparisonsProvider>):
 *   • <FavoritesSheet>  — Home header star → pick teams
 *   • <TeamQuickMenu>   — Standings row tap → add / compare
 *   • <FirstLaunch>     — one-time "Who do you root for?"
 *   • a small toast confirming adds / removes / the 3-team cap
 */

'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useFavorites } from '@/components/FavoritesProvider';
import FavoritesSheet from './FavoritesSheet';
import TeamQuickMenu from './TeamQuickMenu';
import FirstLaunch from './FirstLaunch';

function Toast() {
  const { notice } = useFavorites();
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-[70] flex justify-center"
      style={{ bottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom) + 16px)' }}
    >
      <AnimatePresence>
        {notice && (
          <motion.div
            key={notice}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            className="whitespace-nowrap rounded-full"
            style={{
              padding: '10px 16px', fontSize: 12, fontWeight: 700, color: 'var(--text)',
              background: 'var(--card-deep-a)', border: '1px solid var(--frame-mid)', boxShadow: 'var(--shadow-pop)',
            }}
          >
            {notice}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FavoritesOverlays() {
  return (
    <>
      <FavoritesSheet />
      <TeamQuickMenu />
      <FirstLaunch />
      <Toast />
    </>
  );
}
