'use client';

import * as React from 'react';
import { Delete, RotateCcw } from 'lucide-react';

export interface VirtualKeypadProps {
  value: number;
  max?: number;
  onChange: (val: number) => void;
  className?: string;
  showPresets?: boolean;
}

export function VirtualKeypad({
  value,
  max = 10000,
  onChange,
  className = '',
  showPresets = true,
}: VirtualKeypadProps) {
  const handleDigit = (digit: string) => {
    const currentStr = value === 0 ? '' : value.toString();
    const newStr = currentStr + digit;
    const num = Number(newStr);
    if (num <= max) {
      onChange(num);
    }
  };

  const handleBackspace = () => {
    const currentStr = value.toString();
    if (currentStr.length <= 1) {
      onChange(0);
    } else {
      onChange(Number(currentStr.slice(0, -1)));
    }
  };

  const handleClear = () => {
    onChange(0);
  };

  const handleAddPreset = (amount: number) => {
    const next = value + amount;
    if (next <= max) {
      onChange(next);
    }
  };

  return (
    <div className={`space-y-3.5 max-w-sm mx-auto select-none ${className}`}>
      {/* أزرار سريعة للمبالغ الشائعة بضغطة واحدة */}
      {showPresets && (
        <div className="grid grid-cols-4 gap-2">
          {[50, 100, 200, 500].map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => handleAddPreset(amt)}
              className="py-2.5 px-1 rounded-xl bg-gradient-to-b from-[#F59E0B] to-[#D97706] text-white border-2 border-[#854D0E] shadow-[0_3px_0_0_#854D0E] hover:translate-y-0.5 active:shadow-[0_0_0_0_#854D0E] active:translate-y-1 font-black text-xs transition-all cursor-pointer"
            >
              +{amt} ج.م
            </button>
          ))}
        </div>
      )}

      {/* لوحة الأرقام اللمسية 3D بارزة كأجهزة الكيوسك */}
      <div className="grid grid-cols-3 gap-2.5">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => handleDigit(digit)}
            className="h-16 rounded-2xl bg-white text-[#1E1210] border-2 border-[#D6C7B2] shadow-[0_4px_0_0_#C4B29A] hover:translate-y-0.5 active:shadow-[0_0_0_0_#C4B29A] active:translate-y-1 text-2xl font-black transition-all cursor-pointer flex items-center justify-center"
          >
            {digit}
          </button>
        ))}

        <button
          type="button"
          onClick={handleClear}
          title="تفريغ"
          className="h-16 rounded-2xl bg-[#F8F4EE] text-stone-700 border-2 border-stone-300 shadow-[0_4px_0_0_#A8A29E] hover:translate-y-0.5 active:shadow-[0_0_0_0_#A8A29E] active:translate-y-1 font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1"
        >
          <RotateCcw className="w-4 h-4 stroke-[2.5]" />
          <span>مسح</span>
        </button>

        <button
          type="button"
          onClick={() => handleDigit('0')}
          className="h-16 rounded-2xl bg-white text-[#1E1210] border-2 border-[#D6C7B2] shadow-[0_4px_0_0_#C4B29A] hover:translate-y-0.5 active:shadow-[0_0_0_0_#C4B29A] active:translate-y-1 text-2xl font-black transition-all cursor-pointer flex items-center justify-center"
        >
          0
        </button>

        <button
          type="button"
          onClick={handleBackspace}
          title="حذف رقم"
          className="h-16 rounded-2xl bg-[#FAF0F0] text-[#6B0F1A] border-2 border-[#6B0F1A]/30 shadow-[0_4px_0_0_#6B0F1A]/40 hover:translate-y-0.5 active:shadow-[0_0_0_0] active:translate-y-1 font-black text-xs transition-all cursor-pointer flex items-center justify-center"
        >
          <Delete className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}
