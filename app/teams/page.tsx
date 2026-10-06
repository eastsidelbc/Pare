/**
 * /teams — manage "Your teams" (favorites): order, remove, add, display switches.
 * Client-only state (localStorage via <FavoritesProvider>), so this route just
 * renders the screen shell.
 */

import YourTeamsScreen from '@/components/favorites/YourTeamsScreen';

export const metadata = { title: 'Your teams · Pare' };

export default function TeamsPage() {
  return <YourTeamsScreen />;
}
