import { AlertTriangle, RefreshCw } from 'lucide-react';

import { API_BASE_URL, ApiError } from '@app/api/client';
import { Button } from '@ui/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ui/components/ui/card';

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const isNetworkError = error instanceof TypeError;
  const message =
    error instanceof ApiError
      ? `${error.status}: ${error.message}`
      : error instanceof Error
        ? error.message
        : 'Unknown error';

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="text-destructive" />
          Could not load data
        </CardTitle>
        <CardDescription>
          {isNetworkError ? (
            <>
              The API at <code className="font-mono">{API_BASE_URL}</code> did
              not answer. Is the local server running?
            </>
          ) : (
            message
          )}
        </CardDescription>
      </CardHeader>
      {onRetry && (
        <CardContent>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw />
            Try again
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
