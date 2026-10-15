import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-extrabold transition-all duration-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#F37A20] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] select-none cursor-pointer';

    const variants = {
      primary:
        'bg-gradient-to-r from-[#F37A20] to-[#DC2626] hover:from-[#e06813] hover:to-[#b91c1c] text-white shadow-md shadow-orange-500/25 border-0',
      secondary:
        'bg-orange-50 hover:bg-orange-100/80 text-stone-800 border border-orange-200/80',
      outline:
        'border-2 border-[#F37A20] text-[#DC2626] hover:bg-orange-50',
      ghost:
        'text-stone-600 hover:bg-stone-100 hover:text-stone-900',
      danger:
        'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/25',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-5 py-2.5 text-base gap-2',
      lg: 'px-7 py-3.5 text-lg gap-2.5',
      xl: 'px-9 py-4 text-xl gap-3',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
