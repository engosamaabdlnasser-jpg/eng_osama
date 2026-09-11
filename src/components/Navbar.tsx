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
  const [logoUrl,setLogoUrl]=useState('/logo.png');
  const [brandName,setBrandName]=useState('ENG OSAMA');
  const { theme, toggleTheme } = useTheme();

  useEffect(()=>{
    let active = true;
    async function load(){
      try{
        const site = await getSiteSettings();
        if (active) { setLogoUrl(site.logo_url || '/logo.png'); setBrandName(site.brand_name || 'ENG OSAMA'); }
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
  const brand = logoUrl ? <img src={logoUrl} alt={brandName} className="brand-logo"/> : <span className="brand-mark">E</span>;

  return <header className="site-header"><div className="container navbar-inner">
    <Link to="/" className="brand" onClick={close}>{brand}<span>{brandName}</span></Link>
    <nav className="desktop-nav">
      <NavLink to="/courses">الكورسات</NavLink>
      <NavLink to="/categories">التصنيفات</NavLink>
      {profile?.role === 'admin' && <NavLink to="/admin">الإدارة</NavLink>}
      <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'تفعيل المظهر الفاتح' : 'تفعيل المظهر الداكن'} aria-label={theme === 'dark' ? 'تفعيل المظهر الفاتح' : 'تفعيل المظهر الداكن'}>{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</button>
      {profile ? <Link className="btn btn-ghost account-link" to="/account"><UserCircle2 size={17}/> حسابي</Link> : <Link className="btn btn-primary" to="/login"><LogIn size={17}/> تسجيل الدخول</Link>}
    </nav>
    <button className="btn btn-ghost mobile-menu-btn" onClick={()=>setOpen(!open)} aria-label="فتح القائمة">{open?<X/>:<Menu/>}</button>
  </div>
  {open&&<div className="container mobile-menu">
    <Link to="/courses" onClick={close}><BookOpen size={17}/> الكورسات</Link>
    <Link to="/categories" onClick={close}>التصنيفات</Link>
    {profile?.role === 'admin' && <Link to="/admin" onClick={close}>الإدارة</Link>}
    <button className="mobile-theme" onClick={toggleTheme}>{theme === 'dark' ? <><Sun size={17}/> المظهر الفاتح</> : <><Moon size={17}/> المظهر الداكن</>}</button>
    {profile ? <Link to="/account" onClick={close}><UserCircle2 size={17}/> حسابي</Link> : <Link to="/login" onClick={close}><LogIn size={17}/> تسجيل الدخول</Link>}
  </div>}
  </header>
}
