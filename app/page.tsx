/**
 * Home — schedule-first entry point.
 *
 * All data + UI state now live in <ScheduleProvider> (mounted in layout.tsx so
 * they persist across Home↔Compare navigation). This route just renders the
 * screen shell; the initial week is fetched server-side in the layout.
 */

import ScheduleScreen from '@/components/schedule/ScheduleScreen';

export default function Home() {
  return <ScheduleScreen />;
}
