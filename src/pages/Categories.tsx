import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCategories } from '../services/data';
import type { Category } from '../types';
export default function Categories(){
  const [cats,setCats]=useState<Category[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
  useEffect(()=>{let active=true;getCategories().then(c=>active&&setCats(c)).catch(e=>active&&setError(e instanceof Error?e.message:'تعذر تحميل التصنيفات.')).finally(()=>active&&setLoading(false));return()=>{active=false}},[]);
  return <section className="section categories-page"><div className="container"><span className="tag">مجالات تعليمية</span><h1 className="section-title">التصنيفات</h1><p className="muted" style={{marginBottom:28}}>اختر المجال الذي تريد تطويره.</p>{error&&<div className="error" role="alert">{error}</div>}{loading?<div className="grid category-grid">{Array.from({length:5}).map((_,i)=><div className="surface skeleton-category" key={i}/>)}</div>:cats.length?<div className="grid category-grid">{cats.map(c=><Link key={c.id} to={'/courses?category='+c.id} className="surface category-card"><div><strong>{c.name}</strong><div className="muted" style={{marginTop:8,fontSize:13}}>استكشف الكورسات ←</div></div></Link>)}</div>:<div className="surface empty">لا توجد تصنيفات متاحة حاليًا.</div>}</div></section>
}
