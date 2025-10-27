export function formatKickoffChicago(iso?: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const fmt = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/Chicago',
    });
    return fmt.format(d);
  } catch {
    return '—';
  }
}


