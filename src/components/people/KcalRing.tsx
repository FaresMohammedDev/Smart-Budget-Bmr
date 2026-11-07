'use client';

import { useEffect, useId, useRef, useState } from 'react';

/** عدّاد يتحرك بسلاسة من القيمة القديمة للجديدة. */
export function useCountUp(target: number, ms = 750) {
  const [value, setValue] = useState(target);
  const from = useRef(target);

  useEffect(() => {
    const startAt = performance.now();
    const startVal = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - startAt) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = startVal + (target - startVal) * eased;
      from.current = next;
      setValue(next);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);

  return Math.round(value);
}

interface KcalRingProps {
  value: number;
  max?: number;
  caption: string;
}

/** حلقة السعرات اليومية: تتملي حسب الاحتياج وتتغير فورًا مع أي تعديل. */
export function KcalRing({ value, max = 4000, caption }: KcalRingProps) {
  const id = useId();
  const shown = useCountUp(value);
  const size = 230;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));

  return (
    <div className="relative aspect-square" style={{ width: 'min(14.4rem, 34vh, 100%)' }}>
      <div className="absolute inset-3 rounded-full bg-[#6B0F1A]/10 blur-2xl" aria-hidden="true" />
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="relative -rotate-90">
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E5A91E" />
            <stop offset="100%" stopColor="#6B0F1A" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EADBCB" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[clamp(1.75rem,3.2vw,3rem)] font-black text-[#1E1210] tabular-nums leading-none">
          {shown.toLocaleString('en-US')}
        </span>
        <span className="mt-1.5 text-base font-black text-[#854D0E]">{caption}</span>
      </div>
    </div>
  );
}
