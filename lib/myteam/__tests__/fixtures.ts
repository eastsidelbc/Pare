/** Test helpers: load P0a fixtures (anonymized) and synthetic fixtures. */
import { readFileSync } from 'node:fs';
import { isFantasyPosition, type PlayerGameLine } from '../types';

export function loadFixture<T>(name: string): T {
  return JSON.parse(readFileSync(new URL(`../__fixtures__/${name}`, import.meta.url), 'utf8')) as T;
}

/** Raw api.sleeper.com weekly line, as trimmed into the fixture. */
export interface SleeperComLine {
  player_id: string;
  week: number;
  team: string;
  opponent: string;
  player: { position: string };
  stats: Record<string, number>;
}

/** Fixture lines → engine lines (the P2 adapter does the same mapping). */
export function toGameLines(lines: readonly SleeperComLine[]): PlayerGameLine[] {
  const out: PlayerGameLine[] = [];
  for (const l of lines) {
    if (!isFantasyPosition(l.player.position)) continue;
    out.push({ playerId: l.player_id, position: l.player.position, team: l.team, opponent: l.opponent, week: l.week, stats: l.stats });
  }
  return out;
}
