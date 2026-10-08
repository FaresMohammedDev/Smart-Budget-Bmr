'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Sparkles,
  Flame,
  Wallet,
  Users,
  Check,
  Printer,
  ArrowRight,
  AlertCircle,
  TrendingDown,
  ShoppingBag,
} from 'lucide-react';
import { KioskHeader } from '@/components/layout/KioskHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { usePlannerStore } from '@/features/planner/store/planner.store';
import { calculateBmr } from '@/features/nutrition/domain/bmr';
import { calculateTdee } from '@/features/nutrition/domain/tdee';
import { calculateTargetMealKcal } from '@/features/nutrition/domain/meal-fraction';
import { recommendMeals } from '@/features/recommendations/domain/engine';
import { EngineResult, Meal, RecommendationOption } from '@/features/recommendations/domain/types';
import { PersonNutrition } from '@/features/nutrition/domain/types';
import { formatEgp, formatKcal } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';

export default function ResultsStepPage() {
  const router = useRouter();
  const { people, budget, mealTime, setSelectedRecommendation } = usePlannerStore();
  const [engineResult, setEngineResult] = useState<EngineResult | null>(null);
  const [selectedOpt, setSelectedOpt] = useState<RecommendationOption | null>(null);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. حساب سعرات الأشخاص
  const peopleNutrition: PersonNutrition[] = people.map((p, idx) => {
    try {
      const bmr = calculateBmr(p.gender, p.weightKg, p.heightCm, p.age);
      const tdee = calculateTdee(bmr, p.activityLevel);
      return {
        id: `p-${idx}`,
        name: p.name || `فرد ${idx + 1}`,
        bmr,
        tdee,
        targetKcal: 0,
        sharePercent: 0,
      };
    } catch {
      return {
        id: `p-${idx}`,
        name: p.name || `فرد ${idx + 1}`,
        bmr: 1700,
        tdee: 2500,
        targetKcal: 0,
        sharePercent: 0,
      };
    }
  });

  const totalTdee = peopleNutrition.reduce((sum, p) => sum + p.tdee, 0);
  const targetKcal = calculateTargetMealKcal(totalTdee, mealTime);

  // 2. جلب الوجبات وتشغيل المحرك
  useEffect(() => {
    async function fetchAndRecommend() {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data: dbMeals, error } = await supabase
          .from('meals')
          .select('*, meal_items(quantity, food_items(*))')
          .eq('is_available', true);

        let mealsToUse: Meal[] = [];

        if (error || !dbMeals || dbMeals.length === 0) {
          // بيانات احتياطية مطابقة للسيد
          mealsToUse = [
            {
              id: 'm1',
              name_ar: 'ساندوتش شاورما فراخ',
              name_en: 'Chicken Shawarma Sandwich',
              price: 85,
              is_expiring_soon: false,
              is_available: true,
              total_kcal: 550,
              kind: 'main',
              portion_type: 'individual',
              servings: 1,
              image_url: '/images/meal-placeholder.svg',
            },
            {
              id: 'm2',
              name_ar: 'صينية مكرونة بشاميل عائلي',
              name_en: 'Family Bechamel Pasta Tray',
              price: 320,
              discount_price: 260,
              is_expiring_soon: true, // عرض توفير خاص قرب الصلاحية
              is_available: true,
              total_kcal: 2800,
              kind: 'main',
              portion_type: 'shareable',
              servings: 4,
              image_url: '/images/meal-placeholder.svg',
            },
            {
              id: 'm3',
              name_ar: 'ربع فرخة مشوية بالأرز',
              name_en: 'Quarter Grilled Chicken',
              price: 160,
              is_expiring_soon: false,
              is_available: true,
              total_kcal: 850,
              kind: 'main',
              portion_type: 'individual',
              servings: 1,
              image_url: '/images/meal-placeholder.svg',
            },
            {
              id: 'm4',
              name_ar: 'بطاطس محمرة',
              name_en: 'French Fries Box',
              price: 35,
              is_expiring_soon: false,
              is_available: true,
              total_kcal: 400,
              kind: 'side',
              portion_type: 'individual',
              servings: 1,
              image_url: '/images/meal-placeholder.svg',
            },
            {
              id: 'm5',
              name_ar: 'سلطة خضراء',
              name_en: 'Green Salad Plate',
              price: 20,
              is_expiring_soon: false,
              is_available: true,
              total_kcal: 60,
              kind: 'side',
              portion_type: 'individual',
              servings: 1,
              image_url: '/images/meal-placeholder.svg',
            },
          ];
        } else {
          mealsToUse = dbMeals.map((m: any) => ({
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
          }));
        }

        const res = recommendMeals({
          availableMeals: mealsToUse,
          targetKcal,
          budget,
          people: peopleNutrition,
        });

        setEngineResult(res);
        if (res.status === 'success' && res.recommendations.length > 0) {
          setSelectedOpt(res.recommendations[0]!);
        }
      } catch (err: unknown) {
        setErrorMsg('حدث خطأ في جلب الوجبات');
      } finally {
        setLoading(false);
      }
    }

    fetchAndRecommend();
  }, [budget, targetKcal]);

  // تأكيد الطلب وإنشاء البون
  const handleConfirmOrder = async () => {
    if (!selectedOpt) return;
    setOrdering(true);
    setErrorMsg('');

    try {
      const supabase = createClient();
      const userRes = await supabase.auth.getUser();

      const itemsPayload = selectedOpt.items.map((i) => ({
        meal_id: i.meal.id,
        quantity: i.quantity,
      }));

      const shares = engineResult?.status === 'success' ? engineResult.sharesByPerson : undefined;

      const peoplePayload = people.map((p, idx) => ({
        name: p.name || `فرد ${idx + 1}`,
        age: p.age,
        gender: p.gender,
        height_cm: p.heightCm,
        weight_kg: p.weightKg,
        activity_level: p.activityLevel,
        share_percent: shares?.[idx]?.sharePercent ?? 100 / people.length,
        share_kcal: shares?.[idx]?.shareKcal ?? 0,
        share_details: shares?.[idx]?.allocatedItems ?? [],
      }));

      // استدعاء دالة create_order الآمنة في Supabase
      const { data: orderId, error: rpcError } = await supabase.rpc('create_order', {
        p_payload: {
          budget,
          meal_fraction: 0.4,
          order_mode: 'smart_budget',
          items: itemsPayload,
          people: peoplePayload,
        },
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      setSelectedRecommendation(selectedOpt);
      router.push(`/receipt/${orderId}`);
    } catch (err: unknown) {
      // إذا فشل الـ RPC لعدم وجود ربط مباشر بقاعدة البيانات، ننشئ كود وهمي ونعرض البون للمعاينة
      const fallbackOrderId = `ord-${Date.now()}`;
      setSelectedRecommendation(selectedOpt);
      router.push(`/receipt/${fallbackOrderId}`);
    } finally {
      setOrdering(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <KioskHeader />

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-8 space-y-6">
        {/* شريط المراحل */}
        <div className="flex items-center justify-between text-xs sm:text-sm text-zinc-400 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center text-xs">
              ✓
            </span>
            <span>بيانات الأفراد</span>
          </div>
          <div className="h-0.5 w-12 bg-zinc-800" />
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center text-xs">
              ✓
            </span>
            <span>الميزانية والوقت</span>
          </div>
          <div className="h-0.5 w-12 bg-zinc-800" />
          <div className="flex items-center gap-2 text-[#F37A20] font-bold">
            <span className="w-6 h-6 rounded-full bg-[#F37A20] text-black flex items-center justify-center font-black text-xs">
              3
            </span>
            <span>الترشيحات الذكية</span>
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-[#F37A20] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-zinc-400 font-bold">جاري حساب أفضل التوليفات من منيو فتح الله...</p>
          </div>
        ) : engineResult?.status === 'low_budget' ? (
          /* حالة الميزانية القليلة (Edge Case) */
          <div className="p-8 rounded-3xl bg-zinc-900 border-2 border-amber-500/30 space-y-6 text-right">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-amber-500/15 text-amber-400">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white">اعتذار وتوضيح للميزانية</h3>
                <p className="text-sm text-zinc-300 mt-2 leading-relaxed">
                  {engineResult.apologyMessageAr}
                </p>
              </div>
            </div>

            {engineResult.suggestedSides.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-zinc-800">
                <h4 className="font-bold text-base text-[#F37A20]">
                  اقتراحات إضافات وسناكس تكفي ميزانيتك الحالية ({formatEgp(engineResult.budget)}):
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {engineResult.suggestedSides.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold">{item.meal.name_ar}</div>
                        <div className="text-xs text-zinc-400">
                          {formatKcal(item.meal.total_kcal)}
                        </div>
                      </div>
                      <div className="text-emerald-400 font-black">
                        {formatEgp(item.meal.discount_price ?? item.meal.price)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-4">
              <Button
                variant="outline"
                onClick={() => router.push('/plan/budget')}
              >
                تعديل الميزانية
              </Button>
              <Button
                variant="secondary"
                onClick={() => router.push('/menu')}
              >
                تصفح المنيو المباشر
              </Button>
            </div>
          </div>
        ) : (
          /* حالة النجاح وعرض الترشيحات */
          <div className="space-y-8">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  أفضل الوجبات المقترحة لك
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                  محسوبة بدقة وفقاً للميزانية ({formatEgp(budget)}) والاحتياج ({formatKcal(targetKcal)})
                </p>
              </div>

              <div className="flex items-center gap-2 bg-zinc-900 px-4 py-2 rounded-2xl border border-zinc-800 text-xs">
                <Sparkles className="w-4 h-4 text-[#F37A20]" />
                <span className="font-bold text-zinc-200">
                  {engineResult?.status === 'success' ? engineResult.recommendations.length : 0} اقتراحات متوازنة
                </span>
              </div>
            </div>

            {/* قائمة كروت الترشيحات */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {engineResult?.status === 'success' && engineResult.recommendations.map((rec) => {
                const isSelected = selectedOpt?.id === rec.id;
                return (
                  <div
                    key={rec.id}
                    onClick={() => setSelectedOpt(rec)}
                    className={`relative p-6 rounded-3xl border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 ${
                      isSelected
                        ? 'bg-zinc-900 border-[#F37A20] shadow-xl shadow-[#F37A20]/15'
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {/* شارة التميز */}
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={rec.isExpiringSoonOffer ? 'special' : 'default'}
                      >
                        {rec.title_ar}
                      </Badge>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-[#F37A20] border-[#F37A20] text-black'
                            : 'border-zinc-700'
                        }`}
                      >
                        {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                    </div>

                    {/* تفاصيل الوجبات في هذا الاقتراح */}
                    <div className="space-y-3">
                      {rec.items.map((item, iIdx) => (
                        <div key={iIdx} className="flex items-center gap-3">
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 flex-shrink-0">
                            <Image
                              src={item.meal.image_url}
                              alt={item.meal.name_ar}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-white text-base">
                              {item.quantity} × {item.meal.name_ar}
                            </div>
                            <div className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
                              <span>{formatKcal(item.meal.total_kcal * item.quantity)}</span>
                              <span>•</span>
                              <span>{formatEgp((item.meal.discount_price ?? item.meal.price) * item.quantity)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* شريط الإجمالي للكارت */}
                    <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-zinc-400">إجمالي السعرات: </span>
                        <span className="font-bold text-emerald-400">
                          {formatKcal(rec.totalKcal)}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-400">السعر: </span>
                        <span className="text-base font-black text-white">
                          {formatEgp(rec.totalPrice)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* تفاصيل نصيب الأفراد للاقتراح المحدد */}
            {engineResult?.status === 'success' && engineResult.sharesByPerson && (
              <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4">
                <div className="flex items-center gap-2 font-bold text-base text-zinc-200">
                  <Users className="w-5 h-5 text-[#F37A20]" />
                  <span>توزيع الحصص العادل على أفراد المجموعة:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {engineResult.sharesByPerson.map((sh, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/80 text-xs space-y-1.5"
                    >
                      <div className="flex justify-between font-bold text-white">
                        <span>{sh.personName}</span>
                        <span className="text-[#F37A20]">{sh.sharePercent}%</span>
                      </div>
                      <div className="text-emerald-400 font-semibold">
                        {formatKcal(sh.shareKcal)}
                      </div>
                      <div className="text-zinc-400 text-[11px] space-y-0.5 pt-1 border-t border-zinc-900">
                        {sh.allocatedItems.map((it, itIdx) => (
                          <div key={itIdx}>• {it.portionDescription}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* أزرار التأكيد والطباعة */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
              <Button
                variant="ghost"
                onClick={() => router.push('/plan/budget')}
                className="text-zinc-400 hover:text-white"
              >
                <ArrowRight className="w-5 h-5 ml-1.5" />
                تغيير الميزانية
              </Button>

              <Button
                size="xl"
                onClick={handleConfirmOrder}
                disabled={!selectedOpt || ordering}
                className="gap-2.5"
              >
                <Printer className="w-5 h-5" />
                <span>{ordering ? 'جاري إنشاء البون...' : 'تأكيد الوجبة وطباعة البون'}</span>
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
