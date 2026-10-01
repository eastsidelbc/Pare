import { describe, it, expect } from 'vitest';
import {
  isAverageTeam,
  isNonSelectableSpecialTeam,
  shouldExcludeFromRanking,
  getTeamDisplayLabel,
  getTeamEmoji,
} from '../teamHelpers';

describe('isAverageTeam', () => {
  it('recognizes the average-team spellings', () => {
    expect(isAverageTeam('Avg Tm/G')).toBe(true);
    expect(isAverageTeam('Avg/TmG')).toBe(true);
    expect(isAverageTeam('Average team/G')).toBe(true);
  });
  it('is false for real teams / other specials / undefined', () => {
    expect(isAverageTeam('Buffalo Bills')).toBe(false);
    expect(isAverageTeam('Avg Team')).toBe(false);
    expect(isAverageTeam(undefined)).toBe(false);
  });
});

describe('isNonSelectableSpecialTeam', () => {
  it('flags League Total / Avg Team, not the average row', () => {
    expect(isNonSelectableSpecialTeam('Avg Team')).toBe(true);
    expect(isNonSelectableSpecialTeam('League Total')).toBe(true);
    expect(isNonSelectableSpecialTeam('Avg Tm/G')).toBe(false);
    expect(isNonSelectableSpecialTeam('Buffalo Bills')).toBe(false);
  });
});

describe('shouldExcludeFromRanking', () => {
  it('excludes every special row, keeps real teams', () => {
    expect(shouldExcludeFromRanking('Avg Tm/G')).toBe(true);
    expect(shouldExcludeFromRanking('Avg Team')).toBe(true);
    expect(shouldExcludeFromRanking('League Total')).toBe(true);
    expect(shouldExcludeFromRanking('Buffalo Bills')).toBe(false);
  });
});

describe('labels & emoji', () => {
  it('labels the average row and passes real names through', () => {
    expect(getTeamDisplayLabel('Avg Tm/G')).toBe('Avg (per game)');
    expect(getTeamDisplayLabel('Buffalo Bills')).toBe('Buffalo Bills');
  });
  it('emoji only for the average row', () => {
    expect(getTeamEmoji('Avg Tm/G')).toBe('📊');
    expect(getTeamEmoji('Buffalo Bills')).toBeNull();
  });
});
