'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Tag,
  CupSoda,
  Layers,
  SunMedium,
  Cookie,
  Flame,
  UtensilsCrossed,
  Sparkles,
  Printer,
} from 'lucide-react';
import { KioskHeader } from '@/components/layout/KioskHeader';
import { Button } from '@/components/ui/Button';
import { useCountUp } from '@/components/people/KcalRing';
import { usePlannerStore } from '@/features/planner/store/planner.store';
import { Meal } from '@/features/recommendations/domain/types';
import { getMealMacros, sumMealMacros } from '@/features/nutrition/domain/macros';
import { formatEgp, formatKcal } from '@/lib/format';
import { getMealImageUrl } from '@/lib/meal-images';
import { listMeals, createOrder, errorMessage } from '@/lib/data/repository';

type CategoryId = 'all' | 'offers' | 'breakfast' | 'sandwiches' | 'main' | 'side' | 'dessert' | 'drink';

const CATEGORIES: { id: CategoryId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'all', label: 'الكل', icon: Layers },
  { id: 'offers', label: 'عروض', icon: Tag },
  { id: 'breakfast', label: 'فطار', icon: SunMedium },
  { id: 'sandwiches', label: 'ساندوتشات', icon: UtensilsCrossed },
  { id: 'main', label: 'مشويات', icon: Flame },
  { id: 'side', label: 'جانبي', icon: Sparkles },
  { id: 'dessert', label: 'حلويات', icon: Cookie },
  { id: 'drink', label: 'مشروبات', icon: CupSoda },
];

const BREAKFAST_WORDS = ['فول', 'طعمية', 'بيض', 'شكشوكة', 'فطير', 'جبن'];

function matches(cat: CategoryId, m: Meal): boolean {
  const has = (words: string[]) => words.some((w) => m.name_ar.includes(w));
  switch (cat) {
    case 'all':
      return true;
    case 'offers':
      return Boolean(m.is_expiring_soon || (m.discount_price && m.discount_price < m.price));
    case 'breakfast':
      return has(BREAKFAST_WORDS);
    case 'sandwiches':
      return has(['ساندوتش', 'شاورما', 'حواوشي', 'برجر']);
    case 'main':
      return m.kind === 'main' && !has([...BREAKFAST_WORDS.slice(0, 4), 'ساندوتش']);
    default:
      return m.kind === cat;
  }
}

export default function MenuEcommercePage() {
  const router = useRouter();
  const { cart, addToCart, updateCartQuantity, clearCart, syncCartMeals, getCartTotal } = usePlannerStore();

  const [meals, setMeals] = useState<Meal[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const requestRef = useRef<{ key: string; id: string } | null>(null);
  const busy = useRef(false);

  // قراءة المنيو من مصدر البيانات المحدد، وتحديثه عند العودة من الإدارة.
  useEffect(() => {
    async function loadMenu() {
      setLoading(true);
      try {
        const menu = await listMeals(true);
        setMeals(menu);
        syncCartMeals(menu);
        setErrorMsg('');
      } catch (error) {
        setErrorMsg(errorMessage(error));
      } finally {
        setLoading(false);
      }
    }

    loadMenu();
    window.addEventListener('focus', loadMenu);
    window.addEventListener('storage', loadMenu);
    return () => {
      window.removeEventListener('focus', loadMenu);
      window.removeEventListener('storage', loadMenu);
    };
  }, [syncCartMeals]);

  const visibleCategories = CATEGORIES.filter((c) => c.id === 'all' || meals.some((m) => matches(c.id, m)));
  const filteredMeals = meals.filter((m) => matches(selectedCategory, m));

  const { totalPrice, totalKcal } = getCartTotal();
  const totalCartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const cartMacros = sumMealMacros(cart);
  const priceShown = useCountUp(totalPrice, 400);

  // إتمام الشراء المباشر وطباعة البون
  const handleCheckout = async () => {
    if (cart.length === 0 || busy.current) return;
    busy.current = true;
    setOrdering(true);
    setErrorMsg('');
    try {
      const items = cart.map((c) => ({ meal_id: c.meal.id, quantity: c.quantity }));
      const key = JSON.stringify(items);
      if (requestRef.current?.key !== key) requestRef.current = { key, id: crypto.randomUUID() };
      const orderId = await createOrder({ requestId: requestRef.current.id, mode: 'quick_menu', items, expectedTotal: totalPrice });
      clearCart();
      router.push(`/receipt/${orderId}`);
    } catch (error) {
      setErrorMsg(errorMessage(error));
    } finally {
      busy.current = false;
      setOrdering(false);
    }
  };

  const glass =
    'rounded-[2rem] bg-white/90 backdrop-blur border-2 border-[#E7D7C7] shadow-[0_18px_40px_-22px_rgba(43,24,16,0.35)]';

  return (
    <div className="relative min-h-screen lg:h-screen overflow-x-clip lg:overflow-hidden bg-[#F8F4EE] text-[#1E1210] flex flex-col select-none">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="anim-blob absolute -top-32 -right-24 w-[30rem] h-[30rem] rounded-full bg-[#6B0F1A]/12 blur-3xl" />
        <div className="anim-blob-slow absolute -bottom-40 -left-28 w-[34rem] h-[34rem] rounded-full bg-[#E5A91E]/20 blur-3xl" />
      </div>

      <KioskHeader />

      {errorMsg && (
        <p
          role="alert"
          className="anim-fade-up fixed top-20 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-full bg-red-700 text-white font-black text-sm shadow-2xl"
        >
          {errorMsg}
        </p>
      )}

      <main className="relative z-10 flex-1 min-h-0 w-full max-w-[92rem] mx-auto px-4 sm:px-6 py-4 grid grid-cols-1 lg:grid-cols-[10.5rem_1fr_20rem] gap-4">
        {/* الأقسام */}
        <nav
          aria-label="الأقسام"
          className="anim-fade-up lg:min-h-0 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto lg:rounded-[2rem] lg:bg-white/90 lg:border-2 lg:border-[#E7D7C7] lg:p-3 lg:shadow-[0_18px_40px_-22px_rgba(43,24,16,0.35)]"
        >
          {visibleCategories.map(({ id, label, icon: Icon }, i) => {
            const on = selectedCategory === id;
            const count = meals.filter((m) => matches(id, m)).length;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedCategory(id)}
                className={`anim-fade-up shrink-0 lg:w-full rounded-2xl border-2 px-3 py-2.5 flex lg:flex-col items-center gap-2 lg:gap-1 transition-all duration-300 cursor-pointer ${
                  on
                    ? 'bg-gradient-to-b from-[#8B1422] to-[#6B0F1A] text-white border-[#3E080F] shadow-[0_4px_0_0_#3E080F] -translate-y-0.5'
                    : 'bg-white border-[#E7D7C7] text-stone-700 hover:border-[#6B0F1A]/50'
                }`}
                style={{ animationDelay: `${60 + i * 45}ms` }}
              >
                <Icon className="w-6 h-6 lg:w-7 lg:h-7" />
                <span className="font-black text-sm">{label}</span>
                <span className={`text-xs font-black px-2 py-0.5 rounded-full tabular-nums ${on ? 'bg-white/20' : 'bg-[#F8F4EE] text-[#6B0F1A]'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </nav>

        {/* شبكة الوجبات */}
        <section className="lg:min-h-0 lg:overflow-y-auto -mx-1 px-1 py-1" aria-label="الوجبات">
          {loading && meals.length === 0 ? (
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-72 rounded-[1.75rem] bg-white/70 border-2 border-[#E7D7C7] animate-pulse" />
              ))}
            </div>
          ) : filteredMeals.length === 0 ? (
            <div className={`${glass} p-10 text-center text-stone-500 font-black`}>مفيش وجبات</div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 pb-2">
              {filteredMeals.map((meal, idx) => {
                const qty = cart.find((i) => i.meal.id === meal.id)?.quantity ?? 0;
                const m = getMealMacros(meal);
                const hasDiscount = meal.discount_price != null && meal.discount_price < meal.price;
                const price = meal.discount_price ?? meal.price;
                return (
                  <article
                    key={meal.id}
                    className={`anim-fade-up group relative flex flex-col overflow-hidden rounded-[1.75rem] bg-white border-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                      qty > 0 ? 'border-[#6B0F1A] shadow-lg' : 'border-[#E7D7C7]'
                    }`}
                    style={{ animationDelay: `${Math.min(idx, 12) * 40}ms` }}
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-stone-200">
                      <Image
                        src={getMealImageUrl(meal.name_ar, meal.image_url)}
                        alt={meal.name_ar}
                        fill
                        unoptimized
                        sizes="(min-width: 1280px) 22vw, 40vw"
                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
                      {meal.is_expiring_soon && (
                        <span className="absolute top-2.5 right-2.5 flex items-center gap-1 px-3 py-1 rounded-full bg-[#E5A91E] text-[#3E080F] text-xs font-black shadow-md">
                          <Tag className="w-3.5 h-3.5" />
                          عرض
                        </span>
                      )}
                      <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur text-white text-xs font-black tabular-nums">
                        <Flame className="w-3.5 h-3.5 text-[#E5A91E]" />
                        {formatKcal(meal.total_kcal)}
                      </span>
                      {meal.portion_type === 'shareable' && (
                        <span className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-full bg-white/90 text-[#6B0F1A] text-xs font-black">
                          تشاركي
                        </span>
                      )}
                    </div>

                    <div className="flex-1 p-3.5 flex flex-col gap-2">
                      <h3 className="font-black text-lg leading-snug line-clamp-2 min-h-[2.8rem]">{meal.name_ar}</h3>
                      <div className="flex items-center gap-1.5 text-[11px] font-black tabular-nums flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">كارب {m.estimated ? '~' : ''}{Math.round(m.carbsG)}</span>
                        <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200">بروتين {m.estimated ? '~' : ''}{Math.round(m.proteinG)}</span>
                        <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200">دهون {m.estimated ? '~' : ''}{Math.round(m.fatG)}</span>
                      </div>

                      <div className="mt-auto pt-2 flex flex-col gap-2.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="text-2xl font-black text-[#6B0F1A] tabular-nums whitespace-nowrap">{formatEgp(price)}</div>
                          {hasDiscount && <div className="text-sm text-stone-400 line-through tabular-nums whitespace-nowrap">{formatEgp(meal.price)}</div>}
                        </div>

                        {qty === 0 ? (
                          <button
                            type="button"
                            aria-label="إضافة"
                            onClick={() => addToCart(meal)}
                            className="h-12 w-full rounded-2xl bg-gradient-to-b from-[#8B1422] to-[#6B0F1A] text-white border-2 border-[#3E080F] shadow-[0_4px_0_0_#3E080F] hover:-translate-y-0.5 active:translate-y-1 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2 font-black text-lg"
                          >
                            <Plus className="w-6 h-6 stroke-[3]" />
                            <span aria-hidden="true">إضافة</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 h-12 w-full rounded-2xl bg-[#FAF0F0] border-2 border-[#6B0F1A]/30 p-1">
                            <button
                              type="button"
                              aria-label="زيادة"
                              onClick={() => addToCart(meal)}
                              className="h-full flex-1 min-w-0 rounded-xl bg-[#6B0F1A] text-white border-2 border-[#3E080F] shadow-[0_3px_0_0_#3E080F] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center justify-center"
                            >
                              <Plus className="w-6 h-6 stroke-[3]" />
                            </button>
                            <span key={qty} className="anim-pop min-w-8 text-center font-black text-2xl tabular-nums">{qty}</span>
                            <button
                              type="button"
                              aria-label="تقليل"
                              onClick={() => updateCartQuantity(meal.id, qty - 1)}
                              className="h-full flex-1 min-w-0 rounded-xl bg-white border-2 border-[#D6C7B2] shadow-[0_3px_0_0_#C4B29A] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center justify-center"
                            >
                              <Minus className="w-6 h-6 stroke-[3]" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* السلة */}
        <aside className={`${glass} anim-fade-up lg:min-h-0 p-4 flex flex-col gap-3`} style={{ animationDelay: '120ms' }}>
          <div className="flex items-center gap-3">
            <span className="relative w-12 h-12 rounded-2xl bg-[#FAF0F0] text-[#6B0F1A] flex items-center justify-center shrink-0">
              <ShoppingBag className="w-6 h-6" />
              {totalCartCount > 0 && (
                <span key={totalCartCount} className="anim-pop absolute -top-1.5 -left-1.5 min-w-6 h-6 px-1 rounded-full bg-[#E5A91E] text-[#3E080F] text-xs font-black flex items-center justify-center tabular-nums">
                  {totalCartCount}
                </span>
              )}
            </span>
            <h2 className="flex-1 text-xl font-black">طلبك</h2>
            {cart.length > 0 && (
              <button
                type="button"
                aria-label="تفريغ"
                onClick={clearCart}
                className="w-10 h-10 rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer flex items-center justify-center"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="flex-1 min-h-[8rem] lg:min-h-0 overflow-y-auto -mx-1 px-1 space-y-2">
            {cart.length === 0 ? (
              <div className="h-full min-h-[8rem] flex flex-col items-center justify-center gap-2 text-stone-300">
                <ShoppingBag className="w-14 h-14 stroke-1" />
                <span className="font-black text-stone-500">فاضي</span>
              </div>
            ) : (
              cart.map((item) => {
                const price = item.meal.discount_price ?? item.meal.price;
                return (
                  <div key={item.meal.id} className="anim-fade-up flex items-center gap-2.5 rounded-2xl bg-[#F8F4EE] border-2 border-[#E7D7C7] p-2">
                    <span className="relative w-12 h-12 rounded-xl overflow-hidden bg-stone-200 shrink-0">
                      <Image src={getMealImageUrl(item.meal.name_ar, item.meal.image_url)} alt="" fill unoptimized className="object-cover" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-sm leading-snug line-clamp-1">{item.meal.name_ar}</div>
                      <div className="text-xs font-black text-[#6B0F1A] tabular-nums">{formatEgp(price * item.quantity)}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="تقليل"
                        onClick={() => updateCartQuantity(item.meal.id, item.quantity - 1)}
                        className="w-8 h-8 rounded-lg bg-white border-2 border-[#D6C7B2] cursor-pointer flex items-center justify-center"
                      >
                        <Minus className="w-4 h-4 stroke-[3]" />
                      </button>
                      <span key={item.quantity} className="anim-pop w-6 text-center font-black tabular-nums">{item.quantity}</span>
                      <button
                        type="button"
                        aria-label="زيادة"
                        onClick={() => addToCart(item.meal)}
                        className="w-8 h-8 rounded-lg bg-[#6B0F1A] text-white cursor-pointer flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {cart.length > 0 && (
            <div className="space-y-2.5 pt-3 border-t-2 border-[#EADBCB]">
              <div className="flex items-center justify-between text-sm font-black text-stone-600">
                <span>السعرات</span>
                <span className="tabular-nums text-emerald-800">{formatKcal(totalKcal)}</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center text-[11px] font-black tabular-nums">
                <span className="rounded-lg py-1 bg-amber-50 text-amber-800 border border-amber-200">كارب {cartMacros.estimated ? '~' : ''}{Math.round(cartMacros.carbsG)}</span>
                <span className="rounded-lg py-1 bg-rose-50 text-rose-800 border border-rose-200">بروتين {cartMacros.estimated ? '~' : ''}{Math.round(cartMacros.proteinG)}</span>
                <span className="rounded-lg py-1 bg-sky-50 text-sky-800 border border-sky-200">دهون {cartMacros.estimated ? '~' : ''}{Math.round(cartMacros.fatG)}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="font-black">الإجمالي</span>
                <span className="text-3xl font-black text-[#6B0F1A] tabular-nums">{formatEgp(priceShown)}</span>
              </div>
            </div>
          )}

          <Button
            size="xl"
            variant="primary"
            onClick={handleCheckout}
            disabled={cart.length === 0 || ordering}
            className="w-full gap-2.5 py-4 text-lg font-black"
          >
            <Printer className="w-6 h-6 stroke-[2.25]" />
            <span>{ordering ? '...' : 'تأكيد الطلب'}</span>
          </Button>
        </aside>
      </main>
    </div>
  );
}
