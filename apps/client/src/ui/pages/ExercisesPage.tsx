import { ArrowLeft } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { ApiError } from '@app/api/client';
import type { Topic } from '@app/api/client';
import { useCourse } from '@app/hooks/useCourse';
import { useExerciseSet } from '@app/hooks/useExerciseSet';
import { dateFormatter } from '@app/lib/dateFormatter';
import { topicPath } from '@app/lib/routes';
import { flattenTopics } from '@app/lib/topic';
import { AccentRule } from '@ui/components/AccentRule';
import { ErrorState } from '@ui/components/ErrorState';
import { GenerateButton } from '@ui/components/GenerateButton';
import { Markdown } from '@ui/components/Markdown';
import { Button } from '@ui/components/ui/Button';
import { Skeleton } from '@ui/components/ui/Skeleton';
import { BodySkeleton } from '@ui/components/BodySkeleton';
import { NotGeneratedCard } from '@ui/components/NotGeneratedCard';
import { NotFoundPage } from '@ui/pages/NotFoundPage';

export function ExercisesPage() {
  const { t } = useTranslation();
  const { slug, topicId } = useParams<{ slug: string; topicId: string }>();
  const { data: bundle, isPending, error, refetch } = useCourse(slug);
  // Start the exercises request alongside the course bundle instead of after it;
  // ExercisesBody reads the same query from the cache.
  useExerciseSet(slug, topicId);

  const topic = useMemo(
    () =>
      bundle
        ? flattenTopics(bundle.course).find((t) => t.meta.id === topicId)
        : undefined,
    [bundle, topicId],
  );

  if (!slug || !topicId) return <NotFoundPage />;
  if (isPending) return <ExercisesSkeleton />;
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!topic) return <NotFoundPage />;

  return (
    <div className="flex w-full flex-col gap-6">
      <nav>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to={topicPath(slug, topicId)}>
            <ArrowLeft />
            {t('exercises.backToLesson')}
          </Link>
        </Button>
      </nav>

      <ExercisesHeader courseTitle={bundle.course.course} topic={topic} />
      <ExercisesBody
        slug={slug}
        topicId={topicId}
        hasLesson={bundle.lessons.some((lesson) => lesson.topic === topicId)}
      />
    </div>
  );
}

function ExercisesHeader({
  courseTitle,
  topic,
}: {
  courseTitle: string;
  topic: Topic;
}) {
  const { t } = useTranslation();

  return (
    <header className="space-y-3">
      <span className="text-muted-foreground text-sm">{courseTitle}</span>
      <h1 className="text-3xl font-semibold tracking-tight">
        <span className="text-muted-foreground font-mono text-2xl">
          {topic.meta.id}
        </span>{' '}
        {t('exercises.title', { title: topic.title })}
      </h1>
      <AccentRule />
    </header>
  );
}

interface ExercisesBodyProps {
  slug: string;
  topicId: string;
  /** The exercises are written from the lesson, so they cannot be generated without one. */
  hasLesson: boolean;
}

function ExercisesBody({ slug, topicId, hasLesson }: ExercisesBodyProps) {
  const { t, i18n } = useTranslation();
  const {
    data: exerciseSet,
    isPending,
    error,
    refetch,
  } = useExerciseSet(slug, topicId);

  if (isPending) return <BodySkeleton />;

  if (error) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <NotGeneratedCard
          title={t('exercises.notGeneratedTitle')}
          body={t('exercises.notGeneratedBody')}
        >
          <GenerateButton
            slug={slug}
            topicId={topicId}
            kind="exercises"
            disabledReason={hasLesson ? undefined : t('exercises.needsLesson')}
          />
          {!hasLesson && (
            <Button asChild variant="link" className="h-auto p-0">
              <Link to={topicPath(slug, topicId)}>
                {t('exercises.goToLesson')}
              </Link>
            </Button>
          )}
        </NotGeneratedCard>
      );
    }
    return <ErrorState error={error} onRetry={() => void refetch()} />;
  }

  return (
    <article className="space-y-4">
      <p className="text-muted-foreground text-sm">
        {t('exercises.generatedOn', {
          date: dateFormatter(exerciseSet.generated, i18n.resolvedLanguage),
        })}{' '}
        ·{' '}
        {t('exercises.difficultyTarget', {
          value: exerciseSet.difficulty_target,
        })}
      </p>
      <Markdown>{exerciseSet.content}</Markdown>
    </article>
  );
}

function ExercisesSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-1/2" />
      <BodySkeleton />
    </div>
  );
}
