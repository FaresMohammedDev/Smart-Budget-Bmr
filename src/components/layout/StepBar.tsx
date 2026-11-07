import { Check } from 'lucide-react';

const STEPS = ['الأفراد', 'الميزانية', 'الوجبات'];

/** شريط الخطوات الصغير: 1 الأفراد ← 2 الميزانية ← 3 الوجبات */
export function StepBar({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="flex items-center gap-3 text-sm font-black" aria-label="الخطوات">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} className="contents">
            <span
              className={`flex items-center gap-2.5 transition-colors ${
                active ? 'text-[#6B0F1A]' : done ? 'text-emerald-800' : 'text-stone-400'
              }`}
              aria-current={active ? 'step' : undefined}
            >
              <span
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm border-2 transition-all ${
                  active
                    ? 'bg-[#6B0F1A] text-white border-[#3E080F] shadow-[0_0_0_5px_rgba(107,15,26,0.12)]'
                    : done
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                    : 'bg-white text-stone-400 border-stone-200'
                }`}
              >
                {done ? <Check className="w-4 h-4 stroke-[3]" /> : n}
              </span>
              {label}
            </span>
            {n < 3 && (
              <span className="flex-1 h-1 rounded-full bg-stone-200 overflow-hidden">
                <span
                  className="block h-full bg-gradient-to-l from-[#6B0F1A] to-[#E5A91E] transition-all duration-700"
                  style={{ width: done ? '100%' : active ? '45%' : '0%' }}
                />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
