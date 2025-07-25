/**
 * Comprehensive tests for useNarrativeStore
 * Tests storylet and story arc CRUD operations with validation and security
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNarrativeStore } from './useNarrativeStore';
import * as DatabaseValidator from '../utils/dataValidation';

// Mock the database
vi.mock('../lib/db', () => ({
  db: {
    storylets: {
      add: vi.fn().mockResolvedValue('mock-id'),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue({
        id: 'existing-storylet',
        title: 'Existing Storylet',
        description: 'An existing storylet',
        content: 'Existing content',
        status: 'dev',
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      toArray: vi.fn().mockResolvedValue([])
    },
    storyArcs: {
      add: vi.fn().mockResolvedValue('mock-arc-id'),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue({
        id: 'existing-arc',
        name: 'Existing Arc',
        description: 'An existing arc',
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      toArray: vi.fn().mockResolvedValue([])
    }
  },
  serializeStorylet: vi.fn().mockImplementation((storylet) => storylet),
  deserializeStorylet: vi.fn().mockImplementation((storylet) => storylet),
  serializeStoryArc: vi.fn().mockImplementation((arc) => arc),
  deserializeStoryArc: vi.fn().mockImplementation((arc) => arc)
}));

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: vi.fn().mockReturnValue('test-uuid-123')
});

describe('useNarrativeStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useNarrativeStore());
    act(() => {
      result.current.storylets.length = 0;
      result.current.arcs.length = 0;
      result.current.currentStoryletId = null;
      result.current.currentArcId = null;
      result.current.loading = {
        storylets: false,
        arcs: false,
        operations: new Map()
      };
    });
    
    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Storylet CRUD Operations', () => {
    it('should add a new storylet with validation', async () => {
      const mockValidation = {
        isValid: true,
        errors: [],
        warnings: [],
        sanitizedData: {
          title: 'Test Storylet',
          description: 'Test Description',
          content: 'Test Content',
          triggers: [],
          choices: [],
          effects: [],
          status: 'dev' as const,
          tags: ['test']
        }
      };

      // Mock successful validation
      vi.spyOn(DatabaseValidator.DatabaseValidator, 'validateBeforeWrite')
        .mockResolvedValue(mockValidation);
      vi.spyOn(DatabaseValidator.DatabaseValidator, 'throwIfInvalid')
        .mockImplementation(() => {});

      const { result } = renderHook(() => useNarrativeStore());

      let storyletId: string;
      await act(async () => {
        storyletId = await result.current.addStorylet({
          title: 'Test Storylet',
          description: 'Test Description',
          content: 'Test Content',
          triggers: [],
          choices: [],
          effects: [],
          status: 'dev',
          tags: ['test']
        });
      });

      // Verify validation was called
      expect(DatabaseValidator.DatabaseValidator.validateBeforeWrite)
        .toHaveBeenCalledWith('storylet', expect.objectContaining({
          title: 'Test Storylet',
          description: 'Test Description'
        }));

      // Verify storylet was added to store
      expect(result.current.storylets).toHaveLength(1);
      expect(result.current.storylets[0]).toMatchObject({
        id: 'test-uuid-123',
        title: 'Test Storylet',
        description: 'Test Description',
        content: 'Test Content',
        status: 'dev',
        tags: ['test']
      });

      // Verify return value
      expect(storyletId!).toBe('test-uuid-123');
    });

    it('should handle validation errors when adding storylet', async () => {
      const mockValidation = {
        isValid: false,
        errors: [{ field: 'title', message: 'Title is required', code: 'REQUIRED', severity: 'error' as const }],
        warnings: []
      };

      // Mock validation failure
      vi.spyOn(DatabaseValidator.DatabaseValidator, 'validateBeforeWrite')
        .mockResolvedValue(mockValidation);
      vi.spyOn(DatabaseValidator.DatabaseValidator, 'throwIfInvalid')
        .mockImplementation(() => {
          throw new Error('Validation failed: title: Title is required');
        });

      const { result } = renderHook(() => useNarrativeStore());

      await act(async () => {
        await expect(result.current.addStorylet({
          title: '',
          description: 'Test Description',
          content: 'Test Content',
          triggers: [],
          choices: [],
          effects: [],
          status: 'dev'
        })).rejects.toThrow('Validation failed');
      });

      // Verify no storylet was added
      expect(result.current.storylets).toHaveLength(0);
    });

    it('should update an existing storylet with validation', async () => {
      const mockValidation = {
        isValid: true,
        errors: [],
        warnings: [],
        sanitizedData: {
          title: 'Updated Storylet',
          description: 'Updated Description'
        }
      };

      // Mock successful validation
      vi.spyOn(DatabaseValidator.DatabaseValidator, 'validateBeforeWrite')
        .mockResolvedValue(mockValidation);
      vi.spyOn(DatabaseValidator.DatabaseValidator, 'throwIfInvalid')
        .mockImplementation(() => {});

      const { result } = renderHook(() => useNarrativeStore());

      // First add a storylet
      act(() => {
        result.current.storylets.push({
          id: 'existing-id',
          title: 'Original Title',
          description: 'Original Description',
          content: 'Original Content',
          triggers: [],
          choices: [],
          effects: [],
          status: 'dev',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      });

      // Update the storylet
      await act(async () => {
        await result.current.updateStorylet('existing-id', {
          title: 'Updated Storylet',
          description: 'Updated Description'
        });
      });

      // Verify storylet was updated
      const updatedStorylet = result.current.storylets.find(s => s.id === 'existing-id');
      expect(updatedStorylet).toMatchObject({
        title: 'Updated Storylet',
        description: 'Updated Description'
      });
    });

    it('should delete a storylet', async () => {
      const { result } = renderHook(() => useNarrativeStore());

      // First add a storylet
      act(() => {
        result.current.storylets.push({
          id: 'to-delete',
          title: 'Delete Me',
          description: 'Test Description',
          content: 'Test Content',
          triggers: [],
          choices: [],
          effects: [],
          status: 'dev',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      });

      expect(result.current.storylets).toHaveLength(1);

      // Delete the storylet
      await act(async () => {
        await result.current.deleteStorylet('to-delete');
      });

      // Verify storylet was removed
      expect(result.current.storylets).toHaveLength(0);
    });

    it('should get a storylet by ID', () => {
      const { result } = renderHook(() => useNarrativeStore());

      const testStorylet = {
        id: 'test-id',
        title: 'Test Storylet',
        description: 'Test Description',
        content: 'Test Content',
        triggers: [],
        choices: [],
        effects: [],
        status: 'dev' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Add a storylet
      act(() => {
        result.current.storylets.push(testStorylet);
      });

      // Get the storylet
      const foundStorylet = result.current.getStorylet('test-id');
      expect(foundStorylet).toEqual(testStorylet);

      // Test non-existent ID
      const notFound = result.current.getStorylet('non-existent');
      expect(notFound).toBeUndefined();
    });
  });

  describe('Story Arc CRUD Operations', () => {
    it('should add a new story arc', async () => {
      const { result } = renderHook(() => useNarrativeStore());

      let arcId: string;
      await act(async () => {
        arcId = await result.current.addStoryArc({
          name: 'Test Arc',
          description: 'Test Arc Description',
          estimatedLength: 30,
          prerequisites: [],
          tags: ['test']
        });
      });

      // Verify arc was added to store
      expect(result.current.arcs).toHaveLength(1);
      expect(result.current.arcs[0]).toMatchObject({
        id: 'test-uuid-123',
        name: 'Test Arc',
        description: 'Test Arc Description',
        estimatedLength: 30,
        tags: ['test']
      });

      expect(arcId!).toBe('test-uuid-123');
    });

    it('should update an existing story arc', async () => {
      const { result } = renderHook(() => useNarrativeStore());

      // First add an arc
      act(() => {
        result.current.arcs.push({
          id: 'existing-arc-id',
          name: 'Original Arc',
          description: 'Original Description',
          createdAt: '2023-01-01',
          updatedAt: '2023-01-01'
        });
      });

      // Update the arc
      await act(async () => {
        await result.current.updateStoryArc('existing-arc-id', {
          name: 'Updated Arc',
          description: 'Updated Description'
        });
      });

      // Verify arc was updated
      const updatedArc = result.current.arcs.find(a => a.id === 'existing-arc-id');
      expect(updatedArc).toMatchObject({
        name: 'Updated Arc',
        description: 'Updated Description'
      });
    });

    it('should delete a story arc', async () => {
      const { result } = renderHook(() => useNarrativeStore());

      // First add an arc
      act(() => {
        result.current.arcs.push({
          id: 'to-delete-arc',
          name: 'Delete Me Arc',
          description: 'Test Description',
          createdAt: '2023-01-01',
          updatedAt: '2023-01-01'
        });
      });

      expect(result.current.arcs).toHaveLength(1);

      // Delete the arc
      await act(async () => {
        await result.current.deleteStoryArc('to-delete-arc');
      });

      // Verify arc was removed
      expect(result.current.arcs).toHaveLength(0);
    });

    it('should get an arc by ID', () => {
      const { result } = renderHook(() => useNarrativeStore());

      const testArc = {
        id: 'test-arc-id',
        name: 'Test Arc',
        description: 'Test Description',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01'
      };

      // Add an arc
      act(() => {
        result.current.arcs.push(testArc);
      });

      // Get the arc
      const foundArc = result.current.getArc('test-arc-id');
      expect(foundArc).toEqual(testArc);

      // Test non-existent ID
      const notFound = result.current.getArc('non-existent');
      expect(notFound).toBeUndefined();
    });
  });

  describe('Loading States', () => {
    it('should track loading states for operations', async () => {
      const mockValidation = {
        isValid: true,
        errors: [],
        warnings: [],
        sanitizedData: {
          title: 'Test Storylet',
          description: 'Test Description',
          content: 'Test Content',
          triggers: [],
          choices: [],
          effects: [],
          status: 'dev' as const
        }
      };

      vi.spyOn(DatabaseValidator.DatabaseValidator, 'validateBeforeWrite')
        .mockResolvedValue(mockValidation);
      vi.spyOn(DatabaseValidator.DatabaseValidator, 'throwIfInvalid')
        .mockImplementation(() => {});

      const { result } = renderHook(() => useNarrativeStore());

      // Start an operation and check loading state
      const addPromise = act(async () => {
        return result.current.addStorylet({
          title: 'Test Storylet',
          description: 'Test Description',
          content: 'Test Content',
          triggers: [],
          choices: [],
          effects: [],
          status: 'dev'
        });
      });

      await addPromise;

      // Wait for any pending state updates
      await new Promise(resolve => setTimeout(resolve, 10));

      // Verify loading state was managed (operation should be set to false after completion)
      expect(result.current.loading.operations.size).toBe(1);
      const operationEntries = Array.from(result.current.loading.operations.entries());
      expect(operationEntries[0][1]).toBe(false); // Operation should be false (completed)
    });

    it('should track loading states for data loading', async () => {
      const { result } = renderHook(() => useNarrativeStore());

      // Load storylets
      await act(async () => {
        await result.current.loadStorylets();
      });

      // Verify loading state was managed
      expect(result.current.loading.storylets).toBe(false);

      // Load story arcs
      await act(async () => {
        await result.current.loadStoryArcs();
      });

      // Verify loading state was managed
      expect(result.current.loading.arcs).toBe(false);
    });
  });

  describe('Current Selection Management', () => {
    it('should set and clear current storylet', () => {
      const { result } = renderHook(() => useNarrativeStore());

      act(() => {
        result.current.setCurrentStorylet('storylet-123');
      });

      expect(result.current.currentStoryletId).toBe('storylet-123');

      act(() => {
        result.current.setCurrentStorylet(null);
      });

      expect(result.current.currentStoryletId).toBeNull();
    });

    it('should set and clear current arc', () => {
      const { result } = renderHook(() => useNarrativeStore());

      act(() => {
        result.current.setCurrentArc('arc-456');
      });

      expect(result.current.currentArcId).toBe('arc-456');

      act(() => {
        result.current.setCurrentArc(null);
      });

      expect(result.current.currentArcId).toBeNull();
    });
  });

  describe('Storylet Execution', () => {
    it('should trigger storylet execution', async () => {
      const { result } = renderHook(() => useNarrativeStore());

      // Add a test storylet
      act(() => {
        result.current.storylets.push({
          id: 'test-storylet',
          title: 'Test Storylet',
          description: 'Test Description',
          content: 'Test Content',
          triggers: [],
          choices: [],
          effects: [],
          status: 'dev',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      });

      // Trigger the storylet
      await act(async () => {
        await result.current.triggerStorylet('test-storylet', { testContext: true });
      });

      // Verify current storylet was set
      expect(result.current.currentStoryletId).toBe('test-storylet');
    });

    it('should handle non-existent storylet trigger', async () => {
      const { result } = renderHook(() => useNarrativeStore());

      // Mock console.error to verify error is logged
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await act(async () => {
        await result.current.triggerStorylet('non-existent', {});
      });

      // Verify error was logged for storylet execution failure
      expect(consoleSpy).toHaveBeenCalledWith('Storylet execution failed:', ['Storylet with ID "non-existent" not found']);

      consoleSpy.mockRestore();
    });
  });
});