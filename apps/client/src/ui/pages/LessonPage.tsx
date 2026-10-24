import { ApiError } from '@app/api/client';
import { useCourse } from '@app/hooks/useCourse';
import { useLesson } from '@app/hooks/useLesson';
import { dateFormatter } from '@app/lib/dateFormatter';
import { exercisesPath, topicPath } from '@app/lib/routes';
import { flattenTopics, getNeighbors } from '@app/lib/topic';
import { ErrorState } from '@ui/components/ErrorState';
import { Markdown } from '@ui/components/Markdown';
import { Button } from '@ui/components/ui/Button';
import { Skeleton } from '@ui/components/ui/Skeleton';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';

export function LessonPage() {
  const { slug, topicId } = useParams<{ slug: string; topicId: string }>();
  const navigate = useNavigate();

  if (!slug || !topicId) {
    <Navigate to={'/not-found'} />;
  }

  const {
    data: courseContent,
    isPending: isCoursePending,
    error: courseError,
  } = useCourse(slug);

  const {
    data: lessonContent,
    isPending: isLessonPending,
    error: lessonError,
  } = useLesson(slug, topicId);

  const topics = useMemo(() => {
    if (!isCoursePending && courseContent) {
      return flattenTopics(courseContent.course);
    }
  }, [courseContent, isCoursePending]);
  const neighbors = topics && getNeighbors(topics, topicId as string);
  const is404 = lessonError instanceof ApiError && lessonError.status === 404;

  if (isCoursePending || isLessonPending) {
    return <Skeleton />;
  }

  if (courseError) {
    return <ErrorState error={courseError} />;
  }

  if (lessonError) {
    if (lessonError instanceof ApiError && is404) {
      return <LessonNotGenerated />;
    } else {
      return <ErrorState error={lessonError} />;
    }
  }

  return (
    <div className="min-w-full flex flex-col gap-3">
      {/* TODO: refact this component into a composition pattern */}
      <header className="font-mono h-fit pb-5 border-b-2 gap-4">
        <div className="min-w-full flex items-center justify-between">
          <h2 className="text-lg">
            <CourseReturnLink slug={slug!} /> / {lessonContent?.topic} -{' '}
            {lessonContent?.title}
          </h2>
          <span>
            Tópico: {neighbors?.index && neighbors.index + 1} /{' '}
            {neighbors?.total}
          </span>
        </div>
        <div className="w-full flex flex-col gap-2 mt-5">
          <span>Detalhes do tópico:</span>
          <span>Subtópicos (total): {lessonContent?.covers.length}</span>
          <span>
            Gerado em: {dateFormatter(lessonContent?.generated as string)}
          </span>
        </div>
      </header>
      <main>
        {lessonContent && <LessonView content={lessonContent.content} />}
      </main>
      <footer className="min-w-full flex justify-between items-center pt-6">
        <Button
          variant={'default'}
          disabled={neighbors?.prev === null}
          onClick={() =>
            navigate(
              topicPath(slug as string, neighbors?.prev?.meta.id as string),
            )
          }
          aria-label="Ir para a aula anterior"
        >
          <ChevronLeft />
        </Button>
        <Button
          variant={'default'}
          onClick={() =>
            navigate(exercisesPath(slug as string, topicId as string))
          }
          aria-label="Acessar a página de exercícios"
        >
          Exercises
        </Button>
        <Button
          variant={'default'}
          disabled={neighbors?.next === null}
          onClick={() =>
            navigate(
              topicPath(slug as string, neighbors?.next?.meta.id as string),
            )
          }
          aria-label="Ir para a próxima aula"
        >
          <ChevronRight />
        </Button>
      </footer>
    </div>
  );
}

function CourseReturnLink({ slug }: { slug: string }) {
  return (
    <span className="pb-1 animate-pulse hover:border-b border-b-foreground">
      <Link to={`/courses/${slug}`}>{slug}</Link>
    </span>
  );
}

function LessonView({ content }: { content: string }) {
  return <Markdown className="">{content}</Markdown>;
}

function LessonNotGenerated() {
  const { slug, topicId } = useParams<{ slug: string; topicId: string }>();

  return (
    <div className="min-w-full flex flex-col gap-3">
      <header>
        <h2 className="text-lg">
          <CourseReturnLink slug={slug!} /> / {topicId}
        </h2>
      </header>
      <main>
        <h1>Aula não gerada!</h1>
        <p>O conteúdo dessa aula ainda não foi gerado.</p>
        <p>
          Gere o conteúdo ou clique no botão abaixo para gerar o conteúdo da
          aula.
        </p>
        <Button>Gerar aula</Button>
      </main>
    </div>
  );
}
