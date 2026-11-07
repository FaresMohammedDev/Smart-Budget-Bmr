import { EngineResult, Meal, RecommendationOption, ComboItem, RecommendationBadge } from './types';
import { PersonNutrition, MealTime } from '../../nutrition/domain/types';
import { calculateGroupShares } from './shares';
import { canBeMain, isDipOrSalad, isLightFood, isSoda, mealFitsTime, trayFitsGroup } from './meal-rules';
import { calculateMacroTargets, sumMealMacros } from '../../nutrition/domain/macros';

const roundMoney = (value: number) => Math.round(value * 100) / 100;
const unitPrice = (m: Meal) => m.discount_price ?? m.price;

export interface RecommendParams {
  availableMeals: Meal[];
  targetKcal: number;
  budget: number;
  people?: PersonNutrition[];
  mealTime?: MealTime;
}

interface Candidate {
  items: ComboItem[];
  price: number;
  kcal: number;
  mainKcal: number;
  empty: number; // سعرات المشروبات والحلويات
  sodas: number;
  desserts: number;
  mains: number; // عدد الأصناف الأساسية المختلفة
  units: number; // وحدات أساسية للفرد
  lightMains: number; // عدد وحدات الأكل الخفيف (فول/طعمية) في الأساسي
  addOns: number;
}

/** كمية الصنف اللي بتغطي المجموعة. */
const coverQty = (m: Meal, people: number) =>
  m.portion_type === 'shareable' ? Math.ceil(people / Math.max(1, m.servings || 1)) : people;

/** نطاقات قبول السعرات من الأضيق للأوسع، بنوسّع بس لو مفيش اقتراح منطقي. */
const KCAL_RANGES: [number, number][] = [
  [0.8, 1.2],
  [0.65, 1.35],
  [0.5, 1.6],
];

/**
 * محرك ترشيح الوجبات.
 *
 * بيبني اقتراحات زي ما الناس بتاكل فعلًا:
 *  - لازم وجبة أساسية، والمشروب/الحلو/الجانبي مجرد إضافة (مفيش علبة صودا غدا ولا طبق طحينة عشا).
 *  - الأكل مناسب للوقت (مفيش بشاميل على الفطار) وحجم الصينية مناسب لعدد الأفراد.
 *  - كل فرد ياخد وجبة أساسية (أو اتنين/تلاتة لو الأصناف صغيرة) مش صنف واحد مكرر بكميات غريبة.
 *  - السعرات والماكروز قريبة من احتياج الوجبة، والمشروبات والحلويات متزيدش عن 30% من السعرات.
 */
export function recommendMeals({ availableMeals, targetKcal, budget, people = [], mealTime }: RecommendParams): EngineResult {
  if (!Number.isFinite(budget) || budget <= 0 || !Number.isFinite(targetKcal) || targetKcal <= 0) {
    return { status: 'unavailable', message: 'راجع الميزانية وبيانات الأفراد.' };
  }

  const peopleCount = Math.max(people.length, 1);
  const perPerson = targetKcal / peopleCount;

  const active = availableMeals.filter(
    (m) =>
      m.is_available &&
      Number.isFinite(m.total_kcal) &&
      m.total_kcal >= 0 &&
      Number.isFinite(unitPrice(m)) &&
      unitPrice(m) > 0 &&
      mealFitsTime(m, mealTime)
  );

  // السناك أكل فعلي (ساندوتش/بطاطس/حلو)، مش سلطة ولا طحينة لوحدها
  const isFoodSnack = (m: Meal) => m.kind !== 'drink' && m.total_kcal > 0 && !isDipOrSalad(m);
  const mains = active.filter((m) => {
    if (!trayFitsGroup(m, peopleCount)) return false;
    return mealTime === 'snack' ? isFoodSnack(m) : canBeMain(m, mealTime);
  });
  if (!mains.length) return { status: 'unavailable', message: 'مفيش وجبات لهذا التوقيت. جرّب توقيت تاني أو المنيو.' };

  const baseCost = (m: Meal) => roundMoney(unitPrice(m) * coverQty(m, peopleCount));
  const cheapestMealPrice = Math.min(...mains.map(baseCost));

  // ميزانية قليلة: مش كفاية لأرخص وجبة أساسية للمجموعة
  if (budget < cheapestMealPrice) {
    const sideMeals = active.filter((m) => !mains.includes(m) && (m.kind === 'side' || m.kind === 'dessert' || m.kind === 'drink'));
    const affordable = sideMeals
      .filter((m) => unitPrice(m) <= budget)
      .sort((a, b) => (a.kind === 'drink' ? 1 : 0) - (b.kind === 'drink' ? 1 : 0));
    const suggestedSides: ComboItem[] = [];
    let currentCost = 0;
    let currentKcal = 0;
    for (const side of affordable) {
      const price = unitPrice(side);
      if (roundMoney(currentCost + price) <= budget) {
        suggestedSides.push({ meal: side, quantity: 1 });
        currentCost = roundMoney(currentCost + price);
        currentKcal += side.total_kcal;
      }
    }
    return {
      status: 'low_budget',
      budget,
      cheapestMealPrice,
      missingAmount: Math.round((cheapestMealPrice - budget) * 100) / 100,
      apologyMessageAr: `الميزانية (${budget} ج.م) أقل من أرخص وجبة (${cheapestMealPrice} ج.م). ينقصك ${Math.round(cheapestMealPrice - budget)} ج.م.`,
      suggestedSides,
      sidesTotalPrice: currentCost,
      sidesTotalKcal: currentKcal,
    };
  }

  // ---- الإضافات: جانبي / مشروب / حلو ----
  const extras = active.filter((m) => !mains.includes(m) || m.kind === 'side');
  const sides = extras.filter((m) => m.kind === 'side' && m.portion_type === 'individual' && !mains.includes(m)).slice(0, 5);
  const drinks = extras.filter((m) => m.kind === 'drink' && m.portion_type === 'individual');
  const desserts = mealTime === 'breakfast' ? [] : extras.filter((m) => m.kind === 'dessert' && m.portion_type === 'individual');

  const half = Math.max(1, Math.ceil(peopleCount / 2));
  const sideOptions: (ComboItem | null)[] = [null];
  for (const s of sides) {
    sideOptions.push({ meal: s, quantity: peopleCount });
    if (peopleCount > 1) sideOptions.push({ meal: s, quantity: half });
  }
  const drinkOptions: (ComboItem | null)[] = [null, ...drinks.map((d) => ({ meal: d, quantity: peopleCount }))];
  const dessertOptions: (ComboItem | null)[] = [null, ...desserts.map((d) => ({ meal: d, quantity: half }))];

  // ---- القواعد الأساسية: كل فرد وجبة أساسية، أو 2-3 لو الأصناف صغيرة ----
  const bases: ComboItem[][] = [];
  const individualMains = mains.filter((m) => m.portion_type === 'individual');
  const trays = mains.filter((m) => m.portion_type === 'shareable');

  const unitsFor = (avgKcal: number) => {
    const out = [1];
    for (const u of [2, 3]) if (avgKcal * u <= perPerson * 1.3) out.push(u);
    return out;
  };

  for (const m of individualMains) {
    for (const u of unitsFor(m.total_kcal)) bases.push([{ meal: m, quantity: peopleCount * u }]);
  }
  if (peopleCount >= 2) {
    for (let i = 0; i < individualMains.length; i++) {
      for (let j = i + 1; j < individualMains.length; j++) {
        const a = individualMains[i];
        const b = individualMains[j];
        for (const u of unitsFor((a.total_kcal + b.total_kcal) / 2)) {
          const total = peopleCount * u;
          const splits = new Set([Math.round(total / 2), Math.round(total * 0.67), Math.round(total * 0.34)]);
          for (const qa of splits) {
            if (qa < 1 || qa >= total) continue;
            bases.push([{ meal: a, quantity: qa }, { meal: b, quantity: total - qa }]);
          }
        }
      }
    }
  }
  for (const t of trays) bases.push([{ meal: t, quantity: coverQty(t, peopleCount) }]);

  const candidates: Candidate[] = [];
  for (const base of bases) {
    const basePrice = base.reduce((sum, i) => sum + unitPrice(i.meal) * i.quantity, 0);
    if (roundMoney(basePrice) > budget) continue;
    const baseKcal = base.reduce((sum, i) => sum + i.meal.total_kcal * i.quantity, 0);
    for (const side of sideOptions) {
      for (const drink of drinkOptions) {
        for (const dessert of dessertOptions) {
          const items = [...base, ...[side, drink, dessert].filter((x): x is ComboItem => x !== null)];
          const price = roundMoney(items.reduce((sum, i) => sum + unitPrice(i.meal) * i.quantity, 0));
          if (price > budget) continue;
          const kcal = items.reduce((sum, i) => sum + i.meal.total_kcal * i.quantity, 0);
          const empty = (drink ? drink.meal.total_kcal * drink.quantity : 0) + (dessert ? dessert.meal.total_kcal * dessert.quantity : 0);
          candidates.push({
            items,
            price,
            kcal,
            mainKcal: baseKcal,
            empty,
            sodas: drink && isSoda(drink.meal) ? 1 : 0,
            desserts: dessert ? 1 : 0,
            mains: base.length,
            units: base.filter((b) => b.meal.portion_type === 'individual').reduce((sum, b) => sum + b.quantity, 0) / peopleCount,
            lightMains: base.filter((b) => isLightFood(b.meal)).length,
            addOns: items.length - base.length,
          });
        }
      }
    }
  }

  // نطاقات السعرات: نبدأ بالأضيق ونوسّع بس لو مفيش اختيار
  let pool: Candidate[] = [];
  for (const [lo, hi] of KCAL_RANGES) {
    pool = candidates.filter((c) => {
      const r = c.kcal / targetKcal;
      if (r < lo || r > hi) return false;
      if (c.kcal > 0 && c.empty / c.kcal > 0.3) return false; // مشروب/حلو مايبقاش أكتر من 30% من الوجبة
      if (c.mainKcal / c.kcal < 0.55) return false; // الأساسي هو اللي بيشبّع
      return true;
    });
    if (pool.length) break;
  }

  const macroTarget = calculateMacroTargets(targetKcal);
  const rel = (v: number, t: number) => (t > 0 ? Math.abs(v - t) / t : 0);

  const scored = pool.map((c) => {
    const kcalDiff = c.kcal - targetKcal;
    const diff = Math.abs(kcalDiff) / targetKcal;
    const kcalPenalty = kcalDiff > 0 ? diff * 1.4 : diff;
    const macros = sumMealMacros(c.items);
    const macroPenalty = (rel(macros.carbsG, macroTarget.carbsG) + rel(macros.proteinG, macroTarget.proteinG) + rel(macros.fatG, macroTarget.fatG)) / 3;
    const budgetPenalty = (c.price / budget) * 0.12;
    const offer = c.items.some((i) => i.meal.is_expiring_soon);
    const score =
      kcalPenalty +
      macroPenalty * 0.3 +
      budgetPenalty +
      c.sodas * 0.12 +
      c.desserts * 0.04 +
      c.addOns * 0.015 +
      Math.max(0, c.units - 1) * (mealTime === 'breakfast' ? 0.03 : 0.06) +
      (mealTime === 'lunch' ? c.lightMains * 0.08 : 0) -
      (c.mains > 1 ? 0.05 : 0) -
      (offer ? 0.05 : 0);
    return { c, score, kcalDiff, offer };
  });
  scored.sort((a, b) => a.score - b.score);

  // نختار 3 اقتراحات مختلفة فعلًا (أصناف أساسية مختلفة) مش نفس الوجبة بإضافات مختلفة
  const picked: typeof scored = [];
  const mainSignatures = new Set<string>();
  for (const s of scored) {
    const sig = s.c.items
      .slice(0, s.c.mains)
      .map((i) => i.meal.id)
      .sort()
      .join('|');
    if (mainSignatures.has(sig)) continue;
    mainSignatures.add(sig);
    picked.push(s);
    if (picked.length >= 3) break;
  }
  if (!picked.length) return { status: 'unavailable', message: 'مفيش اقتراح مناسب. غيّر الميزانية أو افتح المنيو.' };

  const cheapest = picked.reduce((min, s) => (s.c.price < min.c.price ? s : min), picked[0]);
  const recommendations: RecommendationOption[] = picked.map((s, idx) => {
    let badge: RecommendationBadge = 'best_fit';
    let title_ar = 'الأنسب';
    if (idx > 0 && s === cheapest) {
      badge = 'saving';
      title_ar = 'الأوفر';
    } else if (s.offer) {
      badge = 'special_offer';
      title_ar = 'عرض';
    } else if (idx > 0) {
      badge = 'filling';
      title_ar = 'بديل';
    }
    return {
      id: `rec-${idx}-${s.c.items[0]?.meal.id}`,
      title_ar,
      badge,
      items: s.c.items,
      totalPrice: Math.round(s.c.price * 100) / 100,
      totalKcal: Math.round(s.c.kcal * 100) / 100,
      kcalDifference: Math.round(s.kcalDiff),
      score: s.score,
      isExpiringSoonOffer: s.offer,
    };
  });

  const top = recommendations[0];
  const sharesByPerson = people.length > 0 ? calculateGroupShares(people, top.items) : undefined;

  return { status: 'success', targetKcal, budget, recommendations, sharesByPerson };
}
