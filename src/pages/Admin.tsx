import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { createCategory, deleteCategory, getAdminProfiles, getAllCourses, getCategories, getProfile, renameCategory, setUserRole } from '../services/data';
import type { Category, Course, Profile } from '../types';

export default function Admin() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [newCat, setNewCat] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const nav = useNavigate();

  async function load() {
    if (!supabase) { setError('Supabase غير مربوط. اربط المشروع بقاعدة البيانات لتفعيل لوحة الإدارة.'); return; }
    const { data } = await supabase.auth.getUser();
    if (!data.user) { nav('/login'); return; }
    const p = await getProfile(data.user.id);
    if (p?.role !== 'admin') { setError('ليس لديك صلاحية للوصول إلى لوحة الإدارة.'); return; }
    setProfile(p);
    const [c, k, u] = await Promise.all([getAllCourses(), getCategories(), getAdminProfiles()]);
    setCourses(c); setCats(k); setUsers(u);
  }

  useEffect(() => { load().catch(e => setError(e instanceof Error ? e.message : 'حدث خطأ')); }, [nav]);

  async function togglePublished(course: Course) {
    if (!supabase) return;
    setError(''); setMsg('');
    const { error } = await supabase.from('courses').update({ published: !course.published }).eq('id', course.id);
    if (error) setError(error.message); else { setMsg(course.published ? 'تم إخفاء الكورس.' : 'تم نشر الكورس.'); setCourses(xs => xs.map(x => x.id === course.id ? { ...x, published: !x.published } : x)); }
  }

  async function removeCourse(course: Course) {
    if (!supabase || !confirm(`حذف الكورس «${course.title}»؟ سيتم حذف دروسه أيضًا.`)) return;
    const { error } = await supabase.from('courses').delete().eq('id', course.id);
    if (error) setError(error.message); else { setMsg('تم حذف الكورس.'); setCourses(xs => xs.filter(x => x.id !== course.id)); }
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault(); if (!newCat.trim()) return;
    try { const c = await createCategory(newCat); setCats(xs => [...xs, c].sort((a,b) => a.name.localeCompare(b.name, 'ar'))); setNewCat(''); setMsg('تمت إضافة التصنيف.'); } catch (e) { setError(e instanceof Error ? e.message : 'تعذر إضافة التصنيف'); }
  }

  async function editCategory(c: Category) {
    const name = prompt('اسم التصنيف الجديد:', c.name)?.trim();
    if (!name || name === c.name) return;
    try { const updated = await renameCategory(c.id, name); setCats(xs => xs.map(x => x.id === c.id ? updated : x)); setMsg('تم تعديل التصنيف.'); } catch (e) { setError(e instanceof Error ? e.message : 'تعذر تعديل التصنيف'); }
  }

  async function changeRole(u: Profile) {
    if (!supabase || !profile || u.id === profile.id) { setError('لا يمكن تغيير صلاحية حسابك من هنا.'); return; }
    const next = u.role === 'admin' ? 'student' : 'admin';
    if (!confirm(`تغيير صلاحية ${u.full_name || 'هذا المستخدم'} إلى ${next === 'admin' ? 'مدير' : 'طالب'}؟`)) return;
    try { const updated = await setUserRole(u.id, next); setUsers(xs => xs.map(x => x.id === u.id ? updated : x)); setMsg('تم تحديث الصلاحية.'); } catch (e) { setError(e instanceof Error ? e.message : 'تعذر تحديث الصلاحية'); }
  }

  async function removeCategory(c: Category) {
    if (!confirm(`حذف التصنيف «${c.name}»؟`)) return;
    try { await deleteCategory(c.id); setCats(xs => xs.filter(x => x.id !== c.id)); setMsg('تم حذف التصنيف.'); } catch (e) { setError(e instanceof Error ? e.message : 'تعذر حذف التصنيف'); }
  }

  const lessonsCount = useMemo(() => courses.reduce((n, c) => n + (c.lessons?.length ?? 0), 0), [courses]);
  if (error && !profile) return <div className="container section"><div className="surface empty"><h1>لوحة الإدارة</h1><p className="error">{error}</p><Link className="btn btn-primary" to="/">العودة للرئيسية</Link></div></div>;

  return <section className="section"><div className="container">
    <div className="section-head"><div><span className="tag">Admin</span><h1 className="section-title">لوحة التحكم</h1><p className="muted">مرحبًا {profile?.full_name || 'Admin'} — كل إدارة المنصة من هنا.</p></div><Link className="btn btn-primary" to="/admin/courses/new">إضافة كورس</Link></div>
    {error && <div className="error" style={{marginBottom:12}}>{error}</div>}{msg && <div className="notice" style={{marginBottom:12}}>{msg}</div>}
    <div className="grid admin-stats"><div className="surface stat"><span className="muted">المستخدمون</span><strong>{users.length}</strong></div><div className="surface stat"><span className="muted">الكورسات</span><strong>{courses.length}</strong></div><div className="surface stat"><span className="muted">الدروس</span><strong>{lessonsCount}</strong></div><div className="surface stat"><span className="muted">التصنيفات</span><strong>{cats.length}</strong></div></div>

    <div className="admin-columns">
      <div className="surface table-wrap"><div className="admin-panel-head"><div><h2>الكورسات</h2><p className="muted">إضافة، تعديل، نشر أو إخفاء وحذف.</p></div></div><table className="table"><thead><tr><th>الكورس</th><th>الحالة</th><th>الدروس</th><th>إجراء</th></tr></thead><tbody>{courses.map(c => <tr key={c.id}><td><strong>{c.title}</strong><div className="muted small">{c.category?.name || 'بدون تصنيف'}</div></td><td><button className="status-button" onClick={() => togglePublished(c)}>{c.published ? 'منشور' : 'مخفي'}</button></td><td>{c.lessons?.length ?? 0}</td><td><div className="rtl-row"><Link className="btn btn-ghost" to={`/admin/courses/${c.id}/edit`}>تعديل</Link><button className="btn btn-danger" onClick={() => removeCourse(c)}>حذف</button></div></td></tr>)}</tbody></table>{!courses.length && <div className="empty">لا توجد كورسات بعد.</div>}</div>

      <div className="grid" style={{gap:18}}>
        <div className="surface admin-panel"><div className="admin-panel-head"><div><h2>التصنيفات</h2><p className="muted">تحكم سريع في المجالات.</p></div></div><form className="rtl-row" onSubmit={addCategory}><input className="input" value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="اسم التصنيف" required/><button className="btn btn-primary">إضافة</button></form><div className="admin-list">{cats.map(c => <div className="admin-list-row" key={c.id}><strong>{c.name}</strong><div className="rtl-row"><button className="btn btn-ghost" onClick={() => editCategory(c)}>تعديل</button><button className="btn btn-danger" onClick={() => removeCategory(c)}>حذف</button></div></div>)}</div></div>
        <div className="surface admin-panel"><div className="admin-panel-head"><div><h2>المستخدمون</h2><p className="muted">الحسابات المسجلة وصلاحياتها.</p></div></div><div className="admin-list">{users.slice(0, 12).map(u => <div className="admin-list-row" key={u.id}><div><strong>{u.full_name || 'بدون اسم'}</strong><div className="muted small">{u.role === 'admin' ? 'مدير' : 'طالب'}</div></div><div className="rtl-row"><span className="tag">{u.role}</span>{u.id !== profile?.id && <button className="btn btn-ghost" onClick={() => changeRole(u)}>{u.role === 'admin' ? 'جعله طالبًا' : 'جعله مديرًا'}</button>}</div></div>)}</div>{users.length > 12 && <p className="muted small">عرض أول 12 مستخدمًا.</p>}</div>
      </div>
    </div>
  </div></section>;
}
