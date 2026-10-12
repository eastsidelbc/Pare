/**
 * Route aliases — every casing/dash variant of /myteam (/MyTeam, /my-team,
 * /My-Team, …) 308-redirects to the canonical lowercase /myteam, keeping any
 * subpath and query (My Team P4 pick, docs/plans/my-team-fantasy.md).
 *
 * The matcher keeps this off every other request (assets, API, other tabs).
 */
import { NextResponse, type NextRequest } from 'next/server';

const MY_TEAM = /^\/my-?team(?=\/|$)/i;
const CANONICAL = '/myteam';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const m = pathname.match(MY_TEAM);
  if (!m || m[0] === CANONICAL) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = CANONICAL + pathname.slice(m[0].length);
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ['/:seg([Mm][Yy]-?[Tt][Ee][Aa][Mm])', '/:seg([Mm][Yy]-?[Tt][Ee][Aa][Mm])/:path*'],
};
