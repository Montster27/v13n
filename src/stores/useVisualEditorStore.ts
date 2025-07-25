import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { type StoryletNode, type NodeConnection, type VisualEditorState, type Position } from '../types/visual';

interface VisualEditorStore extends VisualEditorState {
  // Node operations
  addNode: (node: Omit<StoryletNode, 'id'>) => string;
  updateNode: (id: string, updates: Partial<StoryletNode>) => void;
  removeNode: (id: string) => void;
  moveNode: (id: string, position: Position) => void;
  
  // Connection operations
  addConnection: (connection: Omit<NodeConnection, 'id'>) => string;
  removeConnection: (id: string) => void;
  
  // Selection
  selectNode: (id?: string) => void;
  selectConnection: (id?: string) => void;
  
  // Editor state
  setMode: (mode: VisualEditorState['mode']) => void;
  setScale: (scale: number) => void;
  setOffset: (offset: Position) => void;
  startConnecting: (fromNodeId: string, fromHandle: string) => void;
  finishConnecting: (toNodeId: string, toHandle: string) => void;
  cancelConnecting: () => void;
  
  // Arc management
  loadArc: (nodes: StoryletNode[], connections: NodeConnection[]) => void;
  clearEditor: () => void;
  
  // Utilities
  getNodeById: (id: string) => StoryletNode | undefined;
  getConnectionById: (id: string) => NodeConnection | undefined;
  getConnectedNodes: (nodeId: string) => { inputs: StoryletNode[]; outputs: StoryletNode[] };
  validateConnection: (fromNodeId: string, toNodeId: string) => boolean;
  
  // Auto-layout
  autoLayout: () => void;
  
  // Storylet-specific operations
  createConnectionsFromStoryletChoices: (storylets: any[]) => void;
  saveConnectionsToStoryletChoices: (updateStorylet: (id: string, updates: any) => Promise<void>) => Promise<void>;
}

const initialState: VisualEditorState = {
  nodes: [],
  connections: [],
  selectedNode: undefined,
  selectedConnection: undefined,
  scale: 1,
  offset: { x: 0, y: 0 },
  mode: 'select',
  connecting: undefined,
};

export const useVisualEditorStore = create<VisualEditorStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Node operations
    addNode: (nodeData) => {
      const id = crypto.randomUUID();
      const node: StoryletNode = {
        id,
        ...nodeData,
      };
      set((state) => ({
        nodes: [...state.nodes, node],
      }));
      return id;
    },

    updateNode: (id, updates) => {
      set((state) => ({
        nodes: state.nodes.map((node) =>
          node.id === id ? { ...node, ...updates } : node
        ),
      }));
    },

    removeNode: (id) => {
      set((state) => ({
        nodes: state.nodes.filter((node) => node.id !== id),
        connections: state.connections.filter(
          (conn) => conn.fromNodeId !== id && conn.toNodeId !== id
        ),
        selectedNode: state.selectedNode === id ? undefined : state.selectedNode,
      }));
    },

    moveNode: (id, position) => {
      set((state) => ({
        nodes: state.nodes.map((node) =>
          node.id === id ? { ...node, position } : node
        ),
      }));
    },

    // Connection operations
    addConnection: (connectionData) => {
      const id = crypto.randomUUID();
      const connection: NodeConnection = {
        id,
        ...connectionData,
      };
      set((state) => ({
        connections: [...state.connections, connection],
      }));
      return id;
    },

    removeConnection: (id) => {
      set((state) => ({
        connections: state.connections.filter((conn) => conn.id !== id),
        selectedConnection: state.selectedConnection === id ? undefined : state.selectedConnection,
      }));
    },

    // Selection
    selectNode: (id) => {
      set({ selectedNode: id, selectedConnection: undefined });
    },

    selectConnection: (id) => {
      set({ selectedConnection: id, selectedNode: undefined });
    },

    // Editor state
    setMode: (mode) => set({ mode }),
    setScale: (scale) => set({ scale: Math.max(0.1, Math.min(3, scale)) }),
    setOffset: (offset) => set({ offset }),

    startConnecting: (fromNodeId, fromHandle) => {
      set({
        connecting: { fromNodeId, fromHandle },
        mode: 'connect',
      });
    },

    finishConnecting: (toNodeId, toHandle) => {
      const state = get();
      if (state.connecting && state.validateConnection(state.connecting.fromNodeId, toNodeId)) {
        const connectionId = get().addConnection({
          fromNodeId: state.connecting.fromNodeId,
          toNodeId,
          fromHandle: state.connecting.fromHandle,
          toHandle,
          label: 'Continue'
        });
        
        // Automatically save this connection to storylet choices
        setTimeout(() => {
          const currentState = get();
          const connection = currentState.getConnectionById(connectionId);
          if (connection) {
            // This will be called from the component context where updateStorylet is available
            const event = new CustomEvent('connectionCreated', { 
              detail: { connection, nodes: currentState.nodes } 
            });
            window.dispatchEvent(event);
          }
        }, 0);
      }
      set({ connecting: undefined, mode: 'select' });
    },

    cancelConnecting: () => {
      set({ connecting: undefined, mode: 'select' });
    },

    // Arc management
    loadArc: (nodes, connections) => {
      set({ nodes, connections, selectedNode: undefined, selectedConnection: undefined });
    },

    clearEditor: () => {
      set(initialState);
    },

    // Utilities
    getNodeById: (id) => {
      return get().nodes.find((node) => node.id === id);
    },

    getConnectionById: (id) => {
      return get().connections.find((conn) => conn.id === id);
    },

    getConnectedNodes: (nodeId) => {
      const { nodes, connections } = get();
      const inputs = connections
        .filter((conn) => conn.toNodeId === nodeId)
        .map((conn) => nodes.find((node) => node.id === conn.fromNodeId))
        .filter(Boolean) as StoryletNode[];
      
      const outputs = connections
        .filter((conn) => conn.fromNodeId === nodeId)
        .map((conn) => nodes.find((node) => node.id === conn.toNodeId))
        .filter(Boolean) as StoryletNode[];
      
      return { inputs, outputs };
    },

    validateConnection: (fromNodeId, toNodeId) => {
      const { nodes, connections } = get();
      
      // Can't connect to self
      if (fromNodeId === toNodeId) return false;
      
      // Check if connection already exists
      const existingConnection = connections.find(
        (conn) => conn.fromNodeId === fromNodeId && conn.toNodeId === toNodeId
      );
      if (existingConnection) return false;
      
      const fromNode = nodes.find((node) => node.id === fromNodeId);
      const toNode = nodes.find((node) => node.id === toNodeId);
      
      if (!fromNode || !toNode) return false;
      
      // Basic connection rules
      if (fromNode.type === 'end') return false; // End nodes can't have outputs
      if (toNode.type === 'start') return false; // Start nodes can't have inputs
      
      return true;
    },

    // Auto-layout using force-directed algorithm (simplified)
    autoLayout: () => {
      const { nodes } = get();
      const layoutNodes = nodes.map((node, index) => ({
        ...node,
        position: {
          x: 200 + (index % 5) * 250,
          y: 100 + Math.floor(index / 5) * 200,
        },
      }));
      
      set({ nodes: layoutNodes });
    },

    // Create connections based on storylet choices
    createConnectionsFromStoryletChoices: (storylets) => {
      const state = get();
      const { nodes } = state;
      
      // Create a map of storylet ID to node ID for quick lookup
      const storyletIdToNodeId = new Map<string, string>();
      nodes.forEach(node => {
        if (node.data.storyletId) {
          storyletIdToNodeId.set(node.data.storyletId, node.id);
        }
      });
      
      // Process each storylet and its choices
      storylets.forEach(storylet => {
        if (!storylet.choices || storylet.choices.length === 0) return;
        if (!storylet.id) return;
        
        const fromNodeId = storyletIdToNodeId.get(storylet.id);
        if (!fromNodeId) return;
        
        // Create connections for each choice that has a nextStoryletId
        storylet.choices.forEach((choice: any) => {
          if (choice.nextStoryletId) {
            const toNodeId = storyletIdToNodeId.get(choice.nextStoryletId);
            if (toNodeId) {
              // Check if connection already exists
              const currentState = get();
              const existingConnection = currentState.connections.find(
                conn => conn.fromNodeId === fromNodeId && conn.toNodeId === toNodeId
              );
              
              if (!existingConnection) {
                // Use set directly to ensure state update
                set((state) => ({
                  connections: [...state.connections, {
                    id: crypto.randomUUID(),
                    fromNodeId,
                    toNodeId,
                    fromHandle: 'output',
                    toHandle: 'input',
                    label: choice.text.length > 20 ? choice.text.slice(0, 17) + '...' : choice.text
                  }]
                }));
              }
            }
          }
        });
      });
    },

    // Save visual connections back to storylet choice data
    saveConnectionsToStoryletChoices: async (updateStorylet) => {
      const { nodes, connections } = get();
      
      // Create a map of node ID to storylet ID for reverse lookup
      const nodeIdToStoryletId = new Map<string, string>();
      nodes.forEach(node => {
        if (node.data.storyletId) {
          nodeIdToStoryletId.set(node.id, node.data.storyletId);
        }
      });
      
      // Group connections by source storylet
      const storyletConnections = new Map<string, NodeConnection[]>();
      connections.forEach(connection => {
        const fromStoryletId = nodeIdToStoryletId.get(connection.fromNodeId);
        if (fromStoryletId) {
          if (!storyletConnections.has(fromStoryletId)) {
            storyletConnections.set(fromStoryletId, []);
          }
          storyletConnections.get(fromStoryletId)!.push(connection);
        }
      });
      
      // Process each storylet with connections
      for (const [storyletId, connectionList] of storyletConnections.entries()) {
        try {
          // Get the storylet node to access its current choices
          const storyletNode = nodes.find(node => 
            node.data.storyletId === storyletId
          );
          
          if (!storyletNode) continue;
          
          // Create choices based on connections
          const updatedChoices = connectionList.map((connection, index) => {
            const toStoryletId = nodeIdToStoryletId.get(connection.toNodeId);
            if (!toStoryletId) return null;
            
            return {
              id: connection.id,
              text: connection.label || `Go to connected storylet ${index + 1}`,
              description: `Connection to storylet`,
              effects: [],
              requirements: [],
              probability: 100,
              unlocked: true,
              nextStoryletId: toStoryletId,
              createNewStorylet: false
            };
          }).filter(Boolean);
          
          // Update the storylet with new choices
          await updateStorylet(storyletId, {
            choices: updatedChoices
          });
        } catch (error) {
          console.error(`Failed to update storylet ${storyletId}:`, error);
        }
      }
    },
  }))
);