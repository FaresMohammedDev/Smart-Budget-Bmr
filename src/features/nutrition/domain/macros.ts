/**
 * توزيع الماكروز المستهدف: 50% كربوهيدرات، 20% بروتين، 30% دهون من السعرات.
 * (كربوهيدرات وبروتين = 4 سعرات للجرام، دهون = 9 سعرات للجرام)
 */
export const MACRO_SPLIT = { carbs: 0.5, protein: 0.2, fat: 0.3 } as const;

export interface MacroTargets {
  carbsG: number;
  proteinG: number;
  fatG: number;
}

export function calculateMacroTargets(kcal: number): MacroTargets {
  const safe = Number.isFinite(kcal) && kcal > 0 ? kcal : 0;
  return {
    carbsG: Math.round((safe * MACRO_SPLIT.carbs) / 4),
    proteinG: Math.round((safe * MACRO_SPLIT.protein) / 4),
    fatG: Math.round((safe * MACRO_SPLIT.fat) / 9),
  };
}

interface MacroSource {
  total_kcal: number;
  kind?: string;
  carbs_g?: number | null;
  protein_g?: number | null;
  fat_g?: number | null;
}

export interface MealMacros extends MacroTargets {
  /** true لو الأرقام تقديرية (مش مسجلة للوجبة). */
  estimated: boolean;
}

// توزيع تقديري (كارب/بروتين/دهون كنسبة من السعرات) لو الوجبة مفيهاش أرقام مسجلة.
const FALLBACK_PROFILE: Record<string, [number, number, number]> = {
  main: [0.4, 0.22, 0.38],
  side: [0.45, 0.08, 0.47],
  dessert: [0.5, 0.07, 0.43],
  drink: [0.9, 0.05, 0.05],
};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

export function getMealMacros(meal: MacroSource): MealMacros {
  if (isNum(meal.carbs_g) && isNum(meal.protein_g) && isNum(meal.fat_g)) {
    return { carbsG: meal.carbs_g, proteinG: meal.protein_g, fatG: meal.fat_g, estimated: false };
  }
  const kcal = Number.isFinite(meal.total_kcal) && meal.total_kcal > 0 ? meal.total_kcal : 0;
  const [c, p, f] = FALLBACK_PROFILE[meal.kind ?? 'main'] ?? FALLBACK_PROFILE.main;
  return {
    carbsG: Math.round((kcal * c) / 4),
    proteinG: Math.round((kcal * p) / 4),
    fatG: Math.round((kcal * f) / 9),
    estimated: true,
  };
}

/** مجموع ماكروز عدة وجبات بكمياتها. */
export function sumMealMacros(items: { meal: MacroSource; quantity: number }[]): MealMacros {
  return items.reduce<MealMacros>(
    (acc, { meal, quantity }) => {
      const m = getMealMacros(meal);
      return {
        carbsG: acc.carbsG + m.carbsG * quantity,
        proteinG: acc.proteinG + m.proteinG * quantity,
        fatG: acc.fatG + m.fatG * quantity,
        estimated: acc.estimated || m.estimated,
      };
    },
    { carbsG: 0, proteinG: 0, fatG: 0, estimated: false }
  );
}
