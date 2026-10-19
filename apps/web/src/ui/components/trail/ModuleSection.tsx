import { useTranslation } from 'react-i18next';

import type { Module } from '@app/api/client';
import { TopicCard } from './TopicCard';

interface ModuleSectionProps {
  index: number;
  module: Module;
  selectedId: string | null;
  onSelectTopic: (id: string) => void;
}

export function ModuleSection({
  index,
  module,
  selectedId,
  onSelectTopic,
}: ModuleSectionProps) {
  const { t } = useTranslation();

  return (
    <li className="relative pb-10 pl-8 last:pb-0">
      {/* Marker centered on the spine (the parent list's left border). */}
      <span
        aria-hidden
        className="border-primary bg-background absolute top-1 -left-[9px] size-4 rounded-full border-2"
      />
      <h3 className="font-semibold">
        {t('course.module', { index, title: module.title })}
      </h3>
      {module.description && (
        <p className="text-muted-foreground text-sm">{module.description}</p>
      )}
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {module.topics.map((topic) => (
          <li key={topic.meta.id}>
            <TopicCard
              topic={topic}
              selected={topic.meta.id === selectedId}
              onSelect={onSelectTopic}
            />
          </li>
        ))}
      </ul>
    </li>
  );
}
