import { ArrowLeft, CheckCircle2, Circle, Play } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCompleted, getCourse } from '../services/data';
import { supabase } from '../lib/supabase';
import type { Course } from '../types';
import { useI18n, localizeText } from '../i18n';

export default function CourseDetails() {
  const { id } = useParams();
  const { locale, t } = useI18n();
  const [course, setCourse] = useState<Course | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  useEffect(() => { let active=true; (async()=>{ try { if(!id)return; const c=await getCourse(id); if(!active)return; setCourse(c); if(supabase&&c){const {data}=await supabase.auth.getUser(); if(data.user)setCompleted(await getCompleted(data.user.id));} } finally { if(active)setLoading(false); } })().catch(()=>active&&setCourse(null)); return()=>{active=false}; },[id]);
  if(loading)return <div className="container section"><div className="surface empty">{t('common.loading')}</div></div>;
  if(!course)return <div className="container section"><div className="surface empty">{t('common.error')}</div></div>;
  const lessons=[...(course.lessons||[])].sort((a,b)=>a.sort_order-b.sort_order); const done=lessons.filter(l=>completed.has(l.id)).length; const percent=lessons.length?Math.round(done/lessons.length*100):0; const nextLesson=lessons.find(l=>!completed.has(l.id))||lessons[0];
  return <section className="section"><div className="container">
    <div className="surface course-hero"><div>
      <span className="tag">{localizeText(locale,course.category?.name,course.category?.name_ar,course.category?.name_en)||t('course.education')}</span>
      <h1 className="course-title">{localizeText(locale,course.title,course.title_ar,course.title_en)}</h1>
      <p className="muted course-description">{localizeText(locale,course.description,course.description_ar,course.description_en)}</p>
      <div className="rtl-row" style={{marginTop:20}}><span className="muted">{t('course.instructor')}: {course.instructor_name}</span><span className="muted">{lessons.length} {t('common.lesson')}</span></div>
      <div className="course-progress-wrap"><div className="section-head compact-head"><strong>{t('course.progress')}</strong><strong>{percent}%</strong></div><div className="progress-bar large"><span style={{width:`${percent}%`}}/></div></div>
      <div style={{marginTop:18}}>{nextLesson&&<Link className="btn btn-primary" to={`/courses/${course.id}/lessons/${nextLesson.id}`}>{percent>0?t('course.continue'):t('course.start')} <ArrowLeft size={18}/></Link>}</div>
    </div><div className="cover course-cover">{course.image_url?<img src={course.image_url} alt={localizeText(locale,course.title,course.title_ar,course.title_en)}/>:<span>EO</span>}</div></div>
    <div style={{marginTop:36}}><div className="section-head"><div><span className="tag">{t('course.curriculum')}</span><h2 className="section-title">{t('course.content')}</h2></div><span className="muted">{done} / {lessons.length} {t('common.lesson')} · {t('course.completed')}</span></div>
      {lessons.length?<div className="grid">{lessons.map((lesson,i)=>{const isDone=completed.has(lesson.id);return <Link key={lesson.id} to={`/courses/${course.id}/lessons/${lesson.id}`} className={`surface lesson-row ${isDone?'is-complete':''}`}><span className="lesson-number">{isDone?<CheckCircle2 size={19}/>:<span>{i+1}</span>}</span><div style={{flex:1}}><strong>{localizeText(locale,lesson.title,lesson.title_ar,lesson.title_en)}</strong><div className="muted" style={{fontSize:13}}>{localizeText(locale,lesson.description,lesson.description_ar,lesson.description_en)}</div></div><span className="lesson-state">{isDone?t('course.completed'):<Play size={17}/>}</span></Link>})}</div>:<div className="surface empty"><Circle size={30}/><p>{locale==='ar'?'سيتم إضافة الدروس قريبًا.':'Lessons will be added soon.'}</p></div>}
    </div></div></section>;
}
