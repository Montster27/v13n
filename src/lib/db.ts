import Dexie, { type Table } from 'dexie';

// Database interfaces
export interface StoryletDB {
  id: string;
  title: string;
  description: string;
  content: string;
  triggers: string; // JSON string
  choices: string;  // JSON string  
  effects: string;  // JSON string
  storyArc?: string;
  status: 'dev' | 'stage' | 'live';
  tags: string;     // JSON string
  priority: number;
  estimatedPlayTime: number;
  prerequisites: string; // JSON string
  createdAt: string;
  updatedAt: string;
}

export interface StoryArcDB {
  id: string;
  name: string;
  description: string;
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  estimatedLength?: number;
  prerequisites: string; // JSON string
  tags: string;          // JSON string
  createdAt: string;
  updatedAt: string;
}

// Database class
export class V13nDatabase extends Dexie {
  storylets!: Table<StoryletDB>;
  storyArcs!: Table<StoryArcDB>;

  constructor() {
    super('V13nDatabase');
    this.version(1).stores({
      storylets: 'id, title, status, storyArc, createdAt, updatedAt',
      storyArcs: 'id, name, category, difficulty, createdAt, updatedAt'
    });
  }
}

export const db = new V13nDatabase();

// Utility functions for serialization
export const serializeStorylet = (storylet: any): StoryletDB => ({
  ...storylet,
  triggers: JSON.stringify(storylet.triggers || []),
  choices: JSON.stringify(storylet.choices || []),
  effects: JSON.stringify(storylet.effects || []),
  tags: JSON.stringify(storylet.tags || []),
  prerequisites: JSON.stringify(storylet.prerequisites || []),
  createdAt: storylet.createdAt instanceof Date ? storylet.createdAt.toISOString() : storylet.createdAt,
  updatedAt: storylet.updatedAt instanceof Date ? storylet.updatedAt.toISOString() : storylet.updatedAt,
});

export const deserializeStorylet = (storylet: StoryletDB): any => ({
  ...storylet,
  triggers: JSON.parse(storylet.triggers || '[]'),
  choices: JSON.parse(storylet.choices || '[]'),
  effects: JSON.parse(storylet.effects || '[]'),
  tags: JSON.parse(storylet.tags || '[]'),
  prerequisites: JSON.parse(storylet.prerequisites || '[]'),
  createdAt: new Date(storylet.createdAt),
  updatedAt: new Date(storylet.updatedAt),
});

export const serializeStoryArc = (arc: any): StoryArcDB => ({
  ...arc,
  prerequisites: JSON.stringify(arc.prerequisites || []),
  tags: JSON.stringify(arc.tags || []),
  createdAt: typeof arc.createdAt === 'string' ? arc.createdAt : arc.createdAt?.toISOString?.() || new Date().toISOString(),
  updatedAt: typeof arc.updatedAt === 'string' ? arc.updatedAt : arc.updatedAt?.toISOString?.() || new Date().toISOString(),
});

export const deserializeStoryArc = (arc: StoryArcDB): any => ({
  ...arc,
  prerequisites: JSON.parse(arc.prerequisites || '[]'),
  tags: JSON.parse(arc.tags || '[]'),
  createdAt: arc.createdAt,
  updatedAt: arc.updatedAt,
});