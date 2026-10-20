import type { TopicStatus } from '@app/api/client';
import {
  CheckCircle,
  Clock,
  PlayCircleIcon,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react';

export const STATUS_STYLE: Record<
  TopicStatus,
  { icon: LucideIcon; className: string }
> = {
  pending: {
    icon: Clock,
    className: 'bg-muted text-muted-foreground border-transparent',
  },
  completed: {
    icon: CheckCircle,
    className:
      'bg-emerald-100 text-emerald-900 border-transparent dark:bg-emerald-950 dark:text-emerald-200',
  },
  in_progress: {
    icon: PlayCircleIcon,
    className:
      'bg-blue-100 text-blue-900 border-transparent dark:bg-blue-950 dark:text-blue-200',
  },
  review: {
    icon: RotateCcw,
    className:
      'bg-amber-100 text-amber-900 border-transparent dark:bg-amber-950 dark:text-amber-200',
  },
};
