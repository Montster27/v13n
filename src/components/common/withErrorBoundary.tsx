import React from 'react';
import type { ComponentType } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

interface WithErrorBoundaryOptions {
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Higher-order component that wraps a component with an ErrorBoundary
 * 
 * @param Component - The component to wrap
 * @param options - Options for the error boundary
 * @returns The wrapped component
 * 
 * @example
 * // Basic usage
 * export default withErrorBoundary(MyComponent);
 * 
 * // With custom fallback
 * export default withErrorBoundary(MyComponent, {
 *   fallback: <div>Custom error message</div>
 * });
 * 
 * // With error logging
 * export default withErrorBoundary(MyComponent, {
 *   onError: (error, errorInfo) => {
 *     console.error('Component error:', error);
 *     // Send to error tracking service
 *   }
 * });
 */
export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  options?: WithErrorBoundaryOptions
): ComponentType<P> {
  const WrappedComponent = (props: P) => {
    return (
      <ErrorBoundary fallback={options?.fallback} onError={options?.onError}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };

  // Preserve the display name for debugging
  const componentName = Component.displayName || Component.name || 'Component';
  WrappedComponent.displayName = `withErrorBoundary(${componentName})`;

  return WrappedComponent;
}