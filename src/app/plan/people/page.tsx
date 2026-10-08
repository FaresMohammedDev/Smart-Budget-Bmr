'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  User,
  Flame,
  ArrowLeft,
  ArrowRight,
  Activity,
  Bookmark,
  BookmarkCheck,
  Plus,
  Trash2,
  X,
  Check,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { KioskHeader } from '@/components/layout/KioskHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { usePlannerStore } from '@/features/planner/store/planner.store';
import { calculateBmr } from '@/features/nutrition/domain/bmr';
import { calculateTdee } from '@/features/nutrition/domain/tdee';
import { formatKcal } from '@/lib/format';
import { ActivityLevel } from '@/features/nutrition/domain/types';
import { createClient } from '@/lib/supabase/client';

export default function PeopleStepPage() {
  const router = useRouter();
  const {
    peopleCount,
    setPeopleCount,
    people,
    updatePerson,
    setPeople,
    savedGroupId,
    setSavedGroupId,
  } = usePlannerStore();

  const [activeTab, setActiveTab] = useState(0);

  // حالة المستخدم والمجموعات المحفوظة
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [savedGroups, setSavedGroups] = useState<any[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [saveGroupError, setSaveGroupError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // نافذة تسجيل الدخول في حال أراد الزائر حفظ المجموعة
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // جلب المستخدم والمجموعات المحفوظة
  const loadUserAndGroups = async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && !user.is_anonymous) {
        setCurrentUser(user);
        setLoadingGroups(true);
        const { data: groups, error } = await supabase
          .from('saved_groups')
          .select(
            `
            id,
            name,
            created_at,
            group_members (
              id,
              name,
              age,
              gender,
              height_cm,
              weight_kg,
              activity_level,
              sort_order
            )
          `
          )
          .order('created_at', { ascending: false });

        if (!error && groups) {
          setSavedGroups(groups);
        }
      } else {
        setCurrentUser(null);
        setSavedGroups([]);
      }
    } catch {
      //
    } finally {
      setLoadingGroups(false);
    }
  };

  // تسجيل الخروج والتحول إلى زائر
  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setCurrentUser(null);
      setSavedGroups([]);
      setSavedGroupId(null);
      setStatusMessage('تم تسجيل الخروج بنجاح والمتابعة كزائر سريع.');
    } catch {
      //
    }
  };

  useEffect(() => {
    loadUserAndGroups();
  }, []);

  const currentPerson = people[activeTab] || people[0];

  // حساب BMR و TDEE الحي لكل فرد
  let liveBmr = 0;
  let liveTdee = 0;
  if (
    currentPerson &&
    currentPerson.weightKg > 0 &&
    currentPerson.heightCm > 0 &&
    currentPerson.age > 0
  ) {
    try {
      liveBmr = calculateBmr(
        currentPerson.gender,
        currentPerson.weightKg,
        currentPerson.heightCm,
        currentPerson.age
      );
      liveTdee = calculateTdee(liveBmr, currentPerson.activityLevel);
    } catch {
      //
    }
  }

  // استرجاع مجموعة محفوظة
  const handleLoadGroup = (group: any) => {
    if (!group.group_members || group.group_members.length === 0) return;
    const sortedMembers = [...group.group_members].sort(
      (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
    );

    setPeople(
      sortedMembers.map((m) => ({
        name: m.name,
        age: Number(m.age),
        gender: m.gender,
        heightCm: Number(m.height_cm),
        weightKg: Number(m.weight_kg),
        activityLevel: m.activity_level,
      }))
    );
    setActiveTab(0);
    setSavedGroupId(group.id);
    setStatusMessage(`تم استرجاع مجموعة "${group.name}" بنجاح (${sortedMembers.length} أفراد)`);
    setTimeout(() => setStatusMessage(''), 4500);
  };

  // حذف مجموعة محفوظة
  const handleDeleteGroup = async (e: React.MouseEvent, groupId: string, groupName: string) => {
    e.stopPropagation();
    if (!window.confirm(`هل أنت متأكد من حذف مجموعة "${groupName}" نهائياً؟`)) return;

    try {
      const supabase = createClient();
      await supabase.from('saved_groups').delete().eq('id', groupId);
      if (savedGroupId === groupId) {
        setSavedGroupId(null);
      }
      setSavedGroups((prev) => prev.filter((g) => g.id !== groupId));
      setStatusMessage(`تم حذف مجموعة "${groupName}"`);
      setTimeout(() => setStatusMessage(''), 3000);
    } catch {
      //
    }
  };

  // فتح نافذة الحفظ
  const handleOpenSaveModal = () => {
    setSaveGroupError('');
    if (!currentUser || currentUser.is_anonymous) {
      setShowAuthModal(true);
    } else {
      setShowSaveModal(true);
    }
  };

  // حفظ المجموعة الحالية في Supabase
  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      setSaveGroupError('يرجى كتابة اسم للمجموعة');
      return;
    }
    setSaveGroupError('');
    setIsSavingGroup(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || user.is_anonymous) {
        setIsSavingGroup(false);
        setShowSaveModal(false);
        setShowAuthModal(true);
        return;
      }

      // 1. إدراج المجموعة
      const { data: groupData, error: groupError } = await supabase
        .from('saved_groups')
        .insert({
          user_id: user.id,
          name: newGroupName.trim(),
        })
        .select()
        .single();

      if (groupError) {
        if (groupError.message.includes('unique') || groupError.code === '23505') {
          throw new Error('لديك مجموعة محفوظة بهذا الاسم بالفعل. يرجى اختيار اسم مميز آخر.');
        }
        throw new Error(groupError.message);
      }

      // 2. إدراج أفراد المجموعة
      const membersToInsert = people.map((p, idx) => ({
        group_id: groupData.id,
        name: p.name || `فرد ${idx + 1}`,
        age: p.age,
        gender: p.gender,
        height_cm: p.heightCm,
        weight_kg: p.weightKg,
        activity_level: p.activityLevel,
        sort_order: idx + 1,
      }));

      const { error: membersError } = await supabase
        .from('group_members')
        .insert(membersToInsert);

      if (membersError) {
        throw new Error(membersError.message);
      }

      setSavedGroupId(groupData.id);
      setShowSaveModal(false);
      setNewGroupName('');
      setStatusMessage(`تم حفظ مجموعة "${groupData.name}" بنجاح! يمكنك استرجاعها في أي زيارة.`);
      setTimeout(() => setStatusMessage(''), 5000);
      await loadUserAndGroups();
    } catch (err: unknown) {
      setSaveGroupError(err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ المجموعة');
    } finally {
      setIsSavingGroup(false);
    }
  };

  // تسجيل سريع أو دخول أثناء محاولة حفظ المجموعة
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      const supabase = createClient();
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
      } else {
        if (!authFullName.trim()) throw new Error('يرجى إدخال اسمك بالكامل');
        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: {
            data: {
              full_name: authFullName,
            },
          },
        });
        if (error) throw error;
        if (data.user) {
          try {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              email: authEmail,
              full_name: authFullName,
              role: 'customer',
            });
          } catch {
            //
          }
        }
      }

      setShowAuthModal(false);
      await loadUserAndGroups();
      setShowSaveModal(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ في التسجيل';
      if (msg.toLowerCase().includes('signups are disabled') || msg.toLowerCase().includes('signup is disabled')) {
        setAuthError(
          'التسجيل الجديد مغلق في Supabase Auth. يرجى تفعيل "Allow new users to sign up" من لوحة تحكم Supabase > Authentication > Providers > Email.'
        );
      } else if (msg.toLowerCase().includes('rate limit')) {
        setAuthError(
          'تم تجاوز حد إرسال إيميلات التأكيد في Supabase. يرجى إيقاف "Confirm email" فقط في إعدادات Supabase Auth للإنشاء الفوري، أو تسجيل الدخول بحساب سابق.'
        );
      } else {
        setAuthError(msg);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleNext = () => {
    router.push('/plan/budget');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <KioskHeader />

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-8 space-y-6">
        {/* شريط المراحل */}
        <div className="flex items-center justify-between text-xs sm:text-sm text-zinc-400 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2 text-[#F37A20] font-bold">
            <span className="w-6 h-6 rounded-full bg-[#F37A20] text-black flex items-center justify-center font-black text-xs">
              1
            </span>
            <span>بيانات الأفراد والحرق</span>
          </div>
          <div className="h-0.5 w-12 bg-zinc-800" />
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center text-xs">
              2
            </span>
            <span>الميزانية ونوع الوجبة</span>
          </div>
          <div className="h-0.5 w-12 bg-zinc-800" />
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center text-xs">
              3
            </span>
            <span>ترشيح الوجبات</span>
          </div>
        </div>

        {/* تنبيه حالة نجاح الحفظ أو التحميل */}
        {statusMessage && (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in fade-in">
            <BookmarkCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* قسم المجموعات المحفوظة (Saved Groups) للعملاء المسجلين */}
        {currentUser ? (
          <div className="p-5 rounded-3xl bg-zinc-900 border border-zinc-800/80 space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Bookmark className="w-4 h-4 text-[#F37A20]" />
                <span>مجموعاتك المحفوظة (Saved Groups):</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-400">
                  مرحباً بك {currentUser.user_metadata?.full_name || currentUser.email}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs text-red-400 hover:text-red-300 underline font-medium cursor-pointer"
                  title="تسجيل الخروج والمتابعة كزائر"
                >
                  تسجيل الخروج
                </button>
              </div>
            </div>

            {loadingGroups ? (
              <div className="text-xs text-zinc-500 py-1">جاري تحميل مجموعاتك...</div>
            ) : savedGroups.length > 0 ? (
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                {savedGroups.map((grp) => {
                  const isSelected = savedGroupId === grp.id;
                  const count = grp.group_members?.length || 0;
                  return (
                    <div
                      key={grp.id}
                      onClick={() => handleLoadGroup(grp)}
                      className={`px-3.5 py-2 rounded-2xl flex items-center gap-2.5 cursor-pointer transition-all border shrink-0 ${
                        isSelected
                          ? 'bg-[#F37A20]/15 border-[#F37A20] text-white shadow-md'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-600'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5 text-[#F37A20]" />
                      <div className="text-right">
                        <div className="font-bold text-xs">{grp.name}</div>
                        <div className="text-[10px] text-zinc-400">{count} أفراد</div>
                      </div>

                      {isSelected && (
                        <span className="w-4 h-4 rounded-full bg-[#F37A20] text-black flex items-center justify-center text-[10px] font-black">
                          ✓
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleDeleteGroup(e, grp.id, grp.name)}
                        className="p-1 rounded-lg hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors ml-1"
                        title="حذف هذه المجموعة"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-zinc-950/60 border border-dashed border-zinc-800 text-xs text-zinc-400 flex items-center justify-between flex-wrap gap-2">
                <span>لا توجد مجموعات محفوظة حتى الآن في حسابك. يمكنك إدخال الأفراد وحفظهم للزيارات القادمة!</span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 text-xs text-zinc-400 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>أنت تتصفح كـ <strong className="text-zinc-200">زائر سريع (Guest)</strong>. بياناتك وحساباتك تعمل بالكامل بدون تسجيل.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setShowAuthModal(true);
              }}
              className="text-[#F37A20] hover:underline font-bold cursor-pointer"
            >
              تسجيل الدخول لحسابك لاسترجاع المجموعات ↗
            </button>
          </div>
        )}

        {/* اختيار عدد الأفراد */}
        <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-[#F37A20]/15 text-[#F37A20]">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">عدد الأفراد للوجبة</h2>
                <p className="text-xs text-zinc-400">فرد واحد أو عائلة / مجموعة أصدقاء</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* زر حفظ المجموعة */}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleOpenSaveModal}
                className="gap-1.5 text-xs py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
              >
                <Bookmark className="w-3.5 h-3.5 text-[#F37A20]" />
                <span>حفظ هذه المجموعة</span>
              </Button>

              {/* أزرار سريعة للأفراد */}
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      setPeopleCount(num);
                      setSavedGroupId(null);
                      if (activeTab >= num) setActiveTab(0);
                    }}
                    className={`w-11 h-11 rounded-xl font-extrabold text-base transition-all select-none cursor-pointer ${
                      peopleCount === num
                        ? 'bg-[#F37A20] text-white shadow-lg shadow-[#F37A20]/25 scale-105'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* تبويبات الأفراد لو أكثر من شخص */}
          {peopleCount > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-zinc-800/80 pb-1">
              {people.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveTab(idx)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === idx
                      ? 'bg-zinc-800 text-[#F37A20] border border-[#F37A20]/40'
                      : 'bg-zinc-950 text-zinc-400 hover:text-white border border-transparent'
                  }`}
                >
                  {p.name || `فرد ${idx + 1}`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* نموذج بيانات الفرد المحدد */}
        {currentPerson && (
          <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2 font-bold text-lg text-white">
                <User className="w-5 h-5 text-[#F37A20]" />
                <span>بيانات {currentPerson.name || `الفرد ${activeTab + 1}`}</span>
              </div>

              {/* بطاقة الحرق الحي BMR و TDEE */}
              <div className="flex items-center gap-3 text-xs bg-zinc-950 px-4 py-2 rounded-2xl border border-zinc-800">
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <Flame className="w-4 h-4 text-[#F37A20]" />
                  <span>حرق الراحة (BMR):</span>
                  <span className="font-bold text-[#F37A20]">{liveBmr}</span>
                </div>
                <div className="h-4 w-px bg-zinc-800" />
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>حرق اليوم (TDEE):</span>
                  <span className="font-bold text-emerald-400">{formatKcal(liveTdee)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                label="الاسم (اختياري للتمييز في البون)"
                type="text"
                value={currentPerson.name}
                onChange={(e) => updatePerson(activeTab, { name: e.target.value })}
                placeholder={`فرد ${activeTab + 1}`}
              />

              {/* الجنس */}
              <div className="space-y-1.5 text-right">
                <label className="block text-sm font-semibold text-zinc-300">
                  الجنس
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => updatePerson(activeTab, { gender: 'male' })}
                    className={`py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                      currentPerson.gender === 'male'
                        ? 'bg-[#F37A20] text-white shadow-md'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    ذكر 👨
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePerson(activeTab, { gender: 'female' })}
                    className={`py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                      currentPerson.gender === 'female'
                        ? 'bg-[#F37A20] text-white shadow-md'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    أنثى 👩
                  </button>
                </div>
              </div>

              <Input
                label="العمر (بالسنوات)"
                type="number"
                min={10}
                max={100}
                value={currentPerson.age || ''}
                onChange={(e) => updatePerson(activeTab, { age: Number(e.target.value) })}
                placeholder="30"
              />

              <Input
                label="الطول (بالسنتيمتر)"
                type="number"
                min={100}
                max={230}
                value={currentPerson.heightCm || ''}
                onChange={(e) => updatePerson(activeTab, { heightCm: Number(e.target.value) })}
                placeholder="175"
              />

              <Input
                label="الوزن (بالكيلوجرام)"
                type="number"
                min={30}
                max={250}
                value={currentPerson.weightKg || ''}
                onChange={(e) => updatePerson(activeTab, { weightKg: Number(e.target.value) })}
                placeholder="75"
              />

              {/* مستوى النشاط */}
              <div className="space-y-1.5 text-right">
                <label className="block text-sm font-semibold text-zinc-300">
                  مستوى النشاط البدني
                </label>
                <select
                  value={currentPerson.activityLevel}
                  onChange={(e) =>
                    updatePerson(activeTab, {
                      activityLevel: e.target.value as ActivityLevel,
                    })
                  }
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-[#F37A20] text-sm"
                >
                  <option value="sedentary">خامل / قليل الحركة جداً</option>
                  <option value="light">نشاط خفيف (تمرين 1-3 أيام أسبوعياً)</option>
                  <option value="moderate">نشاط متوسط (تمرين 3-5 أيام أسبوعياً)</option>
                  <option value="active">نشاط عالي (تمرين شاق 6-7 أيام)</option>
                  <option value="very_active">نشاط شاق جداً / عمل يدوي يومي</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* أزرار التنقل */}
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/')}
            className="text-zinc-400 hover:text-white"
          >
            <ArrowRight className="w-5 h-5 ml-1.5" />
            رجوع للرئيسية
          </Button>

          <Button size="lg" onClick={handleNext}>
            <span>التالي: تحديد الميزانية</span>
            <ArrowLeft className="w-5 h-5 mr-1.5" />
          </Button>
        </div>
      </main>

      {/* مودال حفظ المجموعة (Save Group Modal) */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-md w-full relative shadow-2xl text-right space-y-5">
            <button
              onClick={() => setShowSaveModal(false)}
              className="absolute top-5 left-5 text-zinc-400 hover:text-white p-1 rounded-lg bg-zinc-800/60"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#F37A20]/15 rounded-2xl text-[#F37A20]">
                <Bookmark className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">حفظ المجموعة الحالية</h3>
                <p className="text-xs text-zinc-400">
                  احفظ بيانات {people.length} أفراد لاسترجاعهم في أي زيارة لفتح الله
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveGroup} className="space-y-4">
              <Input
                label="اسم المجموعة"
                type="text"
                placeholder="مثال: عائلة أحمد، شلة النادي، أصدقاء العمل"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                required
                autoFocus
              />

              {saveGroupError && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                  {saveGroupError}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={isSavingGroup}
                  className="w-full"
                  size="lg"
                >
                  {isSavingGroup ? 'جاري الحفظ...' : 'حفظ المجموعة في حسابي'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال تسجيل الدخول إذا كان المستخدم زائر وأراد حفظ المجموعة */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-md w-full relative shadow-2xl text-right space-y-5">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-5 left-5 text-zinc-400 hover:text-white p-1 rounded-lg bg-zinc-800/60"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#F37A20]/15 rounded-2xl text-[#F37A20]">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">حفظ المجموعات يتطلب حساب</h3>
                <p className="text-xs text-zinc-400">
                  سجل دخولك أو أنشئ حسابك في ثوانٍ لحفظ مجموعاتك الدائمة
                </p>
              </div>
            </div>

            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setAuthError('');
                }}
                className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                  authMode === 'register'
                    ? 'bg-[#F37A20] text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                حساب جديد
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setAuthError('');
                }}
                className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                  authMode === 'login'
                    ? 'bg-[#F37A20] text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                تسجيل الدخول
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'register' && (
                <Input
                  label="الاسم بالكامل"
                  type="text"
                  placeholder="مثال: أحمد محمد"
                  value={authFullName}
                  onChange={(e) => setAuthFullName(e.target.value)}
                  required
                />
              )}

              <Input
                label="البريد الإلكتروني"
                type="email"
                placeholder="name@example.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                required
              />

              <Input
                label="كلمة المرور"
                type="password"
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
              />

              {authError && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                  {authError}
                </div>
              )}

              <Button
                type="submit"
                disabled={authLoading}
                className="w-full mt-2"
                size="lg"
              >
                {authLoading
                  ? 'جاري المعالجة...'
                  : authMode === 'register'
                  ? 'إنشاء الحساب ومتابعة الحفظ'
                  : 'دخول ومتابعة الحفظ'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
