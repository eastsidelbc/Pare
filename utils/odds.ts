export function formatHomeSpread(abbr: string, spread?: number | 0): string {
  if (spread === undefined || spread === 0) return 'PK';
  const sign = spread > 0 ? '+' : '';
  return `${abbr} ${sign}${spread.toFixed(1)}`;
}

export function formatTotal(total?: number | null): string {
  if (total === undefined || total === null) return '—';
  return total.toFixed(1);
}


