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
    <header className="no-print sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-orange-100 shadow-sm px-4 sm:px-8 py-3.5 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-3 group">
        <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-orange-200 bg-white flex items-center justify-center p-1.5 shadow-sm group-hover:scale-105 transition-transform">
          <Image
            src="/images/fathalla-logo.png"
            alt="Fathalla Market"
            width={44}
            height={44}
            className="object-contain"
          />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-black text-xl text-stone-900 tracking-tight">
              فتح الله ماركت
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-red-500 to-orange-500 text-white font-black shadow-sm">
              مطعم & وجبات 🍗
            </span>
          </div>
          <p className="text-xs text-stone-500 font-semibold">
            قسم الوجبات الجاهزة · Smart Budget ⚡
          </p>
        </div>
      </Link>

      <div className="flex items-center gap-3">
        {cartCount > 0 && (
          <Link href="/menu">
            <Button variant="secondary" size="sm" className="relative shadow-sm bg-orange-50 text-orange-900 border-orange-200">
              <ShoppingBag className="w-4 h-4 text-[#F37A20]" />
              <span className="font-bold">السلة ({cartCount})</span>
            </Button>
          </Link>
        )}

        <Link href="/">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetKiosk}
            className="text-stone-500 hover:text-stone-900 hover:bg-orange-50/80 font-bold"
          >
            <RotateCcw className="w-4 h-4 ml-1.5" />
            بدء من جديد
          </Button>
        </Link>
      </div>
    </header>
  );
}
