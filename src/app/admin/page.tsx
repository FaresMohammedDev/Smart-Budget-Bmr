'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Plus,
  Flame,
  Check,
  X,
  Upload,
  AlertTriangle,
  RotateCcw,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { formatEgp, formatKcal } from '@/lib/format';
import { Meal } from '@/features/recommendations/domain/types';
import { createClient } from '@/lib/supabase/client';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // فورم إضافة وجبة جديدة
  const [newMeal, setNewMeal] = useState({
    name_ar: '',
    name_en: '',
    price: 100,
    discount_price: null as number | null,
    is_expiring_soon: false,
    kind: 'main' as const,
    portion_type: 'individual' as const,
    total_kcal: 600,
    image_url: '/images/meal-placeholder.svg',
  });

  // إحصائيات سريعة
  const [stats, setStats] = useState({
    totalOrders: 142,
    totalRevenue: 28450,
    paidOrders: 135,
    topSelling: [
      { name: 'ساندوتش شاورما فراخ', sales: 64, revenue: 5440 },
      { name: 'صينية مكرونة بشاميل عائلي', sales: 38, revenue: 9880 },
      { name: 'ربع فرخة مشوية بالأرز', sales: 29, revenue: 4640 },
      { name: 'بطاطس محمرة', sales: 52, revenue: 1820 },
    ],
  });

  // جلب الوجبات
  const loadAdminMeals = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        setMeals(
          data.map((m: any) => ({
            id: m.id,
            name_ar: m.name_ar,
            name_en: m.name_en,
            price: Number(m.price),
            discount_price: m.discount_price ? Number(m.discount_price) : null,
            is_expiring_soon: Boolean(m.is_expiring_soon),
            is_available: Boolean(m.is_available),
            total_kcal: Number(m.total_kcal),
            kind: m.kind,
            portion_type: m.portion_type,
            servings: m.servings,
            image_url: m.image_url || '/images/meal-placeholder.svg',
          }))
        );
      } else {
        // بيانات تجريبية في حالة عدم اتصال السيرفر
        setMeals([
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
            discount_price: 260,
            is_expiring_soon: true,
            is_available: true,
            total_kcal: 2800,
            kind: 'main',
            portion_type: 'shareable',
            servings: 4,
            image_url: '/images/meal-placeholder.svg',
          },
          {
            id: 'm3',
            name_ar: 'ربع فرخة مشوية بالأرز',
            name_en: 'Quarter Grilled Chicken',
            price: 160,
            is_expiring_soon: false,
            is_available: false, // غير متاح
            total_kcal: 850,
            kind: 'main',
            portion_type: 'individual',
            servings: 1,
            image_url: '/images/meal-placeholder.svg',
          },
        ]);
      }
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminMeals();
  }, []);

  // تبديل التوافر (Toggle Availability)
  const handleToggleAvailability = async (mealId: string, currentStatus: boolean) => {
    const updated = !currentStatus;
    setMeals((prev) =>
      prev.map((m) => (m.id === mealId ? { ...m, is_available: updated } : m))
    );

    try {
      const supabase = createClient();
      await supabase
        .from('meals')
        .update({ is_available: updated })
        .eq('id', mealId);
    } catch {
      //
    }
  };

  // تبديل حالة عرض قرب الصلاحية (Toggle Expiring Soon / Fresh Deal)
  const handleToggleExpiringSoon = async (mealId: string, currentStatus: boolean) => {
    const updated = !currentStatus;
    setMeals((prev) =>
      prev.map((m) => (m.id === mealId ? { ...m, is_expiring_soon: updated } : m))
    );

    try {
      const supabase = createClient();
      await supabase
        .from('meals')
        .update({ is_expiring_soon: updated })
        .eq('id', mealId);
    } catch {
      //
    }
  };

  // رفع صورة وجبة إلى Supabase Storage
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `meal-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('meal-images')
        .upload(fileName, file, { upsert: true });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from('meal-images')
          .getPublicUrl(fileName);

        setNewMeal((prev) => ({ ...prev, image_url: publicUrlData.publicUrl }));
      }
    } catch {
      //
    } finally {
      setUploadingImage(false);
    }
  };

  // إضافة وجبة جديدة
  const handleCreateMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from('meals').insert([
        {
          name_ar: newMeal.name_ar,
          name_en: newMeal.name_en || newMeal.name_ar,
          price: newMeal.price,
          discount_price: newMeal.discount_price,
          is_expiring_soon: newMeal.is_expiring_soon,
          kind: newMeal.kind,
          portion_type: newMeal.portion_type,
          total_kcal: newMeal.total_kcal,
          image_url: newMeal.image_url,
          is_available: true,
        },
      ]).select();

      if (!error && data) {
        await loadAdminMeals();
      } else {
        // إضافة محلية
        setMeals((prev) => [
          {
            id: `m-${Date.now()}`,
            name_ar: newMeal.name_ar,
            name_en: newMeal.name_en,
            price: newMeal.price,
            discount_price: newMeal.discount_price,
            is_expiring_soon: newMeal.is_expiring_soon,
            is_available: true,
            total_kcal: newMeal.total_kcal,
            kind: newMeal.kind,
            portion_type: newMeal.portion_type,
            servings: 1,
            image_url: newMeal.image_url,
          },
          ...prev,
        ]);
      }
      setShowAddModal(false);
    } catch {
      setShowAddModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col p-4 sm:p-8 space-y-8">
      {/* الرأس */}
      <header className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white">لوحة تحكم فتح الله ماركت</h1>
            <Badge variant="special">Admin Portal</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            إدارة المنيو، إحصائيات المبيعات، والتحكم الفوري في توافر الوجبات بالمطبخ
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={loadAdminMeals}>
            <RotateCcw className="w-4 h-4 ml-1.5" />
            تحديث
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/')}
            className="text-zinc-400 hover:text-white"
          >
            <LogOut className="w-4 h-4 ml-1.5" />
            الرجوع للكيوسك
          </Button>
        </div>
      </header>

      {/* كروت الإحصائيات (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>إجمالي الطلبات</span>
            <ShoppingBag className="w-4 h-4 text-[#F37A20]" />
          </div>
          <div className="text-2xl font-black text-white">{stats.totalOrders} طلب</div>
          <div className="text-[11px] text-emerald-400">منها {stats.paidOrders} مكتمل ومدفوع</div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>إجمالي الإيرادات</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{formatEgp(stats.totalRevenue)}</div>
          <div className="text-[11px] text-zinc-400">متوسط الطلب: {formatEgp(Math.round(stats.totalRevenue / stats.totalOrders))}</div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>الوجبات المتوفرة</span>
            <Flame className="w-4 h-4 text-[#F37A20]" />
          </div>
          <div className="text-2xl font-black text-white">
            {meals.filter((m) => m.is_available).length} من {meals.length}
          </div>
          <div className="text-[11px] text-amber-400">
            {meals.filter((m) => !m.is_available).length} صنف غير متوفر حالياً
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>عروض قرب الصلاحية</span>
            <Sparkles className="w-4 h-4 text-[#F37A20]" />
          </div>
          <div className="text-2xl font-black text-[#F37A20]">
            {meals.filter((m) => m.is_expiring_soon).length} وجبات
          </div>
          <div className="text-[11px] text-zinc-400">تظهر في صدارة الترشيحات بالكيوسك</div>
        </div>
      </div>

      {/* الوجبات الأكثر طلباً (Top Selling) */}
      <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4">
        <div className="flex items-center gap-2 font-bold text-base text-zinc-200">
          <TrendingUp className="w-5 h-5 text-[#F37A20]" />
          <span>الأكثر طلباً ومبيعاً (Top Selling):</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.topSelling.map((ts, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs"
            >
              <div>
                <div className="font-bold text-white">{ts.name}</div>
                <div className="text-zinc-400 mt-0.5">{ts.sales} وجبة بيعت</div>
              </div>
              <div className="text-emerald-400 font-black">{formatEgp(ts.revenue)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* جدول إدارة الوجبات والتحكم الفوري */}
      <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-zinc-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white">إدارة وجبات المطبخ والمنيو</h2>
            <p className="text-xs text-zinc-400">
              تحكم في توافر أي وجبة عند نفادها، أو فعّل شارة عرض التوفير للوجبات التي قاربت الصلاحية
            </p>
          </div>

          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            <span>إضافة وجبة جديدة</span>
          </Button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-500">جاري تحميل الوجبات...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="text-xs text-zinc-400 border-b border-zinc-800 pb-2">
                  <th className="pb-3 font-semibold">الوجبة</th>
                  <th className="pb-3 font-semibold">السعر</th>
                  <th className="pb-3 font-semibold">السعرات</th>
                  <th className="pb-3 font-semibold">النوع</th>
                  <th className="pb-3 font-semibold text-center">عرض قرب الصلاحية ⭐</th>
                  <th className="pb-3 font-semibold text-center">التوافر في المطبخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {meals.map((meal) => (
                  <tr key={meal.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3.5 flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-black border border-zinc-800 flex-shrink-0">
                        <Image
                          src={meal.image_url}
                          alt={meal.name_ar}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <div className="font-bold text-white">{meal.name_ar}</div>
                        <div className="text-xs text-zinc-400">{meal.name_en}</div>
                      </div>
                    </td>

                    <td className="py-3.5">
                      {meal.discount_price ? (
                        <div>
                          <div className="font-bold text-white">{formatEgp(meal.discount_price)}</div>
                          <div className="text-xs text-zinc-500 line-through">{formatEgp(meal.price)}</div>
                        </div>
                      ) : (
                        <div className="font-bold text-white">{formatEgp(meal.price)}</div>
                      )}
                    </td>

                    <td className="py-3.5 text-zinc-300">
                      {formatKcal(meal.total_kcal)}
                    </td>

                    <td className="py-3.5 text-xs text-zinc-400">
                      {meal.portion_type === 'shareable' ? 'تشاركي' : 'فردي'} ({meal.kind})
                    </td>

                    {/* زر التبديل لعرض قرب الصلاحية */}
                    <td className="py-3.5 text-center">
                      <button
                        onClick={() => handleToggleExpiringSoon(meal.id, meal.is_expiring_soon)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          meal.is_expiring_soon
                            ? 'bg-[#F37A20]/20 text-[#F37A20] border border-[#F37A20]/40 shadow-sm'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {meal.is_expiring_soon ? 'مُفعّل كعرض توفير ⭐' : 'عادي'}
                      </button>
                    </td>

                    {/* زر التبديل للتوافر (Toggle Availability) */}
                    <td className="py-3.5 text-center">
                      <button
                        onClick={() => handleToggleAvailability(meal.id, meal.is_available)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          meal.is_available
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-red-500/20 text-red-400 border border-red-500/40'
                        }`}
                      >
                        {meal.is_available ? 'متوفر بالمطبخ ✓' : 'غير متوفر (نافد) ✕'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* نافذة إضافة وجبة جديدة (Modal) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full relative shadow-2xl text-right max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 left-5 text-zinc-400 hover:text-white p-1 rounded-lg bg-zinc-800/60"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white mb-4">إضافة وجبة جديدة للمنيو</h3>

            <form onSubmit={handleCreateMeal} className="space-y-4">
              <Input
                label="اسم الوجبة بالعربي"
                value={newMeal.name_ar}
                onChange={(e) => setNewMeal({ ...newMeal, name_ar: e.target.value })}
                required
                placeholder="مثال: ساندوتش فاهيتا فراخ"
              />

              <Input
                label="اسم الوجبة بالإنجليزي"
                value={newMeal.name_en}
                onChange={(e) => setNewMeal({ ...newMeal, name_en: e.target.value })}
                placeholder="Chicken Fajita Sandwich"
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="السعر الأساسي (ج.م)"
                  type="number"
                  value={newMeal.price}
                  onChange={(e) => setNewMeal({ ...newMeal, price: Number(e.target.value) })}
                  required
                />
                <Input
                  label="سعر الخصم إن وجد (ج.م)"
                  type="number"
                  value={newMeal.discount_price ?? ''}
                  onChange={(e) =>
                    setNewMeal({
                      ...newMeal,
                      discount_price: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="اختياري"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="إجمالي السعرات (Kcal)"
                  type="number"
                  value={newMeal.total_kcal}
                  onChange={(e) => setNewMeal({ ...newMeal, total_kcal: Number(e.target.value) })}
                  required
                />

                <div className="space-y-1.5 text-right">
                  <label className="block text-sm font-semibold text-zinc-300">النوع</label>
                  <select
                    value={newMeal.kind}
                    onChange={(e) => setNewMeal({ ...newMeal, kind: e.target.value as any })}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 text-sm"
                  >
                    <option value="main">رئيسي</option>
                    <option value="side">جانبي</option>
                    <option value="drink">مشروب</option>
                  </select>
                </div>
              </div>

              {/* رفع الصورة أو استخدام Placeholder نظيف */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-zinc-300">
                  صورة الوجبة (رفع صورة أو استخدام الافتراضية)
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-black border border-zinc-800 flex-shrink-0">
                    <Image
                      src={newMeal.image_url}
                      alt="Preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <label className="flex-1 border-2 border-dashed border-zinc-700 hover:border-[#F37A20] rounded-xl p-3 text-center cursor-pointer transition-colors text-xs text-zinc-400 flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4 text-[#F37A20]" />
                    <span>{uploadingImage ? 'جاري الرفع...' : 'رفع صورة من الجهاز'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* تحديد ما إذا كانت أوشكت على الصلاحية */}
              <label className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newMeal.is_expiring_soon}
                  onChange={(e) => setNewMeal({ ...newMeal, is_expiring_soon: e.target.checked })}
                  className="w-4 h-4 accent-[#F37A20]"
                />
                <span className="text-xs text-zinc-300 font-bold">
                  تحديد كوجبة قربت صلاحيتها (عرض توفير طازج يتصدر الترشيحات بالكيوسك)
                </span>
              </label>

              <Button type="submit" size="lg" className="w-full mt-4">
                حفظ وإضافة الوجبة
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
