import type { Course, Topic } from '@app/api/client';

type TrailNodeDataModule = {
  kind: 'module';
  index: number;
  title: string;
  topicCount: number;
};
type TrailNodeDataTopic = { kind: 'topic'; topic: Topic; moduleIndex: number };
type TrailNodeData = TrailNodeDataModule | TrailNodeDataTopic;

interface TrailNode {
  id: string;
  data: TrailNodeData;
}

interface TrailEdge {
  id: string;
  source: string;
  target: string;
  kind: 'spine' | 'branch';
}

type BuildTrailDTO = { nodes: TrailNode[]; edges: TrailEdge[] };

function buildTrail(course: Course): BuildTrailDTO {
  return {
    nodes: [],
    edges: [],
  };
}
