import React, { useCallback, useRef, useEffect, useState } from 'react';
import { VisualEditorToolbar } from './components/VisualEditorToolbar';
import { VisualEditorCanvas } from './components/VisualEditorCanvas';
import { StoryletEditorPanel } from './components/StoryletEditorPanel';
import { useCanvasControls } from './hooks/useCanvasControls';
import { useNodeManagement } from './hooks/useNodeManagement';
import { useVisualEditorStore } from '../../stores/useVisualEditorStore';
import { useNarrativeStore } from '../../stores/useNarrativeStore';

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
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [selectedStoryletId, setSelectedStoryletId] = useState<string | undefined>();
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const {
    clearEditor,
    autoLayout,
    createConnectionsFromStoryletChoices,
    saveConnectionsToStoryletChoices
  } = useVisualEditorStore();

  const { storylets, arcs, getArc, updateStorylet } = useNarrativeStore();
  
  const handleOpenStoryletPanel = useCallback((storyletId: string) => {
    setSelectedStoryletId(storyletId);
    setIsPanelOpen(true);
  }, []);

  const handleClosePanel = useCallback(() => {
    setIsPanelOpen(false);
    setSelectedStoryletId(undefined);
  }, []);
  
  // Custom hooks for functionality
  const canvasControls = useCanvasControls();
  const nodeManagement = useNodeManagement(handleOpenStoryletPanel);

  // Load arc data if editing existing arc, or show all storylets if no arc
  useEffect(() => {
    const { addNode } = useVisualEditorStore.getState();
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
        
        // Load storylet nodes
        storyletNodes.forEach(node => {
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
  }, [arcId, storylets, arcs, getArc, clearEditor, createConnectionsFromStoryletChoices]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    canvasControls.handleCanvasClick(e, canvasRef, svgRef);
  }, [canvasControls]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    canvasControls.handleCanvasMouseMove(e, canvasRef, setMousePosition);
  }, [canvasControls]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    canvasControls.handleWheel(e);
  }, [canvasControls]);

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

  return (
    <div className="h-screen flex flex-col">
      {/* Toolbar */}
      <VisualEditorToolbar
        onAddStoryletNode={nodeManagement.handleAddStoryletNode}
        onDeleteSelected={canvasControls.handleDeleteSelected}
        onSaveConnections={handleSaveConnections}
        onAutoLayout={autoLayout}
        onSave={onSave}
        onCancel={onCancel}
        arcId={arcId}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Canvas */}
        <div className={`overflow-hidden relative transition-all duration-300 ${isPanelOpen ? 'flex-[2]' : 'flex-1'}`}>
          <VisualEditorCanvas
            onNodeDoubleClick={handleOpenStoryletPanel}
            onCanvasClick={handleCanvasClick}
            onCanvasMouseMove={handleCanvasMouseMove}
            onWheel={handleWheel}
            mousePosition={mousePosition}
          />
        </div>

        {/* Storylet Editor Panel */}
        {selectedStoryletId && (
          <StoryletEditorPanel
            storyletId={selectedStoryletId}
            isOpen={isPanelOpen}
            onClose={handleClosePanel}
          />
        )}
      </div>
    </div>
  );
};