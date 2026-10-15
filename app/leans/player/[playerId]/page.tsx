/**
 * /leans/player/[playerId]?game=<Matchup id> — one player vs this week's defense
 * (Leans B1). Matchup only; the "Check a prop line" button opens the add sheet.
 */

import type { Metadata } from 'next';
import PlayerScreen from '@/components/leans/PlayerScreen';

export const metadata: Metadata = { title: 'Leans · Pare' };

export default async function LeansPlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ playerId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ playerId }, query] = await Promise.all([params, searchParams]);
  const game = typeof query.game === 'string' ? query.game : '';
  return <PlayerScreen playerId={decodeURIComponent(playerId)} gameId={game} />;
}
