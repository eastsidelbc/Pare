/**
 * /sandbox/myteam — dev-only fixture page: every My Team state at once from
 * synthetic data, for checks and screenshots. 404 in production builds.
 */
import { notFound } from 'next/navigation';
import MyTeamSandbox from '@/components/myteam/MyTeamSandbox';

export const metadata = { title: 'My Team sandbox · Pare', robots: { index: false, follow: false } };

export default function MyTeamSandboxPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <MyTeamSandbox />;
}
