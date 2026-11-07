import type { Meal } from './types';
import type { MealTime } from '../../nutrition/domain/types';

/**
 * قواعد منطقية لما يتاكل فعلًا وقت ما: الإفطار مش بشاميل، والغداء مش علبة صودا لوحدها،
 * والصينية العائلية مش لفرد واحد. لو الوجبة لها meal_times صريحة بنلتزم بيها، غير كده بنستنتج من الاسم والنوع.
 */

const has = (name: string, words: string[]) => words.some((w) => name.includes(w));

// أكلات إفطار/خفيفة بتتاكل صباحًا وبالليل
const LIGHT_FOODS = ['فول', 'طعمية', 'فلافل', 'بيض', 'جبن', 'شكشوكة'];
// إفطار وسناك بس
const BREAKFAST_ONLY = ['فطير', 'مشلتت'];
// وجبات تقيلة: غداء وعشاء بس
const HEAVY = [
  'شاورما', 'كفتة', 'كباب', 'حواوشي', 'برجر', 'فرخة', 'فراخ', 'دجاج', 'مشويات', 'مكرونة', 'بشاميل',
  'طاجن', 'بامية', 'ستريبس', 'أرز', 'رز', 'لحمة', 'ريش', 'كبدة',
];
const SODA = ['غازي', 'كولا', 'شويبس', 'بيبسي', 'صودا', 'سبرايت'];
const WATER = ['مياه', 'ماء'];
const FRIED_SIDES = ['بطاطس', 'سمبوسك', 'سمبوسة'];

export const isSoda = (m: Pick<Meal, 'name_ar'>) => has(m.name_ar, SODA);
export const isWater = (m: Pick<Meal, 'name_ar'>) => has(m.name_ar, WATER);
/** سلطة/ثومية/طحينة: مرافق للأكل مش وجبة ولا سناك لوحده. */
export const isDipOrSalad = (m: Pick<Meal, 'name_ar'>) => has(m.name_ar, ['سلطة', 'ثومية', 'طحينة', 'علبة']);
export const isLightFood = (m: Pick<Meal, 'name_ar'>) => has(m.name_ar, LIGHT_FOODS);
export const isSandwich = (m: Pick<Meal, 'name_ar'>) => m.name_ar.includes('ساندوتش');

/** صنف أساسي بيشبّع لوحده (مش جانبي ولا مشروب ولا حلو). */
export function canBeMain(meal: Meal, time?: MealTime): boolean {
  if (meal.kind === 'main') return true;
  // طبق فول/طعمية بيعتبر وجبة إفطار أو عشا حتى لو متسجل "جانبي"
  if (time && time !== 'lunch' && meal.kind === 'side' && meal.total_kcal >= 300 && has(meal.name_ar, LIGHT_FOODS)) return true;
  return false;
}

/** الصينية التشاركية مش بتتقدّم لفرد واحد: لازم المجموعة تقارب عدد حصصها. */
export function trayFitsGroup(meal: Meal, peopleCount: number): boolean {
  if (meal.portion_type !== 'shareable') return true;
  return peopleCount >= Math.max(2, Math.ceil((meal.servings || 1) * 0.75));
}

/** هل الوجبة منطقية للتوقيت ده؟ */
export function mealFitsTime(meal: Meal, time?: MealTime): boolean {
  if (!time) return true;
  if (meal.meal_times && meal.meal_times.length > 0) return meal.meal_times.includes(time);

  const name = meal.name_ar;
  const shareable = meal.portion_type === 'shareable';

  if (meal.kind === 'drink') {
    return time === 'breakfast' ? !isSoda(meal) : true;
  }
  if (meal.kind === 'dessert') return time !== 'breakfast';

  if (meal.kind === 'side') {
    if (shareable) return time === 'lunch' || time === 'dinner';
    if (has(name, FRIED_SIDES)) return time !== 'breakfast';
    if (has(name, LIGHT_FOODS) && meal.total_kcal >= 300) return time !== 'lunch'; // طبق فول وغيره
    return true; // سلطات وطحينة وثومية
  }

  // رئيسي
  const heavy = has(name, HEAVY);
  const lightFood = has(name, LIGHT_FOODS);
  const breakfastOnly = has(name, BREAKFAST_ONLY);

  switch (time) {
    case 'breakfast':
      return !shareable && !heavy && (lightFood || breakfastOnly);
    case 'lunch':
      // مفيش فول/بيض/فطير على الغداء
      return !breakfastOnly && (heavy || isSandwich(meal) || name.includes('طعمية') || name.includes('فلافل') || !lightFood);
    case 'dinner':
      return !breakfastOnly;
    case 'snack':
      return !shareable && (isSandwich(meal) || lightFood || breakfastOnly);
    default:
      return true;
  }
}
