import { Badge } from '@ui/components/ui/badge';
import type { TopicStatus } from '@app/api/client';
import { cn } from '@app/lib/utils';

const STATUS_LABEL: Record<TopicStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  completed: 'Completed',
  review: 'Review',
};

const STATUS_CLASS: Record<TopicStatus, string> = {
  pending: 'bg-muted text-muted-foreground border-transparent',
  in_progress:
    'bg-blue-100 text-blue-900 border-transparent dark:bg-blue-950 dark:text-blue-200',
  completed:
    'bg-emerald-100 text-emerald-900 border-transparent dark:bg-emerald-950 dark:text-emerald-200',
  review:
    'bg-amber-100 text-amber-900 border-transparent dark:bg-amber-950 dark:text-amber-200',
};

export function StatusBadge({
  status,
  className,
}: {
  status: TopicStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(STATUS_CLASS[status], className)}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}
