import type { CourseBundle, Job } from '@app/api/client';
import { coursePath, exercisesPath, topicPath } from '@app/lib/routes';

export const isJobActive = (job: Job) =>
  job.status === 'pending' || job.status === 'running';

/** What a job works on, as names the student recognizes. Null when the course is not loaded. */
export interface JobTarget {
  courseName: string | null;
  topicTitle: string | null;
}

export function describeJob(job: Job, courses: CourseBundle[]): JobTarget {
  const course = courses.find((bundle) => bundle.course.slug === job.slug);
  const topic = course?.course.modules
    .flatMap((module) => module.topics)
    .find((candidate) => candidate.meta.id === job.topic_id);

  return {
    courseName: course?.course.course ?? null,
    topicTitle: topic?.title ?? null,
  };
}

/** Where the result of a job can be seen, or null while there is nowhere to go. */
export function jobResultPath(job: Job): string | null {
  if (!job.slug) return null;
  if (job.kind === 'course_creation') return coursePath(job.slug);
  if (!job.topic_id) return coursePath(job.slug);
  return job.kind === 'exercise_generation'
    ? exercisesPath(job.slug, job.topic_id)
    : topicPath(job.slug, job.topic_id);
}

export type JobEvent =
  { type: 'started'; job: Job } | { type: 'finished'; job: Job };

/**
 * Compares two snapshots of the job list and says what happened in between.
 *
 * A job that is new and still active has `started`. One that went from active to `done` or
 * `error` has `finished`. A job that is new and already over began and ended between two
 * snapshots: only `finished` is reported, since "started" would arrive after "finished".
 * `previous` maps job id to its status in the earlier snapshot.
 */
export function diffJobs(
  previous: ReadonlyMap<string, Job['status']>,
  jobs: readonly Job[],
): JobEvent[] {
  const events: JobEvent[] = [];
  // The API lists newest first; events read better oldest first.
  for (const job of [...jobs].reverse()) {
    const before = previous.get(job.id);
    const wasActive = before === 'pending' || before === 'running';

    if (before === undefined && isJobActive(job)) {
      events.push({ type: 'started', job });
    } else if (!isJobActive(job) && (before === undefined || wasActive)) {
      events.push({ type: 'finished', job });
    }
  }
  return events;
}
