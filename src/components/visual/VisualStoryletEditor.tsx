import React, { useCallback, useRef, useEffect } from 'react';
import { Card } from '../common/Card';
import { StoryletNode } from './StoryletNode';
import { NodeConnection } from './NodeConnection';
import { useVisualEditorStore } from '../../stores/useVisualEditorStore';
import { useNarrativeStore } from '../../stores/useNarrativeStore';
// Position type used in component

interface VisualStoryletEditorProps {
  arcId?: string;
  onSave?: () => void;
  onCancel?: () => void;
}

export const VisualStoryletEditor: React.FC<VisualStoryletEditorProps> = ({
  arcId,
  onSave,
  onCancel
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const {
    nodes,
    connections,
    scale,
    offset,
    mode,
    connecting,
    selectedNode,
    selectedConnection,
    addNode,
    removeNode,
    selectNode,
    selectConnection,
    setScale,
    // setOffset,
    cancelConnecting,
    clearEditor,
    autoLayout,
    getNodeById
  } = useVisualEditorStore();

  const { storylets, arcs, getArc } = useNarrativeStore();

  // Load arc data if editing existing arc, or show all storylets if no arc
  useEffect(() => {
    clearEditor();
    
    if (arcId) {
      const arc = getArc(arcId);
      if (arc) {
        console.log('Loading arc:', arc.name, 'with ID:', arcId);
        // Convert storylets assigned to this arc to nodes
        const arcStorylets = storylets.filter(s => s.storyArc === arcId);
        console.log('Found storylets for arc:', arcStorylets.length);
        
        const storyletNodes = arcStorylets.map((storylet, index) => ({
          id: crypto.randomUUID(),
          type: 'storylet' as const,
          position: {
            x: 300 + (index % 4) * 250,
            y: 150 + Math.floor(index / 4) * 200
          },
          data: {
            storyletId: storylet.id,
            title: storylet.title,
            description: storylet.description
          }
        }));
        
        // Add start and end nodes
        const startNode = {
          id: crypto.randomUUID(),
          type: 'start' as const,
          position: { x: 50, y: 200 },
          data: { title: `${arc.name} - Start`, isEntry: true }
        };
        
        const endNode = {
          id: crypto.randomUUID(),
          type: 'end' as const,
          position: { x: 800, y: 200 },
          data: { title: `${arc.name} - End`, isExit: true }
        };

        // Load all nodes
        [startNode, ...storyletNodes, endNode].forEach(node => {
          addNode(node);
        });
      } else {
        console.warn('Arc not found with ID:', arcId);
      }
    } else {
      console.log('No arc selected, showing all storylets');
      // Show all storylets when no specific arc is being edited
      const allStoryletNodes = storylets.map((storylet, index) => ({
        id: crypto.randomUUID(),
        type: 'storylet' as const,
        position: {
          x: 200 + (index % 5) * 250,
          y: 100 + Math.floor(index / 5) * 200
        },
        data: {
          storyletId: storylet.id,
          title: storylet.title,
          description: storylet.description || 'No description',
          arcName: storylet.storyArc ? 
            (arcs.find(a => a.id === storylet.storyArc)?.name || 'Unknown Arc') : 
            'No Arc'
        }
      }));
      
      console.log('Loading all storylets:', allStoryletNodes.length);
      
      allStoryletNodes.forEach(node => {
        addNode(node);
      });
    }
  }, [arcId, storylets, arcs, getArc, addNode, clearEditor]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current || e.target === svgRef.current) {
      if (connecting) {
        cancelConnecting();
      } else {
        selectNode(undefined);
        selectConnection(undefined);
      }
    }
  }, [connecting, cancelConnecting, selectNode, selectConnection]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(scale * delta);
  }, [scale, setScale]);

  const handleAddStoryletNode = useCallback(() => {
    addNode({
      type: 'storylet',
      position: {
        x: 200 + Math.random() * 400,
        y: 100 + Math.random() * 300
      },
      data: {
        title: 'New Storylet',
        description: 'Click to edit'
      }
    });
  }, [addNode]);

  const handleAddStartNode = useCallback(() => {
    addNode({
      type: 'start',
      position: {
        x: 50 + Math.random() * 100,
        y: 100 + Math.random() * 200
      },
      data: {
        title: 'Entry Point',
        isEntry: true
      }
    });
  }, [addNode]);

  const handleAddEndNode = useCallback(() => {
    addNode({
      type: 'end',
      position: {
        x: 600 + Math.random() * 100,
        y: 100 + Math.random() * 200
      },
      data: {
        title: 'Exit Point',
        isExit: true
      }
    });
  }, [addNode]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedNode) {
      const node = getNodeById(selectedNode);
      if (node && window.confirm(`Delete node "${node.data.title}"?`)) {
        removeNode(selectedNode);
      }
    }
  }, [selectedNode, removeNode, getNodeById]);

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      handleDeleteSelected();
    } else if (e.key === 'Escape') {
      if (connecting) {
        cancelConnecting();
      } else {
        selectNode(undefined);
        selectConnection(undefined);
      }
    }
  }, [handleDeleteSelected, connecting, cancelConnecting, selectNode, selectConnection]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <Card className="mb-4 p-4">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex gap-2">
            <button
              onClick={handleAddStartNode}
              className="btn btn-success btn-sm"
            >
              + Start
            </button>
            <button
              onClick={handleAddStoryletNode}
              className="btn btn-primary btn-sm"
            >
              + Storylet
            </button>
            <button
              onClick={handleAddEndNode}
              className="btn btn-error btn-sm"
            >
              + End
            </button>
          </div>
          
          <div className="divider divider-horizontal" />
          
          <div className="flex gap-2">
            {!arcId && (
              <button
                onClick={() => window.location.reload()}
                className="btn btn-info btn-sm"
              >
                Reload Storylets
              </button>
            )}
            <button
              onClick={autoLayout}
              className="btn btn-ghost btn-sm"
            >
              Auto Layout
            </button>
            <button
              onClick={clearEditor}
              className="btn btn-warning btn-sm"
              disabled={nodes.length === 0}
            >
              Clear All
            </button>
          </div>
          
          <div className="divider divider-horizontal" />
          
          <div className="flex items-center gap-2">
            <span className="text-sm opacity-70">Scale:</span>
            <span className="text-sm font-mono">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale(1)}
              className="btn btn-ghost btn-xs"
            >
              Reset
            </button>
          </div>
          
          <div className="divider divider-horizontal" />
          
          <div className="text-sm opacity-70">
            Mode: <span className="font-semibold capitalize">{mode}</span>
            {connecting && <span className="ml-2 text-accent">Connecting...</span>}
          </div>
          
          <div className="ml-auto flex gap-2">
            {onCancel && (
              <button onClick={onCancel} className="btn btn-ghost btn-sm">
                Cancel
              </button>
            )}
            {onSave && (
              <button onClick={onSave} className="btn btn-primary btn-sm">
                Save Arc
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Canvas */}
      <Card className="flex-1 p-0 overflow-hidden relative">
        <div
          ref={canvasRef}
          className="w-full h-full relative bg-base-200 cursor-grab active:cursor-grabbing"
          style={{
            transform: `scale(${scale}) translate(${offset.x}px, ${offset.y}px)`,
            transformOrigin: '0 0'
          }}
          onClick={handleCanvasClick}
          onWheel={handleWheel}
        >
          {/* Grid Background */}
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: '200%', height: '200%' }}
          >
            <defs>
              <pattern
                id="grid"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 20 0 L 0 0 0 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  className="opacity-20"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Nodes */}
          {nodes.map((node) => (
            <StoryletNode
              key={node.id}
              node={node}
              scale={scale}
            />
          ))}

          {/* Connections */}
          <svg
            ref={svgRef}
            className="absolute inset-0 pointer-events-none"
            style={{ width: '200%', height: '200%', zIndex: 0 }}
          >
            {connections.map((connection) => {
              const fromNode = getNodeById(connection.fromNodeId);
              const toNode = getNodeById(connection.toNodeId);
              
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
          </svg>
        </div>

        {/* Status Info */}
        <div className="absolute bottom-4 left-4 bg-base-100 p-2 rounded shadow text-sm opacity-80">
          <div>Nodes: {nodes.length}</div>
          <div>Connections: {connections.length}</div>
          {selectedNode && <div>Selected: Node</div>}
          {selectedConnection && <div>Selected: Connection</div>}
        </div>

        {/* Instructions */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-base-content/60">
              <h3 className="text-lg font-semibold mb-2">Visual Storylet Editor</h3>
              <p className="mb-2">Start by adding nodes using the toolbar above</p>
              <p className="text-sm">
                • Drag nodes to move them<br/>
                • Click output handles to create connections<br/>
                • Double-click connections to delete them
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};