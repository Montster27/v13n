/**
 * Comprehensive tests for useVisualEditorStore
 * Tests Zustand state management, node operations, connections, and visual editor logic
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useVisualEditorStore } from './useVisualEditorStore';
import { act, renderHook } from '@testing-library/react';

// Mock crypto.randomUUID
const mockUUIDs = ['node-1', 'node-2', 'node-3', 'conn-1', 'conn-2', 'conn-3'];
let uuidIndex = 0;

vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => mockUUIDs[uuidIndex++] || `uuid-${uuidIndex}`)
});

describe('useVisualEditorStore', () => {
  beforeEach(() => {
    // Reset UUID index
    uuidIndex = 0;
    
    // Reset store to initial state
    useVisualEditorStore.setState({
      nodes: [],
      connections: [],
      selectedNode: undefined,
      selectedConnection: undefined,
      scale: 1,
      offset: { x: 0, y: 0 },
      mode: 'select',
      connecting: undefined
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useVisualEditorStore());
      
      expect(result.current.nodes).toEqual([]);
      expect(result.current.connections).toEqual([]);
      expect(result.current.selectedNode).toBeUndefined();
      expect(result.current.selectedConnection).toBeUndefined();
      expect(result.current.scale).toBe(1);
      expect(result.current.offset).toEqual({ x: 0, y: 0 });
      expect(result.current.mode).toBe('select');
      expect(result.current.connecting).toBeUndefined();
    });
  });

  describe('Node Operations', () => {
    it('should add a new node and return its ID', () => {
      const { result } = renderHook(() => useVisualEditorStore());
      
      const nodeData = {
        type: 'storylet' as const,
        position: { x: 100, y: 200 },
        data: {
          storyletId: 'storylet-1',
          title: 'Test Node',
          description: 'Test Description'
        }
      };

      act(() => {
        const nodeId = result.current.addNode(nodeData);
        expect(nodeId).toBe('node-1');
      });

      expect(result.current.nodes).toHaveLength(1);
      expect(result.current.nodes[0]).toEqual({
        id: 'node-1',
        type: 'storylet',
        position: { x: 100, y: 200 },
        data: {
          storyletId: 'storylet-1',
          title: 'Test Node',
          description: 'Test Description'
        }
      });
    });

    it('should update an existing node', () => {
      const { result } = renderHook(() => useVisualEditorStore());
      
      // Add a node first
      act(() => {
        result.current.addNode({
          type: 'storylet',
          position: { x: 100, y: 200 },
          data: { title: 'Original Title' }
        });
      });

      // Update the node
      act(() => {
        result.current.updateNode('node-1', {
          position: { x: 150, y: 250 },
          data: { title: 'Updated Title' }
        });
      });

      expect(result.current.nodes[0]).toEqual({
        id: 'node-1',
        type: 'storylet',
        position: { x: 150, y: 250 },
        data: { title: 'Updated Title' }
      });
    });

    it('should remove a node and its connections', () => {
      const { result } = renderHook(() => useVisualEditorStore());
      
      // Add two nodes
      act(() => {
        result.current.addNode({
          type: 'storylet',
          position: { x: 100, y: 200 },
          data: { title: 'Node 1' }
        });
        result.current.addNode({
          type: 'storylet',
          position: { x: 300, y: 400 },
          data: { title: 'Node 2' }
        });
      });

      // Add a connection between them
      act(() => {
        result.current.addConnection({
          fromNodeId: 'node-1',
          toNodeId: 'node-2',
          fromHandle: 'output',
          toHandle: 'input',
          label: 'Test Connection'
        });
      });

      // Select the first node
      act(() => {
        result.current.selectNode('node-1');
      });

      expect(result.current.nodes).toHaveLength(2);
      expect(result.current.connections).toHaveLength(1);
      expect(result.current.selectedNode).toBe('node-1');

      // Remove the first node
      act(() => {
        result.current.removeNode('node-1');
      });

      expect(result.current.nodes).toHaveLength(1);
      expect(result.current.nodes[0].id).toBe('node-2');
      expect(result.current.connections).toHaveLength(0); // Connection should be removed
      expect(result.current.selectedNode).toBeUndefined(); // Selection should be cleared
    });

    it('should move a node to a new position', () => {
      const { result } = renderHook(() => useVisualEditorStore());
      
      // Add a node
      act(() => {
        result.current.addNode({
          type: 'storylet',
          position: { x: 100, y: 200 },
          data: { title: 'Movable Node' }
        });
      });

      // Move the node
      act(() => {
        result.current.moveNode('node-1', { x: 500, y: 600 });
      });

      expect(result.current.nodes[0].position).toEqual({ x: 500, y: 600 });
    });

    it('should get a node by ID', () => {
      const { result } = renderHook(() => useVisualEditorStore());
      
      // Add nodes
      act(() => {
        result.current.addNode({
          type: 'storylet',
          position: { x: 100, y: 200 },
          data: { title: 'Node 1' }
        });
        result.current.addNode({
          type: 'start',
          position: { x: 300, y: 400 },
          data: { title: 'Node 2' }
        });
      });

      const node1 = result.current.getNodeById('node-1');
      const node2 = result.current.getNodeById('node-2');
      const nonExistent = result.current.getNodeById('non-existent');

      expect(node1).toBeDefined();
      expect(node1?.data.title).toBe('Node 1');
      expect(node2).toBeDefined();
      expect(node2?.type).toBe('start');
      expect(nonExistent).toBeUndefined();
    });
  });

  describe('Connection Operations', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useVisualEditorStore());
      
      // Add two nodes for testing connections (these will use node-1 and node-2)
      act(() => {
        result.current.addNode({
          type: 'start',
          position: { x: 100, y: 200 },
          data: { title: 'Start Node' }
        });
        result.current.addNode({
          type: 'storylet',
          position: { x: 300, y: 400 },
          data: { title: 'Story Node' }
        });
      });
      // Reset UUID index to node-3 for connection tests
      uuidIndex = 2;
    });

    it('should add a new connection and return its ID', () => {
      const { result } = renderHook(() => useVisualEditorStore());
      
      act(() => {
        const connId = result.current.addConnection({
          fromNodeId: 'node-1',
          toNodeId: 'node-2',
          fromHandle: 'output',
          toHandle: 'input',
          label: 'Test Connection'
        });
        expect(connId).toBe('node-3'); // Third UUID consumed
      });

      expect(result.current.connections).toHaveLength(1);
      expect(result.current.connections[0]).toEqual({
        id: 'node-3',
        fromNodeId: 'node-1',
        toNodeId: 'node-2',
        fromHandle: 'output',
        toHandle: 'input',
        label: 'Test Connection'
      });
    });

    it('should remove a connection by ID', () => {
      const { result } = renderHook(() => useVisualEditorStore());
      
      // Add connections
      act(() => {
        result.current.addConnection({
          fromNodeId: 'node-1',
          toNodeId: 'node-2',
          fromHandle: 'output',
          toHandle: 'input',
          label: 'Connection 1'
        });
        result.current.addConnection({
          fromNodeId: 'node-2',
          toNodeId: 'node-1',
          fromHandle: 'output',
          toHandle: 'input',
          label: 'Connection 2'
        });
      });

      expect(result.current.connections).toHaveLength(2);

      // Remove first connection
      act(() => {
        result.current.removeConnection('node-3'); // First connection ID
      });

      expect(result.current.connections).toHaveLength(1);
      expect(result.current.connections[0].id).toBe('conn-1'); // Second connection uses conn-1 from mock array
    });

    it('should get a connection by ID', () => {
      const { result } = renderHook(() => useVisualEditorStore());
      
      act(() => {
        result.current.addConnection({
          fromNodeId: 'node-1',
          toNodeId: 'node-2',
          fromHandle: 'output',
          toHandle: 'input',
          label: 'Test Connection'
        });
      });

      const connection = result.current.getConnectionById('node-3');
      const nonExistent = result.current.getConnectionById('non-existent');

      expect(connection).toBeDefined();
      expect(connection?.label).toBe('Test Connection');
      expect(nonExistent).toBeUndefined();
    });

    it('should validate connections properly', () => {
      const { result } = renderHook(() => useVisualEditorStore());
      
      // Add an end node
      act(() => {
        result.current.addNode({
          type: 'end',
          position: { x: 500, y: 600 },
          data: { title: 'End Node' }
        });
      });

      // Valid connection: start -> storylet
      expect(result.current.validateConnection('node-1', 'node-2')).toBe(true);
      
      // Invalid: self-connection
      expect(result.current.validateConnection('node-1', 'node-1')).toBe(false);
      
      // Invalid: storylet -> start (start can't have inputs)
      expect(result.current.validateConnection('node-2', 'node-1')).toBe(false);
      
      // Invalid: end -> storylet (end can't have outputs)
      expect(result.current.validateConnection('node-3', 'node-2')).toBe(false);
      
      // Add existing connection and test duplicate prevention
      act(() => {
        result.current.addConnection({
          fromNodeId: 'node-1',
          toNodeId: 'node-2',
          fromHandle: 'output',
          toHandle: 'input'
        });
      });
      
      // Should prevent duplicate connection
      expect(result.current.validateConnection('node-1', 'node-2')).toBe(false);
    });

    it('should get connected nodes for a given node', () => {
      const { result } = renderHook(() => useVisualEditorStore());
      
      // Add a third node
      act(() => {
        result.current.addNode({
          type: 'storylet',
          position: { x: 500, y: 600 },
          data: { title: 'Story Node 2' }
        });
      });

      // Add connections: node-1 -> node-2 -> node-3
      act(() => {
        result.current.addConnection({
          fromNodeId: 'node-1',
          toNodeId: 'node-2',
          fromHandle: 'output',
          toHandle: 'input'
        });
        result.current.addConnection({
          fromNodeId: 'node-2',
          toNodeId: 'node-3',
          fromHandle: 'output',
          toHandle: 'input'
        });
      });

      const node2Connections = result.current.getConnectedNodes('node-2');
      
      expect(node2Connections.inputs).toHaveLength(1);
      expect(node2Connections.outputs).toHaveLength(1);
      expect(node2Connections.inputs[0].id).toBe('node-1');
      expect(node2Connections.outputs[0].id).toBe('node-3');
    });
  });

  describe('Selection Management', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useVisualEditorStore());
      
      // Add test nodes and connections
      act(() => {
        result.current.addNode({
          type: 'storylet',
          position: { x: 100, y: 200 },
          data: { title: 'Node 1' }
        });
        result.current.addConnection({
          fromNodeId: 'node-1',
          toNodeId: 'node-1', // Self-connection for testing
          fromHandle: 'output',
          toHandle: 'input'
        });
      });
    });

    it('should select and deselect nodes', () => {
      const { result } = renderHook(() => useVisualEditorStore());
      
      // Select node
      act(() => {
        result.current.selectNode('node-1');
      });
      expect(result.current.selectedNode).toBe('node-1');
      
      // Deselect node
      act(() => {
        result.current.selectNode(undefined);
      });
      expect(result.current.selectedNode).toBeUndefined();
    });

    it('should select and deselect connections', () => {
      const { result } = renderHook(() => useVisualEditorStore());
      
      // Select connection
      act(() => {
        result.current.selectConnection('conn-1');
      });
      expect(result.current.selectedConnection).toBe('conn-1');
      
      // Deselect connection
      act(() => {
        result.current.selectConnection(undefined);
      });
      expect(result.current.selectedConnection).toBeUndefined();
    });

    it('should clear node selection when node is removed', () => {
      const { result } = renderHook(() => useVisualEditorStore());
      
      // Select node then remove it
      act(() => {
        result.current.selectNode('node-1');
        result.current.removeNode('node-1');
      });
      
      expect(result.current.selectedNode).toBeUndefined();
    });
  });

  describe('Editor State Management', () => {
    it('should set editor mode', () => {
      const { result } = renderHook(() => useVisualEditorStore());
      
      act(() => {
        result.current.setMode('connect');
      });
      expect(result.current.mode).toBe('connect');
      
      act(() => {
        result.current.setMode('select');
      });
      expect(result.current.mode).toBe('select');
    });

    it('should set scale', () => {
      const { result } = renderHook(() => useVisualEditorStore());
      
      act(() => {
        result.current.setScale(1.5);
      });
      expect(result.current.scale).toBe(1.5);
      
      act(() => {
        result.current.setScale(0.5);
      });
      expect(result.current.scale).toBe(0.5);
    });

    it('should set offset', () => {
      const { result } = renderHook(() => useVisualEditorStore());
      
      act(() => {
        result.current.setOffset({ x: 100, y: 200 });
      });
      expect(result.current.offset).toEqual({ x: 100, y: 200 });
    });

    it('should manage connection state', () => {
      const { result } = renderHook(() => useVisualEditorStore());
      
      // Start connecting
      act(() => {
        result.current.startConnecting('node-1', 'output');
      });
      expect(result.current.connecting).toEqual({
        fromNodeId: 'node-1',
        fromHandle: 'output'
      });
      
      // Cancel connecting
      act(() => {
        result.current.cancelConnecting();
      });
      expect(result.current.connecting).toBeUndefined();
    });

    it('should finish connecting and create connection', () => {
      const { result } = renderHook(() => useVisualEditorStore());
      
      // Add nodes for connection
      act(() => {
        result.current.addNode({
          type: 'start',
          position: { x: 100, y: 200 },
          data: { title: 'Start' }
        });
        result.current.addNode({
          type: 'storylet',
          position: { x: 300, y: 400 },
          data: { title: 'Story' }
        });
      });

      // Start and finish connecting
      act(() => {
        result.current.startConnecting('node-1', 'output');
        result.current.finishConnecting('node-2', 'input');
      });

      expect(result.current.connections).toHaveLength(1);
      expect(result.current.connections[0]).toEqual({
        id: 'node-3', // Third UUID after two nodes
        fromNodeId: 'node-1',
        toNodeId: 'node-2',
        fromHandle: 'output',
        toHandle: 'input',
        label: 'Continue' // Default label from finishConnecting
      });
      expect(result.current.connecting).toBeUndefined();
    });
  });

  describe('Arc Management', () => {
    it('should load arc data', () => {
      const { result } = renderHook(() => useVisualEditorStore());
      
      const nodes = [
        {
          id: 'arc-node-1',
          type: 'start' as const,
          position: { x: 100, y: 200 },
          data: { title: 'Arc Start' }
        },
        {
          id: 'arc-node-2',
          type: 'storylet' as const,
          position: { x: 300, y: 400 },
          data: { title: 'Arc Story' }
        }
      ];
      
      const connections = [
        {
          id: 'arc-conn-1',
          fromNodeId: 'arc-node-1',
          toNodeId: 'arc-node-2',
          fromHandle: 'output',
          toHandle: 'input'
        }
      ];

      act(() => {
        result.current.loadArc(nodes, connections);
      });

      expect(result.current.nodes).toEqual(nodes);
      expect(result.current.connections).toEqual(connections);
    });

    it('should clear editor', () => {
      const { result } = renderHook(() => useVisualEditorStore());
      
      // Add some data
      act(() => {
        result.current.addNode({
          type: 'storylet',
          position: { x: 100, y: 200 },
          data: { title: 'Test' }
        });
        result.current.selectNode('node-1');
        result.current.setScale(1.5);
        result.current.setOffset({ x: 50, y: 100 });
      });

      // Clear editor
      act(() => {
        result.current.clearEditor();
      });

      expect(result.current.nodes).toEqual([]);
      expect(result.current.connections).toEqual([]);
      expect(result.current.selectedNode).toBeUndefined();
      expect(result.current.selectedConnection).toBeUndefined();
      expect(result.current.scale).toBe(1);
      expect(result.current.offset).toEqual({ x: 0, y: 0 });
      expect(result.current.mode).toBe('select');
      expect(result.current.connecting).toBeUndefined();
    });
  });

  describe('Auto Layout', () => {
    it('should arrange nodes in a grid layout', () => {
      const { result } = renderHook(() => useVisualEditorStore());
      
      // Add multiple nodes
      act(() => {
        for (let i = 0; i < 7; i++) {
          result.current.addNode({
            type: 'storylet',
            position: { x: 0, y: 0 }, // All at origin initially
            data: { title: `Node ${i + 1}` }
          });
        }
      });

      // Apply auto layout
      act(() => {
        result.current.autoLayout();
      });

      // Check that nodes are arranged in a 5-column grid
      expect(result.current.nodes[0].position).toEqual({ x: 200, y: 100 }); // First row, first column
      expect(result.current.nodes[4].position).toEqual({ x: 1200, y: 100 }); // First row, last column
      expect(result.current.nodes[5].position).toEqual({ x: 200, y: 300 }); // Second row, first column
      expect(result.current.nodes[6].position).toEqual({ x: 450, y: 300 }); // Second row, second column
    });
  });

  describe('Storylet Integration', () => {
    it('should create connections from storylet choices', () => {
      const { result } = renderHook(() => useVisualEditorStore());
      
      // Add nodes that match storylet IDs
      act(() => {
        result.current.addNode({
          type: 'storylet',
          position: { x: 100, y: 200 },
          data: { storyletId: 'story-1', title: 'Story 1' }
        });
        result.current.addNode({
          type: 'storylet',
          position: { x: 300, y: 400 },
          data: { storyletId: 'story-2', title: 'Story 2' }
        });
      });

      const storylets = [
        {
          id: 'story-1',
          choices: [
            {
              text: 'Go to story 2',
              nextStoryletId: 'story-2'
            }
          ]
        }
      ];

      act(() => {
        result.current.createConnectionsFromStoryletChoices(storylets);
      });

      expect(result.current.connections).toHaveLength(1);
      expect(result.current.connections[0]).toEqual(
        expect.objectContaining({
          fromNodeId: 'node-1',
          toNodeId: 'node-2',
          label: 'Go to story 2'
        })
      );
    });

    it('should save connections back to storylet choices', async () => {
      const { result } = renderHook(() => useVisualEditorStore());
      const mockUpdateStorylet = vi.fn().mockResolvedValue(undefined);
      
      // Setup nodes and connections
      act(() => {
        result.current.addNode({
          type: 'storylet',
          position: { x: 100, y: 200 },
          data: { storyletId: 'story-1', title: 'Story 1' }
        });
        result.current.addNode({
          type: 'storylet',
          position: { x: 300, y: 400 },
          data: { storyletId: 'story-2', title: 'Story 2' }
        });
        result.current.addConnection({
          fromNodeId: 'node-1',
          toNodeId: 'node-2',
          fromHandle: 'output',
          toHandle: 'input',
          label: 'Test choice'
        });
      });

      await act(async () => {
        await result.current.saveConnectionsToStoryletChoices(mockUpdateStorylet);
      });

      expect(mockUpdateStorylet).toHaveBeenCalledWith('story-1', {
        choices: [
          expect.objectContaining({
            text: 'Test choice',
            nextStoryletId: 'story-2'
          })
        ]
      });
    });

    it('should prevent duplicate connections when creating from choices', () => {
      const { result } = renderHook(() => useVisualEditorStore());
      
      // Add nodes
      act(() => {
        result.current.addNode({
          type: 'storylet',
          position: { x: 100, y: 200 },
          data: { storyletId: 'story-1', title: 'Story 1' }
        });
        result.current.addNode({
          type: 'storylet',
          position: { x: 300, y: 400 },
          data: { storyletId: 'story-2', title: 'Story 2' }
        });
      });

      const storylets = [
        {
          id: 'story-1',
          choices: [
            { text: 'Choice 1', nextStoryletId: 'story-2' },
            { text: 'Choice 2', nextStoryletId: 'story-2' } // Duplicate target
          ]
        }
      ];

      act(() => {
        result.current.createConnectionsFromStoryletChoices(storylets);
      });

      // Should only create one connection despite two choices to same target
      expect(result.current.connections).toHaveLength(1);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle operations on non-existent nodes gracefully', () => {
      const { result } = renderHook(() => useVisualEditorStore());
      
      // These operations should not throw errors
      act(() => {
        result.current.updateNode('non-existent', { position: { x: 0, y: 0 } });
        result.current.removeNode('non-existent');
        result.current.moveNode('non-existent', { x: 0, y: 0 });
      });

      expect(result.current.nodes).toHaveLength(0);
    });

    it('should handle operations on non-existent connections gracefully', () => {
      const { result } = renderHook(() => useVisualEditorStore());
      
      act(() => {
        result.current.removeConnection('non-existent');
      });

      expect(result.current.connections).toHaveLength(0);
    });

    it('should handle empty storylets array in createConnectionsFromStoryletChoices', () => {
      const { result } = renderHook(() => useVisualEditorStore());
      
      act(() => {
        result.current.createConnectionsFromStoryletChoices([]);
      });

      expect(result.current.connections).toHaveLength(0);
    });

    it('should handle storylets without choices', () => {
      const { result } = renderHook(() => useVisualEditorStore());
      
      // Add a node
      act(() => {
        result.current.addNode({
          type: 'storylet',
          position: { x: 100, y: 200 },
          data: { storyletId: 'story-1', title: 'Story 1' }
        });
      });

      const storylets = [
        { id: 'story-1' }, // No choices property
        { id: 'story-2', choices: [] }, // Empty choices
        { id: 'story-3', choices: null } // Null choices
      ];

      act(() => {
        result.current.createConnectionsFromStoryletChoices(storylets);
      });

      expect(result.current.connections).toHaveLength(0);
    });

    it('should handle failed connection finishing due to validation', () => {
      const { result } = renderHook(() => useVisualEditorStore());
      
      // Add nodes
      act(() => {
        result.current.addNode({
          type: 'end',
          position: { x: 100, y: 200 },
          data: { title: 'End Node' }
        });
        result.current.addNode({
          type: 'storylet',
          position: { x: 300, y: 400 },
          data: { title: 'Story Node' }
        });
      });

      // Try to connect from end node (invalid)
      act(() => {
        result.current.startConnecting('node-1', 'output');
        result.current.finishConnecting('node-2', 'input');
      });

      // Connection should not be created due to validation failure
      expect(result.current.connections).toHaveLength(0);
      expect(result.current.connecting).toBeUndefined(); // Should still clear connecting state
    });
  });
});