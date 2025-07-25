import React, { useCallback, useRef, useEffect, useState } from 'react';
import { VisualEditorToolbar } from './components/VisualEditorToolbar';
import { VisualEditorCanvas } from './components/VisualEditorCanvas';
import { StoryletEditorPanel } from './components/StoryletEditorPanel';
import { LoadingOverlay } from '../common/LoadingSpinner';
import { useCanvasControls } from './hooks/useCanvasControls';
import { useNodeManagement } from './hooks/useNodeManagement';
import { useVisualEditorStore } from '../../stores/useVisualEditorStore';
import { useNarrativeStore } from '../../stores/useNarrativeStore';
import { withErrorBoundary } from '../common/withErrorBoundary';
import { useAsyncOperationManager } from '../../utils/asyncManager';
import { useLoadingState } from '../../hooks/useLoadingState';

interface VisualStoryletEditorProps {
  arcId?: string;
  onSave?: () => void;
  onCancel?: () => void;
}

const VisualStoryletEditorComponent: React.FC<VisualStoryletEditorProps> = ({
  arcId,
  onSave,
  onCancel
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [selectedStoryletId, setSelectedStoryletId] = useState<string | undefined>();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [currentArcId, setCurrentArcId] = useState<string | undefined>(arcId);
  const asyncManager = useAsyncOperationManager();
  
  // Loading state management for visual editor operations
  const { 
    withLoading, 
    isLoadingOperation 
  } = useLoadingState({
    defaultMessage: 'Processing...'
  });

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
    const { addNode, createConnectionsFromStoryletChoices: createConnections, clearEditor: clearEditorAction } = useVisualEditorStore.getState();
    clearEditorAction();
    
    
    
    if (currentArcId) {
      const arc = getArc(currentArcId);
      
      if (arc) {
        // Convert storylets assigned to this arc to nodes
        const arcStorylets = storylets.filter(s => s.storyArc === currentArcId);
        
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
        withLoading(async () => {
          // Wait for DOM to be ready
          await new Promise(resolve => requestAnimationFrame(resolve));
          createConnections(arcStorylets);
        }, 'create-connections-arc', 'visual-operations', 'Creating storylet connections...').catch(error => {
          if (error.message !== 'Operation aborted' && error.message !== 'AsyncOperationManager is destroyed') {
            console.error('Failed to create arc connections:', error);
          }
        });
      } else {
        // Arc not found
        console.warn(`Arc with id ${currentArcId} not found`);
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
      withLoading(async () => {
        // Wait for DOM to be ready
        await new Promise(resolve => requestAnimationFrame(resolve));
        createConnections(storylets);
      }, 'create-connections-all', 'visual-operations', 'Creating storylet connections...').catch(error => {
        if (error.message !== 'Operation aborted' && error.message !== 'AsyncOperationManager is destroyed') {
          console.error('Failed to create all connections:', error);
        }
      });
    }
  }, [currentArcId, storylets, arcs, getArc]);

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
    await withLoading(async () => {
      await saveConnectionsToStoryletChoices(updateStorylet);
      // Connections saved successfully
      // Optionally show a success message to the user
    }, 'save-connections', 'visual-operations', 'Saving connections...');
  }, [saveConnectionsToStoryletChoices, updateStorylet, withLoading]);

  const handleArcChange = useCallback((newArcId: string) => {
    setCurrentArcId(newArcId === 'all' ? undefined : newArcId);
  }, []);

  // Handle new storylet creation from the sidebar
  useEffect(() => {
    const handleStoryletCreated = async (event: CustomEvent) => {
      const { storyletId, fromChoiceId } = event.detail;
      console.log('New storylet created from choice:', storyletId, fromChoiceId);
      
      // Wait a bit for the storylet to be added to the store
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Find the new storylet in the store
      const newStorylet = storylets.find(s => s.id === storyletId);
      if (!newStorylet) {
        console.warn('New storylet not found in store:', storyletId);
        return;
      }
      
      // Add the new storylet as a visual node
      const { addNode, nodes } = useVisualEditorStore.getState();
      
      // Try to find the originating node to position the new node relative to it
      let newX = 200 + (nodes.length % 5) * 250;
      let newY = 100 + Math.floor(nodes.length / 5) * 200;
      
      // If we can find a node that was recently edited (likely the origin), position relative to it
      const currentlyEditedNode = selectedStoryletId ? 
        nodes.find(n => n.data.storyletId === selectedStoryletId) : null;
      
      if (currentlyEditedNode) {
        // Position the new node to the right and slightly down from the originating node
        newX = currentlyEditedNode.position.x + 300;
        newY = currentlyEditedNode.position.y + 50;
      }
      
      // Avoid overlapping with existing nodes
      const existingPositions = nodes.map(n => n.position);
      while (existingPositions.some(pos => 
        Math.abs(pos.x - newX) < 220 && Math.abs(pos.y - newY) < 100
      )) {
        newX += 250;
        if (newX > 1200) { // Wrap to next row if too far right
          newX = 200;
          newY += 200;
        }
      }
      
      const newNodeData = {
        type: 'storylet' as const,
        position: { x: newX, y: newY },
        data: {
          storyletId: newStorylet.id,
          title: newStorylet.title,
          description: newStorylet.description || 'No description',
          arcName: newStorylet.storyArc ? 
            (arcs.find(a => a.id === newStorylet.storyArc)?.name || 'Unknown Arc') : 
            'No Arc'
        }
      };
      
      addNode(newNodeData);
      
      // Refresh connections to show the new link immediately
      setTimeout(() => {
        const { createConnectionsFromStoryletChoices } = useVisualEditorStore.getState();
        const { storylets: currentStorylets } = useNarrativeStore.getState();
        createConnectionsFromStoryletChoices(currentStorylets);
      }, 300);
    };

    window.addEventListener('storyletCreated', handleStoryletCreated as any);
    return () => {
      window.removeEventListener('storyletCreated', handleStoryletCreated as any);
    };
  }, [storylets, arcs]);

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
        currentArcId={currentArcId}
        onArcChange={handleArcChange}
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
          
          {/* Loading overlay for visual operations */}
          {(isLoadingOperation('create-connections-arc') || 
            isLoadingOperation('create-connections-all') ||
            isLoadingOperation('save-connections')) && (
            <LoadingOverlay 
              size="lg" 
              message={isLoadingOperation('save-connections') 
                ? 'Saving connections...' 
                : 'Creating storylet connections...'
              } 
            />
          )}
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

export const VisualStoryletEditor = withErrorBoundary(VisualStoryletEditorComponent, {
  fallback: (
    <div className="h-screen flex items-center justify-center bg-base-200">
      <div className="card bg-base-100 shadow-xl p-8">
        <h3 className="text-lg font-semibold text-error mb-2">Visual Editor Error</h3>
        <p className="text-base-content/70">
          The visual editor encountered an error. Please refresh the page to try again.
        </p>
      </div>
    </div>
  )
});