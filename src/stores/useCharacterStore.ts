import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { db } from '../db/database';
import type { Character, CharacterFormData, CharacterAttribute, CharacterTrait, CharacterRelationship } from '../types/character';

interface CharacterState {
  characters: Character[];
  loading: boolean;
  error: string | null;
}

interface CharacterActions {
  // Character CRUD operations
  loadCharacters: () => Promise<void>;
  addCharacter: (characterData: Omit<CharacterFormData, 'id'>) => Promise<string>;
  updateCharacter: (id: string, updates: Partial<CharacterFormData>) => Promise<void>;
  deleteCharacter: (id: string) => Promise<void>;
  getCharacter: (id: string) => Character | undefined;
  
  // Character attributes management
  addAttribute: (characterId: string, attribute: Omit<CharacterAttribute, 'id'>) => Promise<void>;
  updateAttribute: (characterId: string, attributeId: string, updates: Partial<CharacterAttribute>) => Promise<void>;
  removeAttribute: (characterId: string, attributeId: string) => Promise<void>;
  
  // Character traits management
  addTrait: (characterId: string, trait: Omit<CharacterTrait, 'id'>) => Promise<void>;
  updateTrait: (characterId: string, traitId: string, updates: Partial<CharacterTrait>) => Promise<void>;
  removeTrait: (characterId: string, traitId: string) => Promise<void>;
  
  // Character relationships management
  addRelationship: (characterId: string, relationship: Omit<CharacterRelationship, 'id'>) => Promise<void>;
  updateRelationship: (characterId: string, relationshipId: string, updates: Partial<CharacterRelationship>) => Promise<void>;
  removeRelationship: (characterId: string, relationshipId: string) => Promise<void>;
  
  // Utility functions
  getCharactersByCategory: (category: Character['category']) => Character[];
  getCharactersByImportance: (importance: Character['importance']) => Character[];
  searchCharacters: (query: string) => Character[];
  getCharacterRelationships: (characterId: string) => CharacterRelationship[];
  
  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

type CharacterStore = CharacterState & CharacterActions;

const initialState: CharacterState = {
  characters: [],
  loading: false,
  error: null,
};

export const useCharacterStore = create<CharacterStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Character CRUD operations
    loadCharacters: async () => {
      set({ loading: true, error: null });
      try {
        const characters = await db.characters.toArray();
        set({ characters: characters as Character[], loading: false });
      } catch (error) {
        console.error('Failed to load characters:', error);
        set({ error: 'Failed to load characters', loading: false });
      }
    },

    addCharacter: async (characterData) => {
      set({ loading: true, error: null });
      try {
        const character: Character = {
          id: crypto.randomUUID(),
          ...characterData,
          attributes: [],
          traits: [],
          relationships: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await db.characters.add(character);
        set(state => ({
          characters: [...state.characters, character],
          loading: false
        }));
        
        return character.id;
      } catch (error) {
        console.error('Failed to add character:', error);
        set({ error: 'Failed to add character', loading: false });
        throw error;
      }
    },

    updateCharacter: async (id, updates) => {
      set({ loading: true, error: null });
      try {
        const updateData = {
          ...updates,
          updatedAt: new Date(),
        };

        await db.characters.update(id, updateData);
        
        set(state => ({
          characters: state.characters.map(char =>
            char.id === id ? { ...char, ...updateData } : char
          ),
          loading: false
        }));
      } catch (error) {
        console.error('Failed to update character:', error);
        set({ error: 'Failed to update character', loading: false });
        throw error;
      }
    },

    deleteCharacter: async (id) => {
      set({ loading: true, error: null });
      try {
        await db.characters.delete(id);
        set(state => ({
          characters: state.characters.filter(char => char.id !== id),
          loading: false
        }));
      } catch (error) {
        console.error('Failed to delete character:', error);
        set({ error: 'Failed to delete character', loading: false });
        throw error;
      }
    },

    getCharacter: (id) => {
      return get().characters.find(char => char.id === id);
    },

    // Character attributes management
    addAttribute: async (characterId, attribute) => {
      const character = get().getCharacter(characterId);
      if (!character) throw new Error('Character not found');

      const newAttribute: CharacterAttribute = {
        id: crypto.randomUUID(),
        ...attribute,
      };

      const updatedAttributes = [...character.attributes, newAttribute];
      await get().updateCharacter(characterId, { 
        attributes: updatedAttributes 
      } as Partial<CharacterFormData>);
    },

    updateAttribute: async (characterId, attributeId, updates) => {
      const character = get().getCharacter(characterId);
      if (!character) throw new Error('Character not found');

      const updatedAttributes = character.attributes.map(attr =>
        attr.id === attributeId ? { ...attr, ...updates } : attr
      );

      await get().updateCharacter(characterId, { 
        attributes: updatedAttributes 
      } as Partial<CharacterFormData>);
    },

    removeAttribute: async (characterId, attributeId) => {
      const character = get().getCharacter(characterId);
      if (!character) throw new Error('Character not found');

      const updatedAttributes = character.attributes.filter(attr => attr.id !== attributeId);
      await get().updateCharacter(characterId, { 
        attributes: updatedAttributes 
      } as Partial<CharacterFormData>);
    },

    // Character traits management
    addTrait: async (characterId, trait) => {
      const character = get().getCharacter(characterId);
      if (!character) throw new Error('Character not found');

      const newTrait: CharacterTrait = {
        id: crypto.randomUUID(),
        ...trait,
      };

      const updatedTraits = [...character.traits, newTrait];
      await get().updateCharacter(characterId, { 
        traits: updatedTraits 
      } as Partial<CharacterFormData>);
    },

    updateTrait: async (characterId, traitId, updates) => {
      const character = get().getCharacter(characterId);
      if (!character) throw new Error('Character not found');

      const updatedTraits = character.traits.map(trait =>
        trait.id === traitId ? { ...trait, ...updates } : trait
      );

      await get().updateCharacter(characterId, { 
        traits: updatedTraits 
      } as Partial<CharacterFormData>);
    },

    removeTrait: async (characterId, traitId) => {
      const character = get().getCharacter(characterId);
      if (!character) throw new Error('Character not found');

      const updatedTraits = character.traits.filter(trait => trait.id !== traitId);
      await get().updateCharacter(characterId, { 
        traits: updatedTraits 
      } as Partial<CharacterFormData>);
    },

    // Character relationships management
    addRelationship: async (characterId, relationship) => {
      const character = get().getCharacter(characterId);
      if (!character) throw new Error('Character not found');

      const newRelationship: CharacterRelationship = {
        id: crypto.randomUUID(),
        ...relationship,
        lastUpdated: new Date(),
      };

      const updatedRelationships = [...character.relationships, newRelationship];
      await get().updateCharacter(characterId, { 
        relationships: updatedRelationships 
      } as Partial<CharacterFormData>);
    },

    updateRelationship: async (characterId, relationshipId, updates) => {
      const character = get().getCharacter(characterId);
      if (!character) throw new Error('Character not found');

      const updatedRelationships = character.relationships.map(rel =>
        rel.id === relationshipId ? { ...rel, ...updates, lastUpdated: new Date() } : rel
      );

      await get().updateCharacter(characterId, { 
        relationships: updatedRelationships 
      } as Partial<CharacterFormData>);
    },

    removeRelationship: async (characterId, relationshipId) => {
      const character = get().getCharacter(characterId);
      if (!character) throw new Error('Character not found');

      const updatedRelationships = character.relationships.filter(rel => rel.id !== relationshipId);
      await get().updateCharacter(characterId, { 
        relationships: updatedRelationships 
      } as Partial<CharacterFormData>);
    },

    // Utility functions
    getCharactersByCategory: (category) => {
      return get().characters.filter(char => char.category === category);
    },

    getCharactersByImportance: (importance) => {
      return get().characters.filter(char => char.importance === importance);
    },

    searchCharacters: (query) => {
      const searchTerm = query.toLowerCase();
      return get().characters.filter(char => 
        char.name.toLowerCase().includes(searchTerm) ||
        char.displayName?.toLowerCase().includes(searchTerm) ||
        char.description.toLowerCase().includes(searchTerm) ||
        char.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    },

    getCharacterRelationships: (characterId) => {
      const character = get().getCharacter(characterId);
      return character?.relationships || [];
    },

    // State management
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
    clearError: () => set({ error: null }),
  }))
);