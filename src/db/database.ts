import Dexie, { type Table } from 'dexie';
import type { ClueEvidence, ClueConnection, CaseTheory, MinigameConfig } from '../types/clue';
import type { StoryletTrigger, StoryletChoice, StoryletEffect } from '../types/storylet';
import type { CharacterRelationship, CharacterAttribute, CharacterTrait } from '../types/character';

// Define the database schema interfaces
interface DbConnectionMapping {
  from: string;
  to: string;
  type: string;
}


interface DbMinigameResultDetails {
  moves?: number;
  accuracy?: number;
  bonusPoints?: number;
  perfectRounds?: number;
}

interface DbImportData {
  data: {
    storylets?: DbStorylet[];
    storyArcs?: DbStoryArc[];
    characters?: DbCharacter[];
    clues?: DbClue[];
    gameSaves?: DbGameSave[];
  };
}
export interface DbStorylet {
  id?: string;
  title: string;
  description: string;
  content: string;
  triggers: StoryletTrigger[];
  choices: StoryletChoice[];
  effects: StoryletEffect[];
  storyArc?: string;
  status: 'dev' | 'stage' | 'live';
  createdAt: Date;
  updatedAt: Date;
}

export interface DbStoryArc {
  id?: string;
  name: string;
  description: string;
  storyletIds: string[];
  startStoryletId?: string;
  endStoryletId?: string;
}

export interface DbCharacter {
  id?: string;
  name: string;
  displayName?: string;
  description: string;
  biography?: string;
  avatar?: string;
  color?: string;
  attributes: CharacterAttribute[];
  traits: CharacterTrait[];
  relationships: CharacterRelationship[];
  availableInStorylets: string[];
  unlockedBy?: string[];
  tags: string[];
  category: 'main' | 'supporting' | 'background' | 'antagonist' | 'ally';
  importance: 'critical' | 'major' | 'minor';
  status: 'active' | 'deceased' | 'missing' | 'hidden';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DbClue {
  id?: string;
  name: string;
  title: string;
  description: string;
  fullDescription?: string;
  category: 'evidence' | 'testimony' | 'theory' | 'fact' | 'lead' | 'red_herring';
  type: 'physical' | 'digital' | 'social' | 'logical' | 'temporal';
  importance: 'critical' | 'major' | 'minor' | 'trivial';
  isDiscovered: boolean;
  discoveredBy?: string;
  discoveredAt?: Date;
  discoveredVia?: string;
  prerequisites: string[];
  requiredStorylets: string[];
  requiredCharacterInteractions: string[];
  evidence: ClueEvidence[];
  connections: ClueConnection[];
  investigationLevel: 'superficial' | 'detailed' | 'exhaustive';
  reliability: 'confirmed' | 'likely' | 'uncertain' | 'false';
  unlocksStorylets: string[];
  mentionedInStorylets: string[];
  tags: string[];
  keywords: string[];
  icon?: string;
  color?: string;
  narrativeWeight: number;
  status: 'active' | 'resolved' | 'abandoned' | 'red_herring';
  isMinigame: boolean;
  minigameConfig?: MinigameConfig;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DbClueBoard {
  id?: string;
  name: string;
  description?: string;
  clueIds: string[];
  connectionMappings: DbConnectionMapping[];
  theories: CaseTheory[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DbCaseTheory {
  id?: string;
  title: string;
  description: string;
  supportingClues: string[];
  contradictingClues: string[];
  confidence: number;
  status: 'active' | 'proven' | 'disproven' | 'abandoned';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DbClueDiscovery {
  id?: string;
  clueId: string;
  discoveryMethod: string;
  discoveryContext?: string;
  discoveredBy: string;
  timestamp: Date;
  storyletId?: string;
  characterId?: string;
}

export interface DbClueInvestigation {
  id?: string;
  clueId: string;
  investigationStep: number;
  method: string;
  findings: string;
  newEvidenceFound: ClueEvidence[];
  newConnectionsFound: ClueConnection[];
  timeSpent: number;
  resourcesUsed?: string[];
  success: boolean;
  timestamp: Date;
}

export interface DbMinigameAttempt {
  id?: string;
  clueId: string;
  playerId: string;
  result: {
    clueId: string;
    minigameType: string;
    success: boolean;
    score: number;
    timeSpent: number;
    attemptsUsed: number;
    triggeredStoryletId: string;
    completedAt: Date;
    details?: DbMinigameResultDetails;
  };
  timestamp: Date;
}

export interface DbGameSave {
  id?: number;
  slot: number;
  name: string;
  gameTime: number;
  resources: {
    energy: number;
    social: number;
    knowledge: number;
    money: number;
  };
  playerRelationships: Record<string, number>;
  discoveredClues: string[];
  completedStorylets: string[];
  currentStoryletId?: string;
  currentArcId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Create the database class
export class V13nDatabase extends Dexie {
  storylets!: Table<DbStorylet>;
  storyArcs!: Table<DbStoryArc>;
  characters!: Table<DbCharacter>;
  clues!: Table<DbClue>;
  clueBoards!: Table<DbClueBoard>;
  caseTheories!: Table<DbCaseTheory>;
  clueDiscoveries!: Table<DbClueDiscovery>;
  clueInvestigations!: Table<DbClueInvestigation>;
  minigameAttempts!: Table<DbMinigameAttempt>;
  gameSaves!: Table<DbGameSave>;

  constructor() {
    super('V13nDatabase');
    
    // Version 1: Original schema
    this.version(1).stores({
      storylets: '++id, title, storyArc, status',
      storyArcs: '++id, name',
      characters: '++id, name, role',
      clues: '++id, name, discovered',
      gameSaves: '++id, slot, name, createdAt'
    });

    // Version 2: Phase 4 - Enhanced characters and clues
    this.version(2).stores({
      storylets: '++id, title, storyArc, status',
      storyArcs: '++id, name',
      characters: '++id, name, category, importance, status',
      clues: '++id, name, title, category, type, importance, isDiscovered, status',
      clueBoards: '++id, name, createdAt',
      caseTheories: '++id, title, status, confidence',
      clueDiscoveries: '++id, clueId, discoveredBy, timestamp',
      clueInvestigations: '++id, clueId, timestamp, method',
      gameSaves: '++id, slot, name, createdAt'
    });

    // Version 3: Phase 4.5 - Minigame integration
    this.version(3).stores({
      storylets: '++id, title, storyArc, status',
      storyArcs: '++id, name',
      characters: '++id, name, category, importance, status',
      clues: '++id, name, title, category, type, importance, isDiscovered, status, isMinigame',
      clueBoards: '++id, name, createdAt',
      caseTheories: '++id, title, status, confidence',
      clueDiscoveries: '++id, clueId, discoveredBy, timestamp',
      clueInvestigations: '++id, clueId, timestamp, method',
      minigameAttempts: '++id, clueId, playerId, timestamp',
      gameSaves: '++id, slot, name, createdAt'
    }).upgrade(trans => {
      // Upgrade existing clues to add missing fields
      return trans.table('clues').toCollection().modify((clue: DbClue) => {
        if (!clue.createdAt) {
          clue.createdAt = new Date();
        }
        if (!clue.updatedAt) {
          clue.updatedAt = new Date();
        }
        if (typeof clue.isMinigame === 'undefined') {
          clue.isMinigame = false;
        }
        if (!clue.evidence) {
          clue.evidence = [];
        }
        if (!clue.connections) {
          clue.connections = [];
        }
        if (!clue.mentionedInStorylets) {
          clue.mentionedInStorylets = [];
        }
      });
    });
  }
}

// Create and export the database instance
export const db = new V13nDatabase();

// Handle database opening errors and provide fallbacks
db.open().catch((error) => {
  console.error('Failed to open database:', error);
  console.warn('This might be due to schema changes. Consider clearing application data.');
});

// Database helper functions with IndexedDB fallback
export const databaseHelpers = {
  // Check if database is available
  isAvailable: async (): Promise<boolean> => {
    try {
      await db.open();
      return true;
    } catch (error) {
      console.error('Database not available:', error);
      return false;
    }
  },

  // Export all data
  exportData: async () => {
    try {
      const [storylets, storyArcs, characters, clues, gameSaves] = await Promise.all([
        db.storylets.toArray(),
        db.storyArcs.toArray(),
        db.characters.toArray(),
        db.clues.toArray(),
        db.gameSaves.toArray()
      ]);

      return {
        version: 1,
        exportedAt: new Date().toISOString(),
        data: {
          storylets,
          storyArcs,
          characters,
          clues,
          gameSaves
        }
      };
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  },

  // Import data
  importData: async (importedData: DbImportData) => {
    try {
      const { data } = importedData;
      
      // Clear existing data
      await db.transaction('rw', [db.storylets, db.storyArcs, db.characters, db.clues, db.gameSaves], async () => {
        await Promise.all([
          db.storylets.clear(),
          db.storyArcs.clear(),
          db.characters.clear(),
          db.clues.clear(),
          db.gameSaves.clear()
        ]);
      });

      // Import new data
      await db.transaction('rw', [db.storylets, db.storyArcs, db.characters, db.clues, db.gameSaves], async () => {
        if (data.storylets) await db.storylets.bulkAdd(data.storylets);
        if (data.storyArcs) await db.storyArcs.bulkAdd(data.storyArcs);
        if (data.characters) await db.characters.bulkAdd(data.characters);
        if (data.clues) await db.clues.bulkAdd(data.clues);
        if (data.gameSaves) await db.gameSaves.bulkAdd(data.gameSaves);
      });

      return true;
    } catch (error) {
      console.error('Import failed:', error);
      throw error;
    }
  },

  // Clear all data
  clearAllData: async () => {
    try {
      await db.transaction('rw', [db.storylets, db.storyArcs, db.characters, db.clues, db.gameSaves], async () => {
        await Promise.all([
          db.storylets.clear(),
          db.storyArcs.clear(),
          db.characters.clear(),
          db.clues.clear(),
          db.gameSaves.clear()
        ]);
      });
    } catch (error) {
      console.error('Clear data failed:', error);
      throw error;
    }
  },

  // Reset database completely (for debugging schema issues)
  resetDatabase: async () => {
    try {
      await db.delete();
      await db.open();
      return { success: true };
    } catch (error) {
      console.error('Database reset failed:', error);
      return { success: false, error };
    }
  }
};