import {
  EngineResult,
  Meal,
  RecommendationOption,
  ComboItem,
  RecommendationBadge,
} from './types';
import { PersonNutrition } from '../../nutrition/domain/types';
import { calculateGroupShares } from './shares';

interface RecommendParams {
  availableMeals: Meal[];
  targetKcal: number;
  budget: number;
  people?: PersonNutrition[];
}

/**
 * محرك ترشيح الوجبات الذكي لمطعم فتح الله ماركت
 *
 * يراعي:
 * 1. الميزانية كحد أقصى حاسم.
 * 2. السعرات المستهدفة لمنع الهدر والوصول لأقرب قيمة إشباع.
 * 3. تقديم وجبات أوشكت على انتهاء الصلاحية (is_expiring_soon) كعروض توفير خاصة في القمة.
 * 4. معالجة حالات الميزانية المنخفضة (Edge Case) بسلاسة دون أخطاء.
 */
export function recommendMeals({
  availableMeals,
  targetKcal,
  budget,
  people = [],
}: RecommendParams): EngineResult {
  const activeMeals = availableMeals.filter(
    (m) => m.is_available && m.total_kcal > 0
  );

  // إيجاد أرخص وجبة رئيسية لمعرفة ما إذا كانت الميزانية تكفي
  const mainMeals = activeMeals.filter((m) => m.kind === 'main');
  const cheapestMealPrice = Math.min(
    ...activeMeals.map((m) => m.discount_price ?? m.price)
  );

  // حالة الميزانية القليلة جداً (Edge Case)
  if (budget < cheapestMealPrice) {
    const sideMeals = activeMeals.filter(
      (m) => m.kind === 'side' || m.kind === 'drink'
    );
    const affordableSides = sideMeals.filter(
      (m) => (m.discount_price ?? m.price) <= budget
    );

    // تجميع تشكيلة سريعة من الأطباق الجانبية ضمن الميزانية
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
      apologyMessageAr: `عفواً، ميزانيتك الحالية (${budget} ج.م) أقل من سعر أقل وجبة رئيسية متوفرة (${cheapestMealPrice} ج.م). نقترح عليك بعض الإضافات الخفيفة على قد ميزانيتك، أو زيادة الميزانية بمقدار ${Math.round(cheapestMealPrice - budget)} ج.م.`,
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

  // 1. توليد خيارات من صنف رئيسي واحد بعدد مناسب
  for (const meal of activeMeals) {
    const unitPrice = meal.discount_price ?? meal.price;
    const maxQty = Math.floor(budget / unitPrice);

    // إذا كانت وجبة فردية، نحاول تقدير كمية قريبة من عدد الأفراد
    const minQty = meal.portion_type === 'individual' ? Math.min(peopleCount, maxQty) : 1;

    for (let q = Math.max(1, minQty); q <= Math.min(maxQty, peopleCount * 3, 10); q++) {
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

  // 2. توليد توليفات ثنائية (وجبة رئيسية + صنف جانبي/مشروب)
  const sides = activeMeals.filter((m) => m.kind === 'side' || m.kind === 'drink');
  for (const main of mainMeals) {
    const mainPrice = main.discount_price ?? main.price;
    if (mainPrice > budget) continue;

    for (const side of sides) {
      const sidePrice = side.discount_price ?? side.price;
      const combinedPrice = mainPrice * peopleCount + sidePrice * peopleCount;
      if (combinedPrice <= budget) {
        candidateCombos.push({
          items: [
            { meal: main, quantity: peopleCount },
            { meal: side, quantity: peopleCount },
          ],
          totalPrice: combinedPrice,
          totalKcal: (main.total_kcal + side.total_kcal) * peopleCount,
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

    // مكافأة كبيرة للوجبات التي قاربت انتهاء الصلاحية لتتصدر المقترحات
    const expiringBonus = combo.isExpiringSoon ? -2.5 : 0;

    const score = kcalPenalty + budgetRatio * 0.2 + expiringBonus;

    let badge: RecommendationBadge = 'best_fit';
    let title_ar = 'الأنسب لاحتياجك';

    if (combo.isExpiringSoon) {
      badge = 'special_offer';
      title_ar = 'عرض فتح الله التوفيري الطازج ⭐';
    } else if (combo.totalPrice < budget * 0.7) {
      badge = 'saving';
      title_ar = 'الخيار الأكثر توفيراً 💰';
    } else if (combo.totalKcal >= targetKcal * 0.95) {
      badge = 'filling';
      title_ar = 'وجبة مشبعة ومتكاملة 🍽️';
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
    if (uniqueRecommendations.length >= 5) break;
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
