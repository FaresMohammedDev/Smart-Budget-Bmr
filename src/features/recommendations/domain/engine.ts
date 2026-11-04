import {
  EngineResult,
  Meal,
  RecommendationOption,
  ComboItem,
  RecommendationBadge,
} from './types';
import { PersonNutrition, MealTime } from '../../nutrition/domain/types';
import { calculateGroupShares } from './shares';
import { isMealAppropriateForTime } from '@/lib/meals-data';

export interface RecommendParams {
  availableMeals: Meal[];
  targetKcal: number;
  budget: number;
  people?: PersonNutrition[];
  mealTime?: MealTime;
}

/**
 * محرك ترشيح الوجبات الذكي لمطعم فتح الله ماركت
 *
 * يراعي:
 * 1. منطقية وقت الوجبة (mealTime): منع التناقضات السخيفة كترشيح مكرونة بشاميل أو صواني عائلية للإفطار!
 * 2. الميزانية كحد أقصى حاسم.
 * 3. السعرات المستهدفة لمنع الهدر والوصول لأقرب قيمة إشباع.
 * 4. دعم الأعداد الكبيرة (أكثر من 6 أفراد: عائلات، مجموعات عمل، عزائم).
 * 5. تقديم وجبات أوشكت على انتهاء الصلاحية (is_expiring_soon) كعروض توفير خاصة فقط إذا كانت مناسبة لوقت الوجبة.
 * 6. معالجة حالات الميزانية المنخفضة (Edge Case) بسلاسة.
 */
export function recommendMeals({
  availableMeals,
  targetKcal,
  budget,
  people = [],
  mealTime,
}: RecommendParams): EngineResult {
  // تصفية الوجبات المتاحة مع مراعاة ملاءمتها لوقت الوجبة منطقياً
  let activeMeals = availableMeals.filter(
    (m) => m.is_available && m.total_kcal > 0 && isMealAppropriateForTime(m, mealTime)
  );

  // إذا لم تتوفر وجبات للتوقيت المحدد، نرجع للقائمة العامة المتاحة كأمان
  if (activeMeals.length === 0) {
    activeMeals = availableMeals.filter((m) => m.is_available && m.total_kcal > 0);
  }

  // إيجاد أرخص وجبة رئيسية لمعرفة ما إذا كانت الميزانية تكفي
  const mainMeals = activeMeals.filter((m) => m.kind === 'main');
  const cheapestMealPrice = Math.min(
    ...activeMeals.map((m) => m.discount_price ?? m.price)
  );

  // حالة الميزانية القليلة جداً (Edge Case)
  if (budget < cheapestMealPrice) {
    const sideMeals = activeMeals.filter(
      (m) => m.kind === 'side' || m.kind === 'drink' || m.kind === 'dessert'
    );
    const affordableSides = sideMeals.filter(
      (m) => (m.discount_price ?? m.price) <= budget
    );

    // تجميع تشكيلة سريعة من الأطباق الخفيفة ضمن الميزانية
    const suggestedSides: ComboItem[] = [];
    let currentCost = 0;
    let currentKcal = 0;

    for (const side of affordableSides) {
      const price = side.discount_price ?? side.price;
      if (currentCost + price <= budget) {
        suggestedSides.push({ meal: side, quantity: 1 });
        currentCost += price;
        currentKcal += side.total_kcal;
      }
    }

    return {
      status: 'low_budget',
      budget,
      cheapestMealPrice,
      missingAmount: Math.round((cheapestMealPrice - budget) * 100) / 100,
      apologyMessageAr: `ميزانيتك الحالية (${budget} ج.م) أقل من سعر وجبة متكاملة لوقت ${mealTime === 'breakfast' ? 'الإفطار' : mealTime === 'lunch' ? 'الغداء' : mealTime === 'dinner' ? 'العشاء' : 'السناك'} (${cheapestMealPrice} ج.م). نقترح عليك بعض الإضافات الخفيفة على قد ميزانيتك، أو زيادة الميزانية بمقدار ${Math.round(cheapestMealPrice - budget)} ج.م.`,
      suggestedSides,
      sidesTotalPrice: currentCost,
      sidesTotalKcal: currentKcal,
    };
  }

  const candidateCombos: {
    items: ComboItem[];
    totalPrice: number;
    totalKcal: number;
    isExpiringSoon: boolean;
  }[] = [];

  const peopleCount = Math.max(people.length, 1);

  // 1. توليد خيارات من صنف رئيسي واحد بعدد مناسب يدعم أعداد كبيرة (1 إلى 30 فرد)
  for (const meal of activeMeals) {
    const unitPrice = meal.discount_price ?? meal.price;
    const maxQty = Math.floor(budget / unitPrice);

    // إذا كانت وجبة فردية، نحاول تقدير كمية تغطي عدد الأفراد
    let minQty = 1;
    if (meal.portion_type === 'individual') {
      minQty = Math.min(peopleCount, maxQty);
    } else {
      // صواني تشاركية: صينية واحدة أو أكثر حسب عدد الأفراد وسعة الصينية
      const neededTrays = Math.ceil(peopleCount / (meal.servings || 4));
      minQty = Math.min(neededTrays, maxQty);
    }

    // سقف الكميات يدعم المجموعات الكبيرة حتى 40 وحدة
    const upperLimit = Math.min(maxQty, Math.max(peopleCount * 2, 25));

    for (let q = Math.max(1, minQty); q <= upperLimit; q++) {
      const totalPrice = unitPrice * q;
      if (totalPrice <= budget) {
        candidateCombos.push({
          items: [{ meal, quantity: q }],
          totalPrice,
          totalKcal: meal.total_kcal * q,
          isExpiringSoon: meal.is_expiring_soon,
        });
      }
    }
  }

  // 2. توليد توليفات ثنائية (وجبة رئيسية + صنف جانبي / مشروب)
  const sides = activeMeals.filter((m) => m.kind === 'side' || m.kind === 'drink' || m.kind === 'dessert');
  for (const main of mainMeals) {
    const mainPrice = main.discount_price ?? main.price;
    if (mainPrice > budget) continue;

    const mainQuantity = main.portion_type === 'individual' ? peopleCount : Math.ceil(peopleCount / (main.servings || 4));
    const mainTotalCost = mainPrice * mainQuantity;
    if (mainTotalCost > budget) continue;

    for (const side of sides) {
      const sidePrice = side.discount_price ?? side.price;
      const sideQuantity = side.portion_type === 'individual' ? peopleCount : 1;
      const combinedPrice = mainTotalCost + sidePrice * sideQuantity;

      if (combinedPrice <= budget) {
        candidateCombos.push({
          items: [
            { meal: main, quantity: mainQuantity },
            { meal: side, quantity: sideQuantity },
          ],
          totalPrice: combinedPrice,
          totalKcal: main.total_kcal * mainQuantity + side.total_kcal * sideQuantity,
          isExpiringSoon: main.is_expiring_soon || side.is_expiring_soon,
        });
      }
    }
  }

  // تقييم كل خيار وحساب الـ Score
  const scoredOptions: RecommendationOption[] = candidateCombos.map((combo, idx) => {
    const kcalDiff = combo.totalKcal - targetKcal;
    const diffPercent = Math.abs(kcalDiff) / (targetKcal || 1);

    // عقوبة الهدر الزائد أكثر من النقص البسيط
    const kcalPenalty = kcalDiff > 0 ? diffPercent * 1.5 : diffPercent * 1.0;

    // مكافأة التوفير في السعر
    const budgetRatio = combo.totalPrice / budget;

    // مكافأة للوجبات التي قاربت انتهاء الصلاحية فقط إذا كانت مناسبة لوقت الوجبة!
    const isExpiringBonusAppropriate =
      combo.isExpiringSoon &&
      (!mealTime || combo.items.every((i) => isMealAppropriateForTime(i.meal, mealTime)));
    const expiringBonus = isExpiringBonusAppropriate ? -2.5 : 0;

    const score = kcalPenalty + budgetRatio * 0.2 + expiringBonus;

    let badge: RecommendationBadge = 'best_fit';
    let title_ar = 'الأنسب لاحتياجك';

    if (isExpiringBonusAppropriate) {
      badge = 'special_offer';
      title_ar = 'عرض فتح الله التوفيري الطازج';
    } else if (combo.totalPrice < budget * 0.7) {
      badge = 'saving';
      title_ar = 'الخيار الأكثر توفيراً';
    } else if (combo.totalKcal >= targetKcal * 0.95) {
      badge = 'filling';
      title_ar = 'وجبة مشبعة ومتكاملة';
    }

    return {
      id: `rec-${idx}-${combo.items[0]?.meal.id}`,
      title_ar,
      badge,
      items: combo.items,
      totalPrice: Math.round(combo.totalPrice * 100) / 100,
      totalKcal: Math.round(combo.totalKcal * 100) / 100,
      kcalDifference: Math.round(kcalDiff),
      score,
      isExpiringSoonOffer: combo.isExpiringSoon,
    };
  });

  // الترتيب: الأقل Score (الأفضل) في البداية
  scoredOptions.sort((a, b) => a.score - b.score);

  // إزالة التكرارات المتطابقة وأخذ أفضل 5 ترشيحات
  const uniqueRecommendations: RecommendationOption[] = [];
  const seenSignatures = new Set<string>();

  for (const opt of scoredOptions) {
    const signature = opt.items
      .map((i) => `${i.meal.id}x${i.quantity}`)
      .sort()
      .join('|');
    if (!seenSignatures.has(signature)) {
      seenSignatures.add(signature);
      uniqueRecommendations.push(opt);
    }
    if (uniqueRecommendations.length >= 6) break;
  }

  // حساب نصيب الأفراد لأفضل ترشيح إذا كانت هناك مجموعة
  const topOption = uniqueRecommendations[0];
  const sharesByPerson =
    people.length > 0 && topOption
      ? calculateGroupShares(people, topOption.items)
      : undefined;

  return {
    status: 'success',
    targetKcal,
    budget,
    recommendations: uniqueRecommendations,
    sharesByPerson,
  };
}
