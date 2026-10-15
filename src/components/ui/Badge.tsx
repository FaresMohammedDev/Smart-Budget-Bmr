import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'special' | 'success' | 'warning' | 'info';
}

export function Badge({
  className,
  variant = 'default',
  ...props
}: BadgeProps) {
  const variants = {
    default: 'bg-stone-100 text-stone-700 border-stone-200',
    special: 'bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 font-black shadow-sm shadow-orange-500/20',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 font-bold',
    info: 'bg-orange-50 text-orange-700 border-orange-200 font-bold',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs border font-medium select-none',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
