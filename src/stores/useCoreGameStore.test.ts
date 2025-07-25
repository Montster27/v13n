/**
 * Comprehensive tests for useCoreGameStore
 * Tests core game state management, resources, time, and feature flags
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCoreGameStore } from './useCoreGameStore';

// Mock constants
vi.mock('../constants/game', () => ({
  INITIAL_RESOURCES: {
    ENERGY: 100,
    SOCIAL: 50,
    KNOWLEDGE: 0,
    MONEY: 200
  }
}));

describe('useCoreGameStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useCoreGameStore.setState({
      gameTime: 0,
      resources: {
        energy: 100,
        social: 50,
        knowledge: 0,
        money: 200
      },
      featureFlags: {},
      environment: 'development',
      currentSaveSlot: null,
      lastSavedAt: null
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useCoreGameStore());
      
      expect(result.current.gameTime).toBe(0);
      expect(result.current.resources).toEqual({
        energy: 100,
        social: 50,
        knowledge: 0,
        money: 200
      });
      expect(result.current.featureFlags).toEqual({});
      expect(result.current.environment).toBe('development');
      expect(result.current.currentSaveSlot).toBeNull();
      expect(result.current.lastSavedAt).toBeNull();
    });
  });

  describe('Time Management', () => {
    it('should advance game time', () => {
      const { result } = renderHook(() => useCoreGameStore());
      
      act(() => {
        result.current.advanceTime(30);
      });
      
      expect(result.current.gameTime).toBe(30);
      
      act(() => {
        result.current.advanceTime(15);
      });
      
      expect(result.current.gameTime).toBe(45);
    });

    it('should handle negative time advances', () => {
      const { result } = renderHook(() => useCoreGameStore());
      
      // Set initial time
      act(() => {
        result.current.advanceTime(60);
      });
      
      expect(result.current.gameTime).toBe(60);
      
      // Try to go back in time
      act(() => {
        result.current.advanceTime(-30);
      });
      
      expect(result.current.gameTime).toBe(30);
    });

    it('should handle large time advances', () => {
      const { result } = renderHook(() => useCoreGameStore());
      
      act(() => {
        result.current.advanceTime(1440); // 24 hours
      });
      
      expect(result.current.gameTime).toBe(1440);
    });
  });

  describe('Resource Management', () => {
    it('should update resources correctly', () => {
      const { result } = renderHook(() => useCoreGameStore());
      
      act(() => {
        result.current.updateResource('energy', -20);
      });
      
      expect(result.current.resources.energy).toBe(80);
      
      act(() => {
        result.current.updateResource('money', 50);
      });
      
      expect(result.current.resources.money).toBe(250);
      
      act(() => {
        result.current.updateResource('knowledge', 25);
      });
      
      expect(result.current.resources.knowledge).toBe(25);
    });

    it('should set resources to absolute values', () => {
      const { result } = renderHook(() => useCoreGameStore());
      
      act(() => {
        result.current.setResource('energy', 75);
      });
      
      expect(result.current.resources.energy).toBe(75);
      
      act(() => {
        result.current.setResource('social', 100);
      });
      
      expect(result.current.resources.social).toBe(100);
    });

    it('should handle negative resource values by clamping to zero', () => {
      const { result } = renderHook(() => useCoreGameStore());
      
      act(() => {
        result.current.updateResource('energy', -150); // More than available
      });
      
      expect(result.current.resources.energy).toBe(0); // Clamped to 0
      
      act(() => {
        result.current.setResource('money', -10);
      });
      
      expect(result.current.resources.money).toBe(0); // Clamped to 0
    });

    it('should handle large resource values', () => {
      const { result } = renderHook(() => useCoreGameStore());
      
      act(() => {
        result.current.setResource('money', 1000000);
      });
      
      expect(result.current.resources.money).toBe(1000000);
    });

    it('should update multiple resources independently', () => {
      const { result } = renderHook(() => useCoreGameStore());
      
      act(() => {
        result.current.updateResource('energy', -10);
        result.current.updateResource('social', 5);
        result.current.updateResource('knowledge', 15);
        result.current.updateResource('money', -25);
      });
      
      expect(result.current.resources).toEqual({
        energy: 90,
        social: 55,
        knowledge: 15,
        money: 175
      });
    });
  });

  describe('Feature Flag Management', () => {
    it('should set and get feature flags', () => {
      const { result } = renderHook(() => useCoreGameStore());
      
      act(() => {
        result.current.setFeatureFlag('newFeature', true);
      });
      
      expect(result.current.isFeatureEnabled('newFeature')).toBe(true);
      expect(result.current.featureFlags.newFeature).toBe(true);
      
      act(() => {
        result.current.setFeatureFlag('anotherFeature', false);
      });
      
      expect(result.current.isFeatureEnabled('anotherFeature')).toBe(false);
      expect(result.current.featureFlags.anotherFeature).toBe(false);
    });

    it('should return false for unknown feature flags', () => {
      const { result } = renderHook(() => useCoreGameStore());
      
      expect(result.current.isFeatureEnabled('unknownFeature')).toBe(false);
    });

    it('should toggle feature flags', () => {
      const { result } = renderHook(() => useCoreGameStore());
      
      act(() => {
        result.current.setFeatureFlag('toggleFeature', true);
      });
      
      expect(result.current.isFeatureEnabled('toggleFeature')).toBe(true);
      
      act(() => {
        result.current.setFeatureFlag('toggleFeature', false);
      });
      
      expect(result.current.isFeatureEnabled('toggleFeature')).toBe(false);
    });

    it('should handle multiple feature flags', () => {
      const { result } = renderHook(() => useCoreGameStore());
      
      act(() => {
        result.current.setFeatureFlag('feature1', true);
        result.current.setFeatureFlag('feature2', false);
        result.current.setFeatureFlag('feature3', true);
      });
      
      expect(result.current.featureFlags).toEqual({
        feature1: true,
        feature2: false,
        feature3: true
      });
      
      expect(result.current.isFeatureEnabled('feature1')).toBe(true);
      expect(result.current.isFeatureEnabled('feature2')).toBe(false);
      expect(result.current.isFeatureEnabled('feature3')).toBe(true);
    });
  });

  describe('Environment Management', () => {
    it('should set environment correctly', () => {
      const { result } = renderHook(() => useCoreGameStore());
      
      act(() => {
        result.current.setEnvironment('production');
      });
      
      expect(result.current.environment).toBe('production');
      
      act(() => {
        result.current.setEnvironment('desktop');
      });
      
      expect(result.current.environment).toBe('desktop');
    });

    it('should maintain environment state', () => {
      const { result } = renderHook(() => useCoreGameStore());
      
      act(() => {
        result.current.setEnvironment('production');
        result.current.advanceTime(30);
        result.current.updateResource('energy', -10);
      });
      
      expect(result.current.environment).toBe('production'); // Should remain unchanged
    });
  });

  describe('Save System', () => {
    it('should manage save slot correctly', () => {
      const { result } = renderHook(() => useCoreGameStore());
      
      act(() => {
        result.current.setSaveSlot(1);
      });
      
      expect(result.current.currentSaveSlot).toBe(1);
      
      act(() => {
        result.current.setSaveSlot(3);
      });
      
      expect(result.current.currentSaveSlot).toBe(3);
      
      act(() => {
        result.current.setSaveSlot(null);
      });
      
      expect(result.current.currentSaveSlot).toBeNull();
    });

    it('should update last saved timestamp', () => {
      const { result } = renderHook(() => useCoreGameStore());
      
      const beforeTime = new Date();
      
      act(() => {
        result.current.updateLastSaved();
      });
      
      const afterTime = new Date();
      
      expect(result.current.lastSavedAt).toBeInstanceOf(Date);
      expect(result.current.lastSavedAt!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(result.current.lastSavedAt!.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should track multiple save operations', (done) => {
      const { result } = renderHook(() => useCoreGameStore());
      
      act(() => {
        result.current.updateLastSaved();
      });
      
      const firstSave = result.current.lastSavedAt;
      
      // Wait a bit to ensure different timestamps
      setTimeout(() => {
        act(() => {
          result.current.updateLastSaved();
        });
        
        expect(result.current.lastSavedAt).not.toEqual(firstSave);
        expect(result.current.lastSavedAt!.getTime()).toBeGreaterThan(firstSave!.getTime());
        done();
      }, 10);
    });
  });

  describe('Game State Reset', () => {
    it('should reset all game state to initial values', () => {
      const { result } = renderHook(() => useCoreGameStore());
      
      // Modify state
      act(() => {
        result.current.advanceTime(120);
        result.current.updateResource('energy', -50);
        result.current.updateResource('money', 100);
        result.current.setFeatureFlag('testFeature', true);
        result.current.setEnvironment('production');
        result.current.setSaveSlot(2);
        result.current.updateLastSaved();
      });
      
      // Verify state was modified
      expect(result.current.gameTime).toBe(120);
      expect(result.current.resources.energy).toBe(50);
      expect(result.current.resources.money).toBe(300);
      expect(result.current.featureFlags.testFeature).toBe(true);
      expect(result.current.environment).toBe('production');
      expect(result.current.currentSaveSlot).toBe(2);
      expect(result.current.lastSavedAt).not.toBeNull();
      
      // Reset state
      act(() => {
        result.current.resetGameState();
      });
      
      // Verify reset to initial values
      expect(result.current.gameTime).toBe(0);
      expect(result.current.resources).toEqual({
        energy: 100,
        social: 50,
        knowledge: 0,
        money: 200
      });
      expect(result.current.featureFlags).toEqual({ testFeature: true }); // Feature flags not reset by resetGameState
      expect(result.current.environment).toBe('production'); // Environment not reset by resetGameState
      expect(result.current.currentSaveSlot).toBeNull();
      expect(result.current.lastSavedAt).toBeNull();
    });
  });

  describe('Complex State Interactions', () => {
    it('should handle multiple simultaneous state changes', () => {
      const { result } = renderHook(() => useCoreGameStore());
      
      act(() => {
        result.current.advanceTime(60);
        result.current.updateResource('energy', -30);
        result.current.updateResource('social', 10);
        result.current.setFeatureFlag('complexFeature', true);
        result.current.setSaveSlot(1);
      });
      
      expect(result.current.gameTime).toBe(60);
      expect(result.current.resources.energy).toBe(70);
      expect(result.current.resources.social).toBe(60);
      expect(result.current.isFeatureEnabled('complexFeature')).toBe(true);
      expect(result.current.currentSaveSlot).toBe(1);
    });

    it('should maintain state consistency during rapid changes', () => {
      const { result } = renderHook(() => useCoreGameStore());
      
      // Perform many rapid state changes
      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.updateResource('energy', -1);
          result.current.advanceTime(1);
        }
      });
      
      expect(result.current.gameTime).toBe(100);
      expect(result.current.resources.energy).toBe(0); // 100 - 100
    });

    it('should handle edge cases in resource management', () => {
      const { result } = renderHook(() => useCoreGameStore());
      
      // Test zero updates
      act(() => {
        result.current.updateResource('energy', 0);
        result.current.updateResource('money', 0);
      });
      
      expect(result.current.resources.energy).toBe(100);
      expect(result.current.resources.money).toBe(200);
      
      // Test floating point values
      act(() => {
        result.current.updateResource('energy', -10.5);
        result.current.setResource('social', 75.25);
      });
      
      expect(result.current.resources.energy).toBe(89.5);
      expect(result.current.resources.social).toBe(75.25);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid resource types gracefully', () => {
      const { result } = renderHook(() => useCoreGameStore());
      
      // These should not throw errors but may not do anything
      expect(() => {
        act(() => {
          // @ts-ignore - Testing invalid resource type
          result.current.updateResource('invalidResource', 10);
        });
      }).not.toThrow();
      
      expect(() => {
        act(() => {
          // @ts-ignore - Testing invalid resource type
          result.current.setResource('anotherInvalid', 50);
        });
      }).not.toThrow();
    });

    it('should handle extreme values', () => {
      const { result } = renderHook(() => useCoreGameStore());
      
      act(() => {
        result.current.setResource('money', Number.MAX_SAFE_INTEGER);
        result.current.advanceTime(Number.MAX_SAFE_INTEGER);
      });
      
      expect(result.current.resources.money).toBe(Number.MAX_SAFE_INTEGER);
      expect(result.current.gameTime).toBe(Number.MAX_SAFE_INTEGER);
      
      act(() => {
        result.current.setResource('energy', Number.MIN_SAFE_INTEGER);
      });
      
      expect(result.current.resources.energy).toBe(0); // Clamped to 0 by Math.max
    });

    it('should handle concurrent state updates', () => {
      const { result } = renderHook(() => useCoreGameStore());
      
      // Simulate concurrent updates
      act(() => {
        Promise.all([
          Promise.resolve(result.current.updateResource('energy', -10)),
          Promise.resolve(result.current.updateResource('social', 5)),
          Promise.resolve(result.current.advanceTime(30)),
          Promise.resolve(result.current.setFeatureFlag('concurrent', true))
        ]);
      });
      
      expect(result.current.resources.energy).toBe(90);
      expect(result.current.resources.social).toBe(55);
      expect(result.current.gameTime).toBe(30);
      expect(result.current.isFeatureEnabled('concurrent')).toBe(true);
    });
  });

  describe('State Persistence Simulation', () => {
    it('should maintain state between hook re-renders', () => {
      const { result, rerender } = renderHook(() => useCoreGameStore());
      
      // Modify state
      act(() => {
        result.current.advanceTime(45);
        result.current.updateResource('knowledge', 30);
        result.current.setFeatureFlag('persistent', true);
      });
      
      // Re-render hook
      rerender();
      
      // State should persist
      expect(result.current.gameTime).toBe(45);
      expect(result.current.resources.knowledge).toBe(30);
      expect(result.current.isFeatureEnabled('persistent')).toBe(true);
    });

    it('should handle state serialization/deserialization simulation', () => {
      const { result } = renderHook(() => useCoreGameStore());
      
      // Set up complex state
      act(() => {
        result.current.advanceTime(120);
        result.current.updateResource('energy', -25);
        result.current.updateResource('social', 15);
        result.current.updateResource('knowledge', 40);
        result.current.updateResource('money', -50);
        result.current.setFeatureFlag('feature1', true);
        result.current.setFeatureFlag('feature2', false);
        result.current.setEnvironment('production');
        result.current.setSaveSlot(3);
      });
      
      // Simulate serialization
      const state = {
        gameTime: result.current.gameTime,
        resources: { ...result.current.resources },
        featureFlags: { ...result.current.featureFlags },
        environment: result.current.environment,
        currentSaveSlot: result.current.currentSaveSlot
      };
      
      // Reset and restore (simulating load)
      act(() => {
        result.current.resetGameState();
      });
      
      expect(result.current.gameTime).toBe(0);
      
      // Restore state
      act(() => {
        useCoreGameStore.setState({
          gameTime: state.gameTime,
          resources: state.resources,
          featureFlags: state.featureFlags,
          environment: state.environment,
          currentSaveSlot: state.currentSaveSlot,
          lastSavedAt: null
        });
      });
      
      // Verify restoration
      expect(result.current.gameTime).toBe(120);
      expect(result.current.resources).toEqual({
        energy: 75,
        social: 65,
        knowledge: 40,
        money: 150
      });
      expect(result.current.featureFlags).toEqual({
        feature1: true,
        feature2: false
      });
      expect(result.current.environment).toBe('production');
      expect(result.current.currentSaveSlot).toBe(3);
    });
  });
});