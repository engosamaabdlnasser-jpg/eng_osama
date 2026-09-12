import { Link, NavLink } from 'react-router-dom';
import { BookOpen, LogIn, Menu, Moon, Sun, UserCircle2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getProfile, getSiteSettings } from '../services/data';
import type { Profile } from '../types';
import { useTheme } from './ThemeProvider';
import { componentStyle } from './EditableRegion';
import LanguageSwitcher from './LanguageSwitcher';
import { useI18n } from '../i18n';

export default function Navbar(){
  const {t}=useI18n();
  const [open,setOpen]=useState(false);
  const [profile,setProfile]=useState<Profile|null>(null);
  const [logoUrl,setLogoUrl]=useState('/eng-osama-symbol-light.png');
  const [brandName,setBrandName]=useState('ENG OSAMA');
  const { theme, toggleTheme } = useTheme();
  const [siteSettings,setSiteSettings] = useState<any>(null);

  useEffect(()=>{
    let active = true;
    async function load(){
      try{
        const site = await getSiteSettings();
        if (active) { setLogoUrl(site.logo_url || '/eng-osama-symbol-light.png'); setBrandName(site.brand_name || 'ENG OSAMA'); setSiteSettings(site); }
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

  const headerStyle = componentStyle((siteSettings as any)?.component_editor?.['global.header']);
  return <header className="site-header" style={headerStyle}><div className="container navbar-inner">
    <Link to="/" className="brand" onClick={close}>{brand}</Link>
    <nav className="desktop-nav"><LanguageSwitcher/>
      {profile && <><NavLink to="/courses">{t('nav.courses')}</NavLink><NavLink to="/categories">{t('nav.categories')}</NavLink></>}
      {profile?.role === 'admin' && <NavLink to="/admin">{t('nav.admin')}</NavLink>}
      <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? t('nav.light') : t('nav.dark')} aria-label={theme === 'dark' ? t('nav.light') : t('nav.dark')}>{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</button>
      {profile ? <Link className="btn btn-ghost account-link" to="/account"><UserCircle2 size={17}/> {t('nav.account')}</Link> : <Link className="btn btn-primary" to="/login"><LogIn size={17}/> {t('nav.login')}</Link>}
    </nav>
    <button className="btn btn-ghost mobile-menu-btn" onClick={()=>setOpen(!open)} aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')} aria-expanded={open} aria-controls="mobile-navigation">{open?<X/>:<Menu/>}</button>
  </div>
  {open&&<div id="mobile-navigation" className="container mobile-menu">
    {profile && <><Link to="/courses" onClick={close}><BookOpen size={17}/> {t('nav.courses')}</Link><Link to="/categories" onClick={close}>{t('nav.categories')}</Link></>}
    {profile?.role === 'admin' && <Link to="/admin" onClick={close}>{t('nav.admin')}</Link>}
    <button className="mobile-theme" onClick={toggleTheme}>{theme === 'dark' ? <><Sun size={17}/> {t('nav.light')}</> : <><Moon size={17}/> {t('nav.dark')}</>}</button>
    {profile ? <Link to="/account" onClick={close}><UserCircle2 size={17}/> {t('nav.account')}</Link> : <Link to="/login" onClick={close}><LogIn size={17}/> {t('nav.login')}</Link>}
  </div>}
  </header>
}
