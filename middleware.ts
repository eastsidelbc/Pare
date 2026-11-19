/**
 * Middleware, two jobs (each only on its own paths, via the matcher):
 *
 * 1. /api/*: per-visitor rate limit (lib/rateLimit.ts; security hardening phase 3,
 *    docs/devnotes/2026-11-19-security-phase3-rate-limit.md). Over the limit → 429 JSON +
 *    Retry-After. Requests without CF-Connecting-IP come from the Mac itself and pass.
 * 2. Route aliases: every casing/dash variant of /myteam (/MyTeam, /my-team, /My-Team, …)
 *    308-redirects to the canonical lowercase /myteam, keeping any subpath and query
 *    (My Team P4 pick, docs/plans/my-team-fantasy.md).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { clientKey, createRateLimiter, tierFor } from '@/lib/rateLimit';

const MY_TEAM = /^\/my-?team(?=\/|$)/i;
const CANONICAL = '/myteam';

const limiter = createRateLimiter();

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api/')) {
    const key = clientKey(req.headers);
    if (!key) return NextResponse.next();
    const d = limiter.take(tierFor(pathname), key);
    if (d.ok) return NextResponse.next();
    return NextResponse.json(
      { error: 'rate-limited' },
      { status: 429, headers: { 'Retry-After': String(d.retryAfterSec), 'Cache-Control': 'no-store' } },
    );
  }

  const m = pathname.match(MY_TEAM);
  if (!m || m[0] === CANONICAL) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = CANONICAL + pathname.slice(m[0].length);
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ['/api/:path*', '/:seg([Mm][Yy]-?[Tt][Ee][Aa][Mm])', '/:seg([Mm][Yy]-?[Tt][Ee][Aa][Mm])/:path*'],
};
