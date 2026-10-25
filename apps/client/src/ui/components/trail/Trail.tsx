import { useTranslation } from 'react-i18next';

import type { Course } from '@app/api/client';
import { ModuleSection } from './ModuleSection';

interface TrailProps {
  course: Course;
  lessonTopics: ReadonlySet<string>;
  exerciseTopics: ReadonlySet<string>;
}

// TODO: Refact this component into a composition component pattern
export function Trail({ course, lessonTopics, exerciseTopics }: TrailProps) {
  const { t } = useTranslation();

  if (course.modules.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('trail.empty')}</p>;
  }

  return (
    <ol className="ml-2 border-l">
      {course.modules.map((module, i) => (
        <ModuleSection
          key={module.title}
          slug={course.slug}
          index={i + 1}
          module={module}
          lessonTopics={lessonTopics}
          exerciseTopics={exerciseTopics}
        />
      ))}
    </ol>
  );
}
