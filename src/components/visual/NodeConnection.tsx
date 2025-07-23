import React from 'react';
import { type NodeConnection as NodeConnectionType, type StoryletNode } from '../../types/visual';
import { useVisualEditorStore } from '../../stores/useVisualEditorStore';

interface NodeConnectionProps {
  connection: NodeConnectionType;
  fromNode: StoryletNode;
  toNode: StoryletNode;
  isSelected?: boolean;
}

export const NodeConnection: React.FC<NodeConnectionProps> = ({ 
  connection, 
  fromNode, 
  toNode 
}) => {
  const { selectedConnection, selectConnection, removeConnection } = useVisualEditorStore();

  const isSelected = selectedConnection === connection.id;

  // Calculate connection points
  const fromPoint = {
    x: fromNode.position.x + 200, // Right edge of from node
    y: fromNode.position.y + 40   // Middle of from node
  };

  const toPoint = {
    x: toNode.position.x,      // Left edge of to node
    y: toNode.position.y + 40  // Middle of to node
  };

  // Calculate control points for bezier curve
  const controlOffset = Math.max(50, Math.abs(toPoint.x - fromPoint.x) * 0.3);
  const controlPoint1 = {
    x: fromPoint.x + controlOffset,
    y: fromPoint.y
  };
  const controlPoint2 = {
    x: toPoint.x - controlOffset,
    y: toPoint.y
  };

  const pathData = `M ${fromPoint.x} ${fromPoint.y} C ${controlPoint1.x} ${controlPoint1.y} ${controlPoint2.x} ${controlPoint2.y} ${toPoint.x} ${toPoint.y}`;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    selectConnection(connection.id);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Delete this connection?')) {
      removeConnection(connection.id);
    }
  };

  // Calculate midpoint for label
  const midX = (fromPoint.x + toPoint.x) / 2;
  const midY = (fromPoint.y + toPoint.y) / 2;

  return (
    <g>
      {/* Connection Path */}
      <path
        d={pathData}
        stroke={isSelected ? '#ff6b6b' : '#6b7280'}
        strokeWidth={isSelected ? 3 : 2}
        fill="none"
        className="cursor-pointer transition-all duration-200 hover:stroke-accent"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      />

      {/* Invisible thicker path for easier clicking */}
      <path
        d={pathData}
        stroke="transparent"
        strokeWidth={12}
        fill="none"
        className="cursor-pointer"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      />

      {/* Arrow head */}
      <defs>
        <marker
          id={`arrowhead-${connection.id}`}
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill={isSelected ? '#ff6b6b' : '#6b7280'}
          />
        </marker>
      </defs>
      
      <path
        d={pathData}
        stroke={isSelected ? '#ff6b6b' : '#6b7280'}
        strokeWidth={isSelected ? 3 : 2}
        fill="none"
        markerEnd={`url(#arrowhead-${connection.id})`}
        className="pointer-events-none"
      />

      {/* Label */}
      {connection.label && (
        <g>
          <rect
            x={midX - 20}
            y={midY - 8}
            width={40}
            height={16}
            fill="white"
            stroke="#6b7280"
            strokeWidth={1}
            rx={2}
            className="cursor-pointer"
            onClick={handleClick}
          />
          <text
            x={midX}
            y={midY}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-xs font-medium fill-gray-700 pointer-events-none select-none"
          >
            {connection.label}
          </text>
        </g>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <circle
          cx={midX}
          cy={midY}
          r={4}
          fill="#ff6b6b"
          className="animate-pulse"
        />
      )}
    </g>
  );
};