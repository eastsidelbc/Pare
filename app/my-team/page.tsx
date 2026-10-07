/**
 * My Team — Sleeper fantasy matchup helper (plan: docs/plans/my-team-fantasy.md).
 * P3 skeleton: reachable by URL only (no nav tab until the P5 design pass).
 * All data is client-fetched from /api/myteam/* after the device's saved
 * username loads, so the page itself is static.
 */
import MyTeamApp from '@/components/myteam/MyTeamApp';

export const metadata = { title: 'My Team · Pare' };

export default function MyTeamPage() {
  return <MyTeamApp />;
}
