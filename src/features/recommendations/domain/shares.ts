import { ComboItem, PersonShareDetail } from './types';
import { PersonNutrition } from '../../nutrition/domain/types';

/**
 * حساب نصيب كل فرد من وجبات المجموعة وفقاً لنسبة احتياجه من السعرات
 *
 * للأصناف الفردية (ساندوتشات، أطباق): نستخدم خوارزمية Largest Remainder Method
 * لضمان توزيع أعداد صحيحة بدون كسور ساندوتش.
 *
 * للأصناف التشاركية (صواني): يتم الحساب كنسبة مئوية وسعرات محسوبة.
 *
 * @param people قائمة أفراد المجموعة مع سعراتهم
 * @param combo الوجبات المحددة في الاقتراح
 * @returns تفاصيل نصيب كل فرد
 */
export function calculateGroupShares(
  people: PersonNutrition[],
  combo: ComboItem[]
): PersonShareDetail[] {
  if (people.length === 0) return [];

  const totalGroupTdee = people.reduce((sum, p) => sum + p.tdee, 0);

  // حساب نسبة كل شخص بدقة
  const normalizedPeople = people.map((p) => ({
    name: p.name,
    sharePercent: totalGroupTdee > 0 ? (p.tdee / totalGroupTdee) * 100 : 100 / people.length,
    ratio: totalGroupTdee > 0 ? p.tdee / totalGroupTdee : 1 / people.length,
  }));

  const shares: PersonShareDetail[] = normalizedPeople.map((p) => ({
    personName: p.name,
    sharePercent: Math.round(p.sharePercent * 10) / 10,
    shareKcal: 0,
    allocatedItems: [],
  }));

  for (const item of combo) {
    const meal = item.meal;
    const qty = item.quantity;
    const totalItemKcal = meal.total_kcal * qty;

    if (meal.portion_type === 'shareable' || qty < people.length) {
      // صواني أو أطباق تشاركية عائلية، أو وجبات فردية عددها أقل من عدد أفراد الجروب -> تقسيم تناسبي عادل
      shares.forEach((personShare, idx) => {
        const pRatio = normalizedPeople[idx]!.ratio;
        const personKcal = Math.round(totalItemKcal * pRatio);
        personShare.shareKcal += personKcal;
        
        let desc = '';
        if (meal.portion_type === 'shareable') {
          desc = `${Math.round(pRatio * 100)}% من ${meal.name_ar} (حوالي ${personKcal} سعرة)`;
        } else {
          // وجبة فردية مقسمة (مثلاً 2 نص فرخة على 5 أفراد)
          const sharePortion = Math.round(pRatio * qty * 10) / 10;
          desc = `${Math.round(pRatio * 100)}% مشاركة (${sharePortion} وجبة) من ${qty}x ${meal.name_ar} (${personKcal} سعرة)`;
        }

        personShare.allocatedItems.push({
          mealNameAr: meal.name_ar,
          portionDescription: desc,
        });
      });
    } else {
      // أصناف فردية تكفي أو تزيد عن عدد الأفراد (ساندوتشات / وجبات) -> Largest Remainder Method بوحدات صحيحة
      const exactQuotas = normalizedPeople.map((p) => p.ratio * qty);
      const integerUnits = exactQuotas.map((q) => Math.floor(q));
      let distributedUnits = integerUnits.reduce((sum, u) => sum + u, 0);
      let remainderToDistribute = qty - distributedUnits;

      // ترتيب الأفراد حسب الكسر الأكبر للحصول على باقي الوحدات
      const remainders = exactQuotas
        .map((q, idx) => ({ index: idx, remainder: q - Math.floor(q) }))
        .sort((a, b) => b.remainder - a.remainder);

      let rIdx = 0;
      while (remainderToDistribute > 0 && rIdx < remainders.length) {
        const targetPersonIdx = remainders[rIdx]!.index;
        integerUnits[targetPersonIdx]! += 1;
        remainderToDistribute -= 1;
        rIdx += 1;
      }

      shares.forEach((personShare, idx) => {
        const units = integerUnits[idx] ?? 0;
        const personKcal = units * meal.total_kcal;
        personShare.shareKcal += personKcal;
        if (units > 0) {
          personShare.allocatedItems.push({
            mealNameAr: meal.name_ar,
            portionDescription: `${units} × ${meal.name_ar} (${personKcal} سعرة)`,
          });
        }
      });
    }
  }

  return shares;
}
