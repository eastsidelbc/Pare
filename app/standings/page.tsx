/**
 * Standings — the fourth tab.
 *
 * Server component: fetches the full league standings once via `getStandings()`
 * (ESPN, fresh on every request — no cache) and hands them to the client shell
 * (`StandingsScreen`: fixed header with the Division / Conf / Playoffs toggle +
 * the single scroll region). Recipe: docs/design-system.md §9.2.
 */

import { getStandings } from '@/lib/standings';
import StandingsScreen from '@/components/standings/StandingsScreen';

// Live data — render fresh on every request (no ISR cache), so a finished game
// shows up immediately instead of on a timer. getStandings() fetches no-store.
export const dynamic = 'force-dynamic';

export default async function StandingsPage() {
  const conferences = await getStandings();
  return <StandingsScreen conferences={conferences} />;
}
