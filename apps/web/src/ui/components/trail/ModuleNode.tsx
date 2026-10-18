import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { useTranslation } from 'react-i18next';

import type { TrailNodeData } from '@app/lib/trail';
import { NODE_SIZE } from '@app/lib/trailLayout';

export type ModuleFlowNode = Node<
  Extract<TrailNodeData, { kind: 'module' }>,
  'module'
>;

export function ModuleNode({ data }: NodeProps<ModuleFlowNode>) {
  const { t } = useTranslation();
  const label = t('course.module', { index: data.index, title: data.title });

  return (
    <div
      style={{ width: NODE_SIZE.width, height: NODE_SIZE.height }}
      className="bg-primary text-primary-foreground flex items-center rounded-lg px-3 text-sm font-semibold"
      aria-label={label}
    >
      <span className="line-clamp-2">{label}</span>
      <Handle type="target" position={Position.Top} className="opacity-0!" />
      <Handle type="source" position={Position.Bottom} className="opacity-0!" />
    </div>
  );
}
