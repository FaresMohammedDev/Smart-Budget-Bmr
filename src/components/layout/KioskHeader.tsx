'use client';

import Image from 'next/image';
import Link from 'next/link';
import { RotateCcw, ShoppingBag, Sparkles } from 'lucide-react';
import { usePlannerStore } from '@/features/planner/store/planner.store';
import { Button } from '@/components/ui/Button';

export function KioskHeader() {
  const { resetKiosk, cart } = usePlannerStore();
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="no-print sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-3 group">
        <div className="relative w-11 h-11 rounded-xl overflow-hidden border border-zinc-800 bg-black flex items-center justify-center p-1 shadow-md group-hover:border-[#F37A20] transition-colors">
          <Image
            src="/images/fathalla-logo.png"
            alt="Fathalla Market"
            width={44}
            height={44}
            className="object-contain"
          />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-lg text-white tracking-wide">
              فتح الله
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-[#F37A20] text-black font-black">
              SMART
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-medium">
            Smart Budget · قسم الوجبات الجاهزة
          </p>
        </div>
      </Link>

      <div className="flex items-center gap-3">
        {cartCount > 0 && (
          <Link href="/menu">
            <Button variant="secondary" size="sm" className="relative">
              <ShoppingBag className="w-4 h-4 text-[#F37A20]" />
              <span>السلة ({cartCount})</span>
            </Button>
          </Link>
        )}

        <Link href="/">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetKiosk}
            className="text-zinc-400 hover:text-white"
          >
            <RotateCcw className="w-4 h-4 ml-1.5" />
            بدء من جديد
          </Button>
        </Link>
      </div>
    </header>
  );
}
