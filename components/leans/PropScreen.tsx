/**
 * PropScreen — /leans/prop/[propId] container. The prop lives only in this device's
 * storage; the Leans bundle (for the player's team) supplies his games + the
 * opponent's tier. Edit = the add-a-line sheet in edit mode; Remove = gone + back.
 */

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLeansBundle } from '@/lib/leans/client';
import { evaluateProp, propWhy } from '@/lib/leans/evaluate';
import { PROP_STAT_LABEL } from '@/lib/leans/format';
import { removeProp, useSavedProps } from '@/lib/leans/propStore';
import AddLineSheet from './AddLineSheet';
import LeansFooter from './LeansFooter';
import { LeansShell, LeansTitleBar } from './LeansShell';
import PropDetailView from './PropDetailView';
import { useWeekGames } from './useWeekGames';

export default function PropScreen({ propId }: { propId: string }) {
  const router = useRouter();
  const { props, hydrated } = useSavedProps();
  const prop = props.find((p) => p.id === propId) ?? null;
  const { bundle, state } = useLeansBundle(useMemo(() => (prop ? [prop.team] : []), [prop]));
  const { matchups } = useWeekGames(prop?.week ?? null);
  const matchup = matchups.find((m) => m.id === prop?.gameId) ?? null;
  const [editing, setEditing] = useState(false);

  const e = useMemo(() => (prop ? evaluateProp(prop, bundle) : null), [prop, bundle]);
  const why = useMemo(() => (e ? propWhy(e, bundle) : []), [e, bundle]);

  const first = prop?.playerName.split(/\s+/)[0] ?? 'Prop';
  const header = <LeansTitleBar title={prop ? `${first} · ${PROP_STAT_LABEL[prop.stat]}` : 'Prop'} sub={prop ? `Week ${prop.week}` : undefined} />;

  if (!prop || !e) {
    return (
      <LeansShell header={header}>
        <div className="flex flex-col px-3" style={{ gap: 8, paddingTop: 8 }}>
          <div className="text-center" style={{ padding: '40px 16px', fontSize: 13, color: 'var(--subtext)' }}>
            {hydrated ? (
              <>
                This prop isn&apos;t saved on this device.{' '}
                <Link href="/leans" style={{ color: 'var(--gold-bright)', fontWeight: 700 }}>
                  Back to Leans
                </Link>
              </>
            ) : (
              'Loading…'
            )}
          </div>
          <LeansFooter />
        </div>
      </LeansShell>
    );
  }

  return (
    <LeansShell header={header}>
      <PropDetailView
        e={e}
        why={why}
        loading={state === 'loading'}
        onEdit={() => setEditing(true)}
        onRemove={() => {
          removeProp(prop.id);
          router.push('/leans');
        }}
      />
      {matchup && (
        <AddLineSheet
          open={editing}
          onClose={() => setEditing(false)}
          matchup={matchup}
          player={e.player}
          initial={prop}
          onChangePlayer={() => {}}
          onSaved={() => setEditing(false)}
        />
      )}
    </LeansShell>
  );
}
