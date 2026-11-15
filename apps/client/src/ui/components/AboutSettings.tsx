import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@ui/components/ui/Button';

export function AboutSettings() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="outline">
        <a
          href={'https://github.com/shmach/studytron_3000'}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink />
          {t('settings.about.repository')}
        </a>
      </Button>
    </div>
  );
}
