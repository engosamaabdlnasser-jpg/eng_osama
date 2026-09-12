import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { defaultSiteSettings, getCategories, getSiteSettings } from '../services/data';
import type { Category, SiteSettings } from '../types';
import EditableRegion from '../components/EditableRegion';
import { useI18n } from '../i18n';

export default function Categories(){ const {t}=useI18n();
  const [cats,setCats]=useState<Category[]>([]);
  const [settings,setSettings]=useState<SiteSettings>(defaultSiteSettings);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  useEffect(()=>{let active=true;Promise.all([getCategories(),getSiteSettings()]).then(([c,site])=>{if(!active)return;setCats(c);setSettings(site)}).catch(e=>active&&setError(e instanceof Error?e.message:t('categories.title'))).finally(()=>active&&setLoading(false));return()=>{active=false}},[]);
  const header=settings.component_editor?.['categories.header'];
  const grid=settings.component_editor?.['categories.grid'];
  return <EditableRegion id="categories.header" config={header}><section className="section categories-page"><div className="container"><span className="tag">مجالات تعليمية</span><h1 className="section-title">التصنيفات</h1><p className="muted" style={{marginBottom:28}}>اختر المجال الذي تريد تطويره.</p>{error&&<div className="error" role="alert">{error}</div>}<EditableRegion id="categories.grid" config={grid}>{loading?<div className="grid category-grid">{Array.from({length:5}).map((_,i)=><div className="surface skeleton-category" key={i}/>)}</div>:cats.length?<div className="grid category-grid">{cats.map(c=><Link key={c.id} to={'/courses?category='+c.id} className="surface category-card"><div><strong>{c.name}</strong><div className="muted" style={{marginTop:8,fontSize:13}}>استكشف الكورسات ←</div></div></Link>)}</div>:<div className="surface empty">لا توجد تصنيفات متاحة حاليًا.</div>}</EditableRegion></div></section></EditableRegion>
}
