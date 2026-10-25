import { queryOptions } from '@tanstack/react-query';

import { api, ApiError } from './client';
import type { TopicStatus } from './client';

/**
 * Query key factory. Keeping keys in one place makes invalidation predictable
 * once the app starts writing back or listening to SSE updates.
 */
export const courseKeys = {
  all: ['courses'] as const,
  list: () => [...courseKeys.all, 'list'] as const,
  detail: (slug: string) => [...courseKeys.all, 'detail', slug] as const,
  lesson: (slug: string, topicId: string) =>
    [...courseKeys.detail(slug), 'lesson', topicId] as const,
  exercises: (slug: string, topicId: string) =>
    [...courseKeys.detail(slug), 'exercises', topicId] as const,
};

/** Normalize openapi-fetch's `{ data, error, response }` into data-or-throw for TanStack Query. */
function unwrap<T>(result: {
  data?: T;
  error?: unknown;
  response: Response;
}): T {
  if (result.error !== undefined || result.data === undefined) {
    throw toApiError(result);
  }
  return result.data;
}

function toApiError(result: { error?: unknown; response: Response }) {
  const detail =
    typeof result.error === 'object' &&
    result.error !== null &&
    'detail' in result.error
      ? String((result.error as { detail: unknown }).detail)
      : result.response.statusText;
  return new ApiError(
    result.response.status,
    detail || `HTTP ${result.response.status}`,
  );
}

export function retryUnlessNotFound(error: unknown): boolean {
  if (error instanceof ApiError && error.status === 404) return false;
  return true;
}

export const coursesListQuery = () =>
  queryOptions({
    queryKey: courseKeys.list(),
    queryFn: async ({ signal }) =>
      unwrap(await api.GET('/courses', { signal })),
  });

export const courseDetailQuery = (slug: string) =>
  queryOptions({
    queryKey: courseKeys.detail(slug),
    queryFn: async ({ signal }) =>
      unwrap(
        await api.GET('/courses/{slug}', {
          params: { path: { slug } },
          signal,
        }),
      ),
  });

/** A missing lesson/exercise set is a normal state (not generated yet), so don't retry on 404. */
const retryUnlessMissing = (failureCount: number, error: Error) =>
  retryUnlessNotFound(error) && failureCount < 3;

export const courseLessonQuery = (slug: string, topicId: string) =>
  queryOptions({
    queryKey: courseKeys.lesson(slug, topicId),
    retry: retryUnlessMissing,
    queryFn: async ({ signal }) =>
      unwrap(
        await api.GET('/courses/{slug}/lessons/{topic_id}', {
          params: { path: { slug, topic_id: topicId } },
          signal,
        }),
      ),
  });

export const courseExercisesQuery = (slug: string, topicId: string) =>
  queryOptions({
    queryKey: courseKeys.exercises(slug, topicId),
    retry: retryUnlessMissing,
    queryFn: async ({ signal }) =>
      unwrap(
        await api.GET('/courses/{slug}/exercises/{topic_id}', {
          params: { path: { slug, topic_id: topicId } },
          signal,
        }),
      ),
  });

export const courseJobQuery = (jobId: string) =>
  queryOptions({
    queryKey: ['courses', 'job', jobId] as const,
    queryFn: async () =>
      unwrap(
        await api.GET('/courses/jobs/{job_id}', {
          params: { path: { job_id: jobId } },
        }),
      ),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'done' || status === 'error' ? false : 2000;
    },
  });

export const jobKeys = {
  all: ['jobs'] as const,
  list: (filter: JobsFilter) => [...jobKeys.all, 'list', filter] as const,
};

/** `slug` keeps one course's jobs; `active` keeps only running (true) or only finished (false) jobs. */
export interface JobsFilter {
  slug?: string;
  active?: boolean;
}

const POLL_JOBS_EVERY_MS = 2000;

/**
 * Jobs of this server run, newest first. While any of the returned jobs is still running the
 * query repeats every 2 s; with nothing running it only refreshes on window focus or when
 * something invalidates `jobKeys`, so an idle app does not keep calling the server.
 */
export const jobsQuery = (filter: JobsFilter = {}) =>
  queryOptions({
    queryKey: jobKeys.list(filter),
    queryFn: async ({ signal }) =>
      unwrap(await api.GET('/jobs', { params: { query: filter }, signal })),
    refetchInterval: (query) =>
      query.state.data?.some(
        (job) => job.status === 'pending' || job.status === 'running',
      )
        ? POLL_JOBS_EVERY_MS
        : false,
  });

/** Returns the updated topic. Errors: 404 (unknown topic), 409 (`in_progress` without a lesson). */
export async function updateTopicStatus(
  slug: string,
  topicId: string,
  status: TopicStatus,
) {
  return unwrap(
    await api.PATCH('/courses/{slug}/topics/{topic_id}/status', {
      params: { path: { slug, topic_id: topicId } },
      body: { status },
    }),
  );
}

export async function createCourseJob(userPrompt: string) {
  return unwrap(
    await api.POST('/courses', {
      params: { query: { user_prompt: userPrompt } },
    }),
  );
}

/** 204 No Content has no body, so `unwrap` can't be used here — only the status matters. */
export async function deleteCourse(slug: string) {
  const result = await api.DELETE('/courses/{slug}', {
    params: { path: { slug } },
  });
  if (!result.response.ok) throw toApiError(result);
}
