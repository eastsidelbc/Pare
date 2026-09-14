/**
 * Mobile Bottom Bar
 *
 * Tab bar with real (lucide) icons — no emoji. "Schedule" navigates home;
 * "Compare" is the active view; "Settings" is a placeholder.
 */

'use client';

import Link from 'next/link';
import { CalendarDays, GitCompareArrows, Settings, type LucideIcon } from 'lucide-react';

function Tab({
  icon: Icon,
  label,
  active,
  href,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  href?: string;
}) {
  const color = active ? 'var(--gold)' : 'var(--muted)';
  const content = (
    <>
      <div
        className="flex h-7 w-7 items-center justify-center rounded-lg"
        style={{ background: active ? 'rgba(245,200,66,0.15)' : 'transparent' }}
      >
        <Icon size={18} style={{ color }} strokeWidth={active ? 2.4 : 2} />
      </div>
      <span style={{ fontSize: '10px', fontWeight: active ? 700 : 500, color }}>{label}</span>
    </>
  );

  const className = 'flex flex-1 flex-col items-center gap-0.5 py-1 touch-optimized active:opacity-60';

  if (href) {
    return (
      <Link href={href} className={className} aria-label={label}>
        {content}
      </Link>
    );
  }
  return (
    <button className={className} aria-label={label}>
      {content}
    </button>
  );
}

export default function MobileBottomBar() {
  return (
    <div
      className="flex-none z-10 border-t"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'var(--surface)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="mx-auto flex h-16 max-w-[600px] items-center justify-around px-4">
        <Tab icon={CalendarDays} label="Schedule" href="/" />
        <Tab icon={GitCompareArrows} label="Compare" active />
        <Tab icon={Settings} label="Settings" />
      </div>
    </div>
  );
}
