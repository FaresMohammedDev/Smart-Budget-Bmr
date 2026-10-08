import { ActivityLevel } from './types';

/**
 * معاملات مستوى النشاط البدني المعتمدة عالمياً
 */
export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2, // خامل / قليل الحركة
  light: 1.375, // نشاط خفيف (تمرين 1-3 أيام أسبوعياً)
  moderate: 1.55, // نشاط متوسط (تمرين 3-5 أيام أسبوعياً)
  active: 1.725, // نشاط عالي (تمرين 6-7 أيام أسبوعياً)
  very_active: 1.9, // نشاط شاق جداً / عمل بدني يومي
};

/**
 * حساب إجمالي استهلاك الطاقة اليومي (Total Daily Energy Expenditure - TDEE)
 * يمثل السعرات الفعلية التي يحتاجها الجسم في اليوم بناءً على نشاطه
 *
 * @param bmr معدل الحرق في الراحة
 * @param activityLevel مستوى النشاط
 * @returns إجمالي السعرات اليومية المطلوبة
 */
export function calculateTdee(bmr: number, activityLevel: ActivityLevel): number {
  if (bmr <= 0) {
    throw new Error('قيمة BMR يجب أن تكون أكبر من الصفر');
  }

  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel];
  if (!multiplier) {
    throw new Error(`مستوى النشاط غير صالح: ${activityLevel}`);
  }

  return Math.round(bmr * multiplier * 100) / 100;
}
