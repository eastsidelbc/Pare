/**
 * Leans page shell — the app-shell rule (header fixed, only <main> scrolls, no
 * bounce) for every Leans screen, plus the pushed-screen title row the game,
 * prop and player screens share (mockup `.ctitle`: 44px, back chevron, centred
 * title "ATL @ LV · Week 7").
 *
 * Each screen renders its own <LeansFooter /> at the end of its content so the
 * gate can see it on every route.
 */

'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import SiteFooter from '@/components/SiteFooter';

export function LeansShell({ header, children }: { header: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col overflow-hidden" style={{ height: 'var(--app-h, 100dvh)', background: 'var(--bg-deep)' }}>
      {header}
      <main
        className="flex-1 min-h-0 overflow-y-auto"
        style={{
          touchAction: 'pan-y',
          overscrollBehavior: 'contain',
          paddingBottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom) + 16px)',
        }}
      >
        <div className="mx-auto w-full max-w-[600px]">{children}</div>
        <SiteFooter />
      </main>
    </div>
  );
}

/** Pushed-screen title row: ‹ back · "{title} · {sub}" centred. */
export function LeansTitleBar({ title, sub, backHref = '/leans' }: { title: string; sub?: string; backHref?: string }) {
  const router = useRouter();
  const back = () => {
    // Came from inside the app → real back (keeps the list's scroll); deep link → the list.
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push(backHref);
  };
  return (
    <header className="flex-none" style={{ background: 'var(--bg-deep)', paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="mx-auto grid h-11 w-full max-w-[600px] items-center" style={{ gridTemplateColumns: '44px 1fr 44px', padding: '0 6px' }}>
        <button
          type="button"
          onClick={back}
          aria-label="Back"
          className="flex h-11 w-11 items-center justify-center touch-optimized active:opacity-60"
          style={{ color: 'var(--text)' }}
        >
          <ChevronLeft size={22} strokeWidth={2.2} aria-hidden />
        </button>
        <h1 className="truncate text-center" style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.02em', color: 'var(--text)' }}>
          {title}
          {sub && <span style={{ color: 'var(--subtext)', fontWeight: 700 }}> · {sub}</span>}
        </h1>
        <span aria-hidden />
      </div>
    </header>
  );
}
