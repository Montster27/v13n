import type { StoryArc } from '../types/narrative';
import type { Clue } from '../types/clue';

// Use the storylet interface from the narrative store
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

export interface ExportData {
  version: string;
  timestamp: string;
  data: {
    storylets?: Storylet[];
    arcs?: StoryArc[];
    clues?: Clue[];
  };
  metadata: {
    exportedBy?: string;
    description?: string;
    tags?: string[];
  };
}

export interface ImportResult {
  success: boolean;
  imported: {
    storylets: number;
    arcs: number;
    clues: number;
  };
  errors: string[];
  warnings: string[];
}

export class DataExporter {
  static readonly CURRENT_VERSION = '1.0.0';

  /**
   * Export storylets to JSON format
   */
  static exportStorylets(storylets: Storylet[], metadata?: Partial<ExportData['metadata']>): string {
    const exportData: ExportData = {
      version: this.CURRENT_VERSION,
      timestamp: new Date().toISOString(),
      data: { storylets },
      metadata: {
        description: `Export of ${storylets.length} storylets`,
        tags: ['storylets'],
        ...metadata
      }
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Export story arcs to JSON format
   */
  static exportArcs(arcs: StoryArc[], metadata?: Partial<ExportData['metadata']>): string {
    const exportData: ExportData = {
      version: this.CURRENT_VERSION,
      timestamp: new Date().toISOString(),
      data: { arcs },
      metadata: {
        description: `Export of ${arcs.length} story arcs`,
        tags: ['arcs'],
        ...metadata
      }
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Export clues to JSON format
   */
  static exportClues(clues: Clue[], metadata?: Partial<ExportData['metadata']>): string {
    const exportData: ExportData = {
      version: this.CURRENT_VERSION,
      timestamp: new Date().toISOString(),
      data: { clues },
      metadata: {
        description: `Export of ${clues.length} clues`,
        tags: ['clues'],
        ...metadata
      }
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Export all data (storylets, arcs, clues) to JSON format
   */
  static exportAll(
    storylets: Storylet[], 
    arcs: StoryArc[], 
    clues: Clue[], 
    metadata?: Partial<ExportData['metadata']>
  ): string {
    const exportData: ExportData = {
      version: this.CURRENT_VERSION,
      timestamp: new Date().toISOString(),
      data: { storylets, arcs, clues },
      metadata: {
        description: `Complete export: ${storylets.length} storylets, ${arcs.length} arcs, ${clues.length} clues`,
        tags: ['complete', 'storylets', 'arcs', 'clues'],
        ...metadata
      }
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Download data as JSON file
   */
  static downloadAsFile(data: string, filename: string): void {
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  /**
   * Generate filename with timestamp
   */
  static generateFilename(prefix: string, extension: string = 'json'): string {
    const timestamp = new Date().toISOString().split('T')[0];
    return `${prefix}_${timestamp}.${extension}`;
  }
}

export class DataImporter {
  /**
   * Validate import data structure
   */
  static validateImportData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
      errors.push('Invalid data format: must be a JSON object');
      return { isValid: false, errors };
    }

    if (!data.version) {
      errors.push('Missing version information');
    }

    if (!data.data || typeof data.data !== 'object') {
      errors.push('Missing or invalid data section');
      return { isValid: false, errors };
    }

    // Check for at least one data type
    const hasStorylets = Array.isArray(data.data.storylets);
    const hasArcs = Array.isArray(data.data.arcs);
    const hasClues = Array.isArray(data.data.clues);

    if (!hasStorylets && !hasArcs && !hasClues) {
      errors.push('No valid data found (storylets, arcs, or clues)');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate storylet data
   */
  static validateStorylet(storylet: any): string[] {
    const errors: string[] = [];

    if (!storylet.title || typeof storylet.title !== 'string') {
      errors.push('Missing or invalid title');
    }

    if (!storylet.description || typeof storylet.description !== 'string') {
      errors.push('Missing or invalid description');
    }

    if (!storylet.content || typeof storylet.content !== 'string') {
      errors.push('Missing or invalid content');
    }

    if (!Array.isArray(storylet.choices)) {
      errors.push('Missing or invalid choices array');
    }

    if (!Array.isArray(storylet.effects)) {
      errors.push('Missing or invalid effects array');
    }

    if (!storylet.status || !['dev', 'stage', 'live'].includes(storylet.status)) {
      errors.push('Missing or invalid status (must be dev, stage, or live)');
    }

    return errors;
  }

  /**
   * Validate story arc data
   */
  static validateArc(arc: any): string[] {
    const errors: string[] = [];

    if (!arc.name || typeof arc.name !== 'string') {
      errors.push('Missing or invalid name');
    }

    if (!arc.description || typeof arc.description !== 'string') {
      errors.push('Missing or invalid description');
    }

    return errors;
  }

  /**
   * Validate clue data
   */
  static validateClue(clue: any): string[] {
    const errors: string[] = [];

    if (!clue.name || typeof clue.name !== 'string') {
      errors.push('Missing or invalid name');
    }

    if (!clue.title || typeof clue.title !== 'string') {
      errors.push('Missing or invalid title');
    }

    if (!clue.description || typeof clue.description !== 'string') {
      errors.push('Missing or invalid description');
    }

    if (!clue.category || !['evidence', 'testimony', 'theory', 'fact', 'lead', 'red_herring'].includes(clue.category)) {
      errors.push('Missing or invalid category');
    }

    if (!clue.type || !['physical', 'digital', 'social', 'logical', 'temporal'].includes(clue.type)) {
      errors.push('Missing or invalid type');
    }

    if (!clue.importance || !['critical', 'major', 'minor', 'trivial'].includes(clue.importance)) {
      errors.push('Missing or invalid importance level');
    }

    return errors;
  }

  /**
   * Parse and validate import file
   */
  static async parseImportFile(file: File): Promise<{ data: ExportData | null; errors: string[] }> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      const validation = this.validateImportData(data);
      if (!validation.isValid) {
        return { data: null, errors: validation.errors };
      }

      return { data, errors: [] };
    } catch (error) {
      return { 
        data: null, 
        errors: [`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      };
    }
  }

  /**
   * Process import data and return sanitized objects
   */
  static processImportData(data: ExportData): {
    storylets: Storylet[];
    arcs: StoryArc[];
    clues: Clue[];
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const storylets: Storylet[] = [];
    const arcs: StoryArc[] = [];
    const clues: Clue[] = [];

    // Process storylets
    if (data.data.storylets) {
      data.data.storylets.forEach((storylet, index) => {
        const storyletErrors = this.validateStorylet(storylet);
        if (storyletErrors.length > 0) {
          errors.push(`Storylet ${index + 1}: ${storyletErrors.join(', ')}`);
        } else {
          // Generate new ID and timestamps for import
          const processedStorylet: Storylet = {
            ...storylet,
            id: crypto.randomUUID(),
            createdAt: new Date(),
            updatedAt: new Date(),
            tags: storylet.tags || [],
            triggers: storylet.triggers || [],
            choices: storylet.choices || [],
            effects: storylet.effects || [],
            priority: storylet.priority || 0,
            estimatedPlayTime: storylet.estimatedPlayTime || 5
          };
          storylets.push(processedStorylet);
        }
      });
    }

    // Process arcs
    if (data.data.arcs) {
      data.data.arcs.forEach((arc, index) => {
        const arcErrors = this.validateArc(arc);
        if (arcErrors.length > 0) {
          errors.push(`Arc ${index + 1}: ${arcErrors.join(', ')}`);
        } else {
          // Generate new ID and timestamps for import
          const processedArc: StoryArc = {
            ...arc,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: arc.tags || [],
            prerequisites: arc.prerequisites || []
          };
          arcs.push(processedArc);
        }
      });
    }

    // Process clues
    if (data.data.clues) {
      data.data.clues.forEach((clue, index) => {
        const clueErrors = this.validateClue(clue);
        if (clueErrors.length > 0) {
          errors.push(`Clue ${index + 1}: ${clueErrors.join(', ')}`);
        } else {
          // Generate new ID and timestamps for import
          const processedClue: Clue = {
            ...clue,
            id: crypto.randomUUID(),
            discoveredAt: clue.discoveredAt ? new Date(clue.discoveredAt) : undefined,
            prerequisites: clue.prerequisites || [],
            requiredStorylets: clue.requiredStorylets || [],
            requiredCharacterInteractions: clue.requiredCharacterInteractions || [],
            evidence: clue.evidence || [],
            connections: clue.connections || [],
            isDiscovered: false, // Reset discovery status on import
            isMinigame: clue.isMinigame || false
          };
          clues.push(processedClue);
        }
      });
    }

    return { storylets, arcs, clues, errors, warnings };
  }
}