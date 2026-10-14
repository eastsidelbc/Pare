/**
 * LeansScreen — the Leans tab list (/leans; A2-bets-list, A2b-bets-list-saved).
 * L1 shell: header + footer. The props + game cards land in L4.
 */

'use client';

import { useState } from 'react';
import { MAX_WEEK, MIN_WEEK } from '@/lib/schedule';
import { useSchedule } from '@/components/schedule/ScheduleProvider';
import LeansHeader from './LeansHeader';
import LeansFooter from './LeansFooter';
import { LeansShell } from './LeansShell';

const clamp = (w: number) => Math.min(MAX_WEEK, Math.max(MIN_WEEK, w));

export default function LeansScreen() {
  const { currentNflWeek } = useSchedule();
  const [week, setWeek] = useState(currentNflWeek);
  return (
    <LeansShell
      header={<LeansHeader week={week} onStep={(d) => setWeek((w) => clamp(w + d))} onJump={(w) => setWeek(clamp(w))} />}
    >
      <div className="px-4 pt-[14px]">
        <LeansFooter />
      </div>
    </LeansShell>
  );
}
