// Character type definitions for Phase 4

export interface CharacterAttribute {
  id: string;
  name: string;
  value: number;
  maxValue?: number;
  description?: string;
}

export interface CharacterRelationship {
  id: string;
  characterId: string;
  type: 'trust' | 'respect' | 'fear' | 'love' | 'hate' | 'loyalty' | 'custom';
  value: number;
  maxValue?: number;
  description?: string;
  lastUpdated?: Date;
}

export interface CharacterTrait {
  id: string;
  name: string;
  type: 'personality' | 'skill' | 'background' | 'physical' | 'mental';
  value?: number;
  description: string;
}

export interface Character {
  id: string;
  name: string;
  displayName?: string;
  description: string;
  biography?: string;
  
  // Visual representation
  avatar?: string;
  color?: string;
  
  // Character stats and traits
  attributes: CharacterAttribute[];
  traits: CharacterTrait[];
  relationships: CharacterRelationship[];
  
  // Storylet integration
  availableInStorylets: string[]; // List of storylet IDs where this character appears
  unlockedBy?: string[]; // Prerequisites to meet this character
  
  // Metadata
  tags: string[];
  category: 'main' | 'supporting' | 'background' | 'antagonist' | 'ally';
  importance: 'critical' | 'major' | 'minor';
  
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
  
  // Status
  status: 'active' | 'deceased' | 'missing' | 'hidden';
}

export interface CharacterFormData {
  id?: string;
  name: string;
  displayName?: string;
  description: string;
  biography?: string;
  avatar?: string;
  color?: string;
  tags: string[];
  category: Character['category'];
  importance: Character['importance'];
  status: Character['status'];
  availableInStorylets: string[];
  unlockedBy: string[];
}

// Character interaction types for storylets
export interface CharacterInteraction {
  characterId: string;
  interactionType: 'dialogue' | 'trade' | 'combat' | 'investigation' | 'relationship';
  requiredRelationshipLevel?: number;
  requiredAttributes?: { attributeId: string; minValue: number }[];
  outcomes: {
    success?: CharacterInteractionOutcome;
    failure?: CharacterInteractionOutcome;
  };
}

export interface CharacterInteractionOutcome {
  relationshipChanges: { characterId: string; change: number }[];
  attributeChanges: { characterId: string; attributeId: string; change: number }[];
  unlockedStorylets?: string[];
  unlockedClues?: string[];
}