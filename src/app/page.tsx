'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Wallet, Users, X, UtensilsCrossed, CreditCard, ChefHat, Calculator, Flame, Wheat, CupSoda } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { usePlannerStore } from '@/features/planner/store/planner.store';
import { createClient } from '@/lib/supabase/client';
import { HOME_SLIDES } from '@/lib/home-assets';
import { HomeDoor } from '@/components/home/HomeDoor';
import { FoodMarquee } from '@/components/home/FoodMarquee';

export default function WelcomePage() {
  const router = useRouter();
  const { setOrderMode, resetKiosk } = usePlannerStore();
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [email, setEmail] = useState('admin@fathalla.com');
  const [password, setPassword] = useState('admin123');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerAuthMode, setCustomerAuthMode] = useState<'login' | 'register'>('login');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPassword, setCustomerPassword] = useState('');
  const [customerFullName, setCustomerFullName] = useState('');
  const [customerError, setCustomerError] = useState('');
  const [customerLoading, setCustomerLoading] = useState(false);

  const handleStartSmartBudget = () => {
    resetKiosk();
    setOrderMode('smart_budget');
    router.push('/plan/people');
  };

  const handleStartQuickMenu = () => {
    resetKiosk();
    setOrderMode('quick_menu');
    router.push('/menu');
  };

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
        setCustomerError(
          error.message.includes('Invalid login credentials') ? 'البيانات غير صحيحة' : error.message
        );
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
      setCustomerError(err instanceof Error ? err.message : 'تعذر الدخول');
    } finally {
      setCustomerLoading(false);
    }
  };

  const handleCustomerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomerError('');
    setCustomerLoading(true);

    if (!customerFullName.trim()) {
      setCustomerError('اكتب اسمك');
      setCustomerLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: customerEmail,
        password: customerPassword,
        options: { data: { full_name: customerFullName.trim() } },
      });

      if (error) {
        const lower = error.message.toLowerCase();
        if (lower.includes('signups are disabled') || lower.includes('signup is disabled')) {
          setCustomerError('إنشاء الحسابات مقفول حاليًا');
        } else if (lower.includes('rate limit')) {
          setCustomerError('حاول مرة تانية بعد شوية');
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
      setCustomerError(err instanceof Error ? err.message : 'تعذر إنشاء الحساب');
    } finally {
      setCustomerLoading(false);
    }
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setLoginError('البيانات غير صحيحة');
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
      } else if (profile?.role === 'admin') {
        router.push('/admin');
      } else {
        setLoginError('الحساب ليس للموظفين');
      }
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'تعذر الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickCustomerDemo = () => {
    resetKiosk();
    setOrderMode('smart_budget');
    setShowCustomerModal(false);
    router.push('/plan/people');
  };

  const smartImages = HOME_SLIDES.smart();
  const menuImages = HOME_SLIDES.menu();
  const stripImages = HOME_SLIDES.strip();

  return (
    <main className="relative min-h-screen overflow-x-clip bg-[#F8F4EE] text-[#1E1210] flex flex-col p-5 sm:p-8 select-none">
      {/* خلفية متحركة هادية */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="anim-blob absolute -top-32 -right-24 w-[34rem] h-[34rem] rounded-full bg-[#6B0F1A]/15 blur-3xl" />
        <div className="anim-blob-slow absolute -bottom-40 -left-28 w-[38rem] h-[38rem] rounded-full bg-[#E5A91E]/25 blur-3xl" />
      </div>

      <header className="relative z-10 flex items-center justify-between gap-3 max-w-[92rem] mx-auto w-full anim-fade-up">
        <h1 dir="ltr" className="text-4xl font-black tracking-tight">
          Smart <span className="text-shimmer">Budget</span>
        </h1>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => router.push('/cashier')} className="font-bold text-xs">
            <CreditCard className="w-4 h-4 ml-1.5" />
            <span>كاشير</span>
          </Button>
          <Button size="sm" variant="outline" onClick={() => router.push('/admin')} className="font-bold text-xs">
            <ChefHat className="w-4 h-4 ml-1.5" />
            <span>أدمن</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setCustomerError('');
              setCustomerAuthMode('login');
              setShowCustomerModal(true);
            }}
            className="font-bold text-xs"
          >
            <Users className="w-4 h-4 ml-1.5 text-[#6B0F1A]" />
            <span>حسابي</span>
          </Button>
        </div>
      </header>

      <div className="relative z-10 flex-1 flex min-h-[24rem] max-w-[92rem] mx-auto w-full my-5 sm:my-6">
        <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          <HomeDoor
            title="احسب احتياجك"
            sub="سعرات وميزانية"
            images={smartImages}
            icon={<Calculator className="w-8 h-8 stroke-[2.25]" />}
            accent="burgundy"
            chips={[{ icon: <Flame className="w-4 h-4" />, label: 'سعرات' }, { icon: <Wheat className="w-4 h-4" />, label: 'كارب' }, { icon: <Wallet className="w-4 h-4" />, label: 'ميزانية' }]}
            onClick={handleStartSmartBudget}
            delay={120}
          />
          <HomeDoor
            title="المنيو"
            sub="تصفح واطلب"
            images={menuImages}
            icon={<UtensilsCrossed className="w-8 h-8 stroke-[2.25]" />}
            accent="mustard"
            chips={[{ icon: <Flame className="w-4 h-4" />, label: 'مشويات' }, { icon: <UtensilsCrossed className="w-4 h-4" />, label: 'ساندوتشات' }, { icon: <CupSoda className="w-4 h-4" />, label: 'مشروبات' }]}
            onClick={handleStartQuickMenu}
            delay={260}
            rotateOffset={2600}
          />
        </div>

        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white border-4 border-[#F8F4EE] shadow-xl items-center justify-center font-black text-[#6B0F1A] text-lg z-20 anim-fade-up" style={{ animationDelay: '500ms' }}>
          أو
        </div>
      </div>

      <div className="relative z-10 max-w-[92rem] mx-auto w-full anim-fade-up" style={{ animationDelay: '420ms' }}>
        <FoodMarquee images={stripImages} />
      </div>

      <footer className="relative z-10 max-w-[92rem] mx-auto w-full flex justify-end pt-3">
        <button
          type="button"
          onClick={() => setShowStaffModal(true)}
          className="text-xs font-bold text-stone-500 hover:text-stone-800 flex items-center gap-1.5 cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>الموظفين</span>
        </button>
      </footer>

      {showCustomerModal && (
        <div className="fixed inset-0 z-50 bg-[#1E1210]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#6B0F1A] rounded-[28px] p-6 sm:p-8 max-w-md w-full relative shadow-2xl text-right space-y-5">
            <button
              onClick={() => setShowCustomerModal(false)}
              aria-label="إغلاق"
              className="absolute top-5 left-5 text-stone-400 hover:text-stone-700 p-1.5 rounded-full bg-stone-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-2xl font-black">حسابي</h3>

            <div className="flex rounded-2xl bg-stone-100 p-1 border border-stone-200 text-sm font-black">
              {(['login', 'register'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setCustomerAuthMode(mode);
                    setCustomerError('');
                  }}
                  className={`flex-1 py-2.5 rounded-xl transition-all cursor-pointer ${
                    customerAuthMode === mode ? 'bg-white text-[#6B0F1A] shadow-xs' : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  {mode === 'login' ? 'دخول' : 'حساب جديد'}
                </button>
              ))}
            </div>

            <form
              onSubmit={customerAuthMode === 'login' ? handleCustomerLogin : handleCustomerRegister}
              className="space-y-3"
            >
              {customerAuthMode === 'register' && (
                <Input
                  type="text"
                  required
                  value={customerFullName}
                  onChange={(e) => setCustomerFullName(e.target.value)}
                  placeholder="الاسم"
                  aria-label="الاسم"
                  className="w-full text-right"
                />
              )}
              <Input
                type="email"
                required
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="البريد"
                aria-label="البريد"
                className="w-full text-left ltr"
              />
              <Input
                type="password"
                required
                value={customerPassword}
                onChange={(e) => setCustomerPassword(e.target.value)}
                placeholder="كلمة المرور"
                aria-label="كلمة المرور"
                className="w-full text-left ltr"
              />

              {customerError && (
                <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-bold">
                  {customerError}
                </div>
              )}

              <Button type="submit" variant="primary" disabled={customerLoading} className="w-full py-3 text-base font-black">
                {customerLoading ? '...' : customerAuthMode === 'login' ? 'دخول' : 'إنشاء حساب'}
              </Button>
              <Button type="button" variant="outline" onClick={handleQuickCustomerDemo} className="w-full py-3 text-base font-black">
                <UtensilsCrossed className="w-4 h-4 ml-2" />
                <span>متابعة كضيف</span>
              </Button>
            </form>
          </div>
        </div>
      )}

      {showStaffModal && (
        <div className="fixed inset-0 z-50 bg-[#1E1210]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#6B0F1A] rounded-[28px] p-6 sm:p-8 max-w-md w-full relative shadow-2xl text-right space-y-5">
            <button
              onClick={() => setShowStaffModal(false)}
              aria-label="إغلاق"
              className="absolute top-5 left-5 text-stone-400 hover:text-stone-700 p-1.5 rounded-full bg-stone-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-2xl font-black flex items-center gap-2">
              <Wallet className="w-6 h-6 text-[#6B0F1A]" />
              <span>الموظفين</span>
            </h3>

            <form onSubmit={handleStaffLogin} className="space-y-3">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="البريد"
                aria-label="البريد"
                className="w-full text-left ltr"
              />
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="كلمة المرور"
                aria-label="كلمة المرور"
                className="w-full text-left ltr"
              />

              {loginError && (
                <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-bold">
                  {loginError}
                </div>
              )}

              <Button type="submit" variant="primary" disabled={isLoading} className="w-full py-3 text-base font-black">
                {isLoading ? '...' : 'دخول'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
