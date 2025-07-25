/**
 * Loading State Management Hook
 * 
 * Provides centralized loading state management for async operations
 * with integration to AsyncOperationManager for proper cleanup
 */

import React, { useState, useCallback, useRef } from 'react';
import { useAsyncOperationManager } from '../utils/asyncManager';

export interface LoadingOperation {
  id: string;
  type: string;
  message: string;
  progress?: number;
  startTime: number;
}

export interface UseLoadingStateOptions {
  defaultMessage?: string;
  showProgress?: boolean;
  timeout?: number;
}

export interface LoadingState {
  isLoading: boolean;
  operations: Map<string, LoadingOperation>;
  message: string;
  progress?: number;
}

/**
 * Hook for managing loading states with automatic cleanup
 */
export function useLoadingState(options: UseLoadingStateOptions = {}) {
  const {
    defaultMessage = 'Loading...',
    showProgress = false,
    timeout = 30000 // 30 seconds default timeout
  } = options;

  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    operations: new Map(),
    message: defaultMessage,
    progress: showProgress ? 0 : undefined
  });

  const asyncManager = useAsyncOperationManager();
  const timeoutRefs = useRef<Map<string, number>>(new Map());

  /**
   * Start a loading operation
   */
  const startLoading = useCallback((
    id: string,
    type: string,
    message: string = defaultMessage,
    progress?: number
  ) => {
    const operation: LoadingOperation = {
      id,
      type,
      message,
      progress,
      startTime: Date.now()
    };

    setLoadingState(prev => {
      const newOperations = new Map(prev.operations);
      newOperations.set(id, operation);

      return {
        isLoading: true,
        operations: newOperations,
        message: newOperations.size === 1 ? message : `${newOperations.size} operations running...`,
        progress: showProgress ? (progress ?? 0) : undefined
      };
    });

    // Set timeout for the operation
    if (timeout > 0) {
      const timeoutId = setTimeout(() => {
        console.warn(`Loading operation '${id}' timed out after ${timeout}ms`);
        stopLoading(id);
      }, timeout);
      
      timeoutRefs.current.set(id, timeoutId);
    }
  }, [defaultMessage, showProgress, timeout]);

  /**
   * Update progress for a loading operation
   */
  const updateProgress = useCallback((id: string, progress: number, message?: string) => {
    setLoadingState(prev => {
      const newOperations = new Map(prev.operations);
      const operation = newOperations.get(id);
      
      if (operation) {
        newOperations.set(id, {
          ...operation,
          progress,
          message: message || operation.message
        });

        // Calculate average progress if showing progress
        let avgProgress: number | undefined;
        if (showProgress) {
          const operations = Array.from(newOperations.values());
          const progressOps = operations.filter(op => op.progress !== undefined);
          if (progressOps.length > 0) {
            avgProgress = progressOps.reduce((sum, op) => sum + (op.progress || 0), 0) / progressOps.length;
          }
        }

        return {
          ...prev,
          operations: newOperations,
          message: message || prev.message,
          progress: avgProgress
        };
      }

      return prev;
    });
  }, [showProgress]);

  /**
   * Stop a loading operation
   */
  const stopLoading = useCallback((id: string) => {
    // Clear timeout
    const timeoutId = timeoutRefs.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutRefs.current.delete(id);
    }

    setLoadingState(prev => {
      const newOperations = new Map(prev.operations);
      newOperations.delete(id);

      if (newOperations.size === 0) {
        return {
          isLoading: false,
          operations: newOperations,
          message: defaultMessage,
          progress: showProgress ? 0 : undefined
        };
      }

      // Update message and progress for remaining operations
      const remainingOps = Array.from(newOperations.values());
      const latestOp = remainingOps[remainingOps.length - 1];
      
      let avgProgress: number | undefined;
      if (showProgress) {
        const progressOps = remainingOps.filter(op => op.progress !== undefined);
        if (progressOps.length > 0) {
          avgProgress = progressOps.reduce((sum, op) => sum + (op.progress || 0), 0) / progressOps.length;
        }
      }

      return {
        isLoading: true,
        operations: newOperations,
        message: remainingOps.length === 1 ? latestOp.message : `${remainingOps.length} operations running...`,
        progress: avgProgress
      };
    });
  }, [defaultMessage, showProgress]);

  /**
   * Stop all loading operations
   */
  const stopAllLoading = useCallback(() => {
    // Clear all timeouts
    timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
    timeoutRefs.current.clear();

    setLoadingState({
      isLoading: false,
      operations: new Map(),
      message: defaultMessage,
      progress: showProgress ? 0 : undefined
    });
  }, [defaultMessage, showProgress]);

  /**
   * Execute an async operation with loading state
   */
  const withLoading = useCallback(async <T>(
    operation: () => Promise<T>,
    id: string,
    type: string,
    message: string = defaultMessage
  ): Promise<T> => {
    startLoading(id, type, message);
    
    try {
      // Register with AsyncOperationManager for proper cleanup
      const result = await asyncManager.register(
        `loading-${id}`,
        type,
        async (signal) => {
          if (signal?.aborted) {
            stopLoading(id);
            throw new Error('Operation aborted');
          }
          
          const result = await operation();
          
          if (signal?.aborted) {
            stopLoading(id);
            throw new Error('Operation aborted');
          }
          
          return result;
        }
      );
      
      stopLoading(id);
      return result;
    } catch (error) {
      stopLoading(id);
      throw error;
    }
  }, [asyncManager, startLoading, stopLoading, defaultMessage]);

  /**
   * Execute an async operation with progress updates
   */
  const withProgressLoading = useCallback(async <T>(
    operation: (updateProgress: (progress: number, message?: string) => void) => Promise<T>,
    id: string,
    type: string,
    message: string = defaultMessage
  ): Promise<T> => {
    startLoading(id, type, message, 0);
    
    try {
      const progressCallback = (progress: number, progressMessage?: string) => {
        updateProgress(id, progress, progressMessage);
      };

      // Register with AsyncOperationManager for proper cleanup
      const result = await asyncManager.register(
        `loading-progress-${id}`,
        type,
        async (signal) => {
          if (signal?.aborted) {
            stopLoading(id);
            throw new Error('Operation aborted');
          }
          
          const result = await operation(progressCallback);
          
          if (signal?.aborted) {
            stopLoading(id);
            throw new Error('Operation aborted');
          }
          
          return result;
        }
      );
      
      stopLoading(id);
      return result;
    } catch (error) {
      stopLoading(id);
      throw error;
    }
  }, [asyncManager, startLoading, stopLoading, updateProgress, defaultMessage]);

  /**
   * Get loading information for a specific operation
   */
  const getLoadingInfo = useCallback((id: string): LoadingOperation | undefined => {
    return loadingState.operations.get(id);
  }, [loadingState.operations]);

  /**
   * Check if a specific operation is loading
   */
  const isLoadingOperation = useCallback((id: string): boolean => {
    return loadingState.operations.has(id);
  }, [loadingState.operations]);

  /**
   * Get all operations of a specific type
   */
  const getOperationsByType = useCallback((type: string): LoadingOperation[] => {
    return Array.from(loadingState.operations.values()).filter(op => op.type === type);
  }, [loadingState.operations]);

  // Cleanup timeouts on unmount
  React.useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
      timeoutRefs.current.clear();
    };
  }, []);

  return {
    // State
    isLoading: loadingState.isLoading,
    message: loadingState.message,
    progress: loadingState.progress,
    operations: Array.from(loadingState.operations.values()),
    operationCount: loadingState.operations.size,

    // Actions
    startLoading,
    stopLoading,
    stopAllLoading,
    updateProgress,
    withLoading,
    withProgressLoading,

    // Queries
    getLoadingInfo,
    isLoadingOperation,
    getOperationsByType
  };
}

/**
 * Simple loading hook for basic operations
 */
export function useSimpleLoading(defaultMessage: string = 'Loading...') {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(defaultMessage);

  const startLoading = useCallback((loadingMessage?: string) => {
    setIsLoading(true);
    setMessage(loadingMessage || defaultMessage);
  }, [defaultMessage]);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
    setMessage(defaultMessage);
  }, [defaultMessage]);

  const withLoading = useCallback(async <T>(
    operation: () => Promise<T>,
    loadingMessage?: string
  ): Promise<T> => {
    startLoading(loadingMessage);
    try {
      const result = await operation();
      stopLoading();
      return result;
    } catch (error) {
      stopLoading();
      throw error;
    }
  }, [startLoading, stopLoading]);

  return {
    isLoading,
    message,
    startLoading,
    stopLoading,
    withLoading
  };
}

/**
 * Loading hook specifically for form submissions
 */
export function useFormLoading() {
  const { isLoading, withLoading } = useSimpleLoading('Saving...');

  const submitWithLoading = useCallback(async <T>(
    submitOperation: () => Promise<T>
  ): Promise<T> => {
    return withLoading(submitOperation, 'Saving...');
  }, [withLoading]);

  return {
    isSubmitting: isLoading,
    submitWithLoading
  };
}