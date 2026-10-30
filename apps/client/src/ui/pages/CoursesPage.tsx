import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import type { CourseBundle } from '@app/api/client';
import { ErrorState } from '@ui/components/ErrorState';
import { Badge } from '@ui/components/ui/Badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ui/components/ui/Card';
import { Skeleton } from '@ui/components/ui/Skeleton';
import { useCourses } from '@app/hooks/useCourses';
import { computeProgress } from '@app/lib/progress';
import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Calendar,
  CircleCheck,
  Dumbbell,
  Layers,
  Search,
} from 'lucide-react';
import { Button } from '@ui/components/ui/Button';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateCourse } from '@app/hooks/useCreateCourse';
import { useCourseJob } from '@app/hooks/useCourseJob';
import { courseKeys } from '@app/api/queries';
import { dateFormatter } from '@app/lib/dateFormatter';
import { Input } from '@ui/components/ui/Input';
import { useDebounce } from '@app/hooks/useDebounce';
import { filterCourses } from '@app/lib/courseSearch';
import { JobsPanel } from '@ui/components/JobsPanel';
import { CourseQuestionnaireDialog } from '@ui/components/CourseQuestionnaireDialog';

export function CoursesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isPending, isError, error, refetch } = useCourses();
  const { mutateAsync: createCourse } = useCreateCourse();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [search, setSearch] = useState<string>('');
  const debouncedSearch = useDebounce(search);
  const [jobId, setJobId] = useState<string | null>(null);
  const { data: job } = useCourseJob(jobId);

  useEffect(() => {
    if (!job) return;

    if (job.status === 'done') {
      // Void is used to "fire and forget" - not need to await a promise that we don't need to.
      void queryClient.invalidateQueries({ queryKey: courseKeys.list() });
      setJobId(null);
    } else if (job.status === 'error') {
      setJobId(null);
      // TODO: Show error on screen
    }
  }, [job, queryClient]);

  async function handleQuestionnaireSubmit(formattedPrompt: string) {
    if (jobId) return;
    try {
      const created = await createCourse(formattedPrompt);
      setJobId(created.id);
    } catch (error) {
      console.error(error);
    }
  }

  const filteredCourses = useMemo(
    () => filterCourses(data ?? [], debouncedSearch),
    [data, debouncedSearch],
  );

  return (
    <div className="min-h-full w-full space-y-6 flex flex-col gap-8 grow justify-center items-center">
      <h1 className="sr-only">{t('courses.heading')}</h1>
      {/* Gradient border: see .gradient-border in index.css. */}
      <div className="gradient-border min-w-full bg-transparent dark:bg-input/30 shadow-sm py-2 px-4 rounded-lg flex justify-center items-center m-0">
        <Search />
        <div className="relative w-full">
          <Input
            aria-label={t('courses.heading')}
            className="bg-transparent dark:bg-transparent border-none focus-visible:ring-0 shadow-none font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {/* ::placeholder can't use background-clip, so the gradient placeholder is an overlay. */}
          {search === '' && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-3 flex items-center truncate bg-linear-to-r from-cyan-400 via-blue-500 to-violet-500 bg-clip-text text-base font-bold text-transparent"
            >
              {t('courses.heading')}
            </span>
          )}
        </div>
      </div>

      <JobsPanel />

      <div className="w-full flex flex-col">
        {isPending && <CourseListSkeleton />}
        {isError && <ErrorState error={error} onRetry={() => void refetch()} />}

        {!isPending &&
          !isError &&
          filteredCourses &&
          filteredCourses.length === 0 && (
            <Card className="flex flex-col items-center justify-center gap-4 w-full">
              <CardHeader className="w-full flex flex-col gap-2 justify-center items-center">
                <CardTitle className="text-center">
                  {t('courses.notFoundTitle')}
                </CardTitle>
                <CardDescription className="text-center">
                  {t('courses.notFoundDescription')}
                </CardDescription>
              </CardHeader>
              <CourseQuestionnaireDialog
                topic={search}
                onSubmit={(formattedPrompt) =>
                  void handleQuestionnaireSubmit(formattedPrompt)
                }
                open={isDialogOpen}
                setOpenDialog={setIsDialogOpen}
              >
                <Button className="w-fit">
                  {t('courses.createAbout', { topic: debouncedSearch })}
                </Button>
              </CourseQuestionnaireDialog>
            </Card>
          )}

        {filteredCourses && filteredCourses.length > 0 && (
          <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredCourses?.map((bundle) => (
              <li key={bundle.course.slug} className="h-full">
                <CourseCard bundle={bundle} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CourseCard({ bundle }: { bundle: CourseBundle }) {
  const { t, i18n } = useTranslation();
  const { course, lessons, exercise_sets } = bundle;
  const progress = computeProgress(course);

  return (
    <Link
      to={`/courses/${course.slug}`}
      className="group block h-full rounded-xl focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
    >
      <Card className="relative h-full gap-4 overflow-hidden py-5 transition-all duration-200 group-hover:-translate-y-1 group-hover:border-blue-500/50 group-hover:shadow-lg group-hover:shadow-blue-500/10">
        <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-cyan-400 via-blue-500 to-violet-500" />
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-cyan-400/20 via-blue-500/20 to-violet-500/20 text-blue-500 ring-1 ring-blue-500/20">
              <BookOpen className="size-5" />
            </div>
            <div className="min-w-0 space-y-1.5">
              <CardTitle className="line-clamp-2 leading-snug">
                {course.course}
              </CardTitle>
              <CardDescription className="line-clamp-3">
                {course.goal}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="mt-auto space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge className="border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">
              {course.level}
            </Badge>
            <Badge className="border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-300">
              {course.depth}
            </Badge>
            <Badge variant="outline">{course.language}</Badge>
          </div>

          <dl className="text-muted-foreground grid grid-cols-3 gap-2 text-xs">
            <Stat
              icon={<Layers />}
              value={course.modules.length}
              label={t('courses.stats.modules')}
            />
            <Stat
              icon={<BookOpen />}
              value={lessons.length}
              label={t('courses.stats.lessons')}
            />
            <Stat
              icon={<Dumbbell />}
              value={exercise_sets.length}
              label={t('courses.stats.exercises')}
            />
          </dl>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <CircleCheck className="size-3.5" />
                {t('courses.topicsCompleted', {
                  completed: progress.completedTopics,
                  total: progress.totalTopics,
                })}
              </span>
              <span className="font-semibold">{progress.percent}%</span>
            </div>
            <ProgressBar percent={progress.percent} />
          </div>

          <p className="text-muted-foreground flex items-center gap-1 text-xs">
            <Calendar className="size-3.5" />
            {t('course.created', {
              date: dateFormatter(course.created, i18n.language),
            })}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="bg-muted/50 flex flex-col items-center gap-0.5 rounded-lg px-2 py-2 [&>svg]:size-4 [&>svg]:text-blue-500">
      {icon}
      <dd className="text-foreground text-sm font-semibold">{value}</dd>
      <dt>{label}</dt>
    </div>
  );
}

export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div
      className="bg-muted h-2 w-full overflow-hidden rounded-full"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-linear-to-r from-cyan-400 via-blue-500 to-violet-500 transition-all"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function CourseListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }, (_, index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-2 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
