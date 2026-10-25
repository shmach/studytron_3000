import { BookOpen, ListChecks } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import type { Topic } from '@app/api/client';
import { topicPath } from '@app/lib/routes';
import { cn } from '@app/lib/utils';
import { STATUS_STYLE } from '../../utils/statusStyle';

interface TopicCardProps {
  slug: string;
  topic: Topic;
  hasLesson: boolean;
  hasExercises: boolean;
}

export function TopicCard({
  slug,
  topic,
  hasLesson,
  hasExercises,
}: TopicCardProps) {
  const { t } = useTranslation();
  const { status, id } = topic.meta;
  const { icon: Icon, className } = STATUS_STYLE[status];

  return (
    <Link
      to={topicPath(slug, id)}
      className={cn(
        'focus-visible:ring-ring flex w-full items-center gap-2 rounded-lg border px-3 py-3 text-left text-sm transition-[filter,box-shadow] hover:brightness-95 focus-visible:ring-2 focus-visible:outline-none',
        className,
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="sr-only">{t(`status.${status}` as const)}:</span>
      <span className="font-mono text-xs opacity-70">{id}</span>
      <span className="line-clamp-2 flex-1">{topic.title}</span>
      {(hasLesson || hasExercises) && (
        <span className="flex shrink-0 items-center gap-1.5 opacity-70">
          {hasLesson && (
            <>
              <BookOpen className="size-4" aria-hidden />
              <span className="sr-only">{t('trail.hasLesson')}</span>
            </>
          )}
          {hasExercises && (
            <>
              <ListChecks className="size-4" aria-hidden />
              <span className="sr-only">{t('trail.hasExercises')}</span>
            </>
          )}
        </span>
      )}
    </Link>
  );
}
