'use client';

import { useEffect, useRef } from 'react';
import { Minus, Plus } from 'lucide-react';

interface HoldButtonProps {
  onStep: () => void;
  disabled: boolean;
  label: string;
  className: string;
  children: React.ReactNode;
}

/** زر يكرر الخطوة لو الإصبع فضل ضاغط عليه. */
function HoldButton({ onStep, disabled, label, className, children }: HoldButtonProps) {
  const stepRef = useRef(onStep);
  const timers = useRef<{ t?: ReturnType<typeof setTimeout>; i?: ReturnType<typeof setInterval> }>({});

  useEffect(() => {
    stepRef.current = onStep;
  });

  const stop = () => {
    clearTimeout(timers.current.t);
    clearInterval(timers.current.i);
  };

  useEffect(() => stop, []);

  const start = () => {
    stepRef.current();
    stop();
    timers.current.t = setTimeout(() => {
      timers.current.i = setInterval(() => stepRef.current(), 75);
    }, 420);
  };

  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          stepRef.current();
        }
      }}
      className={className}
    >
      {children}
    </button>
  );
}

interface DialStepperProps {
  label?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  size?: 'md' | 'lg';
  onChange: (value: number) => void;
}

/** عدّاد لمس كبير: اضغط مطوّلًا على + أو − للزيادة السريعة. */
export function DialStepper({ label, value, min, max, step = 1, unit, size = 'md', onChange }: DialStepperProps) {
  const big = size === 'lg';
  const btn = big ? 'w-16 h-16' : 'h-12';
  const base =
    'shrink-0 rounded-2xl border-2 active:translate-y-1 active:shadow-none disabled:opacity-35 disabled:shadow-none transition-all cursor-pointer flex items-center justify-center touch-none';

  return (
    <div className="@container flex flex-col gap-2 min-w-0 flex-1">
      {label && <span className="text-sm font-black text-stone-600 px-1">{label}</span>}
      <div
        className={`grid gap-2 rounded-3xl bg-[#F8F4EE] border-2 border-[#E7D7C7] p-2 shadow-inner items-center ${
          big ? 'grid-cols-[auto_1fr_auto]' : 'grid-cols-2 @[12.5rem]:grid-cols-[auto_1fr_auto]'
        }`}
      >
        <HoldButton
          label="زيادة"
          disabled={value >= max}
          onStep={() => onChange(Math.min(max, value + step))}
          className={`${btn} ${base} bg-gradient-to-b from-[#8B1422] to-[#6B0F1A] text-white border-[#3E080F] shadow-[0_4px_0_0_#3E080F] ${
            big ? '' : 'row-start-2 @[12.5rem]:row-start-auto w-full @[12.5rem]:w-12'
          }`}
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </HoldButton>

        <div
          className={`flex justify-center min-w-0 ${
            big
              ? 'items-baseline gap-1.5'
              : 'col-span-2 row-start-1 @[12.5rem]:col-span-1 @[12.5rem]:row-start-auto flex-col items-center gap-1'
          }`}
        >
          <span className={`${big ? 'text-6xl' : 'text-4xl'} font-black text-[#1E1210] tabular-nums leading-none`}>{value}</span>
          {unit && <span className="text-sm font-black text-[#854D0E] leading-none">{unit}</span>}
        </div>

        <HoldButton
          label="تقليل"
          disabled={value <= min}
          onStep={() => onChange(Math.max(min, value - step))}
          className={`${btn} ${base} bg-white text-[#1E1210] border-[#D6C7B2] shadow-[0_4px_0_0_#C4B29A] ${
            big ? '' : 'row-start-2 @[12.5rem]:row-start-auto w-full @[12.5rem]:w-12'
          }`}
        >
          <Minus className="w-6 h-6 stroke-[3]" />
        </HoldButton>
      </div>
    </div>
  );
}
