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
      'inline-flex items-center justify-center font-extrabold select-none cursor-pointer focus:outline-none transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none';

    const variants = {
      primary:
        'bg-gradient-to-b from-[#8B1422] to-[#6B0F1A] hover:from-[#7A101C] hover:to-[#590C15] text-white border-2 border-[#3E080F] shadow-[0_5px_0_0_#3E080F] hover:shadow-[0_3px_0_0_#3E080F] hover:translate-y-0.5 active:shadow-[0_0_0_0_#3E080F] active:translate-y-1.5',
      secondary:
        'bg-gradient-to-b from-[#F59E0B] to-[#D97706] hover:from-[#E59207] hover:to-[#C26703] text-white border-2 border-[#854D0E] shadow-[0_5px_0_0_#854D0E] hover:shadow-[0_3px_0_0_#854D0E] hover:translate-y-0.5 active:shadow-[0_0_0_0_#854D0E] active:translate-y-1.5',
      outline:
        'bg-white hover:bg-[#FAF4EB] text-[#2B1810] border-2 border-[#D6C7B2] shadow-[0_4px_0_0_#C4B29A] hover:shadow-[0_2px_0_0_#C4B29A] hover:translate-y-0.5 active:shadow-[0_0_0_0_#C4B29A] active:translate-y-1',
      ghost:
        'text-stone-700 hover:text-stone-950 hover:bg-stone-200/60 rounded-xl transition-colors',
      danger:
        'bg-gradient-to-b from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white border-2 border-[#7F1D1D] shadow-[0_5px_0_0_#7F1D1D] hover:shadow-[0_3px_0_0_#7F1D1D] hover:translate-y-0.5 active:shadow-[0_0_0_0_#7F1D1D] active:translate-y-1.5',
    };

    const sizes = {
      sm: 'px-3.5 py-1.5 text-xs gap-1.5 rounded-xl',
      md: 'px-5 py-2.5 text-sm gap-2 rounded-2xl',
      lg: 'px-7 py-3.5 text-base gap-2.5 rounded-2xl',
      xl: 'px-8 py-4 text-lg gap-3 rounded-2xl tracking-wide',
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
