import type { Course } from '@app/api/client';
import { useMemo } from 'react';
import {
  Background,
  Controls,
  ReactFlow,
  type Node,
  type Edge,
} from '@xyflow/react';
import { useTheme } from '@app/context/ThemeContext';
import { buildTrail } from '@app/lib/trail';
import { layoutTrail } from '@app/lib/trailLayout';
import { ModuleNode } from './ModuleNode';
import { TopicNode } from './TopicNode';
import '@xyflow/react/dist/style.css';

// Must live outside the component: a new object on every render would make
// React Flow remount every node.
const nodeTypes = { module: ModuleNode, topic: TopicNode };

export function TrailGraph({ course }: { course: Course }) {
  const { theme } = useTheme();

  const { nodes, edges } = useMemo(() => {
    const laidOut = layoutTrail(buildTrail(course));

    const nodes: Node[] = laidOut.nodes.map((node) => ({
      id: node.id,
      position: node.position,
      type: node.data.kind,
      data: node.data,
    }));

    const edges: Edge[] = laidOut.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    }));

    return { nodes, edges };
  }, [course]);

  return (
    <div className="h-[70vh] w-full rounded-lg border">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        colorMode={theme}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
      >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}
