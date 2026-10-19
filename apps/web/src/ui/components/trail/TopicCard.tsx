import { useTranslation } from 'react-i18next';

import type { Topic } from '@app/api/client';
import { cn } from '@app/lib/utils';
import { STATUS_STYLE } from './statusStyle';

interface TopicCardProps {
  topic: Topic;
  selected: boolean;
  onSelect: (id: string) => void;
}

export function TopicCard({ topic, selected, onSelect }: TopicCardProps) {
  const { t } = useTranslation();
  const { status, id } = topic.meta;
  const { icon: Icon, className } = STATUS_STYLE[status];

  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      aria-pressed={selected}
      aria-label={t('trail.topicLabel', {
        title: topic.title,
        status: t(`status.${status}` as const),
      })}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg border px-3 py-3 text-left text-sm transition-[filter,box-shadow] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        className,
        selected && 'ring-2 ring-ring',
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="font-mono text-xs opacity-70">{id}</span>
      <span className="line-clamp-2">{topic.title}</span>
    </button>
  );
}
