import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { useSettings } from '@app/hooks/settings/useSettings';
import { ErrorState } from '@ui/components/ErrorState';
import { Button } from '@ui/components/ui/Button';

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      {children}
    </section>
  );
}

export function SettingsPage() {
  const { t } = useTranslation();
  const { isError, error, refetch } = useSettings();

  return (
    <div className="flex w-full flex-col gap-8">
      <nav>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/">
            <ArrowLeft />
            {t('settings.back')}
          </Link>
        </Button>
      </nav>

      <h1 className="text-2xl font-semibold">{t('settings.title')}</h1>

      {isError && <ErrorState error={error} onRetry={() => void refetch()} />}

      <SettingsSection
        title={t('settings.agent.title')}
        description={t('settings.agent.description')}
      />
      <SettingsSection
        title={t('settings.vault.title')}
        description={t('settings.vault.description')}
      />
      <SettingsSection
        title={t('settings.theme.title')}
        description={t('settings.theme.description')}
      />
      <SettingsSection
        title={t('settings.language.title')}
        description={t('settings.language.description')}
      />
      <SettingsSection
        title={t('settings.about.title')}
        description={t('settings.about.description')}
      />
    </div>
  );
}
