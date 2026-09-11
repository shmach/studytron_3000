import { useQuery } from '@tanstack/react-query';

import { coursesListQuery } from '@app/api/queries';

/** Every course found in the configured vault, curriculum plus generated content. */
export function useCourses() {
  return useQuery(coursesListQuery());
}
