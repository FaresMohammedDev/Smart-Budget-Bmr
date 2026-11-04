'use client';

import * as React from 'react';
import { Minus, Plus } from 'lucide-react';

export interface TouchStepperProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  label: string;
  onChange: (value: number) => void;
  className?: string;
}

export function TouchStepper({
  value,
  min = 0,
  max = 9999,
  step = 1,
  unit = '',
  label,
  onChange,
  className = '',
}: TouchStepperProps) {
  const handleDecrement = () => {
    if (value - step >= min) {
      onChange(value - step);
    }
  };

  const handleIncrement = () => {
    if (value + step <= max) {
      onChange(value + step);
    }
  };

  const isMin = value <= min;
  const isMax = value >= max;

  return (
    <div className={`space-y-1.5 text-right ${className}`}>
      <label className="block text-xs font-black text-[#1E1210]">{label}</label>
      <div className="flex items-center gap-2 bg-[#F8F4EE] p-1.5 rounded-2xl border-2 border-[#E7D7C7]">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={isMin}
          className={`w-12 h-12 rounded-xl flex items-center justify-center font-black transition-all cursor-pointer ${
            isMin
              ? 'bg-stone-200 text-stone-400 cursor-not-allowed border border-stone-300'
              : 'bg-white text-[#1E1210] border-2 border-[#D6C7B2] shadow-[0_3px_0_0_#C4B29A] hover:translate-y-0.5 active:shadow-[0_0_0_0_#C4B29A] active:translate-y-1'
          }`}
          aria-label="تقليل"
        >
          <Minus className="w-4 h-4 stroke-[3]" />
        </button>

        <div className="flex-1 flex items-baseline justify-center gap-1.5">
          <span className="text-2xl font-black text-[#1E1210] tracking-tight">{value}</span>
          {unit && <span className="text-xs font-black text-[#854D0E]">{unit}</span>}
        </div>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={isMax}
          className={`w-12 h-12 rounded-xl flex items-center justify-center font-black transition-all cursor-pointer ${
            isMax
              ? 'bg-stone-200 text-stone-400 cursor-not-allowed border border-stone-300'
              : 'bg-[#6B0F1A] text-white border-2 border-[#3E080F] shadow-[0_3px_0_0_#3E080F] hover:translate-y-0.5 active:shadow-[0_0_0_0_#3E080F] active:translate-y-1'
          }`}
          aria-label="زيادة"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
        </button>
      </div>
    </div>
  );
}
