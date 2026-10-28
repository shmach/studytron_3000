import { useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import type { CourseBundle, Job } from '@app/api/client';
import {
  courseDetailQuery,
  courseKeys,
  coursesListQuery,
} from '@app/api/queries';
import { useJobs } from '@app/hooks/useJobs';
import { describeJob, diffJobs, jobResultPath } from '@app/lib/jobs';

/** Courses already in the query cache; toasts must not trigger requests of their own. */
function cachedCourses(queryClient: QueryClient, slug: string | null) {
  const courses: CourseBundle[] = [
    ...(queryClient.getQueryData(coursesListQuery().queryKey) ?? []),
  ];
  const detail = slug
    ? queryClient.getQueryData(courseDetailQuery(slug).queryKey)
    : undefined;
  if (detail) courses.push(detail);
  return courses;
}

interface JobsWatcherOptions {
  /** Called once for each lesson job that finishes with topics waiting for a status decision. */
  onPendingDecisions: (job: Job) => void;
}

/**
 * Watches every job of the server from the app layout, so it works on any screen.
 *
 * It compares each job list with the previous one and, for what changed, shows a toast
 * (started, finished, failed) and refreshes the course the job wrote to. This is the only
 * place that does either, so a job never produces two toasts or two refreshes.
 *
 * The first list only records the state: jobs that were already running when the app
 * opened are not announced as new.
 */
export function useJobsWatcher({ onPendingDecisions }: JobsWatcherOptions) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: jobs } = useJobs();
  const previousStatuses = useRef<Map<string, Job['status']> | null>(null);

  useEffect(() => {
    if (!jobs) return;

    const previous = previousStatuses.current;
    previousStatuses.current = new Map(jobs.map((job) => [job.id, job.status]));
    if (previous === null) return;

    for (const event of diffJobs(previous, jobs)) {
      const { job } = event;
      const { courseName, topicTitle } = describeJob(
        job,
        cachedCourses(queryClient, job.slug ?? null),
      );
      const topic = job.topic_id ?? '';
      const context = [courseName, topicTitle].filter(Boolean).join(' · ');

      if (event.type === 'started') {
        toast.info(t(`jobs.toast.started.${job.kind}` as const, { topic }), {
          description: context || undefined,
        });
        continue;
      }

      // Whatever the job wrote (course bundle, lesson, exercises) is stale now.
      if (job.slug) {
        void queryClient.invalidateQueries({
          queryKey: courseKeys.detail(job.slug),
        });
      }
      void queryClient.invalidateQueries({ queryKey: courseKeys.list() });

      if (job.status === 'error') {
        toast.error(t(`jobs.toast.failed.${job.kind}` as const, { topic }), {
          description: job.error ?? (context || undefined),
        });
        continue;
      }

      const path = jobResultPath(job);
      toast.success(t(`jobs.toast.done.${job.kind}` as const, { topic }), {
        description: context || undefined,
        action: path
          ? { label: t('jobs.toast.open'), onClick: () => void navigate(path) }
          : undefined,
      });

      if (
        job.kind === 'lesson_generation' &&
        job.pending_decisions.length > 0
      ) {
        onPendingDecisions(job);
      }
    }
  }, [jobs, navigate, onPendingDecisions, queryClient, t]);
}
