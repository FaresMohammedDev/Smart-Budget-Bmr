'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ShoppingBag,
  ShieldCheck,
  Flame,
  Wallet,
  Users,
  LogIn,
  ArrowLeft,
  ArrowRight,
  X,
  KeyRound,
  UserCheck,
  CheckCircle,
  Utensils,
  ChevronLeft,
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

  // أكلات مميزة للعرض السريع على الشاشة لتبدو كمطعم حقيقي
  const featuredMeals = [
    {
      name: 'نصف فرخة شواية + أرز بسمتي',
      price: '140 ج.م',
      kcal: '750 سعرة',
      tag: 'الأكثر طلباً 🔥',
      img: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'ساندوتش شاورما فراخ سوري سوبر',
      price: '85 ج.م',
      kcal: '550 سعرة',
      tag: 'عرض خاص ⭐',
      img: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'طبق كفتة مشوية على الفحم مع سلطات',
      price: '120 ج.م',
      kcal: '620 سعرة',
      tag: 'طازج يومياً 🥩',
      img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'وجبة كرسبي تشيكن ستريبس مقرمشة',
      price: '95 ج.م',
      kcal: '680 سعرة',
      tag: 'قرمشة خطيرة 🍗',
      img: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&auto=format&fit=crop&q=80',
    },
  ];

  return (
    <main className="min-h-screen bg-[#FAF7F2] text-stone-900 flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden">
      {/* خلفية بتدرجات شهية ودافئة */}
      <div className="absolute top-0 right-10 w-96 h-96 bg-orange-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-96 h-96 bg-red-200/30 rounded-full blur-3xl pointer-events-none" />

      {/* الرأس واللوجو الرسمي */}
      <header className="flex items-center justify-between z-10 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3.5">
          <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-white border border-orange-200 p-1.5 shadow-md flex items-center justify-center">
            <Image
              src="/images/fathalla-logo.png"
              alt="فتح الله ماركت"
              width={56}
              height={56}
              priority
              className="object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                فتح الله ماركت
              </h1>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-gradient-to-r from-red-600 to-orange-500 text-white font-black shadow-sm">
                المطعم & الوجبات 🍗
              </span>
            </div>
            <p className="text-xs sm:text-sm text-orange-600 font-bold">
              قسم الوجبات الجاهزة الطازجة · Kiosk الخدمة الذاتية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCustomerError('');
              setCustomerAuthMode('login');
              setShowCustomerModal(true);
            }}
            className="text-stone-700 hover:text-stone-900 bg-white hover:bg-orange-50 border border-orange-200/80 shadow-sm font-bold text-xs"
          >
            <Users className="w-4 h-4 ml-1.5 text-orange-600" />
            <span>حسابي ومجموعاتي</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowStaffModal(true)}
            className="text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-50 border border-stone-200 shadow-sm font-bold text-xs"
          >
            <ShieldCheck className="w-4 h-4 ml-1.5 text-red-600" />
            <span>الإدارة والكاشير</span>
          </Button>
        </div>
      </header>

      {/* المحتوى الرئيسي للكيوسك */}
      <div className="my-auto py-6 z-10 max-w-6xl mx-auto w-full text-center space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100/80 border border-orange-200 text-xs font-black text-orange-700 shadow-sm">
            <Flame className="w-4 h-4 text-red-600" />
            <span>أكل طازج يومياً محسوب بالسعرة على قد ميزانيتك</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-stone-900 leading-tight">
            أهلاً بكم في مطعم <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">فتح الله ماركت</span> 🍽️
          </h2>
          <p className="text-sm sm:text-base text-stone-600 max-w-2xl mx-auto font-medium">
            اختر وجبتك الذكية محسوبة بالسعرات والميزانية لتشبعك تماماً بدون أي هدر، أو تصفح المنيو واطلب أكلاتك المفضلة فوراً!
          </p>
        </div>

        {/* كارتين الاختيار الرئيسيين بهوية مطاعم حقيقية وجذابة */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right max-w-4xl mx-auto">
          {/* الكارت 1: السعرات والميزانية الذكية (Smart Budget) */}
          <div
            onClick={handleStartSmartBudget}
            className="group relative p-7 rounded-3xl bg-white border-2 border-orange-300 hover:border-orange-500 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-orange-500/15 cursor-pointer flex flex-col justify-between space-y-6"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white shadow-md shadow-orange-500/30 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-7 h-7" />
                </div>
                <span className="text-xs px-3 py-1 rounded-full bg-red-100 text-red-700 font-black border border-red-200">
                  الأشبع والأوفر ⭐
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-black text-stone-900 group-hover:text-orange-600 transition-colors">
                  احسبها ذكية (Smart Budget) ⚡
                </h3>
                <p className="text-sm text-stone-600 mt-2 leading-relaxed font-medium">
                  حدد ميزانيتك وعددكم، ونرشحلك أفضل تشكيلة وجبات طازجة تشبعكم تماماً بدون أي هدر للأكل أو الفلوس!
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 text-xs font-bold text-stone-700">
                <span className="flex items-center gap-1.5 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-200 text-orange-900">
                  <Flame className="w-3.5 h-3.5 text-red-600" /> محسوبة بالسعرات
                </span>
                <span className="flex items-center gap-1.5 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-200 text-orange-900">
                  <Wallet className="w-3.5 h-3.5 text-orange-600" /> على قد ميزانيتك
                </span>
                <span className="flex items-center gap-1.5 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-200 text-orange-900">
                  <Users className="w-3.5 h-3.5 text-amber-600" /> تقسيم الأفراد
                </span>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25"
            >
              <span>ابدأ طلبك الذكي الآن</span>
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </Button>
          </div>

          {/* الكارت 2: الطلب السريع المباشر (Direct Menu) */}
          <div
            onClick={handleStartQuickMenu}
            className="group relative p-7 rounded-3xl bg-white border-2 border-stone-200 hover:border-red-400 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-red-500/10 cursor-pointer flex flex-col justify-between space-y-6"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center text-white shadow-md shadow-red-600/30 group-hover:scale-110 transition-transform">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <span className="text-xs px-3 py-1 rounded-full bg-stone-100 text-stone-700 font-black border border-stone-200">
                  سريع ومباشر 🍔
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-black text-stone-900 group-hover:text-red-600 transition-colors">
                  قائمة الأكلات والطلب السريع 🍗
                </h3>
                <p className="text-sm text-stone-600 mt-2 leading-relaxed font-medium">
                  شاورما، مشويات على الفحم، فراخ مقرمشة، طواجن، ساندوتشات وعصائر.. تصفح المنيو واطلب وجبتك المفضلة فوراً!
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 text-xs font-bold text-stone-700">
                <span className="flex items-center gap-1.5 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200 text-stone-800">
                  🌯 ساندوتشات وشاورما
                </span>
                <span className="flex items-center gap-1.5 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200 text-stone-800">
                  🥩 مشويات وطواجن
                </span>
                <span className="flex items-center gap-1.5 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200 text-stone-800">
                  🥤 مشروبات وإضافات
                </span>
              </div>
            </div>

            <Button
              variant="secondary"
              size="lg"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-stone-800 to-stone-900 hover:from-black hover:to-black text-white border-0 shadow-lg"
            >
              <span>تصفح منيو فتح الله كاملاً</span>
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>

        {/* استعراض وجبات اليوم اللذيذة (Popular Meals Showcase) */}
        <div className="pt-4 max-w-5xl mx-auto text-right space-y-4">
          <div className="flex items-center justify-between border-b border-orange-200/60 pb-3">
            <div className="flex items-center gap-2 font-black text-lg text-stone-900">
              <Utensils className="w-5 h-5 text-red-600" />
              <span>أشهر وأشهى وجبات فتح الله اليوم:</span>
            </div>
            <button
              onClick={handleStartQuickMenu}
              className="text-xs font-black text-orange-600 hover:text-red-600 flex items-center gap-1"
            >
              <span>مشاهدة كل المنيو</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredMeals.map((item, idx) => (
              <div
                key={idx}
                onClick={handleStartQuickMenu}
                className="bg-white rounded-2xl border border-orange-100 hover:border-orange-300 p-3 shadow-sm hover:shadow-md transition-all cursor-pointer group text-right flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="relative w-full h-32 rounded-xl overflow-hidden bg-stone-100">
                    <Image
                      src={item.img}
                      alt={item.name}
                      fill
                      unoptimized
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                    <span className="absolute top-2 right-2 text-[10px] font-black px-2 py-0.5 rounded-full bg-white/90 text-red-700 shadow-sm backdrop-blur-sm">
                      {item.tag}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-xs text-stone-900 line-clamp-2 leading-snug">
                    {item.name}
                  </h4>
                </div>

                <div className="pt-2 mt-2 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-xs font-black text-red-600">{item.price}</span>
                  <span className="text-[10px] font-bold text-stone-500">{item.kcal}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* الفوتر */}
      <footer className="z-10 text-center text-xs text-stone-500 border-t border-orange-200/60 pt-4 flex items-center justify-between flex-wrap gap-2 max-w-6xl mx-auto w-full">
        <span>فتح الله ماركت © {new Date().getFullYear()} — طازة وصحي محسوب بالسعرات</span>
        <div className="flex items-center gap-4 text-[11px] font-semibold text-stone-600">
          <span>شاورما</span>
          <span>•</span>
          <span>مشويات</span>
          <span>•</span>
          <span>فراخ مقرمشة</span>
          <span>•</span>
          <span>أطباق صحية</span>
        </div>
      </footer>

      {/* مودال حساب العميل (Customer Modal) */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-orange-200 rounded-3xl p-6 sm:p-8 max-w-md w-full relative shadow-2xl text-right space-y-5">
            <button
              onClick={() => setShowCustomerModal(false)}
              className="absolute top-5 left-5 text-stone-400 hover:text-stone-700 p-1 rounded-full bg-stone-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-2xl text-orange-600">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-stone-900">
                  {customerAuthMode === 'login' ? 'تسجيل دخول العميل' : 'حساب عميل جديد'}
                </h3>
                <p className="text-xs text-stone-500 font-medium">
                  لحفظ واسترجاع مجموعاتك المحفوظة وبيانات الأفراد
                </p>
              </div>
            </div>

            {customerError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                {customerError}
              </div>
            )}

            <form
              onSubmit={customerAuthMode === 'login' ? handleCustomerLogin : handleCustomerRegister}
              className="space-y-4"
            >
              {customerAuthMode === 'register' && (
                <Input
                  label="اسمك الكريم"
                  type="text"
                  value={customerFullName}
                  onChange={(e) => setCustomerFullName(e.target.value)}
                  placeholder="محمد أحمد"
                  required
                />
              )}

              <Input
                label="البريد الإلكتروني"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="name@example.com"
                required
              />

              <Input
                label="كلمة المرور"
                type="password"
                value={customerPassword}
                onChange={(e) => setCustomerPassword(e.target.value)}
                placeholder="••••••••"
                required
              />

              <Button
                type="submit"
                disabled={customerLoading}
                className="w-full mt-2"
                size="lg"
              >
                {customerLoading
                  ? 'جاري التحقق...'
                  : customerAuthMode === 'login'
                  ? 'تسجيل الدخول والمتابعة'
                  : 'إنشاء الحساب والمتابعة'}
              </Button>
            </form>

            <div className="text-center pt-2 border-t border-stone-100 text-xs text-stone-600">
              {customerAuthMode === 'login' ? (
                <span>
                  ليس لديك حساب؟{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerError('');
                      setCustomerAuthMode('register');
                    }}
                    className="font-bold text-orange-600 hover:underline"
                  >
                    إنشاء حساب جديد
                  </button>
                </span>
              ) : (
                <span>
                  لديك حساب بالفعل؟{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerError('');
                      setCustomerAuthMode('login');
                    }}
                    className="font-bold text-orange-600 hover:underline"
                  >
                    تسجيل الدخول
                  </button>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* مودال دخول الإدارة / الكاشير */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 max-w-md w-full relative shadow-2xl text-right space-y-6">
            <button
              onClick={() => setShowStaffModal(false)}
              className="absolute top-5 left-5 text-stone-400 hover:text-stone-700 p-1 rounded-full bg-stone-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-2xl text-red-600">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-stone-900">بوابة طاقم العمل</h3>
                <p className="text-xs text-stone-500 font-medium">دخول إدارة المطعم أو شاشة الكاشير</p>
              </div>
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                {loginError}
              </div>
            )}

            <form onSubmit={handleStaffLogin} className="space-y-4">
              <Input
                label="البريد الإلكتروني"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@fathalla.com"
                required
              />

              <Input
                label="كلمة المرور"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2"
                size="lg"
              >
                {isLoading ? 'جاري الدخول...' : 'تسجيل الدخول'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
