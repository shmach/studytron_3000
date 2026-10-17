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
import { Search } from 'lucide-react';
import { Button } from '@ui/components/ui/Button';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateCourse } from '@app/hooks/useCreateCourse';
import { useCourseJob } from '@app/hooks/useCourseJob';
import { courseKeys } from '@app/api/queries';
import { Input } from '@ui/components/ui/Input';
import { useDebounce } from '@app/hooks/useDebounce';
import { filterCourses } from '@app/lib/courseSearch';
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
    console.log(job);

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
    <div className="min-h-full min-w-full md:min-w-[70%] lg:min-w-3xl space-y-6 flex flex-col gap-8 grow justify-center items-center">
      <h1 className="text-4xl font-bold text-center m-0">
        {t('courses.heading')}
      </h1>
      <div className="min-w-full bg-transparent dark:bg-input/30 shadow-sm py-2 px-4 rounded-lg flex justify-center items-center border dark:border-none m-0">
        <Search />
        <Input
          className="bg-transparent dark:bg-transparent border-none focus-visible:ring-0 shadow-none font-medium"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="min-w-full flex flex-col">
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
          <ul className="max-h-[40vh] flex flex-col gap-4 overflow-y-auto pr-1">
            {filteredCourses?.map((bundle) => (
              <li key={bundle.course.slug}>
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
  const { t } = useTranslation();
  const { course, lessons } = bundle;
  const progress = computeProgress(course);

  return (
    <Link to={`/courses/${course.slug}`} className="block h-full">
      <Card className="h-full transition-colors hover:bg-accent/40">
        <CardHeader>
          <CardTitle>{course.course}</CardTitle>
          <CardDescription className="line-clamp-2">
            {course.goal}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{course.level}</Badge>
            <Badge variant="outline">{course.depth}</Badge>
            <Badge variant="outline">{course.language}</Badge>
          </div>
          <ProgressBar percent={progress.percent} />
          <p className="text-muted-foreground text-xs">
            {t('courses.cardSummary', {
              count: lessons.length,
              completed: progress.completedTopics,
              total: progress.totalTopics,
            })}
          </p>
        </CardContent>
      </Card>
    </Link>
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
        className="bg-primary h-full transition-all"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function CourseListSkeleton() {
  return (
    <div className="flex gap-4 flex-col">
      {Array.from({ length: 2 }, (_, index) => (
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
