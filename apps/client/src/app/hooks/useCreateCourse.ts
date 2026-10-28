import { createCourseJob, jobKeys } from '@app/api/queries';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useCreateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCourseJob,
    // The global job list stops polling when idle; refresh it so the panel and the
    // watcher see the new job.
    onSettled: () => queryClient.invalidateQueries({ queryKey: jobKeys.all }),
  });
}
