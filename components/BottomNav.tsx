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
 * Pill + label colors are the shared glass-toggle recipe (`ActivePill`, `glassControl`),
 * also used by the header capsules; this nav owns layoutId 'nav-active-pill'.
 *
 * A centered, rounded capsule floating just above the bottom edge, iOS
 * safe-area aware. The full-width outer wrapper is click-through
 * (`pointer-events-none`) so only the capsule captures taps.
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, GitCompareArrows, ListOrdered, Trophy, type LucideIcon } from 'lucide-react';
import ActivePill from '@/components/ui/ActivePill';
import { glassColor, GLASS_COLOR_TRANSITION } from '@/components/ui/glassControl';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
}

const ITEMS: NavItem[] = [
  { href: '/', label: 'Home', icon: CalendarDays, isActive: (p) => p === '/' },
  { href: '/compare', label: 'Compare', icon: GitCompareArrows, isActive: (p) => p.startsWith('/compare') },
  { href: '/standings', label: 'Standings', icon: ListOrdered, isActive: (p) => p.startsWith('/standings') },
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
        className="pointer-events-auto flex items-center gap-1 overflow-hidden rounded-full p-1"
        style={{
          height: 'var(--nav-pill-h)',
          // Neon Frame (Round 4 "K"): darkest layer of the surface ladder (--nav-bg)
          // so the capsule separates from the page, with a faint edge.
          background: 'var(--nav-bg)',
          border: '1px solid var(--glass-edge)',
          boxShadow: 'var(--shadow-pop)',
          // No backdrop-filter blur (perf Pass 4): --nav-bg is 94% opaque, so the
          // blur was invisible (pixel diff with vs without: max 2/255) but made the
          // phone re-blur whatever scrolled or animated under the nav every frame.
        }}
      >
        {ITEMS.map((item) => {
          const active = item.isActive(pathname);
          const color = glassColor(active);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className="relative flex h-full items-center gap-1.5 rounded-full px-2.5 touch-optimized active:opacity-70"
            >
              {/* Sliding gold neon outline — one shared element that glides between tabs. */}
              {active && <ActivePill layoutId="nav-active-pill" />}
              <Icon
                size={16}
                style={{ color, position: 'relative', zIndex: 1, transition: GLASS_COLOR_TRANSITION }}
                strokeWidth={active ? 2.4 : 2}
              />
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: active ? 700 : 500,
                  color,
                  position: 'relative',
                  zIndex: 1,
                  transition: GLASS_COLOR_TRANSITION,
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
