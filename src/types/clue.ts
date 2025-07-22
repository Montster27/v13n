// Clue type definitions for Phase 4

export interface ClueEvidence {
  id: string;
  type: 'physical' | 'testimony' | 'document' | 'digital' | 'observation' | 'deduction';
  description: string;
  reliability: 'confirmed' | 'likely' | 'uncertain' | 'contradicted';
  source?: string; // Character ID or location ID
  discoveredAt?: Date;
}

export interface ClueConnection {
  id: string;
  targetClueId: string;
  connectionType: 'supports' | 'contradicts' | 'prerequisite' | 'related' | 'leads_to';
  strength: 'weak' | 'moderate' | 'strong';
  description?: string;
}

export interface Clue {
  id: string;
  name: string;
  title: string;
  description: string;
  fullDescription?: string;
  
  // Clue classification
  category: 'evidence' | 'testimony' | 'theory' | 'fact' | 'lead' | 'red_herring';
  type: 'physical' | 'digital' | 'social' | 'logical' | 'temporal';
  importance: 'critical' | 'major' | 'minor' | 'trivial';
  
  // Minigame integration
  isMinigame: boolean;
  minigameConfig?: MinigameConfig;
  
  // Discovery and availability
  isDiscovered: boolean;
  discoveredBy?: string; // Player or character ID who discovered it
  discoveredAt?: Date;
  discoveredVia?: string; // Storylet ID or method
  
  // Prerequisites and conditions
  prerequisites: string[]; // Other clue IDs needed before this can be discovered
  requiredStorylets: string[]; // Storylets that must be completed
  requiredCharacterInteractions: string[]; // Character IDs that must be met/interacted with
  
  // Evidence and connections
  evidence: ClueEvidence[];
  connections: ClueConnection[];
  
  // Investigation tracking
  investigationLevel: 'superficial' | 'detailed' | 'exhaustive';
  reliability: 'confirmed' | 'likely' | 'uncertain' | 'false';
  
  // Storylet integration
  unlocksStorylets: string[]; // Storylets this clue makes available
  mentionedInStorylets: string[]; // Storylets where this clue is referenced
  
  // Metadata
  tags: string[];
  keywords: string[]; // For searching and cross-referencing
  
  // Visual and narrative
  icon?: string;
  color?: string;
  narrativeWeight: number; // How important this is to the main story (1-10)
  
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
  
  // Status
  status: 'active' | 'resolved' | 'abandoned' | 'red_herring';
}

export interface ClueFormData {
  id?: string;
  name: string;
  title: string;
  description: string;
  fullDescription?: string;
  category: Clue['category'];
  type: Clue['type'];
  importance: Clue['importance'];
  investigationLevel: Clue['investigationLevel'];
  reliability: Clue['reliability'];
  status: Clue['status'];
  tags: string[];
  keywords: string[];
  narrativeWeight: number;
  icon?: string;
  color?: string;
  prerequisites: string[];
  requiredStorylets: string[];
  requiredCharacterInteractions: string[];
  unlocksStorylets: string[];
  isDiscovered?: boolean;
  evidence?: ClueEvidence[];
  connections?: ClueConnection[];
  isMinigame: boolean;
  minigameConfig?: MinigameConfig;
}

// Clue discovery and investigation
export interface ClueDiscovery {
  clueId: string;
  discoveryMethod: 'storylet' | 'character_interaction' | 'investigation' | 'deduction' | 'event';
  discoveryContext?: string; // Additional context about how it was discovered
  discoveredBy: string; // Player or character ID
  timestamp: Date;
  storyletId?: string; // If discovered through a storylet
  characterId?: string; // If discovered through character interaction
}

export interface ClueInvestigation {
  id: string;
  clueId: string;
  investigationStep: number;
  method: 'examine' | 'research' | 'interview' | 'analyze' | 'cross_reference';
  findings: string;
  newEvidenceFound: ClueEvidence[];
  newConnectionsFound: ClueConnection[];
  timeSpent: number; // In minutes
  resourcesUsed?: string[]; // Items or abilities used
  success: boolean;
  timestamp: Date;
}

// Clue board and organization
export interface ClueBoard {
  id: string;
  name: string;
  description?: string;
  clueIds: string[];
  connectionMappings: { from: string; to: string; type: string }[];
  theories: CaseTheory[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CaseTheory {
  id: string;
  title: string;
  description: string;
  supportingClues: string[];
  contradictingClues: string[];
  confidence: number; // 0-100
  status: 'active' | 'proven' | 'disproven' | 'abandoned';
  createdAt?: Date;
  updatedAt?: Date;
}

// Minigame system types
export interface MinigameConfig {
  id: string;
  type: 'memory_cards' | 'logic_puzzle' | 'sequence_match' | 'word_puzzle' | 'reaction_time' | 'pattern_recognition';
  title: string;
  introduction: string; // Scene-setting text before the minigame
  instructions: string; // How to play instructions
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  timeLimit?: number; // Seconds, optional
  maxAttempts?: number; // Number of tries allowed
  
  // Outcome configuration
  successStoryletId: string; // Storylet to trigger on success
  failureStoryletId: string; // Storylet to trigger on failure
  partialSuccessStoryletId?: string; // Optional intermediate outcome
  
  // Minigame-specific settings
  gameSettings: MinigameSettings;
  
  // Visual theming
  theme?: 'default' | 'noir' | 'vintage' | 'modern' | 'fantasy';
  backgroundColor?: string;
  accentColor?: string;
}

export interface MinigameSettings {
  // Memory Cards
  cardCount?: number; // Number of card pairs
  cardSetId?: string; // ID of card set to use (e.g., 'retro-80s')
  cardTypes?: string[]; // Types of cards (symbols, images, etc.) - deprecated in favor of cardSetId
  flipTime?: number; // Time cards stay visible
  
  // Logic Puzzle
  gridSize?: number; // For grid-based puzzles
  complexity?: number; // Number of constraints/rules
  
  // Sequence Match
  sequenceLength?: number;
  showTime?: number; // How long sequence is shown
  
  // Pattern Recognition
  patternComplexity?: number;
  distractors?: number; // Number of false patterns
  
  // Reaction Time
  targetCount?: number;
  randomDelay?: boolean;
  
  // Word Puzzle
  wordLength?: number;
  vocabulary?: string[]; // Custom word list
  hints?: boolean;
}

export interface MinigameResult {
  clueId: string;
  minigameType: string;
  success: boolean;
  score: number; // 0-100
  timeSpent: number; // Seconds
  attemptsUsed: number;
  triggeredStoryletId: string; // Which storylet was triggered as a result
  completedAt: Date;
  details?: {
    moves?: number;
    accuracy?: number;
    bonusPoints?: number;
    perfectRounds?: number;
  };
}

export interface MinigameAttempt {
  id: string;
  clueId: string;
  playerId: string;
  result: MinigameResult;
  timestamp: Date;
}