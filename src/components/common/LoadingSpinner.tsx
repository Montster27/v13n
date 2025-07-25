/**
 * Reusable Loading Spinner Components
 * 
 * Various loading spinner components for different use cases
 */

import React from 'react';

export interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  message?: string;
  progress?: number;
  className?: string;
  inline?: boolean;
}

/**
 * Basic loading spinner
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message,
  progress,
  className = '',
  inline = false
}) => {
  const sizeClasses = {
    xs: 'loading-xs',
    sm: 'loading-sm',
    md: 'loading-md',
    lg: 'loading-lg'
  };

  const containerClass = inline 
    ? `inline-flex items-center gap-2 ${className}` 
    : `flex flex-col items-center justify-center gap-3 ${className}`;

  return (
    <div className={containerClass}>
      <span className={`loading loading-spinner ${sizeClasses[size]}`}></span>
      {message && (
        <div className="text-center">
          <p className="text-sm text-base-content/70">{message}</p>
          {progress !== undefined && (
            <div className="w-full max-w-xs mt-2">
              <progress 
                className="progress progress-primary w-full" 
                value={progress} 
                max="100"
              ></progress>
              <p className="text-xs text-base-content/60 mt-1">{Math.round(progress)}%</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Inline loading spinner (for buttons, etc.)
 */
export const InlineLoadingSpinner: React.FC<{
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}> = ({ size = 'sm', className = '' }) => {
  const sizeClasses = {
    xs: 'loading-xs',
    sm: 'loading-sm',
    md: 'loading-md'
  };

  return (
    <span className={`loading loading-spinner ${sizeClasses[size]} ${className}`}></span>
  );
};

/**
 * Loading overlay for covering content during async operations
 */
export const LoadingOverlay: React.FC<LoadingSpinnerProps> = ({
  size = 'lg',
  message,
  progress,
  className = ''
}) => {
  return (
    <div className={`absolute inset-0 bg-base-100/80 backdrop-blur-sm flex items-center justify-center z-50 ${className}`}>
      <LoadingSpinner size={size} message={message} progress={progress} />
    </div>
  );
};

/**
 * Loading state for cards/sections
 */
export const LoadingCard: React.FC<LoadingSpinnerProps & {
  title?: string;
  height?: string;
}> = ({
  size = 'md',
  message,
  progress,
  title,
  className = '',
  height = 'h-32'
}) => {
  return (
    <div className={`card bg-base-100 shadow ${className}`}>
      <div className={`card-body ${height} flex items-center justify-center`}>
        {title && <h3 className="card-title mb-4">{title}</h3>}
        <LoadingSpinner size={size} message={message} progress={progress} />
      </div>
    </div>
  );
};

/**
 * Loading button with disabled state
 */
export const LoadingButton: React.FC<{
  isLoading: boolean;
  loadingText?: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'link' | 'info' | 'success' | 'warning' | 'error';
}> = ({
  isLoading,
  loadingText,
  children,
  onClick,
  className = '',
  disabled = false,
  type = 'button',
  size = 'md',
  variant = 'primary'
}) => {
  const sizeClasses = {
    xs: 'btn-xs',
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg'
  };

  const variantClass = variant !== 'primary' ? `btn-${variant}` : 'btn-primary';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isLoading || disabled}
      className={`btn ${variantClass} ${sizeClasses[size]} ${className}`}
    >
      {isLoading ? (
        <>
          <InlineLoadingSpinner size="sm" />
          {loadingText || 'Loading...'}
        </>
      ) : (
        children
      )}
    </button>
  );
};

/**
 * Loading dots animation (alternative to spinner)
 */
export const LoadingDots: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'loading-dots loading-sm',
    md: 'loading-dots loading-md', 
    lg: 'loading-dots loading-lg'
  };

  return <span className={`loading ${sizeClasses[size]} ${className}`}></span>;
};

/**
 * Skeleton loader for content placeholders
 */
export const SkeletonLoader: React.FC<{
  lines?: number;
  className?: string;
  width?: string;
  height?: string;
}> = ({ 
  lines = 3, 
  className = '',
  width = 'w-full',
  height = 'h-4'
}) => {
  return (
    <div className={`animate-pulse space-y-2 ${className}`}>
      {Array.from({ length: lines }, (_, index) => (
        <div 
          key={index}
          className={`bg-base-300 rounded ${width} ${height}`}
          style={{
            width: index === lines - 1 ? '75%' : '100%'
          }}
        ></div>
      ))}
    </div>
  );
};

/**
 * Loading screen for full page loading
 */
export const LoadingScreen: React.FC<LoadingSpinnerProps & {
  title?: string;
  subtitle?: string;
}> = ({
  size = 'lg',
  message,
  progress,
  title,
  subtitle,
  className = ''
}) => {
  return (
    <div className={`min-h-screen flex items-center justify-center bg-base-100 ${className}`}>
      <div className="text-center space-y-4">
        {title && <h1 className="text-3xl font-bold">{title}</h1>}
        {subtitle && <p className="text-base-content/70">{subtitle}</p>}
        <LoadingSpinner size={size} message={message} progress={progress} />
      </div>
    </div>
  );
};

/**
 * Loading state for data tables
 */
export const TableLoadingRow: React.FC<{
  columns: number;
  rows?: number;
}> = ({ columns, rows = 5 }) => {
  return (
    <>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <tr key={rowIndex} className="animate-pulse">
          {Array.from({ length: columns }, (_, colIndex) => (
            <td key={colIndex} className="p-4">
              <div className="bg-base-300 h-4 rounded w-full"></div>
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

/**
 * Determinate progress bar
 */
export const ProgressBar: React.FC<{
  progress: number;
  message?: string;
  className?: string;
  color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'info';
  showPercentage?: boolean;
}> = ({
  progress,
  message,
  className = '',
  color = 'primary',
  showPercentage = true
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {message && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-base-content/70">{message}</span>
          {showPercentage && (
            <span className="text-sm font-medium">{Math.round(progress)}%</span>
          )}
        </div>
      )}
      <progress 
        className={`progress progress-${color} w-full`} 
        value={progress} 
        max="100"
      ></progress>
    </div>
  );
};