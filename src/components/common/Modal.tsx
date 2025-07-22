import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, actions }) => {
  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">{title}</h3>
        <button 
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          onClick={onClose}
        >
          ✕
        </button>
        <div className="py-4">
          {children}
        </div>
        {actions && (
          <div className="modal-action">
            {actions}
          </div>
        )}
      </div>
      <div className="modal-backdrop" onClick={onClose}>
        <button>close</button>
      </div>
    </div>
  );
};