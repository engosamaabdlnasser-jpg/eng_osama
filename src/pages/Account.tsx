import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, ImagePlus, LockKeyhole, LogOut, Moon, Save, Sun } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getCourses, getProfile, getUserProgress, updateProfileDetails, uploadProfileAvatar } from '../services/data';
import type { Course, Profile, UserProgress } from '../types';
import { useTheme } from '../components/ThemeProvider';

export default function Account() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [progress, setProgress] = useState<UserProgress>({ completedIds: new Set(), completedAt: {}, lastCompletedAt: null });
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const nav = useNavigate();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) {
        setProfile({ id: 'demo', full_name: 'زائر', phone: null, age: null, avatar_url: null, role: 'student' });
        setName('زائر'); setAvatarUrl(null);
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (!data.user) { nav('/login'); return; }
      setEmail(data.user.email || '');
      const [p, c, pr] = await Promise.all([getProfile(data.user.id), getCourses(), getUserProgress(data.user.id)]);
      if (!active) return;
      setProfile(p);
      setName(p?.full_name || ''); setAvatarUrl(p?.avatar_url || null);
      setCourses(c);
      setProgress(pr);
    }
    load().catch(e => setError(e instanceof Error ? e.message : 'تعذر تحميل حسابك.'));
    return () => { active = false; };
  }, [nav]);

  const lessonCount = courses.reduce((sum, course) => sum + (course.lessons?.length || 0), 0);
  const completedCount = progress.completedIds.size;
  const startedCourses = courses.filter(c => (c.lessons || []).some(l => progress.completedIds.has(l.id)));
  const overallPercent = lessonCount ? Math.round((completedCount / lessonCount) * 100) : 0;

  const continueCourse = useMemo(() => {
    for (const course of startedCourses) {
      const next = [...(course.lessons || [])].sort((a,b) => a.sort_order-b.sort_order).find(l => !progress.completedIds.has(l.id));
      if (next) return { course, lesson: next };
    }
    return null;
  }, [startedCourses, progress.completedIds]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setMsg('');
    if (!supabase || !profile || profile.id === 'demo') return;
    setSaving(true);
    try {
      const updated = await updateProfileDetails(profile.id, name, avatarUrl, profile.phone, profile.age);
      setProfile(updated);
      setMsg('تم حفظ بيانات الملف الشخصي.');
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر حفظ الاسم.'); }
    finally { setSaving(false); }
  }

  async function uploadAvatar(file?: File) {
    if (!file || !profile || profile.id === 'demo') return;
    setError(''); setMsg(''); setAvatarBusy(true);
    try { const url = await uploadProfileAvatar(profile.id, file); const updated = await updateProfileDetails(profile.id, name, url, profile.phone, profile.age); setProfile(updated); setAvatarUrl(url); setMsg('تم تحديث صورة الملف الشخصي.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'تعذر رفع الصورة.'); }
    finally { setAvatarBusy(false); }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setMsg('');
    if (!supabase) return;
    if (password.length < 6) { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل.'); return; }
    if (password !== password2) { setError('تأكيد كلمة المرور غير مطابق.'); return; }
    setPasswordBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword(''); setPassword2(''); setMsg('تم تغيير كلمة المرور بنجاح.');
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر تغيير كلمة المرور.'); }
    finally { setPasswordBusy(false); }
  }

  async function logout() { await supabase?.auth.signOut(); nav('/login'); }

  return <section className="section"><div className="container profile-page">
    <div className="profile-hero surface">
      <label className="profile-avatar profile-avatar-edit" title="تغيير صورة الملف الشخصي">{avatarUrl ? <img src={avatarUrl} alt="صورة الملف الشخصي"/> : <span>{(profile?.full_name || 'ط').trim().charAt(0).toUpperCase() || 'ط'}</span>}<input className="sr-only" type="file" accept="image/*" disabled={avatarBusy} onChange={e=>uploadAvatar(e.target.files?.[0])}/><span className="avatar-edit-badge"><ImagePlus size={15}/></span></label>
      <div className="profile-hero-text"><span className="tag">الملف الشخصي</span><h1 className="section-title">أهلًا {profile?.full_name || 'بك'}</h1><p className="muted">{email || 'حساب طالب'} · {profile?.role === 'admin' ? 'مدير' : 'طالب'}</p></div>
      <div className="profile-actions"><button className="btn btn-ghost" onClick={toggleTheme}>{theme === 'dark' ? <Sun size={17}/> : <Moon size={17}/>} {theme === 'dark' ? 'مظهر فاتح' : 'مظهر داكن'}</button><button className="btn btn-danger" onClick={logout}><LogOut size={17}/> تسجيل الخروج</button></div>
    </div>

    {error && <div className="error" style={{ marginTop: 16 }}>{error}</div>}
    {msg && <div className="notice" style={{ marginTop: 16 }}>{msg}</div>}

    <div className="grid profile-stats" style={{ marginTop: 18 }}>
      <div className="surface stat"><span className="muted">الكورسات التي بدأت</span><strong>{startedCourses.length}</strong></div>
      <div className="surface stat"><span className="muted">الدروس المكتملة</span><strong>{completedCount}</strong></div>
      <div className="surface stat"><span className="muted">نسبة إكمال المحتوى</span><strong>{overallPercent}%</strong></div>
      <div className="surface stat"><span className="muted">آخر نشاط</span><strong style={{ fontSize: 16 }}>{progress.lastCompletedAt ? new Date(progress.lastCompletedAt).toLocaleDateString('ar-EG') : 'لا يوجد بعد'}</strong></div>
    </div>

    {continueCourse && <div className="surface continue-card" style={{ marginTop: 18 }}><div><span className="tag">استكمال التعلم</span><h2>{continueCourse.course.title}</h2><p className="muted">التالي: {continueCourse.lesson.title}</p><div className="progress-cell wide"><div className="progress-bar"><span style={{ width: `${Math.round((continueCourse.course.lessons?.filter(l => progress.completedIds.has(l.id)).length || 0) / Math.max(1, continueCourse.course.lessons?.length || 1) * 100)}%` }} /></div><strong>{Math.round((continueCourse.course.lessons?.filter(l => progress.completedIds.has(l.id)).length || 0) / Math.max(1, continueCourse.course.lessons?.length || 1) * 100)}%</strong></div></div><Link className="btn btn-primary" to={`/courses/${continueCourse.course.id}/lessons/${continueCourse.lesson.id}`}>متابعة التعلم</Link></div>}

    <div className="profile-grid" style={{ marginTop: 18 }}>
      <form className="surface form-grid" style={{ padding: 24 }} onSubmit={saveProfile}>
        <div><span className="tag">بيانات الحساب</span><h2>معلوماتي</h2><p className="muted">يمكنك تعديل الاسم، بينما البريد مرتبط بحساب المصادقة.</p></div>
        <div><label className="label">الاسم</label><input className="input" value={name} onChange={e => setName(e.target.value)} /></div>
        <div><label className="label">البريد الإلكتروني</label><input className="input" value={email} disabled /></div>
        <button className="btn btn-primary" disabled={saving}><Save size={17}/> {saving ? 'جاري الحفظ...' : 'حفظ البيانات'}</button>
      </form>

      <form className="surface form-grid" style={{ padding: 24 }} onSubmit={changePassword}>
        <div><span className="tag">الأمان</span><h2>تغيير كلمة المرور</h2><p className="muted">استخدم 6 أحرف على الأقل، ويفضل كلمة مرور قوية وفريدة.</p></div>
        <div><label className="label">كلمة المرور الجديدة</label><input className="input" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></div>
        <div><label className="label">تأكيد كلمة المرور</label><input className="input" type="password" autoComplete="new-password" value={password2} onChange={e => setPassword2(e.target.value)} /></div>
        <button className="btn btn-primary" disabled={passwordBusy}><LockKeyhole size={17}/> {passwordBusy ? 'جاري التغيير...' : 'تغيير كلمة المرور'}</button>
      </form>
    </div>

    <div style={{ marginTop: 28 }}><div className="section-head"><div><span className="tag">مساري التعليمي</span><h2 className="section-title">الكورسات الحالية</h2></div><Link className="btn btn-ghost" to="/courses">استكشف المزيد</Link></div>
      {startedCourses.length ? <div className="grid">{startedCourses.map(course => { const total=course.lessons?.length||0; const done=course.lessons?.filter(l=>progress.completedIds.has(l.id)).length||0; const pct=total?Math.round(done/total*100):0; const next=course.lessons?.find(l=>!progress.completedIds.has(l.id)); return <div className="surface course-progress-card" key={course.id}><div><span className="muted small">{course.category?.name || 'كورس'}</span><h3>{course.title}</h3><div className="progress-cell wide"><div className="progress-bar"><span style={{width:`${pct}%`}}/></div><strong>{pct}%</strong></div><p className="muted small">{done} من {total} درس مكتمل</p></div>{next ? <Link className="btn btn-primary" to={`/courses/${course.id}/lessons/${next.id}`}>متابعة</Link> : <span className="completed-badge"><CheckCircle2 size={16}/> مكتمل</span>}</div>})}</div> : <div className="surface empty"><Clock3 size={30} /><p>لم تبدأ أي كورس بعد. ابدأ أول رحلة تعليمية الآن.</p><Link className="btn btn-primary" to="/courses">استكشف الكورسات</Link></div>}
    </div>
  </div></section>;
}
