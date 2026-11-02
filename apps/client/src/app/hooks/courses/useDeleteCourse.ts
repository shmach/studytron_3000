import { courseKeys, deleteCourse } from '@app/api/queries';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useDeleteCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCourse,
    onSuccess: (_data, slug) => {
      queryClient.removeQueries({ queryKey: courseKeys.detail(slug) });
      void queryClient.invalidateQueries({ queryKey: courseKeys.list() });
    },
  });
}
