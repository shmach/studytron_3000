import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@app/api/client';
import type { TopicStatus } from '@app/api/client';
import { useCourses } from '@app/hooks/useCourses';
import { useJobs } from '@app/hooks/useJobs';
import { useUpdateTopicStatus } from '@app/hooks/useUpdateTopicStatus';
import { isJobActive } from '@app/lib/jobs';
import { Button } from '@ui/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@ui/components/ui/Dialog';

/** A topic the agent left `in_progress` because it could not ask the student about it. */
export interface PendingDecisionItem {
  /** Unique per job and topic, so the same topic from two lesson jobs does not collide. */
  key: string;
  slug: string;
  topicId: string;
  title: string;
}

interface PendingStatusDialogProps {
  items: PendingDecisionItem[];
  /** Called when a decision is answered, or `null` when the student closes the dialog. */
  onResolve: (key: string | null) => void;
}

/**
 * Asks what happened to each topic that was left waiting. Opens while there are items.
 *
 * The decision belongs to the student, so nothing is assumed: closing the dialog changes no
 * status. The question comes back with the next lesson generated while the topic is still
 * `in_progress`.
 */
export function PendingStatusDialog({
  items,
  onResolve,
}: PendingStatusDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      open={items.length > 0}
      onOpenChange={(open) => {
        if (!open) onResolve(null);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('pendingDecision.title')}</DialogTitle>
          <DialogDescription>
            {t('pendingDecision.description', { count: items.length })}
          </DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-5">
          {items.map((item) => (
            <DecisionRow
              key={item.key}
              item={item}
              onAnswered={() => onResolve(item.key)}
            />
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

const OPTIONS: {
  status: TopicStatus;
  label: 'completed' | 'review' | 'keep';
}[] = [
  { status: 'completed', label: 'completed' },
  { status: 'review', label: 'review' },
  { status: 'in_progress', label: 'keep' },
];

function DecisionRow({
  item,
  onAnswered,
}: {
  item: PendingDecisionItem;
  onAnswered: () => void;
}) {
  const { t } = useTranslation();
  const { data: courses } = useCourses();
  const { data: jobs } = useJobs();
  const mutation = useUpdateTopicStatus(item.slug);

  const courseName = courses?.find((c) => c.course.slug === item.slug)?.course
    .course;
  // Same rule as the status selector: do not write the curriculum while the agent may.
  const jobRunning = (jobs ?? []).some(
    (job) => isJobActive(job) && job.slug === item.slug,
  );

  function answer(status: TopicStatus) {
    // The topic is already `in_progress`: keeping it needs no request.
    if (status === 'in_progress') {
      onAnswered();
      return;
    }
    mutation.mutate(
      { topicId: item.topicId, status },
      { onSuccess: onAnswered },
    );
  }

  return (
    <li className="flex flex-col gap-2">
      <div>
        <p className="font-medium">
          {item.topicId} · {item.title}
        </p>
        {courseName && (
          <p className="text-muted-foreground text-xs">{courseName}</p>
        )}
      </div>
      <p className="text-sm">{t('pendingDecision.question')}</p>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map(({ status, label }) => (
          <Button
            key={status}
            size="sm"
            variant={status === 'completed' ? 'default' : 'outline'}
            disabled={jobRunning || mutation.isPending}
            onClick={() => answer(status)}
          >
            {mutation.isPending && mutation.variables?.status === status && (
              <Loader2 className="animate-spin" />
            )}
            {t(`pendingDecision.option.${label}` as const)}
          </Button>
        ))}
      </div>
      {jobRunning && (
        <p className="text-muted-foreground text-xs">
          {t('statusSelect.jobRunning')}
        </p>
      )}
      {mutation.error && (
        <p role="alert" className="text-destructive text-sm">
          {mutation.error instanceof ApiError && mutation.error.status === 409
            ? t('statusSelect.lessonRequired')
            : t('statusSelect.failed')}
        </p>
      )}
    </li>
  );
}
