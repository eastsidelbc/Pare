export const ABBR_TO_NAME: Record<string, string> = {
  KC: 'Kansas City Chiefs',
  BUF: 'Buffalo Bills',
  SF: 'San Francisco 49ers',
  SEA: 'Seattle Seahawks',
  MIN: 'Minnesota Vikings',
  DET: 'Detroit Lions',
  DAL: 'Dallas Cowboys',
  NYG: 'New York Giants',
  BAL: 'Baltimore Ravens',
  MIA: 'Miami Dolphins',
  GB: 'Green Bay Packers',
  CHI: 'Chicago Bears',
};

export function abbrToName(abbr?: string): string | null {
  if (!abbr) return null;
  return ABBR_TO_NAME[abbr] || null;
}


