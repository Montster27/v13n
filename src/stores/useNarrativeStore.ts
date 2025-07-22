import { create } from 'zustand';
import { type StoryArc } from '../types/narrative';

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
  addStorylet: (storylet: Omit<Storylet, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateStorylet: (id: string, updates: Partial<Storylet>) => void;
  deleteStorylet: (id: string) => void;
  getStorylet: (id: string) => Storylet | undefined;
  
  addStoryArc: (arc: Omit<StoryArc, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateStoryArc: (id: string, updates: Partial<StoryArc>) => void;
  deleteStoryArc: (id: string) => void;
  getArc: (id: string) => StoryArc | undefined;
  
  setCurrentStorylet: (id: string | null) => void;
  setCurrentArc: (id: string | null) => void;
}

export const useNarrativeStore = create<NarrativeState>((set, get) => ({
  storylets: [],
  arcs: [],
  currentStoryletId: null,
  currentArcId: null,
  
  addStorylet: (storylet) => set((state) => ({
    storylets: [...state.storylets, {
      ...storylet,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    }]
  })),
  
  updateStorylet: (id, updates) => set((state) => ({
    storylets: state.storylets.map(s => 
      s.id === id ? { ...s, ...updates, updatedAt: new Date() } : s
    )
  })),
  
  deleteStorylet: (id) => set((state) => ({
    storylets: state.storylets.filter(s => s.id !== id)
  })),
  
  getStorylet: (id) => get().storylets.find(s => s.id === id),
  
  addStoryArc: (arc) => set((state) => ({
    arcs: [...state.arcs, { 
      ...arc, 
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }]
  })),
  
  updateStoryArc: (id, updates) => set((state) => ({
    arcs: state.arcs.map(a => 
      a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
    )
  })),
  
  deleteStoryArc: (id) => set((state) => ({
    arcs: state.arcs.filter(a => a.id !== id)
  })),
  
  getArc: (id) => get().arcs.find(a => a.id === id),
  
  setCurrentStorylet: (id) => set({ currentStoryletId: id }),
  setCurrentArc: (id) => set({ currentArcId: id })
}));