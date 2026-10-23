/**
 * Leans — shared types for the pure engine, the API bundle and the UI.
 * Pure (no server-only imports), so client code can import it.
 */

import type { DefenseGame } from '@/lib/myteam/defenseProfile';
import type { FpaTable } from '@/lib/myteam/fpa';
import type { TeamSchedule } from '@/lib/myteam/schedule';
import type { InjuryTag } from '@/lib/myteam/types';
import type { PropTables } from './tables';

/** What the data says about one line. `side` = spread / moneyline lean (with `side` set). */
export type LeanVerdict = 'over' | 'under' | 'side' | 'none' | 'not-enough';

/** One of the three checks. `label` marks bold parts with `**…**`. */
export interface LeanSignal {
  ok: boolean;
  label: string;
}

export interface LeanResult {
  verdict: LeanVerdict;
  /** Spread / moneyline lean side. */
  side?: 'away' | 'home';
  /** Always three, in the order the UI lists them. */
  signals: LeanSignal[];
  /** How many of the three are ✓ (for "Why — 3 of 3 signals agree"). */
  okCount: number;
  /** One line under the row ("Both offenses bottom-10 in points, last 4 (**ATL #24 · LV #27**)"). */
  summary: string;
  /** Short reason for the list card's lean row ("Both offenses bottom-10 in pts, last 4"). */
  short: string;
}

/** Prop stats a user can type a line for (DECISIONS §7). */
export type PropStat = 'rush_yd' | 'rec_yd' | 'rec' | 'rush_rec_yd' | 'anytime_td';
export type PropSide = 'over' | 'under';
export type PropPosition = 'QB' | 'RB' | 'WR' | 'TE';

/** One player's prop stats in one game (Sleeper keys; absent = 0 upstream). */
export interface PlayerGame {
  week: number;
  opp: string;
  rush_yd: number;
  rec: number;
  rec_yd: number;
  rush_td: number;
  rec_td: number;
  /** Usage (prop engine v2, optional so older fixtures stay valid): his team that week, targets, carries. */
  team?: string;
  tgt?: number;
  att?: number;
  /** Offensive snaps and his team's; null = Sleeper sent none. */
  snp?: number | null;
  tmSnp?: number | null;
}

/** A player's role on his team going into a week (target share; RBs by touches). */
export type Role = 'WR1' | 'WR2' | 'WR3' | 'TE1' | 'RB1' | 'RB2';

/** One team's score line in one game (ESPN box score). */
export interface TeamGame {
  team: string;
  opp: string;
  week: number;
  points: number;
  pointsAllowed: number;
}

export interface LeansPlayer {
  id: string;
  name: string;
  position: PropPosition;
  /** NFL team abbreviation (current). */
  team: string;
  injury: InjuryTag | null;
  /** This season's games, ascending by week. */
  games: PlayerGame[];
}

/** GET /api/leans/data body — raw values only; the client windows + ranks them. */
export interface LeansBundle {
  season: number;
  /** Current NFL week (ESPN). */
  week: number;
  completedWeeks: number[];
  /** All 32 teams, completed weeks. */
  teamLog: TeamGame[];
  /** All 32 teams (why-stats: rush yds / pass yds allowed …). */
  defenseLog: DefenseGame[];
  /** Sleeper PPR points allowed, QB/RB/WR/TE only. */
  fpa: FpaTable;
  /** Only the requested teams' prop-eligible players. */
  players: LeansPlayer[];
  /** Only the requested teams (next-5 week cells). */
  schedule: TeamSchedule;
  /**
   * Prop engine v2 tables as of this week (lib/leans/tables.ts): league-wide allowance + team
   * volume, roles for the requested teams' players, role logs only for their opponents.
   * Optional so older fixtures / cached copies still parse.
   */
  tables?: PropTables;
  generatedAt: string;
}

/**
 * One prop line for the engine + views. Since 2026-10-23 built from the book feed
 * (lib/leans/autoProps.ts); the name is from the retired typed-line store.
 */
export interface SavedProp {
  id: string;
  /** `Matchup.id`, e.g. "2026-w7-ATL-LV". */
  gameId: string;
  week: number;
  playerId: string;
  playerName: string;
  position: PropPosition;
  team: string;
  opp: string;
  /** Player's team is the home side. */
  home: boolean;
  stat: PropStat;
  side: PropSide;
  line: number;
  createdAt: string;
}
