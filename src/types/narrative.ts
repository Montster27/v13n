/**
 * Narrative Types - Story arcs and characters
 */

export interface StoryArc {
  id: string;
  name: string;
  description: string;
  estimatedLength?: number; // in minutes
  prerequisites?: string[]; // Other arc IDs that must be completed first
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Character {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  traits: CharacterTrait[];
  interests: string[];
  relationships: CharacterRelationship[];
  background: string;
  currentMood?: number; // -100 to 100
  trustLevel?: number; // 0 to 100
  createdAt: string;
  updatedAt: string;
}

export interface CharacterTrait {
  id: string;
  name: string;
  value: number; // Usually -100 to 100 or 0 to 100
  description?: string;
}

export interface CharacterRelationship {
  id: string;
  characterId: string; // The other character
  type: 'friend' | 'enemy' | 'romantic' | 'mentor' | 'family' | 'rival' | 'stranger';
  strength: number; // 0 to 100
  notes?: string;
}

export interface Clue {
  id: string;
  title: string;
  description: string;
  content: string; // Full clue text
  category: 'evidence' | 'testimony' | 'document' | 'object' | 'observation';
  importance: 'minor' | 'major' | 'critical';
  discoveredBy?: string; // Character ID who discovered it
  linkedStorylets: string[]; // Storylet IDs where this clue can be discovered
  linkedMinigames?: string[]; // Minigame IDs that can reveal this clue
  prerequisites?: string[]; // Other clue IDs required first
  chains?: string[]; // Clues that this one leads to
  tags: string[];
  isDiscovered: boolean;
  discoveredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArcProgress {
  arcId: string;
  currentStoryletId?: string;
  completedStorylets: string[];
  discoveredClues: string[];
  characterRelationships: { [characterId: string]: number };
  isCompleted: boolean;
  completedAt?: string;
  startedAt: string;
}