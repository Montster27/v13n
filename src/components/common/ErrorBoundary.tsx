import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Update state with error info
    this.setState({
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
          <div className="card w-full max-w-2xl bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-error flex items-center gap-2">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                Something went wrong
              </h2>
              
              <div className="py-4">
                <p className="text-base-content/80 mb-4">
                  An unexpected error occurred. The application has encountered an issue and needs to be refreshed.
                </p>
                
                {import.meta.env.DEV && this.state.error && (
                  <div className="space-y-4">
                    <div className="alert alert-error">
                      <div>
                        <h3 className="font-bold">Error Details:</h3>
                        <p className="font-mono text-sm">{this.state.error.toString()}</p>
                      </div>
                    </div>
                    
                    {this.state.errorInfo && (
                      <details className="collapse collapse-arrow bg-base-200">
                        <summary className="collapse-title text-sm font-medium">
                          Component Stack Trace
                        </summary>
                        <div className="collapse-content">
                          <pre className="text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </div>

              <div className="card-actions justify-end gap-2">
                <button
                  onClick={this.handleReset}
                  className="btn btn-ghost"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="btn btn-primary"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}