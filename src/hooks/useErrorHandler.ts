import { useCallback } from 'react';

/**
 * Custom hook for handling errors in async operations
 * 
 * @returns Error handler function
 * 
 * @example
 * const handleError = useErrorHandler();
 * 
 * try {
 *   await someAsyncOperation();
 * } catch (error) {
 *   handleError(error);
 * }
 */
export function useErrorHandler() {
  const handleError = useCallback((error: unknown) => {
    // Convert unknown error to Error object
    const errorObject = error instanceof Error 
      ? error 
      : new Error(String(error));

    // In development, log to console
    if (import.meta.env.DEV) {
      console.error('Error caught by useErrorHandler:', errorObject);
    }

    // Here you could add error reporting to a service like Sentry
    // Example:
    // if (window.Sentry) {
    //   window.Sentry.captureException(errorObject);
    // }

    // Throw the error to be caught by the nearest ErrorBoundary
    throw errorObject;
  }, []);

  return handleError;
}

/**
 * Async error handler that doesn't throw
 * Useful for fire-and-forget operations where you want to log errors
 * but not crash the app
 */
export function useAsyncErrorHandler() {
  const handleError = useCallback((error: unknown) => {
    // Convert unknown error to Error object
    const errorObject = error instanceof Error 
      ? error 
      : new Error(String(error));

    // In development, log to console
    if (import.meta.env.DEV) {
      console.error('Async error caught:', errorObject);
    }

    // Here you could add error reporting to a service
    // Example:
    // if (window.Sentry) {
    //   window.Sentry.captureException(errorObject);
    // }

    // You could also show a toast notification
    // Example:
    // toast.error(errorObject.message);
  }, []);

  return handleError;
}