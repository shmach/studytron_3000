import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { GenerationKind } from '@app/hooks/useGeneration';

/**
 * Shown while the generation job runs. It keeps no result: when the job ends the component
 * disappears, and what the job wrote shows up through the refreshed queries.
 */
export function GenerationProgress({ kind }: { kind: GenerationKind }) {
  const { t } = useTranslation();

  return (
    <p
      role="status"
      className="text-muted-foreground flex items-center gap-2 text-sm"
    >
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {t(`generation.running.${kind}` as const)}
    </p>
  );
}
