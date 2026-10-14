/**
 * /leans/[gameId] — one game's lines, leans and props (Leans G2 game screen).
 * `gameId` = the schedule's Matchup id ("2026-w7-ATL-LV"). `?add=1` opens the
 * add flow (player picker → add-a-line sheet; `&player=<id>` skips the picker),
 * `?pick=1` the player picker.
 */

import type { Metadata } from 'next';
import GameScreen, { type GameSheet } from '@/components/leans/GameScreen';

export const metadata: Metadata = { title: 'Leans · Pare' };

export default async function LeansGamePage({
  params,
  searchParams,
}: {
  params: Promise<{ gameId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ gameId }, query] = await Promise.all([params, searchParams]);
  const sheet: GameSheet = query.add === '1' ? 'add' : query.pick === '1' ? 'pick' : null;
  const player = typeof query.player === 'string' && /^\w{1,12}$/.test(query.player) ? query.player : null;
  return <GameScreen gameId={decodeURIComponent(gameId)} initialSheet={sheet} initialPlayerId={player} />;
}
