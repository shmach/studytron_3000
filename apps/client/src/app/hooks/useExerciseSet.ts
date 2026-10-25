import { courseExercisesQuery } from '@app/api/queries';
import { useQuery } from '@tanstack/react-query';

export function useExerciseSet(
  slug: string | undefined,
  topicId: string | undefined,
) {
  return useQuery({
    ...courseExercisesQuery(slug ?? '', topicId ?? ''),
    enabled: Boolean(slug) && Boolean(topicId),
  });
}
