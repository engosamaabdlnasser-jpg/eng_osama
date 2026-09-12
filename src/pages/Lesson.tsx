import { CheckCircle2, ChevronLeft, ChevronRight, ListChecks } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCourse, getCompleted, markLessonComplete } from '../services/data';
import { youtubeEmbedUrl } from '../utils/youtube';
import type { Course } from '../types';
import { supabase } from '../lib/supabase';
import { useI18n, localized } from '../i18n';

export default function Lesson() { const {t,locale}=useI18n();
  const { courseId, lessonId } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    getCourse(courseId).then(async c => {
      setCourse(c);
      if (lessonId && supabase) {
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          const completed = await getCompleted(data.user.id);
          setDone(completed.has(lessonId));
        }
      }
    }).catch(() => setCourse(null));
  }, [courseId, lessonId]);

  const lessons = useMemo(() => [...(course?.lessons || [])].sort((a,b) => a.sort_order-b.sort_order), [course]);
  const index = lessons.findIndex(x => x.id === lessonId);
  const lesson = index >= 0 ? lessons[index] : undefined;
  const previous = index > 0 ? lessons[index - 1] : undefined;
  const next = index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : undefined;

  if (!course || !lesson) {
    return <div className="container section"><div className="surface empty">جاري تحميل الدرس أو الدرس غير موجود.</div></div>;
  }

  const embed = youtubeEmbedUrl(lesson.youtube_url);

  async function complete() {
    if (!supabase) { setDone(true); return; }
    setBusy(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        await markLessonComplete(data.user.id, lesson!.id);
        setDone(true);
      }
    } catch { /* keep the player usable */ }
    finally { setBusy(false); }
  }

  return <section className="section"><div className="container lesson-page">
    <Link to={`/courses/${course.id}`} className="muted lesson-back"><ChevronRight size={16}/> {t('lesson.back')}</Link>
    <div className="lesson-layout">
      <main className="surface" style={{ overflow: 'hidden' }}>
        <div className="video-frame">
          {embed ? <iframe src={embed} title={localized(lesson.title,lesson.title_ar,lesson.title_en,locale)} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /> : <div className="video-error">{t('lesson.invalidVideo')}</div>}
        </div>
        <div style={{ padding: 24 }}>
          <div className="lesson-meta"><span className="tag">الدرس {lesson.sort_order}</span><span className="muted">{index + 1} / {lessons.length}</span></div>
          <h1 style={{ fontSize: 'clamp(28px,4vw,40px)', margin: '10px 0' }}>{localized(lesson.title,lesson.title_ar,lesson.title_en,locale)}</h1>
          <p className="muted" style={{ lineHeight: 2 }}>{localized(lesson.description,lesson.description_ar,lesson.description_en,locale)}</p>
          <div className="lesson-actions">
            <button className="btn btn-primary" disabled={busy} onClick={complete}>{done ? <><CheckCircle2 size={18}/> {t('lesson.completed')}</> : busy ? t('lesson.save') : t('lesson.markComplete')}</button>
            {previous && <Link className="btn btn-ghost" to={`/courses/${course.id}/lessons/${previous.id}`}><ChevronRight size={17}/> {t('lesson.previous')}</Link>}
            {next && <Link className="btn btn-ghost" to={`/courses/${course.id}/lessons/${next.id}`}>{t('lesson.next')} <ChevronLeft size={17}/></Link>}
          </div>
        </div>
      </main>

      <aside className="surface lesson-sidebar">
        <div className="lesson-sidebar-head"><div><span className="tag">{t('course.curriculum')}</span><h2>{localized(course.title,course.title_ar,course.title_en,locale)}</h2></div><ListChecks size={20}/></div>
        <div className="lesson-list">{lessons.map((item, i) => <Link key={item.id} to={`/courses/${course.id}/lessons/${item.id}`} className={`lesson-nav-item ${item.id === lesson.id ? 'active' : ''}`}><span>{i + 1}</span><div>{localized(item.title,item.title_ar,item.title_en,locale)}<small>{item.id === lesson.id ? t('lesson.watching') : ''}</small></div></Link>)}</div>
      </aside>
    </div>
  </div></section>;
}
