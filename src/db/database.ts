import Dexie, { Table } from 'dexie';

// Define the database schema interfaces
export interface DbStorylet {
  id?: string;
  title: string;
  description: string;
  content: string;
  triggers: any[];
  choices: any[];
  effects: any[];
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
  role: string;
  traits: string[];
  interests: string[];
  background: string;
  relationships: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbClue {
  id?: string;
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
  gameSaves!: Table<DbGameSave>;

  constructor() {
    super('V13nDatabase');
    
    this.version(1).stores({
      storylets: '++id, title, storyArc, status',
      storyArcs: '++id, name',
      characters: '++id, name, role',
      clues: '++id, name, discovered',
      gameSaves: '++id, slot, name, createdAt'
    });
  }
}

// Create and export the database instance
export const db = new V13nDatabase();

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
  importData: async (importedData: any) => {
    try {
      const { data } = importedData;
      
      // Clear existing data
      await db.transaction('rw', db.storylets, db.storyArcs, db.characters, db.clues, db.gameSaves, async () => {
        await Promise.all([
          db.storylets.clear(),
          db.storyArcs.clear(),
          db.characters.clear(),
          db.clues.clear(),
          db.gameSaves.clear()
        ]);
      });

      // Import new data
      await db.transaction('rw', db.storylets, db.storyArcs, db.characters, db.clues, db.gameSaves, async () => {
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
      await db.transaction('rw', db.storylets, db.storyArcs, db.characters, db.clues, db.gameSaves, async () => {
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
  }
};