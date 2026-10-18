import type { Trail, TrailEdge, TrailNode } from './trail';
import { graphlib, layout } from '@dagrejs/dagre';

export const NODE_SIZE = { width: 220, height: 64 };

export interface PositionedTrailNode extends TrailNode {
  position: { x: number; y: number };
}

export function layoutTrail(trail: Trail): {
  nodes: PositionedTrailNode[];
  edges: TrailEdge[];
} {
  const g = new graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 60 });
  g.setDefaultEdgeLabel(() => ({}));

  trail.nodes.forEach((node) =>
    g.setNode(node.id, {
      width: NODE_SIZE.width,
      height: NODE_SIZE.height,
    }),
  );

  trail.edges.forEach((edge) =>
    g.setEdge(
      edge.source,
      edge.target,
      edge.kind === 'spine' ? { minlen: 2 } : {},
    ),
  );

  layout(g);

  const modifiedNodes = trail.nodes.map((node) => {
    const { x, y } = g.node(node.id);
    const updatedNode: PositionedTrailNode = {
      id: node.id,
      data: node.data,
      position: { x: x - NODE_SIZE.width / 2, y: y - NODE_SIZE.height / 2 },
    };
    return updatedNode;
  });

  return { nodes: modifiedNodes, edges: trail.edges };
}
