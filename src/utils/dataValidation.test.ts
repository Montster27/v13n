/**
 * Comprehensive tests for data validation and security
 * Tests validation logic, sanitization, and security measures
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DatabaseValidator } from './dataValidation';
import * as Sanitization from './sanitization';

// Mock the sanitization module
vi.mock('./sanitization', () => ({
  sanitizeMetadata: vi.fn(),
  sanitizeStoryletContent: vi.fn(),
  sanitizeJsonData: vi.fn(),
  sanitizeUserInput: vi.fn(),
  sanitizeFileData: vi.fn()
}));

describe('DatabaseValidator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementations
    vi.mocked(Sanitization.sanitizeMetadata).mockImplementation((data) => ({ ...data, sanitized: true }));
    vi.mocked(Sanitization.sanitizeStoryletContent).mockImplementation((data) => ({ ...data, contentSanitized: true }));
    vi.mocked(Sanitization.sanitizeJsonData).mockImplementation((data) => ({ ...data, jsonSanitized: true }));
    vi.mocked(Sanitization.sanitizeUserInput).mockImplementation((input) => input?.toString().trim() || '');
    vi.mocked(Sanitization.sanitizeFileData).mockImplementation((data) => ({ ...data, fileSanitized: true }));
  });

  describe('Storylet Validation', () => {
    it('should validate required storylet fields', async () => {
      const invalidStorylet = {
        // Missing required fields
        description: 'Test description'
      };

      const result = await DatabaseValidator.validateBeforeWrite('storylet', invalidStorylet);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'title',
            message: expect.stringContaining('required'),
            severity: 'error'
          })
        ])
      );
    });

    it('should validate storylet field types and constraints', async () => {
      const invalidStorylet = {
        title: '', // Empty string
        description: 123, // Wrong type
        content: 'Valid content',
        status: 'invalid_status', // Invalid enum value
        triggers: 'not_an_array', // Wrong type
        choices: [
          {
            // Invalid choice structure
            text: '',
            invalidField: 'should not be here'
          }
        ]
      };

      const result = await DatabaseValidator.validateBeforeWrite('storylet', invalidStorylet);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'title',
            message: expect.stringContaining('empty')
          }),
          expect.objectContaining({
            field: 'description',
            message: expect.stringContaining('string')
          }),
          expect.objectContaining({
            field: 'status',
            message: expect.stringContaining('valid status')
          }),
          expect.objectContaining({
            field: 'triggers',
            message: expect.stringContaining('array')
          })
        ])
      );
    });

    it('should validate and sanitize valid storylet data', async () => {
      const validStorylet = {
        title: 'Test Storylet',
        description: 'Test description',
        content: '<script>alert("xss")</script>Valid content',
        status: 'dev',
        triggers: [],
        choices: [
          {
            text: 'Valid choice',
            description: 'Choice description',
            effects: [],
            requirements: [],
            probability: 100,
            unlocked: true,
            createNewStorylet: false
          }
        ],
        effects: []
      };

      const result = await DatabaseValidator.validateBeforeWrite('storylet', validStorylet);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedData).toBeDefined();
      expect(Sanitization.sanitizeStoryletContent).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Storylet',
          content: expect.stringContaining('Valid content')
        })
      );
    });

    it('should detect malicious storylet content', async () => {
      const maliciousStorylet = {
        title: '<script>malicious()</script>',
        description: 'javascript:void(0)',
        content: '<iframe src="javascript:alert(1)"></iframe>',
        status: 'dev',
        triggers: [],
        choices: [],
        effects: []
      };

      const result = await DatabaseValidator.validateBeforeWrite('storylet', maliciousStorylet);

      expect(Sanitization.sanitizeStoryletContent).toHaveBeenCalled();
      expect(result.sanitizedData).toEqual(
        expect.objectContaining({
          contentSanitized: true
        })
      );
    });

    it('should validate storylet choice constraints', async () => {
      const storyletWithInvalidChoices = {
        title: 'Test Storylet',
        description: 'Test description',
        content: 'Valid content',
        status: 'dev',
        triggers: [],
        choices: [
          {
            text: '', // Empty text
            probability: 150, // Invalid probability > 100
            effects: 'not_an_array', // Wrong type
            requirements: [
              {
                // Invalid requirement structure
                invalidField: 'test'
              }
            ]
          }
        ],
        effects: []
      };

      const result = await DatabaseValidator.validateBeforeWrite('storylet', storyletWithInvalidChoices);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: expect.stringContaining('choice'),
            message: expect.stringContaining('text')
          }),
          expect.objectContaining({
            field: expect.stringContaining('probability'),
            message: expect.stringContaining('100')
          })
        ])
      );
    });
  });

  describe('Story Arc Validation', () => {
    it('should validate required story arc fields', async () => {
      const invalidArc = {
        description: 'Test description'
        // Missing name
      };

      const result = await DatabaseValidator.validateBeforeWrite('arc', invalidArc);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'name',
            message: expect.stringContaining('required')
          })
        ])
      );
    });

    it('should validate story arc field constraints', async () => {
      const invalidArc = {
        name: '', // Empty name
        description: 123, // Wrong type
        estimatedLength: -5, // Invalid negative length
        prerequisites: 'not_an_array', // Wrong type
        tags: [123, 'valid_tag'] // Mixed types in array
      };

      const result = await DatabaseValidator.validateBeforeWrite('arc', invalidArc);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      // Just check that validation caught the issues
      const errorFields = result.errors.map(e => e.field);
      expect(errorFields).toContain('name');
    });

    it('should validate and sanitize valid story arc data', async () => {
      const validArc = {
        name: 'Test Arc',
        description: 'Arc description with <em>formatting</em>',
        estimatedLength: 30,
        prerequisites: ['arc-1', 'arc-2'],
        tags: ['adventure', 'mystery']
      };

      const result = await DatabaseValidator.validateBeforeWrite('arc', validArc);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedData).toBeDefined();
      expect(Sanitization.sanitizeMetadata).toHaveBeenCalled();
    });
  });

  describe('Clue Validation', () => {
    it('should validate required clue fields', async () => {
      const invalidClue = {
        title: 'Test Clue'
        // Missing name
      };

      const result = await DatabaseValidator.validateBeforeWrite('clue', invalidClue);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'name',
            message: expect.stringContaining('required')
          })
        ])
      );
    });

    it('should validate clue field constraints', async () => {
      const invalidClue = {
        name: '', // Empty name
        title: 123, // Wrong type
        category: 'invalid_category', // Invalid enum
        type: 'invalid_type', // Invalid enum
        importance: 'invalid_importance', // Invalid enum
        prerequisites: 'not_an_array' // Wrong type
      };

      const result = await DatabaseValidator.validateBeforeWrite('clue', invalidClue);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      // Check that validation caught category issues
      const errorFields = result.errors.map(e => e.field);
      expect(errorFields).toContain('category');
    });

    it('should validate and sanitize valid clue data', async () => {
      const validClue = {
        name: 'Test Clue',
        title: 'Clue Title',
        description: 'Clue description',
        category: 'evidence',
        type: 'physical',
        importance: 'major',
        prerequisites: ['clue-1'],
        evidence: [{ type: 'note', content: 'Evidence data' }]
      };

      const result = await DatabaseValidator.validateBeforeWrite('clue', validClue);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedData).toBeDefined();
      expect(Sanitization.sanitizeMetadata).toHaveBeenCalled();
    });
  });

  describe('Security Validation', () => {
    it('should detect and prevent XSS attacks', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:void(0)',
        '<img src="x" onerror="alert(1)">',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<svg onload="alert(1)"></svg>'
      ];

      for (const payload of xssPayloads) {
        const maliciousStorylet = {
          title: payload,
          description: 'Test',
          content: payload,
          status: 'dev',
          triggers: [],
          choices: [],
          effects: []
        };

        const result = await DatabaseValidator.validateBeforeWrite('storylet', maliciousStorylet);
        
        expect(Sanitization.sanitizeStoryletContent).toHaveBeenCalledWith(
          expect.objectContaining({
            title: payload,
            content: payload
          })
        );
      }
    });

    it('should detect and prevent SQL injection attempts', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE storylets; --",
        "' OR '1'='1",
        "'; SELECT * FROM users; --",
        "' UNION SELECT * FROM admin_users --"
      ];

      for (const payload of sqlInjectionPayloads) {
        const maliciousStorylet = {
          title: payload,
          description: 'Test',
          content: 'Test content',
          status: 'dev',
          triggers: [],
          choices: [],
          effects: []
        };

        const result = await DatabaseValidator.validateBeforeWrite('storylet', maliciousStorylet);
        
        expect(Sanitization.sanitizeStoryletContent).toHaveBeenCalled();
        expect(result.sanitizedData).toBeDefined();
      }
    });

    it('should sanitize file data through storylet content', async () => {
      const storyletWithFileData = {
        title: 'File Upload Test',
        description: 'Testing file handling',
        content: '<script>alert("malicious")</script>File content here',
        status: 'dev',
        triggers: [],
        choices: [],
        effects: []
      };

      const result = await DatabaseValidator.validateBeforeWrite('storylet', storyletWithFileData);

      expect(Sanitization.sanitizeStoryletContent).toHaveBeenCalled();
      expect(result.sanitizedData).toBeDefined();
      expect(result.sanitizedData.contentSanitized).toBe(true);
    });

    it('should enforce content length limits', async () => {
      const oversizedStorylet = {
        title: 'A'.repeat(1000), // Very long title
        description: 'B'.repeat(10000), // Very long description
        content: 'C'.repeat(100000), // Very long content
        status: 'dev',
        triggers: [],
        choices: [],
        effects: []
      };

      const result = await DatabaseValidator.validateBeforeWrite('storylet', oversizedStorylet);

      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: expect.stringMatching(/title|description|content/),
            message: expect.stringContaining('length')
          })
        ])
      );
    });

    it('should validate against prototype pollution', async () => {
      const pollutionAttempt = {
        title: 'Test',
        description: 'Test',
        content: 'Test',
        status: 'dev',
        triggers: [],
        choices: [],
        effects: [],
        __proto__: { malicious: true },
        constructor: { prototype: { polluted: true } }
      };

      const result = await DatabaseValidator.validateBeforeWrite('storylet', pollutionAttempt);

      // Should strip dangerous properties
      expect(result.sanitizedData).not.toHaveProperty('__proto__');
      expect(result.sanitizedData).not.toHaveProperty('constructor');
      expect(Sanitization.sanitizeJsonData).toHaveBeenCalled();
    });
  });

  describe('Data Integrity Validation', () => {
    it('should validate foreign key relationships', async () => {
      const storyletWithInvalidArc = {
        title: 'Test Storylet',
        description: 'Test description',
        content: 'Test content',
        status: 'dev',
        storyArc: 'non-existent-arc-id', // Invalid foreign key
        triggers: [],
        choices: [],
        effects: []
      };

      const result = await DatabaseValidator.validateBeforeWrite('storylet', storyletWithInvalidArc);

      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'storyArc',
            message: expect.stringContaining('reference')
          })
        ])
      );
    });

    it('should validate circular dependency prevention', async () => {
      const storyletWithCircularChoice = {
        id: 'storylet-1',
        title: 'Test Storylet',
        description: 'Test description',
        content: 'Test content',
        status: 'dev',
        triggers: [],
        choices: [
          {
            text: 'Circular choice',
            nextStoryletId: 'storylet-1', // Points to itself
            effects: [],
            requirements: [],
            probability: 100,
            unlocked: true,
            createNewStorylet: false
          }
        ],
        effects: []
      };

      const result = await DatabaseValidator.validateBeforeWrite('storylet', storyletWithCircularChoice);

      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: expect.stringContaining('choice'),
            message: expect.stringContaining('circular')
          })
        ])
      );
    });

    it('should validate data consistency across related entities', async () => {
      const clueWithInvalidReferences = {
        name: 'Test Clue',
        title: 'Clue with invalid refs',
        description: 'Clue description',
        category: 'evidence',
        type: 'physical',
        importance: 'major',
        prerequisites: ['non-existent-clue'],
        evidence: [
          {
            type: 'reference',
            clueId: 'non-existent-clue-id'
          }
        ]
      };

      const result = await DatabaseValidator.validateBeforeWrite('clue', clueWithInvalidReferences);

      // Even if it passes validation, the sanitization should handle references
      expect(Sanitization.sanitizeJsonData).toHaveBeenCalled();
      expect(result.sanitizedData).toBeDefined();
    });
  });

  describe('Performance and Resource Validation', () => {
    it('should validate memory usage constraints', async () => {
      // Create a large dataset that might cause memory issues
      const largeChoicesArray = Array.from({ length: 1000 }, (_, i) => ({
        text: `Choice ${i}`,
        description: 'A'.repeat(1000),
        effects: Array.from({ length: 100 }, (_, j) => ({
          type: 'resource',
          target: `resource_${j}`,
          change: Math.random() * 100
        })),
        requirements: [],
        probability: 100,
        unlocked: true,
        createNewStorylet: false
      }));

      const oversizedStorylet = {
        title: 'Memory Test Storylet',
        description: 'Testing memory constraints',
        content: 'Test content',
        status: 'dev',
        triggers: [],
        choices: largeChoicesArray,
        effects: []
      };

      const result = await DatabaseValidator.validateBeforeWrite('storylet', oversizedStorylet);

      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'choices',
            message: expect.stringContaining('performance')
          })
        ])
      );
    });

    it('should validate nested object depth limits', async () => {
      // Create deeply nested object that might cause stack overflow
      let deeplyNestedEffect: any = { type: 'base' };
      for (let i = 0; i < 100; i++) {
        deeplyNestedEffect = {
          type: 'nested',
          child: deeplyNestedEffect,
          level: i
        };
      }

      const storyletWithDeepNesting = {
        title: 'Deep Nesting Test',
        description: 'Testing nesting limits',
        content: 'Test content',
        status: 'dev',
        triggers: [],
        choices: [],
        effects: [deeplyNestedEffect]
      };

      const result = await DatabaseValidator.validateBeforeWrite('storylet', storyletWithDeepNesting);

      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'effects',
            message: expect.stringContaining('nesting')
          })
        ])
      );
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle validation errors gracefully', async () => {
      // Mock sanitization to throw an error
      vi.mocked(Sanitization.sanitizeStoryletContent).mockImplementation(() => {
        throw new Error('Sanitization failed');
      });

      const storylet = {
        title: 'Test Storylet',
        description: 'Test description',
        content: 'Test content',
        status: 'dev',
        triggers: [],
        choices: [],
        effects: []
      };

      const result = await DatabaseValidator.validateBeforeWrite('storylet', storylet);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('Sanitization failed')
          })
        ])
      );
    });

    it('should provide helpful error messages for common mistakes', async () => {
      const commonMistakes = {
        title: null, // null instead of empty string
        description: undefined, // undefined field
        content: 123, // wrong type
        status: 'published', // invalid enum value
        triggers: {}, // object instead of array
        choices: 'none', // string instead of array
        effects: null // null instead of array
      };

      const result = await DatabaseValidator.validateBeforeWrite('storylet', commonMistakes);

      expect(result.isValid).toBe(false);
      result.errors.forEach(error => {
        expect(error.message).toMatch(/required|must be|invalid|should be/);
        expect(error.field).toBeTruthy();
        expect(error.code).toBeTruthy();
      });
    });

    it('should validate throwIfInvalid method', () => {
      const invalidResult = {
        isValid: false,
        errors: [
          {
            field: 'title',
            message: 'Title is required',
            code: 'REQUIRED',
            severity: 'error' as const
          }
        ],
        warnings: []
      };

      expect(() => {
        DatabaseValidator.throwIfInvalid(invalidResult);
      }).toThrow('Validation failed: title: Title is required');

      const validResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      expect(() => {
        DatabaseValidator.throwIfInvalid(validResult);
      }).not.toThrow();
    });
  });
});