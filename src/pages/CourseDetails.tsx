import { ArrowLeft, CheckCircle2, Circle, Play } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCompleted, getCourse } from '../services/data';
import { supabase } from '../lib/supabase';
import type { Course } from '../types';

export default function CourseDetails() {
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
        <span className="tag">{course.category?.name ?? 'تعليم'}</span>
        <h1 className="course-title">{course.title}</h1>
        <p className="muted course-description">{course.description}</p>
        <div className="rtl-row" style={{ marginTop: 20 }}><span className="muted">المدرب: {course.instructor_name}</span><span className="muted">{lessons.length} درس</span></div>
        <div className="course-progress-wrap"><div className="section-head compact-head"><strong>تقدمك في الكورس</strong><strong>{percent}%</strong></div><div className="progress-bar large"><span style={{ width: `${percent}%` }} /></div></div>
        <div style={{ marginTop: 18 }}>{nextLesson ? <Link className="btn btn-primary" to={`/courses/${course.id}/lessons/${nextLesson.id}`}>{percent > 0 ? 'متابعة التعلم' : 'ابدأ التعلم'} <ArrowLeft size={18}/></Link> : null}</div>
      </div>
      <div className="cover course-cover">{course.image_url ? <img src={course.image_url} alt={course.title} /> : <span>EO</span>}</div>
    </div>

    <div style={{ marginTop: 36 }}>
      <div className="section-head"><div><span className="tag">المنهج</span><h2 className="section-title">محتوى الكورس</h2></div><span className="muted">{done} من {lessons.length} درس مكتمل</span></div>
      {lessons.length ? <div className="grid">{lessons.map((lesson, i) => {
        const isDone = completed.has(lesson.id);
        return <Link key={lesson.id} to={`/courses/${course.id}/lessons/${lesson.id}`} className={`surface lesson-row ${isDone ? 'is-complete' : ''}`}>
          <span className="lesson-number">{isDone ? <CheckCircle2 size={19}/> : <span>{i+1}</span>}</span>
          <div style={{ flex: 1 }}><strong>{lesson.title}</strong><div className="muted" style={{ fontSize: 13 }}>{lesson.description}</div></div>
          <span className="lesson-state">{isDone ? 'مكتمل' : <Play size={17}/>}</span>
        </Link>;
      })}</div> : <div className="surface empty"><Circle size={30} /><p>سيتم إضافة الدروس قريبًا.</p></div>}
    </div>
  </div></section>;
}
