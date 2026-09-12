import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getCategories, getCourses } from '../services/data';
import { normalizeArabic } from '../utils/app';
import type { Category, Course } from '../types';
import { useI18n, localized } from '../i18n';

export default function Courses() { const {t,locale}=useI18n();
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
    }).catch(e => active && setError(e instanceof Error ? e.message : t('courses.title')))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const query = normalizeArabic(q);
    const list = courses.filter(c => {
      const hay = normalizeArabic(`${localized(c.title,c.title_ar,c.title_en,locale)} ${localized(c.description,c.description_ar,c.description_en,locale)} ${localized(c.instructor_name,c.instructor_name_ar,c.instructor_name_en,locale)}`);
      return (!query || hay.includes(query)) && (!cat || c.category_id === cat);
    });
    return list.sort((a, b) => sort === 'title' ? localized(a.title,a.title_ar,a.title_en,locale).localeCompare(localized(b.title,b.title_ar,b.title_en,locale), locale) : sort === 'lessons' ? (b.lessons?.length ?? 0) - (a.lessons?.length ?? 0) : (new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()));
  }, [courses, q, cat, sort]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); setParams(next);
  };
  const clearFilters = () => setParams({});

  return <section className="section"><div className="container">
    <div className="section-head"><div><span className="tag">{t('courses.tag')}</span><h1 className="section-title">{t('courses.title')}</h1><p className="muted">{t('courses.desc')}</p></div></div>
    <div className="surface courses-toolbar">
      <label className="search-field"><span className="sr-only">البحث</span><Search size={18}/><input className="input" placeholder={t('courses.searchPlaceholder')} value={q} onChange={e => updateParam('q', e.target.value)} /></label>
      <label><span className="sr-only">التصنيف</span><select className="input" value={cat} onChange={e => updateParam('category', e.target.value)}><option value="">{t('common.allCategories')}</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label><span className="sr-only">الترتيب</span><select className="input" value={sort} onChange={e => updateParam('sort', e.target.value)}><option value="newest">{t('common.newest')}</option><option value="title">{t('common.name')}</option><option value="lessons">{t('common.lessonCount')}</option></select></label>
      {(q || cat || sort !== 'newest') && <button className="btn btn-ghost" onClick={clearFilters}><X size={16}/> مسح الفلاتر</button>}
    </div>
    {loading && <div className="grid course-grid" aria-busy="true">{Array.from({length:6}).map((_,i)=><div className="card skeleton-card" key={i}><div className="skeleton-cover"/><div className="card-body"><div className="skeleton-line short"/><div className="skeleton-line"/><div className="skeleton-line wide"/></div></div>)}</div>}
    {error && <div className="error" role="alert">{error}<button className="btn btn-ghost retry-btn" onClick={() => window.location.reload()}>{t('common.retry')}</button></div>}
    {!loading && !error && <><div className="muted result-count"><SlidersHorizontal size={16}/> {t('courses.result',{count:filtered.length})}</div>{filtered.length ? <div className="grid course-grid">{filtered.map(c => <article className="card" key={c.id}><div className="cover">{c.image_url ? <img loading="lazy" decoding="async" src={c.image_url} alt={localized(c.title,c.title_ar,c.title_en,locale)}/> : <span>EO</span>}</div><div className="card-body"><span className="tag">{c.category ? localized(c.category.name,c.category.name_ar,c.category.name_en,locale) : (cats.find(x => x.id === c.category_id) ? localized(cats.find(x => x.id === c.category_id)!.name,cats.find(x => x.id === c.category_id)!.name_ar,cats.find(x => x.id === c.category_id)!.name_en,locale) : t('common.education'))}</span><h2 className="course-card-title">{localized(c.title,c.title_ar,c.title_en,locale)}</h2><p className="muted course-card-description">{localized(c.description,c.description_ar,c.description_en,locale)}</p><div className="rtl-row course-card-footer"><small className="muted">{c.lessons?.length ?? 0} {t('common.lesson')}</small><Link className="btn btn-primary" to={`/courses/${c.id}`}>{t('common.details')}</Link></div></div></article>)}</div> : <div className="surface empty"><span className="tag">{t('courses.noResults')}</span><h2>{t('courses.noMatch')}</h2><p className="muted">{t('courses.tryAgain')}</p><button className="btn btn-primary" onClick={clearFilters}>{t('courses.showAll')}</button></div>}</>}
  </div></section>;
}
