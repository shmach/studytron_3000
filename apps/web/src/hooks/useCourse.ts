import { useQuery } from '@tanstack/react-query'

import { courseDetailQuery } from '@/api/queries'

/** One course by slug. Disabled while `slug` is empty (e.g. before the route param resolves). */
export function useCourse(slug: string | undefined) {
  return useQuery({
    ...courseDetailQuery(slug ?? ''),
    enabled: Boolean(slug),
  })
}
