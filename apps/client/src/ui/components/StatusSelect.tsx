import { ChevronDown, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@app/api/client';
import type { TopicStatus } from '@app/api/client';
import { useJobs } from '@app/hooks/useJobs';
import { useUpdateTopicStatus } from '@app/hooks/useUpdateTopicStatus';
import { cn } from '@app/lib/utils';
import { Button } from '@ui/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@ui/components/ui/DropdownMenu';
import { STATUS_STYLE } from '@ui/utils/statusStyle';

const STATUSES: TopicStatus[] = [
  'pending',
  'in_progress',
  'review',
  'completed',
];

interface StatusSelectProps {
  slug: string;
  topicId: string;
  status: TopicStatus;
  /** A topic can only be `in_progress` once its lesson exists (the server refuses otherwise). */
  hasLesson: boolean;
}

/**
 * Lets the student change a topic's status. It looks like the status badge and opens a menu.
 * It is disabled while an agent job is running on the course: the agent rewrites the same
 * curriculum file, so a status written meanwhile could be lost.
 */
export function StatusSelect({
  slug,
  topicId,
  status,
  hasLesson,
}: StatusSelectProps) {
  const { t } = useTranslation();
  const mutation = useUpdateTopicStatus(slug);
  const { data: runningJobs } = useJobs({ slug, active: true });

  const jobRunning = (runningJobs?.length ?? 0) > 0;
  const { icon: Icon, className } = STATUS_STYLE[status];
  const label = t(`status.${status}` as const);

  const hint = jobRunning
    ? t('statusSelect.jobRunning')
    : hasLesson
      ? null
      : t('statusSelect.needsLesson');

  return (
    <div className="flex flex-col items-start gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={jobRunning || mutation.isPending}
            aria-label={t('statusSelect.label', { status: label })}
            className={cn(className, 'rounded-full')}
          >
            {mutation.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Icon />
            )}
            {label}
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup
            value={status}
            onValueChange={(value) => {
              if (value === status) return;
              mutation.mutate({ topicId, status: value as TopicStatus });
            }}
          >
            {STATUSES.map((option) => {
              const { icon: OptionIcon } = STATUS_STYLE[option];
              return (
                <DropdownMenuRadioItem
                  key={option}
                  value={option}
                  disabled={option === 'in_progress' && !hasLesson}
                >
                  <OptionIcon />
                  {t(`status.${option}` as const)}
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}

      {mutation.error && (
        <p role="alert" className="text-destructive text-sm">
          {mutation.error instanceof ApiError && mutation.error.status === 409
            ? t('statusSelect.lessonRequired')
            : t('statusSelect.failed')}
        </p>
      )}
    </div>
  );
}
