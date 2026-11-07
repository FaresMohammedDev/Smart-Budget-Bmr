'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowRight, Printer, AlertCircle, Check, Users } from 'lucide-react';
import { KioskHeader } from '@/components/layout/KioskHeader';
import { StepBar } from '@/components/layout/StepBar';
import { Button } from '@/components/ui/Button';
import { useCountUp } from '@/components/people/KcalRing';
import { usePlannerStore } from '@/features/planner/store/planner.store';
import { calculateBmr } from '@/features/nutrition/domain/bmr';
import { calculateTdee } from '@/features/nutrition/domain/tdee';
import { calculateTargetMealKcal } from '@/features/nutrition/domain/meal-fraction';
import { calculateMacroTargets, sumMealMacros } from '@/features/nutrition/domain/macros';
import { formatEgp, formatKcal } from '@/lib/format';
import { getMealImageUrl } from '@/lib/meal-images';
import { EngineResult, RecommendationOption, PersonShareDetail } from '@/features/recommendations/domain/types';
import { PersonNutrition } from '@/features/nutrition/domain/types';
import { recommendMeals } from '@/features/recommendations/domain/engine';
import { calculateGroupShares } from '@/features/recommendations/domain/shares';

import { listMeals, createOrder, errorMessage } from '@/lib/data/repository';

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
  const busy = useRef(false);
  const requestRef = useRef<{key: string; id: string} | null>(null);

  // 1. حساب السعرات التقديرية للأفراد
  const peopleNutrition: PersonNutrition[] = useMemo(() => people.map((p, idx) => {
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
        bmr: 0,
        tdee: 0,
        targetKcal: 0,
        sharePercent: 0,
      };
    }
  }), [people]);

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

  // قراءة الأصناف المتاحة من نفس المصدر المستخدم في الإدارة وإنشاء الطلب.
  useEffect(() => {
    async function fetchAndRecommend() {
      setLoading(true);
      try {
        const mealsPool = await listMeals(true);
        setSelectedOpt(null);
        setCurrentShares([]);
        setErrorMsg('');

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
        setSelectedOpt(null);
        setErrorMsg(errorMessage(err));
      } finally {
        setLoading(false);
      }
    }

    fetchAndRecommend();
  }, [budget, targetKcal, mealTime, peopleNutrition, setSelectedRecommendation, setSelectedShares]);

  // تأكيد الطلب وإنشاء البون
  const handleConfirmOrder = async () => {
    if (!selectedOpt || busy.current) return;
    busy.current = true;
    setOrdering(true);
    setErrorMsg('');
    try {
      const payload = { mode: 'smart_budget' as const, expectedTotal: selectedOpt.totalPrice, budget, mealTime, people, groupId: savedGroupId,
        items: selectedOpt.items.map(i => ({ meal_id: i.meal.id, quantity: i.quantity })) };
      const key = JSON.stringify(payload);
      if (requestRef.current?.key !== key) requestRef.current = { key, id: crypto.randomUUID() };
      const id = await createOrder({ ...payload, requestId: requestRef.current.id });
      router.push(`/receipt/${id}`);
    } catch (error) {
      setErrorMsg(errorMessage(error));
    } finally {
      busy.current = false;
      setOrdering(false);
    }
  };

  const kcalShown = useCountUp(selectedOpt?.totalKcal ?? 0);
  const priceShown = useCountUp(selectedOpt?.totalPrice ?? 0, 450);
  const macros = calculateMacroTargets(targetKcal);
  const comboMacros = selectedOpt ? sumMealMacros(selectedOpt.items) : null;
  const success = engineResult?.status === 'success' ? engineResult : null;

  const kcalPct = selectedOpt && targetKcal > 0 ? selectedOpt.totalKcal / targetKcal : 0;
  const pricePct = selectedOpt && budget > 0 ? selectedOpt.totalPrice / budget : 0;
  const kcalOk = kcalPct >= 0.85 && kcalPct <= 1.15;
  const priceOk = pricePct <= 1;

  const shell =
    'anim-fade-up rounded-[2rem] bg-white/90 backdrop-blur border-2 border-[#E7D7C7] shadow-[0_18px_40px_-22px_rgba(43,24,16,0.35)]';

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#F8F4EE] text-[#1E1210] flex flex-col select-none">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="anim-blob absolute -top-32 -right-24 w-[30rem] h-[30rem] rounded-full bg-[#6B0F1A]/12 blur-3xl" />
        <div className="anim-blob-slow absolute -bottom-40 -left-28 w-[34rem] h-[34rem] rounded-full bg-[#E5A91E]/20 blur-3xl" />
      </div>

      <KioskHeader />

      <main className="relative z-10 flex-1 w-full max-w-[92rem] mx-auto px-5 sm:px-8 py-4 sm:py-5 flex flex-col gap-4">
        <div className="anim-fade-up flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[18rem]">
            <StepBar current={3} />
          </div>
          <div className="flex items-center gap-2 text-sm font-black">
            <span className="px-4 py-1.5 rounded-full bg-white border-2 border-[#6B0F1A]/25 text-[#6B0F1A] tabular-nums">{formatEgp(budget)}</span>
            <span className="px-4 py-1.5 rounded-full bg-white border-2 border-[#D97706]/35 text-[#854D0E] tabular-nums">{formatKcal(targetKcal)}</span>
          </div>
        </div>

        {errorMsg && (
          <p role="alert" className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-center font-bold">
            {errorMsg}
          </p>
        )}

        {loading ? (
          <div className={`${shell} flex-1 flex items-center justify-center min-h-[18rem]`}>
            <div className="relative w-20 h-20">
              <span className="anim-ring absolute inset-0 rounded-full border-4 border-[#6B0F1A]/40" />
              <span className="absolute inset-0 rounded-full border-4 border-[#6B0F1A] border-t-transparent animate-spin" />
            </div>
          </div>
        ) : engineResult?.status === 'low_budget' ? (
          <div className={`${shell} flex-1 p-6 sm:p-8 flex flex-col gap-5`}>
            <div className="flex items-center gap-4">
              <span className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-9 h-9" />
              </span>
              <div>
                <h2 className="text-3xl font-black">الميزانية قليلة</h2>
                <p className="text-lg font-bold text-stone-600 mt-1">{engineResult.apologyMessageAr}</p>
              </div>
            </div>
            {engineResult.suggestedSides.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {engineResult.suggestedSides.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-[#FEF9EE] border-2 border-[#D97706]/30 flex items-center gap-3">
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                      <Image src={getMealImageUrl(item.meal.name_ar, item.meal.image_url)} alt="" fill unoptimized className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black truncate">{item.meal.name_ar}</div>
                      <div className="text-sm text-stone-500 font-bold">{formatKcal(item.meal.total_kcal)}</div>
                    </div>
                    <div className="font-black text-[#6B0F1A] tabular-nums">{formatEgp(item.meal.discount_price ?? item.meal.price)}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex-1" />
            <div className="flex items-center gap-3">
              <Button variant="outline" size="lg" onClick={() => router.push('/plan/budget')} className="font-black">
                <ArrowRight className="w-5 h-5 ml-1.5" />
                <span>تعديل الميزانية</span>
              </Button>
              <Button variant="secondary" size="lg" onClick={() => router.push('/menu')} className="font-black">
                المنيو
              </Button>
            </div>
          </div>
        ) : !success ? (
          <div className={`${shell} flex-1 p-8 flex flex-col items-center justify-center gap-4 text-center`}>
            <AlertCircle className="w-12 h-12 text-amber-600" />
            <p role="status" className="text-2xl font-black">
              {engineResult?.status === 'unavailable' ? engineResult.message : 'تعذر التحميل'}
            </p>
            <Button size="lg" onClick={() => router.push('/plan/budget')} className="font-black">
              تعديل الميزانية
            </Button>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[19rem_1fr] gap-5 min-h-0">
            {/* قائمة الاقتراحات */}
            <section className={`${shell} p-4 flex flex-col gap-3`} style={{ animationDelay: '80ms' }}>
              <h2 className="text-lg font-black text-stone-600 px-1">{success.recommendations.length} اقتراحات</h2>
              <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 py-1 space-y-3 max-h-[26rem] lg:max-h-none">
                {success.recommendations.map((rec, idx) => {
                  const on = selectedOpt?.id === rec.id;
                  const shown = rec.items.slice(0, 4);
                  return (
                    <button
                      key={rec.id}
                      type="button"
                      onClick={() => handleSelectMeal(rec)}
                      className={`anim-fade-up w-full text-right rounded-3xl border-2 p-3.5 flex flex-col gap-2.5 transition-all duration-300 cursor-pointer ${
                        on
                          ? 'bg-gradient-to-b from-[#8B1422] to-[#6B0F1A] text-white border-[#3E080F] shadow-[0_6px_0_0_#3E080F] -translate-y-0.5'
                          : 'bg-white border-[#D6C7B2] shadow-[0_4px_0_0_#C4B29A] hover:border-[#6B0F1A]/60'
                      }`}
                      style={{ animationDelay: `${140 + idx * 70}ms` }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-black px-3 py-1 rounded-full ${on ? 'bg-white/20' : 'bg-[#FAF0F0] text-[#6B0F1A]'} ${rec.isExpiringSoonOffer ? 'ring-2 ring-[#E5A91E]' : ''}`}>
                          {rec.title_ar}
                        </span>
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 ${on ? 'bg-[#E5A91E] border-[#E5A91E] text-[#3E080F]' : 'border-stone-300'}`}>
                          {on && <Check className="w-4 h-4 stroke-[3]" />}
                        </span>
                      </div>
                      <div className="flex items-center">
                        {shown.map((it, i) => (
                          <span
                            key={i}
                            className={`relative w-12 h-12 rounded-full overflow-hidden border-2 ${on ? 'border-[#6B0F1A]' : 'border-white'} bg-stone-200 shadow-sm ${i > 0 ? '-mr-3' : ''}`}
                            style={{ zIndex: 10 - i }}
                          >
                            <Image src={getMealImageUrl(it.meal.name_ar, it.meal.image_url)} alt="" fill unoptimized className="object-cover" />
                          </span>
                        ))}
                        {rec.items.length > shown.length && (
                          <span className="-mr-3 w-12 h-12 rounded-full bg-[#F8F4EE] text-[#6B0F1A] border-2 border-white flex items-center justify-center font-black text-sm">
                            +{rec.items.length - shown.length}
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={`text-2xl font-black tabular-nums ${on ? 'text-white' : 'text-[#6B0F1A]'}`}>{formatEgp(rec.totalPrice)}</span>
                        <span className={`text-sm font-black tabular-nums ${on ? 'text-white/80' : 'text-stone-500'}`}>{formatKcal(rec.totalKcal)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* تفاصيل الاقتراح المختار */}
            {selectedOpt && (
              <section className={`${shell} p-5 flex flex-col gap-4 min-h-0`} style={{ animationDelay: '160ms' }}>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-2xl font-black flex-1">{selectedOpt.title_ar}</h2>
                </div>

                <div className="space-y-2 overflow-y-auto max-h-[16rem] lg:max-h-[15rem] -mx-1 px-1">
                  {selectedOpt.items.map((it, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-3xl bg-[#F8F4EE] border-2 border-[#E7D7C7] p-3">
                      <span className="relative w-[4.5rem] h-[4.5rem] rounded-2xl overflow-hidden bg-stone-200 shrink-0">
                        <Image src={getMealImageUrl(it.meal.name_ar, it.meal.image_url)} alt="" fill unoptimized className="object-cover" />
                      </span>
                      <span className="w-10 h-10 rounded-full bg-[#6B0F1A] text-white flex items-center justify-center font-black shrink-0">×{it.quantity}</span>
                      <span className="flex-1 min-w-0 font-black text-xl leading-snug truncate">{it.meal.name_ar}</span>
                      <span className="text-sm font-black text-stone-500 tabular-nums shrink-0">{formatKcal(it.meal.total_kcal * it.quantity)}</span>
                      <span className="font-black text-[#6B0F1A] tabular-nums shrink-0">{formatEgp((it.meal.discount_price ?? it.meal.price) * it.quantity)}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'السعرات', value: kcalShown.toLocaleString('en-US'), unit: `من ${Math.round(targetKcal).toLocaleString('en-US')}`, pct: kcalPct, ok: kcalOk },
                    { label: 'الإجمالي', value: priceShown.toLocaleString('en-US'), unit: `من ${budget.toLocaleString('en-US')} ج.م`, pct: pricePct, ok: priceOk },
                  ].map((g) => (
                    <div key={g.label} className="rounded-2xl bg-[#FAF0F0]/70 border-2 border-[#6B0F1A]/15 px-4 py-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-black text-stone-600">{g.label}</span>
                        <span className="text-sm font-bold text-stone-500 tabular-nums">{g.unit}</span>
                      </div>
                      <div className="text-3xl font-black text-[#6B0F1A] tabular-nums leading-tight">{g.value}</div>
                      <div className="mt-1.5 h-2.5 rounded-full bg-[#EADBCB] overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-l ${g.ok ? 'from-emerald-400 to-emerald-600' : 'from-[#E5A91E] to-[#D97706]'}`}
                          style={{ width: `${Math.min(100, g.pct * 100)}%`, transition: 'width 0.7s cubic-bezier(0.16,1,0.3,1)' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {comboMacros && (
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { l: 'كارب', v: comboMacros.carbsG, t: macros.carbsG, bar: 'from-amber-300 to-amber-500', tone: 'text-amber-800' },
                      { l: 'بروتين', v: comboMacros.proteinG, t: macros.proteinG, bar: 'from-rose-300 to-rose-500', tone: 'text-rose-800' },
                      { l: 'دهون', v: comboMacros.fatG, t: macros.fatG, bar: 'from-sky-300 to-sky-500', tone: 'text-sky-800' },
                    ].map((m) => (
                      <div key={m.l} className="rounded-2xl bg-white border-2 border-[#E7D7C7] px-3 py-2.5">
                        <div className="flex items-baseline justify-between gap-1">
                          <span className={`text-sm font-black ${m.tone}`}>{m.l}</span>
                          <span className="text-xs font-bold text-stone-500 tabular-nums">{comboMacros.estimated ? '~' : ''}{Math.round(m.v)} / {m.t}جم</span>
                        </div>
                        <div className="mt-1.5 h-2 rounded-full bg-[#EADBCB] overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-l ${m.bar}`}
                            style={{ width: `${Math.min(100, m.t > 0 ? (m.v / m.t) * 100 : 0)}%`, transition: 'width 0.7s cubic-bezier(0.16,1,0.3,1)' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {people.length > 0 && currentShares.length > 0 && (
                  <div className="min-h-0">
                    <div className="flex items-center gap-2 font-black text-stone-600 mb-2 px-1">
                      <Users className="w-5 h-5 text-[#6B0F1A]" />
                      <span>نصيب كل فرد</span>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                      {currentShares.map((sh, i) => (
                        <div key={i} className="shrink-0 w-[12.5rem] rounded-2xl bg-white border-2 border-[#E7D7C7] p-3 space-y-1.5">
                          <div className="flex items-center justify-between gap-2 font-black">
                            <span className="truncate">{sh.personName}</span>
                            <span className="text-[#6B0F1A] tabular-nums">{sh.sharePercent}%</span>
                          </div>
                          <div className="text-sm font-black text-emerald-800 tabular-nums">{formatKcal(sh.shareKcal)}</div>
                          <div className="text-xs font-bold text-stone-500 space-y-0.5 leading-snug">
                            {sh.allocatedItems.map((it, k) => (
                              <div key={k} className="truncate">{it.portionDescription}</div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {success && (
          <div className="sticky bottom-0 z-20 -mx-5 sm:-mx-8 px-5 sm:px-8 py-3 bg-[#F8F4EE]/90 backdrop-blur-sm anim-fade-up flex items-center gap-3" style={{ animationDelay: '300ms' }}>
            <Button variant="outline" size="lg" onClick={() => router.push('/plan/budget')} className="font-black">
              <ArrowRight className="w-5 h-5 ml-1.5" />
              <span>رجوع</span>
            </Button>
            <div className="flex-1" />
            <Button size="xl" variant="primary" onClick={handleConfirmOrder} disabled={!selectedOpt || ordering} className="gap-2.5 px-12 font-black text-lg">
              <Printer className="w-6 h-6 stroke-[2.25]" />
              <span>{ordering ? '...' : 'تأكيد الطلب'}</span>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
