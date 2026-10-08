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

  // مودال اختيار طريقة المتابعة (زائر أو تسجيل دخول / حساب جديد)
  const [showAuthChoiceModal, setShowAuthChoiceModal] = useState(false);
  const [authMode, setAuthMode] = useState<'choice' | 'login' | 'register'>('choice');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPassword, setCustomerPassword] = useState('');
  const [customerFullName, setCustomerFullName] = useState('');
  const [customerError, setCustomerError] = useState('');
  const [customerLoading, setCustomerLoading] = useState(false);

  // فتح نافذة الاختيار عند الضغط على "احسبها ذكية"
  const handleOpenSmartBudgetChoice = () => {
    setAuthMode('choice');
    setCustomerError('');
    setShowAuthChoiceModal(true);
  };

  // المتابعة كزائر (Guest)
  const handleContinueAsGuest = async () => {
    resetKiosk();
    setOrderMode('smart_budget');
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      //
    }
    setShowAuthChoiceModal(false);
    router.push('/plan/people');
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
          setCustomerError('البريد أو كلمة المرور غير صحيحة. إذا لم يكن لديك حساب، يمكنك الضغط على "إنشاء حساب جديد".');
        } else {
          setCustomerError(error.message);
        }
        setCustomerLoading(false);
        return;
      }

      if (data?.user) {
        resetKiosk();
        setOrderMode('smart_budget');
        setShowAuthChoiceModal(false);
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

    if (!customerFullName.trim()) {
      setCustomerError('يرجى إدخال اسمك بالكامل');
      return;
    }
    if (customerPassword.length < 6) {
      setCustomerError('كلمة المرور يجب أن تكون 6 أحرف أو أرقام على الأقل');
      return;
    }

    setCustomerLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: customerEmail,
        password: customerPassword,
        options: {
          data: {
            full_name: customerFullName,
          },
        },
      });

      if (error) {
        const lower = error.message.toLowerCase();
        if (lower.includes('signups are disabled') || lower.includes('signup is disabled')) {
          setCustomerError(
            'التسجيل الجديد مغلق في إعدادات Supabase Auth. يرجى تفعيل "Allow new users to sign up" والتأكد من تفعيل Email Provider من لوحة تحكم Supabase > Authentication > Providers > Email.'
          );
        } else if (lower.includes('rate limit')) {
          setCustomerError(
            'تم تجاوز حد إرسال إيميلات التأكيد في Supabase (Email Rate Limit). يرجى إيقاف خيار "Confirm email" فقط من إعدادات Supabase Auth لتفعيل الإنشاء الفوري بدون انتظار، أو يمكنك المتابعة كزائر سريع الآن بالأسفل.'
          );
        } else {
          setCustomerError(error.message);
        }
        setCustomerLoading(false);
        return;
      }

      if (data?.user) {
        // إنشاء بروفايل في جدول profiles
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: customerEmail,
            full_name: customerFullName,
            role: 'customer',
          });
        } catch {
          //
        }

        resetKiosk();
        setOrderMode('smart_budget');
        setShowAuthChoiceModal(false);
        router.push('/plan/people');
      }
    } catch (err: unknown) {
      setCustomerError(err instanceof Error ? err.message : 'حدث خطأ أثناء إنشاء الحساب');
    } finally {
      setCustomerLoading(false);
    }
  };

  // بدء وضع الطلب المباشر السريع (E-Commerce)
  const handleStartQuickMenu = async () => {
    resetKiosk();
    setOrderMode('quick_menu');
    try {
      const supabase = createClient();
      await supabase.auth.signInAnonymously();
    } catch {
      //
    }
    router.push('/menu');
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
        // إذا فشل الدخول لعدم وجود الحساب مسبقاً، نحاول إنشاءه تلقائياً
        if (error.message.includes('Invalid login credentials')) {
          setLoginError('بيانات الدخول غير صحيحة. يمكنك استخدام أزرار الدخول السريع أدناه، أو إنشاء الحساب أولاً.');
        } else {
          setLoginError(error.message);
        }
        setIsLoading(false);
        return;
      }

      // التحقق من الرول وتوجيهه للشاشة المناسبة
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

  // إنشاء حساب الطاقم في Supabase بنقرة واحدة
  const handleQuickRegisterStaff = async (role: 'admin' | 'cashier') => {
    setIsLoading(true);
    setLoginError('');
    const targetEmail = role === 'admin' ? 'admin@fathalla.com' : 'cashier@fathalla.com';
    const targetPassword = role === 'admin' ? 'admin123' : 'cashier123';

    try {
      const supabase = createClient();
      // محاولة تسجيل الدخول أولاً
      const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: targetPassword,
      });

      if (!loginErr && loginData) {
        router.push(role === 'admin' ? '/admin' : '/cashier');
        return;
      }

      // إنشاء حساب جديد
      const { data: signupData, error: signupErr } = await supabase.auth.signUp({
        email: targetEmail,
        password: targetPassword,
        options: {
          data: {
            full_name: role === 'admin' ? 'مدير المطعم' : 'كاشير فتح الله',
          },
        },
      });

      if (signupErr) {
        // توجيه مباشر للصفحة في وضع المعاينة
        router.push(role === 'admin' ? '/admin' : '/cashier');
        return;
      }

      if (signupData?.user) {
        await supabase
          .from('profiles')
          .update({ role })
          .eq('id', signupData.user.id);
      }

      router.push(role === 'admin' ? '/admin' : '/cashier');
    } catch {
      // توجيه مباشر
      router.push(role === 'admin' ? '/admin' : '/cashier');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden">
      {/* خلفية جمالية بهوية فتح الله */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#F37A20]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#F37A20]/5 rounded-full blur-3xl pointer-events-none" />

      {/* الرأس واللوجو الرسمي لفتح الله */}
      <header className="flex items-center justify-between z-10">
        <div className="flex items-center gap-3.5">
          <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-black border border-zinc-800 p-1.5 shadow-2xl flex items-center justify-center">
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
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
              فتح الله ماركت
            </h1>
            <p className="text-xs sm:text-sm text-[#F37A20] font-bold">
              قسم الوجبات الجاهزة والمطعم · Kiosk
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowStaffModal(true)}
          className="text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 select-none"
        >
          <ShieldCheck className="w-4 h-4 ml-1.5 text-[#F37A20]" />
          دخول الإدارة / الكاشير
        </Button>
      </header>

      {/* المحتوى الرئيسي للكيوسك */}
      <div className="my-auto py-8 z-10 max-w-5xl mx-auto w-full text-center space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300">
            <Sparkles className="w-4 h-4 text-[#F37A20]" />
            <span>نظام Smart Budget الذكي لاقتراح الوجبات</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            أهلاً بكم في مطعم <span className="text-[#F37A20]">فتح الله</span>
          </h2>
          <p className="text-sm sm:text-lg text-zinc-400 max-w-2xl mx-auto">
            اختر الطريقة التي تفضلها للطلب: حساب ذكي بالسعرات والميزانية لتفادي الهدر، أو تصفح مباشر وسريع لقائمة الوجبات.
          </p>
        </div>

        {/* بطاقتي الخيار للمستخدم */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right max-w-4xl mx-auto">
          {/* البطاقة 1: السعرات والميزانية الذكية */}
          <div
            onClick={handleOpenSmartBudgetChoice}
            className="group relative p-7 rounded-3xl bg-gradient-to-b from-zinc-900/90 to-zinc-950 border-2 border-zinc-800 hover:border-[#F37A20] transition-all duration-300 shadow-xl hover:shadow-[#F37A20]/15 cursor-pointer flex flex-col justify-between space-y-6"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#F37A20]/15 border border-[#F37A20]/30 flex items-center justify-center text-[#F37A20] group-hover:scale-110 transition-transform">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <div className="inline-block px-2.5 py-0.5 rounded bg-[#F37A20]/20 text-[#F37A20] text-xs font-bold mb-2">
                  النظام الموصى به ⭐
                </div>
                <h3 className="text-2xl font-black text-white group-hover:text-[#F37A20] transition-colors">
                  احسبها ذكية (Smart Budget)
                </h3>
                <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                  أدخل بياناتك أو بيانات مجموعتك وميزانيتك، ونحسب لك السعرات بالمللي (BMR & TDEE) ونقترح لك الوجبة المثالية اللي تشبعك بدون هدر للأكل والفلوس.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 text-xs text-zinc-400 font-medium">
                <span className="flex items-center gap-1 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                  <Flame className="w-3.5 h-3.5 text-[#F37A20]" /> حرق السعرات BMR
                </span>
                <span className="flex items-center gap-1 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                  <Wallet className="w-3.5 h-3.5 text-[#F37A20]" /> التزام بالميزانية
                </span>
                <span className="flex items-center gap-1 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                  <Users className="w-3.5 h-3.5 text-[#F37A20]" /> نصيب كل فرد
                </span>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full flex items-center justify-center gap-2 group-hover:bg-[#d96614]"
            >
              <span>ابدأ حساب الوجبة الذكية</span>
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </Button>
          </div>

          {/* البطاقة 2: الطلب السريع E-Commerce */}
          <div
            onClick={handleStartQuickMenu}
            className="group relative p-7 rounded-3xl bg-gradient-to-b from-zinc-900/90 to-zinc-950 border-2 border-zinc-800 hover:border-zinc-600 transition-all duration-300 shadow-xl cursor-pointer flex flex-col justify-between space-y-6"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200 group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <div>
                <div className="inline-block px-2.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-xs font-bold mb-2">
                  سريع ومباشر ⚡
                </div>
                <h3 className="text-2xl font-black text-white group-hover:text-zinc-200 transition-colors">
                  الطلب المباشر السريع
                </h3>
                <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                  مستعجل أو عارف طلبك؟ تصفح منيو الوجبات والساندوتشات والصواني بالأسعار وسعرات كل وجبة، أضف للسلة واطبع بون الكاشير مباشرة في ثوانٍ.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 text-xs text-zinc-400 font-medium">
                <span className="flex items-center gap-1 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                  تصفح المنيو كامل
                </span>
                <span className="flex items-center gap-1 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                  عرض السعرات لكل صنف
                </span>
                <span className="flex items-center gap-1 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                  طباعة بون فوري
                </span>
              </div>
            </div>

            <Button
              variant="secondary"
              size="lg"
              className="w-full flex items-center justify-center gap-2"
            >
              <span>تصفح المنيو واطلب فوراً</span>
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>

      {/* التذييل */}
      <footer className="text-center text-xs text-zinc-500 z-10 py-3 border-t border-zinc-900">
        فتح الله ماركت · شاشة الخدمة الذاتية (Kiosk) · جميع الحقوق محفوظة © {new Date().getFullYear()}
      </footer>

      {/* نافذة تسجيل دخول الطاقم (Modal) */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-md w-full relative shadow-2xl text-right space-y-6">
            <button
              onClick={() => setShowStaffModal(false)}
              className="absolute top-5 left-5 text-zinc-400 hover:text-white p-1 rounded-lg bg-zinc-800/60"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#F37A20]/15 rounded-xl text-[#F37A20]">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">دخول الإدارة / الكاشير</h3>
                <p className="text-xs text-zinc-400">خاص بطاقم عمل فتح الله ماركت</p>
              </div>
            </div>

            {/* أزرار الدخول السريع الفوري */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-2.5">
              <div className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#F37A20]" />
                <span>دخول سريع فوري (تجريبي):</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={() => handleQuickRegisterStaff('admin')}
                  disabled={isLoading}
                  className="text-xs py-2"
                >
                  ⚡ دخول كـ أدمن
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => handleQuickRegisterStaff('cashier')}
                  disabled={isLoading}
                  className="text-xs py-2"
                >
                  ⚡ دخول كـ كاشير
                </Button>
              </div>
            </div>

            {/* نموذج تسجيل الدخول بالبريد */}
            <form onSubmit={handleStaffLogin} className="space-y-4">
              <Input
                label="البريد الإلكتروني"
                type="email"
                placeholder="admin@fathalla.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                label="كلمة المرور"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              {loginError && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold leading-relaxed">
                  {loginError}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2"
                size="lg"
              >
                {isLoading ? 'جاري التحقق...' : 'تسجيل الدخول'}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* نافذة خيار الدخول كزائر أو تسجيل حساب (Customer Auth Choice) */}
      {showAuthChoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full relative shadow-2xl text-right space-y-6">
            <button
              onClick={() => setShowAuthChoiceModal(false)}
              className="absolute top-5 left-5 text-zinc-400 hover:text-white p-1 rounded-lg bg-zinc-800/60"
            >
              <X className="w-5 h-5" />
            </button>

            {/* وضع الاختيار الأولي (Choice) */}
            {authMode === 'choice' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-[#F37A20]/15 rounded-2xl text-[#F37A20]">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">طريقة المتابعة في Smart Budget</h3>
                    <p className="text-xs text-zinc-400">اختر الطريقة الأنسب لك لبدء حساب وجبتك</p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  {/* خيار 1: زائر */}
                  <div
                    onClick={handleContinueAsGuest}
                    className="p-5 rounded-2xl bg-zinc-950 border-2 border-zinc-800 hover:border-[#F37A20] transition-all cursor-pointer group space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white group-hover:text-[#F37A20] transition-colors">
                        المتابعة كزائر (Guest) 🚀
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-semibold">
                        سريع وفوري
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      حساب فوري للسعرات والميزانية بدون أي تسجيل مسبق، وطباعة بون الكاشير مباشرة عند الانتهاء.
                    </p>
                    <div className="pt-1 flex items-center gap-1.5 text-xs text-[#F37A20] font-bold">
                      <span>متابعة كزائر الآن</span>
                      <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* خيار 2: تسجيل الدخول أو إنشاء حساب */}
                  <div
                    onClick={() => {
                      setCustomerError('');
                      setAuthMode('login');
                    }}
                    className="p-5 rounded-2xl bg-gradient-to-b from-[#F37A20]/10 to-zinc-950 border-2 border-[#F37A20]/40 hover:border-[#F37A20] transition-all cursor-pointer group space-y-2 shadow-lg shadow-[#F37A20]/5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white group-hover:text-[#F37A20] transition-colors">
                        تسجيل الدخول / إنشاء حساب 👤
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-[#F37A20] text-black font-black">
                        موصى به ⭐
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      احفظ مجموعاتك وعائلتك (مثل: عائلتي، شلة النادي) واسترجع بياناتهم بنقرة واحدة في أي زيارة قادمة لفتح الله بدون إعادة إدخالها!
                    </p>
                    <div className="pt-1 flex items-center gap-1.5 text-xs text-[#F37A20] font-bold">
                      <span>تسجيل الدخول أو فتح حساب جديد</span>
                      <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* وضع تسجيل الدخول أو إنشاء الحساب (Login / Register) */}
            {(authMode === 'login' || authMode === 'register') && (
              <div className="space-y-5">
                {/* الرأس وأزرار التبديل */}
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAuthMode('choice')}
                      className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>رجوع للخيارات</span>
                    </button>
                  </div>

                  <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setCustomerError('');
                      }}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        authMode === 'login'
                          ? 'bg-[#F37A20] text-white shadow'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      تسجيل الدخول
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('register');
                        setCustomerError('');
                      }}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        authMode === 'register'
                          ? 'bg-[#F37A20] text-white shadow'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      حساب جديد
                    </button>
                  </div>
                </div>

                {authMode === 'login' ? (
                  <form onSubmit={handleCustomerLogin} className="space-y-4">
                    <div>
                      <h4 className="text-lg font-bold text-white">تسجيل الدخول</h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        أدخل بريدك وكلمة المرور للوصول لمجموعاتك المحفوظة
                      </p>
                    </div>

                    <Input
                      label="البريد الإلكتروني"
                      type="email"
                      placeholder="name@example.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      required
                    />

                    <Input
                      label="كلمة المرور"
                      type="password"
                      placeholder="••••••••"
                      value={customerPassword}
                      onChange={(e) => setCustomerPassword(e.target.value)}
                      required
                    />

                    {customerError && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold leading-relaxed">
                        {customerError}
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={customerLoading}
                      className="w-full mt-2"
                      size="lg"
                    >
                      {customerLoading ? 'جاري التحقق...' : 'دخول ومتابعة'}
                    </Button>

                    <div className="pt-2 flex items-center justify-between text-xs text-zinc-400">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('register');
                          setCustomerError('');
                        }}
                        className="hover:text-[#F37A20] underline cursor-pointer"
                      >
                        ليس لديك حساب؟ أنشئ حسابك الآن
                      </button>
                      <button
                        type="button"
                        onClick={handleContinueAsGuest}
                        className="hover:text-white cursor-pointer"
                      >
                        المتابعة كزائر سريع ⚡
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleCustomerRegister} className="space-y-4">
                    <div>
                      <h4 className="text-lg font-bold text-white">إنشاء حساب جديد</h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        أنشئ حسابك لحفظ مجموعاتك العائلية وطلباتك القادمة
                      </p>
                    </div>

                    <Input
                      label="الاسم بالكامل"
                      type="text"
                      placeholder="مثال: أحمد محمد"
                      value={customerFullName}
                      onChange={(e) => setCustomerFullName(e.target.value)}
                      required
                    />

                    <Input
                      label="البريد الإلكتروني"
                      type="email"
                      placeholder="name@example.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      required
                    />

                    <Input
                      label="كلمة المرور (6 خانات على الأقل)"
                      type="password"
                      placeholder="••••••••"
                      value={customerPassword}
                      onChange={(e) => setCustomerPassword(e.target.value)}
                      required
                    />

                    {customerError && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold leading-relaxed">
                        {customerError}
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={customerLoading}
                      className="w-full mt-2"
                      size="lg"
                    >
                      {customerLoading ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب ومتابعة'}
                    </Button>

                    <div className="pt-2 flex items-center justify-between text-xs text-zinc-400">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('login');
                          setCustomerError('');
                        }}
                        className="hover:text-[#F37A20] underline cursor-pointer"
                      >
                        لديك حساب بالفعل؟ سجل الدخول
                      </button>
                      <button
                        type="button"
                        onClick={handleContinueAsGuest}
                        className="hover:text-white cursor-pointer"
                      >
                        المتابعة كزائر سريع ⚡
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
