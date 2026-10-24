/**
 * MatchupData — the prop screen's "Matchup data" block (prop engine v2 as data rows only,
 * Kobe 2026-10-23; design-system §9.5): the facts box (why-stats recipe) + the two history
 * rows, each a sentence over hit dots — "vs WR1s, last 6: LV allowed 5.8 receptions · over
 * 5.5 in 4 of 6" and "vs the stingiest D's at RB rush yds (LV is #3): over 85.5 in 1 of 4".
 * Receiving props add what the defense allowed to each role (WR1 / WR2 / WR3 / TE1 / RB1).
 * Then "Week by week" (PropHistory): his weeks / the defense's weeks.
 * Info only: no lean comes from these rows.
 */

import { PROP_STAT_SHORT } from '@/lib/leans/format';
import type { MatchupData as Data, MockRow } from '@/lib/leans/matchupData';
import type { PropPosition, PropSide, PropStat } from '@/lib/leans/types';
import HitDots from './HitDots';
import PropHistory from './PropHistory';
import { Bolded, LABEL9, WhyList } from './ui';

function Mock({ row, side, kind }: { row: MockRow; side: PropSide; kind: 'role' | 'similar' }) {
  return (
    <div data-mock={kind} className="flex flex-col" style={{ gap: 8 }}>
      <p style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.4, color: 'var(--subtext)' }}>
        <Bolded text={row.text} />
      </p>
      <HitDots hits={row.cells} side={side} />
    </div>
  );
}

export interface MatchupDataProps {
  data: Data;
  side: PropSide;
  opp: string;
  stat: PropStat;
  name: string;
  position: PropPosition;
}

export default function MatchupData({ data, side, opp, stat, name, position }: MatchupDataProps) {
  if (data.rows.length === 0 && data.roles.length === 0 && !data.vsRole && !data.vsSimilar) return null;
  return (
    <section data-matchup-data aria-label="Matchup data" className="flex flex-col" style={{ gap: 8 }}>
      <div style={LABEL9}>Matchup data · info only</div>
      {data.vsRole && <Mock row={data.vsRole} side={side} kind="role" />}
      {data.vsSimilar && <Mock row={data.vsSimilar} side={side} kind="similar" />}
      {data.roles.length > 0 && (
        <>
          <div style={LABEL9}>
            {opp} vs each receiver · {PROP_STAT_SHORT[stat]} / game
          </div>
          <WhyList rows={data.roles} />
        </>
      )}
      <WhyList rows={data.rows} />
      <PropHistory his={data.his} defense={data.defense} name={name} opp={opp} position={position} stat={stat} side={side} role={data.role} />
    </section>
  );
}
