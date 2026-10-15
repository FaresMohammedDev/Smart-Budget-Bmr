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
  Check,
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
              image_url: m.image_url || '/images/fathalla-logo.png',
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
      const fallbackId = `quick-${Date.now()}`;
      clearCart();
      router.push(`/receipt/${fallbackId}`);
    } finally {
      setOrdering(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-stone-900 flex flex-col">
      <KioskHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-8 space-y-8">
        {/* شريط العنوان والتصنيفات */}
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-orange-200/80 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black text-stone-900">
                منيو وجبات فتح الله ماركت 🍽️
              </h1>
              <span className="text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-black border border-red-200">
                طازة وسخن 🔥
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 mt-1 font-medium">
              اطلب وجباتك المفضلة مباشرة مع توضيح السعرات الحرارية والأسعار بدقة
            </p>
          </div>

          {/* تبويبات الأقسام */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'الكل 🍽️' },
              { id: 'offers', label: 'عروض التوفير ⭐' },
              { id: 'main', label: 'وجبات رئيسية 🍗' },
              { id: 'side', label: 'أطباق جانبية 🍟' },
              { id: 'drink', label: 'مشروبات 🥤' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-md shadow-orange-500/25 scale-105'
                    : 'bg-white text-stone-700 hover:bg-orange-50 border border-stone-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* شبكة الوجبات وسلة الشراء */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* قسم الوجبات */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="p-16 text-center space-y-4">
                <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-stone-600 font-bold">جاري تحميل أشهى الوجبات الطازجة...</p>
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
                      className="p-5 rounded-3xl bg-white border border-orange-100 hover:border-orange-300 transition-all shadow-sm hover:shadow-md flex flex-col justify-between space-y-4 group"
                    >
                      <div className="space-y-3">
                        <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-stone-100 border border-stone-200">
                          <Image
                            src={meal.image_url || '/images/fathalla-logo.png'}
                            alt={meal.name_ar}
                            fill
                            unoptimized
                            className="object-cover group-hover:scale-105 transition-transform"
                          />
                          {meal.is_expiring_soon && (
                            <div className="absolute top-2.5 right-2.5">
                              <Badge variant="special">عرض توفير طازج ⭐</Badge>
                            </div>
                          )}
                        </div>

                        <div>
                          <h3 className="font-black text-lg text-stone-900 group-hover:text-orange-600 transition-colors">
                            {meal.name_ar}
                          </h3>
                          <div className="flex items-center gap-2 mt-1.5 text-xs text-stone-500 font-bold">
                            <span className="flex items-center gap-1 text-orange-600">
                              <Flame className="w-3.5 h-3.5 text-red-600" />
                              {formatKcal(meal.total_kcal)}
                            </span>
                            <span>•</span>
                            <span className="text-stone-700">{meal.portion_type === 'shareable' ? 'تشاركي عائلي' : 'وجبة فردية'}</span>
                          </div>
                        </div>
                      </div>

                      {/* السعر وزر الإضافة */}
                      <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                        <div>
                          {meal.discount_price ? (
                            <div>
                              <div className="text-xl font-black text-red-600">
                                {formatEgp(meal.discount_price)}
                              </div>
                              <div className="text-xs text-stone-400 line-through">
                                {formatEgp(meal.price)}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xl font-black text-red-600">
                              {formatEgp(meal.price)}
                            </div>
                          )}
                        </div>

                        {qty === 0 ? (
                          <Button
                            size="sm"
                            onClick={() => addToCart(meal)}
                            className="gap-1.5 shadow-md shadow-orange-500/20 px-4 py-2"
                          >
                            <Plus className="w-4 h-4" />
                            <span>إضافة للطلب</span>
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2 bg-orange-50 p-1.5 rounded-2xl border border-orange-200">
                            <button
                              onClick={() => updateCartQuantity(meal.id, qty - 1)}
                              className="w-8 h-8 rounded-xl bg-white hover:bg-stone-100 text-stone-900 font-black flex items-center justify-center border border-stone-200 shadow-sm"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center font-black text-sm text-stone-900">
                              {qty}
                            </span>
                            <button
                              onClick={() => addToCart(meal)}
                              className="w-8 h-8 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white font-black flex items-center justify-center shadow-sm"
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
            <div className="sticky top-24 p-6 rounded-3xl bg-white border border-orange-100 shadow-md space-y-6">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-orange-100 text-orange-600">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-stone-900">سلة طلباتك</h3>
                    <p className="text-xs text-stone-500 font-bold">{totalCartCount} وجبات مختارة</p>
                  </div>
                </div>

                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs text-red-600 hover:text-red-700 transition-colors flex items-center gap-1 font-bold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    تفريغ
                  </button>
                )}
              </div>

              {/* عناصر السلة */}
              {cart.length === 0 ? (
                <div className="py-12 text-center space-y-2 text-stone-400">
                  <ShoppingBag className="w-12 h-12 mx-auto stroke-1 text-stone-300" />
                  <p className="text-sm font-bold text-stone-600">السلة فارغة حالياً</p>
                  <p className="text-xs">اضغط على "إضافة للطلب" عند أي وجبة لتظهر هنا</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {cart.map((item) => {
                    const price = item.meal.discount_price ?? item.meal.price;
                    return (
                      <div
                        key={item.meal.id}
                        className="p-3.5 rounded-2xl bg-orange-50/50 border border-orange-100 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-black text-stone-900 text-sm">
                            {item.meal.name_ar}
                          </div>
                          <div className="text-stone-500 mt-0.5 font-bold">
                            {formatEgp(price)} للواحدة • {formatKcal(item.meal.total_kcal * item.quantity)}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() =>
                              updateCartQuantity(item.meal.id, item.quantity - 1)
                            }
                            className="w-7 h-7 rounded-lg bg-white border border-stone-200 text-stone-800 flex items-center justify-center font-black shadow-sm"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center font-black text-stone-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => addToCart(item.meal)}
                            className="w-7 h-7 rounded-lg bg-gradient-to-r from-red-600 to-orange-500 text-white flex items-center justify-center font-black shadow-sm"
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
                <div className="space-y-4 pt-4 border-t border-stone-100">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-stone-600 font-bold">
                      <span>إجمالي السعرات الحرارية:</span>
                      <span className="text-emerald-700 font-black">{formatKcal(totalKcal)}</span>
                    </div>
                    <div className="flex justify-between text-base font-black text-stone-900">
                      <span>إجمالي الحساب:</span>
                      <span className="text-xl text-red-600">{formatEgp(totalPrice)}</span>
                    </div>
                  </div>

                  <Button
                    size="xl"
                    onClick={handleCheckout}
                    disabled={ordering}
                    className="w-full gap-2 shadow-xl shadow-orange-500/25 py-4 text-base"
                  >
                    <Printer className="w-5 h-5" />
                    <span>{ordering ? 'جاري تجهيز البون...' : 'تأكيد الطلب وطباعة البون 🧾'}</span>
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
