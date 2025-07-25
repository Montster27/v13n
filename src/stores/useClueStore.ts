import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { db } from '../db/database';
import type { Clue, ClueFormData, ClueEvidence, ClueConnection, ClueDiscovery, ClueInvestigation, ClueBoard, CaseTheory } from '../types/clue';

interface ClueState {
  clues: Clue[];
  clueBoards: ClueBoard[];
  caseTheories: CaseTheory[];
  discoveries: ClueDiscovery[];
  investigations: ClueInvestigation[];
  loading: boolean;
  error: string | null;
}

interface ClueActions {
  // Clue CRUD operations
  loadClues: () => Promise<void>;
  addClue: (clueData: Omit<ClueFormData, 'id'>) => Promise<string>;
  updateClue: (id: string, updates: Partial<ClueFormData>) => Promise<void>;
  deleteClue: (id: string) => Promise<void>;
  getClue: (id: string) => Clue | undefined;
  
  // Clue discovery and status
  discoverClue: (clueId: string, discoveryData: Omit<ClueDiscovery, 'clueId' | 'timestamp'>) => Promise<void>;
  markClueAsResolved: (clueId: string) => Promise<void>;
  updateClueReliability: (clueId: string, reliability: Clue['reliability']) => Promise<void>;
  
  // Evidence management
  addEvidence: (clueId: string, evidence: Omit<ClueEvidence, 'id'>) => Promise<void>;
  updateEvidence: (clueId: string, evidenceId: string, updates: Partial<ClueEvidence>) => Promise<void>;
  removeEvidence: (clueId: string, evidenceId: string) => Promise<void>;
  
  // Connection management
  addConnection: (clueId: string, connection: Omit<ClueConnection, 'id'>) => Promise<void>;
  updateConnection: (clueId: string, connectionId: string, updates: Partial<ClueConnection>) => Promise<void>;
  removeConnection: (clueId: string, connectionId: string) => Promise<void>;
  
  // Investigation tracking
  recordInvestigation: (investigation: Omit<ClueInvestigation, 'id' | 'timestamp'>) => Promise<void>;
  getInvestigationHistory: (clueId: string) => ClueInvestigation[];
  
  // Clue board management
  createClueBoard: (boardData: Omit<ClueBoard, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateClueBoard: (boardId: string, updates: Partial<ClueBoard>) => Promise<void>;
  deleteClueBoard: (boardId: string) => Promise<void>;
  addClueToBoard: (boardId: string, clueId: string) => Promise<void>;
  removeClueFromBoard: (boardId: string, clueId: string) => Promise<void>;
  
  // Case theory management
  createCaseTheory: (theory: Omit<CaseTheory, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateCaseTheory: (theoryId: string, updates: Partial<CaseTheory>) => Promise<void>;
  deleteCaseTheory: (theoryId: string) => Promise<void>;
  
  // Utility functions
  getCluesByCategory: (category: Clue['category']) => Clue[];
  getCluesByImportance: (importance: Clue['importance']) => Clue[];
  getCluesByArc: (arcId: string) => Clue[];
  getDiscoveredClues: () => Clue[];
  getUndiscoveredClues: () => Clue[];
  searchClues: (query: string) => Clue[];
  getRelatedClues: (clueId: string) => Clue[];
  getClueConnections: (clueId: string) => ClueConnection[];
  
  // Analysis functions
  analyzeClueReliability: (clueId: string) => { score: number; factors: string[] };
  findContradictingClues: (clueId: string) => Clue[];
  getSupportingClues: (clueId: string) => Clue[];
  
  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

type ClueStore = ClueState & ClueActions;

const initialState: ClueState = {
  clues: [],
  clueBoards: [],
  caseTheories: [],
  discoveries: [],
  investigations: [],
  loading: false,
  error: null,
};

export const useClueStore = create<ClueStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Clue CRUD operations
    loadClues: async () => {
      set({ loading: true, error: null });
      try {
        const clues = await db.clues.toArray();
        const clueBoards = await db.clueBoards.toArray();
        const caseTheories = await db.caseTheories.toArray();
        const discoveries = await db.clueDiscoveries.toArray();
        const investigations = await db.clueInvestigations.toArray();
        
        set({ 
          clues: clues as Clue[], 
          clueBoards: clueBoards as ClueBoard[], 
          caseTheories: caseTheories as CaseTheory[], 
          discoveries: discoveries as ClueDiscovery[], 
          investigations: investigations as ClueInvestigation[], 
          loading: false 
        });
      } catch (error) {
        console.error('Failed to load clues:', error);
        set({ error: 'Failed to load clues', loading: false });
      }
    },

    addClue: async (clueData) => {
      set({ loading: true, error: null });
      try {
        const clue: Clue = {
          id: crypto.randomUUID(),
          ...clueData,
          evidence: [],
          connections: [],
          isDiscovered: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          mentionedInStorylets: [],
        };

        await db.clues.add(clue);
        set(state => ({
          clues: [...state.clues, clue],
          loading: false
        }));
        
        return clue.id;
      } catch (error) {
        console.error('Failed to add clue:', error);
        set({ error: 'Failed to add clue', loading: false });
        throw error;
      }
    },

    updateClue: async (id, updates) => {
      set({ loading: true, error: null });
      try {
        const updateData = {
          ...updates,
          updatedAt: new Date(),
        };

        await db.clues.update(id, updateData);
        
        set(state => ({
          clues: state.clues.map(clue =>
            clue.id === id ? { ...clue, ...updateData } : clue
          ),
          loading: false
        }));
      } catch (error) {
        console.error('Failed to update clue:', error);
        set({ error: 'Failed to update clue', loading: false });
        throw error;
      }
    },

    deleteClue: async (id) => {
      set({ loading: true, error: null });
      try {
        await db.clues.delete(id);
        set(state => ({
          clues: state.clues.filter(clue => clue.id !== id),
          loading: false
        }));
      } catch (error) {
        console.error('Failed to delete clue:', error);
        set({ error: 'Failed to delete clue', loading: false });
        throw error;
      }
    },

    getClue: (id) => {
      return get().clues.find(clue => clue.id === id);
    },

    // Clue discovery and status
    discoverClue: async (clueId, discoveryData) => {
      const discovery: ClueDiscovery = {
        ...discoveryData,
        clueId,
        timestamp: new Date(),
      };

      await db.clueDiscoveries.add(discovery);
      await get().updateClue(clueId, { 
        isDiscovered: true
      });

      set(state => ({
        discoveries: [...state.discoveries, discovery]
      }));
    },

    markClueAsResolved: async (clueId) => {
      await get().updateClue(clueId, { status: 'resolved' });
    },

    updateClueReliability: async (clueId, reliability) => {
      await get().updateClue(clueId, { reliability });
    },

    // Evidence management
    addEvidence: async (clueId, evidence) => {
      const clue = get().getClue(clueId);
      if (!clue) throw new Error('Clue not found');

      const newEvidence: ClueEvidence = {
        id: crypto.randomUUID(),
        ...evidence,
        discoveredAt: new Date(),
      };

      const updatedEvidence = [...clue.evidence, newEvidence];
      await get().updateClue(clueId, { evidence: updatedEvidence });
    },

    updateEvidence: async (clueId, evidenceId, updates) => {
      const clue = get().getClue(clueId);
      if (!clue) throw new Error('Clue not found');

      const updatedEvidence = clue.evidence.map(evidence =>
        evidence.id === evidenceId ? { ...evidence, ...updates } : evidence
      );

      await get().updateClue(clueId, { evidence: updatedEvidence });
    },

    removeEvidence: async (clueId, evidenceId) => {
      const clue = get().getClue(clueId);
      if (!clue) throw new Error('Clue not found');

      const updatedEvidence = clue.evidence.filter(evidence => evidence.id !== evidenceId);
      await get().updateClue(clueId, { evidence: updatedEvidence });
    },

    // Connection management
    addConnection: async (clueId, connection) => {
      const clue = get().getClue(clueId);
      if (!clue) throw new Error('Clue not found');

      const newConnection: ClueConnection = {
        id: crypto.randomUUID(),
        ...connection,
      };

      const updatedConnections = [...clue.connections, newConnection];
      await get().updateClue(clueId, { connections: updatedConnections });
    },

    updateConnection: async (clueId, connectionId, updates) => {
      const clue = get().getClue(clueId);
      if (!clue) throw new Error('Clue not found');

      const updatedConnections = clue.connections.map(connection =>
        connection.id === connectionId ? { ...connection, ...updates } : connection
      );

      await get().updateClue(clueId, { connections: updatedConnections });
    },

    removeConnection: async (clueId, connectionId) => {
      const clue = get().getClue(clueId);
      if (!clue) throw new Error('Clue not found');

      const updatedConnections = clue.connections.filter(connection => connection.id !== connectionId);
      await get().updateClue(clueId, { connections: updatedConnections });
    },

    // Investigation tracking
    recordInvestigation: async (investigation) => {
      const newInvestigation: ClueInvestigation = {
        id: crypto.randomUUID(),
        ...investigation,
        timestamp: new Date(),
      };

      await db.clueInvestigations.add(newInvestigation);
      set(state => ({
        investigations: [...state.investigations, newInvestigation]
      }));
    },

    getInvestigationHistory: (clueId) => {
      return get().investigations.filter(inv => inv.clueId === clueId);
    },

    // Clue board management
    createClueBoard: async (boardData) => {
      const board: ClueBoard = {
        id: crypto.randomUUID(),
        ...boardData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.clueBoards.add(board);
      set(state => ({
        clueBoards: [...state.clueBoards, board]
      }));

      return board.id;
    },

    updateClueBoard: async (boardId, updates) => {
      const updateData = {
        ...updates,
        updatedAt: new Date(),
      };

      await db.clueBoards.update(boardId, updateData);
      set(state => ({
        clueBoards: state.clueBoards.map(board =>
          board.id === boardId ? { ...board, ...updateData } : board
        )
      }));
    },

    deleteClueBoard: async (boardId) => {
      await db.clueBoards.delete(boardId);
      set(state => ({
        clueBoards: state.clueBoards.filter(board => board.id !== boardId)
      }));
    },

    addClueToBoard: async (boardId, clueId) => {
      const board = get().clueBoards.find(b => b.id === boardId);
      if (!board) throw new Error('Board not found');

      if (!board.clueIds.includes(clueId)) {
        const updatedClueIds = [...board.clueIds, clueId];
        await get().updateClueBoard(boardId, { clueIds: updatedClueIds });
      }
    },

    removeClueFromBoard: async (boardId, clueId) => {
      const board = get().clueBoards.find(b => b.id === boardId);
      if (!board) throw new Error('Board not found');

      const updatedClueIds = board.clueIds.filter(id => id !== clueId);
      await get().updateClueBoard(boardId, { clueIds: updatedClueIds });
    },

    // Case theory management
    createCaseTheory: async (theory) => {
      const caseTheory: CaseTheory = {
        id: crypto.randomUUID(),
        ...theory,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.caseTheories.add(caseTheory);
      set(state => ({
        caseTheories: [...state.caseTheories, caseTheory]
      }));

      return caseTheory.id;
    },

    updateCaseTheory: async (theoryId, updates) => {
      const updateData = {
        ...updates,
        updatedAt: new Date(),
      };

      await db.caseTheories.update(theoryId, updateData);
      set(state => ({
        caseTheories: state.caseTheories.map(theory =>
          theory.id === theoryId ? { ...theory, ...updateData } : theory
        )
      }));
    },

    deleteCaseTheory: async (theoryId) => {
      await db.caseTheories.delete(theoryId);
      set(state => ({
        caseTheories: state.caseTheories.filter(theory => theory.id !== theoryId)
      }));
    },

    // Utility functions
    getCluesByCategory: (category) => {
      return get().clues.filter(clue => clue.category === category);
    },

    getCluesByImportance: (importance) => {
      return get().clues.filter(clue => clue.importance === importance);
    },

    getCluesByArc: (arcId) => {
      return get().clues.filter(clue => clue.storyArc === arcId);
    },

    getDiscoveredClues: () => {
      return get().clues.filter(clue => clue.isDiscovered);
    },

    getUndiscoveredClues: () => {
      return get().clues.filter(clue => !clue.isDiscovered);
    },

    searchClues: (query) => {
      const searchTerm = query.toLowerCase();
      return get().clues.filter(clue => 
        clue.name.toLowerCase().includes(searchTerm) ||
        clue.title.toLowerCase().includes(searchTerm) ||
        clue.description.toLowerCase().includes(searchTerm) ||
        clue.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm)) ||
        clue.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    },

    getRelatedClues: (clueId) => {
      const clue = get().getClue(clueId);
      if (!clue) return [];

      const relatedIds = clue.connections.map(conn => conn.targetClueId);
      return get().clues.filter(c => relatedIds.includes(c.id));
    },

    getClueConnections: (clueId) => {
      const clue = get().getClue(clueId);
      return clue?.connections || [];
    },

    // Analysis functions
    analyzeClueReliability: (clueId) => {
      const clue = get().getClue(clueId);
      if (!clue) return { score: 0, factors: [] };

      let score = 50; // Base score
      const factors = [];

      // Factor in evidence reliability
      const confirmedEvidence = clue.evidence.filter(e => e.reliability === 'confirmed').length;
      const contradictedEvidence = clue.evidence.filter(e => e.reliability === 'contradicted').length;
      
      score += confirmedEvidence * 10;
      score -= contradictedEvidence * 15;
      
      if (confirmedEvidence > 0) factors.push(`${confirmedEvidence} confirmed evidence`);
      if (contradictedEvidence > 0) factors.push(`${contradictedEvidence} contradicted evidence`);

      // Factor in supporting connections
      const supportingConnections = clue.connections.filter(c => c.connectionType === 'supports').length;
      const contradictingConnections = clue.connections.filter(c => c.connectionType === 'contradicts').length;
      
      score += supportingConnections * 5;
      score -= contradictingConnections * 10;
      
      if (supportingConnections > 0) factors.push(`${supportingConnections} supporting connections`);
      if (contradictingConnections > 0) factors.push(`${contradictingConnections} contradicting connections`);

      return { 
        score: Math.max(0, Math.min(100, score)), 
        factors 
      };
    },

    findContradictingClues: (clueId) => {
      const clue = get().getClue(clueId);
      if (!clue) return [];

      const contradictingIds = clue.connections
        .filter(conn => conn.connectionType === 'contradicts')
        .map(conn => conn.targetClueId);

      return get().clues.filter(c => contradictingIds.includes(c.id));
    },

    getSupportingClues: (clueId) => {
      const clue = get().getClue(clueId);
      if (!clue) return [];

      const supportingIds = clue.connections
        .filter(conn => conn.connectionType === 'supports')
        .map(conn => conn.targetClueId);

      return get().clues.filter(c => supportingIds.includes(c.id));
    },

    // State management
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
    clearError: () => set({ error: null }),
  }))
);