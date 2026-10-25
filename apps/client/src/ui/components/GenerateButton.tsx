import { useTranslation } from 'react-i18next';

import { ApiError } from '@app/api/client';
import { useGeneration } from '@app/hooks/useGeneration';
import type { GenerationKind } from '@app/hooks/useGeneration';
import { GenerationProgress } from '@ui/components/GenerationProgress';
import { Button } from '@ui/components/ui/Button';

interface GenerateButtonProps {
  slug: string;
  topicId: string;
  kind: GenerationKind;
  /** When set, the button is disabled and this explains why. */
  disabledReason?: string;
}

/**
 * Starts the generation of a topic's lesson or exercises. While that job runs it shows the
 * progress instead; while another generation runs on the course it stays disabled.
 */
export function GenerateButton({
  slug,
  topicId,
  kind,
  disabledReason,
}: GenerateButtonProps) {
  const { t } = useTranslation();
  const { start, startError, busy, runningHere, runningElsewhere } =
    useGeneration(slug, topicId);

  if (runningHere(kind)) return <GenerationProgress kind={kind} />;

  const hint = disabledReason
    ? disabledReason
    : runningElsewhere(kind)
      ? t('generation.otherJobRunning')
      : null;

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        disabled={busy || Boolean(disabledReason)}
        onClick={() => start(kind)}
      >
        {t(`generation.generate.${kind}` as const)}
      </Button>

      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}

      {startError && !runningElsewhere(kind) && (
        <p role="alert" className="text-destructive text-sm">
          {startError instanceof ApiError && startError.status === 409
            ? t('generation.startConflict')
            : t('generation.startFailed')}
        </p>
      )}
    </div>
  );
}
