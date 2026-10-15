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
  Minus,
  Trash2,
  X,
  Check,
  Sparkles,
  UserCheck,
  Heart,
  Smile,
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
      setStatusMessage('تم تسجيل الخروج بنجاح والمتابعة كزائر.');
      setTimeout(() => setStatusMessage(''), 3000);
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

  // ملء بيانات سريعة (1-Tap Presets) لتسهيل الـ UX على الكيوسك
  const applyPreset = (preset: 'young_man' | 'young_woman' | 'child' | 'senior') => {
    if (preset === 'young_man') {
      updatePerson(activeTab, {
        gender: 'male',
        age: 26,
        weightKg: 75,
        heightCm: 175,
        activityLevel: 'moderate',
      });
    } else if (preset === 'young_woman') {
      updatePerson(activeTab, {
        gender: 'female',
        age: 24,
        weightKg: 60,
        heightCm: 165,
        activityLevel: 'light',
      });
    } else if (preset === 'child') {
      updatePerson(activeTab, {
        gender: 'male',
        age: 10,
        weightKg: 35,
        heightCm: 135,
        activityLevel: 'active',
      });
    } else if (preset === 'senior') {
      updatePerson(activeTab, {
        gender: 'male',
        age: 60,
        weightKg: 72,
        heightCm: 168,
        activityLevel: 'sedentary',
      });
    }
  };

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
          throw new Error('لديك مجموعة بهذا الاسم بالفعل. اختر اسماً مميزاً آخر.');
        }
        throw new Error(groupError.message);
      }

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
      setStatusMessage(`تم حفظ مجموعة "${groupData.name}" بنجاح!`);
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
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleNext = () => {
    router.push('/plan/budget');
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-stone-900 flex flex-col">
      <KioskHeader />

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-8 space-y-6">
        {/* شريط المراحل الملون والواضح */}
        <div className="flex items-center justify-between text-xs sm:text-sm font-bold border-b border-orange-200/80 pb-4">
          <div className="flex items-center gap-2 text-red-600">
            <span className="w-7 h-7 rounded-full bg-gradient-to-r from-red-600 to-orange-500 text-white flex items-center justify-center font-black text-xs shadow-sm">
              1
            </span>
            <span>بيانات الأفراد والحجم</span>
          </div>
          <div className="h-1 flex-1 mx-4 rounded-full bg-orange-100" />
          <div className="flex items-center gap-2 text-stone-400">
            <span className="w-7 h-7 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center font-bold text-xs">
              2
            </span>
            <span>الميزانية ونوع الوجبة</span>
          </div>
          <div className="h-1 flex-1 mx-4 rounded-full bg-orange-100" />
          <div className="flex items-center gap-2 text-stone-400">
            <span className="w-7 h-7 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center font-bold text-xs">
              3
            </span>
            <span>ترشيح الوجبات</span>
          </div>
        </div>

        {/* تنبيه حالة نجاح الحفظ أو التحميل */}
        {statusMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-bold flex items-center gap-2.5 shadow-sm animate-in fade-in">
            <BookmarkCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* شريط حساب المستخدم أو الزائر */}
        {currentUser ? (
          <div className="p-5 rounded-3xl bg-white border border-orange-200 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-sm font-black text-stone-900">
                <Bookmark className="w-4 h-4 text-orange-600" />
                <span>مجموعاتك المحفوظة (Saved Groups):</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-stone-600">
                  مرحباً بك {currentUser.user_metadata?.full_name || currentUser.email} 👋
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs text-red-600 hover:text-red-700 underline font-bold cursor-pointer"
                >
                  تسجيل الخروج
                </button>
              </div>
            </div>

            {loadingGroups ? (
              <div className="text-xs text-stone-500 py-1">جاري تحميل مجموعاتك...</div>
            ) : savedGroups.length > 0 ? (
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                {savedGroups.map((grp) => {
                  const isSelected = savedGroupId === grp.id;
                  const count = grp.group_members?.length || 0;
                  return (
                    <div
                      key={grp.id}
                      onClick={() => handleLoadGroup(grp)}
                      className={`px-4 py-2.5 rounded-2xl flex items-center gap-2.5 cursor-pointer transition-all border shrink-0 ${
                        isSelected
                          ? 'bg-orange-50 border-orange-500 text-orange-950 font-black shadow-sm'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:border-orange-300'
                      }`}
                    >
                      <Users className="w-4 h-4 text-orange-600" />
                      <div className="text-right">
                        <div className="font-bold text-xs">{grp.name}</div>
                        <div className="text-[10px] text-stone-500">{count} أفراد</div>
                      </div>

                      {isSelected && (
                        <span className="w-4 h-4 rounded-full bg-orange-600 text-white flex items-center justify-center text-[10px] font-black">
                          ✓
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleDeleteGroup(e, grp.id, grp.name)}
                        className="p-1 rounded-lg hover:bg-red-100 text-stone-400 hover:text-red-600 transition-colors ml-1"
                        title="حذف هذه المجموعة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-orange-50/50 border border-dashed border-orange-200 text-xs text-stone-600 flex items-center justify-between flex-wrap gap-2">
                <span>لا توجد مجموعات محفوظة حالياً. يمكنك إدخال الأفراد وحفظهم للزيارات القادمة!</span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-white border border-orange-200 shadow-sm text-xs text-stone-600 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>أنت تتصفح كـ <strong className="text-stone-900 font-black">طلب فوري بدون تسجيل</strong>. يمكنك الطلب فوراً أو تسجيل الدخول إن أردت.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setShowAuthModal(true);
              }}
              className="text-orange-600 hover:text-red-600 hover:underline font-black cursor-pointer"
            >
              تسجيل الدخول لاسترجاع مجموعاتي ↗
            </button>
          </div>
        )}

        {/* كارت اختيار عدد الأفراد */}
        <div className="p-6 rounded-3xl bg-white border border-orange-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-sm shadow-orange-500/20">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-stone-900">كم شخص سيتناول الوجبة؟</h2>
                <p className="text-xs text-stone-500 font-medium">اختر عدد الأفراد لنحسب حجم الوجبة وتكلفتها بدقة</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleOpenSaveModal}
                className="gap-1.5 text-xs py-2 bg-orange-50 text-orange-950 border-orange-200 shadow-none font-bold"
              >
                <Bookmark className="w-3.5 h-3.5 text-orange-600" />
                <span>حفظ المجموعة</span>
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
                    className={`w-12 h-12 rounded-2xl font-black text-base transition-all select-none cursor-pointer flex items-center justify-center ${
                      peopleCount === num
                        ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-md shadow-orange-500/30 scale-105'
                        : 'bg-stone-100 text-stone-700 hover:bg-orange-50 border border-stone-200'
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
            <div className="flex items-center gap-2 overflow-x-auto pt-3 border-t border-stone-100 pb-1">
              {people.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveTab(idx)}
                  className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === idx
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-sm'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
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
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-orange-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4 flex-wrap gap-3">
              <div className="flex items-center gap-2.5 font-black text-lg text-stone-900">
                <User className="w-5 h-5 text-orange-600" />
                <span>بيانات {currentPerson.name || `الفرد ${activeTab + 1}`}</span>
              </div>

              {/* بطاقة الحرق الحي BMR و TDEE */}
              <div className="flex items-center gap-3 text-xs bg-orange-50/80 px-4 py-2 rounded-2xl border border-orange-200/80">
                <div className="flex items-center gap-1.5 text-stone-700 font-bold">
                  <Flame className="w-4 h-4 text-red-600" />
                  <span>حرق الراحة:</span>
                  <span className="font-black text-red-600">{liveBmr} سعرة</span>
                </div>
                <div className="h-4 w-px bg-orange-200" />
                <div className="flex items-center gap-1.5 text-stone-700 font-bold">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span>احتياج اليوم:</span>
                  <span className="font-black text-emerald-700">{formatKcal(liveTdee)}</span>
                </div>
              </div>
            </div>

            {/* أزرار سريعة بنقرة واحدة لاختيار الفئة لتسهيل الاستخدام على الكيوسك */}
            <div className="space-y-2">
              <span className="text-xs font-black text-stone-600 block">
                ⚡ اختر فئة سريعة بنقرة واحدة (أو عدل يدparam بالأسفل):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => applyPreset('young_man')}
                  className="p-3 rounded-2xl bg-orange-50 hover:bg-orange-100/80 border border-orange-200 text-stone-800 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span className="text-lg">🏃‍♂️</span>
                  <span>شاب (متوسط)</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('young_woman')}
                  className="p-3 rounded-2xl bg-rose-50 hover:bg-rose-100/80 border border-rose-200 text-stone-800 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span className="text-lg">💃</span>
                  <span>شابة (متوسط)</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('child')}
                  className="p-3 rounded-2xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-stone-800 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span className="text-lg">👦</span>
                  <span>طفل (صغير)</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('senior')}
                  className="p-3 rounded-2xl bg-stone-100 hover:bg-stone-200/80 border border-stone-300 text-stone-800 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span className="text-lg">👴</span>
                  <span>كبار السن</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              <Input
                label="الاسم (اختياري لكتابته على البون)"
                type="text"
                value={currentPerson.name}
                onChange={(e) => updatePerson(activeTab, { name: e.target.value })}
                placeholder={`فرد ${activeTab + 1}`}
              />

              {/* الجنس */}
              <div className="space-y-1.5 text-right">
                <label className="block text-sm font-bold text-stone-700">الجنس</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => updatePerson(activeTab, { gender: 'male' })}
                    className={`py-3 rounded-2xl font-black text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      currentPerson.gender === 'male'
                        ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-md'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    <span>ذكر 👨</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePerson(activeTab, { gender: 'female' })}
                    className={`py-3 rounded-2xl font-black text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      currentPerson.gender === 'female'
                        ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-md'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    <span>أنثى 👩</span>
                  </button>
                </div>
              </div>

              {/* العمر مع أزرار + / - للمس السريع */}
              <div className="space-y-1.5 text-right">
                <label className="block text-sm font-bold text-stone-700">العمر (بالسنوات)</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updatePerson(activeTab, {
                        age: Math.max(10, (currentPerson.age || 25) - 1),
                      })
                    }
                    className="w-12 h-12 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 flex items-center justify-center font-black text-lg select-none"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={currentPerson.age || ''}
                    onChange={(e) => updatePerson(activeTab, { age: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-white border border-stone-200 rounded-2xl text-stone-900 text-center font-bold text-lg focus:outline-none focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updatePerson(activeTab, {
                        age: Math.min(100, (currentPerson.age || 25) + 1),
                      })
                    }
                    className="w-12 h-12 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 flex items-center justify-center font-black text-lg select-none"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* الوزن مع أزرار + / - للمس السريع */}
              <div className="space-y-1.5 text-right">
                <label className="block text-sm font-bold text-stone-700">الوزن (بالكيلوجرام)</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updatePerson(activeTab, {
                        weightKg: Math.max(30, (currentPerson.weightKg || 70) - 1),
                      })
                    }
                    className="w-12 h-12 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 flex items-center justify-center font-black text-lg select-none"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={30}
                    max={250}
                    value={currentPerson.weightKg || ''}
                    onChange={(e) => updatePerson(activeTab, { weightKg: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-white border border-stone-200 rounded-2xl text-stone-900 text-center font-bold text-lg focus:outline-none focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updatePerson(activeTab, {
                        weightKg: Math.min(250, (currentPerson.weightKg || 70) + 1),
                      })
                    }
                    className="w-12 h-12 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 flex items-center justify-center font-black text-lg select-none"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* الطول */}
              <div className="space-y-1.5 text-right">
                <label className="block text-sm font-bold text-stone-700">الطول (بالسنتيمتر)</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updatePerson(activeTab, {
                        heightCm: Math.max(100, (currentPerson.heightCm || 170) - 1),
                      })
                    }
                    className="w-12 h-12 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 flex items-center justify-center font-black text-lg select-none"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={100}
                    max={230}
                    value={currentPerson.heightCm || ''}
                    onChange={(e) => updatePerson(activeTab, { heightCm: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-white border border-stone-200 rounded-2xl text-stone-900 text-center font-bold text-lg focus:outline-none focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updatePerson(activeTab, {
                        heightCm: Math.min(230, (currentPerson.heightCm || 170) + 1),
                      })
                    }
                    className="w-12 h-12 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 flex items-center justify-center font-black text-lg select-none"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* مستوى النشاط البدني بصور وأسلوب بسيط وممتع */}
              <div className="space-y-1.5 text-right">
                <label className="block text-sm font-bold text-stone-700">
                  الحركة والنشاط اليومي
                </label>
                <select
                  value={currentPerson.activityLevel}
                  onChange={(e) =>
                    updatePerson(activeTab, {
                      activityLevel: e.target.value as ActivityLevel,
                    })
                  }
                  className="w-full px-4 py-3 bg-white border border-stone-200 rounded-2xl text-stone-900 font-bold focus:outline-none focus:border-orange-500 text-sm shadow-sm"
                >
                  <option value="sedentary">🛋️ قليل الحركة / مكتب ومذاكرة</option>
                  <option value="light">🚶‍♂️ حركة خفيفة / يوم عادي</option>
                  <option value="moderate">🏃‍♂️ نشاط متوسط / تمرين 3 أيام أسبوعياً</option>
                  <option value="active">🔥 نشاط عالي / تمرين يومي أو شغل حركي</option>
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
            className="text-stone-600 hover:text-stone-900 font-bold"
          >
            <ArrowRight className="w-5 h-5 ml-1.5" />
            رجوع للرئيسية
          </Button>

          <Button size="lg" onClick={handleNext} className="gap-2 px-8">
            <span>التالي: تحديد الميزانية والوقت</span>
            <ArrowLeft className="w-5 h-5 mr-1" />
          </Button>
        </div>
      </main>

      {/* مودال حفظ المجموعة */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-orange-200 rounded-3xl p-6 sm:p-8 max-w-md w-full relative shadow-2xl text-right space-y-5">
            <button
              onClick={() => setShowSaveModal(false)}
              className="absolute top-5 left-5 text-stone-400 hover:text-stone-700 p-1 rounded-full bg-stone-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-2xl text-orange-600">
                <Bookmark className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-stone-900">حفظ المجموعة الحالية</h3>
                <p className="text-xs text-stone-500 font-medium">
                  احفظ بيانات هذه المجموعة لتسترجعها بنقرة واحدة في أي زيارة قادمة!
                </p>
              </div>
            </div>

            {saveGroupError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                {saveGroupError}
              </div>
            )}

            <form onSubmit={handleSaveGroup} className="space-y-4">
              <Input
                label="اسم المجموعة"
                type="text"
                placeholder="مثال: عائلتي، شلة النادي، أصحابي"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                required
              />

              <Button
                type="submit"
                disabled={isSavingGroup}
                className="w-full mt-2"
                size="lg"
              >
                {isSavingGroup ? 'جاري الحفظ...' : 'حفظ المجموعة في حسابي'}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* مودال تسجيل الدخول السريع عند الحفظ */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-orange-200 rounded-3xl p-6 sm:p-8 max-w-md w-full relative shadow-2xl text-right space-y-5">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-5 left-5 text-stone-400 hover:text-stone-700 p-1 rounded-full bg-stone-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-2xl text-orange-600">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-stone-900">
                  {authMode === 'login' ? 'تسجيل الدخول' : 'فتح حساب لحفظ المجموعات'}
                </h3>
                <p className="text-xs text-stone-500 font-medium">لحفظ أفرادك والرجوع إليهم دائماً</p>
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'register' && (
                <Input
                  label="اسمك الكريم"
                  type="text"
                  placeholder="محمد أحمد"
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

              <Button
                type="submit"
                disabled={authLoading}
                className="w-full mt-2"
                size="lg"
              >
                {authLoading ? 'جاري التحقق...' : authMode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}
              </Button>
            </form>

            <div className="text-center pt-2 border-t border-stone-100 text-xs text-stone-600">
              {authMode === 'login' ? (
                <span>
                  ليس لديك حساب؟{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthError('');
                      setAuthMode('register');
                    }}
                    className="font-bold text-orange-600 hover:underline"
                  >
                    إنشاء حساب جديد
                  </button>
                </span>
              ) : (
                <span>
                  لديك حساب؟{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthError('');
                      setAuthMode('login');
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
    </div>
  );
}
