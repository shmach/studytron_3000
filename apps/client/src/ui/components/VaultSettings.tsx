import { AlertTriangle, Folder } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { useJobs } from '@app/hooks/jobs/useJobs';
import { useSettings } from '@app/hooks/settings/useSettings';
import { useUpdateSettings } from '@app/hooks/settings/useUpdateSettings';
import { Button } from '@ui/components/ui/Button';
import { Input } from '@ui/components/ui/Input';

export function VaultSettings() {
  const { t } = useTranslation();
  const settings = useSettings();
  // A running job writes into the current folder, so the server refuses to move it.
  const activeJobs = useJobs({ active: true });
  const update = useUpdateSettings();
  // The field starts empty: the folder in use is shown above it, so there is nothing to sync.
  const [draft, setDraft] = useState('');

  if (!settings.data) return null;

  const current = settings.data.vault_path;
  const locked = (activeJobs.data?.length ?? 0) > 0;
  const path = draft.trim();

  const choose = (vaultPath: string) => {
    update.mutate({ vault_path: vaultPath }, { onSuccess: () => setDraft('') });
  };

  const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (path && path !== current) choose(path);
  };

  const recent = settings.data.recent_vault_paths.filter(
    (vaultPath) => vaultPath !== current,
  );

  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 text-sm">
        <Folder className="text-muted-foreground size-4 shrink-0" aria-hidden />
        <span className="text-muted-foreground">
          {t('settings.vault.current')}
        </span>
        {current ? (
          <code className="bg-muted rounded px-1.5 py-0.5 break-all">
            {current}
          </code>
        ) : (
          <span className="italic">{t('settings.vault.notSet')}</span>
        )}
      </p>

      <form onSubmit={onSubmit} className="flex flex-wrap gap-2">
        <Input
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            update.reset();
          }}
          disabled={locked || update.isPending}
          placeholder={t('settings.vault.placeholder')}
          aria-label={t('settings.vault.inputLabel')}
          aria-invalid={update.isError}
          className="min-w-64 flex-1"
        />
        <Button
          type="submit"
          disabled={locked || update.isPending || !path || path === current}
        >
          {t('settings.vault.save')}
        </Button>
      </form>

      {locked && (
        <p className="text-muted-foreground text-sm">
          {t('settings.vault.jobRunning')}
        </p>
      )}

      {update.isError && (
        <p role="alert" className="text-destructive flex gap-2 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {/* The server says why the folder was refused. */}
          {update.error.message}
        </p>
      )}

      {recent.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">{t('settings.vault.recent')}</p>
          <ul className="space-y-1">
            {recent.map((vaultPath) => (
              <li key={vaultPath}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto max-w-full justify-start py-1.5 text-left font-mono text-xs break-all whitespace-normal"
                  disabled={locked || update.isPending}
                  onClick={() => choose(vaultPath)}
                >
                  {vaultPath}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
