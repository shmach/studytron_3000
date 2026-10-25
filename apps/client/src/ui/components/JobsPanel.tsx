import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import type { Job } from '@app/api/client';
import { useCourses } from '@app/hooks/useCourses';
import { useJobs } from '@app/hooks/useJobs';
import { describeJob, isJobActive } from '@app/lib/jobs';
import { coursePath } from '@app/lib/routes';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ui/components/ui/Card';

/**
 * Jobs running right now, of every course and kind. There is no history: a job leaves the
 * panel when it ends, and the toast says how it went. Hidden when nothing is running.
 */
export function JobsPanel() {
  const { t } = useTranslation();
  // The unfiltered list is the one the toasts watch, so this shares its request.
  const { data: jobs } = useJobs();
  const { data: courses } = useCourses();

  const running = jobs?.filter(isJobActive) ?? [];
  if (running.length === 0) return null;

  return (
    <Card className="w-full" aria-live="polite">
      <CardHeader>
        <CardTitle className="text-base">{t('jobs.panel.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3">
          {running.map((job) => (
            <JobRow key={job.id} job={job} courses={courses ?? []} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function JobRow({
  job,
  courses,
}: {
  job: Job;
  courses: Parameters<typeof describeJob>[1];
}) {
  const { t } = useTranslation();
  const { courseName, topicTitle } = describeJob(job, courses);
  const context = [courseName ?? job.slug, topicTitle]
    .filter(Boolean)
    .join(' · ');

  return (
    <li className="flex items-center gap-3 text-sm">
      <Loader2
        className="text-muted-foreground size-4 shrink-0 animate-spin"
        aria-hidden
      />
      <div className="min-w-0 grow">
        <p className="font-medium">
          {t(`jobs.kind.${job.kind}` as const, { topic: job.topic_id ?? '' })}
        </p>
        {context && (
          <p className="text-muted-foreground truncate text-xs">{context}</p>
        )}
      </div>
      {job.created_at && <Elapsed since={job.created_at} />}
      {job.slug && (
        <Link
          to={coursePath(job.slug)}
          className="text-primary shrink-0 text-xs underline-offset-4 hover:underline"
        >
          {t('jobs.panel.openCourse')}
        </Link>
      )}
    </li>
  );
}

function formatElapsed(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Time since `since` (an ISO date), ticking every second. */
function Elapsed({ since }: { since: string }) {
  const start = Date.parse(since);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (Number.isNaN(start)) return null;
  const seconds = Math.max(0, Math.floor((now - start) / 1000));
  return (
    <time className="text-muted-foreground shrink-0 text-xs tabular-nums">
      {formatElapsed(seconds)}
    </time>
  );
}
