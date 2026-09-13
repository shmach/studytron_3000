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
import { useState } from 'react';
import { ArrowBigUp, FilePlus, Plus } from 'lucide-react';
import { useIsMobile } from '@app/hooks/useIsMobile';
import { Button } from '@ui/components/ui/Button';

export function CoursesPage() {
  const { data, isPending, isError, error, refetch } = useCourses();
  const isMobile = useIsMobile();

  const [prompt, setPrompt] = useState<string>('');

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
    e.preventDefault();
    console.log('Submit');
  }

  return (
    <div
      className="space-y-6 h-full flex flex-col
    grow"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Courses</h1>
        <p className="text-muted-foreground text-sm">
          Every course found in the vault served by the local server.
        </p>
      </div>

      <div className="min-w-full min-h-full flex flex-col grow">
        {isPending && <CourseListSkeleton />}
        {isError && <ErrorState error={error} onRetry={() => void refetch()} />}
        {data && data.length === 0 && <EmptyState />}
        {data && data.length > 0 && (
          <ul className="h-3/4 grid gap-4 sm:grid-cols-2">
            {data.map((bundle) => (
              <li key={bundle.course.slug}>
                <CourseCard bundle={bundle} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <form
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
      </form>
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
    <div className="grid gap-4 sm:grid-cols-2">
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
