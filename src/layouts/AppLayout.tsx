import { Outlet, Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { getSiteSettings } from '../services/data';
import { componentStyle } from '../components/EditableRegion';
import AssistantBot from '../components/AssistantBot';
import { useI18n } from '../i18n';

export default function AppLayout(){
  const {t}=useI18n();
  const location = useLocation();
  const immersiveAuth = ['/login','/signup','/profile/setup'].includes(location.pathname);
  const [footerText, setFooterText] = useState('');
  const [brandName, setBrandName] = useState('ENG OSAMA');
  const [siteSettings, setSiteSettings] = useState<any>(null);
  useEffect(()=>{getSiteSettings().then(s=>{setFooterText(s.footer_text);setBrandName(s.brand_name || 'ENG OSAMA');setSiteSettings(s);}).catch(()=>{});},[]);
  if (immersiveAuth) return <main className="immersive-auth-main"><Outlet/></main>;
  return <><Navbar/><main><Outlet/></main><AssistantBot/><footer className="site-footer" style={componentStyle(siteSettings?.component_editor?.['global.footer'])}><div className="container footer-inner"><Link to="/"><strong>{brandName}</strong></Link><span className="muted">{footerText || t('home.startDesc')}</span></div></footer></>;
}
