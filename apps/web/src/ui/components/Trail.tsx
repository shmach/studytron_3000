import type { Course } from '@app/api/client';
import { useMemo } from 'react';
import {
  Background,
  Controls,
  ReactFlow,
  type Node,
  type Edge,
} from '@xyflow/react';
import { buildTrail } from '@app/lib/trail';
import { layoutTrail, NODE_SIZE } from '@app/lib/trailLayout';
import '@xyflow/react/dist/style.css';

export function TrailGraph({ course }: { course: Course }) {
  const { nodes, edges } = useMemo(() => {
    const laidOut = layoutTrail(buildTrail(course));

    const nodes: Node[] = laidOut.nodes.map((node) => ({
      id: node.id,
      position: { x: node.position.x, y: node.position.y },
      data: {
        label:
          node.data.kind === 'module' ? node.data.title : node.data.topic.title,
      },
      style: { width: NODE_SIZE.width, height: NODE_SIZE.height },
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
