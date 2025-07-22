import { create } from 'zustand';

interface Character {
  id: string;
  name: string;
  role: string;
  traits: string[];
  interests: string[];
  background: string;
  relationships: Record<string, string>; // characterId -> relationship type
  createdAt: Date;
  updatedAt: Date;
}

interface Clue {
  id: string;
  name: string;
  description: string;
  minigameId?: string;
  discoveryChain: string[];
  prerequisiteClueIds: string[];
  associatedStoryletIds: string[];
  discovered: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface SocialState {
  characters: Character[];
  clues: Clue[];
  playerRelationships: Record<string, number>; // characterId -> relationship value
  
  // Character actions
  addCharacter: (character: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
  getCharacter: (id: string) => Character | undefined;
  
  // Clue actions
  addClue: (clue: Omit<Clue, 'id' | 'createdAt' | 'updatedAt' | 'discovered'>) => void;
  updateClue: (id: string, updates: Partial<Clue>) => void;
  deleteClue: (id: string) => void;
  discoverClue: (id: string) => void;
  getClue: (id: string) => Clue | undefined;
  
  // Relationship actions
  updateRelationship: (characterId: string, value: number) => void;
  getRelationship: (characterId: string) => number;
}

export const useSocialStore = create<SocialState>((set, get) => ({
  characters: [],
  clues: [],
  playerRelationships: {},
  
  addCharacter: (character) => set((state) => ({
    characters: [...state.characters, {
      ...character,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    }]
  })),
  
  updateCharacter: (id, updates) => set((state) => ({
    characters: state.characters.map(c => 
      c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c
    )
  })),
  
  deleteCharacter: (id) => set((state) => ({
    characters: state.characters.filter(c => c.id !== id)
  })),
  
  getCharacter: (id) => get().characters.find(c => c.id === id),
  
  addClue: (clue) => set((state) => ({
    clues: [...state.clues, {
      ...clue,
      id: crypto.randomUUID(),
      discovered: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }]
  })),
  
  updateClue: (id, updates) => set((state) => ({
    clues: state.clues.map(c => 
      c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c
    )
  })),
  
  deleteClue: (id) => set((state) => ({
    clues: state.clues.filter(c => c.id !== id)
  })),
  
  discoverClue: (id) => set((state) => ({
    clues: state.clues.map(c => 
      c.id === id ? { ...c, discovered: true, updatedAt: new Date() } : c
    )
  })),
  
  getClue: (id) => get().clues.find(c => c.id === id),
  
  updateRelationship: (characterId, value) => set((state) => ({
    playerRelationships: { ...state.playerRelationships, [characterId]: value }
  })),
  
  getRelationship: (characterId) => get().playerRelationships[characterId] || 0
}));