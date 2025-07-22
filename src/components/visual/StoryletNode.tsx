import React, { useCallback, useRef } from 'react';
import { type StoryletNode as StoryletNodeType, type Position } from '../../types/visual';
import { useVisualEditorStore } from '../../stores/useVisualEditorStore';

interface StoryletNodeProps {
  node: StoryletNodeType;
  scale: number;
}

export const StoryletNode: React.FC<StoryletNodeProps> = ({ node, scale }) => {
  const {
    selectedNode,
    connecting,
    selectNode,
    moveNode,
    startConnecting,
    finishConnecting,
    cancelConnecting
  } = useVisualEditorStore();

  const nodeRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ mouse: Position; nodePosition: Position } | null>(null);

  const isSelected = selectedNode === node.id;
  const isConnecting = connecting?.fromNodeId === node.id;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (connecting) {
      // Finish connection if in connecting mode
      finishConnecting(node.id, 'input');
      return;
    }

    selectNode(node.id);

    // Start dragging
    dragStart.current = {
      mouse: { x: e.clientX, y: e.clientY },
      nodePosition: { ...node.position }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStart.current) return;

      const deltaX = (e.clientX - dragStart.current.mouse.x) / scale;
      const deltaY = (e.clientY - dragStart.current.mouse.y) / scale;

      moveNode(node.id, {
        x: dragStart.current.nodePosition.x + deltaX,
        y: dragStart.current.nodePosition.y + deltaY
      });
    };

    const handleMouseUp = () => {
      dragStart.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [node, scale, connecting, selectNode, moveNode, finishConnecting]);

  const handleOutputClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (connecting) {
      cancelConnecting();
    } else {
      startConnecting(node.id, 'output');
    }
  }, [node.id, connecting, startConnecting, cancelConnecting]);

  const getNodeStyle = () => {
    const baseClasses = 'absolute cursor-pointer transition-all duration-200 border-2 rounded-lg shadow-lg';
    
    const typeStyles = {
      start: 'bg-success text-success-content border-success',
      storylet: 'bg-primary text-primary-content border-primary',
      end: 'bg-error text-error-content border-error',
      choice: 'bg-warning text-warning-content border-warning',
      condition: 'bg-info text-info-content border-info'
    };

    const selectedClass = isSelected ? 'ring-4 ring-accent ring-opacity-50' : '';
    const connectingClass = isConnecting ? 'ring-4 ring-secondary ring-opacity-50' : '';

    return `${baseClasses} ${typeStyles[node.type]} ${selectedClass} ${connectingClass}`;
  };

  return (
    <div
      ref={nodeRef}
      className={getNodeStyle()}
      style={{
        left: node.position.x,
        top: node.position.y,
        width: '200px',
        minHeight: '80px',
        zIndex: isSelected ? 10 : 1
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Input Handle */}
      {node.type !== 'start' && (
        <div
          className="absolute w-3 h-3 bg-base-content rounded-full border-2 border-base-100"
          style={{ left: '-6px', top: '50%', transform: 'translateY(-50%)' }}
        />
      )}

      {/* Node Content */}
      <div className="p-3 h-full flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <span className="badge badge-sm text-xs opacity-75">
            {node.type}
          </span>
        </div>
        
        <h3 className="font-semibold text-sm mb-1 line-clamp-2">
          {node.data.title}
        </h3>
        
        {node.data.description && (
          <p className="text-xs opacity-80 line-clamp-2 flex-1">
            {node.data.description}
          </p>
        )}

        {node.data.storyletId && (
          <div className="text-xs opacity-60 mt-1">
            ID: {node.data.storyletId.slice(0, 8)}...
          </div>
        )}
      </div>

      {/* Output Handle */}
      {node.type !== 'end' && (
        <div
          className="absolute w-3 h-3 bg-base-content rounded-full border-2 border-base-100 cursor-pointer hover:scale-110 transition-transform"
          style={{ right: '-6px', top: '50%', transform: 'translateY(-50%)' }}
          onClick={handleOutputClick}
        />
      )}

      {/* Connection Line Preview */}
      {connecting && (
        <div className="absolute inset-0 pointer-events-none">
          {/* This will be handled by the main editor for drawing the connection line */}
        </div>
      )}
    </div>
  );
};