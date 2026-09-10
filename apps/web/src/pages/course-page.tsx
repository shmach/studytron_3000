import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'

import type { CourseBundle, Module, Topic } from '@/api/client'
import { ErrorState } from '@/components/error-state'
import { StatusBadge } from '@/components/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCourse } from '@/hooks/useCourse'
import { computeProgress } from '@/lib/progress'
import { ProgressBar } from '@/pages/courses-page'

export function CoursePage() {
  const { slug } = useParams<{ slug: string }>()
  const { data, isPending, isError, error, refetch } = useCourse(slug)

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/">
          <ArrowLeft />
          All courses
        </Link>
      </Button>

      {isPending && <CourseSkeleton />}
      {isError && <ErrorState error={error} onRetry={() => void refetch()} />}
      {data && <CourseDetail bundle={data} />}
    </div>
  )
}

function CourseDetail({ bundle }: { bundle: CourseBundle }) {
  const { course, lessons, exercise_sets: exerciseSets, attempts } = bundle
  const progress = computeProgress(course)
  // Topic ids that already have generated content, so the curriculum can show it.
  const lessonTopics = new Set(lessons.map((lesson) => lesson.topic))
  const exerciseTopics = new Set(exerciseSets.map((set) => set.topic))

  return (
    <>
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">{course.course}</h1>
        <p className="text-muted-foreground">{course.goal}</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{course.level}</Badge>
          <Badge variant="outline">{course.depth}</Badge>
          <Badge variant="outline">{course.language}</Badge>
          <Badge variant="outline">created {course.created}</Badge>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Progress</CardTitle>
          <CardDescription>
            {progress.completedTopics} of {progress.totalTopics} topics completed ·{' '}
            {lessons.length} lessons · {exerciseSets.length} exercise sets · {attempts.length}{' '}
            attempts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ProgressBar percent={progress.percent} />
          <div className="flex flex-wrap gap-3 text-sm">
            {(Object.keys(progress.byStatus) as Array<keyof typeof progress.byStatus>).map(
              (status) => (
                <span key={status} className="flex items-center gap-1.5">
                  <StatusBadge status={status} />
                  <span className="text-muted-foreground">{progress.byStatus[status]}</span>
                </span>
              ),
            )}
          </div>
        </CardContent>
      </Card>

      {course.overview && (
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-line text-sm leading-relaxed">
            {course.overview}
          </CardContent>
        </Card>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Curriculum</h2>
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
  )
}

interface ModuleCardProps {
  index: number
  module: Module
  lessonTopics: Set<string>
  exerciseTopics: Set<string>
}

function ModuleCard({ index, module, lessonTopics, exerciseTopics }: ModuleCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Module {index} · {module.title}
        </CardTitle>
        {module.description && <CardDescription>{module.description}</CardDescription>}
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
  )
}

interface TopicRowProps {
  topic: Topic
  hasLesson: boolean
  hasExercises: boolean
}

function TopicRow({ topic, hasLesson, hasExercises }: TopicRowProps) {
  const done = topic.subtopics.filter((subtopic) => subtopic.completed).length

  return (
    <li className="space-y-2 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground font-mono text-xs">{topic.meta.id}</span>
        <span className="font-medium">{topic.title}</span>
        <StatusBadge status={topic.meta.status} />
        {topic.meta.perceived_difficulty && (
          <Badge variant="outline">{topic.meta.perceived_difficulty}</Badge>
        )}
        {hasLesson && <Badge variant="secondary">lesson</Badge>}
        {hasExercises && <Badge variant="secondary">exercises</Badge>}
        <span className="text-muted-foreground ml-auto text-xs">
          {done}/{topic.subtopics.length} subtopics
        </span>
      </div>
      {topic.meta.weak_points.length > 0 && (
        <p className="text-muted-foreground text-xs">
          Weak points: {topic.meta.weak_points.join(', ')}
        </p>
      )}
      <ul className="space-y-1 pl-4 text-sm">
        {topic.subtopics.map((subtopic) => (
          <li key={subtopic.id} className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={subtopic.completed}
              readOnly
              aria-label={`${subtopic.title} ${subtopic.completed ? 'completed' : 'pending'}`}
              className="mt-1 size-3.5 accent-primary"
            />
            <span>
              <span className={subtopic.completed ? 'text-muted-foreground line-through' : ''}>
                {subtopic.title}
              </span>
              {subtopic.description && (
                <span className="text-muted-foreground"> — {subtopic.description}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </li>
  )
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
  )
}
