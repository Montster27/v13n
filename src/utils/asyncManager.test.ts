/**
 * Tests for AsyncOperationManager fixes
 * Verifies that the manager handles destruction gracefully
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AsyncOperationManager } from './asyncManager';

describe('AsyncOperationManager', () => {
  let manager: AsyncOperationManager;
  let consoleSpy: any;

  beforeEach(() => {
    manager = new AsyncOperationManager();
    consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    manager.destroy();
  });

  describe('Destruction Handling', () => {
    it('should handle registration attempts after destruction gracefully', async () => {
      // Destroy the manager first
      manager.destroy();

      // Try to register an operation
      const operationPromise = manager.register(
        'test-operation',
        'test',
        async () => {
          return 'result';
        }
      );

      // Should reject with appropriate error
      await expect(operationPromise).rejects.toThrow('AsyncOperationManager is destroyed');

      // Should have logged a warning
      expect(consoleSpy).toHaveBeenCalledWith(
        "Attempted to register operation 'test-operation' on destroyed AsyncOperationManager"
      );
    });

    it('should complete ongoing operations before destruction', async () => {
      let operationCompleted = false;
      
      // Register an operation
      const operationPromise = manager.register(
        'ongoing-operation',
        'test',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          operationCompleted = true;
          return 'completed';
        }
      );

      // Destroy manager immediately (simulating React strict mode)
      setTimeout(() => manager.destroy(), 50);

      // Operation should still complete
      await expect(operationPromise).resolves.toBe('completed');
      expect(operationCompleted).toBe(true);
    });

    it('should prevent new registrations after destruction', async () => {
      manager.destroy();
      
      expect(manager.isManagerDestroyed()).toBe(true);
      
      // Attempting to register should fail gracefully
      const promise = manager.register('test', 'test', async () => 'test');
      await expect(promise).rejects.toThrow('AsyncOperationManager is destroyed');
    });

    it('should handle multiple destroy calls gracefully', () => {
      manager.destroy();
      
      // Multiple destroy calls should not cause issues
      expect(() => {
        manager.destroy();
        manager.destroy();
      }).not.toThrow();
      
      expect(manager.isManagerDestroyed()).toBe(true);
    });

    it('should cancel all operations on destroy', async () => {
      const operation1Cancelled = vi.fn();
      const operation2Cancelled = vi.fn();

      // Register multiple operations and catch their rejections
      const promise1 = manager.register('op1', 'test', async (signal) => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => resolve('op1'), 1000);
          signal?.addEventListener('abort', () => {
            clearTimeout(timeout);
            operation1Cancelled();
            reject(new Error('Aborted'));
          });
        });
      }).catch(() => {}); // Catch to avoid unhandled rejection

      const promise2 = manager.register('op2', 'test', async (signal) => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => resolve('op2'), 1000);
          signal?.addEventListener('abort', () => {
            clearTimeout(timeout);
            operation2Cancelled();
            reject(new Error('Aborted'));
          });
        });
      }).catch(() => {}); // Catch to avoid unhandled rejection

      expect(manager.getActiveCount()).toBe(2);

      // Destroy should cancel all
      manager.destroy();

      // Wait for promises to settle
      await Promise.allSettled([promise1, promise2]);

      // Wait a bit more for cleanup
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(operation1Cancelled).toHaveBeenCalled();
      expect(operation2Cancelled).toHaveBeenCalled();
      expect(manager.getActiveCount()).toBe(0);
    });
  });

  describe('Operation Management', () => {
    it('should replace operations with same ID', async () => {
      let firstOperationCancelled = false;
      let secondOperationCompleted = false;

      // Register first operation
      const firstPromise = manager.register('same-id', 'test', async (signal) => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => resolve('first'), 1000);
          signal?.addEventListener('abort', () => {
            clearTimeout(timeout);
            firstOperationCancelled = true;
            reject(new Error('Aborted'));
          });
        });
      });

      // Register second operation with same ID (should cancel first)
      const secondPromise = manager.register('same-id', 'test', async () => {
        secondOperationCompleted = true;
        return 'second';
      });

      // First should be cancelled, second should complete
      await expect(firstPromise).rejects.toThrow();
      await expect(secondPromise).resolves.toBe('second');

      expect(firstOperationCancelled).toBe(true);
      expect(secondOperationCompleted).toBe(true);
    });

    it('should track active operations correctly', () => {
      expect(manager.getActiveCount()).toBe(0);

      manager.register('op1', 'test', async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'result';
      });

      expect(manager.getActiveCount()).toBe(1);
      expect(manager.getActiveCount('test')).toBe(1);
      expect(manager.getActiveCount('other')).toBe(0);

      manager.register('op2', 'other', async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'result';
      });

      expect(manager.getActiveCount()).toBe(2);
      expect(manager.getActiveCount('test')).toBe(1);
      expect(manager.getActiveCount('other')).toBe(1);
    });
  });
});