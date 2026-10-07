/**
 * SiteFooter — the end-of-content footer on each tab's scroll region
 * (Home, Standings, Leaders, About). Never fixed, never in BottomNav, never its
 * own scroll region. Not on Compare (no-scroll fit screen — nothing to scroll to).
 *
 * Two variants by width (CSS only, no JS):
 * - ≥1024px (`lg`): full footer — wordmark + tagline, link columns, legal line.
 * - <1024px: one compact line — "© {year} Pare LLC · About".
 *
 * Hidden inside the iOS app via `[data-app="ios"] .site-footer` (lib/platform.ts).
 * Styles (link hover, gold focus ring): `.site-footer*` in app/globals.css.
 */

import Link from 'next/link';

type FooterLink = { label: string; href: string; external?: boolean };

const SUPPORT_EMAIL = 'support@pare.gg';

const COLUMNS: ReadonlyArray<{ title: string; links: ReadonlyArray<FooterLink> }> = [
  {
    title: 'Pare',
    links: [
      { label: 'Home', href: '/' },
      { label: 'Compare', href: '/compare' },
      { label: 'Standings', href: '/standings' },
      { label: 'Leaders', href: '/leaderboards' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: `mailto:${SUPPORT_EMAIL}`, external: true },
    ],
  },
  // Legal: only routes that exist. Add Privacy / Terms here once their pages ship —
  // an empty column is hidden, so there are never dead links.
  { title: 'Legal', links: [] },
];

function FooterAnchor({ link, className }: { link: FooterLink; className: string }) {
  return link.external ? (
    <a href={link.href} className={className}>{link.label}</a>
  ) : (
    <Link href={link.href} className={className}>{link.label}</Link>
  );
}

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer" style={{ background: 'var(--bg-deep)' }}>
      {/* Desktop — full footer. */}
      <div className="hidden lg:block border-t" style={{ borderColor: 'var(--hairline)' }}>
        <div className="mx-auto w-full max-w-[1440px] px-6 pt-8 pb-6">
          <div className="flex justify-between gap-10">
            <div>
              <p className="font-black tracking-tight" style={{ fontSize: '20px', color: 'var(--text)' }}>
                Pare<span style={{ fontSize: '11px', verticalAlign: 'super' }}>™</span>
              </p>
              <p className="mt-1" style={{ fontSize: '13px', color: 'var(--subtext)' }}>
                Head-to-head sports stats &amp; analytics
              </p>
            </div>
            <nav aria-label="Footer" className="flex gap-16">
              {COLUMNS.filter((c) => c.links.length > 0).map((col) => (
                <div key={col.title}>
                  <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{col.title}</h2>
                  <ul className="mt-3 space-y-2">
                    {col.links.map((link) => (
                      <li key={link.label}>
                        <FooterAnchor link={link} className="site-footer-link" />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
          <p
            className="mt-8 border-t pt-5 text-center"
            style={{ borderColor: 'var(--hairline)', fontSize: '12px', color: 'var(--subtext)' }}
          >
            © {year} Pare LLC. All rights reserved. Not affiliated with the NFL or any league or team.
          </p>
        </div>
      </div>

      {/* Phone / tablet — compact one-liner. */}
      <p className="lg:hidden py-4 text-center" style={{ fontSize: '11px', color: 'var(--subtext)' }}>
        © {year} Pare LLC ·{' '}
        <Link href="/about" className="site-footer-link pare-hit44 inline-block underline underline-offset-2">
          About
        </Link>
      </p>
    </footer>
  );
}
