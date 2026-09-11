import { Outlet, Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { getSiteSettings } from '../services/data';

export default function AppLayout(){
  const location = useLocation();
  const immersiveAuth = ['/login','/signup','/profile/setup'].includes(location.pathname);
  const [footerText, setFooterText] = useState('تعلم مجانًا، بخطوات واضحة.');
  const [brandName, setBrandName] = useState('ENG OSAMA');
  useEffect(()=>{getSiteSettings().then(s=>{setFooterText(s.footer_text);setBrandName(s.brand_name || 'ENG OSAMA');}).catch(()=>{});},[]);
  if (immersiveAuth) return <main className="immersive-auth-main"><Outlet/></main>;
  return <><Navbar/><main><Outlet/></main><footer className="site-footer"><div className="container footer-inner"><Link to="/"><strong>{brandName}</strong></Link><span className="muted">{footerText}</span></div></footer></>;
}
