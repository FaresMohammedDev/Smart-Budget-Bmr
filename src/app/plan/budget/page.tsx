'use client';

import { useRouter } from 'next/navigation';
import {
  Wallet,
  Clock,
  ArrowLeft,
  ArrowRight,
  Flame,
  SunMedium,
  UtensilsCrossed,
  Moon,
  Apple,
  Zap,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Check,
} from 'lucide-react';
import { KioskHeader } from '@/components/layout/KioskHeader';
import { Button } from '@/components/ui/Button';
import { VirtualKeypad } from '@/components/ui/VirtualKeypad';
import { usePlannerStore } from '@/features/planner/store/planner.store';
import { calculateBmr } from '@/features/nutrition/domain/bmr';
import { calculateTdee } from '@/features/nutrition/domain/tdee';
import { calculateTargetMealKcal } from '@/features/nutrition/domain/meal-fraction';
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

  const mealTimeOptions: {
    id: MealTime;
    label: string;
    timeHint: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'breakfast',
      label: 'إفطار',
      timeHint: 'وجبة الصباح (25%)',
      icon: <SunMedium className="w-5 h-5 text-amber-500 stroke-[2.25]" />,
    },
    {
      id: 'lunch',
      label: 'غداء',
      timeHint: 'الوجبة الرئيسية (40%)',
      icon: <UtensilsCrossed className="w-5 h-5 text-[#6B0F1A] stroke-[2.25]" />,
    },
    {
      id: 'dinner',
      label: 'عشاء',
      timeHint: 'وجبة المساء (30%)',
      icon: <Moon className="w-5 h-5 text-[#D97706] stroke-[2.25]" />,
    },
    {
      id: 'snack',
      label: 'سناك خفيف',
      timeHint: 'تصبيرة سريعة (15%)',
      icon: <Apple className="w-5 h-5 text-emerald-600 stroke-[2.25]" />,
    },
  ];

  // مؤشر الكفاية التنبؤي
  const getBudgetStatus = () => {
    const peopleCount = people.length || 1;
    const perPerson = budget / peopleCount;

    if (budget <= 0) return null;
    if (perPerson < 40) {
      return {
        color: 'text-amber-800 bg-amber-50 border-2 border-amber-300',
        icon: <AlertCircle className="w-4 h-4 text-amber-600 stroke-[2.25]" />,
        text: 'ميزانية خفيفة (تكفي تشكيلة مقبلات وسناكس ومشروبات)',
      };
    }
    if (perPerson < 90) {
      return {
        color: 'text-[#854D0E] bg-[#FEF9EE] border-2 border-[#D97706]/40',
        icon: <CheckCircle2 className="w-4 h-4 text-[#D97706] stroke-[2.25]" />,
        text: 'ميزانية جيدة (تكفي وجبات فردية مشبعة وسريعة)',
      };
    }
    return {
      color: 'text-emerald-900 bg-emerald-50 border-2 border-emerald-300',
      icon: <Sparkles className="w-4 h-4 text-emerald-600 stroke-[2.25]" />,
      text: 'ميزانية ممتازة (تكفي وجبات رئيسية متكاملة ومشبعة مع إضافات)',
    };
  };

  const budgetStatus = getBudgetStatus();

  return (
    <div className="min-h-screen bg-[#F8F4EE] text-[#1E1210] flex flex-col">
      <KioskHeader />

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-8 space-y-6">
        {/* شريط المراحل */}
        <div className="flex items-center justify-between text-xs sm:text-sm font-bold border-b-2 border-[#E7D7C7] pb-4">
          <div className="flex items-center gap-2 text-stone-500">
            <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs border border-emerald-300">
              <Check className="w-4 h-4 stroke-[2.5]" />
            </span>
            <span className="font-extrabold">بيانات الأفراد</span>
          </div>
          <div className="h-1 flex-1 mx-4 rounded-full bg-emerald-200" />
          <div className="flex items-center gap-2 text-[#6B0F1A]">
            <span className="w-7 h-7 rounded-full bg-[#6B0F1A] text-white flex items-center justify-center font-black text-xs border border-[#3E080F] shadow-xs">
              2
            </span>
            <span className="font-black">الميزانية ونوع الوجبة</span>
          </div>
          <div className="h-1 flex-1 mx-4 rounded-full bg-stone-200" />
          <div className="flex items-center gap-2 text-stone-400">
            <span className="w-7 h-7 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center font-bold text-xs">
              3
            </span>
            <span>ترشيح الوجبات</span>
          </div>
        </div>

        {/* ملخص السعرات والهدف في كارت مميز */}
        <div className="p-6 rounded-[28px] bg-white border-2 border-[#E7D7C7] shadow-sm flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3.5 rounded-2xl bg-[#FAF0F0] border border-[#6B0F1A]/20 text-[#6B0F1A]">
              <Flame className="w-7 h-7 stroke-[2.25]" />
            </div>
            <div>
              <div className="text-xs text-stone-500 font-bold">
                احتياج المجموعة الإجمالي ({people.length} أفراد)
              </div>
              <div className="text-2xl font-black text-[#1E1210]">{formatKcal(totalGroupTdee)}</div>
            </div>
          </div>

          <div className="bg-[#FAF0F0] px-5 py-3 rounded-2xl border-2 border-[#6B0F1A]/30 text-right">
            <div className="text-xs text-[#6B0F1A] font-extrabold">السعرات المستهدفة لهذه الوجبة:</div>
            <div className="text-2xl font-black text-[#6B0F1A]">
              {formatKcal(targetMealKcal)}
            </div>
          </div>
        </div>

        {/* 1. اختيار نوع الوجبة وتوقيتها */}
        <div className="p-6 sm:p-8 rounded-[28px] bg-white border-2 border-[#E7D7C7] shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#6B0F1A] text-white shadow-xs">
              <Clock className="w-6 h-6 stroke-[2.25]" />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#1E1210]">نوع الوجبة وتوقيتها</h3>
              <p className="text-xs text-stone-500 font-semibold">
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
                className={`p-5 rounded-2xl border-2 text-right transition-all flex flex-col justify-between cursor-pointer ${
                  mealTime === opt.id
                    ? 'bg-[#FAF0F0] border-[#6B0F1A] text-[#1E1210] shadow-md font-black shadow-[#6B0F1A]/10 scale-102'
                    : 'bg-white border-[#E7D7C7] text-stone-700 hover:border-[#6B0F1A]/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {opt.icon}
                    <span className="font-black text-base">{opt.label}</span>
                  </div>
                  {mealTime === opt.id && (
                    <span className="w-5 h-5 rounded-full bg-[#6B0F1A] text-white flex items-center justify-center text-xs font-black">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </span>
                  )}
                </div>
                <div className="text-xs text-stone-500 font-semibold">{opt.timeHint}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 2. تحديد الميزانية المتاحة مع لوحة الأرقام اللمسية */}
        <div className="p-6 sm:p-8 rounded-[28px] bg-white border-2 border-[#E7D7C7] shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#D97706] text-white shadow-xs">
              <Wallet className="w-6 h-6 stroke-[2.25]" />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#1E1210]">ميزانيتك المتاحة (بالجنيه المصري)</h3>
              <p className="text-xs text-stone-500 font-semibold">
                سنقترح لك أفضل تشكيلة وجبات تكفيكم وتلتزم بميزانيتك تماماً
              </p>
            </div>
          </div>

          {/* شاشة عرض الميزانية */}
          <div className="max-w-md mx-auto text-center space-y-3">
            <div className="p-5 rounded-3xl bg-[#FAF0F0] border-3 border-[#6B0F1A] shadow-inner flex items-center justify-center gap-2">
              <span className="text-4xl sm:text-5xl font-black text-[#6B0F1A] tracking-tight">
                {budget || 0}
              </span>
              <span className="text-base font-black text-stone-600">ج.م</span>
            </div>

            {/* مؤشر الكفاية اللحظي */}
            {budgetStatus && (
              <div
                className={`p-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${budgetStatus.color}`}
              >
                {budgetStatus.icon}
                <span>{budgetStatus.text}</span>
              </div>
            )}
          </div>

          {/* لوحة الأرقام اللمسية المدمجة */}
          <div className="pt-2">
            <VirtualKeypad
              value={budget}
              max={10000}
              onChange={setBudget}
              showPresets={true}
            />
          </div>
        </div>

        {/* أزرار التنقل */}
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => router.push('/plan/people')}
            className="font-bold text-stone-800"
          >
            <ArrowRight className="w-5 h-5 ml-1.5 stroke-[2.25]" />
            <span>رجوع للأفراد</span>
          </Button>

          <Button
            size="lg"
            variant="primary"
            onClick={() => router.push('/plan/results')}
            disabled={!budget || budget <= 0}
            className="gap-2 px-8 font-black text-base"
          >
            <span>عرض ترشيحات الأكلات</span>
            <ArrowLeft className="w-5 h-5 mr-1 stroke-[2.25]" />
          </Button>
        </div>
      </main>
    </div>
  );
}
