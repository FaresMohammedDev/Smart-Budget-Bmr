'use client';

import Image from 'next/image';
import Link from 'next/link';
import { RotateCcw, ShoppingBag, UtensilsCrossed, Zap, CreditCard, ChefHat } from 'lucide-react';
import { usePlannerStore } from '@/features/planner/store/planner.store';
import { Button } from '@/components/ui/Button';

export function KioskHeader() {
  const { resetKiosk, cart } = usePlannerStore();
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="no-print sticky top-0 z-50">
      {/* شريط الألوان المميز أعلى الكيوسك: نبيتي شواء داكن + ذهبي خردل */}
      <div className="h-2 w-full bg-gradient-to-r from-[#6B0F1A] via-[#E5A91E] to-[#6B0F1A]" />

      <header className="bg-[#FFFFFF]/95 backdrop-blur-md border-b-2 border-[#E7D7C7] shadow-sm px-4 sm:px-8 py-3 flex items-center justify-between">
        {/* اللوجو والعنوان */}
        <Link href="/" className="flex items-center gap-3.5 group">
          <div className="relative w-12 h-12 rounded-2xl overflow-hidden border-2 border-[#6B0F1A] bg-white flex items-center justify-center p-1 shadow-sm group-hover:scale-105 transition-transform">
            <Image
              src="/images/fathalla-logo.png"
              alt="Fathalla Market"
              width={42}
              height={42}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xl sm:text-2xl text-[#1E1210] tracking-tight">
                فتح الله ماركت
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-[#6B0F1A] text-white font-extrabold shadow-xs">
                <UtensilsCrossed className="w-3 h-3 stroke-[2.5]" />
                <span>المطعم والوجبات الطازجة</span>
              </span>
            </div>
            <p className="text-xs text-[#854D0E] font-bold flex items-center gap-1 mt-0.5">
              <Zap className="w-3.5 h-3.5 text-[#6B0F1A] stroke-[2.5]" />
              <span>كيوسك الخدمة الذاتية السريع · Smart Budget Kiosk</span>
            </p>
          </div>
        </Link>

        {/* أزرار التجربة السريعة والتحكم */}
        <div className="flex items-center gap-2.5">
          {/* أزرار التجربة السريعة للمهندسين أثناء التقييم والاختبار */}
          <div className="hidden md:flex items-center gap-1.5 p-1 rounded-2xl bg-[#F8F4EE] border border-[#E7D7C7]">
            <span className="text-[10px] font-black text-[#5C4535] px-1.5">اختبار سريع:</span>
            <Link href="/cashier">
              <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs cursor-pointer transition-colors">
                <CreditCard className="w-3 h-3" />
                <span>كاشير (POS)</span>
              </span>
            </Link>
            <Link href="/admin">
              <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-xl bg-[#854D0E] hover:bg-[#683C0A] text-white shadow-xs cursor-pointer transition-colors">
                <ChefHat className="w-3 h-3" />
                <span>مطبخ (Admin)</span>
              </span>
            </Link>
          </div>

          {cartCount > 0 && (
            <Link href="/menu">
              <Button size="sm" variant="secondary" className="relative">
                <ShoppingBag className="w-4 h-4 ml-1" />
                <span>السلة ({cartCount})</span>
              </Button>
            </Link>
          )}

          <Link href="/">
            <Button
              variant="outline"
              size="sm"
              onClick={resetKiosk}
              className="text-[#6B0F1A] font-extrabold"
            >
              <RotateCcw className="w-3.5 h-3.5 ml-1 text-[#6B0F1A]" />
              <span>الرئيسية</span>
            </Button>
          </Link>
        </div>
      </header>
    </div>
  );
}
