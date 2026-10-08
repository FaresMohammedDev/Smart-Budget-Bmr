import { describe, it, expect } from 'vitest';
import { calculateBmr } from '../domain/bmr';
import { calculateTdee } from '../domain/tdee';
import {
  calculateTargetMealKcal,
  getDefaultMealTime,
  MEAL_FRACTIONS,
} from '../domain/meal-fraction';

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
