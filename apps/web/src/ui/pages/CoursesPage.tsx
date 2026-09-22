import { Link } from 'react-router';

import type { CourseBundle } from '@app/api/client';
import { ErrorState } from '@ui/components/error-state';
import { Badge } from '@ui/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ui/components/ui/card';
import { Skeleton } from '@ui/components/ui/skeleton';
import { useCourses } from '@app/hooks/useCourses';
import { computeProgress } from '@app/lib/progress';
import { useEffect, useMemo, useState } from 'react';
import { ArrowBigUp, FilePlus, Plus, Search } from 'lucide-react';
import { useIsMobile } from '@app/hooks/useIsMobile';
import { Button } from '@ui/components/ui/Button';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateCourse } from '@app/hooks/useCreateCourse';
import { useCourseJob } from '@app/hooks/useCourseJob';
import { courseKeys } from '@app/api/queries';
import { Input } from '@ui/components/ui/Input';
import { useDebounce } from '@app/hooks/useDebounce';
import { filterCourses } from '@app/lib/courseSearch';

export function CoursesPage() {
  const queryClient = useQueryClient();
  const { data, isPending, isError, error, refetch } = useCourses();
  const { mutateAsync: createCourse } = useCreateCourse();
  const isMobile = useIsMobile();

  const [search, setSearch] = useState<string>('');
  const debouncedSearch = useDebounce(search);
  const [prompt, setPrompt] = useState<string>('');
  const [jobId, setJobId] = useState<string | null>(null);
  const { data: job } = useCourseJob(jobId);

  useEffect(() => {
    if (!job) return;
    console.log(job);

    if (job.status === 'done') {
      // Void is used to "fire and forget" - not need to await a promise that we don't need to.
      void queryClient.invalidateQueries({ queryKey: courseKeys.list() });
      setJobId(null);
      setPrompt('');
    } else if (job.status === 'error') {
      setJobId(null);
      // TODO: Show error on screen
    }
  }, [job, queryClient]);

  useEffect(() => {
    console.log('Fetch enviado com filtro debounced');
  }, [debouncedSearch]);

  async function handleSubmitOnKeyDown(
    e: React.KeyboardEvent<HTMLFormElement>,
  ) {
    if (isMobile) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.requestSubmit();
    }
  }

  async function handleSubmitNewCourse(e: React.SubmitEvent<HTMLFormElement>) {
    try {
      e.preventDefault();
      if (!prompt.trim() || jobId) return;
      const created = await createCourse(prompt);
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
    <div className="min-w-full md:min-w-[70%] lg:min-w-3xl space-y-6 flex flex-col gap-8">
      <h1 className="text-4xl font-bold text-center m-0">
        O que vai ser hoje chefe?
      </h1>
      <div className="min-w-full bg-transparent dark:bg-input/30 shadow-sm py-2 px-4 rounded-lg flex justify-center items-center border dark:border-none m-0">
        <Search />
        <Input
          className="bg-transparent dark:bg-transparent border-none focus-visible:ring-0 shadow-none font-medium"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button
          type="button"
          size={'icon'}
          variant={'default'}
          className="rounded-full"
        >
          <Plus />
        </Button>
      </div>

      <div className="min-w-full flex flex-col">
        {isPending && <CourseListSkeleton />}
        {isError && <ErrorState error={error} onRetry={() => void refetch()} />}
        {data && data.length === 0 && <EmptyState />}
        {data && data.length > 0 && (
          <ul className="h-3/4 flex flex-col gap-4">
            {filteredCourses?.map((bundle) => (
              <li key={bundle.course.slug}>
                <CourseCard bundle={bundle} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* <form
        className="w-full flex flex-col gap-2 border rounded-lg p-3"
        onSubmit={(e) => handleSubmitNewCourse(e)}
        onKeyDown={(e) => handleSubmitOnKeyDown(e)}
      >
        <textarea
          placeholder="O que você deseja aprender hoje?"
          aria-label="O que você deseja aprender hoje"
          rows={1}
          className="block min-h-14 max-h-fit w-full resize-none bg-transparent text-[15px] leading-6 outline-none placeholder:text-zinc-500"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={jobId !== null}
        />
        <div className="w-full h-fit flex justify-between items-center">
          <div>
            <Button type="button" size={'icon'} variant={'ghost'}>
              <Plus />
            </Button>
            <Button type="button" size={'icon'} variant={'ghost'}>
              <FilePlus />
            </Button>
          </div>
          <Button type="submit" size={'icon'}>
            <ArrowBigUp />
          </Button>
        </div>
      </form> */}
    </div>
  );
}

function CourseCard({ bundle }: { bundle: CourseBundle }) {
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
            {progress.completedTopics}/{progress.totalTopics} topics completed ·{' '}
            {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'}{' '}
            generated
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

function EmptyState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>No courses yet</CardTitle>
        <CardDescription>
          The vault has no folder with a{' '}
          <code className="font-mono">00-curriculum.md</code>. Ask the
          course-builder skill to create a course, or check the{' '}
          <code className="font-mono">VAULT_PATH</code> setting of the local
          server.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
