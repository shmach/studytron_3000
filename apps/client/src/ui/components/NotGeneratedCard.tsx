import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ui/components/ui/Card';

interface NotGeneratedCardProps {
  title: string;
  body: string;
}

/** Shown when the vault has no lesson/exercise set for a topic yet (HTTP 404). */
export function NotGeneratedCard({ title, body }: NotGeneratedCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        {body}
      </CardContent>
    </Card>
  );
}
