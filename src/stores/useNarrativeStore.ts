import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { type StoryArc } from '../types/narrative';
import { db, serializeStorylet, deserializeStorylet, serializeStoryArc, deserializeStoryArc } from '../lib/db';
import { DatabaseValidator } from '../utils/dataValidation';
import type { ExecutionResult } from '../systems/StoryletExecutionEngine';

interface Storylet {
  id: string;
  title: string;
  description: string;
  content: string;
  triggers: any[];
  choices: any[];
  effects: any[];
  storyArc?: string;
  status: 'dev' | 'stage' | 'live';
  tags?: string[];
  priority?: number;
  estimatedPlayTime?: number;
  prerequisites?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// StoryArc is now imported from types/narrative.ts

interface NarrativeState {
  storylets: Storylet[];
  arcs: StoryArc[];
  currentStoryletId: string | null;
  currentArcId: string | null;
  currentExecution?: ExecutionResult;
  
  // Loading states
  loading: {
    storylets: boolean;
    arcs: boolean;
    operations: Map<string, boolean>;
  };
  
  // Actions
  addStorylet: (storylet: Omit<Storylet, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateStorylet: (id: string, updates: Partial<Storylet>) => Promise<void>;
  deleteStorylet: (id: string) => Promise<void>;
  getStorylet: (id: string) => Storylet | undefined;
  markStoryletCompleted: (id: string) => Promise<void>;
  
  addStoryArc: (arc: Omit<StoryArc, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateStoryArc: (id: string, updates: Partial<StoryArc>) => Promise<void>;
  deleteStoryArc: (id: string) => Promise<void>;
  getArc: (id: string) => StoryArc | undefined;
  
  // Data loading
  loadStorylets: () => Promise<void>;
  loadStoryArcs: () => Promise<void>;
  
  setCurrentStorylet: (id: string | null) => void;
  setCurrentArc: (id: string | null) => void;
  
  // Storylet execution
  triggerStorylet: (id: string, context?: any) => Promise<ExecutionResult>;
  executeChoice: (choiceId: string) => Promise<void>;
}

export const useNarrativeStore = create<NarrativeState>()(subscribeWithSelector((set, get) => ({
  storylets: [],
  arcs: [],
  currentStoryletId: null,
  currentArcId: null,
  currentExecution: undefined,
  
  // Loading states
  loading: {
    storylets: false,
    arcs: false,
    operations: new Map()
  },
  
  // Storylet actions with Dexie persistence
  addStorylet: async (storylet) => {
    const operationId = `add-storylet-${Date.now()}`;
    
    // Set loading state
    set((state) => ({
      loading: {
        ...state.loading,
        operations: new Map(state.loading.operations).set(operationId, true)
      }
    }));
    
    try {
      // Validate and sanitize data before saving
      const validation = await DatabaseValidator.validateBeforeWrite('storylet', storylet);
      DatabaseValidator.throwIfInvalid(validation);
      
      const sanitizedData = validation.sanitizedData!;
      const id = crypto.randomUUID();
      const newStorylet = {
        ...sanitizedData,
        id,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Save to Dexie
      await db.storylets.add(serializeStorylet(newStorylet));
      
      // Update state
      set((state) => ({
        storylets: [...state.storylets, newStorylet],
        loading: {
          ...state.loading,
          operations: new Map(state.loading.operations).set(operationId, false)
        }
      }));
      
      return id;
    } catch (error) {
      console.error('Failed to save storylet:', error);
      // Clear loading state on error
      set((state) => ({
        loading: {
          ...state.loading,
          operations: new Map(state.loading.operations).set(operationId, false)
        }
      }));
      throw error;
    }
  },
  
  updateStorylet: async (id, updates) => {
    const operationId = `update-storylet-${id}`;
    
    // Set loading state
    set((state) => ({
      loading: {
        ...state.loading,
        operations: new Map(state.loading.operations).set(operationId, true)
      }
    }));
    
    try {
      // Get existing storylet first
      const existingStorylet = await db.storylets.get(id);
      if (!existingStorylet) {
        throw new Error(`Storylet with id ${id} not found`);
      }
      
      // Merge existing data with updates for validation
      const fullStoryletData = {
        ...existingStorylet,
        ...updates
      };
      
      // Validate and sanitize the complete storylet
      const validation = await DatabaseValidator.validateBeforeWrite('storylet', fullStoryletData);
      DatabaseValidator.throwIfInvalid(validation);
      
      const sanitizedUpdates = validation.sanitizedData!;
      const updatedStorylet = {
        ...sanitizedUpdates,
        updatedAt: new Date()
      };
      
      // Update in Dexie
      await db.storylets.update(id, serializeStorylet({ id, ...updatedStorylet }));
      
      // Update state
      set((state) => ({
        storylets: state.storylets.map(s => 
          s.id === id ? { ...s, ...updatedStorylet } : s
        ),
        loading: {
          ...state.loading,
          operations: new Map(state.loading.operations).set(operationId, false)
        }
      }));
    } catch (error) {
      console.error('Failed to update storylet:', error);
      // Clear loading state on error
      set((state) => ({
        loading: {
          ...state.loading,
          operations: new Map(state.loading.operations).set(operationId, false)
        }
      }));
      throw error;
    }
  },
  
  deleteStorylet: async (id) => {
    const operationId = `delete-storylet-${id}`;
    
    // Set loading state
    set((state) => ({
      loading: {
        ...state.loading,
        operations: new Map(state.loading.operations).set(operationId, true)
      }
    }));
    
    try {
      // Delete from Dexie
      await db.storylets.delete(id);
      
      // Update state
      set((state) => ({
        storylets: state.storylets.filter(s => s.id !== id),
        loading: {
          ...state.loading,
          operations: new Map(state.loading.operations).set(operationId, false)
        }
      }));
    } catch (error) {
      console.error('Failed to delete storylet:', error);
      // Clear loading state on error
      set((state) => ({
        loading: {
          ...state.loading,
          operations: new Map(state.loading.operations).set(operationId, false)
        }
      }));
      throw error;
    }
  },
  
  getStorylet: (id) => get().storylets.find(s => s.id === id),
  
  markStoryletCompleted: async (id: string) => {
    try {
      // TODO: Implement storylet completion tracking
      // This could involve updating a completedStorylets array or status field
      console.log(`Marking storylet ${id} as completed`);
      
      // For now, just log the completion
      // In a full implementation, this would update the storylet's completion status
      // and possibly trigger arc progression or unlock new storylets
    } catch (error) {
      console.error('Failed to mark storylet as completed:', error);
      throw error;
    }
  },
  
  // StoryArc actions with Dexie persistence
  addStoryArc: async (arc) => {
    const operationId = `add-arc-${Date.now()}`;
    
    // Set loading state
    set((state) => ({
      loading: {
        ...state.loading,
        operations: new Map(state.loading.operations).set(operationId, true)
      }
    }));
    
    try {
      const id = crypto.randomUUID();
      const newArc = {
        ...arc,
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Save to Dexie
      await db.storyArcs.add(serializeStoryArc(newArc));
      
      // Update state
      set((state) => ({
        arcs: [...state.arcs, newArc],
        loading: {
          ...state.loading,
          operations: new Map(state.loading.operations).set(operationId, false)
        }
      }));
      
      return id;
    } catch (error) {
      console.error('Failed to save story arc:', error);
      // Clear loading state on error
      set((state) => ({
        loading: {
          ...state.loading,
          operations: new Map(state.loading.operations).set(operationId, false)
        }
      }));
      throw error;
    }
  },
  
  updateStoryArc: async (id, updates) => {
    const operationId = `update-arc-${id}`;
    
    // Set loading state
    set((state) => ({
      loading: {
        ...state.loading,
        operations: new Map(state.loading.operations).set(operationId, true)
      }
    }));
    
    try {
      const updatedArc = {
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      // Update in Dexie
      await db.storyArcs.update(id, serializeStoryArc({ id, ...updatedArc }));
      
      // Update state
      set((state) => ({
        arcs: state.arcs.map(a => 
          a.id === id ? { ...a, ...updatedArc } : a
        ),
        loading: {
          ...state.loading,
          operations: new Map(state.loading.operations).set(operationId, false)
        }
      }));
    } catch (error) {
      console.error('Failed to update story arc:', error);
      // Clear loading state on error
      set((state) => ({
        loading: {
          ...state.loading,
          operations: new Map(state.loading.operations).set(operationId, false)
        }
      }));
      throw error;
    }
  },
  
  deleteStoryArc: async (id) => {
    const operationId = `delete-arc-${id}`;
    
    // Set loading state
    set((state) => ({
      loading: {
        ...state.loading,
        operations: new Map(state.loading.operations).set(operationId, true)
      }
    }));
    
    try {
      // Delete from Dexie
      await db.storyArcs.delete(id);
      
      // Update state
      set((state) => ({
        arcs: state.arcs.filter(a => a.id !== id),
        loading: {
          ...state.loading,
          operations: new Map(state.loading.operations).set(operationId, false)
        }
      }));
    } catch (error) {
      console.error('Failed to delete story arc:', error);
      // Clear loading state on error
      set((state) => ({
        loading: {
          ...state.loading,
          operations: new Map(state.loading.operations).set(operationId, false)
        }
      }));
      throw error;
    }
  },
  
  getArc: (id) => get().arcs.find(a => a.id === id),
  
  // Data loading
  loadStorylets: async () => {
    // Set loading state
    set((state) => ({
      loading: {
        ...state.loading,
        storylets: true
      }
    }));
    
    try {
      const storylets = await db.storylets.toArray();
      set((state) => ({
        storylets: storylets.map(deserializeStorylet),
        loading: {
          ...state.loading,
          storylets: false
        }
      }));
    } catch (error) {
      console.error('Failed to load storylets:', error);
      // Clear loading state on error
      set((state) => ({
        loading: {
          ...state.loading,
          storylets: false
        }
      }));
    }
  },
  
  loadStoryArcs: async () => {
    // Set loading state
    set((state) => ({
      loading: {
        ...state.loading,
        arcs: true
      }
    }));
    
    try {
      const arcs = await db.storyArcs.toArray();
      set((state) => ({
        arcs: arcs.map(deserializeStoryArc),
        loading: {
          ...state.loading,
          arcs: false
        }
      }));
    } catch (error) {
      console.error('Failed to load story arcs:', error);
      // Clear loading state on error
      set((state) => ({
        loading: {
          ...state.loading,
          arcs: false
        }
      }));
    }
  },
  
  setCurrentStorylet: (id) => set({ currentStoryletId: id }),
  setCurrentArc: (id) => set({ currentArcId: id }),
  
  // Trigger storylet execution (placeholder for now)
  triggerStorylet: async (id, context) => {
    try {
      // Import the execution engine dynamically to avoid circular dependencies
      const { storyletEngine } = await import('../systems/StoryletExecutionEngine');
      
      // Execute the storylet using the execution engine
      const result = await storyletEngine.executeStorylet(id, context);
      
      if (result.success) {
        // Update current storylet
        set({ currentStoryletId: id });
        
        // Store execution result for UI access
        set((state) => ({
          ...state,
          currentExecution: result
        }));
        
        console.log(`Storylet "${result.storylet.title}" executed successfully`);
        console.log(`Available choices: ${result.availableChoices.length}`);
        
        if (result.warnings.length > 0) {
          console.warn('Storylet execution warnings:', result.warnings);
        }
      } else {
        console.error('Storylet execution failed:', result.errors);
      }
      
      return result;
    } catch (error) {
      console.error('Failed to trigger storylet:', error);
      throw error;
    }
  },

  executeChoice: async (choiceId: string) => {
    try {
      // Import the execution engine dynamically to avoid circular dependencies
      const { storyletEngine } = await import('../systems/StoryletExecutionEngine');
      
      // Execute the choice using the execution engine
      const result = await storyletEngine.executeChoice(choiceId);
      
      if (result.success) {
        console.log(`Choice "${result.choice.text}" executed successfully`);
        
        // Clear current execution since choice was made
        set((state) => ({
          ...state,
          currentExecution: undefined
        }));
        
        if (result.warnings.length > 0) {
          console.warn('Choice execution warnings:', result.warnings);
        }
      } else {
        console.error('Choice execution failed:', result.errors);
      }
      
      return result;
    } catch (error) {
      console.error('Failed to execute choice:', error);
      throw error;
    }
  }
})));