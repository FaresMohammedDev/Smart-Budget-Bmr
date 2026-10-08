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
    default: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    special: 'bg-[#F37A20]/20 text-[#F37A20] border-[#F37A20]/40 font-bold animate-pulse',
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-medium',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30 font-medium',
    info: 'bg-sky-500/15 text-sky-400 border-sky-500/30 font-medium',
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
