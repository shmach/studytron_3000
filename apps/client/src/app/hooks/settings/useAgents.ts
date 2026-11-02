import { useQuery } from '@tanstack/react-query';

import { agentsQuery } from '@app/api/queries';

/** The agents the server can drive, with the texts that explain how to install each one. */
export function useAgents() {
  return useQuery(agentsQuery());
}
