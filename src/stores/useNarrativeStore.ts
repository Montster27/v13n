import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { type StoryArc } from '../types/narrative';
import { db, serializeStorylet, deserializeStorylet, serializeStoryArc, deserializeStoryArc } from '../lib/db';

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
  
  // Actions
  addStorylet: (storylet: Omit<Storylet, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateStorylet: (id: string, updates: Partial<Storylet>) => Promise<void>;
  deleteStorylet: (id: string) => Promise<void>;
  getStorylet: (id: string) => Storylet | undefined;
  
  addStoryArc: (arc: Omit<StoryArc, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateStoryArc: (id: string, updates: Partial<StoryArc>) => Promise<void>;
  deleteStoryArc: (id: string) => Promise<void>;
  getArc: (id: string) => StoryArc | undefined;
  
  // Data loading
  loadStorylets: () => Promise<void>;
  loadStoryArcs: () => Promise<void>;
  
  setCurrentStorylet: (id: string | null) => void;
  setCurrentArc: (id: string | null) => void;
}

export const useNarrativeStore = create<NarrativeState>()(subscribeWithSelector((set, get) => ({
  storylets: [],
  arcs: [],
  currentStoryletId: null,
  currentArcId: null,
  
  // Storylet actions with Dexie persistence
  addStorylet: async (storylet) => {
    const id = crypto.randomUUID();
    const newStorylet = {
      ...storylet,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    try {
      // Save to Dexie
      await db.storylets.add(serializeStorylet(newStorylet));
      
      // Update state
      set((state) => ({
        storylets: [...state.storylets, newStorylet]
      }));
      
      return id;
    } catch (error) {
      console.error('Failed to save storylet:', error);
      throw error;
    }
  },
  
  updateStorylet: async (id, updates) => {
    try {
      const updatedStorylet = {
        ...updates,
        updatedAt: new Date()
      };
      
      // Update in Dexie
      await db.storylets.update(id, serializeStorylet({ id, ...updatedStorylet }));
      
      // Update state
      set((state) => ({
        storylets: state.storylets.map(s => 
          s.id === id ? { ...s, ...updatedStorylet } : s
        )
      }));
    } catch (error) {
      console.error('Failed to update storylet:', error);
      throw error;
    }
  },
  
  deleteStorylet: async (id) => {
    try {
      // Delete from Dexie
      await db.storylets.delete(id);
      
      // Update state
      set((state) => ({
        storylets: state.storylets.filter(s => s.id !== id)
      }));
    } catch (error) {
      console.error('Failed to delete storylet:', error);
      throw error;
    }
  },
  
  getStorylet: (id) => get().storylets.find(s => s.id === id),
  
  // StoryArc actions with Dexie persistence
  addStoryArc: async (arc) => {
    const id = crypto.randomUUID();
    const newArc = {
      ...arc,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    try {
      // Save to Dexie
      await db.storyArcs.add(serializeStoryArc(newArc));
      
      // Update state
      set((state) => ({
        arcs: [...state.arcs, newArc]
      }));
      
      return id;
    } catch (error) {
      console.error('Failed to save story arc:', error);
      throw error;
    }
  },
  
  updateStoryArc: async (id, updates) => {
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
        )
      }));
    } catch (error) {
      console.error('Failed to update story arc:', error);
      throw error;
    }
  },
  
  deleteStoryArc: async (id) => {
    try {
      // Delete from Dexie
      await db.storyArcs.delete(id);
      
      // Update state
      set((state) => ({
        arcs: state.arcs.filter(a => a.id !== id)
      }));
    } catch (error) {
      console.error('Failed to delete story arc:', error);
      throw error;
    }
  },
  
  getArc: (id) => get().arcs.find(a => a.id === id),
  
  // Data loading
  loadStorylets: async () => {
    try {
      const storylets = await db.storylets.toArray();
      set({
        storylets: storylets.map(deserializeStorylet)
      });
    } catch (error) {
      console.error('Failed to load storylets:', error);
    }
  },
  
  loadStoryArcs: async () => {
    try {
      const arcs = await db.storyArcs.toArray();
      set({
        arcs: arcs.map(deserializeStoryArc)
      });
    } catch (error) {
      console.error('Failed to load story arcs:', error);
    }
  },
  
  setCurrentStorylet: (id) => set({ currentStoryletId: id }),
  setCurrentArc: (id) => set({ currentArcId: id })
})));