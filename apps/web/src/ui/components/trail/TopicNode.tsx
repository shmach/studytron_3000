import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { STATUS_STYLE } from './statusStyle';
import { NODE_SIZE } from '@app/lib/trailLayout';
import { cn } from '@app/lib/utils';
import type { TrailNodeData } from '@app/lib/trail';
import { useTranslation } from 'react-i18next';

export type TopicFlowNode = Node<
  Extract<TrailNodeData, { kind: 'topic' }>,
  'topic'
>;

export function TopicNode({ data }: NodeProps<TopicFlowNode>) {
  const { t } = useTranslation();
  const { icon: Icon, className } = STATUS_STYLE[data.topic.meta.status];
  const statusLabel = t(`status.${data.topic.meta.status}`);

  return (
    <div
      style={{ width: NODE_SIZE.width, height: NODE_SIZE.height }}
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 text-sm',
        className,
      )}
      aria-label={`${data.topic.title} - ${statusLabel}`}
    >
      <Icon className="size-4 shrink-0" />
      <span className="line-clamp-2">
        {data.topic.meta.id} - {data.topic.title}
      </span>
      <Handle type="target" position={Position.Top} className="opacity-0!" />
    </div>
  );
}
