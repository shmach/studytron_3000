import { useTranslation } from 'react-i18next';

import type { Topic } from '@app/api/client';
import { cn } from '@app/lib/utils';
import { STATUS_STYLE } from '../../utils/statusStyle';
import { Link, useParams } from 'react-router';
import { topicPath } from '@app/lib/routes';

interface TopicCardProps {
  topic: Topic;
}

export function TopicCard({ topic }: TopicCardProps) {
  const params = useParams();
  const { t } = useTranslation();
  const { status, id } = topic.meta;
  const { icon: Icon, className } = STATUS_STYLE[status];

  return (
    <Link to={topicPath(params.slug as string, topic.meta.id)}>
      <button
        type="button"
        aria-label={t('trail.topicLabel', {
          title: topic.title,
          status: t(`status.${status}` as const),
        })}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg border px-3 py-3 text-left text-sm transition-[filter,box-shadow] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none hover:cursor-pointer',
          className,
        )}
      >
        <Icon className="size-4 shrink-0" aria-hidden />
        <span className="font-mono text-xs opacity-70">{id}</span>
        <span className="line-clamp-2">{topic.title}</span>
      </button>
    </Link>
  );
}
