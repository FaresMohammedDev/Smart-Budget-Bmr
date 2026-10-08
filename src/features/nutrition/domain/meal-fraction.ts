import { MealTime } from './types';

/**
 * نسب السعرات المخصصة للوجبة الواحدة من إجمالي الـ TDEE اليومي
 * لمنع إهدار الطعام وضمان تلبية حاجة الوجبة المطلوبة فقط
 */
export const MEAL_FRACTIONS: Record<MealTime, number> = {
  breakfast: 0.25, // إفطار: 25% من سعرات اليوم
  lunch: 0.4, // غداء: 40% من سعرات اليوم
  dinner: 0.3, // عشاء: 30% من سعرات اليوم
  snack: 0.15, // سناك أو تصبيرة: 15% من سعرات اليوم
};

/**
 * تحديد الوجبة الافتراضية الذكية بحسب توقيت الساعة الحالي
 *
 * @param currentHour الساعة الحالية (0 إلى 23)
 * @returns نوع الوجبة الافتراضية
 */
export function getDefaultMealTime(currentHour = new Date().getHours()): MealTime {
  if (currentHour >= 5 && currentHour < 12) {
    return 'breakfast';
  }
  if (currentHour >= 12 && currentHour < 19) {
    return 'lunch';
  }
  return 'dinner';
}

/**
 * حساب السعرات المطلوبة لوجبة معينة
 *
 * @param totalTdee إجمالي سعرات اليوم
 * @param mealTime نوع الوجبة
 * @returns السعرات المستهدفة لهذه الوجبة
 */
export function calculateTargetMealKcal(
  totalTdee: number,
  mealTime: MealTime
): number {
  const fraction = MEAL_FRACTIONS[mealTime];
  return Math.round(totalTdee * fraction * 100) / 100;
}
