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
    const result = recommendMeals({
      availableMeals: mockMeals,
      targetKcal: 2500,
      budget: 300,
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
      expect(result.cheapestMealPrice).toBe(35);
      expect(result.missingAmount).toBe(15);
      expect(result.apologyMessageAr).toContain('عفواً، ميزانيتك الحالية');
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
    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.recommendations.some((r) => r.totalPrice <= 50)).toBe(true);
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
