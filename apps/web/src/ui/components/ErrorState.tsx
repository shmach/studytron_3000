import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';

import { API_BASE_URL, ApiError } from '@app/api/client';
import { Button } from '@ui/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ui/components/ui/Card';

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const { t } = useTranslation();
  const isNetworkError = error instanceof TypeError;
  // Server messages stay as the API sent them; only the wrapper text is translated.
  const message =
    error instanceof ApiError
      ? `${error.status}: ${error.message}`
      : error instanceof Error
        ? error.message
        : t('error.unknown');

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="text-destructive" />
          {t('error.title')}
        </CardTitle>
        <CardDescription>
          {isNetworkError ? (
            <Trans
              i18nKey="error.network"
              values={{ url: API_BASE_URL }}
              components={{ code: <code className="font-mono" /> }}
            />
          ) : (
            message
          )}
        </CardDescription>
      </CardHeader>
      {onRetry && (
        <CardContent>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw />
            {t('common.tryAgain')}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
