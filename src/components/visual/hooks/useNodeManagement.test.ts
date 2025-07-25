/**
 * Tests for useNodeManagement hook
 * Verifies that storylet nodes can be created properly
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNodeManagement } from './useNodeManagement';

// Mock the narrative store
const mockNarrativeStore = {
  addStorylet: vi.fn().mockResolvedValue('new-storylet-id')
};

vi.mock('../../../stores/useNarrativeStore', () => ({
  useNarrativeStore: {
    getState: () => mockNarrativeStore
  }
}));

// Mock the visual editor store
const mockVisualEditorStore = {
  addNode: vi.fn()
};

vi.mock('../../../stores/useVisualEditorStore', () => ({
  useVisualEditorStore: {
    getState: () => mockVisualEditorStore
  }
}));

describe('useNodeManagement', () => {
  let onStoryletCreatedMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    onStoryletCreatedMock = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Node Creation', () => {
    it('should create storylet and add visual node', async () => {
      const { result } = renderHook(() => useNodeManagement(onStoryletCreatedMock));

      await act(async () => {
        await result.current.handleAddStoryletNode();
      });

      // Should create storylet in narrative store
      expect(mockNarrativeStore.addStorylet).toHaveBeenCalledWith({
        title: 'New Storylet',
        description: 'A new storylet to be configured',
        content: 'This storylet needs content. Double-click to edit.',
        triggers: [],
        choices: [],
        effects: [],
        status: 'dev',
        tags: [],
        priority: 1,
        estimatedPlayTime: 5,
        prerequisites: []
      });

      // Should add visual node
      expect(mockVisualEditorStore.addNode).toHaveBeenCalledWith({
        type: 'storylet',
        position: expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number)
        }),
        data: {
          storyletId: 'new-storylet-id',
          title: 'New Storylet',
          description: 'Double-click to edit'
        }
      });

      // Should call the callback
      expect(onStoryletCreatedMock).toHaveBeenCalledWith('new-storylet-id');
    });

    it('should handle storylet creation errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockNarrativeStore.addStorylet.mockRejectedValueOnce(new Error('Creation failed'));

      const { result } = renderHook(() => useNodeManagement(onStoryletCreatedMock));

      await act(async () => {
        await result.current.handleAddStoryletNode();
      });

      // Should handle error
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to create storylet:', expect.any(Error));
      
      // Should not add visual node on error
      expect(mockVisualEditorStore.addNode).not.toHaveBeenCalled();
      expect(onStoryletCreatedMock).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should generate random positions for new nodes', async () => {
      const { result } = renderHook(() => useNodeManagement());

      await act(async () => {
        await result.current.handleAddStoryletNode();
      });

      const addNodeCall = mockVisualEditorStore.addNode.mock.calls[0][0];
      
      // Position should be within expected range
      expect(addNodeCall.position.x).toBeGreaterThanOrEqual(200);
      expect(addNodeCall.position.x).toBeLessThanOrEqual(600);
      expect(addNodeCall.position.y).toBeGreaterThanOrEqual(100);
      expect(addNodeCall.position.y).toBeLessThanOrEqual(400);
    });

    it('should work without callback', async () => {
      const { result } = renderHook(() => useNodeManagement());

      await act(async () => {
        await result.current.handleAddStoryletNode();
      });

      // Should still create storylet and node
      expect(mockNarrativeStore.addStorylet).toHaveBeenCalled();
      expect(mockVisualEditorStore.addNode).toHaveBeenCalled();
    });
  });

  describe('Hook Return Value', () => {
    it('should return handleAddStoryletNode function', () => {
      const { result } = renderHook(() => useNodeManagement());

      expect(result.current).toHaveProperty('handleAddStoryletNode');
      expect(typeof result.current.handleAddStoryletNode).toBe('function');
    });

    it('should maintain stable function reference', () => {
      const { result, rerender } = renderHook(() => useNodeManagement());

      const firstFunction = result.current.handleAddStoryletNode;
      
      rerender();
      
      const secondFunction = result.current.handleAddStoryletNode;
      
      // Function should be stable across rerenders
      expect(firstFunction).toBe(secondFunction);
    });
  });
});