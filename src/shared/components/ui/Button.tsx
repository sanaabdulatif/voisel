import React from 'react';
import { cn } from '../../lib/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  children,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]',
        variant === 'primary' && 'bg-brand-primary text-white hover:bg-brand-dark shadow-sm hover:shadow',
        variant === 'secondary' && 'bg-brand-cream text-brand-darkText hover:bg-brand-cream/80 border border-brand-mutedText/10',
        variant === 'ghost' && 'text-brand-mutedText hover:text-brand-darkText hover:bg-brand-cream/50',
        variant === 'danger' && 'bg-brand-error text-white hover:bg-brand-error/90 shadow-sm',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
