/**
 * Ranking Debug Utilities
 * 
 * Temporary debug helpers to diagnose ranking issues
 * Remove after diagnosis complete
 */

export const DBG = process.env.NODE_ENV === 'development';

export function debugRanking(context: string, data: {
  team: string;
  metric: string;
  mode: string;
  rawValue?: any;
  transformedValue?: any;
  rank?: number;
  isTied?: boolean;
  formattedRank?: string;
  teamsWithSameValue?: number;
}) {
  if (!DBG) return;
  
  console.log(`🔍 [RANK-DEBUG] ${context}`, {
    team: data.team,
    metric: data.metric,
    mode: data.mode,
    rawValue: data.rawValue,
    transformedValue: data.transformedValue,
    rank: data.rank,
    isTied: data.isTied,
    formattedRank: data.formattedRank,
    teamsWithSameValue: data.teamsWithSameValue,
    valueType: typeof data.transformedValue,
    precision: data.transformedValue ? Number(data.transformedValue).toFixed(6) : 'N/A'
  });
}

export function debugTransform(context: string, data: {
  team: string;
  mode: string;
  games: number;
  before: any;
  after: any;
}) {
  if (!DBG) return;
  
  console.log(`🔄 [TRANSFORM-DEBUG] ${context}`, {
    team: data.team,
    mode: data.mode,
    games: data.games,
    before: {
      value: data.before,
      type: typeof data.before
    },
    after: {
      value: data.after,
      type: typeof data.after,
      precision: typeof data.after === 'number' ? Number(data.after).toFixed(6) : 'N/A'
    }
  });
}

