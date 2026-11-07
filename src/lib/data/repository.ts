import { createClient } from '@/lib/supabase/client';
import { RICH_FATHALLA_MEALS } from '@/lib/meals-data';
import type { Meal } from '@/features/recommendations/domain/types';
import type { PersonInput } from '@/features/nutrition/domain/types';
import type { OrderRow, OrderItemRow } from '@/types/database.types';
import { getDataMode } from './config';
import { buildOrder, money, validatePeople, type OrderDetails, type OrderRequest } from './order';

const KEY = 'fathalla-demo-db-v1';
export interface SavedGroup { id: string; name: string; people: PersonInput[] }
interface LocalDatabase { version: 1; meals: Meal[]; orders: OrderDetails[]; groups: SavedGroup[]; nextOrderNumber: number }

function readLocal(): LocalDatabase {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const db = JSON.parse(raw) as LocalDatabase;
    if (db.version !== 1 || !Array.isArray(db.meals) || !Array.isArray(db.orders) || !Array.isArray(db.groups)) throw new Error('تعذر قراءة بيانات العرض المحلية.');
    return db;
  }
  return { version: 1, meals: RICH_FATHALLA_MEALS.map(m => ({ ...m, id: crypto.randomUUID() })), orders: [], groups: [], nextOrderNumber: 1001 };
}

async function local<T>(action: (db: LocalDatabase) => T): Promise<T> {
  const run = () => {
    const db = readLocal();
    const result = action(db);
    localStorage.setItem(KEY, JSON.stringify(db));
    return result;
  };
  // Serializes changes from the menu, admin and cashier tabs of the same browser.
  return navigator.locks ? navigator.locks.request(KEY, run) : run();
}

export function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : 'تعذر تنفيذ العملية. حاول مرة أخرى.';
  if (/carbs_g|protein_g|fat_g/.test(message)) return 'أضف أعمدة الماكروز أولًا: شغّل supabase/20261108_meal_macros.sql في Supabase.';
  const translated: Record<string, string> = { MEAL_UNAVAILABLE: 'أحد الأصناف لم يعد متاحًا. راجع المنيو.', PRICE_CHANGED: 'تغيرت الأسعار. حدّث المنيو وراجع الإجمالي.', BUDGET_EXCEEDED: 'إجمالي الطلب يتجاوز الميزانية.', ORDER_CANCELLED: 'لا يمكن تأكيد دفع طلب ملغي.', ORDER_NOT_FOUND: 'الطلب غير موجود.', AUTH_REQUIRED: 'سجّل الدخول لحفظ مجموعتك.' };
  return translated[message] ?? message;
}

export async function listMeals(availableOnly = false): Promise<Meal[]> {
  if (getDataMode() === 'local') return local(db => db.meals.filter(m => !availableOnly || m.is_available));
  const { data, error } = await createClient().from(availableOnly ? 'available_meals' : 'meals').select('*');
  if (error) throw error;
  return (data ?? []).map(m => ({ ...m, price: Number(m.price), discount_price: m.discount_price == null ? null : Number(m.discount_price), total_kcal: Number(m.total_kcal), servings: Number(m.servings || 1), carbs_g: m.carbs_g == null ? null : Number(m.carbs_g), protein_g: m.protein_g == null ? null : Number(m.protein_g), fat_g: m.fat_g == null ? null : Number(m.fat_g) })) as Meal[];
}

export function validateMeal(meal: Partial<Meal>) {
  if (meal.price !== undefined && (!Number.isFinite(meal.price) || meal.price <= 0)) throw new Error('السعر يجب أن يكون أكبر من صفر.');
  if (meal.total_kcal !== undefined && (!Number.isFinite(meal.total_kcal) || meal.total_kcal < 0)) throw new Error('السعرات يجب أن تكون صفرًا أو أكثر.');
  if (meal.discount_price != null && (!Number.isFinite(meal.discount_price) || meal.discount_price <= 0 || (meal.price !== undefined && meal.discount_price > meal.price))) throw new Error('راجع سعر الخصم.');
  for (const key of ['carbs_g', 'protein_g', 'fat_g'] as const) {
    const v = meal[key];
    if (v != null && (!Number.isFinite(v) || v < 0)) throw new Error('الكارب والبروتين والدهون يجب أن تكون صفرًا أو أكثر.');
  }
  if (meal.name_ar !== undefined && !meal.name_ar.trim()) throw new Error('اكتب اسم الصنف.');
  if (meal.servings !== undefined && (!Number.isInteger(meal.servings) || meal.servings < 1)) throw new Error('عدد الحصص غير صحيح.');
}

export async function saveMeal(meal: Partial<Meal>, id?: string): Promise<void> {
  validateMeal(meal);
  if (getDataMode() === 'local') return local(db => {
    if (id) {
      const index = db.meals.findIndex(m => m.id === id);
      if (index < 0) throw new Error('الصنف غير موجود.');
      const updated = { ...db.meals[index], ...meal };
      validateMeal(updated);
      db.meals[index] = updated;
    } else {
      db.meals.push({ name_ar: '', name_en: '', price: 1, total_kcal: 0, kind: 'main', portion_type: 'individual', servings: 1, image_url: '/images/meal-placeholder.svg', is_available: true, is_expiring_soon: false, ...meal, id: crypto.randomUUID() });
    }
  });
  const client = createClient();
  // قبل تشغيل ملف الماكروز على Supabase مفيش أعمدة ماكروز؛ منبعتش القيم الفاضية علشان الحفظ ما يفشلش.
  const payload: Partial<Meal> = { ...meal };
  for (const key of ['carbs_g', 'protein_g', 'fat_g'] as const) if (payload[key] == null) delete payload[key];
  const query = id ? client.from('meals').update(payload).eq('id', id) : client.from('meals').insert(payload);
  const { data, error } = await query.select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('لم يتم حفظ الصنف.');
}

export async function deleteMeal(id: string): Promise<void> {
  if (getDataMode() === 'local') return local(db => { db.meals = db.meals.filter(m => m.id !== id); });
  const { data, error } = await createClient().from('meals').delete().eq('id', id).select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('لم يتم حذف الصنف.');
}

export async function uploadMealImage(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) || file.size > 2 * 1024 * 1024) throw new Error('اختر صورة PNG/JPG/WebP/GIF أصغر من 2MB.');
  if (getDataMode() === 'local') return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('تعذر قراءة الصورة.'));
    reader.readAsDataURL(file);
  });
  const client = createClient();
  const name = `${crypto.randomUUID()}.${file.type.split('/')[1]}`;
  const { error } = await client.storage.from('meal-images').upload(name, file);
  if (error) throw error;
  return client.storage.from('meal-images').getPublicUrl(name).data.publicUrl;
}

export async function createOrder(request: OrderRequest): Promise<string> {
  if (getDataMode() === 'local') return local(db => {
    const existing = db.orders.find(o => o.order.id === request.requestId);
    if (existing) return existing.order.id;
    const details = buildOrder(request, db.meals, db.nextOrderNumber);
    db.nextOrderNumber += 1;
    db.orders.push(details);
    return details.order.id;
  });
  const details = buildOrder(request, await listMeals(true), 0);
  const { data, error } = await createClient().rpc('create_order', { p_payload: {
    request_id: request.requestId, order_mode: request.mode, budget: details.order.budget, expected_total: details.order.total_price,
    meal_fraction: details.order.meal_fraction, group_id: request.groupId,
    items: request.items, people: details.people,
  } });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('لم يتم تأكيد إنشاء الطلب.');
  return data;
}

export async function getOrder(id: string): Promise<OrderDetails> {
  if (getDataMode() === 'local') return local(db => {
    const details = db.orders.find(o => o.order.id === id);
    if (!details) throw new Error('الطلب غير موجود في مصدر البيانات الحالي.');
    return details;
  });
  const { data, error } = await createClient().from('orders').select('*, order_items(*), order_people(*)').eq('id', id).single();
  if (error) throw error;
  return { order: data, items: data.order_items ?? [], people: data.order_people ?? [] } as OrderDetails;
}

export async function listOrders(search = ''): Promise<OrderRow[]> {
  if (getDataMode() === 'local') return local(db => db.orders.map(d => d.order).filter(o => !search || o.id.includes(search) || String(o.order_number).includes(search)).sort((a,b) => b.created_at.localeCompare(a.created_at)));
  const client = createClient();
  if (search.trim()) {
    const value = search.trim();
    if (!/^\d+$/.test(value) && !/^[0-9a-f-]{36}$/i.test(value)) return [];
    const { data, error } = await client.from('orders').select('*').eq(/^\d+$/.test(value) ? 'order_number' : 'id', value);
    if (error) throw error;
    return data as OrderRow[];
  }
  // Paginate instead of silently truncating totals and hiding older pending orders.
  const rows: OrderRow[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from('orders').select('*').order('created_at', { ascending: false }).order('id').range(offset, offset + 499);
    if (error) throw error;
    rows.push(...data as OrderRow[]);
    if (data.length < 500) return rows;
  }
}

export async function markOrderPaid(id: string): Promise<void> {
  if (getDataMode() === 'local') return local(db => {
    const details = db.orders.find(o => o.order.id === id);
    if (!details) throw new Error('الطلب غير موجود.');
    if (details.order.status === 'cancelled') throw new Error('الطلب ملغي.');
    if (details.order.status === 'paid') return;
    details.order.status = 'paid';
    details.order.paid_at = new Date().toISOString();
  });
  const { error } = await createClient().rpc('mark_order_as_paid', { p_order_id: id });
  if (error) throw error;
}

export async function getStats() {
  const orders = await listOrders();
  const paid = orders.filter(o => o.status === 'paid');
  const items: Pick<OrderItemRow, 'meal_id' | 'meal_name_ar' | 'quantity' | 'unit_price'>[] = [];
  if (getDataMode() === 'local') {
    items.push(...await local(db => db.orders.filter(d => d.order.status === 'paid').flatMap(d => d.items)));
  } else {
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await createClient().from('order_items').select('meal_id, meal_name_ar, quantity, unit_price, orders!inner(status)').eq('orders.status', 'paid').order('id').range(offset, offset + 499);
      if (error) throw error;
      items.push(...data);
      if (data.length < 500) break;
    }
  }
  const totals = new Map<string, { name: string; sales: number; revenue: number }>();
    for (const item of items) {
      const key = item.meal_id ?? item.meal_name_ar;
      const value = totals.get(key) ?? { name: item.meal_name_ar, sales: 0, revenue: 0 };
      value.sales += Number(item.quantity);
      value.revenue = money(value.revenue + item.unit_price * item.quantity);
      totals.set(key, value);
    }
  return { totalOrders: orders.length, paidOrders: paid.length, totalRevenue: money(paid.reduce((s,o) => s + Number(o.total_price), 0)), topSelling: [...totals.values()].sort((a,b) => b.sales - a.sales).slice(0,4) };
}

export async function listGroups(): Promise<SavedGroup[]> {
  if (getDataMode() === 'local') return local(db => db.groups);
  const { data, error } = await createClient().from('saved_groups').select('id, name, group_members(*)').order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(g => ({ id: g.id, name: g.name, people: [...g.group_members].sort((a,b) => a.sort_order - b.sort_order).map(m => ({ name: m.name, age: m.age, gender: m.gender, heightCm: Number(m.height_cm), weightKg: Number(m.weight_kg), activityLevel: m.activity_level })) })) as SavedGroup[];
}

export async function saveGroup(name: string, people: PersonInput[]): Promise<string> {
  validatePeople(people);
  if (!name.trim() || name.trim().length > 60) throw new Error('اسم المجموعة مطلوب وبحد أقصى 60 حرفًا.');
  if (getDataMode() === 'local') return local(db => {
    if (db.groups.some(g => g.name === name.trim())) throw new Error('اسم المجموعة مستخدم بالفعل.');
    const id = crypto.randomUUID();
    db.groups.push({ id, name: name.trim(), people });
    return id;
  });
  const { data, error } = await createClient().rpc('save_group', { p_name: name.trim(), p_people: people.map(p => ({ name: p.name, age: p.age, gender: p.gender, height_cm: p.heightCm, weight_kg: p.weightKg, activity_level: p.activityLevel })) });
  if (error) throw error;
  return data as string;
}

export async function deleteGroup(id: string): Promise<void> {
  if (getDataMode() === 'local') return local(db => { db.groups = db.groups.filter(g => g.id !== id); });
  const { error } = await createClient().from('saved_groups').delete().eq('id', id);
  if (error) throw error;
}
