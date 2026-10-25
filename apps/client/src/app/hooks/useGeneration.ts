import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import type { Job } from '@app/api/client';
import {
  courseKeys,
  generateExercises,
  generateLesson,
  jobKeys,
} from '@app/api/queries';
import { useJobs } from '@app/hooks/useJobs';

export type GenerationKind = 'lesson' | 'exercises';

const JOB_KIND: Record<GenerationKind, Job['kind']> = {
  lesson: 'lesson_generation',
  exercises: 'exercise_generation',
};

const isActive = (job: Job) =>
  job.status === 'pending' || job.status === 'running';

/**
 * Starts the generation of a topic's lesson or exercises and follows the job.
 *
 * The server runs one generation per course at a time, so `busy` covers every topic of the
 * course, while `runningHere` says whether the running job is the one asked for here.
 */
export function useGeneration(slug: string, topicId: string) {
  const queryClient = useQueryClient();
  const { data: courseJobs } = useJobs({ slug });
  const activeJob = courseJobs?.find(isActive);

  // When the running job ends, whatever it wrote (course bundle, lesson, exercises) is stale.
  const previousActiveId = useRef<string | undefined>(undefined);
  useEffect(() => {
    const previous = previousActiveId.current;
    previousActiveId.current = activeJob?.id;
    if (previous !== undefined && activeJob === undefined) {
      void queryClient.invalidateQueries({ queryKey: courseKeys.detail(slug) });
    }
  }, [activeJob, queryClient, slug]);

  const mutation = useMutation({
    mutationFn: (kind: GenerationKind) =>
      kind === 'lesson'
        ? generateLesson(slug, topicId)
        : generateExercises(slug, topicId),
    // Returning the promise keeps the mutation "pending" until the job list is refreshed, so
    // the button does not flash back to enabled before the new job shows up. It also covers
    // a 409 (someone else started a generation): the refreshed list shows that job.
    onSettled: () => queryClient.invalidateQueries({ queryKey: jobKeys.all }),
  });

  return {
    start: (kind: GenerationKind) => mutation.mutate(kind),
    startError: mutation.error,
    busy: mutation.isPending || activeJob !== undefined,
    /** True while the job running on the course is the generation of `kind` for this topic. */
    runningHere: (kind: GenerationKind) =>
      activeJob?.kind === JOB_KIND[kind] && activeJob.topic_id === topicId,
    /** True while a generation runs on the course, but not this one. */
    runningElsewhere: (kind: GenerationKind) =>
      activeJob !== undefined &&
      !(activeJob.kind === JOB_KIND[kind] && activeJob.topic_id === topicId),
  };
}
