import type { ReactNode } from 'react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ui/components/ui/Card';

interface NotGeneratedCardProps {
  title: string;
  body: string;
  /** What the student can do about it, e.g. a button that generates the content. */
  children?: ReactNode;
}

/** Shown when the vault has no lesson/exercise set for a topic yet (HTTP 404). */
export function NotGeneratedCard({
  title,
  body,
  children,
}: NotGeneratedCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">{body}</p>
        {children}
      </CardContent>
    </Card>
  );
}
