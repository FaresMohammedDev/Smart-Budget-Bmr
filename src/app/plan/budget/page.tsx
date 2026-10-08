'use client';

import { useRouter } from 'next/navigation';
import { Wallet, Clock, ArrowLeft, ArrowRight, Flame, Users, CheckCircle } from 'lucide-react';
import { KioskHeader } from '@/components/layout/KioskHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { usePlannerStore } from '@/features/planner/store/planner.store';
import { calculateBmr } from '@/features/nutrition/domain/bmr';
import { calculateTdee } from '@/features/nutrition/domain/tdee';
import { calculateTargetMealKcal, MEAL_FRACTIONS } from '@/features/nutrition/domain/meal-fraction';
import { formatEgp, formatKcal } from '@/lib/format';
import { MealTime } from '@/features/nutrition/domain/types';

export default function BudgetStepPage() {
  const router = useRouter();
  const { people, budget, setBudget, mealTime, setMealTime } = usePlannerStore();

  // حساب مجموع الـ TDEE لكل أفراد المجموعة
  const totalGroupTdee = people.reduce((sum, p) => {
    try {
      const bmr = calculateBmr(p.gender, p.weightKg, p.heightCm, p.age);
      return sum + calculateTdee(bmr, p.activityLevel);
    } catch {
      return sum + 2000;
    }
  }, 0);

  // السعرات المستهدفة لهذه الوجبة
  const targetMealKcal = calculateTargetMealKcal(totalGroupTdee, mealTime);

  const mealTimeOptions: { id: MealTime; label: string; timeHint: string; percent: string }[] = [
    { id: 'breakfast', label: 'إفطار 🍳', timeHint: 'صباحاً (25% من اليوم)', percent: '25%' },
    { id: 'lunch', label: 'غداء 🍗', timeHint: 'ظهراً (40% من اليوم)', percent: '40%' },
    { id: 'dinner', label: 'عشاء 🥪', timeHint: 'مساءً (30% من اليوم)', percent: '30%' },
    { id: 'snack', label: 'سناك / خفيف 🥗', timeHint: 'تصبيرة (15% من اليوم)', percent: '15%' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <KioskHeader />

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-8 space-y-6">
        {/* شريط المراحل */}
        <div className="flex items-center justify-between text-xs sm:text-sm text-zinc-400 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center text-xs">
              ✓
            </span>
            <span>بيانات الأفراد والحرق</span>
          </div>
          <div className="h-0.5 w-12 bg-zinc-800" />
          <div className="flex items-center gap-2 text-[#F37A20] font-bold">
            <span className="w-6 h-6 rounded-full bg-[#F37A20] text-black flex items-center justify-center font-black text-xs">
              2
            </span>
            <span>الميزانية ونوع الوجبة</span>
          </div>
          <div className="h-0.5 w-12 bg-zinc-800" />
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center text-xs">
              3
            </span>
            <span>ترشيح الوجبات</span>
          </div>
        </div>

        {/* ملخص السعرات والهدف */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#F37A20]/15 text-[#F37A20]">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-zinc-400">
                إجمالي احتياج المجموعة لليوم ({people.length} أفراد)
              </div>
              <div className="text-xl font-black text-white">{formatKcal(totalGroupTdee)}</div>
            </div>
          </div>

          <div className="bg-zinc-950 px-5 py-3 rounded-2xl border border-zinc-800 text-right">
            <div className="text-xs text-[#F37A20] font-bold">السعرات المستهدفة للوجبة:</div>
            <div className="text-2xl font-black text-emerald-400">
              {formatKcal(targetMealKcal)}
            </div>
          </div>
        </div>

        {/* 1. اختيار نوع الوجبة */}
        <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#F37A20]/15 text-[#F37A20]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">نوع الوجبة وتوقيتها</h3>
              <p className="text-xs text-zinc-400">
                نحدد نسبة السعرات المناسبة للوجبة لضمان الشبع بدون أي هدر
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {mealTimeOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setMealTime(opt.id)}
                className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                  mealTime === opt.id
                    ? 'bg-[#F37A20]/10 border-[#F37A20] text-white shadow-lg'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-base">{opt.label}</span>
                  {mealTime === opt.id && (
                    <CheckCircle className="w-4 h-4 text-[#F37A20]" />
                  )}
                </div>
                <div className="text-xs text-zinc-400">{opt.timeHint}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 2. تحديد الميزانية الإجمالية */}
        <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#F37A20]/15 text-[#F37A20]">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">الميزانية المتاحة (بالجنيه المصري)</h3>
              <p className="text-xs text-zinc-400">
                سنقترح لك أفضل الوجبات التي تلتزم بحدود ميزانيتك بالكامل
              </p>
            </div>
          </div>

          <div className="max-w-md space-y-3">
            <Input
              type="number"
              min={20}
              max={10000}
              step={10}
              value={budget || ''}
              onChange={(e) => setBudget(Number(e.target.value))}
              placeholder="مثال: 200"
              className="text-2xl font-black text-center text-[#F37A20]"
            />

            {/* أزرار سريعة للميزانية */}
            <div className="flex items-center gap-2">
              {[100, 150, 200, 300, 500].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setBudget(amount)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    budget === amount
                      ? 'bg-[#F37A20] text-white shadow-md'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {amount} ج.م
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* أزرار التنقل */}
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/plan/people')}
            className="text-zinc-400 hover:text-white"
          >
            <ArrowRight className="w-5 h-5 ml-1.5" />
            الرجوع للأفراد
          </Button>

          <Button
            size="lg"
            onClick={() => router.push('/plan/results')}
            disabled={!budget || budget <= 0}
          >
            <span>عرض ترشيحات الوجبات</span>
            <ArrowLeft className="w-5 h-5 mr-1.5" />
          </Button>
        </div>
      </main>
    </div>
  );
}
