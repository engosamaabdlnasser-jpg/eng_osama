import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getCategories, getCourses } from '../services/data';
import { normalizeArabic } from '../utils/app';
import type { Category, Course } from '../types';

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [params, setParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const q = params.get('q') ?? '';
  const cat = params.get('category') ?? '';
  const sort = params.get('sort') ?? 'newest';

  useEffect(() => {
    let active = true;
    Promise.all([getCourses(), getCategories()]).then(([c, k]) => {
      if (!active) return; setCourses(c); setCats(k);
    }).catch(e => active && setError(e instanceof Error ? e.message : 'تعذر تحميل الكورسات.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const query = normalizeArabic(q);
    const list = courses.filter(c => {
      const hay = normalizeArabic(`${c.title} ${c.description} ${c.instructor_name}`);
      return (!query || hay.includes(query)) && (!cat || c.category_id === cat);
    });
    return list.sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title, 'ar') : sort === 'lessons' ? (b.lessons?.length ?? 0) - (a.lessons?.length ?? 0) : (new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()));
  }, [courses, q, cat, sort]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); setParams(next);
  };
  const clearFilters = () => setParams({});

  return <section className="section"><div className="container">
    <div className="section-head"><div><span className="tag">تعلم بخطوات واضحة</span><h1 className="section-title">الكورسات</h1><p className="muted">ابحث، فلتر، ورتّب المحتوى وابدأ التعلم.</p></div></div>
    <div className="surface courses-toolbar">
      <label className="search-field"><span className="sr-only">البحث</span><Search size={18}/><input className="input" placeholder="ابحث عن كورس..." value={q} onChange={e => updateParam('q', e.target.value)} /></label>
      <label><span className="sr-only">التصنيف</span><select className="input" value={cat} onChange={e => updateParam('category', e.target.value)}><option value="">كل التصنيفات</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label><span className="sr-only">الترتيب</span><select className="input" value={sort} onChange={e => updateParam('sort', e.target.value)}><option value="newest">الأحدث</option><option value="title">الاسم</option><option value="lessons">عدد الدروس</option></select></label>
      {(q || cat || sort !== 'newest') && <button className="btn btn-ghost" onClick={clearFilters}><X size={16}/> مسح الفلاتر</button>}
    </div>
    {loading && <div className="grid course-grid" aria-busy="true">{Array.from({length:6}).map((_,i)=><div className="card skeleton-card" key={i}><div className="skeleton-cover"/><div className="card-body"><div className="skeleton-line short"/><div className="skeleton-line"/><div className="skeleton-line wide"/></div></div>)}</div>}
    {error && <div className="error" role="alert">{error}<button className="btn btn-ghost retry-btn" onClick={() => window.location.reload()}>إعادة المحاولة</button></div>}
    {!loading && !error && <><div className="muted result-count"><SlidersHorizontal size={16}/> {filtered.length} كورس</div>{filtered.length ? <div className="grid course-grid">{filtered.map(c => <article className="card" key={c.id}><div className="cover">{c.image_url ? <img loading="lazy" decoding="async" src={c.image_url} alt={c.title}/> : <span>EO</span>}</div><div className="card-body"><span className="tag">{c.category?.name ?? cats.find(x => x.id === c.category_id)?.name ?? 'تعليم'}</span><h2 className="course-card-title">{c.title}</h2><p className="muted course-card-description">{c.description}</p><div className="rtl-row course-card-footer"><small className="muted">{c.lessons?.length ?? 0} درس</small><Link className="btn btn-primary" to={`/courses/${c.id}`}>التفاصيل</Link></div></div></article>)}</div> : <div className="surface empty"><span className="tag">لا توجد نتائج</span><h2>مفيش كورسات مطابقة للبحث</h2><p className="muted">جرّب كلمة مختلفة أو امسح الفلاتر.</p><button className="btn btn-primary" onClick={clearFilters}>عرض كل الكورسات</button></div>}</>}
  </div></section>;
}
