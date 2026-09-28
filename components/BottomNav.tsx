/**
 * BottomNav — the single, persistent app footer (Vision Step 5), styled as a
 * floating "pill" capsule (modern-iPhone style).
 *
 * Mounted ONCE in the root layout (outside every page/route and outside the
 * compare swipe container), so it never unmounts, re-animates, or "switches"
 * when navigating or swiping comparison tabs. Active state is derived purely
 * from the pathname.
 *
 * The gold active-highlight is a single shared element (framer-motion
 * `layoutId`), so on each route change it SLIDES from the old tab to the new one
 * instead of blinking on/off — a smooth spring across Home / Compare / Leaders.
 *
 * A centered, rounded capsule floating just above the bottom edge, iOS
 * safe-area aware. The full-width outer wrapper is click-through
 * (`pointer-events-none`) so only the capsule captures taps.
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { CalendarDays, GitCompareArrows, Trophy, type LucideIcon } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
}

const ITEMS: NavItem[] = [
  { href: '/', label: 'Home', icon: CalendarDays, isActive: (p) => p === '/' },
  { href: '/compare', label: 'Compare', icon: GitCompareArrows, isActive: (p) => p.startsWith('/compare') },
  { href: '/leaderboards', label: 'Leaders', icon: Trophy, isActive: (p) => p.startsWith('/leaderboards') },
];

export default function BottomNav() {
  const pathname = usePathname() ?? '/';

  return (
    // Full-width, click-through wrapper — only the capsule inside captures taps.
    <div
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center pointer-events-none"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
    >
      <nav
        aria-label="Primary"
        className="pointer-events-auto flex items-center gap-1 rounded-full p-1"
        style={{
          height: 'var(--nav-pill-h)',
          background: 'color-mix(in srgb, var(--surface) 88%, transparent)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-pop)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {ITEMS.map((item) => {
          const active = item.isActive(pathname);
          const color = active ? 'var(--gold)' : 'var(--muted)';
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className="relative flex h-full items-center gap-1.5 rounded-full px-2.5 touch-optimized active:opacity-70"
            >
              {/* Sliding gold highlight — one shared element that glides between tabs. */}
              {active && (
                <motion.span
                  layoutId="nav-active-pill"
                  className="absolute inset-0 rounded-full"
                  style={{ background: 'rgba(245,200,66,0.15)' }}
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <Icon
                size={16}
                style={{ color, position: 'relative', zIndex: 1, transition: 'color .2s' }}
                strokeWidth={active ? 2.4 : 2}
              />
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: active ? 700 : 500,
                  color,
                  position: 'relative',
                  zIndex: 1,
                  transition: 'color .2s',
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
