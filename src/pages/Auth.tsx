import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { defaultSiteSettings, getSiteSettings } from '../services/data';
import type { SiteSettings } from '../types';

function friendlyAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  const normalized = message.toLowerCase();
  if (normalized.includes('invalid login credentials')) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
  if (normalized.includes('email not confirmed')) return 'يرجى تأكيد بريدك الإلكتروني أولًا.';
  if (normalized.includes('user already registered')) return 'هذا البريد مسجل بالفعل. جرّب تسجيل الدخول.';
  if (normalized.includes('password should be at least')) return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.';
  if (normalized.includes('rate limit') || normalized.includes('too many')) return 'تم تجاوز عدد المحاولات المسموح بها مؤقتًا. حاول مرة أخرى لاحقًا.';
  if (normalized.includes('captcha')) return 'تعذر إكمال التحقق الأمني. حاول مرة أخرى.';
  return message || 'حدث خطأ غير متوقع.';
}

export function Login() { return <AuthForm mode="login" />; }
export function Signup() { return <AuthForm mode="signup" />; }

function PublicPlatformPanel({ settings }: { settings: SiteSettings }) {
  const lightLogo = settings.auth_logo_light || '/eng-osama-logo-light.png';
  const darkLogo = settings.auth_logo_dark || '/eng-osama-logo-dark.png';
  return <aside className="auth-side">
    <div className="auth-side-glow" aria-hidden="true" />
    <div className="auth-visual-layer" aria-hidden="true" />
    <div className="auth-brand-visual" aria-label={settings.brand_name || 'ENG OSAMA'}>
      {settings.auth_visual_image ? <img className="auth-scene-image" src={settings.auth_visual_image} alt="" aria-hidden="true" /> : null}
      <div className="auth-brand-lockup">
        <img className="auth-brand-logo auth-brand-logo-light" src={lightLogo} alt={settings.brand_name || 'ENG OSAMA'} />
        <img className="auth-brand-logo auth-brand-logo-dark" src={darkLogo} alt="" aria-hidden="true" />
      </div>
    </div>
    <div className="auth-person-card">
      <div className="auth-person-avatar">
        {settings.instructor_image_url ? <img src={settings.instructor_image_url} alt={settings.instructor_name || 'صاحب المنصة'} /> : <span aria-hidden="true">م</span>}
      </div>
      <div className="auth-person-copy">
        <span className="small">صاحب المنصة</span>
        <strong>{settings.instructor_name || 'ENG OSAMA'}</strong>
        <span>{settings.instructor_role || 'منصة تطوير وتعليم'}</span>
      </div>
    </div>
    <div className="auth-side-copy">
      <span className="tag">{settings.hero_badge || 'منصة تطوير وتعليم'}</span>
      <h2>{settings.public_welcome_title || 'أهلاً بيك في منصتك التعليمية'}</h2>
      <p>{settings.public_welcome_description || 'سجّل دخولك للمتابعة داخل المنصة.'}</p>
    </div>
  </aside>;
}
function PasswordField({ value, onChange, mode }: { value: string; onChange: (value: string) => void; mode: 'login'|'signup' }) {
  const [visible, setVisible] = useState(false);
  return <div className="password-field">
    <input required minLength={6} type={visible ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="input" value={value} onChange={e => onChange(e.target.value)} />
    <button type="button" className="password-toggle" onClick={() => setVisible(v => !v)} aria-label={visible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'} title={visible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>
      {visible ? <EyeOff size={19}/> : <Eye size={19}/>}<span>{visible ? 'إخفاء' : 'إظهار'}</span>
    </button>
  </div>;
}

function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings);
  const location = useLocation();

  useEffect(() => { getSiteSettings().then(setSettings).catch(() => setSettings(defaultSiteSettings)); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setMsg('');
    if (!supabase) { setError('Supabase غير مربوط بعد. أضف قيم البيئة لتفعيل الحسابات الحقيقية.'); return; }
    setBusy(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        nav('/account');
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { data: { full_name: name.trim() || null }, emailRedirectTo: `${window.location.origin}/login?confirmed=1` },
        });
        if (error) throw error;
        if (data.session) nav('/account');
        else { sessionStorage.setItem('eng_osama_pending_email', email.trim()); nav(`/verify-email?email=${encodeURIComponent(email.trim())}`); }
      }
    } catch (e) { setError(friendlyAuthError(e)); }
    finally { setBusy(false); }
  };

  const confirmed = new URLSearchParams(location.search).get('confirmed') === '1';

  return <section className="section auth-page"><div className="container auth-shell">
    <div className="auth-main">
      <div className="auth-heading"><span className="tag">{settings.brand_name || 'ENG OSAMA'}</span><h1>{mode === 'login' ? 'سجّل دخولك' : 'أنشئ حسابك'}</h1><p className="muted">{mode === 'login' ? 'ادخل إلى حسابك وكمل رحلتك التعليمية.' : 'ابدأ رحلتك التعليمية مجانًا من مكان واحد.'}</p>{mode === 'login' && confirmed && <div className="notice" style={{marginTop:14}}>تم تأكيد بريدك الإلكتروني بنجاح. يمكنك تسجيل الدخول الآن.</div>}</div>
      <form className="surface form-grid auth-form" onSubmit={submit}>
        {mode === 'signup' && <div><label className="label">الاسم</label><input className="input" autoComplete="name" value={name} onChange={e => setName(e.target.value)} /></div>}
        <div><label className="label">البريد الإلكتروني</label><input required type="email" autoComplete="email" className="input" value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div><div className="form-label-row"><label className="label">كلمة المرور</label>{mode === 'login' && <Link className="form-link" to="/forgot-password">نسيت كلمة المرور؟</Link>}</div><PasswordField value={password} onChange={setPassword} mode={mode}/></div>
        {error && <div className="error" role="alert">{error}</div>}{msg && <div className="notice">{msg}</div>}
        <button className="btn btn-primary auth-submit" disabled={busy} type="submit">{busy ? 'جاري التنفيذ...' : mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}</button>
        <div className="muted" style={{textAlign:'center'}}>{mode === 'login' ? <>ليس لديك حساب؟ <Link to="/signup" className="form-link">أنشئ حسابًا</Link></> : <>لديك حساب؟ <Link to="/login" className="form-link">سجل الدخول</Link></>}</div>
      </form>
    </div>
    <PublicPlatformPanel settings={settings}/>
  </div></section>;
}

export function VerifyEmail() {
  const nav = useNavigate(); const location = useLocation();
  const queryEmail = new URLSearchParams(location.search).get('email')?.trim() || '';
  const [email, setEmail] = useState(() => queryEmail || sessionStorage.getItem('eng_osama_pending_email') || '');
  const [error, setError] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false); const [seconds, setSeconds] = useState(0);
  async function resend() { setError(''); setMsg(''); if (!supabase) { setError('Supabase غير مربوط بعد.'); return; } const cleanEmail=email.trim(); if(!cleanEmail){setError('اكتب البريد الإلكتروني أولًا.');return;} if(seconds>0||busy)return; setBusy(true); try{const {error}=await supabase.auth.resend({type:'signup',email:cleanEmail,options:{emailRedirectTo:`${window.location.origin}/login?confirmed=1`}});if(error)throw error;sessionStorage.setItem('eng_osama_pending_email',cleanEmail);setMsg('تمت إعادة إرسال رسالة التفعيل. راجع بريدك الإلكتروني ومجلد البريد غير المرغوب فيه.');setSeconds(60);const interval=window.setInterval(()=>setSeconds(current=>{if(current<=1){window.clearInterval(interval);return 0;}return current-1;}),1000);}catch(e){setError(friendlyAuthError(e));}finally{setBusy(false);} }
  return <section className="section"><div style={{maxWidth:520,margin:'auto'}}><div className="verify-card surface"><div className="verify-icon" aria-hidden="true">✉</div><span className="tag">تفعيل الحساب</span><h1 style={{fontSize:32,marginBottom:8}}>راجع بريدك الإلكتروني</h1><p className="muted verify-lead">أرسلنا رسالة تفعيل إلى البريد التالي. افتح الرسالة واضغط على رابط التأكيد لإكمال إنشاء حسابك.</p><div className="verify-email-box"><span className="small muted">البريد المستخدم في التسجيل</span><strong>{email||'لم يتم تحديد البريد'}</strong></div><div className="verify-help"><strong>لم تجد الرسالة؟</strong><p className="muted">راجع مجلد <b>البريد غير المرغوب فيه (Spam)</b> و<strong>العروض (Promotions)</strong>، ثم ابحث عن رسالة من ENG OSAMA.</p></div>{error&&<div className="error" role="alert">{error}</div>}{msg&&<div className="notice" role="status">{msg}</div>}{!email&&<div><label className="label">البريد الإلكتروني</label><input className="input" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com"/></div>}<div className="verify-actions"><button className="btn btn-primary" type="button" disabled={busy||seconds>0||!email.trim()} onClick={resend}>{busy?'جاري إعادة الإرسال...':seconds>0?`إعادة الإرسال بعد ${seconds}ث`:'إعادة إرسال رسالة التفعيل'}</button><Link className="btn btn-ghost" to="/login">العودة لتسجيل الدخول</Link></div><p className="small muted" style={{margin:0}}>بعد الضغط على رابط التفعيل، ستعود إلى صفحة تسجيل الدخول ويمكنك الدخول إلى حسابك.</p></div></div></section>;
}

export function ForgotPassword() {
  const [email,setEmail]=useState('');const [error,setError]=useState('');const [msg,setMsg]=useState('');const [busy,setBusy]=useState(false);
  async function submit(e:React.FormEvent){e.preventDefault();setError('');setMsg('');if(!supabase){setError('Supabase غير مربوط بعد.');return;}setBusy(true);try{const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:`${window.location.origin}/reset-password`});if(error)throw error;setMsg('تم إرسال رابط إعادة تعيين كلمة المرور. راجع بريدك الإلكتروني.');}catch(e){setError(friendlyAuthError(e));}finally{setBusy(false);}}
  return <section className="section"><div style={{maxWidth:480,margin:'auto'}}><div style={{marginBottom:24}}><span className="tag">استعادة الحساب</span><h1 style={{fontSize:32}}>نسيت كلمة المرور؟</h1><p className="muted">أدخل بريدك وسنرسل لك رابطًا آمنًا لتعيين كلمة مرور جديدة.</p></div><form className="surface form-grid" style={{padding:24}} onSubmit={submit}><div><label className="label">البريد الإلكتروني</label><input required type="email" autoComplete="email" className="input" value={email} onChange={e=>setEmail(e.target.value)}/></div>{error&&<div className="error">{error}</div>}{msg&&<div className="notice">{msg}</div>}<button className="btn btn-primary" disabled={busy}>{busy?'جاري الإرسال...':'إرسال رابط الاستعادة'}</button><Link className="btn btn-ghost" to="/login">العودة لتسجيل الدخول</Link></form></div></section>;
}

export function ResetPassword() {
  const nav=useNavigate();const [password,setPassword]=useState('');const [password2,setPassword2]=useState('');const [error,setError]=useState('');const [msg,setMsg]=useState('');const [busy,setBusy]=useState(false);const [visible,setVisible]=useState(false);
  async function submit(e:React.FormEvent){e.preventDefault();setError('');setMsg('');if(!supabase)return;if(password.length<6){setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل.');return;}if(password!==password2){setError('تأكيد كلمة المرور غير مطابق.');return;}setBusy(true);try{const {error}=await supabase.auth.updateUser({password});if(error)throw error;setMsg('تم تحديث كلمة المرور.');setTimeout(()=>nav('/login'),900);}catch(e){setError(friendlyAuthError(e));}finally{setBusy(false);}}
  return <section className="section"><div style={{maxWidth:480,margin:'auto'}}><div style={{marginBottom:24}}><span className="tag">تأمين الحساب</span><h1 style={{fontSize:32}}>تعيين كلمة مرور جديدة</h1></div><form className="surface form-grid" style={{padding:24}} onSubmit={submit}><div><label className="label">كلمة المرور الجديدة</label><div className="password-field"><input required minLength={6} type={visible?'text':'password'} className="input" value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" className="password-toggle" onClick={()=>setVisible(v=>!v)} aria-label={visible?'إخفاء كلمة المرور':'إظهار كلمة المرور'}>{visible?<EyeOff size={19}/>:<Eye size={19}/>}<span>{visible?'إخفاء':'إظهار'}</span></button></div></div><div><label className="label">تأكيد كلمة المرور</label><input required minLength={6} type={visible?'text':'password'} className="input" value={password2} onChange={e=>setPassword2(e.target.value)}/></div>{error&&<div className="error">{error}</div>}{msg&&<div className="notice">{msg}</div>}<button className="btn btn-primary" disabled={busy}>{busy?'جاري الحفظ...':'حفظ كلمة المرور'}</button></form></div></section>;
}
