import { queryOptions } from '@tanstack/react-query'

import { api, ApiError } from './client'

/**
 * Query key factory. Keeping keys in one place makes invalidation predictable
 * once the app starts writing back or listening to SSE updates.
 */
export const courseKeys = {
  all: ['courses'] as const,
  list: () => [...courseKeys.all, 'list'] as const,
  detail: (slug: string) => [...courseKeys.all, 'detail', slug] as const,
}

/** Normalize openapi-fetch's `{ data, error, response }` into data-or-throw for TanStack Query. */
function unwrap<T>(result: {
  data?: T
  error?: unknown
  response: Response
}): T {
  if (result.error !== undefined || result.data === undefined) {
    const detail =
      typeof result.error === 'object' && result.error !== null && 'detail' in result.error
        ? String((result.error as { detail: unknown }).detail)
        : result.response.statusText
    throw new ApiError(result.response.status, detail || `HTTP ${result.response.status}`)
  }
  return result.data
}

export const coursesListQuery = () =>
  queryOptions({
    queryKey: courseKeys.list(),
    queryFn: async ({ signal }) => unwrap(await api.GET('/courses', { signal })),
  })

export const courseDetailQuery = (slug: string) =>
  queryOptions({
    queryKey: courseKeys.detail(slug),
    queryFn: async ({ signal }) =>
      unwrap(await api.GET('/courses/{slug}', { params: { path: { slug } }, signal })),
  })
