import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';

import type { CourseBundle, Module, Topic } from '@app/api/client';
import { DeleteCourseDialog } from '@ui/components/DeleteCourseDialog';
import { ErrorState } from '@ui/components/error-state';
import { StatusBadge } from '@ui/components/status-badge';
import { Badge } from '@ui/components/ui/badge';
import { Button } from '@ui/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ui/components/ui/card';
import { Skeleton } from '@ui/components/ui/skeleton';
import { useCourse } from '@app/hooks/useCourse';
import { computeProgress } from '@app/lib/progress';
import { ProgressBar } from '@ui/pages/CoursesPage';

export function CoursePage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const { data, isPending, isError, error, refetch } = useCourse(slug);
  const navigate = useNavigate();

  const course = data ? data.course : undefined;

  return (
    <div className="flex w-full flex-col gap-8">
      <nav className="w-full flex justify-between items-center">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/">
            <ArrowLeft />
            {t('course.allCourses')}
          </Link>
        </Button>
        {course && (
          <DeleteCourseDialog
            slug={course.slug}
            courseName={course.course}
            onDeleted={() => void navigate('/')}
          />
        )}
      </nav>

      {isPending && <CourseSkeleton />}
      {isError && <ErrorState error={error} onRetry={() => void refetch()} />}
      {data && <CourseDetail bundle={data} />}
    </div>
  );
}

function CourseDetail({ bundle }: { bundle: CourseBundle }) {
  const { t, i18n } = useTranslation();
  const { course, lessons, exercise_sets: exerciseSets, attempts } = bundle;
  const progress = computeProgress(course);

  const createdDate = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    dateStyle: 'medium',
  }).format(new Date(`${course.created}T00:00:00`));

  const lessonTopics = new Set(lessons.map((lesson) => lesson.topic));
  const exerciseTopics = new Set(exerciseSets.map((set) => set.topic));

  return (
    <>
      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">
            {course.course}
          </h1>
        </div>
        <p className="text-muted-foreground">{course.goal}</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{course.level}</Badge>
          <Badge variant="outline">{course.depth}</Badge>
          <Badge variant="outline">{course.language}</Badge>
          <Badge variant="outline">
            {t('course.created', { date: createdDate })}
          </Badge>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t('course.progress')}</CardTitle>
          <CardDescription>
            {t('course.progressSummary', {
              completed: progress.completedTopics,
              total: progress.totalTopics,
              lessons: lessons.length,
              exerciseSets: exerciseSets.length,
              attempts: attempts.length,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ProgressBar percent={progress.percent} />
          <div className="flex flex-wrap gap-3 text-sm">
            {(
              Object.keys(progress.byStatus) as Array<
                keyof typeof progress.byStatus
              >
            ).map((status) => (
              <span key={status} className="flex items-center gap-1.5">
                <StatusBadge status={status} />
                <span className="text-muted-foreground">
                  {progress.byStatus[status]}
                </span>
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {course.overview && (
        <Card>
          <CardHeader>
            <CardTitle>{t('course.overview')}</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-line text-sm leading-relaxed">
            {course.overview}
          </CardContent>
        </Card>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">
          {t('course.curriculum')}
        </h2>
        {course.modules.map((module, index) => (
          <ModuleCard
            key={module.title}
            index={index + 1}
            module={module}
            lessonTopics={lessonTopics}
            exerciseTopics={exerciseTopics}
          />
        ))}
      </section>
    </>
  );
}

interface ModuleCardProps {
  index: number;
  module: Module;
  lessonTopics: Set<string>;
  exerciseTopics: Set<string>;
}

function ModuleCard({
  index,
  module,
  lessonTopics,
  exerciseTopics,
}: ModuleCardProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t('course.module', { index, title: module.title })}
        </CardTitle>
        {module.description && (
          <CardDescription>{module.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <ol className="divide-y">
          {module.topics.map((topic) => (
            <TopicRow
              key={topic.meta.id}
              topic={topic}
              hasLesson={lessonTopics.has(topic.meta.id)}
              hasExercises={exerciseTopics.has(topic.meta.id)}
            />
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

interface TopicRowProps {
  topic: Topic;
  hasLesson: boolean;
  hasExercises: boolean;
}

function TopicRow({ topic, hasLesson, hasExercises }: TopicRowProps) {
  const { t } = useTranslation();
  const done = topic.subtopics.filter((subtopic) => subtopic.completed).length;

  return (
    <li className="space-y-2 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground font-mono text-xs">
          {topic.meta.id}
        </span>
        <span className="font-medium">{topic.title}</span>
        <StatusBadge status={topic.meta.status} />
        {topic.meta.perceived_difficulty && (
          <Badge variant="outline">{topic.meta.perceived_difficulty}</Badge>
        )}
        {hasLesson && (
          <Badge variant="secondary">{t('course.lessonBadge')}</Badge>
        )}
        {hasExercises && (
          <Badge variant="secondary">{t('course.exercisesBadge')}</Badge>
        )}
        <span className="text-muted-foreground ml-auto text-xs">
          {t('course.subtopicsCount', {
            done,
            total: topic.subtopics.length,
          })}
        </span>
      </div>
      {topic.meta.weak_points.length > 0 && (
        <p className="text-muted-foreground text-xs">
          {t('course.weakPoints', {
            points: topic.meta.weak_points.join(', '),
          })}
        </p>
      )}
      <ul className="space-y-1 pl-4 text-sm">
        {topic.subtopics.map((subtopic) => (
          <li key={subtopic.id} className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={subtopic.completed}
              readOnly
              aria-label={
                subtopic.completed
                  ? t('course.subtopicCompleted', { title: subtopic.title })
                  : t('course.subtopicPending', { title: subtopic.title })
              }
              className="mt-1 size-3.5 accent-primary"
            />
            <span>
              <span
                className={
                  subtopic.completed ? 'text-muted-foreground line-through' : ''
                }
              >
                {subtopic.title}
              </span>
              {subtopic.description && (
                <span className="text-muted-foreground">
                  {' '}
                  — {subtopic.description}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </li>
  );
}

function CourseSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-5 w-1/3" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-2/3" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-1/3" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    </div>
  );
}
