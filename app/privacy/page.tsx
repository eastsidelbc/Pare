/**
 * Privacy policy — same shell as /about (H1 Inline header, `--bg-deep`, one scroll
 * region, one deep card, SiteFooter at the end). Static.
 *
 * Content is backed by an audit of what the site actually loads and stores
 * (docs/devnotes/2026-10-06-footer-about.md → "Privacy audit"). Update this page
 * BEFORE adding accounts, analytics, ads, or any data collection — and whenever a
 * new third-party domain is loaded by the browser.
 */

import type { ReactNode } from 'react';
import Link from 'next/link';
import SiteFooter from '@/components/SiteFooter';

export const metadata = { title: 'Privacy Policy · Pare' };

/** Bump when the policy text changes (and on first deploy). */
const EFFECTIVE_DATE = 'October 8, 2026';
const SUPPORT_EMAIL = 'support@pare.gg';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>{title}</h2>
      {children}
    </section>
  );
}

export default function PrivacyPage() {
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
              Privacy
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
          <article
            className="space-y-5 px-4 py-5"
            style={{
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--hairline)',
              background: 'linear-gradient(90deg, var(--card-deep-a), var(--card-deep-mid) 50%, var(--card-deep-b))',
              fontSize: '14px',
              lineHeight: 1.6,
              color: 'var(--text)',
            }}
          >
            <header className="space-y-1">
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text)' }}>Privacy Policy</h2>
              <p style={{ fontSize: '12px', color: 'var(--subtext)' }}>Effective: {EFFECTIVE_DATE}</p>
            </header>

            <p>
              Pare™ is made by Pare LLC (Minnesota). Short version: we don&apos;t collect personal information.
            </p>

            <Section title="What we collect">
              <p>Nothing that identifies you. No accounts, no sign-up, no ads, no analytics, no tracking.</p>
              <p>
                The one exception is optional: if you use the Fantasy tab, you type in your Sleeper username so we can
                look up your leagues (see &quot;Fantasy tab&quot; below).
              </p>
            </Section>

            <Section title="On your device">
              <p>
                Your favorite teams, open comparisons, Fantasy tab choices and settings are saved only in your browser
                or app on your device. Clearing your browser data or deleting the app removes them.
              </p>
              <p style={{ color: 'var(--subtext)' }}>
                Exactly three entries in your browser&apos;s local storage: <code>pare:favorites</code> (your teams and
                their display settings), <code>pare:comparisons</code> (your open comparison tabs) and{' '}
                <code>pare:myteam</code> (if you use the Fantasy tab: your Sleeper username, your Sleeper user and
                league IDs, and your Season / Last 4 choice). Pare sets no cookies of its own.
              </p>
            </Section>

            <Section title="Fantasy tab (Sleeper)">
              <p>
                When you enter a Sleeper username, your device sends requests to pare.gg that carry your username,
                and then your Sleeper user ID and league ID. Our server then asks Sleeper&apos;s
                public API for that username&apos;s public profile, leagues, rosters and, on game days, your
                players&apos; points. Your device never talks to Sleeper directly, so Sleeper sees our server&apos;s
                request, not your IP address.
              </p>
              <p>
                We don&apos;t store your username on our server. Lookups are kept only in its memory — never written
                to disk, never logged — and are deleted automatically within 2 days of your last use (live points
                within minutes). We don&apos;t sell or share them. To have them removed sooner, email{' '}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="site-footer-link underline underline-offset-2"
                  style={{ fontSize: 'inherit', color: 'var(--gold-bright)' }}
                >
                  {SUPPORT_EMAIL}
                </a>
                .
              </p>
              <p style={{ color: 'var(--subtext)' }}>
                These details travel in the address of those requests, so Cloudflare handles them like any page
                address. To remove them from your device, tap &quot;Change username&quot; in the Fantasy tab&apos;s league
                list, or clear your browser data.
              </p>
            </Section>

            <Section title="Services we rely on">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong>Cloudflare</strong> delivers and protects the site. Like any network, it processes your IP
                  address to deliver pages and block attacks, and may set strictly necessary security cookies.
                </li>
                <li>
                  <strong>ESPN</strong> (live scores and box scores). While a game is about to start or in progress,
                  and when you open a finished game&apos;s box score, your browser or app loads that data directly
                  from ESPN&apos;s public servers. As with any web request, ESPN receives your IP address and basic
                  browser information, under ESPN&apos;s own privacy policy. We send ESPN nothing about you.
                </li>
                <li>
                  <strong>Sleeper</strong> (fantasy stats, injury tags and the Fantasy tab). Only our server contacts
                  Sleeper. If you use the Fantasy tab, the username you typed is sent to Sleeper to find your public
                  account, under Sleeper&apos;s own privacy policy. Otherwise we send Sleeper nothing about you.
                </li>
              </ul>
              <p style={{ color: 'var(--subtext)' }}>
                Everything else — the app itself, fonts and team images — comes from pare.gg. Our server does not
                keep logs of visitors&apos; IP addresses.
              </p>
            </Section>

            <Section title="Sports data">
              <p>
                Stats come from public sources. Standings, team stats, leaderboards and fantasy data are fetched by our
                server, not your device; live scores and box scores are the exception described above.
              </p>
            </Section>

            <Section title="Children">
              <p>
                Pare is not directed at children under 13, and we don&apos;t knowingly collect information from them.
              </p>
            </Section>

            <Section title="Changes">
              <p>
                If we add optional accounts or subscriptions in the future, we&apos;ll update this policy before
                collecting anything, and change the effective date above.
              </p>
            </Section>

            <Section title="Contact">
              <p>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="site-footer-link underline underline-offset-2"
                  style={{ fontSize: 'inherit', color: 'var(--gold-bright)' }}
                >
                  {SUPPORT_EMAIL}
                </a>
                <span style={{ color: 'var(--subtext)' }}>
                  {' '}· <Link href="/about" className="site-footer-link underline underline-offset-2" style={{ fontSize: 'inherit' }}>About Pare</Link>
                </span>
              </p>
            </Section>
          </article>
        </div>
        <SiteFooter />
      </main>
    </div>
  );
}
