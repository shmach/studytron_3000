import { useQuery } from '@tanstack/react-query';

import { jobsQuery } from '@app/api/queries';
import type { JobsFilter } from '@app/api/queries';

/** Jobs of the local server, newest first. Polls while one of them is running. */
export function useJobs(filter: JobsFilter = {}) {
  return useQuery(jobsQuery(filter));
}
