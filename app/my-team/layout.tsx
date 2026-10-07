/**
 * /my-team — route-scoped provider (other tabs never load My Team state).
 */
import { MyTeamProvider } from '@/components/myteam/MyTeamProvider';

export default function MyTeamLayout({ children }: { children: React.ReactNode }) {
  return <MyTeamProvider>{children}</MyTeamProvider>;
}
