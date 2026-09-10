import { Link } from 'react-router'

import type { CourseBundle } from '@/api/client'
import { ErrorState } from '@/components/error-state'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCourses } from '@/hooks/useCourses'
import { computeProgress } from '@/lib/progress'

export function CoursesPage() {
  const { data, isPending, isError, error, refetch } = useCourses()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Courses</h1>
        <p className="text-muted-foreground text-sm">
          Every course found in the vault served by the local server.
        </p>
      </div>

      {isPending && <CourseListSkeleton />}
      {isError && <ErrorState error={error} onRetry={() => void refetch()} />}
      {data && data.length === 0 && <EmptyState />}
      {data && data.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {data.map((bundle) => (
            <li key={bundle.course.slug}>
              <CourseCard bundle={bundle} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CourseCard({ bundle }: { bundle: CourseBundle }) {
  const { course, lessons } = bundle
  const progress = computeProgress(course)

  return (
    <Link to={`/courses/${course.slug}`} className="block h-full">
      <Card className="h-full transition-colors hover:bg-accent/40">
        <CardHeader>
          <CardTitle>{course.course}</CardTitle>
          <CardDescription className="line-clamp-2">{course.goal}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{course.level}</Badge>
            <Badge variant="outline">{course.depth}</Badge>
            <Badge variant="outline">{course.language}</Badge>
          </div>
          <ProgressBar percent={progress.percent} />
          <p className="text-muted-foreground text-xs">
            {progress.completedTopics}/{progress.totalTopics} topics completed · {lessons.length}{' '}
            {lessons.length === 1 ? 'lesson' : 'lessons'} generated
          </p>
        </CardContent>
      </Card>
    </Link>
  )
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
      <div className="bg-primary h-full transition-all" style={{ width: `${percent}%` }} />
    </div>
  )
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
  )
}

function EmptyState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>No courses yet</CardTitle>
        <CardDescription>
          The vault has no folder with a <code className="font-mono">00-curriculum.md</code>. Ask
          the course-builder skill to create a course, or check the{' '}
          <code className="font-mono">VAULT_PATH</code> setting of the local server.
        </CardDescription>
      </CardHeader>
    </Card>
  )
}
