import { describe, it, expect } from 'vitest';
import { calculateBmr } from '../domain/bmr';
import { calculateTdee } from '../domain/tdee';
import { calculateTargetMealKcal, getDefaultMealTime } from '../domain/meal-fraction';
import { calculateMacroTargets, getMealMacros, sumMealMacros } from '../domain/macros';
import { RICH_FATHALLA_MEALS } from '@/lib/meals-data';

describe('BMR Calculation (Mifflin-St Jeor)', () => {
  it('يحسب BMR للرجال بدقة', () => {
    // رجل: 80 كجم، 180 سم، 30 سنة
    // 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    const bmr = calculateBmr('male', 80, 180, 30);
    expect(bmr).toBe(1780);
  });

  it('يحسب BMR للنساء بدقة', () => {
    // أنثى: 60 كجم، 165 سم، 25 سنة
    // 10*60 + 6.25*165 - 5*25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25
    const bmr = calculateBmr('female', 60, 165, 25);
    expect(bmr).toBe(1345.25);
  });

  it('يرمي خطأ عند إدخال قيم سالبة أو صفرية', () => {
    expect(() => calculateBmr('male', 0, 170, 25)).toThrow();
    expect(() => calculateBmr('female', 60, -160, 25)).toThrow();
  });
});

describe('TDEE Calculation', () => {
  it('يحسب TDEE لمختلف مستويات النشاط بدقة', () => {
    const bmr = 1780;
    expect(calculateTdee(bmr, 'sedentary')).toBe(2136); // 1780 * 1.2
    expect(calculateTdee(bmr, 'moderate')).toBe(2759); // 1780 * 1.55 = 2759
    expect(calculateTdee(bmr, 'very_active')).toBe(3382); // 1780 * 1.9 = 3382
  });
});

describe('Meal Fraction & Smart Time', () => {
  it('يحسب سعرات الوجبة المستهدفة بشكل صحيح', () => {
    const dailyTdee = 2500;
    expect(calculateTargetMealKcal(dailyTdee, 'lunch')).toBe(1000); // 40%
    expect(calculateTargetMealKcal(dailyTdee, 'breakfast')).toBe(625); // 25%
    expect(calculateTargetMealKcal(dailyTdee, 'dinner')).toBe(750); // 30%
  });

  it('يحدد الوجبة الافتراضية وفق الوقت', () => {
    expect(getDefaultMealTime(8)).toBe('breakfast');
    expect(getDefaultMealTime(14)).toBe('lunch');
    expect(getDefaultMealTime(21)).toBe('dinner');
  });
});

describe('Macro targets', () => {
  it('يوزع السعرات 50/20/30 ويحوّلها لجرامات', () => {
    // 2000 سعرة: كارب 1000/4=250، بروتين 400/4=100، دهون 600/9≈67
    expect(calculateMacroTargets(2000)).toEqual({ carbsG: 250, proteinG: 100, fatG: 67 });
  });

  it('يرجع أصفار لو السعرات غير صالحة', () => {
    expect(calculateMacroTargets(0)).toEqual({ carbsG: 0, proteinG: 0, fatG: 0 });
    expect(calculateMacroTargets(NaN)).toEqual({ carbsG: 0, proteinG: 0, fatG: 0 });
  });
});

describe('Meal macros', () => {
  it('يستخدم الأرقام المسجلة للوجبة ولا يعتبرها تقديرية', () => {
    expect(getMealMacros({ total_kcal: 500, carbs_g: 50, protein_g: 30, fat_g: 20 })).toEqual({ carbsG: 50, proteinG: 30, fatG: 20, estimated: false });
  });

  it('يقدّر الماكروز من السعرات والنوع لو مش مسجلة', () => {
    const m = getMealMacros({ total_kcal: 600, kind: 'main' });
    expect(m.estimated).toBe(true);
    expect(m.carbsG * 4 + m.proteinG * 4 + m.fatG * 9).toBeGreaterThan(560);
    expect(m.carbsG * 4 + m.proteinG * 4 + m.fatG * 9).toBeLessThan(640);
  });

  it('يجمع ماكروز الكميات', () => {
    const meal = { total_kcal: 400, carbs_g: 40, protein_g: 20, fat_g: 15 };
    expect(sumMealMacros([{ meal, quantity: 2 }])).toEqual({ carbsG: 80, proteinG: 40, fatG: 30, estimated: false });
  });

  it('كل وجبات المنيو لها ماكروز تتماشى مع سعراتها', () => {
    for (const meal of RICH_FATHALLA_MEALS) {
      expect(meal.carbs_g, meal.name_ar).not.toBeNull();
      const m = getMealMacros(meal);
      expect(m.estimated, meal.name_ar).toBe(false);
      const kcal = m.carbsG * 4 + m.proteinG * 4 + m.fatG * 9;
      expect(Math.abs(kcal - meal.total_kcal), meal.name_ar).toBeLessThanOrEqual(Math.max(8, meal.total_kcal * 0.04));
    }
  });
});
