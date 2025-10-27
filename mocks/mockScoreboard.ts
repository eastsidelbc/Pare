import type { ScoreboardGame } from '@/types/matchup';

export const MOCK_SCOREBOARD: ScoreboardGame[] = [
  {
    gameId: 'g1',
    away: { abbr: 'KC', score: 24 },
    home: { abbr: 'BUF', score: 20 },
    status: 'LIVE',
    quarter: 'Q3',
    clock: '04:31',
    spread: -2.5, // BUF is home; negative means home favorite? Standard: negative = favorite → here BUF favored by 2.5
    total: 46.5,
  },
  {
    gameId: 'g2',
    away: { abbr: 'SF', score: 17 },
    home: { abbr: 'SEA', score: 14 },
    status: 'LIVE',
    quarter: 'Q2',
    clock: '08:15',
    spread: -3.0, // SEA home; SEA -3.0
    total: 44.0,
  },
  {
    gameId: 'g3',
    away: { abbr: 'MIN', score: null },
    home: { abbr: 'DET', score: null },
    status: 'UPCOMING',
    kickoffIso: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    spread: -2.5,
    total: 48.5,
  },
  {
    gameId: 'g4',
    away: { abbr: 'DAL', score: 31 },
    home: { abbr: 'NYG', score: 28 },
    status: 'FINAL',
    spread: 0,
    total: 45.5,
  },
  {
    gameId: 'g5',
    away: { abbr: 'BAL', score: null },
    home: { abbr: 'MIA', score: null },
    status: 'UPCOMING',
    kickoffIso: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    spread: 1.0,
    total: 50.5,
  },
  {
    gameId: 'g6',
    away: { abbr: 'GB', score: 10 },
    home: { abbr: 'CHI', score: 20 },
    status: 'FINAL',
    spread: -3.0,
    total: 42.0,
  },
];


