import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? label;

    return (
      <div className="w-full space-y-1.5 text-right">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-bold text-stone-700"
          >
            {label}
          </label>
        )}
        <input
          type={type}
          id={inputId}
          ref={ref}
          className={cn(
            'w-full px-4 py-3 bg-white border border-stone-200 rounded-2xl text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#F37A20] focus:ring-2 focus:ring-[#F37A20]/20 shadow-sm transition-all text-base',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            className
          )}
          {...props}
        />
        {hint && !error && (
          <p className="text-xs text-zinc-400">{hint}</p>
        )}
        {error && (
          <p className="text-xs font-medium text-red-400">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
