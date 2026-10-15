'use client';

import { useRouter } from 'next/navigation';
import { Wallet, Clock, ArrowLeft, ArrowRight, Flame, Users, CheckCircle, Utensils } from 'lucide-react';
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
    { id: 'breakfast', label: 'إفطار 🍳', timeHint: 'وجبة الصباح (25%)', percent: '25%' },
    { id: 'lunch', label: 'غداء 🍗', timeHint: 'الوجبة الرئيسية (40%)', percent: '40%' },
    { id: 'dinner', label: 'عشاء 🥪', timeHint: 'وجبة المساء (30%)', percent: '30%' },
    { id: 'snack', label: 'سناك خفيف 🥗', timeHint: 'تصبيرة سريعة (15%)', percent: '15%' },
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-stone-900 flex flex-col">
      <KioskHeader />

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-8 space-y-6">
        {/* شريط المراحل */}
        <div className="flex items-center justify-between text-xs sm:text-sm font-bold border-b border-orange-200/80 pb-4">
          <div className="flex items-center gap-2 text-stone-500">
            <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs">
              ✓
            </span>
            <span>بيانات الأفراد</span>
          </div>
          <div className="h-1 flex-1 mx-4 rounded-full bg-emerald-200" />
          <div className="flex items-center gap-2 text-red-600">
            <span className="w-7 h-7 rounded-full bg-gradient-to-r from-red-600 to-orange-500 text-white flex items-center justify-center font-black text-xs shadow-sm">
              2
            </span>
            <span>الميزانية ونوع الوجبة</span>
          </div>
          <div className="h-1 flex-1 mx-4 rounded-full bg-orange-100" />
          <div className="flex items-center gap-2 text-stone-400">
            <span className="w-7 h-7 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center font-bold text-xs">
              3
            </span>
            <span>ترشيح الوجبات</span>
          </div>
        </div>

        {/* ملخص السعرات والهدف في كارت أبيض دافئ */}
        <div className="p-6 rounded-3xl bg-white border border-orange-100 shadow-sm flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3.5 rounded-2xl bg-orange-100 text-orange-600">
              <Flame className="w-7 h-7 text-red-600" />
            </div>
            <div>
              <div className="text-xs text-stone-500 font-bold">
                احتياج المجموعة الإجمالي ({people.length} أفراد)
              </div>
              <div className="text-2xl font-black text-stone-900">{formatKcal(totalGroupTdee)}</div>
            </div>
          </div>

          <div className="bg-orange-50 px-5 py-3 rounded-2xl border border-orange-200 text-right">
            <div className="text-xs text-orange-700 font-bold">السعرات المستهدفة لهذه الوجبة:</div>
            <div className="text-2xl font-black text-emerald-700">
              {formatKcal(targetMealKcal)}
            </div>
          </div>
        </div>

        {/* 1. اختيار نوع الوجبة وتوقيتها */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-orange-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-sm shadow-orange-500/20">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-stone-900">نوع الوجبة وتوقيتها</h3>
              <p className="text-xs text-stone-500 font-medium">
                نحدد نسبة السعرات المناسبة لضمان شبع المجموعة بدون أي هدر
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            {mealTimeOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setMealTime(opt.id)}
                className={`p-5 rounded-2xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                  mealTime === opt.id
                    ? 'bg-orange-50 border-orange-500 text-orange-950 shadow-md font-black scale-102'
                    : 'bg-stone-50/60 border-stone-200 text-stone-700 hover:border-orange-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-base">{opt.label}</span>
                  {mealTime === opt.id && (
                    <span className="w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center text-xs font-black">
                      ✓
                    </span>
                  )}
                </div>
                <div className="text-xs text-stone-500 font-semibold">{opt.timeHint}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 2. تحديد الميزانية المتاحة */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-orange-100 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-sm shadow-orange-500/20">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-stone-900">ميزانيتك المتاحة (بالجنيه المصري)</h3>
              <p className="text-xs text-stone-500 font-medium">
                سنقترح لك أفضل تشكيلة وجبات تكفيكم وتلتزم بميزانيتك تماماً
              </p>
            </div>
          </div>

          <div className="max-w-md space-y-4">
            <div className="relative">
              <input
                type="number"
                min={20}
                max={10000}
                step={10}
                value={budget || ''}
                onChange={(e) => setBudget(Number(e.target.value))}
                placeholder="مثال: 200"
                className="w-full px-5 py-4 bg-orange-50/50 border-2 border-orange-300 focus:border-red-500 rounded-2xl text-3xl font-black text-center text-red-600 focus:outline-none transition-all shadow-inner"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-stone-400">
                ج.م
              </span>
            </div>

            {/* أزرار سريعة للميزانية بأسعار واقعية للوجبات */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-stone-500 block">⚡ خيارات ميزانية سريعة:</span>
              <div className="flex items-center gap-2 flex-wrap">
                {[100, 150, 200, 300, 500].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setBudget(amount)}
                    className={`flex-1 min-w-[70px] py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      budget === amount
                        ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-md shadow-orange-500/25 scale-105'
                        : 'bg-stone-100 text-stone-700 hover:bg-orange-100/70 border border-stone-200'
                    }`}
                  >
                    {amount} ج.م
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* أزرار التنقل */}
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/plan/people')}
            className="text-stone-600 hover:text-stone-900 font-bold"
          >
            <ArrowRight className="w-5 h-5 ml-1.5" />
            رجوع للأفراد
          </Button>

          <Button
            size="lg"
            onClick={() => router.push('/plan/results')}
            disabled={!budget || budget <= 0}
            className="gap-2 px-8"
          >
            <span>عرض ترشيحات الأكلات</span>
            <ArrowLeft className="w-5 h-5 mr-1" />
          </Button>
        </div>
      </main>
    </div>
  );
}
