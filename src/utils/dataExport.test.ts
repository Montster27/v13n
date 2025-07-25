/**
 * Comprehensive tests for data import/export functionality
 * Tests DataExporter and DataImporter classes with various scenarios
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DataExporter, DataImporter, type ExportData, type ImportResult } from './dataExport';
import type { StoryArc } from '../types/narrative';
import type { Clue } from '../types/clue';

// Mock the crypto.randomUUID for consistent test results
const mockUUIDs = ['uuid-1', 'uuid-2', 'uuid-3', 'uuid-4', 'uuid-5', 'uuid-6'];
let uuidIndex = 0;

vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => mockUUIDs[uuidIndex++] || `uuid-${uuidIndex}`)
});

// Mock URL and document for file download tests
const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();
vi.stubGlobal('URL', {
  createObjectURL: mockCreateObjectURL,
  revokeObjectURL: mockRevokeObjectURL
});

const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();
const mockClick = vi.fn();
const mockElement = {
  href: '',
  download: '',
  style: { display: '' },
  click: mockClick
};

vi.stubGlobal('document', {
  createElement: vi.fn(() => mockElement),
  body: {
    appendChild: mockAppendChild,
    removeChild: mockRemoveChild
  }
});

// Mock File with proper text() method
class MockFile {
  name: string;
  content: string;
  type: string;

  constructor(content: string[], name: string, options: { type: string }) {
    this.content = content.join('');
    this.name = name;
    this.type = options.type;
  }

  async text(): Promise<string> {
    return this.content;
  }
}

vi.stubGlobal('File', MockFile);

describe('DataExporter', () => {
  beforeEach(() => {
    uuidIndex = 0;
    vi.clearAllMocks();
    mockCreateObjectURL.mockReturnValue('blob:mock-url');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Export Functionality', () => {
    const mockStorylets = [
      {
        id: 'storylet-1',
        title: 'Test Storylet',
        description: 'Test description',
        content: 'Test content',
        triggers: [],
        choices: [
          {
            text: 'Choice 1',
            description: 'Choice description',
            effects: [],
            requirements: [],
            probability: 100,
            unlocked: true,
            createNewStorylet: false
          }
        ],
        effects: [],
        status: 'dev' as const,
        tags: ['test'],
        priority: 1,
        estimatedPlayTime: 10,
        prerequisites: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      }
    ];

    const mockArcs: StoryArc[] = [
      {
        id: 'arc-1',
        name: 'Test Arc',
        description: 'Arc description',
        estimatedLength: 30,
        tags: ['adventure'],
        prerequisites: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      }
    ];

    const mockClues: Clue[] = [
      {
        id: 'clue-1',
        name: 'Test Clue',
        title: 'Clue Title',
        description: 'Clue description',
        category: 'evidence',
        type: 'physical',
        importance: 'major',
        prerequisites: [],
        requiredStorylets: [],
        requiredCharacterInteractions: [],
        evidence: [],
        connections: [],
        isDiscovered: false,
        isMinigame: false
      }
    ];

    it('should export storylets with correct structure', () => {
      const result = DataExporter.exportStorylets(mockStorylets);
      const parsed: ExportData = JSON.parse(result);

      expect(parsed.version).toBe('1.0.0');
      expect(parsed.timestamp).toBeDefined();
      expect(parsed.data.storylets).toHaveLength(1);
      expect(parsed.data.storylets![0]).toEqual({
        ...mockStorylets[0],
        createdAt: mockStorylets[0].createdAt.toISOString(),
        updatedAt: mockStorylets[0].updatedAt.toISOString()
      });
      expect(parsed.metadata.description).toContain('1 storylets');
      expect(parsed.metadata.tags).toContain('storylets');
    });

    it('should export story arcs with correct structure', () => {
      const result = DataExporter.exportArcs(mockArcs);
      const parsed: ExportData = JSON.parse(result);

      expect(parsed.version).toBe('1.0.0');
      expect(parsed.data.arcs).toHaveLength(1);
      expect(parsed.data.arcs![0]).toEqual(mockArcs[0]);
      expect(parsed.metadata.description).toContain('1 story arcs');
      expect(parsed.metadata.tags).toContain('arcs');
    });

    it('should export clues with correct structure', () => {
      const result = DataExporter.exportClues(mockClues);
      const parsed: ExportData = JSON.parse(result);

      expect(parsed.version).toBe('1.0.0');
      expect(parsed.data.clues).toHaveLength(1);
      expect(parsed.data.clues![0]).toEqual(mockClues[0]);
      expect(parsed.metadata.description).toContain('1 clues');
      expect(parsed.metadata.tags).toContain('clues');
    });

    it('should export all data types together', () => {
      const result = DataExporter.exportAll(mockStorylets, mockArcs, mockClues);
      const parsed: ExportData = JSON.parse(result);

      expect(parsed.version).toBe('1.0.0');
      expect(parsed.data.storylets).toHaveLength(1);
      expect(parsed.data.arcs).toHaveLength(1);
      expect(parsed.data.clues).toHaveLength(1);
      expect(parsed.metadata.description).toContain('1 storylets, 1 arcs, 1 clues');
      expect(parsed.metadata.tags).toEqual(['complete', 'storylets', 'arcs', 'clues']);
    });

    it('should accept custom metadata', () => {
      const customMetadata = {
        description: 'Custom export description',
        tags: ['custom', 'test'],
        exportedBy: 'test-user'
      };

      const result = DataExporter.exportStorylets(mockStorylets, customMetadata);
      const parsed: ExportData = JSON.parse(result);

      expect(parsed.metadata.description).toBe('Custom export description');
      expect(parsed.metadata.tags).toEqual(['custom', 'test']);
      expect(parsed.metadata.exportedBy).toBe('test-user');
    });

    it('should handle empty data arrays', () => {
      const result = DataExporter.exportAll([], [], []);
      const parsed: ExportData = JSON.parse(result);

      expect(parsed.data.storylets).toHaveLength(0);
      expect(parsed.data.arcs).toHaveLength(0);
      expect(parsed.data.clues).toHaveLength(0);
      expect(parsed.metadata.description).toContain('0 storylets, 0 arcs, 0 clues');
    });

    it('should generate properly formatted JSON', () => {
      const result = DataExporter.exportStorylets(mockStorylets);
      
      // Should be pretty-printed (indented)
      expect(result).toContain('\n  ');
      expect(result).toContain('\n    ');
      
      // Should be valid JSON
      expect(() => JSON.parse(result)).not.toThrow();
    });
  });

  describe('File Download Functionality', () => {
    it('should create and trigger file download', () => {
      const testData = '{"test": "data"}';
      const filename = 'test-export.json';

      DataExporter.downloadAsFile(testData, filename);

      expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      expect(mockAppendChild).toHaveBeenCalledWith(mockElement);
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalledWith(mockElement);
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
      expect(mockElement.download).toBe(filename);
    });

    it('should create blob with correct type', () => {
      const testData = '{"test": "data"}';
      DataExporter.downloadAsFile(testData, 'test.json');

      const blobCall = mockCreateObjectURL.mock.calls[0][0];
      expect(blobCall.type).toBe('application/json');
    });

    it('should handle large data downloads', () => {
      const largeData = JSON.stringify({ data: 'x'.repeat(10000) });
      DataExporter.downloadAsFile(largeData, 'large-export.json');

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
    });
  });

  describe('Filename Generation', () => {
    it('should generate filename with current date', () => {
      const filename = DataExporter.generateFilename('v13n_test_export');
      const today = new Date().toISOString().split('T')[0];
      
      expect(filename).toBe(`v13n_test_export_${today}.json`);
    });

    it('should support custom file extensions', () => {
      const filename = DataExporter.generateFilename('backup', 'txt');
      const today = new Date().toISOString().split('T')[0];
      
      expect(filename).toBe(`backup_${today}.txt`);
    });

    it('should handle edge cases in filename generation', () => {
      const filename = DataExporter.generateFilename('');
      const today = new Date().toISOString().split('T')[0];
      
      expect(filename).toBe(`_${today}.json`);
    });
  });
});

describe('DataImporter', () => {
  beforeEach(() => {
    uuidIndex = 0;
    vi.clearAllMocks();
  });

  describe('Data Validation', () => {
    it('should validate proper import data structure', () => {
      const validData = {
        version: '1.0.0',
        timestamp: '2024-01-01T00:00:00.000Z',
        data: {
          storylets: [],
          arcs: [],
          clues: []
        },
        metadata: {}
      };

      const result = DataImporter.validateImportData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid data structures', () => {
      const invalidCases = [
        null,
        undefined,
        'string',
        123,
        [],
        { version: '1.0.0' }, // Missing data section
        { data: {} }, // Missing version
        { version: '1.0.0', data: 'invalid' }, // Invalid data section
        { version: '1.0.0', data: {} } // Empty data section
      ];

      invalidCases.forEach((testCase, index) => {
        const result = DataImporter.validateImportData(testCase);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('should require at least one data type', () => {
      const dataWithNoArrays = {
        version: '1.0.0',
        data: {
          storylets: 'not-array',
          arcs: null,
          clues: undefined
        }
      };

      const result = DataImporter.validateImportData(dataWithNoArrays);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('No valid data found (storylets, arcs, or clues)');
    });
  });

  describe('Storylet Validation', () => {
    it('should validate required storylet fields', () => {
      const validStorylet = {
        title: 'Test Storylet',
        description: 'Description',
        content: 'Content',
        choices: [],
        effects: [],
        status: 'dev'
      };

      const result = DataImporter.validateStorylet(validStorylet);
      expect(result).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidStorylet = {
        // Missing all required fields
      };

      const result = DataImporter.validateStorylet(invalidStorylet);
      expect(result).toEqual([
        'Missing or invalid title',
        'Missing or invalid description',
        'Missing or invalid content',
        'Missing or invalid choices array',
        'Missing or invalid effects array',
        'Missing or invalid status (must be dev, stage, or live)'
      ]);
    });

    it('should validate field types', () => {
      const invalidStorylet = {
        title: 123,
        description: null,
        content: [],
        choices: 'not-array',
        effects: {},
        status: 'invalid-status'
      };

      const result = DataImporter.validateStorylet(invalidStorylet);
      expect(result).toHaveLength(6);
      expect(result).toContain('Missing or invalid title');
      expect(result).toContain('Missing or invalid status (must be dev, stage, or live)');
    });

    it('should validate status enum values', () => {
      const validStatuses = ['dev', 'stage', 'live'];
      const invalidStatuses = ['development', 'production', 'published', ''];

      validStatuses.forEach(status => {
        const storylet = {
          title: 'Test',
          description: 'Test',
          content: 'Test',
          choices: [],
          effects: [],
          status
        };
        const result = DataImporter.validateStorylet(storylet);
        expect(result.filter(e => e.includes('status'))).toHaveLength(0);
      });

      invalidStatuses.forEach(status => {
        const storylet = {
          title: 'Test',
          description: 'Test',
          content: 'Test',
          choices: [],
          effects: [],
          status
        };
        const result = DataImporter.validateStorylet(storylet);
        expect(result.filter(e => e.includes('status'))).toHaveLength(1);
      });
    });
  });

  describe('Story Arc Validation', () => {
    it('should validate required arc fields', () => {
      const validArc = {
        name: 'Test Arc',
        description: 'Arc description'
      };

      const result = DataImporter.validateArc(validArc);
      expect(result).toHaveLength(0);
    });

    it('should detect missing arc fields', () => {
      const invalidArc = {};
      const result = DataImporter.validateArc(invalidArc);
      
      expect(result).toEqual([
        'Missing or invalid name',
        'Missing or invalid description'
      ]);
    });

    it('should validate arc field types', () => {
      const invalidArc = {
        name: 123,
        description: null
      };

      const result = DataImporter.validateArc(invalidArc);
      expect(result).toHaveLength(2);
    });
  });

  describe('Clue Validation', () => {
    it('should validate required clue fields', () => {
      const validClue = {
        name: 'Test Clue',
        title: 'Clue Title',
        description: 'Description',
        category: 'evidence',
        type: 'physical',
        importance: 'major'
      };

      const result = DataImporter.validateClue(validClue);
      expect(result).toHaveLength(0);
    });

    it('should detect missing clue fields', () => {
      const invalidClue = {};
      const result = DataImporter.validateClue(invalidClue);
      
      expect(result).toEqual([
        'Missing or invalid name',
        'Missing or invalid title',
        'Missing or invalid description',
        'Missing or invalid category',
        'Missing or invalid type',
        'Missing or invalid importance level'
      ]);
    });

    it('should validate clue enum values', () => {
      const validCategories = ['evidence', 'testimony', 'theory', 'fact', 'lead', 'red_herring'];
      const validTypes = ['physical', 'digital', 'social', 'logical', 'temporal'];
      const validImportance = ['critical', 'major', 'minor', 'trivial'];

      const baseClue = {
        name: 'Test',
        title: 'Test',
        description: 'Test'
      };

      // Test valid categories
      validCategories.forEach(category => {
        const clue = { ...baseClue, category, type: 'physical', importance: 'major' };
        const result = DataImporter.validateClue(clue);
        expect(result.filter(e => e.includes('category'))).toHaveLength(0);
      });

      // Test invalid category
      const invalidClue = { ...baseClue, category: 'invalid', type: 'physical', importance: 'major' };
      const result = DataImporter.validateClue(invalidClue);
      expect(result.filter(e => e.includes('category'))).toHaveLength(1);
    });
  });

  describe('File Parsing', () => {
    it('should parse valid JSON files', async () => {
      const validData = {
        version: '1.0.0',
        data: { 
          storylets: [],
          arcs: [],
          clues: []
        }
      };

      const mockFile = new File([JSON.stringify(validData)], 'test.json', {
        type: 'application/json'
      });

      const result = await DataImporter.parseImportFile(mockFile);
      expect(result.data).toEqual(validData);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle invalid JSON files', async () => {
      const mockFile = new File(['invalid json{'], 'test.json', {
        type: 'application/json'
      });

      const result = await DataImporter.parseImportFile(mockFile);
      expect(result.data).toBeNull();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to parse file');
    });

    it('should handle files with invalid data structure', async () => {
      const invalidData = { invalid: 'structure' };
      const mockFile = new File([JSON.stringify(invalidData)], 'test.json', {
        type: 'application/json'
      });

      const result = await DataImporter.parseImportFile(mockFile);
      expect(result.data).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle empty files', async () => {
      const mockFile = new File([''], 'empty.json', {
        type: 'application/json'
      });

      const result = await DataImporter.parseImportFile(mockFile);
      expect(result.data).toBeNull();
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('Data Processing', () => {
    it('should process valid import data', () => {
      const importData: ExportData = {
        version: '1.0.0',
        timestamp: '2024-01-01T00:00:00.000Z',
        data: {
          storylets: [{
            id: 'old-id',
            title: 'Test Storylet',
            description: 'Description',
            content: 'Content',
            triggers: [],
            choices: [],
            effects: [],
            status: 'dev',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01')
          }],
          arcs: [{
            id: 'old-arc-id',
            name: 'Test Arc',
            description: 'Arc description',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z'
          }],
          clues: [{
            id: 'old-clue-id',
            name: 'Test Clue',
            title: 'Clue Title',
            description: 'Description',
            category: 'evidence',
            type: 'physical',
            importance: 'major'
          }]
        },
        metadata: {}
      };

      const result = DataImporter.processImportData(importData);

      expect(result.errors).toHaveLength(0);
      expect(result.storylets).toHaveLength(1);
      expect(result.arcs).toHaveLength(1);
      expect(result.clues).toHaveLength(1);

      // Check that new IDs were generated
      expect(result.storylets[0].id).toBe('uuid-1');
      expect(result.arcs[0].id).toBe('uuid-2');
      expect(result.clues[0].id).toBe('uuid-3');

      // Check that timestamps were updated
      expect(result.storylets[0].createdAt).toBeInstanceOf(Date);
      expect(result.storylets[0].updatedAt).toBeInstanceOf(Date);
    });

    it('should handle invalid data in processing', () => {
      const importData: ExportData = {
        version: '1.0.0',
        timestamp: '2024-01-01T00:00:00.000Z',
        data: {
          storylets: [{
            // Missing required fields
            id: 'invalid-storylet'
          }],
          arcs: [{
            // Missing required fields
            id: 'invalid-arc'
          }],
          clues: [{
            // Missing required fields
            id: 'invalid-clue'
          }]
        },
        metadata: {}
      };

      const result = DataImporter.processImportData(importData);

      expect(result.errors).toHaveLength(3);
      expect(result.storylets).toHaveLength(0);
      expect(result.arcs).toHaveLength(0);
      expect(result.clues).toHaveLength(0);

      expect(result.errors[0]).toContain('Storylet 1:');
      expect(result.errors[1]).toContain('Arc 1:');
      expect(result.errors[2]).toContain('Clue 1:');
    });

    it('should set default values for optional fields', () => {
      const importData: ExportData = {
        version: '1.0.0',
        timestamp: '2024-01-01T00:00:00.000Z',
        data: {
          storylets: [{
            id: 'storylet-1',
            title: 'Test',
            description: 'Test',
            content: 'Test',
            status: 'dev',
            triggers: [],
            choices: [],
            effects: [],
            createdAt: new Date(),
            updatedAt: new Date()
            // Missing optional fields like tags, priority, etc.
          }],
          clues: [{
            id: 'clue-1',
            name: 'Test',
            title: 'Test',
            description: 'Test',
            category: 'evidence',
            type: 'physical',
            importance: 'major'
            // Missing optional fields
          }]
        },
        metadata: {}
      };

      const result = DataImporter.processImportData(importData);

      expect(result.storylets).toHaveLength(1);
      expect(result.storylets[0].tags).toEqual([]);
      expect(result.storylets[0].triggers).toEqual([]);
      expect(result.storylets[0].choices).toEqual([]);
      expect(result.storylets[0].effects).toEqual([]);
      expect(result.storylets[0].priority).toBe(0);
      expect(result.storylets[0].estimatedPlayTime).toBe(5);

      expect(result.clues[0].prerequisites).toEqual([]);
      expect(result.clues[0].isDiscovered).toBe(false);
      expect(result.clues[0].isMinigame).toBe(false);
    });

    it('should handle partial data imports', () => {
      const storyletOnlyData: ExportData = {
        version: '1.0.0',
        timestamp: '2024-01-01T00:00:00.000Z',
        data: {
          storylets: [{
            id: 'storylet-1',
            title: 'Test',
            description: 'Test',
            content: 'Test',
            status: 'dev',
            triggers: [],
            choices: [],
            effects: [],
            createdAt: new Date(),
            updatedAt: new Date()
          }]
          // No arcs or clues
        },
        metadata: {}
      };

      const result = DataImporter.processImportData(storyletOnlyData);

      expect(result.storylets).toHaveLength(1);
      expect(result.arcs).toHaveLength(0);
      expect(result.clues).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle extremely large import data', () => {
      const largeStorylets = Array.from({ length: 1000 }, (_, i) => ({
        id: `storylet-${i}`,
        title: `Storylet ${i}`,
        description: 'Description',
        content: 'Content',
        triggers: [],
        choices: [],
        effects: [],
        status: 'dev' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      const importData: ExportData = {
        version: '1.0.0',
        timestamp: '2024-01-01T00:00:00.000Z',
        data: { storylets: largeStorylets },
        metadata: {}
      };

      const result = DataImporter.processImportData(importData);

      expect(result.storylets).toHaveLength(1000);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle malformed date fields gracefully', () => {
      const importData: ExportData = {
        version: '1.0.0',
        timestamp: '2024-01-01T00:00:00.000Z',
        data: {
          clues: [{
            id: 'clue-1',
            name: 'Test',
            title: 'Test',
            description: 'Test',
            category: 'evidence',
            type: 'physical',
            importance: 'major',
            discoveredAt: 'invalid-date' as any
          }]
        },
        metadata: {}
      };

      const result = DataImporter.processImportData(importData);

      expect(result.clues).toHaveLength(1);
      expect(result.clues[0].discoveredAt).toBeInstanceOf(Date);
      expect(isNaN(result.clues[0].discoveredAt!.getTime())).toBe(true); // Invalid date
    });

    it('should handle mixed valid and invalid data', () => {
      const importData: ExportData = {
        version: '1.0.0',
        timestamp: '2024-01-01T00:00:00.000Z',
        data: {
          storylets: [
            {
              // Valid storylet
              id: 'valid',
              title: 'Valid Storylet',
              description: 'Description',
              content: 'Content',
              triggers: [],
              choices: [],
              effects: [],
              status: 'dev',
              createdAt: new Date(),
              updatedAt: new Date()
            },
            {
              // Invalid storylet - missing fields
              id: 'invalid'
            }
          ]
        },
        metadata: {}
      };

      const result = DataImporter.processImportData(importData);

      expect(result.storylets).toHaveLength(1); // Only valid one processed
      expect(result.errors).toHaveLength(1); // Error for invalid one
      expect(result.storylets[0].title).toBe('Valid Storylet');
    });

    it('should preserve complex nested data structures', () => {
      const complexStorylet = {
        id: 'complex',
        title: 'Complex Storylet',
        description: 'Description',
        content: 'Content',
        triggers: [
          { type: 'resource', condition: 'energy > 50' }
        ],
        choices: [
          {
            text: 'Complex choice',
            effects: [
              { type: 'resource', target: 'energy', change: -10 }
            ],
            requirements: [
              { type: 'flag', flag: 'test_flag', value: true }
            ]
          }
        ],
        effects: [
          { type: 'story_flag', flag: 'storylet_completed', value: true }
        ],
        status: 'dev',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const importData: ExportData = {
        version: '1.0.0',
        timestamp: '2024-01-01T00:00:00.000Z',
        data: { storylets: [complexStorylet] },
        metadata: {}
      };

      const result = DataImporter.processImportData(importData);

      expect(result.storylets).toHaveLength(1);
      expect(result.storylets[0].triggers).toEqual(complexStorylet.triggers);
      expect(result.storylets[0].choices).toEqual(complexStorylet.choices);
      expect(result.storylets[0].effects).toEqual(complexStorylet.effects);
    });
  });
});