'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Sparkles,
  ArrowRight,
  Printer,
  AlertCircle,
  Check,
  Flame,
  Users,
  Utensils,
  UtensilsCrossed,
  Share2,
} from 'lucide-react';
import { KioskHeader } from '@/components/layout/KioskHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { usePlannerStore } from '@/features/planner/store/planner.store';
import { calculateBmr } from '@/features/nutrition/domain/bmr';
import { calculateTdee } from '@/features/nutrition/domain/tdee';
import { calculateTargetMealKcal } from '@/features/nutrition/domain/meal-fraction';
import { formatEgp, formatKcal } from '@/lib/format';
import { getMealImageUrl } from '@/lib/meal-images';
import {
  EngineResult,
  Meal,
  RecommendationOption,
  PersonShareDetail,
} from '@/features/recommendations/domain/types';
import { PersonNutrition } from '@/features/nutrition/domain/types';
import { recommendMeals } from '@/features/recommendations/domain/engine';
import { calculateGroupShares } from '@/features/recommendations/domain/shares';
import { createClient } from '@/lib/supabase/client';
import { RICH_FATHALLA_MEALS } from '@/lib/meals-data';

export default function PlanResultsPage() {
  const router = useRouter();
  const {
    people,
    budget,
    mealTime,
    savedGroupId,
    setSelectedRecommendation,
    setSelectedShares,
  } = usePlannerStore();

  const [loading, setLoading] = useState(true);
  const [engineResult, setEngineResult] = useState<EngineResult | null>(null);
  const [selectedOpt, setSelectedOpt] = useState<RecommendationOption | null>(null);
  const [currentShares, setCurrentShares] = useState<PersonShareDetail[]>([]);
  const [ordering, setOrdering] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. حساب السعرات التقديرية للأفراد
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

  const totalGroupTdee = peopleNutrition.reduce((sum, p) => sum + p.tdee, 0);
  const targetKcal = calculateTargetMealKcal(totalGroupTdee, mealTime);

  // تحديث الحصص عند اختيار وجبة
  const handleSelectMeal = (opt: RecommendationOption) => {
    setSelectedOpt(opt);
    setSelectedRecommendation(opt);
    if (peopleNutrition.length > 0) {
      const shares = calculateGroupShares(peopleNutrition, opt.items);
      setCurrentShares(shares);
      setSelectedShares(shares);
    }
  };

  // 2. استدعاء المنيو الفعلي من Supabase ودمجه مع قائمة الوجبات الغنية الكاملة لفتح الله
  useEffect(() => {
    async function fetchAndRecommend() {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data: dbMeals } = await supabase
          .from('meals')
          .select('*')
          .eq('is_available', true);

        // خريطة وجبات قاعدة البيانات لربط الـ UUID للأوردرات
        const dbMap = new Map((dbMeals || []).map((m: any) => [m.name_ar, m]));

        // دمج وجبات قاعدة البيانات مع القائمة الغنية الكاملة (30+ وجبة تشمل فطور مصري، مشويات، صواني، سناكس)
        const mealsPool: Meal[] = RICH_FATHALLA_MEALS.map((richMeal) => {
          const dbMatch = dbMap.get(richMeal.name_ar);
          if (dbMatch) {
            return {
              ...richMeal,
              id: dbMatch.id, // استخدام UUID من قاعدة البيانات
              price: Number(dbMatch.price),
              discount_price: dbMatch.discount_price ? Number(dbMatch.discount_price) : null,
              is_expiring_soon: Boolean(dbMatch.is_expiring_soon),
            };
          }
          return richMeal;
        });

        // تشغيل المحرك الذكي مع مراعاة وقت الوجبة (mealTime) لمنع التناقضات
        const res = recommendMeals({
          availableMeals: mealsPool,
          targetKcal,
          budget,
          people: peopleNutrition,
          mealTime,
        });

        setEngineResult(res);

        if (res.status === 'success' && res.recommendations.length > 0) {
          const first = res.recommendations[0];
          setSelectedOpt(first);
          setSelectedRecommendation(first);
          if (peopleNutrition.length > 0) {
            const shares = calculateGroupShares(peopleNutrition, first.items);
            setCurrentShares(shares);
            setSelectedShares(shares);
          }
        }
      } catch (err: unknown) {
        setErrorMsg('حدث خطأ أثناء تحميل الوجبات.');
      } finally {
        setLoading(false);
      }
    }

    fetchAndRecommend();
  }, [budget, targetKcal, mealTime]);

  // تأكيد الطلب وإنشاء البون
  const handleConfirmOrder = async () => {
    if (!selectedOpt) return;
    setOrdering(true);
    setErrorMsg('');

    try {
      const supabase = createClient();

      const itemsPayload = selectedOpt.items.map((i) => ({
        meal_id: i.meal.id,
        quantity: i.quantity,
      }));

      const peoplePayload = people.map((p, idx) => ({
        name: p.name || `فرد ${idx + 1}`,
        age: p.age,
        gender: p.gender,
        height_cm: p.heightCm,
        weight_kg: p.weightKg,
        activity_level: p.activityLevel,
        share_percent: currentShares[idx]?.sharePercent ?? Math.round(100 / people.length),
        share_kcal: currentShares[idx]?.shareKcal ?? 0,
        share_details: currentShares[idx]?.allocatedItems ?? [],
      }));

      const { data: orderId, error: rpcError } = await supabase.rpc('create_order', {
        p_payload: {
          budget,
          group_id: savedGroupId || undefined,
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
      setSelectedShares(currentShares);
      router.push(`/receipt/${orderId}`);
    } catch (err: unknown) {
      const fallbackOrderId = `ord-${Date.now()}`;
      setSelectedRecommendation(selectedOpt);
      setSelectedShares(currentShares);
      router.push(`/receipt/${fallbackOrderId}`);
    } finally {
      setOrdering(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F4EE] text-[#1E1210] flex flex-col">
      <KioskHeader />

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-8 space-y-6">
        {/* شريط المراحل */}
        <div className="flex items-center justify-between text-xs sm:text-sm font-bold border-b-2 border-[#E7D7C7] pb-4">
          <div className="flex items-center gap-2 text-stone-500">
            <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs border border-emerald-300">
              <Check className="w-4 h-4 stroke-[2.5]" />
            </span>
            <span className="font-extrabold">بيانات الأفراد</span>
          </div>
          <div className="h-1 flex-1 mx-4 rounded-full bg-emerald-200" />
          <div className="flex items-center gap-2 text-stone-500">
            <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs border border-emerald-300">
              <Check className="w-4 h-4 stroke-[2.5]" />
            </span>
            <span className="font-extrabold">الميزانية والوقت</span>
          </div>
          <div className="h-1 flex-1 mx-4 rounded-full bg-stone-300" />
          <div className="flex items-center gap-2 text-[#6B0F1A]">
            <span className="w-7 h-7 rounded-full bg-[#6B0F1A] text-white flex items-center justify-center font-black text-xs border border-[#3E080F] shadow-xs">
              3
            </span>
            <span className="font-black">ترشيح الوجبات</span>
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center space-y-4">
            <div className="w-14 h-14 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-stone-600 font-black text-lg">جاري حساب أفضل التوليفات الطازجة من منيو فتح الله...</p>
          </div>
        ) : engineResult?.status === 'low_budget' ? (
          /* حالة الميزانية القليلة */
          <div className="p-8 rounded-3xl bg-white border-2 border-amber-300 shadow-sm space-y-6 text-right">
            <div className="flex items-start gap-4">
              <div className="p-3.5 rounded-2xl bg-amber-100 text-amber-700">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-stone-900">توضيح بخصوص الميزانية</h3>
                <p className="text-sm text-stone-600 mt-2 leading-relaxed font-medium">
                  {engineResult.apologyMessageAr}
                </p>
              </div>
            </div>

            {engineResult.suggestedSides.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-stone-100">
                <h4 className="font-bold text-base text-orange-600">
                  اقتراحات إضافات وسناكس تكفي ميزانيتك الحالية ({formatEgp(engineResult.budget)}):
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {engineResult.suggestedSides.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-orange-50/50 border border-orange-100 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-stone-900">{item.meal.name_ar}</div>
                        <div className="text-xs text-stone-500">
                          {formatKcal(item.meal.total_kcal)}
                        </div>
                      </div>
                      <div className="text-red-600 font-black">
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
                <h2 className="text-2xl sm:text-3xl font-black text-stone-900 flex items-center gap-2">
                  <UtensilsCrossed className="w-6 h-6 text-red-600 stroke-[2.25]" />
                  <span>أفضل توليفات الوجبات المقترحة لكم</span>
                </h2>
                <p className="text-xs sm:text-sm text-stone-600 mt-1 font-medium">
                  مضبوطة بدقة لتناسب ميزانيتكم ({formatEgp(budget)}) وتشبعكم تماماً ({formatKcal(targetKcal)})
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full bg-[#FAF0F0] text-[#6B0F1A] border-2 border-[#6B0F1A]/20 font-black shadow-xs">
                  {mealTime === 'breakfast'
                    ? '🍳 مقترحات فطور مصري طازج'
                    : mealTime === 'lunch'
                    ? '🍗 مقترحات غداء رئيسية ومشبعة'
                    : mealTime === 'dinner'
                    ? '🌙 مقترحات عشاء شهية'
                    : '☕ سناك وتصبيرة خفيفة'}
                </span>

                <div className="flex items-center gap-2 bg-[#FEF9EE] px-4 py-1.5 rounded-full border-2 border-[#D97706]/30 text-xs shadow-xs">
                  <Sparkles className="w-4 h-4 text-[#D97706]" />
                  <span className="font-black text-[#854D0E]">
                    {engineResult?.status === 'success' ? engineResult.recommendations.length : 0} توليفات مشبعة
                  </span>
                </div>
              </div>
            </div>

            {/* قائمة كروت الترشيحات */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {engineResult?.status === 'success' &&
                engineResult.recommendations.map((rec) => {
                  const isSelected = selectedOpt?.id === rec.id;
                  return (
                    <div
                      key={rec.id}
                      onClick={() => handleSelectMeal(rec)}
                      className={`relative p-6 rounded-[28px] border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 shadow-sm ${
                        isSelected
                          ? 'bg-[#FAF0F0] border-3 border-[#6B0F1A] shadow-xl shadow-[#6B0F1A]/15 scale-[1.02]'
                          : 'bg-white border-2 border-[#E7D7C7] hover:border-[#6B0F1A] hover:shadow-lg'
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
                          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-[#6B0F1A] border-[#3E080F] text-white shadow-xs'
                              : 'border-stone-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                        </div>
                      </div>

                      {/* تفاصيل الوجبات في هذا الاقتراح */}
                      <div className="space-y-3">
                        {rec.items.map((item, iIdx) => (
                          <div key={iIdx} className="flex items-center gap-3.5">
                            <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-stone-100 border-2 border-[#6B0F1A]/20 flex-shrink-0 shadow-sm">
                              <Image
                                src={getMealImageUrl(item.meal.name_ar, item.meal.image_url)}
                                alt={item.meal.name_ar}
                                fill
                                unoptimized
                                className="object-cover"
                              />
                            </div>
                            <div className="flex-1">
                              <div className="font-black text-[#1E1210] text-base leading-snug">
                                {item.quantity} × {item.meal.name_ar}
                              </div>
                              <div className="text-xs text-stone-600 flex items-center gap-2 mt-1 font-bold">
                                <span className="text-[#6B0F1A] bg-[#FAF0F0] px-2 py-0.5 rounded-lg border border-[#6B0F1A]/20 font-black">{formatKcal(item.meal.total_kcal * item.quantity)}</span>
                                <span>•</span>
                                <span className="text-[#854D0E] bg-[#FEF9EE] px-2 py-0.5 rounded-lg border border-[#D97706]/30 font-black">{formatEgp((item.meal.discount_price ?? item.meal.price) * item.quantity)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* شريط الإجمالي للكارت */}
                      <div className="pt-3 border-t-2 border-stone-200/80 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-stone-500 font-bold">إجمالي السعرات: </span>
                          <span className="font-black text-emerald-800 text-sm">
                            {formatKcal(rec.totalKcal)}
                          </span>
                        </div>
                        <div>
                          <span className="text-stone-500 font-bold">السعر الكلي: </span>
                          <span className="text-xl font-black text-[#6B0F1A]">
                            {formatEgp(rec.totalPrice)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* تفاصيل نصيب الأفراد للوجبة المحددة حالياً */}
            {people.length > 0 && currentShares.length > 0 && (
              <div className="p-6 rounded-[28px] bg-white border-2 border-[#E7D7C7] shadow-sm space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 font-black text-base text-[#1E1210]">
                    <Users className="w-5 h-5 text-[#6B0F1A]" />
                    <span>
                      نصيب كل فرد من وجبة{' '}
                      <span className="text-[#6B0F1A]">({selectedOpt?.items.map((i) => `${i.quantity}x ${i.meal.name_ar}`).join(' + ')})</span>:
                    </span>
                  </div>
                  <Badge variant="default">حساب تلقائي حسب السعرات</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {currentShares.map((sh, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-4 rounded-2xl bg-[#FAF0F0] border border-[#6B0F1A]/20 text-xs space-y-1.5"
                    >
                      <div className="flex justify-between font-black text-[#1E1210]">
                        <span>{sh.personName}</span>
                        <span className="text-[#6B0F1A] font-extrabold">{sh.sharePercent}%</span>
                      </div>
                      <div className="text-emerald-800 font-black">
                        {formatKcal(sh.shareKcal)}
                      </div>
                      <div className="text-stone-600 text-[11px] space-y-0.5 pt-1 border-t border-[#6B0F1A]/10 font-semibold">
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
            <div className="flex items-center justify-between pt-4 border-t-2 border-[#E7D7C7]">
              <Button
                variant="outline"
                onClick={() => router.push('/plan/budget')}
                className="font-bold text-stone-800"
              >
                <ArrowRight className="w-5 h-5 ml-1.5" />
                <span>تغيير الميزانية</span>
              </Button>

              <Button
                size="xl"
                variant="primary"
                onClick={handleConfirmOrder}
                disabled={!selectedOpt || ordering}
                className="gap-2.5 px-10 font-black text-lg"
              >
                <Printer className="w-6 h-6 stroke-[2.25]" />
                <span>{ordering ? 'جاري طباعة البون...' : 'تأكيد الوجبة وطباعة البون'}</span>
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
