import { useQuery } from '@tanstack/react-query';

import { jobsQuery } from '@app/api/queries';
import type { JobsFilter } from '@app/api/queries';

export function useJobs(filter: JobsFilter = {}) {
  return useQuery(jobsQuery(filter));
}
