/**
 * My Team app shell — fixed "H1 · Inline" header ("Pare FANTASY" + the league
 * capsule, design-system §9.4) + the one scroll region + site footer, same
 * structure as Standings / Leaders. Content is phone-width, widening on iPad
 * for the PINNED side panel.
 */

import type { ReactNode, RefObject } from 'react';
import SiteFooter from '@/components/SiteFooter';

export default function MyTeamShell({
  headerRight,
  mainRef,
  children,
}: {
  headerRight?: ReactNode;
  mainRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col overflow-hidden" style={{ height: 'var(--app-h, 100dvh)', background: 'var(--bg-deep)' }}>
      <header
        className="flex-none border-b"
        style={{ background: 'var(--bg-deep)', borderColor: 'var(--hairline)', paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto flex h-[52px] w-full max-w-[1440px] items-center justify-between gap-2 px-4">
          <h1 className="whitespace-nowrap font-black tracking-tight" style={{ fontSize: '20px', color: 'var(--text)' }}>
            Pare
            <span
              className="ml-1.5 font-bold"
              style={{ fontSize: '9.5px', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'var(--gold-bright)' }}
            >
              Fantasy
            </span>
          </h1>
          {headerRight}
        </div>
      </header>

      <main
        ref={mainRef}
        className="flex-1 min-h-0 overflow-y-auto"
        style={{
          touchAction: 'pan-y',
          overscrollBehavior: 'contain',
          paddingBottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom) + 16px)',
        }}
      >
        <div className="mx-auto w-full max-w-[1180px] px-4 pb-2">{children}</div>
        <SiteFooter />
      </main>
    </div>
  );
}
