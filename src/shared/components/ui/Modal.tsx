import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-darkText/40 backdrop-blur-sm sm:items-center animate-fade-in">
      {/* Backdrop Click */}
      <div className="absolute inset-0" onClick={onClose} />
      
      <div
        className={cn(
          "relative w-full bg-white rounded-t-3xl sm:rounded-2xl max-w-lg overflow-hidden shadow-premium animate-slide-up sm:max-h-[90vh] flex flex-col z-10",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-cream/60">
          <h3 className="text-lg font-bold text-brand-darkText">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-brand-mutedText hover:text-brand-darkText hover:bg-brand-cream/50 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
