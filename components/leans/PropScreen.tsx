/**
 * PropScreen — /leans/prop/[propId] container. The id names game · player · stat
 * (`propIdOf`); the line comes from the book feed for that week (/api/leans/props),
 * the Leans bundle (the player's team) supplies his games + the opponent's tier.
 */

'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { buildGameProps, evaluateAutoProp } from '@/lib/leans/autoProps';
import { useLeansBundle, useWeekPropLines, weekOfGameId } from '@/lib/leans/client';
import { propWhy } from '@/lib/leans/evaluate';
import { PROP_STAT_LABEL } from '@/lib/leans/format';
import { parsePropId } from '@/lib/leans/propLines';
import LeansFooter from './LeansFooter';
import { LeansShell, LeansTitleBar } from './LeansShell';
import PropDetailView from './PropDetailView';
import { useWeekGames } from './useWeekGames';

export default function PropScreen({ propId }: { propId: string }) {
  const ref = useMemo(() => parsePropId(propId), [propId]);
  const week = ref ? weekOfGameId(ref.gameId) : null;
  const { matchups, status } = useWeekGames(week);
  const matchup = matchups.find((m) => m.id === ref?.gameId) ?? null;
  const { lines, state: linesState } = useWeekPropLines(week);
  const { bundle, state } = useLeansBundle(useMemo(() => (matchup ? [matchup.away.abbr, matchup.home.abbr] : []), [matchup]));

  const prop = useMemo(
    () => (ref && matchup ? buildGameProps(matchup, lines?.[matchup.id], bundle).find((p) => p.playerId === ref.playerId && p.stat === ref.stat) ?? null : null),
    [ref, matchup, lines, bundle],
  );
  const e = useMemo(() => (prop ? evaluateAutoProp(prop, bundle) : null), [prop, bundle]);
  const why = useMemo(() => (e ? propWhy(e, bundle) : []), [e, bundle]);

  const first = prop?.playerName.split(/\s+/)[0] ?? 'Prop';
  const header = <LeansTitleBar title={prop ? `${first} · ${PROP_STAT_LABEL[prop.stat]}` : 'Prop'} sub={week != null ? `Week ${week}` : undefined} />;
  const loading = !!ref && (status === 'loading' || linesState === 'loading' || state === 'loading');

  if (!prop || !e) {
    return (
      <LeansShell header={header}>
        <div className="flex flex-col px-3" style={{ gap: 8, paddingTop: 8 }}>
          <div className="text-center" style={{ padding: '40px 16px', fontSize: 13, color: 'var(--subtext)' }}>
            {loading ? (
              'Loading…'
            ) : (
              <>
                This prop line isn&apos;t posted any more.{' '}
                <Link href="/leans" style={{ color: 'var(--gold-bright)', fontWeight: 700 }}>
                  Back to Leans
                </Link>
              </>
            )}
          </div>
          <LeansFooter />
        </div>
      </LeansShell>
    );
  }

  return (
    <LeansShell header={header}>
      <PropDetailView e={e} why={why} loading={state === 'loading'} />
    </LeansShell>
  );
}
