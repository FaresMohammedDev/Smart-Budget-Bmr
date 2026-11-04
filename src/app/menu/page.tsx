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
  UtensilsCrossed,
  Tag,
  CupSoda,
  Layers,
  Zap,
  SunMedium,
  Cookie,
} from 'lucide-react';
import { KioskHeader } from '@/components/layout/KioskHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { usePlannerStore } from '@/features/planner/store/planner.store';
import { Meal } from '@/features/recommendations/domain/types';
import { formatEgp, formatKcal } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';
import { getMealImageUrl } from '@/lib/meal-images';
import { RICH_FATHALLA_MEALS } from '@/lib/meals-data';

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

  // جلب الوجبات ودمجها مع قائمة فتح الله الغنية (34+ وجبة تشمل فطور، غداء، عشاء، سناكس)
  useEffect(() => {
    async function loadMenu() {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data: dbMeals } = await supabase
          .from('meals')
          .select('*, meal_items(quantity, food_items(*))')
          .eq('is_available', true);

        const dbMap = new Map((dbMeals || []).map((m: any) => [m.name_ar, m]));

        // دمج وجبات قاعدة البيانات مع القائمة الغنية المتكاملة
        const combined: Meal[] = RICH_FATHALLA_MEALS.map((richMeal) => {
          const dbMatch = dbMap.get(richMeal.name_ar);
          if (dbMatch) {
            return {
              ...richMeal,
              id: dbMatch.id,
              price: Number(dbMatch.price),
              discount_price: dbMatch.discount_price ? Number(dbMatch.discount_price) : null,
              is_expiring_soon: Boolean(dbMatch.is_expiring_soon),
            };
          }
          return richMeal;
        });

        setMeals(combined);
      } catch {
        setMeals(RICH_FATHALLA_MEALS);
      } finally {
        setLoading(false);
      }
    }

    loadMenu();
  }, []);

  const filteredMeals = meals.filter((m) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'offers') return m.is_expiring_soon || (m.discount_price && m.discount_price < m.price);
    if (selectedCategory === 'breakfast') {
      return (
        m.name_ar.includes('فول') ||
        m.name_ar.includes('طعمية') ||
        m.name_ar.includes('بيض') ||
        m.name_ar.includes('شكشوكة') ||
        m.name_ar.includes('فطير') ||
        m.name_ar.includes('جبن')
      );
    }
    if (selectedCategory === 'sandwiches') {
      return (
        m.name_ar.includes('ساندوتش') ||
        m.name_ar.includes('شاورما') ||
        m.name_ar.includes('حواوشي') ||
        m.name_ar.includes('برجر')
      );
    }
    if (selectedCategory === 'main') {
      return (
        m.kind === 'main' &&
        !m.name_ar.includes('فول') &&
        !m.name_ar.includes('طعمية') &&
        !m.name_ar.includes('بيض') &&
        !m.name_ar.includes('شكشوكة') &&
        !m.name_ar.includes('ساندوتش')
      );
    }
    if (selectedCategory === 'side') return m.kind === 'side';
    if (selectedCategory === 'dessert') return m.kind === 'dessert';
    if (selectedCategory === 'drink') return m.kind === 'drink';
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
    <div className="min-h-screen bg-[#F8F4EE] text-[#1E1210] flex flex-col">
      <KioskHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-8 space-y-8">
        {/* شريط العنوان والتصنيفات */}
        <div className="flex items-center justify-between flex-wrap gap-4 border-b-2 border-[#E7D7C7] pb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black text-[#1E1210] flex items-center gap-2">
                <UtensilsCrossed className="w-8 h-8 text-[#6B0F1A] stroke-[2.25]" />
                <span>منيو وجبات فتح الله ماركت ({meals.length} وجبة)</span>
              </h1>
              <span className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-[#6B0F1A] text-white font-extrabold shadow-sm">
                <Flame className="w-3.5 h-3.5 text-amber-300 stroke-[2.25]" />
                <span>طازج وساخن فوراً</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 mt-1 font-bold">
              اطلب وجباتك المفضلة مباشرة مع توضيح السعرات الحرارية والأسعار بدقة
            </p>
          </div>

          {/* تبويبات الأقسام مع أيقونات SVG نقية بارزة 3D */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
            {[
              { id: 'all', label: `الكل (${meals.length})`, icon: <Layers className="w-4 h-4 stroke-[2.25]" /> },
              { id: 'offers', label: 'عروض التوفير', icon: <Tag className="w-4 h-4 stroke-[2.25]" /> },
              { id: 'breakfast', label: 'فطور مصري طازج', icon: <SunMedium className="w-4 h-4 stroke-[2.25]" /> },
              { id: 'sandwiches', label: 'شاورما وساندوتشات', icon: <UtensilsCrossed className="w-4 h-4 stroke-[2.25]" /> },
              { id: 'main', label: 'مشويات وصواني', icon: <Flame className="w-4 h-4 stroke-[2.25]" /> },
              { id: 'side', label: 'أطباق جانبية وسلطات', icon: <Sparkles className="w-4 h-4 stroke-[2.25]" /> },
              { id: 'dessert', label: 'حلويات شرقية', icon: <Cookie className="w-4 h-4 stroke-[2.25]" /> },
              { id: 'drink', label: 'عصائر ومشروبات', icon: <CupSoda className="w-4 h-4 stroke-[2.25]" /> },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-[#6B0F1A] text-white border-2 border-[#3E080F] shadow-[0_4px_0_0_#3E080F] -translate-y-0.5'
                    : 'bg-white text-stone-800 border-2 border-[#D6C7B2] shadow-[0_3px_0_0_#C4B29A] hover:border-[#6B0F1A]'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
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
                <p className="text-stone-700 font-black">جاري تحميل أشهى الوجبات الطازجة...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {filteredMeals.map((meal) => {
                  const cartItem = cart.find((i) => i.meal.id === meal.id);
                  const qty = cartItem ? cartItem.quantity : 0;
                  const price = meal.discount_price ?? meal.price;

                  return (
                    <div
                      key={meal.id}
                      className="p-5 rounded-[28px] bg-white border-2 border-[#E7D7C7] hover:border-[#6B0F1A] transition-all shadow-sm hover:shadow-xl hover:shadow-[#6B0F1A]/10 flex flex-col justify-between space-y-4 group"
                    >
                      <div className="space-y-3">
                        <div className="relative w-full h-48 rounded-2xl overflow-hidden bg-stone-100 border-2 border-[#E7D7C7] shadow-sm">
                          <Image
                            src={getMealImageUrl(meal.name_ar, meal.image_url)}
                            alt={meal.name_ar}
                            fill
                            unoptimized
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          {meal.is_expiring_soon && (
                            <div className="absolute top-2.5 right-2.5">
                              <span className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-[#6B0F1A] text-white font-extrabold shadow-md border border-white/20">
                                <Tag className="w-3 h-3 stroke-[2.5]" />
                                <span>عرض توفير طازج</span>
                              </span>
                            </div>
                          )}
                        </div>

                        <div>
                          <h3 className="font-black text-lg text-[#1E1210] group-hover:text-[#6B0F1A] transition-colors leading-snug">
                            {meal.name_ar}
                          </h3>
                          <div className="flex items-center gap-2 mt-1.5 text-xs text-stone-600 font-bold">
                            <span className="flex items-center gap-1 text-[#6B0F1A] bg-[#FAF0F0] px-2 py-0.5 rounded-lg border border-[#6B0F1A]/20 font-black">
                              <Flame className="w-3.5 h-3.5 text-[#6B0F1A]" />
                              <span>{formatKcal(meal.total_kcal)}</span>
                            </span>
                            <span>•</span>
                            <span className="text-[#854D0E] bg-[#FEF9EE] px-2 py-0.5 rounded-lg border border-[#D97706]/30 font-black">
                              {meal.portion_type === 'shareable' ? 'تشاركي عائلي' : 'وجبة فردية'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* السعر وزر الإضافة */}
                      <div className="pt-3 border-t-2 border-stone-100 flex items-center justify-between">
                        <div>
                          {meal.discount_price ? (
                            <div>
                              <div className="text-2xl font-black text-[#6B0F1A]">
                                {formatEgp(meal.discount_price)}
                              </div>
                              <div className="text-xs text-stone-400 line-through">
                                {formatEgp(meal.price)}
                              </div>
                            </div>
                          ) : (
                            <div className="text-2xl font-black text-[#6B0F1A]">
                              {formatEgp(meal.price)}
                            </div>
                          )}
                        </div>

                        {qty === 0 ? (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => addToCart(meal)}
                            className="gap-1.5 px-5 py-2 text-xs font-black"
                          >
                            <Plus className="w-4 h-4 stroke-[3]" />
                            <span>إضافة للطلب</span>
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2 bg-[#FAF0F0] p-1.5 rounded-2xl border-2 border-[#6B0F1A]/30">
                            <button
                              onClick={() => updateCartQuantity(meal.id, qty - 1)}
                              className="w-8 h-8 rounded-xl bg-white hover:bg-stone-100 text-[#1E1210] font-black flex items-center justify-center border border-stone-300 shadow-xs cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                            <span className="w-6 text-center font-black text-sm text-[#1E1210]">
                              {qty}
                            </span>
                            <button
                              onClick={() => addToCart(meal)}
                              className="w-8 h-8 rounded-xl bg-[#6B0F1A] text-white font-black flex items-center justify-center shadow-xs cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
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
            <div className="sticky top-24 p-6 rounded-[28px] bg-white border-2 border-[#E7D7C7] shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b-2 border-stone-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-[#FAF0F0] text-[#6B0F1A]">
                    <ShoppingBag className="w-5 h-5 stroke-[2.25]" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-[#1E1210]">سلة طلباتك</h3>
                    <p className="text-xs text-[#854D0E] font-bold">{totalCartCount} وجبات مختارة</p>
                  </div>
                </div>

                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs text-[#6B0F1A] hover:underline transition-colors flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>تفريغ</span>
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
                        className="p-3.5 rounded-2xl bg-[#FAF0F0] border border-[#6B0F1A]/20 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-black text-[#1E1210] text-sm">
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
                            className="w-7 h-7 rounded-lg bg-white border border-stone-300 text-stone-800 flex items-center justify-center font-black shadow-xs cursor-pointer"
                          >
                            <Minus className="w-3 h-3 stroke-[2.5]" />
                          </button>
                          <span className="w-6 text-center font-black text-[#1E1210]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => addToCart(item.meal)}
                            className="w-7 h-7 rounded-lg bg-[#6B0F1A] text-white flex items-center justify-center font-black shadow-xs cursor-pointer"
                          >
                            <Plus className="w-3 h-3 stroke-[2.5]" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ملخص السلة */}
              {cart.length > 0 && (
                <div className="space-y-4 pt-4 border-t-2 border-stone-100">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-stone-600 font-bold">
                      <span>إجمالي السعرات الحرارية:</span>
                      <span className="text-emerald-800 font-black">{formatKcal(totalKcal)}</span>
                    </div>
                    <div className="flex justify-between text-base font-black text-[#1E1210]">
                      <span>إجمالي الحساب:</span>
                      <span className="text-2xl text-[#6B0F1A]">{formatEgp(totalPrice)}</span>
                    </div>
                  </div>

                  <Button
                    size="xl"
                    variant="primary"
                    onClick={handleCheckout}
                    disabled={ordering}
                    className="w-full gap-2 py-4 text-base font-black"
                  >
                    <Printer className="w-5 h-5 stroke-[2.25]" />
                    <span>{ordering ? 'جاري تجهيز البون...' : 'تأكيد الطلب وطباعة البون'}</span>
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
