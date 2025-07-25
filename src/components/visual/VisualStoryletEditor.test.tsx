/**
 * Comprehensive tests for VisualStoryletEditor
 * Tests visual editor connection logic, node management, and arc integration
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VisualStoryletEditor } from './VisualStoryletEditor';
import { useVisualEditorStore } from '../../stores/useVisualEditorStore';
import { useNarrativeStore } from '../../stores/useNarrativeStore';
import * as AsyncManager from '../../utils/asyncManager';

// Mock the stores with proper Zustand structure
vi.mock('../../stores/useVisualEditorStore', () => {
  const mockStoreState = {
    addNode: vi.fn(),
    clearEditor: vi.fn(),
    autoLayout: vi.fn(),
    createConnectionsFromStoryletChoices: vi.fn(),
    saveConnectionsToStoryletChoices: vi.fn(),
    removeNode: vi.fn(),
    moveNode: vi.fn(),
    addConnection: vi.fn(),
    removeConnection: vi.fn(),
    selectNode: vi.fn(),
    selectConnection: vi.fn(),
    setMode: vi.fn(),
    setScale: vi.fn(),
    setOffset: vi.fn(),
    startConnecting: vi.fn(),
    finishConnecting: vi.fn(),
    cancelConnecting: vi.fn(),
    loadArc: vi.fn(),
    getNodeById: vi.fn(),
    getConnectionById: vi.fn(),
    getConnectedNodes: vi.fn(),
    validateConnection: vi.fn(),
    updateNode: vi.fn(),
    nodes: [],
    connections: [],
    selectedNode: undefined,
    selectedConnection: undefined,
    mode: 'select',
    scale: 1,
    offset: { x: 0, y: 0 },
    connecting: undefined
  };

  const mockStore = vi.fn(() => mockStoreState);
  // Add getState method to the store function
  mockStore.getState = vi.fn(() => mockStoreState);
  
  return {
    useVisualEditorStore: mockStore
  };
});

vi.mock('../../stores/useNarrativeStore');
vi.mock('../../utils/asyncManager');

// Mock the sub-components
vi.mock('./components/VisualEditorToolbar', () => ({
  VisualEditorToolbar: ({ onAddStoryletNode, onDeleteSelected, onSaveConnections, onAutoLayout, onSave, onCancel }: any) => (
    <div data-testid="visual-editor-toolbar">
      <button onClick={onAddStoryletNode} data-testid="add-storylet-btn">Add Storylet</button>
      <button onClick={onDeleteSelected} data-testid="delete-selected-btn">Delete Selected</button>
      <button onClick={onSaveConnections} data-testid="save-connections-btn">Save Connections</button>
      <button onClick={onAutoLayout} data-testid="auto-layout-btn">Auto Layout</button>
      <button onClick={onSave} data-testid="save-btn">Save</button>
      <button onClick={onCancel} data-testid="cancel-btn">Cancel</button>
    </div>
  )
}));

vi.mock('./components/VisualEditorCanvas', () => ({
  VisualEditorCanvas: ({ onNodeDoubleClick, onCanvasClick, onCanvasMouseMove, onWheel, mousePosition }: any) => (
    <div 
      data-testid="visual-editor-canvas"
      onClick={onCanvasClick}
      onMouseMove={onCanvasMouseMove}
      onWheel={onWheel}
      onDoubleClick={() => onNodeDoubleClick('test-storylet-1')}
    >
      Canvas - Mouse: {mousePosition.x}, {mousePosition.y}
    </div>
  )
}));

vi.mock('./components/StoryletEditorPanel', () => ({
  StoryletEditorPanel: ({ storyletId, isOpen, onClose }: any) => (
    isOpen ? (
      <div data-testid="storylet-editor-panel">
        Panel for: {storyletId}
        <button onClick={onClose} data-testid="close-panel-btn">Close</button>
      </div>
    ) : null
  )
}));

vi.mock('./hooks/useCanvasControls', () => ({
  useCanvasControls: () => ({
    handleCanvasClick: vi.fn(),
    handleCanvasMouseMove: vi.fn(),
    handleWheel: vi.fn(),
    handleDeleteSelected: vi.fn()
  })
}));

vi.mock('./hooks/useNodeManagement', () => ({
  useNodeManagement: (handleOpenStoryletPanel: any) => ({
    handleAddStoryletNode: vi.fn(),
    openStoryletPanel: handleOpenStoryletPanel
  })
}));

vi.mock('../common/withErrorBoundary', () => ({
  withErrorBoundary: (Component: any) => Component
}));

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: vi.fn().mockReturnValue('test-uuid-123')
});

describe('VisualStoryletEditor', () => {

  const mockNarrativeStore = {
    storylets: [
      {
        id: 'storylet-1',
        title: 'Test Storylet 1',
        description: 'First test storylet',
        content: 'Content 1',
        storyArc: 'arc-1',
        triggers: [],
        choices: [
          {
            id: 'choice-1',
            text: 'Go to storylet 2',
            nextStoryletId: 'storylet-2',
            effects: [],
            requirements: [],
            probability: 100,
            unlocked: true,
            createNewStorylet: false
          }
        ],
        effects: [],
        status: 'dev',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'storylet-2',
        title: 'Test Storylet 2',
        description: 'Second test storylet',
        content: 'Content 2',
        storyArc: 'arc-1',
        triggers: [],
        choices: [],
        effects: [],
        status: 'dev',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'storylet-3',
        title: 'Test Storylet 3',
        description: 'Third test storylet',
        content: 'Content 3',
        storyArc: null,
        triggers: [],
        choices: [],
        effects: [],
        status: 'dev',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ],
    arcs: [
      {
        id: 'arc-1',
        name: 'Test Arc',
        description: 'Test arc description',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01'
      }
    ],
    getArc: vi.fn(),
    updateStorylet: vi.fn().mockResolvedValue(undefined)
  };

  const mockAsyncManager = {
    register: vi.fn().mockImplementation((id, category, fn) => fn())
  };

  beforeEach(() => {
    // Reset all mocks first
    vi.clearAllMocks();
    
    vi.mocked(useNarrativeStore).mockReturnValue(mockNarrativeStore as any);
    vi.mocked(AsyncManager.useAsyncOperationManager).mockReturnValue(mockAsyncManager as any);
    
    // Setup getArc mock
    mockNarrativeStore.getArc.mockImplementation((id: string) => 
      mockNarrativeStore.arcs.find(arc => arc.id === id)
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render visual editor with all main components', () => {
      render(<VisualStoryletEditor />);
      
      expect(screen.getByTestId('visual-editor-toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('visual-editor-canvas')).toBeInTheDocument();
      expect(screen.getByTestId('add-storylet-btn')).toBeInTheDocument();
      expect(screen.getByTestId('save-connections-btn')).toBeInTheDocument();
    });

    it('should render with arc-specific mode when arcId is provided', () => {
      render(<VisualStoryletEditor arcId="arc-1" />);
      
      const storeInstance = vi.mocked(useVisualEditorStore)();
      expect(storeInstance.clearEditor).toHaveBeenCalled();
      expect(mockNarrativeStore.getArc).toHaveBeenCalledWith('arc-1');
    });

    it('should render save and cancel buttons when callbacks provided', () => {
      const onSave = vi.fn();
      const onCancel = vi.fn();
      
      render(<VisualStoryletEditor onSave={onSave} onCancel={onCancel} />);
      
      expect(screen.getByTestId('save-btn')).toBeInTheDocument();
      expect(screen.getByTestId('cancel-btn')).toBeInTheDocument();
    });
  });

  describe('Arc Mode Functionality', () => {
    it('should load arc storylets and create connections for specific arc', async () => {
      render(<VisualStoryletEditor arcId="arc-1" />);
      
      // Verify arc was fetched
      expect(mockNarrativeStore.getArc).toHaveBeenCalledWith('arc-1');
      
      // Verify nodes were added for arc storylets
      await waitFor(() => {
        expect(mockVisualEditorStore.addNode).toHaveBeenCalledTimes(2); // storylet-1 and storylet-2
      });
      
      // Verify connections were created
      expect(mockVisualEditorStore.createConnectionsFromStoryletChoices).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'storylet-1', storyArc: 'arc-1' }),
          expect.objectContaining({ id: 'storylet-2', storyArc: 'arc-1' })
        ])
      );
    });

    it('should handle non-existent arc gracefully', () => {
      mockNarrativeStore.getArc.mockReturnValue(undefined);
      
      render(<VisualStoryletEditor arcId="non-existent-arc" />);
      
      expect(mockNarrativeStore.getArc).toHaveBeenCalledWith('non-existent-arc');
      expect(mockVisualEditorStore.clearEditor).toHaveBeenCalled();
    });
  });

  describe('All Storylets Mode', () => {
    it('should load all storylets when no arcId provided', async () => {
      render(<VisualStoryletEditor />);
      
      // Verify all storylets were added as nodes
      await waitFor(() => {
        expect(mockVisualEditorStore.addNode).toHaveBeenCalledTimes(3); // All 3 test storylets
      });
      
      // Verify connections were created for all storylets
      expect(mockVisualEditorStore.createConnectionsFromStoryletChoices).toHaveBeenCalledWith(
        mockNarrativeStore.storylets
      );
    });

    it('should include arc information in node data for all storylets', async () => {
      render(<VisualStoryletEditor />);
      
      await waitFor(() => {
        // Check that addNode was called with arc name information
        const addNodeCalls = mockVisualEditorStore.addNode.mock.calls;
        
        // Find the call for storylet-1 (has arc)
        const storylet1Call = addNodeCalls.find(call => 
          call[0].data.storyletId === 'storylet-1'
        );
        expect(storylet1Call[0].data.arcName).toBe('Test Arc');
        
        // Find the call for storylet-3 (no arc)
        const storylet3Call = addNodeCalls.find(call => 
          call[0].data.storyletId === 'storylet-3'
        );
        expect(storylet3Call[0].data.arcName).toBe('No Arc');
      });
    });
  });

  describe('Node Management and Panel Interaction', () => {
    it('should open storylet panel when node is double-clicked', async () => {
      const user = userEvent.setup();
      render(<VisualStoryletEditor />);
      
      const canvas = screen.getByTestId('visual-editor-canvas');
      await user.dblClick(canvas);
      
      expect(screen.getByTestId('storylet-editor-panel')).toBeInTheDocument();
      expect(screen.getByText('Panel for: test-storylet-1')).toBeInTheDocument();
    });

    it('should close storylet panel when close button clicked', async () => {
      const user = userEvent.setup();
      render(<VisualStoryletEditor />);
      
      // Open panel first
      const canvas = screen.getByTestId('visual-editor-canvas');
      await user.dblClick(canvas);
      
      expect(screen.getByTestId('storylet-editor-panel')).toBeInTheDocument();
      
      // Close panel
      const closeBtn = screen.getByTestId('close-panel-btn');
      await user.click(closeBtn);
      
      expect(screen.queryByTestId('storylet-editor-panel')).not.toBeInTheDocument();
    });
  });

  describe('Connection Management', () => {
    it('should save connections when save connections button clicked', async () => {
      const user = userEvent.setup();
      render(<VisualStoryletEditor />);
      
      const saveBtn = screen.getByTestId('save-connections-btn');
      await user.click(saveBtn);
      
      expect(mockVisualEditorStore.saveConnectionsToStoryletChoices).toHaveBeenCalledWith(
        mockNarrativeStore.updateStorylet
      );
    });

    it('should handle connection creation events', async () => {
      render(<VisualStoryletEditor />);
      
      // Simulate connection creation event
      const connectionEvent = new CustomEvent('connectionCreated', {
        detail: {
          connection: {
            id: 'connection-1',
            fromNodeId: 'node-1',
            toNodeId: 'node-2',
            label: 'Test Connection'
          },
          nodes: [
            {
              id: 'node-1',
              data: {
                storyletId: 'storylet-1',
                title: 'Source Storylet'
              }
            },
            {
              id: 'node-2',
              data: {
                storyletId: 'storylet-2',
                title: 'Target Storylet'
              }
            }
          ]
        }
      });
      
      window.dispatchEvent(connectionEvent);
      
      await waitFor(() => {
        expect(mockNarrativeStore.updateStorylet).toHaveBeenCalledWith(
          'storylet-1',
          expect.objectContaining({
            choices: expect.arrayContaining([
              expect.objectContaining({
                id: 'connection-1',
                text: 'Test Connection',
                nextStoryletId: 'storylet-2',
                description: 'Go to Target Storylet'
              })
            ])
          })
        );
      });
    });

    it('should not create duplicate choices for existing connections', async () => {
      render(<VisualStoryletEditor />);
      
      // Simulate connection to existing choice target
      const connectionEvent = new CustomEvent('connectionCreated', {
        detail: {
          connection: {
            id: 'connection-duplicate',
            fromNodeId: 'node-1',
            toNodeId: 'node-2',
            label: 'Duplicate Connection'
          },
          nodes: [
            {
              id: 'node-1',
              data: {
                storyletId: 'storylet-1', // This already has a choice to storylet-2
                title: 'Source Storylet'
              }
            },
            {
              id: 'node-2',
              data: {
                storyletId: 'storylet-2',
                title: 'Target Storylet'
              }
            }
          ]
        }
      });
      
      window.dispatchEvent(connectionEvent);
      
      // Should not call updateStorylet since connection already exists
      await waitFor(() => {
        expect(mockNarrativeStore.updateStorylet).not.toHaveBeenCalled();
      });
    });
  });

  describe('Canvas Controls', () => {
    it('should handle canvas click events', async () => {
      const user = userEvent.setup();
      render(<VisualStoryletEditor />);
      
      const canvas = screen.getByTestId('visual-editor-canvas');
      await user.click(canvas);
      
      // Canvas controls should be called (mocked behavior)
      expect(canvas).toBeInTheDocument();
    });

    it('should track mouse position on canvas', async () => {
      const user = userEvent.setup();
      render(<VisualStoryletEditor />);
      
      const canvas = screen.getByTestId('visual-editor-canvas');
      await user.hover(canvas);
      
      // Mouse position should be tracked (visible in canvas content)
      expect(canvas).toHaveTextContent('Mouse:');
    });
  });

  describe('Toolbar Actions', () => {
    it('should trigger auto layout when button clicked', async () => {
      const user = userEvent.setup();
      render(<VisualStoryletEditor />);
      
      const autoLayoutBtn = screen.getByTestId('auto-layout-btn');
      await user.click(autoLayoutBtn);
      
      expect(mockVisualEditorStore.autoLayout).toHaveBeenCalled();
    });

    it('should call onSave callback when save button clicked', async () => {
      const onSave = vi.fn();
      const user = userEvent.setup();
      render(<VisualStoryletEditor onSave={onSave} />);
      
      const saveBtn = screen.getByTestId('save-btn');
      await user.click(saveBtn);
      
      expect(onSave).toHaveBeenCalled();
    });

    it('should call onCancel callback when cancel button clicked', async () => {
      const onCancel = vi.fn();
      const user = userEvent.setup();
      render(<VisualStoryletEditor onCancel={onCancel} />);
      
      const cancelBtn = screen.getByTestId('cancel-btn');
      await user.click(cancelBtn);
      
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('should show loading overlay during connection creation', async () => {
      // Mock async operation to be in progress
      mockAsyncManager.register.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<VisualStoryletEditor />);
      
      await waitFor(() => {
        // The loading overlay should be visible during async operations
        expect(screen.queryByText('Creating storylet connections...')).toBeInTheDocument();
      });
    });

    it('should show loading overlay during connection saving', async () => {
      const user = userEvent.setup();
      
      // Mock save operation to be in progress
      mockVisualEditorStore.saveConnectionsToStoryletChoices.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );
      
      render(<VisualStoryletEditor />);
      
      const saveBtn = screen.getByTestId('save-connections-btn');
      await user.click(saveBtn);
      
      await waitFor(() => {
        expect(screen.queryByText('Saving connections...')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle connection creation errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockNarrativeStore.updateStorylet.mockRejectedValue(new Error('Update failed'));
      
      render(<VisualStoryletEditor />);
      
      // Simulate connection creation event that will fail
      const connectionEvent = new CustomEvent('connectionCreated', {
        detail: {
          connection: {
            id: 'connection-fail',
            fromNodeId: 'node-1',
            toNodeId: 'node-2'
          },
          nodes: [
            {
              id: 'node-1',
              data: { storyletId: 'storylet-1', title: 'Source' }
            },
            {
              id: 'node-2',
              data: { storyletId: 'storylet-new', title: 'Target' }
            }
          ]
        }
      });
      
      window.dispatchEvent(connectionEvent);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to create storylet choice:',
          expect.any(Error)
        );
      });
      
      consoleSpy.mockRestore();
    });

    it('should handle missing storylet data in connection events', async () => {
      render(<VisualStoryletEditor />);
      
      // Simulate connection event with invalid data
      const connectionEvent = new CustomEvent('connectionCreated', {
        detail: {
          connection: { id: 'connection-invalid' },
          nodes: [
            { id: 'node-1', data: {} }, // Missing storyletId
            { id: 'node-2', data: {} }
          ]
        }
      });
      
      window.dispatchEvent(connectionEvent);
      
      // Should not attempt to update storylet with invalid data
      expect(mockNarrativeStore.updateStorylet).not.toHaveBeenCalled();
    });
  });
});