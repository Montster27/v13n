import React, { useRef, useCallback } from 'react';
import { StoryletNode } from '../StoryletNode';
import { NodeConnection } from '../NodeConnection';
import { useVisualEditorStore } from '../../../stores/useVisualEditorStore';

interface VisualEditorCanvasProps {
  onNodeDoubleClick?: (storyletId: string) => void;
  onCanvasClick: (e: React.MouseEvent) => void;
  onCanvasMouseMove: (e: React.MouseEvent) => void;
  onWheel: (e: React.WheelEvent) => void;
  mousePosition: { x: number; y: number };
}

export const VisualEditorCanvas: React.FC<VisualEditorCanvasProps> = ({
  onNodeDoubleClick,
  onCanvasClick,
  onCanvasMouseMove,
  onWheel,
  mousePosition
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  const {
    nodes,
    connections,
    scale,
    offset,
    connecting
  } = useVisualEditorStore();



  const handleNodeDoubleClick = useCallback((storyletId: string | undefined) => {
    if (storyletId && onNodeDoubleClick) {
      onNodeDoubleClick(storyletId);
    }
  }, [onNodeDoubleClick]);

  return (
    <div className="flex-1 relative overflow-hidden bg-base-100" style={{ minHeight: '600px' }}>
      {/* Canvas */}
      <div
        ref={canvasRef}
        className="w-full h-full cursor-crosshair relative"
        onClick={onCanvasClick}
        onMouseMove={onCanvasMouseMove}
        onWheel={onWheel}
        style={{
          transform: `scale(${scale}) translate(${offset.x}px, ${offset.y}px)`,
          transformOrigin: '0 0',
          minHeight: '600px',
          position: 'relative'
        }}
      >
        {/* SVG for connections */}
        <svg
          ref={svgRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          style={{
            width: '100%',
            height: '100%'
          }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="currentColor"
                className="text-base-content"
              />
            </marker>
            <marker
              id="arrowhead-selected"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#3b82f6"
              />
            </marker>
          </defs>

          {/* Render connections */}
          {connections.map(connection => {
            const fromNode = nodes.find(node => node.id === connection.fromNodeId);
            const toNode = nodes.find(node => node.id === connection.toNodeId);
            
            if (!fromNode || !toNode) return null;
            
            return (
              <NodeConnection
                key={connection.id}
                connection={connection}
                fromNode={fromNode}
                toNode={toNode}
              />
            );
          })}

          {/* Temporary connection line while connecting */}
          {connecting && (() => {
            const fromNode = nodes.find(node => node.id === connecting.fromNodeId);
            if (!fromNode) return null;
            
            return (
              <line
                x1={fromNode.position.x + 100}
                y1={fromNode.position.y + 50}
                x2={mousePosition.x}
                y2={mousePosition.y}
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray="5,5"
                markerEnd="url(#arrowhead-selected)"
              />
            );
          })()}
        </svg>



        {/* Render nodes */}
        {nodes.length === 0 && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center opacity-50">
            <p>No storylets to display</p>
            <p className="text-sm">Create storylets or go to Data Manager to create sample data</p>
          </div>
        )}
        
        
        {nodes.map(node => (
          <StoryletNode
            key={node.id}
            node={node}
            scale={scale}
            onDoubleClick={() => handleNodeDoubleClick(node.data.storyletId)}
          />
        ))}
      </div>

      {/* Grid pattern background */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle, #64748b 1px, transparent 1px)
          `,
          backgroundSize: `${20 * scale}px ${20 * scale}px`,
          backgroundPosition: `${offset.x * scale}px ${offset.y * scale}px`
        }}
      />
    </div>
  );
};
