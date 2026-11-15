import { courseJobQuery } from '@app/api/queries';
import { useQuery } from '@tanstack/react-query';

export function useCourseJob(jobId: string | null) {
  return useQuery({
    ...courseJobQuery(jobId ?? ''),
    enabled: jobId !== null,
  });
}
