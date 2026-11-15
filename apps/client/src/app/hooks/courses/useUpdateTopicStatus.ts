import { useMutation, useQueryClient } from '@tanstack/react-query';

import { courseKeys, updateTopicStatus } from '@app/api/queries';
import type { TopicStatus } from '@app/api/client';

export function useUpdateTopicStatus(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      topicId,
      status,
    }: {
      topicId: string;
      status: TopicStatus;
    }) => updateTopicStatus(slug, topicId, status),
    onSuccess: () => {
      // `exact` refetches only the course bundle (which carries the statuses). The lesson and
      // exercise queries share its key prefix but did not change.
      void queryClient.invalidateQueries({
        queryKey: courseKeys.detail(slug),
        exact: true,
      });
      void queryClient.invalidateQueries({ queryKey: courseKeys.list() });
    },
  });
}
