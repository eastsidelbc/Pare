export type GameStatus = 'LIVE' | 'UPCOMING' | 'FINAL';

export interface TeamSide {
  abbr: string;
  score: number | null; // null for UPCOMING
}

export interface ScoreboardGame {
  gameId: string;
  away: TeamSide;
  home: TeamSide;
  status: GameStatus;
  quarter?: string; // e.g. "Q3" or "OT"
  clock?: string; // "04:31"
  kickoffIso?: string; // UTC ISO string
  spread?: number | 0; // home-based numeric: -2.5 (home favorite), +3.0 (home dog), 0 (PK)
  total?: number | null; // e.g., 46.5
}

export interface MatchupPayload {
  chips: string[]; // ready-to-render mismatch strings
}


