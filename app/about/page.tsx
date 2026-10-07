/**
 * About — who makes Pare, how to reach us, data disclaimer.
 *
 * Same shell as the other tabs (design-system §9 rule 7): fixed "H1 · Inline" header
 * (Pare + gold-bright "ABOUT"), `--bg-deep` page, one scroll region, one deep card,
 * SiteFooter at the end of the scroll content. Static — no data fetching.
 */

import SiteFooter from '@/components/SiteFooter';

export const metadata = { title: 'About · Pare' };

const SUPPORT_EMAIL = 'support@pare.gg';

export default function AboutPage() {
  return (
    <div className="flex flex-col overflow-hidden" style={{ height: 'var(--app-h, 100dvh)', background: 'var(--bg-deep)' }}>
      {/* Fixed top bar — §9 "H1 · Inline". */}
      <header
        className="flex-none border-b"
        style={{ background: 'var(--bg-deep)', borderColor: 'var(--hairline)', paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto flex h-[52px] w-full max-w-[1440px] items-center px-4">
          <h1 className="whitespace-nowrap font-black tracking-tight" style={{ fontSize: '20px', color: 'var(--text)' }}>
            Pare
            <span
              className="ml-1.5 font-bold"
              style={{ fontSize: '9.5px', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'var(--gold-bright)' }}
            >
              About
            </span>
          </h1>
        </div>
      </header>

      {/* The only scroll region. */}
      <main
        className="flex-1 min-h-0 overflow-y-auto"
        style={{
          touchAction: 'pan-y',
          overscrollBehavior: 'contain',
          paddingBottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom) + 16px)',
        }}
      >
        <div className="mx-auto w-full max-w-[600px] px-4 pt-4 pb-4">
          <section
            className="space-y-3 px-4 py-4"
            style={{
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--hairline)',
              background: 'linear-gradient(90deg, var(--card-deep-a), var(--card-deep-mid) 50%, var(--card-deep-b))',
              fontSize: '14px',
              lineHeight: 1.55,
              color: 'var(--text)',
            }}
          >
            <p>Pare™ is made by Pare LLC (Minnesota).</p>
            <p>
              <span style={{ color: 'var(--subtext)' }}>Contact: </span>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="site-footer-link underline underline-offset-2"
                style={{ fontSize: 'inherit', color: 'var(--gold-bright)' }}
              >
                {SUPPORT_EMAIL}
              </a>
            </p>
            <p style={{ color: 'var(--subtext)' }}>
              Stats from public sources. Not affiliated with the NFL or any league or team.
            </p>
          </section>
        </div>
        <SiteFooter />
      </main>
    </div>
  );
}
