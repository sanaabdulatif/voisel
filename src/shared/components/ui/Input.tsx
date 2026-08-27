import React, { forwardRef } from 'react';
import { cn } from '../../lib/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className, id, ...props },
  ref
) {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-brand-darkText uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={cn(
          'premium-input',
          error && 'border-brand-error focus:ring-brand-error/20 focus:border-brand-error',
          className
        )}
        {...props}
      />
      {error && (
        <span className="text-xs font-medium text-brand-error">
          {error}
        </span>
      )}
    </div>
  );
});
