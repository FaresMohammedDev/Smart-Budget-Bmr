'use client';

import Link from 'next/link';
import { Home, ShoppingBag } from 'lucide-react';
import { usePlannerStore } from '@/features/planner/store/planner.store';
import { Button } from '@/components/ui/Button';

export function KioskHeader() {
  const { resetKiosk, cart } = usePlannerStore();
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="no-print sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b-2 border-[#E7D7C7] px-4 sm:px-8 py-3 flex items-center justify-between">
      <Link href="/" onClick={resetKiosk} dir="ltr" className="text-2xl font-black tracking-tight text-[#1E1210]">
        Smart <span className="text-[#6B0F1A]">Budget</span>
      </Link>

      <div className="flex items-center gap-2.5">
        {cartCount > 0 && (
          <Link href="/menu">
            <Button size="sm" variant="secondary">
              <ShoppingBag className="w-4 h-4 ml-1.5" />
              <span>{cartCount}</span>
            </Button>
          </Link>
        )}
        <Link href="/" onClick={resetKiosk}>
          <Button variant="outline" size="sm" className="text-[#6B0F1A] font-extrabold">
            <Home className="w-4 h-4 ml-1.5" />
            <span>الرئيسية</span>
          </Button>
        </Link>
      </div>
    </header>
  );
}
