'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  User,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Trash2,
  X,
  Check,
  Sparkles,
  UserCheck,
  Heart,
  Smile,
  Mars,
  Venus,
  Copy,
  LogOut,
  Plus,
} from 'lucide-react';
import { KioskHeader } from '@/components/layout/KioskHeader';
import { StepBar } from '@/components/layout/StepBar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DialStepper } from '@/components/people/DialStepper';
import { KcalRing, useCountUp } from '@/components/people/KcalRing';
import { usePlannerStore } from '@/features/planner/store/planner.store';
import { calculateBmr } from '@/features/nutrition/domain/bmr';
import { calculateTdee } from '@/features/nutrition/domain/tdee';
import { calculateMacroTargets } from '@/features/nutrition/domain/macros';
import { ActivityLevel, PersonInput } from '@/features/nutrition/domain/types';
import { createClient } from '@/lib/supabase/client';
import { validatePeople } from '@/lib/data/order';
import { getDataMode } from '@/lib/data/config';
import { listGroups, saveGroup, deleteGroup, errorMessage, type SavedGroup } from '@/lib/data/repository';

async function fetchGroupSession() {
  const local = getDataMode() === 'local';
  const user = local ? { id: 'local-demo', is_anonymous: false, email: 'مجموعات العرض المحلي' } : (await createClient().auth.getUser()).data.user;
  const groups = user && !user.is_anonymous ? await listGroups() : [];
  return { user, groups };
}

function personTdee(p?: PersonInput): number {
  if (!p || p.weightKg <= 0 || p.heightCm <= 0 || p.age <= 0) return 0;
  try {
    return Math.round(calculateTdee(calculateBmr(p.gender, p.weightKg, p.heightCm, p.age), p.activityLevel));
  } catch {
    return 0;
  }
}

const ACTIVITY: { id: ActivityLevel; label: string }[] = [
  { id: 'sedentary', label: 'قليل' },
  { id: 'light', label: 'خفيف' },
  { id: 'moderate', label: 'متوسط' },
  { id: 'active', label: 'عالي' },
];

const PRESETS = [
  { key: 'young_man', label: 'شاب', icon: UserCheck },
  { key: 'young_woman', label: 'شابة', icon: Sparkles },
  { key: 'child', label: 'طفل', icon: Smile },
  { key: 'senior', label: 'كبير', icon: Heart },
] as const;

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
  const [currentUser, setCurrentUser] = useState<{ id: string; is_anonymous?: boolean; email?: string; user_metadata?: { full_name?: string } } | null>(null);
  const [savedGroups, setSavedGroups] = useState<SavedGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showGroupsModal, setShowGroupsModal] = useState(false);
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
      const { user, groups } = await fetchGroupSession();
      setCurrentUser(user);
      setSavedGroups(groups);
    } catch (error) { setStatusMessage(errorMessage(error)); }
    finally { setLoadingGroups(false); }
  };

  // تسجيل الخروج والتحول إلى زائر
  const handleLogout = async () => {
    try {
      if (getDataMode() === 'supabase') await createClient().auth.signOut();
      setCurrentUser(null);
      setSavedGroups([]);
      setSavedGroupId(null);
      setStatusMessage('تم الخروج');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch {
      //
    }
  };

  useEffect(() => {
    let active = true;
    fetchGroupSession().then(({user, groups}) => { if (active) { setCurrentUser(user); setSavedGroups(groups); } }).catch(error => { if (active) setStatusMessage(errorMessage(error)); }).finally(() => { if (active) setLoadingGroups(false); });
    return () => { active = false; };
  }, []);

  const currentPerson = people[activeTab] || people[0];

  const liveTdee = personTdee(currentPerson);
  const macros = calculateMacroTargets(liveTdee);
  const groupTdee = people.reduce((sum, p) => sum + personTdee(p), 0);
  const groupShown = useCountUp(groupTdee);

  const openGroups = () => {
    if (!currentUser || currentUser.is_anonymous) {
      setAuthMode('login');
      setShowAuthModal(true);
    } else {
      setShowGroupsModal(true);
    }
  };

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
  const handleLoadGroup = (group: SavedGroup) => {
    if (!group.people.length) return;
    setPeople(group.people);
    setActiveTab(0);
    setSavedGroupId(group.id);
    setShowGroupsModal(false);
    setStatusMessage(`تم تحميل "${group.name}"`);
  };

  // حذف مجموعة محفوظة
  const handleDeleteGroup = async (e: React.MouseEvent, groupId: string, groupName: string) => {
    e.stopPropagation();
    if (!window.confirm(`حذف "${groupName}"؟`)) return;

    try {
      await deleteGroup(groupId);
      if (savedGroupId === groupId) {
        setSavedGroupId(null);
      }
      setSavedGroups((prev) => prev.filter((g) => g.id !== groupId));
      setStatusMessage('تم الحذف');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch {
      //
    }
  };

  // فتح نافذة الحفظ
  const handleOpenSaveModal = () => {
    setSaveGroupError('');
    if (getDataMode() !== 'local' && (!currentUser || currentUser.is_anonymous)) {
      setShowAuthModal(true);
    } else {
      setShowSaveModal(true);
    }
  };

  // حفظ المجموعة الحالية في Supabase
  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      setSaveGroupError('اكتب اسم المجموعة');
      return;
    }
    setSaveGroupError('');
    setIsSavingGroup(true);

    try {
      const id = await saveGroup(newGroupName, people);
      setSavedGroupId(id);
      setShowSaveModal(false);
      setNewGroupName('');
      setStatusMessage(`تم حفظ "${newGroupName}"`);
      setTimeout(() => setStatusMessage(''), 5000);
      await loadUserAndGroups();
    } catch (err: unknown) {
      setSaveGroupError(err instanceof Error ? err.message : 'تعذر الحفظ');
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
        if (!authFullName.trim()) throw new Error('اكتب اسمك');
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
      const msg = err instanceof Error ? err.message : 'تعذر التسجيل';
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleApplyToAll = () => {
    const current = people[activeTab];
    if (!current) return;
    const updated = people.map((p, idx) => ({
      ...p,
      age: current.age,
      gender: current.gender,
      heightCm: current.heightCm,
      weightKg: current.weightKg,
      activityLevel: current.activityLevel,
      name: p.name || `فرد ${idx + 1}`,
    }));
    setPeople(updated);
    setStatusMessage('تم التطبيق على الكل');
    setTimeout(() => setStatusMessage(''), 4000);
  };

  const handleNext = () => {
    try { validatePeople(people); router.push('/plan/budget'); } catch (error) { setStatusMessage(errorMessage(error)); }
  };

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#F8F4EE] text-[#1E1210] flex flex-col select-none">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="anim-blob absolute -top-32 -right-24 w-[30rem] h-[30rem] rounded-full bg-[#6B0F1A]/12 blur-3xl" />
        <div className="anim-blob-slow absolute -bottom-40 -left-28 w-[34rem] h-[34rem] rounded-full bg-[#E5A91E]/20 blur-3xl" />
      </div>

      <KioskHeader />

      <main className="relative z-10 flex-1 min-h-0 w-full max-w-[92rem] mx-auto px-5 sm:px-8 py-4 sm:py-5 flex flex-col gap-4">
        <div className="anim-fade-up">
          <StepBar current={1} />
        </div>

        {statusMessage && (
          <div
            role="status"
            className="anim-fade-up fixed top-20 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-full bg-[#1E1210] text-white font-black text-sm shadow-2xl flex items-center gap-2"
          >
            <BookmarkCheck className="w-5 h-5 text-[#E5A91E]" />
            <span>{statusMessage}</span>
          </div>
        )}

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[19.4rem_1fr] gap-5">
          {/* العدد وقائمة الأفراد */}
          <aside className="anim-fade-up min-h-0 flex flex-col gap-4 rounded-[32px] bg-white/90 backdrop-blur border-2 border-[#E7D7C7] shadow-[0_18px_40px_-22px_rgba(43,24,16,0.35)] p-5" style={{ animationDelay: '80ms' }}>
            <div className="flex shrink-0">
              <DialStepper
                label="عدد الأفراد"
                size="lg"
                value={peopleCount}
                min={1}
                max={30}
                onChange={(n) => {
                  setPeopleCount(n);
                  setSavedGroupId(null);
                  if (activeTab >= n) setActiveTab(0);
                }}
              />
            </div>

            <div className="flex-1 min-h-[120px] overflow-y-auto -mx-1 px-1 space-y-2 pb-1">
              {people.map((p, idx) => {
                const active = idx === activeTab;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveTab(idx)}
                    className={`group w-full flex items-center gap-3 rounded-2xl p-2.5 border-2 text-right transition-all duration-300 cursor-pointer ${
                      active
                        ? 'bg-gradient-to-l from-[#6B0F1A] to-[#8B1422] border-[#3E080F] text-white shadow-lg -translate-x-1'
                        : 'bg-white border-[#E7D7C7] hover:border-[#6B0F1A]/50 hover:-translate-x-0.5'
                    }`}
                  >
                    <span
                      className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-lg shrink-0 ${
                        active ? 'bg-white/20' : 'bg-[#F8F4EE] text-[#6B0F1A]'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-black truncate">{p.name || `فرد ${idx + 1}`}</span>
                      <span className={`block text-sm font-bold tabular-nums ${active ? 'text-white/80' : 'text-stone-500'}`}>
                        {personTdee(p).toLocaleString('en-US')}
                      </span>
                    </span>
                    {active && <Check className="w-5 h-5 stroke-[3] text-[#E5A91E]" />}
                  </button>
                );
              })}
              {peopleCount < 30 && (
                <button
                  type="button"
                  onClick={() => {
                    setPeopleCount(peopleCount + 1);
                    setSavedGroupId(null);
                    setActiveTab(peopleCount);
                  }}
                  className="w-full h-[4.1rem] rounded-2xl border-2 border-dashed border-[#6B0F1A]/40 text-[#6B0F1A] font-black flex items-center justify-center gap-2 hover:bg-[#FAF0F0] hover:border-[#6B0F1A] active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Plus className="w-6 h-6 stroke-[3]" />
                  <span>فرد</span>
                </button>
              )}
            </div>

            {peopleCount > 1 && (
              <div className="rounded-2xl bg-[#FAF0F0] border-2 border-[#6B0F1A]/20 px-4 py-3 flex items-center justify-between">
                <span className="font-black text-[#6B0F1A]">الكل</span>
                <span className="text-2xl font-black text-[#6B0F1A] tabular-nums">{groupShown.toLocaleString('en-US')}</span>
              </div>
            )}
          </aside>

          {/* بيانات الفرد */}
          {currentPerson && (
            <section className="anim-fade-up min-h-0 rounded-[32px] bg-white/90 backdrop-blur border-2 border-[#E7D7C7] shadow-[0_18px_40px_-22px_rgba(43,24,16,0.35)] p-5 sm:p-6 flex flex-col gap-4" style={{ animationDelay: '160ms' }}>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-black flex items-center gap-2">
                  <User className="w-6 h-6 text-[#6B0F1A]" />
                  <span>{currentPerson.name || `فرد ${activeTab + 1}`}</span>
                </h2>
                <div className="flex-1" />
                {PRESETS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyPreset(key)}
                    className="h-12 px-5 rounded-full bg-[#F8F4EE] border-2 border-[#E7D7C7] hover:border-[#6B0F1A] hover:bg-[#FAF0F0] active:scale-95 font-black flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Icon className="w-5 h-5 text-[#6B0F1A]" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[14rem_1fr] gap-6 items-center">
                <div className="flex flex-col items-center gap-3">
                  <KcalRing value={liveTdee} caption="سعرة / يوم" />
                  <div className="flex items-center justify-center gap-2 flex-wrap text-sm font-black tabular-nums">
                    <span className="px-3 py-1 rounded-full border-2 bg-amber-50 text-amber-800 border-amber-300">كارب {macros.carbsG}جم</span>
                    <span className="px-3 py-1 rounded-full border-2 bg-rose-50 text-rose-800 border-rose-300">بروتين {macros.proteinG}جم</span>
                    <span className="px-3 py-1 rounded-full border-2 bg-sky-50 text-sky-800 border-sky-300">دهون {macros.fatG}جم</span>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_1.6fr] gap-4">
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-black text-stone-600 px-1">النوع</span>
                      <div className="grid grid-cols-2 gap-2 h-[5.25rem]">
                        {([
                          ['male', 'ذكر', Mars],
                          ['female', 'أنثى', Venus],
                        ] as const).map(([val, label, Icon]) => {
                          const on = currentPerson.gender === val;
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => updatePerson(activeTab, { gender: val })}
                              className={`rounded-2xl border-2 font-black text-lg flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer ${
                                on
                                  ? 'bg-gradient-to-b from-[#8B1422] to-[#6B0F1A] text-white border-[#3E080F] shadow-[0_4px_0_0_#3E080F] -translate-y-0.5'
                                  : 'bg-white text-stone-700 border-[#D6C7B2] shadow-[0_4px_0_0_#C4B29A] hover:border-[#6B0F1A]'
                              }`}
                            >
                              <Icon className={`w-6 h-6 ${on ? 'scale-110' : ''} transition-transform`} />
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-black text-stone-600 px-1">النشاط</span>
                      <div className="grid grid-cols-4 gap-2 h-[5.25rem]">
                        {ACTIVITY.map(({ id, label }, i) => {
                          const on = currentPerson.activityLevel === id;
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => updatePerson(activeTab, { activityLevel: id })}
                              className={`rounded-2xl border-2 font-black flex flex-col items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer ${
                                on
                                  ? 'bg-[#FEF9EE] border-[#D97706] text-[#854D0E] shadow-md -translate-y-0.5'
                                  : 'bg-white border-[#D6C7B2] text-stone-600 hover:border-[#D97706]'
                              }`}
                            >
                              <span className="flex items-end gap-0.5 h-4" aria-hidden="true">
                                {[0, 1, 2, 3].map((b) => (
                                  <span
                                    key={b}
                                    className={`w-1.5 rounded-sm transition-colors ${b <= i ? (on ? 'bg-[#D97706]' : 'bg-stone-400') : 'bg-stone-200'}`}
                                    style={{ height: 5 + b * 3.5 }}
                                  />
                                ))}
                              </span>
                              <span className="text-sm">{label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <DialStepper label="العمر" unit="سنة" value={currentPerson.age || 25} min={10} max={100} onChange={(v) => updatePerson(activeTab, { age: v })} />
                    <DialStepper label="الوزن" unit="كجم" value={currentPerson.weightKg || 70} min={25} max={250} onChange={(v) => updatePerson(activeTab, { weightKg: v })} />
                    <DialStepper label="الطول" unit="سم" value={currentPerson.heightCm || 170} min={100} max={230} onChange={(v) => updatePerson(activeTab, { heightCm: v })} />
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* الشريط السفلي */}
        <div className="sticky bottom-0 z-20 -mx-5 sm:-mx-8 px-5 sm:px-8 py-3 bg-[#F8F4EE]/90 backdrop-blur-sm anim-fade-up flex items-center gap-3 flex-wrap" style={{ animationDelay: '240ms' }}>
          <Button variant="outline" size="lg" onClick={() => router.push('/')} className="font-black">
            <ArrowRight className="w-5 h-5 ml-1.5" />
            <span>رجوع</span>
          </Button>

          <div className="flex-1" />

          {peopleCount > 1 && (
            <Button variant="outline" size="lg" onClick={handleApplyToAll} className="font-black">
              <Copy className="w-5 h-5 ml-1.5 text-[#6B0F1A]" />
              <span>طبّق على الكل</span>
            </Button>
          )}
          <Button variant="outline" size="lg" onClick={openGroups} className="font-black">
            <Users className="w-5 h-5 ml-1.5 text-[#6B0F1A]" />
            <span>مجموعاتي</span>
          </Button>
          <Button variant="outline" size="lg" onClick={handleOpenSaveModal} className="font-black">
            <Bookmark className="w-5 h-5 ml-1.5 text-[#6B0F1A]" />
            <span>حفظ</span>
          </Button>
          <Button size="xl" variant="primary" onClick={handleNext} className="gap-2 px-12 font-black text-lg">
            <span>التالي</span>
            <ArrowLeft className="w-6 h-6 mr-1" />
          </Button>
        </div>
      </main>

      {/* مودال المجموعات المحفوظة */}
      {showGroupsModal && (
        <div className="fixed inset-0 z-50 bg-[#1E1210]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="anim-fade-up bg-white border-2 border-[#6B0F1A] rounded-[28px] p-6 sm:p-8 max-w-lg w-full relative shadow-2xl text-right space-y-4">
            <button
              onClick={() => setShowGroupsModal(false)}
              aria-label="إغلاق"
              className="absolute top-5 left-5 text-stone-400 hover:text-stone-700 p-1.5 rounded-full bg-stone-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-2xl font-black flex items-center gap-2">
              <Users className="w-6 h-6 text-[#6B0F1A]" />
              <span>مجموعاتي</span>
            </h3>

            {loadingGroups ? (
              <div className="py-6 text-center text-stone-500">...</div>
            ) : savedGroups.length === 0 ? (
              <div className="py-8 text-center text-stone-500 font-bold">مفيش مجموعات محفوظة</div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {savedGroups.map((grp) => (
                  <div
                    key={grp.id}
                    onClick={() => handleLoadGroup(grp)}
                    className={`p-3.5 rounded-2xl border-2 flex items-center gap-3 cursor-pointer transition-all ${
                      savedGroupId === grp.id ? 'bg-[#FAF0F0] border-[#6B0F1A]' : 'bg-white border-[#E7D7C7] hover:border-[#6B0F1A]/60'
                    }`}
                  >
                    <Users className="w-5 h-5 text-[#6B0F1A]" />
                    <div className="flex-1 font-black">{grp.name}</div>
                    <span className="text-sm text-stone-500 font-bold">{grp.people.length}</span>
                    <button
                      type="button"
                      aria-label="حذف"
                      onClick={(e) => handleDeleteGroup(e, grp.id, grp.name)}
                      className="p-2 rounded-lg hover:bg-red-100 text-stone-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {currentUser && getDataMode() === 'supabase' && (
              <button
                type="button"
                onClick={() => { setShowGroupsModal(false); handleLogout(); }}
                className="text-sm text-stone-500 hover:text-red-600 font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>خروج</span>
              </button>
            )}
          </div>
        </div>
      )}

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
              <h3 className="text-xl font-black text-stone-900">حفظ المجموعة</h3>
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
                placeholder="مثال: عائلتي"
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
                {isSavingGroup ? '...' : 'حفظ'}
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
              <h3 className="text-xl font-black text-stone-900">
                {authMode === 'login' ? 'دخول' : 'حساب جديد'}
              </h3>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'register' && (
                <Input
                  label="الاسم"
                  type="text"
                  placeholder="محمد أحمد"
                  value={authFullName}
                  onChange={(e) => setAuthFullName(e.target.value)}
                  required
                />
              )}

              <Input
                label="البريد"
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
                {authLoading ? '...' : authMode === 'login' ? 'دخول' : 'إنشاء حساب'}
              </Button>
            </form>

            <div className="text-center pt-2 border-t border-stone-100 text-xs text-stone-600">
              {authMode === 'login' ? (
                <span>
                  مفيش حساب؟{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthError('');
                      setAuthMode('register');
                    }}
                    className="font-bold text-orange-600 hover:underline"
                  >
                    حساب جديد
                  </button>
                </span>
              ) : (
                <span>
                  عندك حساب؟{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthError('');
                      setAuthMode('login');
                    }}
                    className="font-bold text-orange-600 hover:underline"
                  >
                    دخول
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
