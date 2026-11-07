'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Flame, Moon, Apple, SunMedium, UtensilsCrossed, Users, Wallet } from 'lucide-react';
import { KioskHeader } from '@/components/layout/KioskHeader';
import { StepBar } from '@/components/layout/StepBar';
import { Button } from '@/components/ui/Button';
import { VirtualKeypad } from '@/components/ui/VirtualKeypad';
import { useCountUp } from '@/components/people/KcalRing';
import { usePlannerStore } from '@/features/planner/store/planner.store';
import { calculateBmr } from '@/features/nutrition/domain/bmr';
import { calculateTdee } from '@/features/nutrition/domain/tdee';
import { calculateTargetMealKcal, MEAL_FRACTIONS } from '@/features/nutrition/domain/meal-fraction';
import { MealTime } from '@/features/nutrition/domain/types';

const MEAL_OPTIONS: { id: MealTime; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'breakfast', label: 'إفطار', icon: SunMedium },
  { id: 'lunch', label: 'غداء', icon: UtensilsCrossed },
  { id: 'dinner', label: 'عشاء', icon: Moon },
  { id: 'snack', label: 'سناك', icon: Apple },
];

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

export default function BudgetStepPage() {
  const router = useRouter();
  const { people, budget, setBudget, mealTime, setMealTime } = usePlannerStore();

  const totalGroupTdee = people.reduce((sum, p) => {
    try {
      return sum + calculateTdee(calculateBmr(p.gender, p.weightKg, p.heightCm, p.age), p.activityLevel);
    } catch {
      return sum;
    }
  }, 0);

  const targetMealKcal = calculateTargetMealKcal(totalGroupTdee, mealTime);
  const targetShown = useCountUp(targetMealKcal);
  const budgetShown = useCountUp(budget || 0, 350);

  const peopleCount = people.length || 1;
  const perPerson = (budget || 0) / peopleCount;
  const level =
    perPerson <= 0
      ? null
      : perPerson < 40
      ? { label: 'خفيفة', tone: 'text-amber-800 bg-amber-50 border-amber-300', bar: 'from-amber-400 to-amber-500' }
      : perPerson < 90
      ? { label: 'كويسة', tone: 'text-[#854D0E] bg-[#FEF9EE] border-[#D97706]/50', bar: 'from-[#E5A91E] to-[#D97706]' }
      : { label: 'ممتازة', tone: 'text-emerald-900 bg-emerald-50 border-emerald-300', bar: 'from-emerald-400 to-emerald-600' };
  const gauge = Math.max(0, Math.min(1, perPerson / 120));

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#F8F4EE] text-[#1E1210] flex flex-col select-none">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="anim-blob absolute -top-32 -right-24 w-[30rem] h-[30rem] rounded-full bg-[#6B0F1A]/12 blur-3xl" />
        <div className="anim-blob-slow absolute -bottom-40 -left-28 w-[34rem] h-[34rem] rounded-full bg-[#E5A91E]/20 blur-3xl" />
      </div>

      <KioskHeader />

      <main className="relative z-10 flex-1 w-full max-w-[92rem] mx-auto px-5 sm:px-8 py-4 sm:py-5 flex flex-col gap-4">
        <div className="anim-fade-up">
          <StepBar current={2} />
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-5">
          {/* الوجبة والهدف */}
          <section
            className="anim-fade-up flex flex-col gap-4 rounded-[2rem] bg-white/90 backdrop-blur border-2 border-[#E7D7C7] shadow-[0_18px_40px_-22px_rgba(43,24,16,0.35)] p-5"
            style={{ animationDelay: '80ms' }}
          >
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#7A1220] to-[#3E080F] text-white p-5 flex items-center justify-between gap-4 shadow-lg">
              <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-[#E5A91E]/25 blur-2xl" aria-hidden="true" />
              <div className="relative flex items-center gap-3 min-w-0">
                <span className="w-14 h-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                  <Users className="w-7 h-7" />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-black text-white/75">الاحتياج اليومي · {peopleCount}</div>
                  <div className="text-3xl font-black tabular-nums leading-tight">{fmt(totalGroupTdee)}</div>
                </div>
              </div>
              <div className="relative text-left shrink-0">
                <div className="flex items-center gap-1.5 text-sm font-black text-[#E5A91E] justify-end">
                  <Flame className="w-4 h-4" />
                  <span>هدف الوجبة</span>
                </div>
                <div className="text-5xl font-black tabular-nums leading-tight">{targetShown.toLocaleString('en-US')}</div>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-2 gap-3 auto-rows-fr min-h-[11rem]">
              {MEAL_OPTIONS.map(({ id, label, icon: Icon }) => {
                const on = mealTime === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMealTime(id)}
                    className={`group relative rounded-3xl border-2 p-3 flex flex-col items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer ${
                      on
                        ? 'bg-gradient-to-b from-[#8B1422] to-[#6B0F1A] text-white border-[#3E080F] shadow-[0_6px_0_0_#3E080F] -translate-y-1'
                        : 'bg-white border-[#D6C7B2] shadow-[0_5px_0_0_#C4B29A] hover:border-[#6B0F1A]/60 hover:-translate-y-0.5'
                    }`}
                  >
                    {on && (
                      <span className="absolute top-3 left-3 w-7 h-7 rounded-full bg-[#E5A91E] text-[#3E080F] flex items-center justify-center">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </span>
                    )}
                    <span
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${
                        on ? 'bg-white/15' : 'bg-[#F8F4EE] text-[#6B0F1A]'
                      }`}
                    >
                      <Icon className="w-8 h-8 stroke-[2]" />
                    </span>
                    <span className="text-2xl font-black">{label}</span>
                    <span className={`text-sm font-black px-3 py-0.5 rounded-full ${on ? 'bg-white/20' : 'bg-[#FAF0F0] text-[#6B0F1A]'}`}>
                      {Math.round(MEAL_FRACTIONS[id] * 100)}%
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* الميزانية */}
          <section
            className="anim-fade-up flex flex-col gap-3 rounded-[2rem] bg-white/90 backdrop-blur border-2 border-[#E7D7C7] shadow-[0_18px_40px_-22px_rgba(43,24,16,0.35)] p-5"
            style={{ animationDelay: '160ms' }}
          >
            <div className="relative rounded-3xl bg-[#FAF0F0] border-2 border-[#6B0F1A]/30 px-5 py-3 overflow-hidden">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-black text-[#6B0F1A]">
                  <Wallet className="w-5 h-5" />
                  الميزانية
                </span>
                {level && (
                  <span className={`px-3 py-1 rounded-full border-2 text-sm font-black ${level.tone}`}>{level.label}</span>
                )}
              </div>
              <div className="flex items-baseline justify-center gap-2 py-1">
                <span className="text-[clamp(2.75rem,4.2vw,4.25rem)] font-black text-[#6B0F1A] tabular-nums leading-none">
                  {budgetShown.toLocaleString('en-US')}
                </span>
                <span className="text-xl font-black text-stone-500">ج.م</span>
              </div>
              <div className="flex items-center gap-3 text-sm font-bold text-stone-600">
                <span className="shrink-0">للفرد {fmt(perPerson)}</span>
                <span className="flex-1 h-2.5 rounded-full bg-[#EADBCB] overflow-hidden">
                  <span
                    className={`block h-full rounded-full bg-gradient-to-l ${level?.bar ?? 'from-stone-300 to-stone-300'}`}
                    style={{ width: `${gauge * 100}%`, transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)' }}
                  />
                </span>
              </div>
            </div>

            <VirtualKeypad value={budget} max={10000} onChange={setBudget} showPresets compact className="w-full max-w-none" />
          </section>
        </div>

        <div className="sticky bottom-0 z-20 -mx-5 sm:-mx-8 px-5 sm:px-8 py-3 bg-[#F8F4EE]/90 backdrop-blur-sm anim-fade-up flex items-center gap-3" style={{ animationDelay: '240ms' }}>
          <Button variant="outline" size="lg" onClick={() => router.push('/plan/people')} className="font-black">
            <ArrowRight className="w-5 h-5 ml-1.5" />
            <span>رجوع</span>
          </Button>
          <div className="flex-1" />
          <Button
            size="xl"
            variant="primary"
            onClick={() => router.push('/plan/results')}
            disabled={!budget || budget <= 0}
            className="gap-2 px-12 font-black text-lg"
          >
            <span>اقترح وجبات</span>
            <ArrowLeft className="w-6 h-6 mr-1" />
          </Button>
        </div>
      </main>
    </div>
  );
}
