import { useTranslation } from 'react-i18next';

import { Badge } from '@ui/components/ui/Badge';
import type { TopicStatus } from '@app/api/client';
import { cn } from '@app/lib/utils';
import { STATUS_STYLE } from '@ui/utils/statusStyle';

export function StatusBadge({
  status,
  className,
}: {
  status: TopicStatus;
  className?: string;
}) {
  const { t } = useTranslation();

  const { className: style, icon: Icon } = STATUS_STYLE[status];
  return (
    <Badge
      variant="outline"
      className={cn(style, className, 'flex gap-1 items-center justify-center')}
    >
      <Icon />
      {t(`status.${status}` as const)}
    </Badge>
  );
}
