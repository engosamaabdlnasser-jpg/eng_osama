import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getCategories, getCourse, getProfile, uploadCourseImage } from '../services/data';
import { extractYouTubeVideoId } from '../utils/youtube';
import type { Category, Course, Lesson } from '../types';

export default function AdminCourse() {
  const { id } = useParams(); const edit = Boolean(id); const nav = useNavigate();
  const [cats, setCats] = useState<Category[]>([]); const [course, setCourse] = useState<Course | null>(null);
  const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [instructor, setInstructor] = useState('ENG OSAMA'); const [category, setCategory] = useState(''); const [image, setImage] = useState(''); const [published, setPublished] = useState(false); const [lessons, setLessons] = useState<Lesson[]>([]);
  const [imageBusy, setImageBusy] = useState(false); const [ltitle, setLtitle] = useState(''); const [lurl, setLurl] = useState(''); const [ldesc, setLdesc] = useState(''); const [error, setError] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);

  useEffect(() => { (async () => {
    if (!supabase) { setError('Supabase غير مربوط. هذه الصفحة تحتاج قاعدة بيانات حقيقية.'); return; }
    const { data } = await supabase.auth.getUser(); if (!data.user) { nav('/login'); return; }
    const p = await getProfile(data.user.id); if (p?.role !== 'admin') { setError('غير مصرح.'); return; }
    setCats(await getCategories());
    if (edit && id) { const c = await getCourse(id); if (!c) { setError('الكورس غير موجود.'); return; } setCourse(c); setTitle(c.title); setDescription(c.description); setInstructor(c.instructor_name); setCategory(c.category_id ?? ''); setImage(c.image_url ?? ''); setPublished(c.published); setLessons([...(c.lessons ?? [])].sort((a,b) => a.sort_order - b.sort_order)); }
  })().catch(e => setError(e instanceof Error ? e.message : 'حدث خطأ')); }, [edit, id, nav]);

  async function uploadImage(file?: File) {
    if (!file) return; setError(''); setMsg(''); setImageBusy(true);
    try { setImage(await uploadCourseImage(file)); setMsg('تم رفع صورة الكورس. احفظ الكورس لتثبيتها.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'تعذر رفع الصورة.'); }
    finally { setImageBusy(false); }
  }

  async function save(e: React.FormEvent) { e.preventDefault(); setError(''); setMsg(''); if (!supabase) return; setBusy(true); try {
    const payload = { title: title.trim(), description: description.trim(), image_url: image.trim() || null, category_id: category || null, instructor_name: instructor.trim() || 'ENG OSAMA', published };
    let cid = id; if (edit && id) { const { error } = await supabase.from('courses').update(payload).eq('id', id); if (error) throw error; } else { const { data, error } = await supabase.from('courses').insert(payload).select('id').single(); if (error) throw error; cid = data.id; }
    setMsg('تم حفظ الكورس بنجاح.'); if (!edit && cid) nav(`/admin/courses/${cid}/edit`);
  } catch (e) { setError(e instanceof Error ? e.message : 'تعذر حفظ الكورس'); } finally { setBusy(false); } }

  async function addLesson(e: React.FormEvent) { e.preventDefault(); setError(''); if (!supabase || !course) return; const video = extractYouTubeVideoId(lurl); if (!video) { setError('رابط YouTube غير صالح. استخدم رابط watch أو youtu.be أو embed.'); return; } setBusy(true); try {
    const { data, error } = await supabase.from('lessons').insert({ course_id: course.id, title: ltitle.trim(), description: ldesc.trim(), youtube_url: lurl.trim(), sort_order: lessons.length + 1 }).select().single(); if (error) throw error;
    setLessons(xs => [...xs, data as Lesson]); setLtitle(''); setLurl(''); setLdesc(''); setMsg('تم إضافة الدرس بنجاح.');
  } catch (e) { setError(e instanceof Error ? e.message : 'تعذر إضافة الدرس'); } finally { setBusy(false); } }

  async function removeLesson(lid: string) { if (!supabase || !confirm('هل أنت متأكد من حذف هذا الدرس؟')) return; const { error } = await supabase.from('lessons').delete().eq('id', lid); if (error) { setError(error.message); return; } setLessons(x => x.filter(l => l.id !== lid)); setMsg('تم حذف الدرس.'); }

  if (error && (!supabase || (!course && edit))) return <div className="container section"><div className="surface empty"><div className="error">{error}</div><Link className="btn btn-primary" to="/admin">العودة</Link></div></div>;
  return <section className="section"><div className="container" style={{maxWidth:900}}><Link className="muted" to="/admin">← لوحة التحكم</Link><h1 className="section-title" style={{marginTop:14}}>{edit ? 'تعديل الكورس' : 'إضافة كورس'}</h1>
    <form className="surface form-grid" style={{padding:24}} onSubmit={save}>
      <div><label className="label">العنوان</label><input className="input" required value={title} onChange={e=>setTitle(e.target.value)}/></div>
      <div><label className="label">الوصف</label><textarea className="input" required rows={5} value={description} onChange={e=>setDescription(e.target.value)}/></div>
      <div className="two-col"><div><label className="label">التصنيف</label><select className="input" value={category} onChange={e=>setCategory(e.target.value)}><option value="">بدون تصنيف</option>{cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div><label className="label">المدرب</label><input className="input" value={instructor} onChange={e=>setInstructor(e.target.value)}/></div></div>
      <div><label className="label">صورة الكورس</label><div className="rtl-row"><input className="input" type="url" value={image} onChange={e=>setImage(e.target.value)} placeholder="رابط صورة اختياري"/><label className="btn btn-ghost file-btn">{imageBusy ? "جاري الرفع..." : "رفع صورة"}<input className="sr-only" type="file" accept="image/*" disabled={imageBusy} onChange={e=>uploadImage(e.target.files?.[0])}/></label></div><small className="muted">JPG / PNG / WebP — حتى 3MB</small>{image&&<img className="admin-image-preview" src={image} alt="معاينة صورة الكورس" loading="lazy"/>}</div>
      <label className="check"><input type="checkbox" checked={published} onChange={e=>setPublished(e.target.checked)}/><span>نشر الكورس للطلاب</span></label>
      {error && <div className="error">{error}</div>}{msg && <div className="notice">{msg}</div>}<button className="btn btn-primary" disabled={busy}>{busy ? 'جاري الحفظ...' : 'حفظ الكورس'}</button>
    </form>
    {edit && course && <div style={{marginTop:28}}><h2 className="section-title">الدروس</h2><form className="surface form-grid" style={{padding:20}} onSubmit={addLesson}><div><label className="label">عنوان الدرس</label><input className="input" required value={ltitle} onChange={e=>setLtitle(e.target.value)}/></div><div><label className="label">الوصف</label><textarea className="input" rows={3} value={ldesc} onChange={e=>setLdesc(e.target.value)}/></div><div><label className="label">YouTube URL</label><input className="input" required type="url" value={lurl} onChange={e=>setLurl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..."/></div><button className="btn btn-primary" disabled={busy}>{busy ? 'جاري الإضافة...' : 'إضافة الدرس'}</button></form><div className="grid" style={{marginTop:14}}>{lessons.map((l,i)=><div className="surface" key={l.id} style={{padding:16,display:'flex',gap:12,alignItems:'center'}}><strong>{i+1}. {l.title}</strong><span className="muted" style={{flex:1}}>{extractYouTubeVideoId(l.youtube_url) ? 'YouTube صالح' : 'رابط غير صالح'}</span><button className="btn btn-danger" onClick={()=>removeLesson(l.id)}>حذف</button></div>)}</div></div>}
  </div></section>;
}
