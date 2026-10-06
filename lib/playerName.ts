/**
 * Short player names for tight list cards (design-system §9.3): "J. Smith-Njigba".
 *
 * Box-score style — first name becomes an initial so the surname (the part people
 * scan for) gets the room. A first name that is already initials or a short nickname
 * ("C.J.", "A.J.", "DK", "JK") is kept as-is so it doesn't collapse to one letter.
 * Single-word names (D/ST nicknames like "Steelers") are unchanged.
 * Plain module so it can be unit-tested and used in client components.
 */
export function shortPlayerName(name: string): string {
  const trimmed = name.trim();
  const space = trimmed.indexOf(' ');
  if (space < 0) return trimmed;
  const first = trimmed.slice(0, space);
  const rest = trimmed.slice(space + 1).trim();
  if (!rest) return trimmed;
  // Already initials ("C.J.", "T.J.") or an all-caps nickname ("DK", "JK") → keep.
  if (first.includes('.') || /^[A-Z]{2,3}$/.test(first)) return trimmed;
  return `${first.charAt(0)}. ${rest}`;
}
