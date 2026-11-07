import { describe, it, expect } from 'vitest';
import { recommendMeals } from '../domain/engine';
import { calculateGroupShares } from '../domain/shares';
import { Meal } from '../domain/types';
import { PersonNutrition } from '../../nutrition/domain/types';

const mockMeals: Meal[] = [
  {
    id: 'm1',
    name_ar: 'ساندوتش شاورما فراخ',
    name_en: 'Chicken Shawarma Sandwich',
    price: 85,
    is_expiring_soon: false,
    is_available: true,
    total_kcal: 550,
    kind: 'main',
    portion_type: 'individual',
    servings: 1,
    image_url: '/images/meal-placeholder.svg',
  },
  {
    id: 'm2',
    name_ar: 'صينية مكرونة بشاميل عائلي',
    name_en: 'Family Bechamel Pasta Tray',
    price: 320,
    discount_price: 250,
    is_expiring_soon: true, // عرض توفير خاص قرب الصلاحية
    is_available: true,
    total_kcal: 2800,
    kind: 'main',
    portion_type: 'shareable',
    servings: 4,
    image_url: '/images/meal-placeholder.svg',
  },
  {
    id: 'm3',
    name_ar: 'بطاطس محمرة',
    name_en: 'French Fries Box',
    price: 35,
    is_expiring_soon: false,
    is_available: true,
    total_kcal: 400,
    kind: 'side',
    portion_type: 'individual',
    servings: 1,
    image_url: '/images/meal-placeholder.svg',
  },
];

describe('Recommendation Engine', () => {
  it('يعطي أولوية الصدارة للوجبات التي قربت صلاحيتها كأفضل عرض توفيري', () => {
    const group: PersonNutrition[] = Array.from({ length: 4 }, (_, i) => ({ id: String(i), name: `فرد ${i + 1}`, bmr: 1700, tdee: 2500, targetKcal: 625, sharePercent: 25 }));
    const result = recommendMeals({
      availableMeals: mockMeals,
      targetKcal: 2500,
      budget: 300,
      people: group,
    });

    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.recommendations.length).toBeGreaterThan(0);
      const topRec = result.recommendations[0]!;
      // يجب أن تكون الوجبة صاحبة العرض التوفيري (is_expiring_soon) في البداية
      expect(topRec.isExpiringSoonOffer).toBe(true);
      expect(topRec.badge).toBe('special_offer');
    }
  });

  it('يتعامل مع حالة الميزانية القليلة جداً (Edge Case) بسلاسة دون أخطاء', () => {
    const result = recommendMeals({
      availableMeals: mockMeals,
      targetKcal: 1000,
      budget: 20, // أقل من سعر أرخص صنف (35 ج.م)
    });

    expect(result.status).toBe('low_budget');
    if (result.status === 'low_budget') {
      expect(result.cheapestMealPrice).toBe(85);
      expect(result.missingAmount).toBe(65);
      expect(result.apologyMessageAr).toContain('أقل من أرخص وجبة');
    }
  });

  it('يقترح أطباق جانبية إذا كانت الميزانية تكفي جانبي ولا تكفي رئيسي', () => {
    const result = recommendMeals({
      availableMeals: mockMeals,
      targetKcal: 800,
      budget: 50, // تكفي البطاطس (35) ولكن لا تكفي الشاورما (85)
    });

    // هنا الميزانية 50 وأرخص صنف هو البطاطس 35، لكن أرخص رئيسي 85
    // المحرك سيعرض الـ sides الممكنة
    expect(result.status).toBe('low_budget');
    if (result.status === 'low_budget') {
      expect(result.suggestedSides[0].meal.id).toBe('m3');
      expect(result.sidesTotalPrice).toBe(35);
    }
  });
});

describe('Group Shares Calculation', () => {
  it('يوزع الوجبات الفردية بأعداد صحيحة عادلة باستخدام Largest Remainder Method', () => {
    const people: PersonNutrition[] = [
      { id: '1', name: 'أحمد', bmr: 1800, tdee: 2790, targetKcal: 1100, sharePercent: 60 },
      { id: '2', name: 'سارة', bmr: 1300, tdee: 1860, targetKcal: 740, sharePercent: 40 },
    ];

    const shares = calculateGroupShares(people, [
      { meal: mockMeals[0]!, quantity: 3 }, // 3 ساندوتش شاورما
    ]);

    expect(shares.length).toBe(2);
    // أحمد نسبته 60% يأخذ 2 ساندوتش، وسارة تأخذ 1 ساندوتش
    expect(shares[0]?.allocatedItems[0]?.portionDescription).toContain('2 ×');
    expect(shares[1]?.allocatedItems[0]?.portionDescription).toContain('1 ×');
  });

  it('يحسب نسب الوجبات التشاركية (الصواني) كنسبة مئوية وسعرات', () => {
    const people: PersonNutrition[] = [
      { id: '1', name: 'أحمد', bmr: 1800, tdee: 3000, targetKcal: 1200, sharePercent: 60 },
      { id: '2', name: 'سارة', bmr: 1300, tdee: 2000, targetKcal: 800, sharePercent: 40 },
    ];

    const shares = calculateGroupShares(people, [
      { meal: mockMeals[1]!, quantity: 1 }, // صينية مكرونة بشاميل عائلي (2800 سعرة)
    ]);

    expect(shares[0]?.sharePercent).toBe(60);
    expect(shares[1]?.sharePercent).toBe(40);
    expect(shares[0]?.shareKcal).toBe(1680); // 60% of 2800
    expect(shares[1]?.shareKcal).toBe(1120); // 40% of 2800
  });
});


describe('Recommendation boundaries', () => {
  it('does not substitute lunch meals when breakfast is unavailable', () => {
    expect(recommendMeals({ availableMeals: [{ ...mockMeals[0], meal_times: ['lunch'] }], targetKcal: 600, budget: 100, mealTime: 'breakfast' }).status).toBe('unavailable');
  });
  it('returns an explicit empty state instead of Infinity for an empty menu', () => {
    const result = recommendMeals({ availableMeals: [], targetKcal: 600, budget: 100 });
    expect(result.status).toBe('unavailable');
    expect(JSON.stringify(result)).not.toContain('Infinity');
  });
  it('never offers sides alone as a full main meal', () => {
    const result = recommendMeals({ availableMeals: mockMeals, targetKcal: 400, budget: 100 });
    expect(result.status).toBe('success');
    if (result.status === 'success') expect(result.recommendations.every(r => r.items.some(i => i.meal.kind === 'main'))).toBe(true);
  });
  it('does not allow expiring offers to overwhelm calorie fit', () => {
    const meals = [{ ...mockMeals[0], total_kcal: 600, price: 100 }, { ...mockMeals[1], total_kcal: 3000, price: 90, discount_price: null }];
    const result = recommendMeals({ availableMeals: meals, targetKcal: 600, budget: 100 });
    if (result.status !== 'success') throw new Error('Expected recommendations');
    expect(result.recommendations[0].items[0].meal.id).toBe('m1');
  });
  it('keeps individual units whole even when there are fewer than people', () => {
    const people = Array.from({ length: 3 }, (_, i) => ({ id: String(i), name: String(i), bmr: 1000, tdee: 1500, targetKcal: 600, sharePercent: 33 }));
    const shares = calculateGroupShares(people, [{ meal: mockMeals[0], quantity: 2 }]);
    expect(shares.map(s => s.shareKcal)).toEqual([550,550,0]);
    expect(shares.flatMap(s => s.allocatedItems).every(i => i.portionDescription.includes('1 ×'))).toBe(true);
  });
  it('conserves calories when a tray is split among three people', () => {
    const people = Array.from({ length: 3 }, (_, i) => ({ id: String(i), name: String(i), bmr: 1000, tdee: 1500, targetKcal: 600, sharePercent: 33 }));
    const shares = calculateGroupShares(people, [{ meal: { ...mockMeals[1], total_kcal: 1000 }, quantity: 1 }]);
    expect(shares.reduce((sum,s) => sum+s.shareKcal, 0)).toBe(1000);
  });
});


it('respects an exact decimal budget without floating-point rejection', () => {
  const meal = { ...mockMeals[0], price: 0.1, total_kcal: 200 };
  const result = recommendMeals({ availableMeals: [meal], targetKcal: 600, budget: 0.3 });
  if (result.status !== 'success') throw new Error('Expected an exact-budget option');
  expect(result.recommendations[0].totalPrice).toBe(0.3);
  expect(result.recommendations[0].items[0].quantity).toBe(3);
});


// ---------- منطقية الاقتراحات على منيو واقعي ----------
const meal = (id: string, name_ar: string, kind: Meal['kind'], total_kcal: number, price: number, portion_type: Meal['portion_type'] = 'individual', servings = 1): Meal => ({
  id, name_ar, name_en: id, kind, total_kcal, price, portion_type, servings, is_available: true, is_expiring_soon: false, image_url: '/x.svg',
});
const realMenu: Meal[] = [
  meal('fries', 'بطاطس محمرة', 'side', 403, 35),
  meal('quarter', 'ربع فرخة مشوية بالأرز', 'main', 780, 160),
  meal('shawarma', 'ساندوتش شاورما فراخ', 'main', 636, 85),
  meal('falafel', 'ساندوتش طعمية', 'main', 481, 50),
  meal('liver', 'ساندوتش كبدة إسكندراني', 'main', 499, 70),
  meal('kofta', 'ساندوتش كفتة', 'main', 889, 95),
  meal('salad', 'سلطة خضراء', 'side', 40, 20),
  meal('tahini', 'سلطة طحينة', 'side', 150, 20),
  meal('grill', 'صينية مشويات مشكلة عائلي', 'main', 3600, 750, 'shareable', 5),
  meal('pasta-s', 'صينية مكرونة بشاميل صغيرة', 'main', 1400, 140, 'shareable', 2),
  meal('pasta-f', 'صينية مكرونة بشاميل عائلي', 'main', 2810, 280, 'shareable', 4),
  meal('foul', 'طبق فول بالعيش', 'side', 720, 30),
  meal('soda', 'مشروب غازي', 'drink', 140, 15),
  meal('water', 'مياه معدنية', 'drink', 0, 8),
];
const group = (n: number, tdee = 2600): PersonNutrition[] => Array.from({ length: n }, (_, i) => ({ id: String(i), name: `فرد ${i + 1}`, bmr: 1700, tdee, targetKcal: 0, sharePercent: 100 / n }));
const FRACTION = { breakfast: 0.25, lunch: 0.4, dinner: 0.3, snack: 0.15 } as const;
const run = (n: number, time: keyof typeof FRACTION, budget: number) =>
  recommendMeals({ availableMeals: realMenu, targetKcal: n * 2600 * FRACTION[time], budget, people: group(n), mealTime: time });
const ids = (r: { items: { meal: Meal }[] }) => r.items.map((i) => i.meal.id);

describe('Realistic recommendations', () => {
  it('الفطار: أكل فطار بس، من غير بشاميل ولا صواني ولا صودا', () => {
    for (const n of [1, 2, 4]) {
      const res = run(n, 'breakfast', 60 * n + 40);
      expect(res.status).toBe('success');
      if (res.status !== 'success') continue;
      for (const rec of res.recommendations) {
        expect(ids(rec).every((id) => ['foul', 'falafel', 'salad', 'tahini', 'water'].includes(id))).toBe(true);
      }
    }
  });

  it('الغداء: لازم وجبة أساسية، والمشروب لوحده أو الصودا مستحيل', () => {
    for (const budget of [100, 150, 300]) {
      const res = run(1, 'lunch', budget);
      if (res.status !== 'success') continue;
      for (const rec of res.recommendations) {
        expect(rec.items.some((i) => i.meal.kind === 'main')).toBe(true);
        const empty = rec.items.filter((i) => i.meal.kind === 'drink' || i.meal.kind === 'dessert').reduce((s, i) => s + i.meal.total_kcal * i.quantity, 0);
        expect(empty / rec.totalKcal).toBeLessThanOrEqual(0.3);
      }
    }
  });

  it('العشا: مفيش طبق جانبي لوحده، والسعرات قريبة من الهدف', () => {
    const res = run(1, 'dinner', 120);
    expect(res.status).toBe('success');
    if (res.status !== 'success') return;
    const target = 2600 * 0.3;
    for (const rec of res.recommendations) {
      expect(rec.items.some((i) => i.meal.kind === 'main' || ['foul'].includes(i.meal.id))).toBe(true);
      expect(rec.totalKcal / target).toBeGreaterThan(0.45);
      expect(rec.totalKcal / target).toBeLessThan(1.65);
    }
  });

  it('الصينية العائلية مش بتتقدم لفرد واحد أو اتنين، وبتظهر للمجموعات الكبيرة', () => {
    for (const n of [1, 2]) {
      const res = run(n, 'lunch', 800);
      if (res.status === 'success') expect(res.recommendations.every((r) => !ids(r).includes('grill'))).toBe(true);
    }
    const big = run(5, 'lunch', 900);
    expect(big.status).toBe('success');
  });

  it('مفيش أكتر من 3 وحدات أساسية للفرد الواحد', () => {
    const res = run(3, 'lunch', 500);
    if (res.status !== 'success') return;
    for (const rec of res.recommendations) {
      const units = rec.items.filter((i) => i.meal.kind === 'main' && i.meal.portion_type === 'individual').reduce((s, i) => s + i.quantity, 0);
      expect(units).toBeLessThanOrEqual(3 * 3);
    }
  });

  it('الاقتراحات الثلاثة مختلفة في الأصناف الأساسية', () => {
    const res = run(2, 'lunch', 400);
    expect(res.status).toBe('success');
    if (res.status !== 'success') return;
    const sigs = res.recommendations.map((r) => r.items.filter((i) => i.meal.kind === 'main').map((i) => i.meal.id).sort().join('|'));
    expect(new Set(sigs).size).toBe(sigs.length);
  });
});
