'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

type Accent = 'burgundy' | 'mustard';

const ACCENT: Record<Accent, { tint: string; fallback: string; arrow: string; ring: string; dot: string }> = {
  burgundy: {
    tint: 'bg-[#6B0F1A]/35',
    fallback: 'from-[#6B0F1A] to-[#2A1412]',
    arrow: 'text-[#6B0F1A]',
    ring: 'border-[#E5A91E]',
    dot: 'bg-[#E5A91E]',
  },
  mustard: {
    tint: 'bg-[#B45309]/30',
    fallback: 'from-[#D97706] to-[#7C2D12]',
    arrow: 'text-[#B45309]',
    ring: 'border-white',
    dot: 'bg-white',
  },
};

interface HomeDoorProps {
  title: string;
  sub: string;
  images: string[];
  icon: React.ReactNode;
  chips?: { icon: React.ReactNode; label: string }[];
  accent: Accent;
  onClick: () => void;
  delay?: number;
  rotateOffset?: number;
}

export function HomeDoor({ title, sub, images, icon, chips = [], accent, onClick, delay = 0, rotateOffset = 0 }: HomeDoorProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [index, setIndex] = useState(0);
  const a = ACCENT[accent];

  useEffect(() => {
    if (images.length < 2) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      timer = setInterval(() => setIndex((i) => (i + 1) % images.length), 5200);
    }, rotateOffset);
    return () => {
      clearTimeout(start);
      if (timer) clearInterval(timer);
    };
  }, [images.length, rotateOffset]);

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty('--ry', `${(px - 0.5) * 7}deg`);
    el.style.setProperty('--rx', `${-(py - 0.5) * 7}deg`);
    el.style.setProperty('--mx', `${px * 100}%`);
    el.style.setProperty('--my', `${py * 100}%`);
  };

  const handleLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--rx', '0deg');
  };

  return (
    <div className="anim-fade-up min-h-0 flex" style={{ animationDelay: `${delay}ms` }}>
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        className="door-3d group relative block flex-1 w-full min-h-[22rem] overflow-hidden rounded-[36px] border-2 border-white/70 bg-[#1E1210] text-right shadow-[0_20px_50px_-15px_rgba(43,24,16,0.45)] hover:shadow-[0_30px_70px_-15px_rgba(107,15,26,0.5)] cursor-pointer outline-offset-4"
        aria-label={`${title} — ${sub}`}
      >
        {/* خلفية احتياطية لو الصور لسه بتتحمل */}
        <div className={`absolute inset-0 bg-gradient-to-br ${a.fallback}`} />

        {/* عرض صور متبدلة من التخزين السحابي */}
        {images.map((src, i) => (
          <div
            key={src}
            className={`absolute inset-0 transition-opacity duration-[1400ms] ease-in-out ${
              i === index ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <Image
              src={src}
              alt=""
              fill
              unoptimized
              priority={i === 0}
              sizes="(min-width: 768px) 50vw, 100vw"
              className={`object-cover ${i === index ? 'anim-kenburns' : ''}`}
            />
          </div>
        ))}

        <div className={`absolute inset-0 mix-blend-multiply ${a.tint}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1E1210]/90 via-[#1E1210]/20 to-transparent" />
        <div className="door-spot absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="door-shine absolute inset-0 overflow-hidden pointer-events-none" />

        {/* أيقونة زجاجية */}
        <div className="absolute top-6 right-6 w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 text-white flex items-center justify-center shadow-lg">
          {icon}
        </div>

        {/* مؤشر الصور */}
        {images.length > 1 && (
          <div className="absolute top-8 left-7 flex items-center gap-1.5" aria-hidden="true">
            {images.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i === index ? `w-7 ${a.dot}` : 'w-1.5 bg-white/50'
                }`}
              />
            ))}
          </div>
        )}

        {/* العنوان وزر الدخول */}
        <div className="absolute inset-x-0 bottom-0 p-7 sm:p-9 flex items-end justify-between gap-4">
          <div className="text-white">
            {chips.length > 0 && (
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {chips.map((c) => (
                  <span key={c.label} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-sm font-black">
                    {c.icon}
                    {c.label}
                  </span>
                ))}
              </div>
            )}
            <h2 className="text-4xl sm:text-5xl xl:text-6xl font-black leading-tight drop-shadow-md">{title}</h2>
            <p className="text-xl sm:text-2xl xl:text-3xl font-bold text-white/85 mt-1.5">{sub}</p>
          </div>

          <span className="relative shrink-0">
            <span className={`anim-ring absolute inset-0 rounded-full border-2 ${a.ring}`} />
            <span
              className={`relative w-20 h-20 rounded-full bg-white ${a.arrow} flex items-center justify-center shadow-xl group-hover:scale-110 group-active:scale-95 transition-transform duration-300`}
            >
              <ArrowLeft className="w-10 h-10 stroke-[2.75] group-hover:-translate-x-1.5 transition-transform duration-300" />
            </span>
          </span>
        </div>
      </button>
    </div>
  );
}
