import { ArrowLeft, BookOpen, PlayCircle, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { demoCategories, demoCourses, getCategories, getCourses, getSiteSettings } from '../services/data';
import type { Category, Course, SiteSettings } from '../types';

export default function Home(){
  const[courses,setCourses]=useState<Course[]>(demoCourses);
  const[cats,setCats]=useState<Category[]>(demoCategories);
  const[settings,setSettings]=useState<SiteSettings|null>(null);
  useEffect(()=>{Promise.all([getCourses(),getCategories(),getSiteSettings()]).then(([c,k,s])=>{setCourses(c);setCats(k);setSettings(s)}).catch(()=>{});},[]);
  const s = settings;
  return <>
    {s?.announcement && <div className="announcement"><div className="container">{s.announcement}</div></div>}
    <section className="hero-section"><div className="container" style={{maxWidth:900}}><span className="tag">{s?.hero_badge ?? 'منصة تعليمية مجانية'}</span><h1 className="hero-title">{s?.hero_title ?? 'اتعلم مهارات جديدة بخطوات واضحة.'}</h1><p className="muted hero-description">{s?.hero_description ?? 'كورسات مرتبة، دروس عملية، وتجربة تعلم هادئة تساعدك تبدأ وتكمل بدون تعقيد.'}</p><div className="rtl-row" style={{marginTop:26}}><Link className="btn btn-primary" to="/courses">{s?.primary_cta_label ?? 'استكشف الكورسات'} <ArrowLeft size={18}/></Link><Link className="btn btn-ghost" to="/categories">{s?.secondary_cta_label ?? 'تصفح التصنيفات'}</Link></div></div></section>
    {s?.show_categories !== false && <section className="section"><div className="container"><div className="section-head"><div><h2 className="section-title">{s?.categories_title ?? 'التصنيفات'}</h2><div className="muted">{s?.categories_description ?? 'اختر المجال الذي تريد تطويره.'}</div></div></div><div className="grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))'}}>{cats.slice(0,6).map(c=><Link key={c.id} to={'/courses?category='+c.id} className="surface category-card"><BookOpen size={20}/><strong>{c.name}</strong></Link>)}</div></div></section>}
    {s?.show_featured !== false && <section className="section" style={{paddingTop:0}}><div className="container"><div className="section-head"><div><h2 className="section-title">{s?.featured_title ?? 'أحدث الكورسات'}</h2><div className="muted">{s?.featured_description ?? 'محتوى مرتب لتبدأ مباشرة.'}</div></div><Link to="/courses" className="btn btn-ghost">كل الكورسات</Link></div>{courses.length?<div className="grid course-grid">{courses.slice(0,3).map(c=><CourseCard key={c.id} course={c}/>)}</div>:<div className="surface empty">لا توجد كورسات منشورة بعد.</div>}</div></section>}
    {(s?.extra_sections ?? []).filter(x=>x.enabled && x.title.trim()).map((x,i)=><section className="section" style={{paddingTop:i===0?0:12}} key={`${x.title}-${i}`}><div className="container"><div className="surface custom-home-section"><div className="custom-home-icon"><Sparkles size={20}/></div><div><h2 className="section-title">{x.title}</h2>{x.description&&<p className="muted" style={{lineHeight:1.9,maxWidth:750}}>{x.description}</p>}{x.button_label&&x.button_url&&<a className="btn btn-primary" href={x.button_url}>{x.button_label} <ArrowLeft size={17}/></a>}</div></div></div></section>)}
  </>
}
function CourseCard({course}:{course:Course}){return <article className="card"><div className="cover">{course.image_url?<img src={course.image_url} alt={course.title} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span>EO</span>}</div><div className="card-body"><span className="tag">{course.category?.name??'تعليم'}</span><h3 style={{margin:'12px 0 8px',fontSize:20}}>{course.title}</h3><p className="muted" style={{lineHeight:1.8,minHeight:58}}>{course.description}</p><div className="rtl-row" style={{justifyContent:'space-between',marginTop:18}}><span className="muted" style={{fontSize:13}}>{course.lessons?.length??0} درس</span><Link className="btn btn-primary" to={'/courses/'+course.id}>التفاصيل <PlayCircle size={16}/></Link></div></div></article>}
