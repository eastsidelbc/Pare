/**
 * Fantasy tab (/myteam) — Sleeper fantasy matchup helper
 * (plan: docs/plans/my-team-fantasy.md, look: design-system §9.4).
 * All data is client-fetched from /api/myteam/* after the device's saved
 * username loads, so the page itself is static. Casing/dash variants
 * (/MyTeam, /my-team, …) 308 here via middleware.ts.
 */
import MyTeamApp from '@/components/myteam/MyTeamApp';

export const metadata = { title: 'Fantasy · Pare' };

export default function MyTeamPage() {
  return <MyTeamApp />;
}
