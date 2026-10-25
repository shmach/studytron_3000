import { courseLessonQuery } from '@app/api/queries';
import { useQuery } from '@tanstack/react-query';

export function useLesson(
  slug: string | undefined,
  topicId: string | undefined,
) {
  return useQuery({
    ...courseLessonQuery(slug ?? '', topicId ?? ''),
    enabled: Boolean(slug) && Boolean(topicId),
  });
}
