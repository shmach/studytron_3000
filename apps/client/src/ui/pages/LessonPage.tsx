import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
} from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { ApiError } from '@app/api/client';
import type { CourseBundle, Topic } from '@app/api/client';
import { useCourse } from '@app/hooks/useCourse';
import { useLesson } from '@app/hooks/useLesson';
import { dateFormatter } from '@app/lib/dateFormatter';
import { exercisesPath, topicPath } from '@app/lib/routes';
import { flattenTopics, getNeighbors } from '@app/lib/topic';
import type { Neighbors } from '@app/lib/topic';
import { ErrorState } from '@ui/components/ErrorState';
import { Markdown } from '@ui/components/Markdown';
import { GenerateButton } from '@ui/components/GenerateButton';
import { StatusSelect } from '@ui/components/StatusSelect';
import { Badge } from '@ui/components/ui/Badge';
import { Button } from '@ui/components/ui/Button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ui/components/ui/Card';
import { Skeleton } from '@ui/components/ui/Skeleton';
import { BodySkeleton } from '@ui/components/BodySkeleton';
import { NotGeneratedCard } from '@ui/components/NotGeneratedCard';
import { NotFoundPage } from '@ui/pages/NotFoundPage';

export function LessonPage() {
  const { slug, topicId } = useParams<{ slug: string; topicId: string }>();
  const { data: bundle, isPending, error, refetch } = useCourse(slug);
  // Start the lesson request alongside the course bundle instead of after it;
  // LessonBody reads the same query from the cache.
  useLesson(slug, topicId);

  const topics = useMemo(
    () => (bundle ? flattenTopics(bundle.course) : []),
    [bundle],
  );

  if (!slug || !topicId) return <NotFoundPage />;
  if (isPending) return <LessonSkeleton />;
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const neighbors = getNeighbors(topics, topicId);
  if (!neighbors) return <NotFoundPage />;

  return (
    <LessonView
      slug={slug}
      bundle={bundle}
      topic={neighbors.current}
      neighbors={neighbors}
    />
  );
}

interface LessonViewProps {
  slug: string;
  bundle: CourseBundle;
  topic: Topic;
  neighbors: Neighbors;
}

function LessonView({ slug, bundle, topic, neighbors }: LessonViewProps) {
  const { t } = useTranslation();
  const { id } = topic.meta;
  const hasExercises = bundle.exercise_sets.some((set) => set.topic === id);
  const hasLesson = bundle.lessons.some((lesson) => lesson.topic === id);

  return (
    <div className="flex w-full flex-col gap-6">
      <nav>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to={`/courses/${encodeURIComponent(slug)}`}>
            <ArrowLeft />
            {t('lesson.backToCourse')}
          </Link>
        </Button>
      </nav>

      <header className="space-y-3">
        <p className="text-muted-foreground text-sm">
          {bundle.course.course} ·{' '}
          {t('lesson.position', {
            current: neighbors.index + 1,
            total: neighbors.total,
          })}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            <span className="text-muted-foreground font-mono text-2xl">
              {id}
            </span>{' '}
            {topic.title}
          </h1>
          <StatusSelect
            slug={slug}
            topicId={id}
            status={topic.meta.status}
            hasLesson={hasLesson}
          />
        </div>
      </header>

      <TopicDetails topic={topic} />

      <LessonBody slug={slug} topicId={id} />

      {hasLesson && !hasExercises && (
        <NotGeneratedCard
          title={t('exercises.notGeneratedTitle')}
          body={t('exercises.notGeneratedBody')}
        >
          <GenerateButton slug={slug} topicId={id} kind="exercises" />
        </NotGeneratedCard>
      )}

      <LessonNav
        slug={slug}
        topicId={id}
        neighbors={neighbors}
        hasExercises={hasExercises}
      />
    </div>
  );
}

function TopicDetails({ topic }: { topic: Topic }) {
  const { t } = useTranslation();
  const { perceived_difficulty: difficulty, weak_points: weakPoints } =
    topic.meta;
  const { subtopics } = topic;

  if (subtopics.length === 0 && weakPoints.length === 0 && !difficulty) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('lesson.details')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {difficulty && (
          <p className="flex items-center gap-2">
            <span className="text-muted-foreground">
              {t('lesson.difficulty')}
            </span>
            <Badge variant="outline">
              {t(`lesson.difficultyValue.${difficulty}` as const)}
            </Badge>
          </p>
        )}

        {subtopics.length > 0 && (
          <section className="space-y-2">
            <h2 className="font-medium">{t('lesson.subtopics')}</h2>
            <ul className="space-y-1.5">
              {subtopics.map((subtopic) => (
                <li key={subtopic.id} className="flex items-start gap-2">
                  {subtopic.completed ? (
                    <>
                      <Check
                        className="text-primary mt-0.5 size-4 shrink-0"
                        aria-hidden
                      />
                      <span className="sr-only">
                        {t('lesson.subtopicDone')}
                      </span>
                    </>
                  ) : (
                    <>
                      <Circle
                        className="text-muted-foreground mt-0.5 size-4 shrink-0"
                        aria-hidden
                      />
                      <span className="sr-only">
                        {t('lesson.subtopicPending')}
                      </span>
                    </>
                  )}
                  <span>
                    <span className="text-muted-foreground font-mono text-xs">
                      {subtopic.id}
                    </span>{' '}
                    {subtopic.title}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {weakPoints.length > 0 && (
          <section className="space-y-2">
            <h2 className="font-medium">{t('lesson.weakPoints')}</h2>
            <ul className="list-disc space-y-1 pl-5">
              {weakPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </section>
        )}
      </CardContent>
    </Card>
  );
}

function LessonBody({ slug, topicId }: { slug: string; topicId: string }) {
  const { t, i18n } = useTranslation();
  const { data: lesson, isPending, error, refetch } = useLesson(slug, topicId);

  if (isPending) return <BodySkeleton />;

  if (error) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <NotGeneratedCard
          title={t('lesson.notGeneratedTitle')}
          body={t('lesson.notGeneratedBody')}
        >
          <GenerateButton slug={slug} topicId={topicId} kind="lesson" />
        </NotGeneratedCard>
      );
    }
    return <ErrorState error={error} onRetry={() => void refetch()} />;
  }

  return (
    <article className="space-y-4">
      <p className="text-muted-foreground text-sm">
        {t('lesson.generatedOn', {
          date: dateFormatter(lesson.generated, i18n.resolvedLanguage),
        })}
      </p>
      <Markdown>{lesson.content}</Markdown>
    </article>
  );
}

interface LessonNavProps {
  slug: string;
  topicId: string;
  neighbors: Neighbors;
  hasExercises: boolean;
}

function LessonNav({ slug, topicId, neighbors, hasExercises }: LessonNavProps) {
  const { t } = useTranslation();
  const { prev, next } = neighbors;

  return (
    <nav className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-t pt-6">
      {prev ? (
        <Button
          asChild
          variant="outline"
          className="min-w-0 justify-self-start"
          aria-label={t('lesson.goToPrevious', { title: prev.title })}
        >
          <Link to={topicPath(slug, prev.meta.id)}>
            <ChevronLeft />
            <span className="truncate">
              {prev.meta.id}
              <span className="hidden sm:inline"> {prev.title}</span>
            </span>
          </Link>
        </Button>
      ) : (
        <span />
      )}

      {hasExercises ? (
        <Button asChild>
          <Link to={exercisesPath(slug, topicId)}>{t('lesson.exercises')}</Link>
        </Button>
      ) : (
        <span />
      )}

      {next ? (
        <Button
          asChild
          variant="outline"
          className="min-w-0 justify-self-end"
          aria-label={t('lesson.goToNext', { title: next.title })}
        >
          <Link to={topicPath(slug, next.meta.id)}>
            <span className="truncate">
              {next.meta.id}
              <span className="hidden sm:inline"> {next.title}</span>
            </span>
            <ChevronRight />
          </Link>
        </Button>
      ) : (
        <span />
      )}
    </nav>
  );
}

function LessonSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-24 w-full" />
      <BodySkeleton />
    </div>
  );
}
