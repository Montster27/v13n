import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ title, children, className = '', actions }) => {
  return (
    <div className={`card bg-base-100 shadow-xl ${className}`}>
      <div className="card-body">
        {title && <h2 className="card-title">{title}</h2>}
        {children}
        {actions && (
          <div className="card-actions justify-end">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};