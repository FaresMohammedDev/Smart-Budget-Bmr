import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createOrder, listMeals, markOrderPaid } from '../repository';

const mock = vi.hoisted(() => ({ select: vi.fn(), rpc: vi.fn(), from: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ from: mock.from, rpc: mock.rpc }) }));

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_DATA_MODE', 'supabase');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test');
  localStorage.clear();
  mock.select.mockReset(); mock.rpc.mockReset(); mock.from.mockReset();
  mock.from.mockReturnValue({ select: mock.select });
});
afterEach(() => vi.unstubAllEnvs());

it('does not replace server menu failures with demo meals', async () => {
  mock.select.mockResolvedValue({ data: null, error: new Error('offline') });
  await expect(listMeals(true)).rejects.toThrow('offline');
  expect(localStorage.length).toBe(0);
});

it('sends the selected meal fraction and receipt field names, and preserves request identity', async () => {
  const meal = { id: crypto.randomUUID(), name_ar: 'وجبة', name_en: 'meal', price: '10', total_kcal: '600', is_available: true, is_expiring_soon: false, kind: 'main', portion_type: 'individual', servings: 1 };
  mock.select.mockResolvedValue({ data: [meal], error: null });
  const id = crypto.randomUUID();
  mock.rpc.mockResolvedValue({ data: id, error: null });
  const result = await createOrder({ requestId: id, mode: 'smart_budget', mealTime: 'breakfast', budget: 100,
    items: [{ meal_id: meal.id, quantity: 1 }], people: [{ name: 'أحمد', age: 30, gender: 'male', heightCm: 180, weightKg: 80, activityLevel: 'moderate' }] });
  expect(result).toBe(id);
  const payload = mock.rpc.mock.calls[0][1].p_payload;
  expect(payload.meal_fraction).toBe(0.25);
  expect(payload.request_id).toBe(id);
  expect(payload.expected_total).toBe(10);
  expect(payload.people[0].share_details[0]).toMatchObject({ meal_name_ar: 'وجبة', portion_description: '1 × وجبة (600 سعرة)' });
  expect(localStorage.length).toBe(0);
});

it('propagates payment refusal and does not perform a direct-table fallback', async () => {
  mock.rpc.mockResolvedValue({ data: null, error: new Error('ORDER_CANCELLED') });
  await expect(markOrderPaid(crypto.randomUUID())).rejects.toThrow('ORDER_CANCELLED');
  expect(mock.from).not.toHaveBeenCalled();
  expect(localStorage.length).toBe(0);
});
