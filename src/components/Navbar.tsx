import { Link, NavLink } from 'react-router-dom';
import { BookOpen, LogIn, Menu, Moon, Sun, UserCircle2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getProfile, getSiteSettings } from '../services/data';
import type { Profile } from '../types';
import { useTheme } from './ThemeProvider';

export default function Navbar(){
  const [open,setOpen]=useState(false);
  const [profile,setProfile]=useState<Profile|null>(null);
  const [logoUrl,setLogoUrl]=useState('/eng-osama-symbol-light.png');
  const [brandName,setBrandName]=useState('ENG OSAMA');
  const { theme, toggleTheme } = useTheme();

  useEffect(()=>{
    let active = true;
    async function load(){
      try{
        const site = await getSiteSettings();
        if (active) { setLogoUrl(site.logo_url || '/eng-osama-symbol-light.png'); setBrandName(site.brand_name || 'ENG OSAMA'); }
        if (!supabase) return;
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          const p = await getProfile(data.user.id);
          if (active) setProfile(p);
        }
      }catch{ /* keep navbar usable */ }
    }
    load();
    const { data: listener } = supabase?.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) { setProfile(null); return; }
      try { setProfile(await getProfile(session.user.id)); } catch { setProfile(null); }
    }) ?? { data: { subscription: { unsubscribe(){} } } };
    return ()=>{ active = false; listener.subscription.unsubscribe(); };
  },[]);

  const close = () => setOpen(false);
  const isDefaultLogo = !logoUrl || logoUrl === '/logo.png' || logoUrl === '/eng-osama-symbol-light.png';
  const brand = <><span className="brand-logo-wrap">{isDefaultLogo ? <><img src="/eng-osama-symbol-light.png" alt="" aria-hidden="true" className="brand-logo brand-logo-light"/><img src="/eng-osama-symbol-dark.png" alt="" aria-hidden="true" className="brand-logo brand-logo-dark"/></> : <img src={logoUrl} alt="" aria-hidden="true" className="brand-logo"/>}</span><span className="brand-name">{brandName}</span></>;

  return <header className="site-header"><div className="container navbar-inner">
    <Link to="/" className="brand" onClick={close}>{brand}</Link>
    <nav className="desktop-nav">
      {profile && <><NavLink to="/courses">الكورسات</NavLink><NavLink to="/categories">التصنيفات</NavLink></>}
      {profile?.role === 'admin' && <NavLink to="/admin">الإدارة</NavLink>}
      <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'تفعيل المظهر الفاتح' : 'تفعيل المظهر الداكن'} aria-label={theme === 'dark' ? 'تفعيل المظهر الفاتح' : 'تفعيل المظهر الداكن'}>{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</button>
      {profile ? <Link className="btn btn-ghost account-link" to="/account"><UserCircle2 size={17}/> حسابي</Link> : <Link className="btn btn-primary" to="/login"><LogIn size={17}/> تسجيل الدخول</Link>}
    </nav>
    <button className="btn btn-ghost mobile-menu-btn" onClick={()=>setOpen(!open)} aria-label={open ? "إغلاق القائمة" : "فتح القائمة"} aria-expanded={open} aria-controls="mobile-navigation">{open?<X/>:<Menu/>}</button>
  </div>
  {open&&<div id="mobile-navigation" className="container mobile-menu">
    {profile && <><Link to="/courses" onClick={close}><BookOpen size={17}/> الكورسات</Link><Link to="/categories" onClick={close}>التصنيفات</Link></>}
    {profile?.role === 'admin' && <Link to="/admin" onClick={close}>الإدارة</Link>}
    <button className="mobile-theme" onClick={toggleTheme}>{theme === 'dark' ? <><Sun size={17}/> المظهر الفاتح</> : <><Moon size={17}/> المظهر الداكن</>}</button>
    {profile ? <Link to="/account" onClick={close}><UserCircle2 size={17}/> حسابي</Link> : <Link to="/login" onClick={close}><LogIn size={17}/> تسجيل الدخول</Link>}
  </div>}
  </header>
}
