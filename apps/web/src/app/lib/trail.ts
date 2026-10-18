import type { Course, Topic } from '@app/api/client';

type TrailNodeDataModule = {
  kind: 'module';
  index: number;
  title: string;
  topicCount: number;
};
type TrailNodeDataTopic = { kind: 'topic'; topic: Topic; moduleIndex: number };
export type TrailNodeData = TrailNodeDataModule | TrailNodeDataTopic;

export interface TrailNode {
  id: string;
  data: TrailNodeData;
}

export interface TrailEdge {
  id: string;
  source: string;
  target: string;
  kind: 'spine' | 'branch';
}

export type Trail = { nodes: TrailNode[]; edges: TrailEdge[] };

export function buildTrail(course: Course): Trail {
  const nodes: TrailNode[] = [];
  const edges: TrailEdge[] = [];

  course.modules.forEach((module, i) => {
    const moduleIndex = i + 1;
    const moduleId = `module-${moduleIndex}`;

    nodes.push({
      id: moduleId,
      data: {
        kind: 'module',
        index: moduleIndex,
        title: module.title,
        topicCount: module.topics.length,
      },
    });

    module.topics.forEach((topic, _i) => {
      nodes.push({
        id: topic.meta.id,
        data: {
          kind: 'topic',
          moduleIndex: moduleIndex,
          topic: topic,
        },
      });

      edges.push({
        kind: 'branch',
        source: moduleId,
        target: topic.meta.id,
        id: `${moduleId}->${topic.meta.id}`,
      });
    });

    if (i < course.modules.length - 1) {
      const nextModuleId = `module-${i + 2}`;
      edges.push({
        id: `${moduleId}->${nextModuleId}`,
        kind: 'spine',
        source: moduleId,
        target: nextModuleId,
      });
    }
  });

  return { nodes, edges };
}
