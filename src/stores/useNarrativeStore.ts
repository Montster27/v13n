import { create } from 'zustand';

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

interface StoryArc {
  id: string;
  name: string;
  description: string;
  storyletIds: string[];
  startStoryletId?: string;
  endStoryletId?: string;
}

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
  
  addArc: (arc: Omit<StoryArc, 'id'>) => void;
  updateArc: (id: string, updates: Partial<StoryArc>) => void;
  deleteArc: (id: string) => void;
  
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
  
  addArc: (arc) => set((state) => ({
    arcs: [...state.arcs, { ...arc, id: crypto.randomUUID() }]
  })),
  
  updateArc: (id, updates) => set((state) => ({
    arcs: state.arcs.map(a => a.id === id ? { ...a, ...updates } : a)
  })),
  
  deleteArc: (id) => set((state) => ({
    arcs: state.arcs.filter(a => a.id !== id)
  })),
  
  setCurrentStorylet: (id) => set({ currentStoryletId: id }),
  setCurrentArc: (id) => set({ currentArcId: id })
}));