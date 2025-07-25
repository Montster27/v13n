/**
 * Async Operation Manager - Handles race conditions, cleanup, and proper async flow
 */

export interface AsyncOperation {
  id: string;
  type: string;
  promise: Promise<any>;
  controller?: AbortController;
  cleanup?: () => void;
  timestamp: number;
}

export class AsyncOperationManager {
  private operations = new Map<string, AsyncOperation>();
  private isDestroyed = false;

  /**
   * Register an async operation with automatic cleanup
   */
  register<T>(
    id: string,
    type: string,
    operation: (signal?: AbortSignal) => Promise<T>,
    cleanup?: () => void
  ): Promise<T> {
    if (this.isDestroyed) {
      // More graceful handling - just log a warning instead of throwing
      console.warn(`Attempted to register operation '${id}' on destroyed AsyncOperationManager`);
      return Promise.reject(new Error('AsyncOperationManager is destroyed'));
    }

    // Cancel previous operation with same ID
    this.cancel(id);

    const controller = new AbortController();
    const promise = operation(controller.signal)
      .finally(() => {
        this.operations.delete(id);
        cleanup?.();
      });

    const asyncOp: AsyncOperation = {
      id,
      type,
      promise,
      controller,
      cleanup,
      timestamp: Date.now()
    };

    this.operations.set(id, asyncOp);
    return promise;
  }

  /**
   * Cancel a specific operation
   */
  cancel(id: string): boolean {
    const operation = this.operations.get(id);
    if (operation) {
      operation.controller?.abort();
      operation.cleanup?.();
      this.operations.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Cancel all operations of a specific type
   */
  cancelType(type: string): number {
    let cancelled = 0;
    for (const [id, operation] of this.operations) {
      if (operation.type === type) {
        this.cancel(id);
        cancelled++;
      }
    }
    return cancelled;
  }

  /**
   * Cancel all operations
   */
  cancelAll(): void {
    for (const [id] of this.operations) {
      this.cancel(id);
    }
  }

  /**
   * Get active operations count
   */
  getActiveCount(type?: string): number {
    if (type) {
      return Array.from(this.operations.values()).filter(op => op.type === type).length;
    }
    return this.operations.size;
  }

  /**
   * Wait for all operations to complete
   */
  async waitForAll(type?: string): Promise<void> {
    const operations = Array.from(this.operations.values())
      .filter(op => !type || op.type === type)
      .map(op => op.promise.catch(() => {})); // Ignore errors

    await Promise.all(operations);
  }

  /**
   * Destroy the manager and cancel all operations
   */
  destroy(): void {
    this.isDestroyed = true;
    this.cancelAll();
  }

  /**
   * Check if manager is destroyed
   */
  isManagerDestroyed(): boolean {
    return this.isDestroyed;
  }
}

/**
 * Debounced async operation - prevents rapid successive calls
 */
export class DebouncedAsyncOperation {
  private timeoutId: number | null = null;
  private lastArgs: any[] = [];
  private manager: AsyncOperationManager;
  private operationId: string;
  private operation: (...args: any[]) => Promise<any>;
  private delay: number;

  constructor(
    operation: (...args: any[]) => Promise<any>,
    delay: number = 300,
    operationId: string = 'debounced'
  ) {
    this.operation = operation;
    this.delay = delay;
    this.manager = new AsyncOperationManager();
    this.operationId = operationId;
  }

  execute(...args: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      this.lastArgs = args;

      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }

      this.timeoutId = setTimeout(async () => {
        try {
          const result = await this.manager.register(
            this.operationId,
            'debounced',
            async (signal) => {
              if (signal?.aborted) {
                throw new Error('Operation aborted');
              }
              return this.operation(...this.lastArgs);
            }
          );
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, this.delay);
    });
  }

  cancelOperation(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.manager.cancelAll();
  }

  destroyOperation(): void {
    this.cancelOperation();
    this.manager.destroy();
  }
}

/**
 * Sequential async operation queue - ensures operations run in order
 */
export class SequentialAsyncQueue {
  private queue: Array<() => Promise<any>> = [];
  private isRunning = false;
  private manager: AsyncOperationManager;

  constructor() {
    this.manager = new AsyncOperationManager();
  }

  add<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await this.manager.register(
            `queue-${Date.now()}`,
            'sequential',
            async (signal) => {
              if (signal?.aborted) {
                throw new Error('Operation aborted');
              }
              return operation();
            }
          );
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isRunning || this.queue.length === 0) {
      return;
    }

    this.isRunning = true;

    while (this.queue.length > 0) {
      const operation = this.queue.shift();
      if (operation) {
        try {
          await operation();
        } catch (error) {
          console.error('Sequential queue operation failed:', error);
        }
      }
    }

    this.isRunning = false;
  }

  clear(): void {
    this.queue = [];
    this.manager.cancelAll();
  }

  destroy(): void {
    this.clear();
    this.manager.destroy();
  }

  getLength(): number {
    return this.queue.length;
  }

  isQueueRunning(): boolean {
    return this.isRunning;
  }
}

/**
 * React hook for managing async operations with cleanup
 */
export function useAsyncOperationManager(): AsyncOperationManager {
  const managerRef = React.useRef<AsyncOperationManager | null>(null);

  if (!managerRef.current || managerRef.current.isManagerDestroyed()) {
    managerRef.current = new AsyncOperationManager();
  }

  React.useEffect(() => {
    const manager = managerRef.current;
    
    return () => {
      // Use a timeout to allow any pending operations to complete gracefully
      setTimeout(() => {
        manager?.destroy();
      }, 0);
    };
  }, []);

  return managerRef.current;
}

// Import React for the hook
import React from 'react';