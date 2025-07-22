import React, { useCallback, useRef, useEffect } from 'react';
import { Card } from '../common/Card';
import { StoryletNode } from './StoryletNode';
import { NodeConnection } from './NodeConnection';
import { useVisualEditorStore } from '../../stores/useVisualEditorStore';
import { useNarrativeStore } from '../../stores/useNarrativeStore';
import { useCharacterStore } from '../../stores/useCharacterStore';
import { useClueStore } from '../../stores/useClueStore';
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
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });
  const [selectedStoryletId, setSelectedStoryletId] = React.useState<string | undefined>();
  const [isPanelOpen, setIsPanelOpen] = React.useState(false);

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
    getNodeById,
    createConnectionsFromStoryletChoices,
    saveConnectionsToStoryletChoices
  } = useVisualEditorStore();

  const { storylets, arcs, getArc, updateStorylet } = useNarrativeStore();
  const { characters } = useCharacterStore();
  const { clues } = useClueStore();

  // Load arc data if editing existing arc, or show all storylets if no arc
  useEffect(() => {
    clearEditor();
    
    if (arcId) {
      const arc = getArc(arcId);
      
      if (arc) {
        // Convert storylets assigned to this arc to nodes
        const arcStorylets = storylets.filter(s => s.storyArc === arcId);
        
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

        // Create connections based on storylet choices after nodes are loaded
        setTimeout(() => {
          createConnectionsFromStoryletChoices(arcStorylets);
        }, 100);
      } else {
        // Arc not found
      }
    } else {
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
      
      
      allStoryletNodes.forEach(node => {
        addNode(node);
      });

      // Create connections based on storylet choices for all storylets
      setTimeout(() => {
        createConnectionsFromStoryletChoices(storylets);
      }, 100);
    }
  }, [arcId, storylets, arcs, getArc, addNode, clearEditor, createConnectionsFromStoryletChoices]);

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

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (connecting && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale - offset.x;
      const y = (e.clientY - rect.top) / scale - offset.y;
      setMousePosition({ x, y });
    }
  }, [connecting, scale, offset]);

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

  const handleSaveConnections = useCallback(async () => {
    try {
      await saveConnectionsToStoryletChoices(updateStorylet);
      // Connections saved successfully
      // Optionally show a success message to the user
    } catch (error) {
      console.error('Failed to save connections:', error);
      // Optionally show an error message to the user
    }
  }, [saveConnectionsToStoryletChoices, updateStorylet]);

  const handleOpenStoryletPanel = useCallback((storyletId: string) => {
    setSelectedStoryletId(storyletId);
    setIsPanelOpen(true);
  }, []);

  const handleClosePanel = useCallback(() => {
    setIsPanelOpen(false);
    setSelectedStoryletId(undefined);
  }, []);

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

  // Handle automatic choice creation when connections are made
  useEffect(() => {
    const handleConnectionCreated = async (event: CustomEvent) => {
      const { connection, nodes } = event.detail;
      
      // Find the source and target storylet IDs
      const fromNode = nodes.find((node: any) => node.id === connection.fromNodeId);
      const toNode = nodes.find((node: any) => node.id === connection.toNodeId);
      
      if (!fromNode?.data.storyletId || !toNode?.data.storyletId) return;
      
      try {
        // Get the current storylet to preserve existing choices
        const currentStorylet = storylets.find(s => s.id === fromNode.data.storyletId);
        if (!currentStorylet) return;
        
        // Create a new choice for this connection
        const newChoice = {
          id: connection.id,
          text: connection.label || 'Continue',
          description: `Go to ${toNode.data.title}`,
          effects: [],
          requirements: [],
          probability: 100,
          unlocked: true,
          nextStoryletId: toNode.data.storyletId,
          createNewStorylet: false
        };
        
        // Add the new choice to existing choices (avoid duplicates)
        const existingChoices = currentStorylet.choices || [];
        const choiceExists = existingChoices.some(choice => 
          choice.nextStoryletId === toNode.data.storyletId
        );
        
        if (!choiceExists) {
          const updatedChoices = [...existingChoices, newChoice];
          await updateStorylet(fromNode.data.storyletId, {
            choices: updatedChoices
          });
          // Choice created successfully
        }
      } catch (error) {
        console.error('Failed to create storylet choice:', error);
      }
    };

    window.addEventListener('connectionCreated', handleConnectionCreated as any);
    return () => {
      window.removeEventListener('connectionCreated', handleConnectionCreated as any);
    };
  }, [storylets, updateStorylet]);

  // Get the selected storylet data
  const selectedStorylet = selectedStoryletId ? storylets.find(s => s.id === selectedStoryletId) : undefined;

  return (
    <div className="h-screen flex flex-col">
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
              onClick={() => createConnectionsFromStoryletChoices(arcId ? storylets.filter(s => s.storyArc === arcId) : storylets)}
              className="btn btn-secondary btn-sm"
              disabled={nodes.length === 0}
            >
              Update Links
            </button>
            <button
              onClick={handleSaveConnections}
              className="btn btn-accent btn-sm"
              disabled={connections.length === 0}
              title="Sync all visual connections to storylet choices"
            >
              Sync All Links
            </button>
            <button
              onClick={async () => {
                // Creating test data
                const { addStoryArc, addStorylet } = useNarrativeStore.getState();
                
                // Create a test arc
                const testArcId = await addStoryArc({
                  name: 'Test Arc',
                  description: 'A test arc for debugging',
                  category: 'main',
                  difficulty: 'beginner',
                  estimatedLength: 10,
                  prerequisites: [],
                  tags: ['test']
                });
                
                // Create test storylets
                await addStorylet({
                  title: 'Test Storylet 1',
                  description: 'First test storylet',
                  content: 'This is the first test storylet content',
                  storyArc: testArcId,
                  triggers: [],
                  choices: [{
                    id: crypto.randomUUID(),
                    text: 'Go to storylet 2',
                    description: '',
                    effects: [],
                    requirements: [],
                    probability: 100,
                    unlocked: true,
                    nextStoryletId: undefined,
                    createNewStorylet: true
                  }],
                  effects: [],
                  status: 'dev' as const,
                  tags: ['test'],
                  priority: 1,
                  estimatedPlayTime: 5,
                  prerequisites: []
                });
                
                await addStorylet({
                  title: 'Test Storylet 2', 
                  description: 'Second test storylet',
                  content: 'This is the second test storylet content',
                  storyArc: testArcId,
                  triggers: [],
                  choices: [],
                  effects: [],
                  status: 'dev' as const,
                  tags: ['test'],
                  priority: 1,
                  estimatedPlayTime: 5,
                  prerequisites: []
                });
                
                // Test data created
              }}
              className="btn btn-success btn-sm"
            >
              Create Test Data
            </button>
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

      {/* Main Content Area */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Canvas */}
        <Card className={`p-0 overflow-hidden relative transition-all duration-300 ${isPanelOpen ? 'flex-[2]' : 'flex-1'}`}>
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
              onDoubleClick={node.data.storyletId ? () => handleOpenStoryletPanel(node.data.storyletId!) : undefined}
            />
          ))}

          {/* Connections */}
          <svg
            ref={svgRef}
            className="absolute inset-0 pointer-events-none"
            style={{ width: '200%', height: '200%', zIndex: 0 }}
            onMouseMove={handleCanvasMouseMove}
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
            
            {/* Connection Preview Line */}
            {connecting && (() => {
              const fromNode = getNodeById(connecting.fromNodeId);
              if (!fromNode) return null;
              
              const fromX = fromNode.position.x + 200; // node width + handle offset
              const fromY = fromNode.position.y + 40; // node height / 2
              
              return (
                <line
                  x1={fromX}
                  y1={fromY}
                  x2={mousePosition.x}
                  y2={mousePosition.y}
                  stroke="hsl(var(--s))"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  opacity="0.7"
                  markerEnd="url(#arrowhead-preview)"
                />
              );
            })()}
            
            {/* Arrow marker for preview */}
            <defs>
              <marker
                id="arrowhead-preview"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="hsl(var(--s))"
                  opacity="0.7"
                />
              </marker>
            </defs>
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

      {/* Right Panel for Storylet Editing */}
      {isPanelOpen && selectedStorylet && (
        <Card className="flex-[1] min-w-[400px] max-w-[500px] overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="text-lg font-semibold">Edit Storylet</h3>
              <button
                onClick={handleClosePanel}
                className="btn btn-ghost btn-sm btn-circle"
                title="Close panel"
              >
                ✕
              </button>
            </div>

            {/* Storylet Details */}
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="label">
                  <span className="label-text font-medium">Title</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={selectedStorylet.title}
                  onChange={(e) => {
                    updateStorylet(selectedStorylet.id!, { title: e.target.value });
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <label className="label">
                  <span className="label-text font-medium">Description</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full h-20"
                  value={selectedStorylet.description || ''}
                  onChange={(e) => {
                    updateStorylet(selectedStorylet.id!, { description: e.target.value });
                  }}
                />
              </div>

              {/* Content */}
              <div>
                <label className="label">
                  <span className="label-text font-medium">Content</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full h-32"
                  value={selectedStorylet.content}
                  onChange={(e) => {
                    updateStorylet(selectedStorylet.id!, { content: e.target.value });
                  }}
                />
              </div>

              {/* Status */}
              <div>
                <label className="label">
                  <span className="label-text font-medium">Status</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={selectedStorylet.status}
                  onChange={(e) => {
                    updateStorylet(selectedStorylet.id!, { status: e.target.value as 'dev' | 'stage' | 'live' });
                  }}
                >
                  <option value="dev">Development</option>
                  <option value="stage">Staging</option>
                  <option value="live">Live</option>
                </select>
              </div>

              {/* Choices */}
              <div>
                <label className="label">
                  <span className="label-text font-medium">Choices ({selectedStorylet.choices?.length || 0})</span>
                </label>
                <div className="space-y-3">
                  {selectedStorylet.choices?.map((choice, choiceIndex) => (
                    <div key={choice.id} className="border border-base-300 rounded-lg">
                      {/* Choice Header */}
                      <div className="p-3 bg-base-200">
                        <div className="flex items-center justify-between mb-2">
                          <input
                            type="text"
                            className="input input-sm input-ghost flex-1 mr-2 font-medium"
                            value={choice.text}
                            onChange={(e) => {
                              const updatedChoices = [...(selectedStorylet.choices || [])];
                              updatedChoices[choiceIndex] = { ...choice, text: e.target.value };
                              updateStorylet(selectedStorylet.id!, { choices: updatedChoices });
                            }}
                          />
                          <span className="badge badge-sm">
                            {choice.nextStoryletId ? 'Linked' : 'No Link'}
                          </span>
                        </div>
                        <textarea
                          className="textarea textarea-sm textarea-ghost w-full resize-none"
                          rows={1}
                          value={choice.description || ''}
                          onChange={(e) => {
                            const updatedChoices = [...(selectedStorylet.choices || [])];
                            updatedChoices[choiceIndex] = { ...choice, description: e.target.value };
                            updateStorylet(selectedStorylet.id!, { choices: updatedChoices });
                          }}
                          placeholder="Choice description..."
                        />
                      </div>

                      {/* Effects Section */}
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Effects ({choice.effects?.length || 0})</span>
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => {
                              const newEffect = {
                                id: crypto.randomUUID(),
                                type: 'resource' as const,
                                target: '',
                                value: 1,
                                operator: '+' as const,
                                description: 'New effect'
                              };
                              const updatedChoices = [...(selectedStorylet.choices || [])];
                              updatedChoices[choiceIndex] = {
                                ...choice,
                                effects: [...(choice.effects || []), newEffect]
                              };
                              updateStorylet(selectedStorylet.id!, { choices: updatedChoices });
                            }}
                          >
                            + Add Effect
                          </button>
                        </div>

                        <div className="space-y-2">
                          {choice.effects?.map((effect: any, effectIndex: number) => (
                            <div key={effect.id} className="bg-base-100 p-2 rounded border-l-4 border-l-accent">
                              <div className="grid grid-cols-2 gap-2 mb-2">
                                {/* Effect Type */}
                                <select
                                  className="select select-xs select-bordered"
                                  value={effect.type}
                                  onChange={(e) => {
                                    const updatedChoices = [...(selectedStorylet.choices || [])];
                                    const updatedEffects = [...(choice.effects || [])];
                                    updatedEffects[effectIndex] = {
                                      ...effect,
                                      type: e.target.value as typeof effect.type
                                    };
                                    updatedChoices[choiceIndex] = { ...choice, effects: updatedEffects };
                                    updateStorylet(selectedStorylet.id!, { choices: updatedChoices });
                                  }}
                                >
                                  <option value="resource">Resource</option>
                                  <option value="relationship">Relationship</option>
                                  <option value="clue_discovery">Clue Discovery</option>
                                  <option value="storylet_unlock">Storylet Unlock</option>
                                  <option value="arc_progress">Arc Progress</option>
                                  <option value="time_advance">Time Advance</option>
                                </select>

                                {/* Target */}
                                <div className="relative">
                                  <input
                                    type="text"
                                    className="input input-xs input-bordered w-full"
                                    placeholder={effect.type === 'relationship' ? 'Character ID' : 
                                               effect.type === 'clue_discovery' ? 'Clue ID' : 'Target'}
                                    value={effect.target}
                                    onChange={(e) => {
                                      const updatedChoices = [...(selectedStorylet.choices || [])];
                                      const updatedEffects = [...(choice.effects || [])];
                                      updatedEffects[effectIndex] = { ...effect, target: e.target.value };
                                      updatedChoices[choiceIndex] = { ...choice, effects: updatedEffects };
                                      updateStorylet(selectedStorylet.id!, { choices: updatedChoices });
                                    }}
                                    list={`${effect.type}-targets-${effectIndex}`}
                                  />
                                  <datalist id={`${effect.type}-targets-${effectIndex}`}>
                                    {effect.type === 'relationship' && characters.map(char => (
                                      <option key={char.id} value={char.id}>
                                        {char.displayName || char.name}
                                      </option>
                                    ))}
                                    {effect.type === 'clue_discovery' && clues.map(clue => (
                                      <option key={clue.id} value={clue.id}>
                                        {clue.title}
                                      </option>
                                    ))}
                                    {effect.type === 'storylet_unlock' && storylets.map(s => (
                                      <option key={s.id} value={s.id}>
                                        {s.title}
                                      </option>
                                    ))}
                                    {effect.type === 'resource' && (
                                      <>
                                        <option value="money">Money</option>
                                        <option value="energy">Energy</option>
                                        <option value="knowledge">Knowledge</option>
                                        <option value="social">Social</option>
                                        <option value="health">Health</option>
                                        <option value="reputation">Reputation</option>
                                      </>
                                    )}
                                  </datalist>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-2 mb-2">
                                {/* Operator */}
                                <select
                                  className="select select-xs select-bordered"
                                  value={effect.operator || '+'}
                                  onChange={(e) => {
                                    const updatedChoices = [...(selectedStorylet.choices || [])];
                                    const updatedEffects = [...(choice.effects || [])];
                                    updatedEffects[effectIndex] = {
                                      ...effect,
                                      operator: e.target.value as typeof effect.operator
                                    };
                                    updatedChoices[choiceIndex] = { ...choice, effects: updatedEffects };
                                    updateStorylet(selectedStorylet.id!, { choices: updatedChoices });
                                  }}
                                >
                                  <option value="+">Add (+)</option>
                                  <option value="-">Subtract (-)</option>
                                  <option value="=">Set (=)</option>
                                  <option value="*">Multiply (*)</option>
                                </select>

                                {/* Value */}
                                <input
                                  type="number"
                                  className="input input-xs input-bordered"
                                  placeholder="Value"
                                  value={effect.value || ''}
                                  onChange={(e) => {
                                    const updatedChoices = [...(selectedStorylet.choices || [])];
                                    const updatedEffects = [...(choice.effects || [])];
                                    updatedEffects[effectIndex] = {
                                      ...effect,
                                      value: e.target.value ? parseInt(e.target.value) : undefined
                                    };
                                    updatedChoices[choiceIndex] = { ...choice, effects: updatedEffects };
                                    updateStorylet(selectedStorylet.id!, { choices: updatedChoices });
                                  }}
                                />

                                {/* Delete Effect */}
                                <button
                                  className="btn btn-error btn-xs"
                                  onClick={() => {
                                    const updatedChoices = [...(selectedStorylet.choices || [])];
                                    const updatedEffects = (choice.effects || []).filter((_: any, i: number) => i !== effectIndex);
                                    updatedChoices[choiceIndex] = { ...choice, effects: updatedEffects };
                                    updateStorylet(selectedStorylet.id!, { choices: updatedChoices });
                                  }}
                                  title="Delete effect"
                                >
                                  ×
                                </button>
                              </div>

                              {/* Description */}
                              <input
                                type="text"
                                className="input input-xs input-bordered w-full"
                                placeholder="Effect description"
                                value={effect.description}
                                onChange={(e) => {
                                  const updatedChoices = [...(selectedStorylet.choices || [])];
                                  const updatedEffects = [...(choice.effects || [])];
                                  updatedEffects[effectIndex] = { ...effect, description: e.target.value };
                                  updatedChoices[choiceIndex] = { ...choice, effects: updatedEffects };
                                  updateStorylet(selectedStorylet.id!, { choices: updatedChoices });
                                }}
                              />

                              {/* Effect Preview */}
                              <div className="mt-1 text-xs opacity-60">
                                {effect.type === 'relationship' && effect.target && (
                                  <span>
                                    Affects: {characters.find(c => c.id === effect.target)?.displayName || 
                                             characters.find(c => c.id === effect.target)?.name || 
                                             effect.target}
                                  </span>
                                )}
                                {effect.type === 'clue_discovery' && effect.target && (
                                  <span>
                                    Discovers: {clues.find(c => c.id === effect.target)?.title || effect.target}
                                  </span>
                                )}
                                {effect.type === 'storylet_unlock' && effect.target && (
                                  <span>
                                    Unlocks: {storylets.find(s => s.id === effect.target)?.title || effect.target}
                                  </span>
                                )}
                                {effect.type === 'resource' && (
                                  <span>
                                    {effect.operator || '+'}{effect.value || 0} {effect.target}
                                  </span>
                                )}
                              </div>
                            </div>
                          )) || (
                            <p className="text-xs opacity-60 text-center py-2">No effects defined</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )) || (
                    <p className="text-sm opacity-60 text-center py-4">No choices defined</p>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="label">
                  <span className="label-text font-medium">Tags</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={selectedStorylet.tags?.join(', ') || ''}
                  onChange={(e) => {
                    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag);
                    updateStorylet(selectedStorylet.id!, { tags });
                  }}
                  placeholder="Enter tags separated by commas"
                />
              </div>

              {/* Quick Stats */}
              <div className="bg-base-200 p-3 rounded-lg">
                <h4 className="font-medium mb-2">Quick Info</h4>
                <div className="text-sm space-y-1">
                  <div>ID: <span className="font-mono text-xs">{selectedStorylet.id?.slice(0, 8)}...</span></div>
                  <div>Priority: {selectedStorylet.priority || 1}</div>
                  <div>Play Time: {selectedStorylet.estimatedPlayTime || 5} min</div>
                  <div>Created: {selectedStorylet.createdAt ? new Date(selectedStorylet.createdAt).toLocaleDateString() : 'Unknown'}</div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
    </div>
  );
};