'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOfflineStatus } from '@/lib/useOfflineStatus';

interface OfflineStatusBannerProps {
  className?: string;
}

/**
 * Banner that shows when the user is offline
 * Provides visual feedback about connection status and cached data availability.
 * Uses the semantic --warn token (amber) rather than raw palette classes.
 */
export default function OfflineStatusBanner({ className = '' }: OfflineStatusBannerProps) {
  const { isOffline, connectionType, effectiveType } = useOfflineStatus();

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`
            fixed top-0 left-0 right-0 z-50
            backdrop-blur-xs border-b
            px-4 py-2 text-center font-medium text-sm
            ${className}
          `}
          style={{
            background: 'color-mix(in srgb, var(--warn) 92%, transparent)',
            borderColor: 'color-mix(in srgb, var(--warn) 50%, transparent)',
            color: 'var(--warn-text)',
          }}
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-center justify-center gap-2 max-w-6xl mx-auto">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--warn-text)' }}></div>
              <span>📱 You&apos;re offline</span>
            </div>
            
            <span className="hidden sm:inline" style={{ opacity: 0.75 }}>•</span>
            
            <span className="hidden sm:inline" style={{ opacity: 0.75 }}>
              Showing cached NFL stats - reconnect for fresh data
            </span>

            {/* Connection info for debugging (only in dev) */}
            {process.env.NODE_ENV === 'development' && (
              <>
                <span className="hidden md:inline" style={{ opacity: 0.75 }}>•</span>
                <span className="hidden md:inline text-xs" style={{ opacity: 0.6 }}>
                  {connectionType && `${connectionType}`}
                  {effectiveType && ` (${effectiveType})`}
                </span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
