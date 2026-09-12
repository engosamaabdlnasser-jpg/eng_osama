import { ArrowLeft, CheckCircle2, Circle, Play } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCompleted, getCourse } from '../services/data';
import { supabase } from '../lib/supabase';
import type { Course } from '../types';
import { useI18n, localized } from '../i18n';

export default function CourseDetails() { const {t,locale}=useI18n();
  const { id } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!id) return;
      const c = await getCourse(id);
      if (!active) return;
      setCourse(c);
      if (supabase && c) {
        const { data } = await supabase.auth.getUser();
        if (data.user) setCompleted(await getCompleted(data.user.id));
      }
      setLoading(false);
    }
    load().catch(() => { if (active) { setCourse(null); setLoading(false); } });
    return () => { active = false; };
  }, [id]);

  if (loading) return <div className="container section"><div className="surface empty">جاري تحميل الكورس...</div></div>;
  if (!course) return <div className="container section"><div className="surface empty">الكورس غير موجود.</div></div>;

  const lessons = [...(course.lessons || [])].sort((a,b) => a.sort_order-b.sort_order);
  const done = lessons.filter(l => completed.has(l.id)).length;
  const percent = lessons.length ? Math.round(done / lessons.length * 100) : 0;
  const nextLesson = lessons.find(l => !completed.has(l.id)) || lessons[0];

  return <section className="section"><div className="container">
    <div className="surface course-hero">
      <div>
        <span className="tag">{course.category ? localized(course.category.name,course.category.name_ar,course.category.name_en,locale) : t('common.education')}</span>
        <h1 className="course-title">{localized(course.title,course.title_ar,course.title_en,locale)}</h1>
        <p className="muted course-description">{localized(course.description,course.description_ar,course.description_en,locale)}</p>
        <div className="rtl-row" style={{ marginTop: 20 }}><span className="muted">{t('course.instructor',{name:localized(course.instructor_name,course.instructor_name_ar,course.instructor_name_en,locale)})}</span><span className="muted">{lessons.length} {t('common.lesson')}</span></div>
        <div className="course-progress-wrap"><div className="section-head compact-head"><strong>{t('course.progress')}</strong><strong>{percent}%</strong></div><div className="progress-bar large"><span style={{ width: `${percent}%` }} /></div></div>
        <div style={{ marginTop: 18 }}>{nextLesson ? <Link className="btn btn-primary" to={`/courses/${course.id}/lessons/${nextLesson.id}`}>{percent > 0 ? t('course.continue') : t('course.start')} <ArrowLeft size={18}/></Link> : null}</div>
      </div>
      <div className="cover course-cover">{course.image_url ? <img src={course.image_url} alt={localized(course.title,course.title_ar,course.title_en,locale)} /> : <span>EO</span>}</div>
    </div>

    <div style={{ marginTop: 36 }}>
      <div className="section-head"><div><span className="tag">{t('course.curriculum')}</span><h2 className="section-title">{t('course.content')}</h2></div><span className="muted">{t('course.completed',{done,total:lessons.length})}</span></div>
      {lessons.length ? <div className="grid">{lessons.map((lesson, i) => {
        const isDone = completed.has(lesson.id);
        return <Link key={lesson.id} to={`/courses/${course.id}/lessons/${lesson.id}`} className={`surface lesson-row ${isDone ? 'is-complete' : ''}`}>
          <span className="lesson-number">{isDone ? <CheckCircle2 size={19}/> : <span>{i+1}</span>}</span>
          <div style={{ flex: 1 }}><strong>{localized(lesson.title,lesson.title_ar,lesson.title_en,locale)}</strong><div className="muted" style={{ fontSize: 13 }}>{localized(lesson.description,lesson.description_ar,lesson.description_en,locale)}</div></div>
          <span className="lesson-state">{isDone ? t('course.complete') : <Play size={17}/>}</span>
        </Link>;
      })}</div> : <div className="surface empty"><Circle size={30} /><p>{t('course.comingSoon')}</p></div>}
    </div>
  </div></section>;
}
