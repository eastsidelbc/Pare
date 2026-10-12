/** Test helpers: load P0a fixtures (anonymized) and synthetic fixtures. */
import { readFileSync } from 'node:fs';
import type { PlayerGameLine } from '../types';
import { toGameLines as mapLines } from '../sleeper/map';

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

/** Fixture lines → engine lines via the production mapper (lib/myteam/sleeper/map.ts). */
export function toGameLines(lines: readonly SleeperComLine[]): PlayerGameLine[] {
  return mapLines(lines);
}
