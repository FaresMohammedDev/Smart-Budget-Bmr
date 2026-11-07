'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ShoppingBag,
  Banknote,
  UtensilsCrossed,
  Sparkles,
  Trophy,
  Plus,
  Pencil,
  Trash2,
  Upload,
  X,
  Search,
  LogOut,
  RotateCcw,
  Flame,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useCountUp } from '@/components/people/KcalRing';
import { getMealMacros } from '@/features/nutrition/domain/macros';
import { formatEgp, formatKcal } from '@/lib/format';
import { Meal } from '@/features/recommendations/domain/types';
import { listMeals, saveMeal, deleteMeal, uploadMealImage, getStats, errorMessage } from '@/lib/data/repository';

interface MealForm {
  id?: string;
  name_ar: string;
  name_en: string;
  price: number;
  discount_price: number | null;
  is_expiring_soon: boolean;
  kind: Meal['kind'];
  portion_type: Meal['portion_type'];
  total_kcal: number;
  carbs_g: number | null;
  protein_g: number | null;
  fat_g: number | null;
  servings: number;
  image_url: string;
}

const EMPTY_FORM: MealForm = {
  name_ar: '',
  name_en: '',
  price: 100,
  discount_price: null,
  is_expiring_soon: false,
  kind: 'main',
  portion_type: 'individual',
  total_kcal: 600,
  carbs_g: null,
  protein_g: null,
  fat_g: null,
  servings: 1,
  image_url: '/images/meal-placeholder.svg',
};

const KINDS: { id: Meal['kind']; label: string }[] = [
  { id: 'main', label: 'رئيسي' },
  { id: 'side', label: 'جانبي' },
  { id: 'drink', label: 'مشروب' },
  { id: 'dessert', label: 'حلوى' },
];

const KIND_LABEL: Record<string, string> = { main: 'رئيسي', side: 'جانبي', drink: 'مشروب', dessert: 'حلوى' };

type ListFilter = 'all' | 'available' | 'out' | 'offers';

const FIELD =
  'w-full h-12 rounded-xl bg-white border-2 border-[#D6C7B2] px-3.5 font-bold text-base focus:outline-none focus:border-[#6B0F1A] placeholder:text-stone-400 placeholder:font-semibold';

function Switch({ on, onChange, label, tone = 'green' }: { on: boolean; onChange: () => void; label: string; tone?: 'green' | 'amber' }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={`relative w-14 h-8 rounded-full border-2 transition-colors duration-300 cursor-pointer shrink-0 ${
        on ? (tone === 'green' ? 'bg-emerald-500 border-emerald-600' : 'bg-[#E5A91E] border-[#D97706]') : 'bg-stone-200 border-stone-300'
      }`}
    >
      <span
        className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 ${on ? 'right-[1.65rem]' : 'right-0.5'}`}
      />
    </button>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 min-w-0">
      <span className="text-sm font-black text-stone-600 px-0.5">{label}</span>
      {children}
    </label>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<MealForm | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Meal | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState('');
  const [listFilter, setListFilter] = useState<ListFilter>('all');
  const fileRef = useRef<HTMLInputElement>(null);

  const [stats, setStats] = useState<{
    totalOrders: number;
    totalRevenue: number;
    paidOrders: number;
    topSelling: { name: string; sales: number; revenue: number }[];
  }>({ totalOrders: 0, totalRevenue: 0, paidOrders: 0, topSelling: [] });

  // جلب الوجبات والإحصائيات الحية
  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [menu, summary] = await Promise.all([listMeals(), getStats()]);
      setMeals(menu);
      setStats(summary);
      setErrorMsg('');
    } catch (error) {
      setErrorMsg(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    Promise.all([listMeals(), getStats()])
      .then(([menu, summary]) => { setMeals(menu); setStats(summary); })
      .catch((error) => setErrorMsg(errorMessage(error)))
      .finally(() => setLoading(false));
  }, []);

  const handleToggleAvailability = async (id: string, current: boolean) => {
    try { await saveMeal({ is_available: !current }, id); await loadAdminData(); }
    catch (error) { setErrorMsg(errorMessage(error)); }
  };
  const handleToggleExpiringSoon = async (id: string, current: boolean) => {
    try { await saveMeal({ is_expiring_soon: !current }, id); await loadAdminData(); }
    catch (error) { setErrorMsg(errorMessage(error)); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadMealImage(file);
      setForm((prev) => (prev ? { ...prev, image_url: url } : prev));
    } catch (error) { setErrorMsg(errorMessage(error)); }
    finally { setUploading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || saving) return;
    setSaving(true);
    try {
      const { id, name_ar, name_en, price, discount_price, total_kcal, carbs_g, protein_g, fat_g, kind, portion_type, servings, image_url, is_expiring_soon } = form;
      if (id) {
        await saveMeal({ name_ar, name_en, price, discount_price, total_kcal, carbs_g, protein_g, fat_g, kind, portion_type, servings, image_url, is_expiring_soon }, id);
      } else {
        await saveMeal({ name_ar, name_en: name_en.trim() || `meal-${crypto.randomUUID()}`, price, discount_price, total_kcal, carbs_g, protein_g, fat_g, kind, portion_type, servings, image_url, is_expiring_soon, is_available: true });
      }
      setForm(null);
      await loadAdminData();
    } catch (error) { setErrorMsg(errorMessage(error)); }
    finally { setSaving(false); }
  };

  const handleDeleteMeal = async (meal: Meal) => {
    setDeletingId(meal.id);
    try { await deleteMeal(meal.id); setConfirmDelete(null); await loadAdminData(); }
    catch (error) { setErrorMsg(errorMessage(error)); }
    finally { setDeletingId(null); }
  };

  const num = (v: string) => (v === '' ? null : Number(v));
  const set = <K extends keyof MealForm>(key: K, value: MealForm[K]) => setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const availableCount = meals.filter((m) => m.is_available).length;
  const offersCount = meals.filter((m) => m.is_expiring_soon).length;
  const avgOrder = stats.totalOrders > 0 ? Math.round(stats.totalRevenue / stats.totalOrders) : 0;

  const ordersShown = useCountUp(stats.totalOrders);
  const revenueShown = useCountUp(Math.round(stats.totalRevenue), 600);
  const availableShown = useCountUp(availableCount);
  const offersShown = useCountUp(offersCount);

  const visibleMeals = meals.filter((m) => {
    const q = query.trim().toLowerCase();
    if (q && !m.name_ar.toLowerCase().includes(q) && !m.name_en.toLowerCase().includes(q)) return false;
    if (listFilter === 'available') return m.is_available;
    if (listFilter === 'out') return !m.is_available;
    if (listFilter === 'offers') return m.is_expiring_soon;
    return true;
  });

  const glass =
    'rounded-[2rem] bg-white/90 backdrop-blur border-2 border-[#E7D7C7] shadow-[0_18px_40px_-22px_rgba(43,24,16,0.35)]';

  const kpis = [
    { label: 'الطلبات', value: ordersShown.toLocaleString('en-US'), sub: `${stats.paidOrders} مدفوع`, icon: ShoppingBag, tone: 'from-[#8B1422] to-[#6B0F1A]' },
    { label: 'الإيراد', value: `${revenueShown.toLocaleString('en-US')}`, unit: 'ج.م', sub: `متوسط ${avgOrder} ج.م`, icon: Banknote, tone: 'from-emerald-500 to-emerald-700' },
    { label: 'المتاح', value: availableShown.toLocaleString('en-US'), unit: `من ${meals.length}`, sub: `${meals.length - availableCount} نافد`, icon: UtensilsCrossed, tone: 'from-[#E5A91E] to-[#D97706]' },
    { label: 'العروض', value: offersShown.toLocaleString('en-US'), sub: 'بتظهر الأول', icon: Sparkles, tone: 'from-sky-500 to-sky-700' },
  ];

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#F8F4EE] text-[#1E1210] flex flex-col">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="anim-blob absolute -top-32 -right-24 w-[30rem] h-[30rem] rounded-full bg-[#6B0F1A]/12 blur-3xl" />
        <div className="anim-blob-slow absolute -bottom-40 -left-28 w-[34rem] h-[34rem] rounded-full bg-[#E5A91E]/20 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b-2 border-[#E7D7C7] px-4 sm:px-8 py-3 flex items-center gap-3">
        <h1 dir="ltr" className="text-2xl font-black tracking-tight">
          Smart <span className="text-[#6B0F1A]">Budget</span>
        </h1>
        <span className="px-4 py-1.5 rounded-full bg-[#6B0F1A] text-white text-sm font-black">الأدمن</span>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={loadAdminData} className="font-bold text-xs">
          <RotateCcw className={`w-4 h-4 ml-1.5 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push('/')} className="font-bold text-xs text-red-700">
          <LogOut className="w-4 h-4 ml-1.5" />
          خروج
        </Button>
      </header>

      {errorMsg && (
        <p role="alert" className="anim-fade-up fixed top-16 left-1/2 -translate-x-1/2 z-[70] px-6 py-3 rounded-full bg-red-700 text-white font-black text-sm shadow-2xl">
          {errorMsg}
        </p>
      )}

      <main className="relative z-10 w-full max-w-[92rem] mx-auto px-4 sm:px-6 py-5 flex flex-col gap-5">
        {/* المؤشرات */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k, i) => (
            <div key={k.label} className={`${glass} anim-fade-up p-4 flex items-center gap-3.5`} style={{ animationDelay: `${i * 70}ms` }}>
              <span className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${k.tone} text-white flex items-center justify-center shrink-0 shadow-lg`}>
                <k.icon className="w-7 h-7" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-black text-stone-500">{k.label}</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black tabular-nums leading-tight">{k.value}</span>
                  {k.unit && <span className="text-sm font-black text-stone-500">{k.unit}</span>}
                </div>
                <div className="text-xs font-bold text-stone-400 tabular-nums">{k.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* الأكثر مبيعًا */}
        <div className={`${glass} anim-fade-up p-4`} style={{ animationDelay: '280ms' }}>
          <div className="flex items-center gap-2 font-black mb-3">
            <Trophy className="w-5 h-5 text-[#E5A91E]" />
            <span>الأكثر مبيعًا</span>
          </div>
          {stats.topSelling.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {stats.topSelling.slice(0, 4).map((t, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl bg-[#F8F4EE] border-2 border-[#E7D7C7] p-3">
                  <span className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg shrink-0 ${i === 0 ? 'bg-[#E5A91E] text-[#3E080F]' : 'bg-white border-2 border-[#D6C7B2] text-stone-600'}`}>
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-black truncate">{t.name}</div>
                    <div className="text-xs font-bold text-stone-500 tabular-nums">{t.sales} مبيعة</div>
                  </div>
                  <div className="font-black text-emerald-700 tabular-nums shrink-0">{formatEgp(t.revenue)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-3 text-center text-stone-400 font-bold">لا مبيعات بعد</div>
          )}
        </div>

        {/* الوجبات */}
        <div className={`${glass} anim-fade-up p-4 sm:p-5 flex flex-col gap-4`} style={{ animationDelay: '360ms' }}>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-black">الوجبات</h2>
            <div className="relative flex-1 min-w-[12rem] max-w-md">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="بحث"
                aria-label="بحث"
                className="w-full h-12 rounded-2xl bg-white border-2 border-[#D6C7B2] pr-11 pl-4 font-bold focus:outline-none focus:border-[#6B0F1A]"
              />
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 pointer-events-none" />
            </div>
            <div className="flex items-center gap-1.5">
              {([['all', 'الكل'], ['available', 'متاح'], ['out', 'نافد'], ['offers', 'عروض']] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setListFilter(id)}
                  className={`h-11 px-4 rounded-full border-2 font-black text-sm transition-all cursor-pointer ${
                    listFilter === id ? 'bg-[#6B0F1A] text-white border-[#3E080F]' : 'bg-white border-[#D6C7B2] text-stone-600 hover:border-[#6B0F1A]/50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex-1" />
            <Button onClick={() => setForm({ ...EMPTY_FORM })} className="gap-2 font-black">
              <Plus className="w-5 h-5 stroke-[3]" />
              <span>إضافة</span>
            </Button>
          </div>

          <div className="hidden lg:grid grid-cols-[3.5rem_minmax(0,1.7fr)_6.5rem_minmax(0,1.4fr)_5rem_4.5rem_4.5rem_6rem] gap-3 px-3 text-xs font-black text-stone-400">
            <span />
            <span>الوجبة</span>
            <span>السعر</span>
            <span>السعرات</span>
            <span>النوع</span>
            <span className="text-center">عرض</span>
            <span className="text-center">متاح</span>
            <span />
          </div>

          <div className="space-y-2">
            {loading && meals.length === 0 ? (
              Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-2xl bg-white/70 border-2 border-[#E7D7C7] animate-pulse" />)
            ) : visibleMeals.length === 0 ? (
              <div className="py-10 text-center font-black text-stone-400">مفيش وجبات</div>
            ) : (
              visibleMeals.map((meal, idx) => {
                const m = getMealMacros(meal);
                return (
                  <div
                    key={meal.id}
                    className={`anim-fade-up grid grid-cols-[3.5rem_1fr_auto] lg:grid-cols-[3.5rem_minmax(0,1.7fr)_6.5rem_minmax(0,1.4fr)_5rem_4.5rem_4.5rem_6rem] items-center gap-3 rounded-2xl border-2 px-3 py-2.5 transition-colors ${
                      meal.is_available ? 'bg-white border-[#E7D7C7] hover:border-[#6B0F1A]/40' : 'bg-stone-50 border-stone-200 opacity-75'
                    }`}
                    style={{ animationDelay: `${Math.min(idx, 10) * 25}ms` }}
                  >
                    <span className="relative w-14 h-14 rounded-xl overflow-hidden bg-stone-200">
                      <Image src={meal.image_url || '/images/meal-placeholder.svg'} alt="" fill unoptimized className="object-cover" />
                    </span>

                    <div className="min-w-0">
                      <div className="font-black truncate">{meal.name_ar}</div>
                      <div dir="ltr" className="text-xs text-stone-400 truncate text-right">{meal.name_en}</div>
                    </div>

                    <div className="lg:contents flex items-center gap-2 col-span-3 lg:col-span-1 order-last lg:order-none flex-wrap pt-1 lg:pt-0 border-t border-[#EADBCB] lg:border-0">
                      <div className="font-black tabular-nums leading-tight">
                        {meal.discount_price ? (
                          <>
                            <div className="text-[#6B0F1A]">{formatEgp(meal.discount_price)}</div>
                            <div className="text-xs text-stone-400 line-through">{formatEgp(meal.price)}</div>
                          </>
                        ) : (
                          <div className="text-[#6B0F1A]">{formatEgp(meal.price)}</div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1 text-sm font-black tabular-nums text-stone-600">
                          <Flame className="w-3.5 h-3.5 text-[#E5A91E]" />
                          {formatKcal(meal.total_kcal)}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-black tabular-nums mt-0.5">
                          <span className="px-1.5 rounded bg-amber-50 text-amber-800">{m.estimated ? '~' : ''}{Math.round(m.carbsG)}</span>
                          <span className="px-1.5 rounded bg-rose-50 text-rose-800">{m.estimated ? '~' : ''}{Math.round(m.proteinG)}</span>
                          <span className="px-1.5 rounded bg-sky-50 text-sky-800">{m.estimated ? '~' : ''}{Math.round(m.fatG)}</span>
                        </div>
                      </div>

                      <span className="text-xs font-black text-stone-500">
                        {KIND_LABEL[meal.kind] ?? meal.kind}
                        {meal.portion_type === 'shareable' && <span className="block text-[#6B0F1A]">تشاركي</span>}
                      </span>

                      <div className="flex justify-center">
                        <Switch on={meal.is_expiring_soon} onChange={() => handleToggleExpiringSoon(meal.id, meal.is_expiring_soon)} label="عرض" tone="amber" />
                      </div>
                      <div className="flex justify-center">
                        <Switch on={meal.is_available} onChange={() => handleToggleAvailability(meal.id, meal.is_available)} label="متاح" />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 row-start-1 col-start-3 lg:row-auto lg:col-auto">
                      <button
                        type="button"
                        aria-label="تعديل"
                        onClick={() => setForm({ ...EMPTY_FORM, ...meal, discount_price: meal.discount_price ?? null, carbs_g: meal.carbs_g ?? null, protein_g: meal.protein_g ?? null, fat_g: meal.fat_g ?? null })}
                        className="w-11 h-11 rounded-xl bg-[#F8F4EE] border-2 border-[#E7D7C7] text-stone-700 hover:text-[#6B0F1A] hover:border-[#6B0F1A]/50 transition-colors cursor-pointer flex items-center justify-center"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        aria-label="حذف"
                        disabled={deletingId === meal.id}
                        onClick={() => setConfirmDelete(meal)}
                        className="w-11 h-11 rounded-xl bg-red-50 border-2 border-red-100 text-red-600 hover:bg-red-100 transition-colors cursor-pointer flex items-center justify-center"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* نافذة الإضافة / التعديل */}
      {form && (
        <div className="fixed inset-0 z-50 bg-[#1E1210]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmit}
            className="anim-fade-up bg-white border-2 border-[#6B0F1A] rounded-[2rem] w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl relative"
          >
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur flex items-center gap-3 px-6 py-4 border-b-2 border-[#EADBCB]">
              <h3 className="text-2xl font-black flex-1">{form.id ? 'تعديل' : 'وجبة جديدة'}</h3>
              <button type="button" aria-label="إغلاق" onClick={() => setForm(null)} className="w-10 h-10 rounded-full bg-stone-100 text-stone-500 hover:text-stone-800 cursor-pointer flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-[13rem_1fr] gap-6">
              <div className="flex flex-col gap-3">
                <div className="relative aspect-square rounded-3xl overflow-hidden bg-stone-100 border-2 border-[#E7D7C7]">
                  <Image src={form.image_url || '/images/meal-placeholder.svg'} alt="" fill unoptimized className="object-cover" />
                  {uploading && (
                    <span className="absolute inset-0 bg-white/70 flex items-center justify-center">
                      <span className="w-8 h-8 border-4 border-[#6B0F1A] border-t-transparent rounded-full animate-spin" />
                    </span>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleImageUpload} className="hidden" />
                <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2 font-black">
                  <Upload className="w-5 h-5" />
                  <span>رفع صورة</span>
                </Button>
                <input
                  value={form.image_url}
                  onChange={(e) => set('image_url', e.target.value)}
                  placeholder="رابط الصورة"
                  aria-label="رابط الصورة"
                  dir="ltr"
                  className={`${FIELD} h-11 text-sm`}
                />
              </div>

              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Labeled label="الاسم">
                    <input required value={form.name_ar} onChange={(e) => set('name_ar', e.target.value)} className={FIELD} placeholder="ساندوتش فاهيتا" />
                  </Labeled>
                  <Labeled label="الاسم (EN)">
                    <input dir="ltr" value={form.name_en} onChange={(e) => set('name_en', e.target.value)} className={FIELD} placeholder="Fajita sandwich" />
                  </Labeled>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <Labeled label="السعر">
                    <input required type="number" min={0} step="any" value={form.price} onChange={(e) => set('price', Number(e.target.value))} className={FIELD} />
                  </Labeled>
                  <Labeled label="سعر الخصم">
                    <input type="number" min={0} step="any" value={form.discount_price ?? ''} onChange={(e) => set('discount_price', num(e.target.value))} placeholder="بدون" className={FIELD} />
                  </Labeled>
                  <Labeled label="السعرات">
                    <input required type="number" min={0} value={form.total_kcal} onChange={(e) => set('total_kcal', Number(e.target.value))} className={FIELD} />
                  </Labeled>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {([['carbs_g', 'كارب (جم)'], ['protein_g', 'بروتين (جم)'], ['fat_g', 'دهون (جم)']] as const).map(([key, label]) => (
                    <Labeled key={key} label={label}>
                      <input type="number" min={0} step="any" value={form[key] ?? ''} onChange={(e) => set(key, num(e.target.value))} placeholder="تقديري" className={FIELD} />
                    </Labeled>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-black text-stone-600 px-0.5">النوع</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {KINDS.map((k) => (
                        <button
                          key={k.id}
                          type="button"
                          onClick={() => set('kind', k.id)}
                          className={`h-12 rounded-xl border-2 font-black text-sm transition-all cursor-pointer ${form.kind === k.id ? 'bg-[#6B0F1A] text-white border-[#3E080F]' : 'bg-white border-[#D6C7B2] text-stone-600 hover:border-[#6B0F1A]/50'}`}
                        >
                          {k.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-black text-stone-600 px-0.5">التقديم</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {([['individual', 'فردي'], ['shareable', 'تشاركي']] as const).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => set('portion_type', id)}
                          className={`h-12 rounded-xl border-2 font-black text-sm transition-all cursor-pointer ${form.portion_type === id ? 'bg-[#6B0F1A] text-white border-[#3E080F]' : 'bg-white border-[#D6C7B2] text-stone-600 hover:border-[#6B0F1A]/50'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 items-end">
                  <Labeled label="عدد الحصص">
                    <input type="number" min={1} max={30} value={form.servings} onChange={(e) => set('servings', Number(e.target.value))} className={FIELD} />
                  </Labeled>
                  <div className="flex items-center justify-between h-12 rounded-xl border-2 border-[#D6C7B2] px-3.5">
                    <span className="font-black text-sm flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#E5A91E]" />
                      عرض
                    </span>
                    <Switch on={form.is_expiring_soon} onChange={() => set('is_expiring_soon', !form.is_expiring_soon)} label="عرض" tone="amber" />
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white/95 backdrop-blur flex items-center gap-3 px-6 py-4 border-t-2 border-[#EADBCB]">
              <Button type="submit" size="lg" variant="primary" disabled={saving || uploading} className="flex-1 font-black text-lg">
                {saving ? '...' : 'حفظ'}
              </Button>
              <Button type="button" size="lg" variant="outline" onClick={() => setForm(null)} className="font-black">
                إلغاء
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* تأكيد الحذف */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] bg-[#1E1210]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="anim-fade-up bg-white border-2 border-red-300 rounded-[2rem] p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <span className="mx-auto w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
              <Trash2 className="w-8 h-8" />
            </span>
            <h3 className="text-xl font-black">حذف الصنف من المنيو؟</h3>
            <p className="font-bold text-stone-500 truncate">{confirmDelete.name_ar}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleDeleteMeal(confirmDelete)}
                disabled={deletingId === confirmDelete.id}
                className="flex-1 h-14 rounded-2xl bg-red-600 text-white font-black text-lg border-2 border-red-800 shadow-[0_4px_0_0_#991b1b] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
              >
                {deletingId === confirmDelete.id ? '...' : 'حذف'}
              </button>
              <Button type="button" variant="outline" size="lg" onClick={() => setConfirmDelete(null)} className="font-black">
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
