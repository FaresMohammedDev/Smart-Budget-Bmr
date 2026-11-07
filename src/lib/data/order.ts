import type { Meal } from '@/features/recommendations/domain/types';
import type { PersonInput, MealTime } from '@/features/nutrition/domain/types';
import { calculateBmr } from '@/features/nutrition/domain/bmr';
import { calculateTdee } from '@/features/nutrition/domain/tdee';
import { MEAL_FRACTIONS } from '@/features/nutrition/domain/meal-fraction';
import { calculateGroupShares } from '@/features/recommendations/domain/shares';
import type { OrderRow, OrderItemRow, OrderPersonRow } from '@/types/database.types';

export interface OrderRequest {
  requestId: string;
  mode: 'smart_budget' | 'quick_menu';
  items: { meal_id: string; quantity: number }[];
  budget?: number;
  people?: PersonInput[];
  mealTime?: MealTime;
  groupId?: string | null;
  expectedTotal?: number;
}
export interface OrderDetails { order: OrderRow; items: OrderItemRow[]; people: OrderPersonRow[] }
export const money = (value: number) => Math.round(value * 100) / 100;

export function validatePeople(people: PersonInput[]) {
  if (people.length < 1 || people.length > 30) throw new Error('عدد الأفراد يجب أن يكون من 1 إلى 30.');
  for (const p of people) {
    if (![p.age, p.heightCm, p.weightKg].every(Number.isFinite) || !Number.isInteger(p.age) || p.age < 10 || p.age > 100 || p.heightCm < 100 || p.heightCm > 250 || p.weightKg < 25 || p.weightKg > 300) throw new Error('راجع العمر والطول والوزن لكل فرد.');
    if (p.name.length > 60) throw new Error('اسم الفرد يجب ألا يتجاوز 60 حرفًا.');
    calculateTdee(calculateBmr(p.gender, p.weightKg, p.heightCm, p.age), p.activityLevel);
  }
}

export function buildOrder(request: OrderRequest, meals: Meal[], orderNumber: number): OrderDetails {
  if (!request.items.length) throw new Error('السلة فارغة.');
  const quantities = new Map<string, number>();
  for (const item of request.items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100) throw new Error('الكمية يجب أن تكون بين 1 و100.');
    quantities.set(item.meal_id, (quantities.get(item.meal_id) ?? 0) + item.quantity);
  }
  const combo = Array.from(quantities, ([id, quantity]) => {
    const meal = meals.find(m => m.id === id && m.is_available);
    if (!meal || quantity > 100) throw new Error('أحد الأصناف غير متاح الآن. راجع المنيو.');
    return { meal, quantity };
  });
  const totalPrice = money(combo.reduce((sum, { meal, quantity }) => sum + money((meal.discount_price ?? meal.price) * quantity), 0));
  if (request.expectedTotal !== undefined && money(request.expectedTotal) !== totalPrice) throw new Error('تغير سعر أحد الأصناف. حدّث المنيو وراجع الإجمالي قبل التأكيد.');
  const totalKcal = money(combo.reduce((sum, { meal, quantity }) => sum + meal.total_kcal * quantity, 0));
  const smart = request.mode === 'smart_budget';
  const inputs = smart ? request.people ?? [] : [];
  if (smart && (!Number.isFinite(request.budget) || request.budget! <= 0 || totalPrice > request.budget!)) throw new Error('إجمالي الطلب يتجاوز الميزانية الحالية.');
  if (smart && (inputs.length < 1 || inputs.length > 30 || !request.mealTime || !MEAL_FRACTIONS[request.mealTime])) throw new Error('راجع الأفراد وتوقيت الوجبة.');
  const fraction = smart ? MEAL_FRACTIONS[request.mealTime!] : null;
  if (smart) validatePeople(inputs);
  const nutrition = inputs.map((p, i) => {
    const bmr = calculateBmr(p.gender, p.weightKg, p.heightCm, p.age);
    const tdee = calculateTdee(bmr, p.activityLevel);
    if (!Number.isFinite(tdee) || tdee <= 0) throw new Error('راجع مستوى النشاط.');
    return { id: String(i), name: p.name || `فرد ${i + 1}`, bmr, tdee, targetKcal: money(tdee * fraction!), sharePercent: 0 };
  });
  const shares = calculateGroupShares(nutrition, combo);
  const id = request.requestId;
  const tdee = money(nutrition.reduce((sum, p) => sum + p.tdee, 0));
  return {
    order: { id, order_number: orderNumber, user_id: null, group_id: request.groupId ?? null, order_mode: request.mode,
      people_count: smart ? inputs.length : 1, budget: smart ? request.budget! : totalPrice, meal_fraction: fraction,
      daily_tdee_total: smart ? tdee : null, required_kcal: smart ? money(tdee * fraction!) : null,
      total_kcal: totalKcal, total_price: totalPrice, status: 'pending', paid_at: null, created_at: new Date().toISOString() },
    items: combo.map(({ meal, quantity }) => ({ id: crypto.randomUUID(), order_id: id, meal_id: meal.id, meal_name_ar: meal.name_ar,
      meal_name_en: meal.name_en, portion_type: meal.portion_type, unit_price: meal.discount_price ?? meal.price, quantity,
      unit_kcal: meal.total_kcal, line_total: money((meal.discount_price ?? meal.price) * quantity), components: meal.components ?? [] })),
    people: inputs.map((p, i) => ({ id: crypto.randomUUID(), order_id: id, name: nutrition[i].name, age: p.age, gender: p.gender,
      height_cm: p.heightCm, weight_kg: p.weightKg, activity_level: p.activityLevel,
      bmr: nutrition[i].bmr, tdee: nutrition[i].tdee, target_kcal: nutrition[i].targetKcal,
      share_percent: shares[i].sharePercent, share_kcal: shares[i].shareKcal,
      share_details: shares[i].allocatedItems.map(a => ({ meal_name_ar: a.mealNameAr, portion_description: a.portionDescription })) })),
  };
}
