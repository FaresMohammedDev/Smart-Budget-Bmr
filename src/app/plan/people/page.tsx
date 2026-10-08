'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, User, Flame, ArrowLeft, ArrowRight, Activity } from 'lucide-react';
import { KioskHeader } from '@/components/layout/KioskHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { usePlannerStore } from '@/features/planner/store/planner.store';
import { calculateBmr } from '@/features/nutrition/domain/bmr';
import { calculateTdee } from '@/features/nutrition/domain/tdee';
import { formatKcal } from '@/lib/format';
import { Gender, ActivityLevel } from '@/features/nutrition/domain/types';

export default function PeopleStepPage() {
  const router = useRouter();
  const { peopleCount, setPeopleCount, people, updatePerson } = usePlannerStore();
  const [activeTab, setActiveTab] = useState(0);

  const currentPerson = people[activeTab] || people[0];

  // حساب BMR و TDEE الحي لكل فرد
  let liveBmr = 0;
  let liveTdee = 0;
  if (currentPerson && currentPerson.weightKg > 0 && currentPerson.heightCm > 0 && currentPerson.age > 0) {
    try {
      liveBmr = calculateBmr(
        currentPerson.gender,
        currentPerson.weightKg,
        currentPerson.heightCm,
        currentPerson.age
      );
      liveTdee = calculateTdee(liveBmr, currentPerson.activityLevel);
    } catch {
      //
    }
  }

  const handleNext = () => {
    router.push('/plan/budget');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <KioskHeader />

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-8 space-y-6">
        {/* شريط المراحل */}
        <div className="flex items-center justify-between text-xs sm:text-sm text-zinc-400 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2 text-[#F37A20] font-bold">
            <span className="w-6 h-6 rounded-full bg-[#F37A20] text-black flex items-center justify-center font-black text-xs">
              1
            </span>
            <span>بيانات الأفراد والحرق</span>
          </div>
          <div className="h-0.5 w-12 bg-zinc-800" />
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center text-xs">
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

        {/* اختيار عدد الأفراد */}
        <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-[#F37A20]/15 text-[#F37A20]">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">عدد الأفراد للوجبة</h2>
                <p className="text-xs text-zinc-400">فرد واحد أو عائلة / مجموعة أصدقاء</p>
              </div>
            </div>

            {/* أزرار سريعة للأفراد */}
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    setPeopleCount(num);
                    if (activeTab >= num) setActiveTab(0);
                  }}
                  className={`w-11 h-11 rounded-xl font-extrabold text-base transition-all select-none cursor-pointer ${
                    peopleCount === num
                      ? 'bg-[#F37A20] text-white shadow-lg shadow-[#F37A20]/25 scale-105'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* تبويبات الأفراد لو أكثر من شخص */}
          {peopleCount > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-zinc-800/80 pb-1">
              {people.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveTab(idx)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === idx
                      ? 'bg-zinc-800 text-[#F37A20] border border-[#F37A20]/40'
                      : 'bg-zinc-950 text-zinc-400 hover:text-white border border-transparent'
                  }`}
                >
                  {p.name || `فرد ${idx + 1}`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* نموذج بيانات الفرد المحدد */}
        {currentPerson && (
          <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2 font-bold text-lg text-white">
                <User className="w-5 h-5 text-[#F37A20]" />
                <span>بيانات {currentPerson.name || `الفرد ${activeTab + 1}`}</span>
              </div>

              {/* بطاقة الحرق الحي BMR و TDEE */}
              <div className="flex items-center gap-3 text-xs bg-zinc-950 px-4 py-2 rounded-2xl border border-zinc-800">
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <Flame className="w-4 h-4 text-[#F37A20]" />
                  <span>حرق الراحة (BMR):</span>
                  <span className="font-bold text-[#F37A20]">{liveBmr}</span>
                </div>
                <div className="h-4 w-px bg-zinc-800" />
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>حرق اليوم (TDEE):</span>
                  <span className="font-bold text-emerald-400">{formatKcal(liveTdee)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                label="الاسم (اختياري للتمييز في البون)"
                type="text"
                value={currentPerson.name}
                onChange={(e) => updatePerson(activeTab, { name: e.target.value })}
                placeholder={`فرد ${activeTab + 1}`}
              />

              {/* الجنس */}
              <div className="space-y-1.5 text-right">
                <label className="block text-sm font-semibold text-zinc-300">
                  الجنس
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => updatePerson(activeTab, { gender: 'male' })}
                    className={`py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                      currentPerson.gender === 'male'
                        ? 'bg-[#F37A20] text-white shadow-md'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    ذكر 👨
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePerson(activeTab, { gender: 'female' })}
                    className={`py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                      currentPerson.gender === 'female'
                        ? 'bg-[#F37A20] text-white shadow-md'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    أنثى 👩
                  </button>
                </div>
              </div>

              <Input
                label="العمر (بالسنوات)"
                type="number"
                min={10}
                max={100}
                value={currentPerson.age || ''}
                onChange={(e) => updatePerson(activeTab, { age: Number(e.target.value) })}
                placeholder="30"
              />

              <Input
                label="الطول (بالسنتيمتر)"
                type="number"
                min={100}
                max={230}
                value={currentPerson.heightCm || ''}
                onChange={(e) => updatePerson(activeTab, { heightCm: Number(e.target.value) })}
                placeholder="175"
              />

              <Input
                label="الوزن (بالكيلوجرام)"
                type="number"
                min={30}
                max={250}
                value={currentPerson.weightKg || ''}
                onChange={(e) => updatePerson(activeTab, { weightKg: Number(e.target.value) })}
                placeholder="75"
              />

              {/* مستوى النشاط */}
              <div className="space-y-1.5 text-right">
                <label className="block text-sm font-semibold text-zinc-300">
                  مستوى النشاط البدني
                </label>
                <select
                  value={currentPerson.activityLevel}
                  onChange={(e) =>
                    updatePerson(activeTab, {
                      activityLevel: e.target.value as ActivityLevel,
                    })
                  }
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-[#F37A20] text-sm"
                >
                  <option value="sedentary">خامل / قليل الحركة جداً</option>
                  <option value="light">نشاط خفيف (تمرين 1-3 أيام أسبوعياً)</option>
                  <option value="moderate">نشاط متوسط (تمرين 3-5 أيام أسبوعياً)</option>
                  <option value="active">نشاط عالي (تمرين شاق 6-7 أيام)</option>
                  <option value="very_active">نشاط شاق جداً / عمل يدوي يومي</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* أزرار التنقل */}
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/')}
            className="text-zinc-400 hover:text-white"
          >
            <ArrowRight className="w-5 h-5 ml-1.5" />
            رجوع للرئيسية
          </Button>

          <Button size="lg" onClick={handleNext}>
            <span>التالي: تحديد الميزانية</span>
            <ArrowLeft className="w-5 h-5 mr-1.5" />
          </Button>
        </div>
      </main>
    </div>
  );
}
