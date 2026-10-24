import { useTranslation } from 'react-i18next';

import type { Course } from '@app/api/client';
import { ModuleSection } from './ModuleSection';

// TODO: Refact this component into a composition component pattern
export function Trail({ course }: { course: Course }) {
  const { t } = useTranslation();

  if (course.modules.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('trail.empty')}</p>;
  }

  return (
    <ol className="ml-2 border-l">
      {course.modules.map((module, i) => (
        <ModuleSection key={module.title} index={i + 1} module={module} />
      ))}
    </ol>
  );
}
