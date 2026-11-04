'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ShieldCheck,
  Flame,
  Wallet,
  Users,
  ArrowLeft,
  X,
  UtensilsCrossed,
  Zap,
  CreditCard,
  ChefHat,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { usePlannerStore } from '@/features/planner/store/planner.store';
import { createClient } from '@/lib/supabase/client';

export default function WelcomePage() {
  const router = useRouter();
  const { setOrderMode, resetKiosk } = usePlannerStore();
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [email, setEmail] = useState('admin@fathalla.com');
  const [password, setPassword] = useState('admin123');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // مودال تسجيل دخول العميل لاسترجاع مجموعاته
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerAuthMode, setCustomerAuthMode] = useState<'login' | 'register'>('login');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPassword, setCustomerPassword] = useState('');
  const [customerFullName, setCustomerFullName] = useState('');
  const [customerError, setCustomerError] = useState('');
  const [customerLoading, setCustomerLoading] = useState(false);

  // بدء وضع السعرات الذكية مباشرة بدون أي تعقيد
  const handleStartSmartBudget = () => {
    resetKiosk();
    setOrderMode('smart_budget');
    router.push('/plan/people');
  };

  // بدء وضع الطلب المباشر السريع من المنيو
  const handleStartQuickMenu = () => {
    resetKiosk();
    setOrderMode('quick_menu');
    router.push('/menu');
  };

  // تسجيل دخول العميل
  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomerError('');
    setCustomerLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: customerEmail,
        password: customerPassword,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setCustomerError('البريد أو كلمة المرور غير صحيحة. اضغط على إنشاء حساب جديد إن لم يكن لديك حساب.');
        } else {
          setCustomerError(error.message);
        }
        setCustomerLoading(false);
        return;
      }

      if (data?.user) {
        resetKiosk();
        setOrderMode('smart_budget');
        setShowCustomerModal(false);
        router.push('/plan/people');
      }
    } catch (err: unknown) {
      setCustomerError(err instanceof Error ? err.message : 'حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setCustomerLoading(false);
    }
  };

  // إنشاء حساب عميل جديد
  const handleCustomerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomerError('');
    setCustomerLoading(true);

    if (!customerFullName.trim()) {
      setCustomerError('يرجى كتابة اسمك الكريم بالكامل');
      setCustomerLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: customerEmail,
        password: customerPassword,
        options: {
          data: {
            full_name: customerFullName.trim(),
          },
        },
      });

      if (error) {
        const lower = error.message.toLowerCase();
        if (lower.includes('signups are disabled') || lower.includes('signup is disabled')) {
          setCustomerError('التسجيل الجديد مغلق في إعدادات Supabase Auth. يمكنك تسجيل الدخول بحساب سابق.');
        } else if (lower.includes('rate limit')) {
          setCustomerError('تم تجاوز حد إرسال إيميلات التأكيد. يمكنك استخدام حسابك السابق أو المتابعة مباشرة.');
        } else {
          setCustomerError(error.message);
        }
        setCustomerLoading(false);
        return;
      }

      if (data?.user) {
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: customerEmail,
            full_name: customerFullName.trim(),
            role: 'customer',
          });
        } catch {
          //
        }
        resetKiosk();
        setOrderMode('smart_budget');
        setShowCustomerModal(false);
        router.push('/plan/people');
      }
    } catch (err: unknown) {
      setCustomerError(err instanceof Error ? err.message : 'حدث خطأ في إنشاء الحساب');
    } finally {
      setCustomerLoading(false);
    }
  };

  // تسجيل دخول طاقم العمل (أدمن أو كاشير)
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setLoginError('بيانات الدخول غير صحيحة. تأكد من البريد وكلمة المرور.');
        setIsLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profile?.role === 'cashier') {
        router.push('/cashier');
      } else {
        router.push('/admin');
      }
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  // دخول سريع تجريبي كعميل للتجربة الفورية
  const handleQuickCustomerDemo = () => {
    resetKiosk();
    setOrderMode('smart_budget');
    setShowCustomerModal(false);
    router.push('/plan/people');
  };

  return (
    <main className="min-h-screen bg-[#F8F4EE] text-[#1E1210] flex flex-col justify-between p-4 sm:p-8 relative select-none">
      {/* شريط ألوان المطاعم الشهي في أعلى الشاشة: نبيتي شواء داكن + ذهبي خردل */}
      <div className="h-2 w-full bg-gradient-to-r from-[#6B0F1A] via-[#E5A91E] to-[#6B0F1A] absolute top-0 left-0 right-0 z-20" />

      {/* الرأس واللوجو الرسمي وأزرار الاختصار السريعة */}
      <header className="flex items-center justify-between z-10 max-w-6xl mx-auto w-full pt-3 flex-wrap gap-3">
        <div className="flex items-center gap-3.5">
          <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-white border-2 border-[#6B0F1A] p-1.5 shadow-sm flex items-center justify-center">
            <Image
              src="/images/fathalla-logo.png"
              alt="فتح الله ماركت"
              width={52}
              height={52}
              priority
              className="object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-[#1E1210] tracking-tight">
                فتح الله ماركت
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-[#6B0F1A] text-white font-extrabold shadow-xs">
                <UtensilsCrossed className="w-3 h-3 stroke-[2.5]" />
                <span>المطعم والوجبات الطازجة</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#854D0E] font-bold flex items-center gap-1 mt-0.5">
              <Zap className="w-3.5 h-3.5 text-[#6B0F1A] stroke-[2.5]" />
              <span>قسم الوجبات الجاهزة الساخنة · كيوسك الخدمة الذاتية</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* أزرار التجربة السريعة (Testing Fast-Track) أثناء الاختبار والتقييم */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white border-2 border-[#E7D7C7] shadow-xs">
            <span className="text-[10px] font-black text-[#5C4535] px-1.5">اختبار سريع:</span>
            <Button
              size="sm"
              onClick={() => router.push('/cashier')}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs px-2.5 py-1 rounded-xl shadow-xs border-0"
              title="دخول فوري مباشر لشاشة الكاشير للتجربة"
            >
              <CreditCard className="w-3.5 h-3.5 ml-1" />
              <span>كاشير (POS)</span>
            </Button>

            <Button
              size="sm"
              onClick={() => router.push('/admin')}
              className="bg-[#854D0E] hover:bg-[#683C0A] text-white font-black text-xs px-2.5 py-1 rounded-xl shadow-xs border-0"
              title="دخول فوري مباشر للوحة إدارة المطبخ للتجربة"
            >
              <ChefHat className="w-3.5 h-3.5 ml-1" />
              <span>مطبخ (Admin)</span>
            </Button>
          </div>

          {/* أزرار تسجيل الدخول العادية */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCustomerError('');
              setCustomerAuthMode('login');
              setShowCustomerModal(true);
            }}
            className="font-bold text-xs"
          >
            <Users className="w-4 h-4 ml-1.5 text-[#6B0F1A] stroke-[2.25]" />
            <span>حساب العميل</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowStaffModal(true)}
            className="text-stone-700 hover:text-stone-900 font-bold text-xs"
          >
            <ShieldCheck className="w-4 h-4 ml-1.5 text-[#6B0F1A] stroke-[2.25]" />
            <span>دخول الإدارة</span>
          </Button>
        </div>
      </header>

      {/* المحتوى الرئيسي للكيوسك المعلق بالعرض (Landscape Side-by-Side) */}
      <div className="my-auto py-6 z-10 max-w-6xl mx-auto w-full text-center space-y-7">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#FAF0F0] border-2 border-[#6B0F1A] text-xs sm:text-sm font-black text-[#6B0F1A] shadow-xs">
            <Flame className="w-4 h-4 text-[#6B0F1A] stroke-[2.5]" />
            <span>وجبات طازجة يومياً على الفحم · محسوبة بالسعرات على قد ميزانيتك</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-[#1E1210] leading-tight">
            أهلاً بكم في مطعم <span className="text-[#6B0F1A]">فتح الله ماركت</span>
          </h2>
          <p className="text-base sm:text-lg text-stone-700 max-w-2xl mx-auto font-bold leading-relaxed">
            اختر وجبتك الذكية محسوبة بالسعرات والميزانية لتشبعك تماماً بدون أي هدر، أو تصفح المنيو واطلب أكلاتك المفضلة فوراً.
          </p>
        </div>

        {/* كارتين الاختيار الرئيسيين بالعرض (Landscape Side-by-Side) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-right max-w-5xl mx-auto items-stretch">
          {/* الكارت 1: السعرات والميزانية الذكية (Smart Budget) */}
          <div
            onClick={handleStartSmartBudget}
            className="group relative p-7 sm:p-8 rounded-[32px] bg-white border-3 border-[#6B0F1A] hover:border-[#3E080F] transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-[#6B0F1A]/20 cursor-pointer flex flex-col justify-between space-y-6"
          >
            <div className="space-y-5">
              {/* صورة هيرو شهية للكارت 1 مع ختم وشريط التمييز */}
              <div className="relative w-full h-52 sm:h-56 rounded-2xl overflow-hidden shadow-md border border-stone-200">
                <Image
                  src="https://images.unsplash.com/photo-1544025162-d76694265947?w=900&auto=format&fit=crop&q=80"
                  alt="احسبها ذكية"
                  fill
                  unoptimized
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-black px-3.5 py-1.5 rounded-full bg-[#6B0F1A] text-white border border-white/20 shadow-md">
                    <Zap className="w-3.5 h-3.5 text-amber-300 stroke-[2.5]" />
                    <span>حساب ذكي وتوفير عالي</span>
                  </span>
                </div>
                <div className="absolute bottom-3 right-3 left-3 flex items-center justify-between text-white">
                  <span className="text-xs font-black bg-black/60 px-3 py-1 rounded-lg backdrop-blur-xs">
                    0% هدر للأكل والفلوس
                  </span>
                  <span className="text-xs font-black text-amber-300">الأشبع والأوفر</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl sm:text-3xl font-black text-[#1E1210] group-hover:text-[#6B0F1A] transition-colors">
                    احسبها ذكية (Smart Budget)
                  </h3>
                </div>
                <p className="text-sm sm:text-base text-stone-600 mt-2 leading-relaxed font-semibold">
                  حدد ميزانيتك وعددكم، ونرشحلك أفضل تشكيلة وجبات طازجة تشبعكم تماماً بدون أي هدر للأكل أو الفلوس.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-1 text-xs font-extrabold">
                <span className="flex items-center gap-1.5 bg-[#FAF0F0] px-3.5 py-2 rounded-xl border border-[#6B0F1A]/20 text-[#6B0F1A]">
                  <Flame className="w-4 h-4 text-[#6B0F1A] stroke-[2.25]" /> محسوبة بالسعرات
                </span>
                <span className="flex items-center gap-1.5 bg-[#FEF9EE] px-3.5 py-2 rounded-xl border border-[#D97706]/30 text-[#854D0E]">
                  <Wallet className="w-4 h-4 text-[#D97706] stroke-[2.25]" /> على قد ميزانيتك
                </span>
                <span className="flex items-center gap-1.5 bg-stone-100 px-3.5 py-2 rounded-xl border border-stone-300 text-stone-800">
                  <Users className="w-4 h-4 text-stone-700 stroke-[2.25]" /> فرد أو عائلة
                </span>
              </div>
            </div>

            <Button
              size="xl"
              variant="primary"
              className="w-full flex items-center justify-center gap-2.5 py-4 text-lg font-black"
            >
              <span>ابدأ طلبك الذكي الآن</span>
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1.5 transition-transform stroke-[2.5]" />
            </Button>
          </div>

          {/* الكارت 2: الطلب السريع المباشر (Direct Menu) */}
          <div
            onClick={handleStartQuickMenu}
            className="group relative p-7 sm:p-8 rounded-[32px] bg-white border-3 border-[#D97706] hover:border-[#854D0E] transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-[#D97706]/20 cursor-pointer flex flex-col justify-between space-y-6"
          >
            <div className="space-y-5">
              {/* صورة هيرو شهية للكارت 2 مع ختم وشريط التمييز */}
              <div className="relative w-full h-52 sm:h-56 rounded-2xl overflow-hidden shadow-md border border-stone-200">
                <Image
                  src="https://images.unsplash.com/photo-1562967914-608f82629710?w=900&auto=format&fit=crop&q=80"
                  alt="قائمة الأكلات والطلب السريع"
                  fill
                  unoptimized
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-black px-3.5 py-1.5 rounded-full bg-[#D97706] text-white border border-white/20 shadow-md">
                    <UtensilsCrossed className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                    <span>طلب مباشر وسريع</span>
                  </span>
                </div>
                <div className="absolute bottom-3 right-3 left-3 flex items-center justify-between text-white">
                  <span className="text-xs font-black bg-black/60 px-3 py-1 rounded-lg backdrop-blur-xs">
                    14 وجبة طازجة جاهزة
                  </span>
                  <span className="text-xs font-black text-amber-300">طازج وساخن فوراً</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl sm:text-3xl font-black text-[#1E1210] group-hover:text-[#D97706] transition-colors">
                    قائمة الأكلات والطلب السريع
                  </h3>
                </div>
                <p className="text-sm sm:text-base text-stone-600 mt-2 leading-relaxed font-semibold">
                  شاورما، مشويات على الفحم، فراخ مقرمشة، طواجن، ساندوتشات وعصائر.. تصفح المنيو واطلب وجبتك المفضلة فوراً.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-1 text-xs font-extrabold">
                <span className="flex items-center gap-1.5 bg-[#FAF0F0] px-3.5 py-2 rounded-xl border border-[#6B0F1A]/20 text-[#6B0F1A]">
                  <UtensilsCrossed className="w-4 h-4 text-[#6B0F1A] stroke-[2.25]" /> ساندوتشات وشاورما
                </span>
                <span className="flex items-center gap-1.5 bg-[#FEF9EE] px-3.5 py-2 rounded-xl border border-[#D97706]/30 text-[#854D0E]">
                  <Flame className="w-4 h-4 text-[#D97706] stroke-[2.25]" /> مشويات وطواجن
                </span>
                <span className="flex items-center gap-1.5 bg-stone-100 px-3.5 py-2 rounded-xl border border-stone-300 text-stone-800">
                  <Sparkles className="w-4 h-4 text-amber-600 stroke-[2.25]" /> مقبلات وعصائر
                </span>
              </div>
            </div>

            <Button
              size="xl"
              variant="secondary"
              className="w-full flex items-center justify-center gap-2.5 py-4 text-lg font-black"
            >
              <span>تصفح منيو فتح الله واطلب فوراً</span>
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1.5 transition-transform stroke-[2.5]" />
            </Button>
          </div>
        </div>
      </div>

      {/* الفوتر */}
      <footer className="z-10 text-center text-xs text-stone-600 border-t-2 border-[#E7D7C7] pt-4 flex items-center justify-between flex-wrap gap-2 max-w-6xl mx-auto w-full font-bold">
        <span>فتح الله ماركت © {new Date().getFullYear()} — وجبات ساخنة طازجة يومياً على الفحم</span>
        <div className="flex items-center gap-4 text-xs font-extrabold text-[#6B0F1A]">
          <span>شاورما</span>
          <span>•</span>
          <span>مشويات على الفحم</span>
          <span>•</span>
          <span>فراخ مقرمشة</span>
          <span>•</span>
          <span>أطباق صحية محسوبة</span>
        </div>
      </footer>

      {/* مودال حساب العميل (Customer Modal) */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 bg-[#1E1210]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-3 border-[#6B0F1A] rounded-[32px] p-6 sm:p-8 max-w-md w-full relative shadow-2xl text-right space-y-5">
            <button
              onClick={() => setShowCustomerModal(false)}
              className="absolute top-5 left-5 text-stone-400 hover:text-stone-700 p-1.5 rounded-full bg-stone-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#FAF0F0] border border-[#6B0F1A]/20 rounded-2xl text-[#6B0F1A]">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-[#1E1210]">حساب العميل المحفوظ</h3>
                <p className="text-xs text-stone-500 font-semibold">استرجع أفراد عائلتك ومجموعاتك بضغطة واحدة</p>
              </div>
            </div>

            {/* زر الدخول السريع التجريبي الفوري */}
            <div className="p-3.5 rounded-2xl bg-[#FEF9EE] border-2 border-[#D97706]/40 flex items-center justify-between gap-3">
              <div className="text-xs">
                <span className="font-extrabold text-[#854D0E] block">تجربة سريعة بدون كلمة مرور:</span>
                <span className="text-stone-600 text-[11px]">ادخل مباشرة وابدأ بالطلب</span>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleQuickCustomerDemo}
                className="shrink-0 text-xs py-1.5 px-3 font-black"
              >
                <UserCheck className="w-3.5 h-3.5 ml-1" />
                <span>دخول فوري</span>
              </Button>
            </div>

            <div className="flex rounded-2xl bg-stone-100 p-1 border border-stone-200 text-xs font-black">
              <button
                type="button"
                onClick={() => {
                  setCustomerAuthMode('login');
                  setCustomerError('');
                }}
                className={`flex-1 py-2 rounded-xl transition-all ${
                  customerAuthMode === 'login'
                    ? 'bg-white text-[#6B0F1A] shadow-xs'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                تسجيل دخول
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomerAuthMode('register');
                  setCustomerError('');
                }}
                className={`flex-1 py-2 rounded-xl transition-all ${
                  customerAuthMode === 'register'
                    ? 'bg-white text-[#6B0F1A] shadow-xs'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                حساب جديد
              </button>
            </div>

            <form
              onSubmit={customerAuthMode === 'login' ? handleCustomerLogin : handleCustomerRegister}
              className="space-y-4"
            >
              {customerAuthMode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">اسمك الكريم بالكامل</label>
                  <Input
                    type="text"
                    required
                    value={customerFullName}
                    onChange={(e) => setCustomerFullName(e.target.value)}
                    placeholder="مثال: أحمد فتح الله"
                    className="w-full text-right"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">البريد الإلكتروني</label>
                <Input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full text-left ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">كلمة المرور</label>
                <Input
                  type="password"
                  required
                  value={customerPassword}
                  onChange={(e) => setCustomerPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-left ltr"
                />
              </div>

              {customerError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold">
                  {customerError}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                disabled={customerLoading}
                className="w-full py-3 text-base font-black"
              >
                {customerLoading
                  ? 'جاري التحقق...'
                  : customerAuthMode === 'login'
                  ? 'تسجيل الدخول والمتابعة'
                  : 'إنشاء الحساب والمتابعة'}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* مودال دخول الموظفين والإدارة */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 bg-[#1E1210]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-3 border-[#6B0F1A] rounded-[32px] p-6 sm:p-8 max-w-md w-full relative shadow-2xl text-right space-y-5">
            <button
              onClick={() => setShowStaffModal(false)}
              className="absolute top-5 left-5 text-stone-400 hover:text-stone-700 p-1.5 rounded-full bg-stone-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#FAF0F0] border border-[#6B0F1A]/20 rounded-2xl text-[#6B0F1A]">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-[#1E1210]">دخول طاقم العمل</h3>
                <p className="text-xs text-stone-500 font-semibold">لوحة تحكم المطبخ أو شاشة الكاشير</p>
              </div>
            </div>

            <form onSubmit={handleStaffLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">البريد الإلكتروني</label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@fathalla.com"
                  className="w-full text-left ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">كلمة المرور</label>
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-left ltr"
                />
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold">
                  {loginError}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                className="w-full py-3 text-base font-black"
              >
                {isLoading ? 'جاري التحقق...' : 'دخول النظام'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
