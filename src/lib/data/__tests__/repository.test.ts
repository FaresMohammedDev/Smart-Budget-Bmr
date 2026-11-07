import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createOrder, listMeals, saveMeal, deleteMeal, getOrder, listOrders, markOrderPaid, getStats, saveGroup, listGroups, deleteGroup } from '../repository';
import { getDataMode } from '../config';
import type { PersonInput } from '@/features/nutrition/domain/types';
import { MEAL_FRACTIONS } from '@/features/nutrition/domain/meal-fraction';

const person: PersonInput = { name: 'أحمد', age: 30, gender: 'male', heightCm: 180, weightKg: 80, activityLevel: 'moderate' };
beforeEach(() => { localStorage.clear(); vi.stubEnv('NEXT_PUBLIC_DATA_MODE', 'local'); });
afterEach(() => vi.unstubAllEnvs());

describe('Shared prototype database', () => {
  it('saves meal macros and rejects negative values', async () => {
    const [meal] = await listMeals();
    await saveMeal({ carbs_g: 12, protein_g: 34, fat_g: 5 }, meal.id);
    expect((await listMeals()).find(m => m.id === meal.id)).toMatchObject({ carbs_g: 12, protein_g: 34, fat_g: 5 });
    await expect(saveMeal({ carbs_g: -1 }, meal.id)).rejects.toThrow();
  });

  it('persists admin changes, hides unavailable meals, and does not resurrect deleted meals', async () => {
    const [meal] = await listMeals();
    await saveMeal({ price: 99, discount_price: null, image_url: '/custom.png', total_kcal: 321 }, meal.id);
    expect((await listMeals()).find(m => m.id === meal.id)).toMatchObject({ price: 99, image_url: '/custom.png', total_kcal: 321 });
    await saveMeal({ is_available: false }, meal.id);
    expect((await listMeals(true)).some(m => m.id === meal.id)).toBe(false);
    await deleteMeal(meal.id);
    expect((await listMeals()).some(m => m.id === meal.id)).toBe(false);
  });
  it('shows new admin meals without matching their names against a static list', async () => {
    await saveMeal({ name_ar: 'صنف جديد', name_en: 'new', price: 42, total_kcal: 400 });
    expect((await listMeals(true)).find(m => m.name_ar === 'صنف جديد')?.price).toBe(42);
  });
  it('creates a persistent receipt and cashier order; retrying does not duplicate it', async () => {
    const [meal] = await listMeals(true);
    const request = { requestId: crypto.randomUUID(), mode: 'quick_menu' as const, items: [{ meal_id: meal.id, quantity: 2 }] };
    const id = await createOrder(request);
    expect(await createOrder(request)).toBe(id);
    expect(await listOrders()).toHaveLength(1);
    const receipt = await getOrder(id);
    expect(receipt.order.total_price).toBe((meal.discount_price ?? meal.price) * 2);
    expect(receipt.people).toEqual([]);
    expect(receipt.order.required_kcal).toBeNull();
    await saveMeal({ price: 777, discount_price: null, total_kcal: 100 }, meal.id);
    expect(await getOrder(id)).toEqual(receipt);
    await markOrderPaid(id);
    const paidAt = (await getOrder(id)).order.paid_at;
    await markOrderPaid(id);
    expect((await getOrder(id)).order.paid_at).toBe(paidAt);
    expect((await getStats()).totalRevenue).toBe(receipt.order.total_price);
  });
  it.each(Object.entries(MEAL_FRACTIONS))('keeps %s targets and receipt shares consistent', async (mealTime, fraction) => {
    const [meal] = await listMeals(true);
    const id = await createOrder({ requestId: crypto.randomUUID(), mode: 'smart_budget', budget: 10000,
      mealTime: mealTime as keyof typeof MEAL_FRACTIONS, people: [person, { ...person, name: 'سارة', gender: 'female' }], items: [{ meal_id: meal.id, quantity: 3 }] });
    const { order, people } = await getOrder(id);
    expect(order.meal_fraction).toBe(fraction);
    expect(order.required_kcal).toBe(Math.round(order.daily_tdee_total! * fraction * 100) / 100);
    expect(people.reduce((sum,p) => sum+p.share_kcal, 0)).toBe(order.total_kcal);
    expect(people[0].share_details[0].portion_description).toContain('×');
  });
  it('rejects unavailable meals, changed prices and invalid quantities without creating orders', async () => {
    const [meal] = await listMeals(true);
    const base = { requestId: crypto.randomUUID(), mode: 'quick_menu' as const, items: [{ meal_id: meal.id, quantity: 1 }] };
    await expect(createOrder({ ...base, expectedTotal: 0 })).rejects.toThrow('تغير سعر');
    await expect(createOrder({ ...base, items: [{ meal_id: meal.id, quantity: -1 }] })).rejects.toThrow();
    await expect(createOrder({ ...base, items: [{ meal_id: meal.id, quantity: 1.5 }] })).rejects.toThrow();
    await saveMeal({ is_available: false }, meal.id);
    await expect(createOrder(base)).rejects.toThrow('غير متاح');
    expect(await listOrders()).toHaveLength(0);
  });
  it('rejects a budget overrun and bad person inputs atomically', async () => {
    const [meal] = await listMeals(true);
    const base = { requestId: crypto.randomUUID(), mode: 'smart_budget' as const, budget: 0.01, mealTime: 'lunch' as const, people: [person], items: [{ meal_id: meal.id, quantity: 1 }] };
    await expect(createOrder(base)).rejects.toThrow('الميزانية');
    await expect(createOrder({ ...base, budget: 1000, people: [{ ...person, weightKg: NaN }] })).rejects.toThrow();
    expect(await listOrders()).toHaveLength(0);
  });
  it('finds orders older than the latest 50 and counts only paid sales', async () => {
    const [meal] = await listMeals(true);
    let first = '';
    for (let i = 0; i < 55; i++) {
      const id = await createOrder({ requestId: crypto.randomUUID(), mode: 'quick_menu', items: [{ meal_id: meal.id, quantity: 1 }] });
      if (!i) first = id;
    }
    expect(await listOrders('1001')).toHaveLength(1);
    expect((await listOrders(first))[0].id).toBe(first);
    expect((await getStats()).topSelling).toHaveLength(0);
    await markOrderPaid(first);
    const stats = await getStats();
    expect(stats.totalOrders).toBe(55);
    expect(stats.topSelling[0].sales).toBe(1);
  });
  it('saves and deletes demo groups without needing an account', async () => {
    const id = await saveGroup('فريق العرض', [person]);
    expect((await listGroups())[0].people).toEqual([person]);
    await expect(saveGroup('فريق العرض', [person])).rejects.toThrow();
    await deleteGroup(id);
    expect(await listGroups()).toHaveLength(0);
    await expect(saveGroup('invalid', [{ ...person, age: 1 }])).rejects.toThrow();
    expect(await listGroups()).toHaveLength(0);
  });
  it('does not silently reset corrupted browser data', async () => {
    localStorage.setItem('fathalla-demo-db-v1', '{broken');
    await expect(listMeals()).rejects.toThrow();
    expect(localStorage.getItem('fathalla-demo-db-v1')).toBe('{broken');
  });
  it('does not report a successful order when persistence fails', async () => {
    const [meal] = await listMeals();
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('quota', 'QuotaExceededError'); });
    await expect(createOrder({ requestId: crypto.randomUUID(), mode: 'quick_menu', items: [{ meal_id: meal.id, quantity: 1 }] })).rejects.toThrow();
    spy.mockRestore();
    expect(await listOrders()).toHaveLength(0);
  });
});

describe('Data source selection', () => {
  it('uses local only when credentials are absent or local is explicitly selected', () => {
    vi.stubEnv('NEXT_PUBLIC_DATA_MODE', 'auto');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', ''); vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    expect(getDataMode()).toBe('local');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    expect(() => getDataMode()).toThrow();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'publishable-test');
    expect(getDataMode()).toBe('supabase');
  });
});
