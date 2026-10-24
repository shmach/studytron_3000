import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';

import type { CourseBundle } from '@app/api/client';
import { DeleteCourseDialog } from '@ui/components/DeleteCourseDialog';
import { ErrorState } from '@ui/components/ErrorState';
import { StatusBadge } from '@ui/components/StatusBadge';
import { Badge } from '@ui/components/ui/Badge';
import { Button } from '@ui/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ui/components/ui/Card';
import { Skeleton } from '@ui/components/ui/Skeleton';
import { useCourse } from '@app/hooks/useCourse';
import { computeProgress } from '@app/lib/progress';
import { ProgressBar } from '@ui/pages/CoursesPage';
import { Trail } from '@ui/components/trail/Trail';
import { dateFormatter } from '@app/lib/dateFormatter';

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

  const createdDate = dateFormatter(course.created, i18n.resolvedLanguage);

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

      <Trail course={course} />
    </>
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
