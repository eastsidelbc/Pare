import type { MatchupPayload } from '@/types/matchup';

export function getMockMatchup(awayAbbr: string, homeAbbr: string): MatchupPayload {
  // hard-coded simple examples
  if (awayAbbr === 'KC' && homeAbbr === 'BUF') {
    return { chips: ['Top-5 Pass O vs Bottom-10 Pass D', 'RZ TD%: 68% vs 44%'] };
  }
  if (awayAbbr === 'SF' && homeAbbr === 'SEA') {
    return { chips: ['Elite Rush O vs Weak Rush D', 'Turnover Margin +8 vs -2'] };
  }
  return { chips: ['Balanced matchup', 'Watch 3rd Down %'] };
}


