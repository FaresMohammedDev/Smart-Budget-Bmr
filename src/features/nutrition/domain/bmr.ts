import { Gender } from './types';

/**
 * حساب معدل الأيض الأساسي (Basal Metabolic Rate - BMR)
 * وفق معادلة Mifflin-St Jeor المعيارية
 *
 * للرجال: (10 × الوزن بالكيلو) + (6.25 × الطول بالسنتيمتر) - (5 × العمر بالسنوات) + 5
 * للنساء: (10 × الوزن بالكيلو) + (6.25 × الطول بالسنتيمتر) - (5 × العمر بالسنوات) - 161
 *
 * @param gender النوع (ذكر أو أنثى)
 * @param weightKg الوزن الإجمالي بالكيلوجرام
 * @param heightCm الطول بالسنتيمتر
 * @param ageYears العمر بالسنوات
 * @returns قيمة السعرات المحروقة أثناء الراحة (Kcal/day)
 */
export function calculateBmr(
  gender: Gender,
  weightKg: number,
  heightCm: number,
  ageYears: number
): number {
  if (weightKg <= 0 || heightCm <= 0 || ageYears <= 0) {
    throw new Error('الوزن والطول والعمر يجب أن تكون قيماً موجبة');
  }

  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  const bmr = gender === 'male' ? base + 5 : base - 161;

  // تقريب الناتج لأقرب رقمين عشريين
  return Math.round(bmr * 100) / 100;
}
