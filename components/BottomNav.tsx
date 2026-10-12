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
 * instead of blinking on/off — a smooth spring across the tabs.
 * Layout = "N3" (My Team P4, 2026-10-07; design-system §9.4 Nav): 5 tabs, an 18px
 * icon stacked over an 11px label, items 66×48 — fits 393px with ≥44px targets.
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
import { CalendarDays, GitCompareArrows, ListOrdered, Shirt, Trophy, type LucideIcon } from 'lucide-react';
import ActivePill from '@/components/ui/ActivePill';
import { GlassLabel, glassColor, GLASS_COLOR_TRANSITION } from '@/components/ui/glassControl';

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
  { href: '/myteam', label: 'Fantasy', icon: Shirt, isActive: (p) => p.startsWith('/myteam') },
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
        className="pointer-events-auto flex items-center overflow-hidden rounded-full"
        style={{
          height: 'var(--nav-pill-h)',
          padding: 5,
          gap: 2,
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
              className="relative flex flex-col items-center justify-center gap-[3px] rounded-full touch-optimized active:opacity-70"
              style={{ width: 66, height: 48 }}
            >
              {/* Sliding gold neon outline — one shared element that glides between tabs. */}
              {active && <ActivePill layoutId="nav-active-pill" />}
              <Icon
                size={18}
                aria-hidden
                style={{ color, position: 'relative', zIndex: 1, transition: GLASS_COLOR_TRANSITION }}
                strokeWidth={active ? 2.4 : 2}
              />
              <GlassLabel active={active} style={{ fontSize: '11px', lineHeight: 1 }}>
                {item.label}
              </GlassLabel>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
