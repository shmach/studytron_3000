import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { useAgentCheck } from '@app/hooks/settings/useAgentCheck';
import { useAgents } from '@app/hooks/settings/useAgents';
import { useSettings } from '@app/hooks/settings/useSettings';
import { useUpdateSettings } from '@app/hooks/settings/useUpdateSettings';
import type { AgentId } from '@app/api/client';
import { Button } from '@ui/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@ui/components/ui/DropdownMenu';

function CheckResult({ agentId }: { agentId: AgentId }) {
  const { t } = useTranslation();
  const { data, isFetching, isError, error } = useAgentCheck(agentId);

  // While testing, a result from an earlier run must not look like the current answer.
  if (isFetching) {
    return (
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {t('settings.agent.testing')}
      </p>
    );
  }

  if (isError) {
    return (
      <p role="alert" className="text-destructive flex gap-2 text-sm">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
        {error.message}
      </p>
    );
  }

  if (data?.available) {
    return (
      <p className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="size-4 shrink-0" aria-hidden />
        {data.version
          ? t('settings.agent.foundWithVersion', { version: data.version })
          : t('settings.agent.found')}
      </p>
    );
  }

  if (data) {
    return (
      <div role="alert" className="text-destructive flex gap-2 text-sm">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
        {/* The server writes this message, including how to install the agent. */}
        <p>{data.error}</p>
      </div>
    );
  }

  return null;
}

export function AgentSettings() {
  const { t } = useTranslation();
  const settings = useSettings();
  const agents = useAgents();
  const update = useUpdateSettings();
  const agentId = settings.data?.agent;
  const check = useAgentCheck(agentId);

  const selected = agents.data?.find((agent) => agent.id === agentId);

  const changeAgent = (id: string) => {
    update.mutate(
      { agent: id as AgentId },
      { onError: (error) => toast.error(error.message) },
    );
  };

  if (!selected || !agentId) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              disabled={update.isPending}
              aria-label={t('settings.agent.choose')}
            >
              {selected.display_name}
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuRadioGroup value={agentId} onValueChange={changeAgent}>
              {agents.data?.map((agent) => (
                <DropdownMenuRadioItem key={agent.id} value={agent.id}>
                  {agent.display_name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="secondary"
          disabled={check.isFetching}
          onClick={() => void check.refetch()}
        >
          {t('settings.agent.test')}
        </Button>
      </div>

      <CheckResult agentId={agentId} />

      <div className="bg-muted/50 space-y-1 rounded-md border p-3 text-sm">
        <p className="font-medium">{t('settings.agent.skillTitle')}</p>
        {/* Steps are separated by line breaks in the server text. */}
        <p className="text-muted-foreground whitespace-pre-line">
          {selected.skill_install_hint}
        </p>
      </div>
    </div>
  );
}
