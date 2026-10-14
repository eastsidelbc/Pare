/**
 * TierBars — the matchup meter laid out in a ROW (bars · "Great #30" · reason), as
 * the Leans prop cards draw it (B2). Same 5 bars / colors / meaning as My Team's
 * MatchupMeter (design-system §9.4: tier n fills n bars in `--matchup-n`, the rest
 * `--matchup-track`, always paired with the tier word + rank). MatchupMeter only
 * stacks bars over the label, and components/myteam stays untouched, so the row
 * layout lives here; colors + levels come from components/myteam/style.
 */

import type { MatchupRating } from '@/lib/myteam/rating';
import { rankText, tierColor, TIER_LEVEL } from '@/components/myteam/style';

/** Mockup bar heights (B1/B2): 4 → 20px. */
const HEIGHTS = [4, 8, 12, 16, 20];

export default function TierBars({ rating, note }: { rating: MatchupRating | null; note?: string }) {
  const level = rating ? TIER_LEVEL[rating.tier] : 0;
  const color = rating ? tierColor(rating.tier) : 'var(--subtext)';
  return (
    <div data-meter data-tier={rating?.tier} className="flex items-center" style={{ gap: 10, lineHeight: 'normal' }}>
      <span aria-hidden className="flex flex-none items-end" style={{ gap: 2, height: 20 }}>
        {HEIGHTS.map((h, i) => (
          <i key={h} style={{ display: 'block', width: 7, height: h, borderRadius: 2, background: i < level ? color : 'var(--matchup-track)' }} />
        ))}
      </span>
      <span className="flex-none whitespace-nowrap tabular-nums" style={{ fontSize: 11, fontWeight: 800, color }}>
        {rating ? `${rating.label} ${rankText(rating.rank, rating.isTied)}` : '—'}
      </span>
      {note && (
        <span className="min-w-0 truncate" style={{ fontSize: 11, fontWeight: 600, color: 'var(--subtext)' }}>
          {note}
        </span>
      )}
    </div>
  );
}
