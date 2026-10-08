'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ShoppingBag,
  Flame,
  Plus,
  Minus,
  Trash2,
  Printer,
  Sparkles,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { KioskHeader } from '@/components/layout/KioskHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { usePlannerStore } from '@/features/planner/store/planner.store';
import { Meal } from '@/features/recommendations/domain/types';
import { formatEgp, formatKcal } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';

export default function MenuEcommercePage() {
  const router = useRouter();
  const {
    cart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    getCartTotal,
  } = usePlannerStore();

  const [meals, setMeals] = useState<Meal[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);

  // جلب الوجبات
  useEffect(() => {
    async function loadMenu() {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('meals')
          .select('*, meal_items(quantity, food_items(*))')
          .eq('is_available', true);

        if (error || !data || data.length === 0) {
          setMeals([]);
        } else {
          setMeals(
            data.map((m: any) => ({
              id: m.id,
              name_ar: m.name_ar,
              name_en: m.name_en,
              description_ar: m.description_ar,
              description_en: m.description_en,
              price: Number(m.price),
              discount_price: m.discount_price ? Number(m.discount_price) : null,
              is_expiring_soon: Boolean(m.is_expiring_soon),
              is_available: m.is_available,
              total_kcal: Number(m.total_kcal),
              kind: m.kind,
              portion_type: m.portion_type,
              servings: m.servings,
              image_url: m.image_url || '/images/meal-placeholder.svg',
            }))
          );
        }
      } catch {
        //
      } finally {
        setLoading(false);
      }
    }

    loadMenu();
  }, []);

  const filteredMeals = meals.filter((m) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'offers') return m.is_expiring_soon;
    return m.kind === selectedCategory;
  });

  const { totalPrice, totalKcal } = getCartTotal();
  const totalCartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  // إتمام الشراء المباشر وطباعة البون
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setOrdering(true);

    try {
      const supabase = createClient();
      const itemsPayload = cart.map((c) => ({
        meal_id: c.meal.id,
        quantity: c.quantity,
      }));

      const { data: orderId, error } = await supabase.rpc('create_order', {
        p_payload: {
          budget: totalPrice,
          order_mode: 'quick_menu',
          items: itemsPayload,
          people: [],
        },
      });

      if (error) throw error;
      clearCart();
      router.push(`/receipt/${orderId}`);
    } catch {
      // احتياطي
      const fallbackId = `quick-${Date.now()}`;
      clearCart();
      router.push(`/receipt/${fallbackId}`);
    } finally {
      setOrdering(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <KioskHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-8 space-y-8">
        {/* شريط العنوان والتصنيفات */}
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-3xl font-black text-white">
              قائمة وجبات فتح الله ماركت
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              الطلب السريع المباشر (E-Commerce) مع توضيح السعرات والأسعار لكل وجبة
            </p>
          </div>

          {/* تبويبات الأقسام */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'offers', label: 'عروض فتح الله الخاصة ⭐' },
              { id: 'main', label: 'وجبات رئيسية' },
              { id: 'side', label: 'أطباق جانبية' },
              { id: 'drink', label: 'مشروبات' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[#F37A20] text-white shadow-md'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* شبكة الوجبات وسلة الشراء */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* قسم الوجبات (عمودين في الشاشات الكبيرة) */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="p-16 text-center space-y-4">
                <div className="w-12 h-12 border-4 border-[#F37A20] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-zinc-400 font-bold">جاري تحميل القائمة الطازجة...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {filteredMeals.map((meal) => {
                  const cartItem = cart.find((i) => i.meal.id === meal.id);
                  const qty = cartItem ? cartItem.quantity : 0;
                  const price = meal.discount_price ?? meal.price;

                  return (
                    <div
                      key={meal.id}
                      className="p-5 rounded-3xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800">
                          <Image
                            src={meal.image_url}
                            alt={meal.name_ar}
                            fill
                            className="object-cover"
                          />
                          {meal.is_expiring_soon && (
                            <div className="absolute top-2.5 right-2.5">
                              <Badge variant="special">عرض توفير خاص ⭐</Badge>
                            </div>
                          )}
                        </div>

                        <div>
                          <h3 className="font-bold text-lg text-white">
                            {meal.name_ar}
                          </h3>
                          <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-400">
                            <span className="flex items-center gap-1 text-[#F37A20] font-semibold">
                              <Flame className="w-3.5 h-3.5" />
                              {formatKcal(meal.total_kcal)}
                            </span>
                            <span>•</span>
                            <span>{meal.portion_type === 'shareable' ? 'تشاركي عائلي' : 'فردي'}</span>
                          </div>
                        </div>
                      </div>

                      {/* السعر وزر الإضافة */}
                      <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                        <div>
                          {meal.discount_price ? (
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-lg font-black text-white">
                                {formatEgp(meal.discount_price)}
                              </span>
                              <span className="text-xs text-zinc-500 line-through">
                                {formatEgp(meal.price)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-lg font-black text-white">
                              {formatEgp(meal.price)}
                            </span>
                          )}
                        </div>

                        {qty === 0 ? (
                          <Button
                            size="sm"
                            onClick={() => addToCart(meal)}
                            className="gap-1.5"
                          >
                            <Plus className="w-4 h-4" />
                            <span>إضافة</span>
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2 bg-zinc-950 px-2 py-1 rounded-xl border border-zinc-800">
                            <button
                              onClick={() => updateCartQuantity(meal.id, qty - 1)}
                              className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-zinc-700"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center font-bold text-sm">
                              {qty}
                            </span>
                            <button
                              onClick={() => addToCart(meal)}
                              className="w-7 h-7 rounded-lg bg-[#F37A20] text-black font-bold flex items-center justify-center hover:bg-[#d96614]"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* سلة الشراء الجانبية */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#F37A20]/15 text-[#F37A20]">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">سلة الطلب السريع</h3>
                    <p className="text-xs text-zinc-400">{totalCartCount} وجبة مختارة</p>
                  </div>
                </div>

                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs text-zinc-400 hover:text-red-400 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    تفريغ
                  </button>
                )}
              </div>

              {/* عناصر السلة */}
              {cart.length === 0 ? (
                <div className="py-12 text-center space-y-2 text-zinc-500">
                  <ShoppingBag className="w-10 h-10 mx-auto stroke-1" />
                  <p className="text-sm">السلة فارغة حالياً</p>
                  <p className="text-xs">اختر وجباتك من القائمة لتظهر هنا</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {cart.map((item) => {
                    const price = item.meal.discount_price ?? item.meal.price;
                    return (
                      <div
                        key={item.meal.id}
                        className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-white">
                            {item.meal.name_ar}
                          </div>
                          <div className="text-zinc-400 mt-0.5">
                            {formatEgp(price)} للواحدة • {formatKcal(item.meal.total_kcal * item.quantity)}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() =>
                              updateCartQuantity(item.meal.id, item.quantity - 1)
                            }
                            className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-5 text-center font-bold">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => addToCart(item.meal)}
                            className="w-6 h-6 rounded-md bg-[#F37A20] text-black font-bold flex items-center justify-center"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ملخص السلة */}
              {cart.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-zinc-800">
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-zinc-400">
                      <span>إجمالي السعرات:</span>
                      <span className="font-bold text-emerald-400">
                        {formatKcal(totalKcal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-base font-black text-white">
                      <span>إجمالي السعر:</span>
                      <span className="text-xl text-[#F37A20]">
                        {formatEgp(totalPrice)}
                      </span>
                    </div>
                  </div>

                  <Button
                    size="lg"
                    onClick={handleCheckout}
                    disabled={ordering}
                    className="w-full gap-2"
                  >
                    <Printer className="w-5 h-5" />
                    <span>{ordering ? 'جاري التحضير...' : 'طباعة بون الكاشير'}</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
