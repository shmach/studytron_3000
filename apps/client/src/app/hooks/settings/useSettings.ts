import { useQuery } from '@tanstack/react-query';

import { settingsQuery } from '@app/api/queries';

/** The agent and the vault folder the server is using, plus the recently used folders. */
export function useSettings() {
  return useQuery(settingsQuery());
}
