import { useQuery } from '@tanstack/react-query';

import { agentCheckQuery } from '@app/api/queries';
import type { AgentId } from '@app/api/client';

/** Checks that the agent is installed; `refetch()` runs the test again on demand. */
export function useAgentCheck(agentId: AgentId | undefined) {
  return useQuery({
    // `agentId` is unknown until the settings load; the check waits for it.
    ...agentCheckQuery(agentId ?? 'claude'),
    enabled: agentId !== undefined,
  });
}
