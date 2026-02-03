import { useMemo } from 'react';
import type { Connection as ConnectionType } from '../../store/nodeStore';
import { dataTypeColors } from '../../engine/nodeDefinitions';

interface ConnectionProps {
  connection: ConnectionType;
  fromPos: { x: number; y: number } | null;
  toPos: { x: number; y: number } | null;
}

function createBezierPath(
  from: { x: number; y: number },
  to: { x: number; y: number }
): string {
  const dx = Math.abs(to.x - from.x);
  const controlOffset = Math.max(50, dx * 0.4);

  return `M ${from.x} ${from.y} C ${from.x + controlOffset} ${from.y}, ${
    to.x - controlOffset
  } ${to.y}, ${to.x} ${to.y}`;
}

export function Connection({ connection, fromPos, toPos }: ConnectionProps) {
  if (!fromPos || !toPos) return null;

  const path = useMemo(
    () => createBezierPath(fromPos, toPos),
    [fromPos, toPos]
  );

  const color = dataTypeColors[connection.dataType];

  return (
    <g className="pointer-events-none">
      {/* Glow effect */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        opacity={0.2}
      />
      {/* Main line */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </g>
  );
}

interface DraggingConnectionProps {
  fromPos: { x: number; y: number };
  toPos: { x: number; y: number };
  dataType: string;
}

export function DraggingConnection({
  fromPos,
  toPos,
  dataType,
}: DraggingConnectionProps) {
  const path = useMemo(
    () => createBezierPath(fromPos, toPos),
    [fromPos, toPos]
  );

  const color = dataTypeColors[dataType as keyof typeof dataTypeColors] || '#888';

  return (
    <g className="pointer-events-none">
      {/* Glow effect */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeLinecap="round"
        opacity={0.15}
      />
      {/* Main dashed line */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray="6,4"
        opacity={0.8}
      />
    </g>
  );
}
