import { BookOpen } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Link, Outlet, ScrollRestoration } from 'react-router';

import type { Job } from '@app/api/client';
import { useJobsWatcher } from '@app/hooks/useJobsWatcher';
import { LanguageSelector } from '@ui/components/LanguageSelector';
import {
  PendingStatusDialog,
  type PendingDecisionItem,
} from '@ui/components/PendingStatusDialog';
import { ThemeSelector } from '@ui/components/ThemeSelector';
import { Toaster } from '@ui/components/ui/Sonner';

export function AppLayout() {
  const [pendingDecisions, setPendingDecisions] = useState<
    PendingDecisionItem[]
  >([]);

  const queuePendingDecisions = useCallback((job: Job) => {
    if (!job.slug) return;
    const slug = job.slug;
    setPendingDecisions((current) => [
      ...current,
      ...job.pending_decisions.map((decision) => ({
        key: `${job.id}:${decision.topic_id}`,
        slug,
        topicId: decision.topic_id,
        title: decision.title,
      })),
    ]);
  }, []);

  // Mounted here, not in a page, so it reports jobs whatever screen the student is on.
  useJobsWatcher({ onPendingDecisions: queuePendingDecisions });

  return (
    <div className="min-h-svh bg-background flex flex-col justify-center">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <BookOpen className="size-5" />
            StudyTRON 3000
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <LanguageSelector />
            <ThemeSelector />
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl grow flex-col px-4 py-8">
        <Outlet />
      </main>
      <ScrollRestoration />
      <Toaster />
      <PendingStatusDialog
        items={pendingDecisions}
        onResolve={(key) =>
          setPendingDecisions((current) =>
            key === null ? [] : current.filter((item) => item.key !== key),
          )
        }
      />
    </div>
  );
}
