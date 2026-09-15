/**
 * BottomNav — the single, persistent app footer (Vision Step 5), styled as a
 * floating "pill" capsule (modern-iPhone style).
 *
 * Mounted ONCE in the root layout (outside every page/route and outside the
 * compare swipe container), so it never unmounts, re-animates, or "switches"
 * when navigating or swiping comparison tabs. Active state is derived purely
 * from the pathname, so switching tabs only moves the highlight.
 *
 * A centered, rounded capsule floating just above the bottom edge, iOS
 * safe-area aware. The full-width outer wrapper is click-through
 * (`pointer-events-none`) so only the capsule captures taps. Scrollable content
 * reserves `calc(var(--nav-h) + env(safe-area-inset-bottom))` so nothing hides
 * behind it. Supersedes the old per-page MobileBottomBar (now removed).
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, GitCompareArrows, type LucideIcon } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
}

const ITEMS: NavItem[] = [
  { href: '/', label: 'Home', icon: CalendarDays, isActive: (p) => p === '/' },
  { href: '/compare', label: 'Compare', icon: GitCompareArrows, isActive: (p) => p.startsWith('/compare') },
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
              className="flex h-full items-center gap-1.5 rounded-full px-2.5 touch-optimized transition-colors active:opacity-70"
              style={{ background: active ? 'rgba(245,200,66,0.15)' : 'transparent' }}
            >
              <Icon size={16} style={{ color }} strokeWidth={active ? 2.4 : 2} />
              <span style={{ fontSize: '12px', fontWeight: active ? 700 : 500, color }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
