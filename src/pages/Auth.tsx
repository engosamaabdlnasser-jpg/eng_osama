import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, ImagePlus, Moon, Sun } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { defaultSiteSettings, getProfile, getSiteSettings, updateProfileDetails, uploadProfileAvatar } from '../services/data';
import type { Profile, SiteSettings } from '../types';
import { useTheme } from '../components/ThemeProvider';

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

function AuthTopbar({ settings, mode }: { settings: SiteSettings; mode: 'login' | 'signup' | 'profile' }) {
  const { theme, toggleTheme } = useTheme();
  const lightLogo = settings.auth_logo_light || '/eng-osama-logo-light.png';
  const darkLogo = settings.auth_logo_dark || '/eng-osama-logo-dark.png';
  return <header className="immersive-auth-header">
    <div className="immersive-auth-header-inner">
      <Link to="/" className="immersive-auth-brand" aria-label="العودة إلى الصفحة الرئيسية">
        <img className="immersive-auth-logo immersive-auth-logo-light" src={lightLogo} alt={settings.brand_name || 'ENG OSAMA'} />
        <img className="immersive-auth-logo immersive-auth-logo-dark" src={darkLogo} alt="" aria-hidden="true" />
        <strong>{settings.brand_name || 'ENG OSAMA'}</strong>
      </Link>
      <div className="immersive-auth-header-actions">
        <button className="theme-toggle immersive-theme-toggle" onClick={toggleTheme} type="button" title={theme === 'dark' ? 'تفعيل المظهر الفاتح' : 'تفعيل المظهر الداكن'} aria-label={theme === 'dark' ? 'تفعيل المظهر الفاتح' : 'تفعيل المظهر الداكن'}>
          {theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}<span>{theme === 'dark' ? 'فاتح' : 'داكن'}</span>
        </button>
        {mode === 'login' ? <Link className="btn btn-primary immersive-auth-header-link" to="/signup">إنشاء حساب <ArrowLeft size={16}/></Link> : mode === 'signup' ? <Link className="btn btn-primary immersive-auth-header-link" to="/login">تسجيل الدخول <ArrowLeft size={16}/></Link> : <Link className="btn btn-ghost immersive-auth-header-link" to="/account">حسابي <ArrowLeft size={16}/></Link>}
      </div>
    </div>
  </header>;
}

export function Login() { return <AuthForm mode="login" />; }
export function Signup() { return <AuthForm mode="signup" />; }

function AuthVisual({ settings }: { settings: SiteSettings }) {
  const lightLogo = settings.auth_logo_light || '/eng-osama-logo-light.png';
  const darkLogo = settings.auth_logo_dark || '/eng-osama-logo-dark.png';
  return <div className="auth-visual-panel" aria-label={settings.brand_name || 'ENG OSAMA'}>
    <div className="auth-visual-overlay" aria-hidden="true" />
    {settings.auth_visual_image ? <img className="auth-visual-image" src={settings.auth_visual_image} alt="" aria-hidden="true" /> : null}
    <div className="auth-visual-content">
      <img className="auth-main-logo auth-main-logo-light" src={lightLogo} alt={settings.brand_name || 'ENG OSAMA'} />
      <img className="auth-main-logo auth-main-logo-dark" src={darkLogo} alt="" aria-hidden="true" />
    </div>
  </div>;
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
        nav('/profile/setup');
      } else {
        const cleanEmail = email.trim();
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { full_name: name.trim() || null }, emailRedirectTo: `${window.location.origin}/login?confirmed=1` },
        });
        if (error) throw error;
        if (data.session) nav('/profile/setup');
        else { sessionStorage.setItem('eng_osama_pending_email', cleanEmail); nav(`/verify-email?email=${encodeURIComponent(cleanEmail)}`); }
      }
    } catch (e) { setError(friendlyAuthError(e)); }
    finally { setBusy(false); }
  };

  const confirmed = new URLSearchParams(location.search).get('confirmed') === '1';

  return <section className="immersive-auth-page">
    <AuthTopbar settings={settings} mode={mode} />
    <div className="immersive-auth-background" aria-hidden="true" />
    <div className="immersive-auth-layout">
      <AuthVisual settings={settings}/>
      <div className="immersive-auth-form-column">
        <div className="auth-heading">
          <span className="tag">{settings.brand_name || 'ENG OSAMA'}</span>
          <h1>{mode === 'login' ? 'سجّل دخولك' : 'أنشئ حسابك'}</h1>
          <p className="muted">{mode === 'login' ? 'ادخل إلى حسابك وكمل رحلتك التعليمية.' : 'أنشئ حسابك أولًا، وبعدها يمكنك إضافة معلوماتك الشخصية أو تخطيها.'}</p>
          {mode === 'login' && confirmed && <div className="notice" style={{marginTop:14}}>تم تأكيد بريدك الإلكتروني بنجاح. يمكنك تسجيل الدخول الآن.</div>}
        </div>
        <form className="surface form-grid auth-form" onSubmit={submit}>
          {mode === 'signup' && <div><label className="label" htmlFor="auth-name">الاسم</label><input id="auth-name" className="input" autoComplete="name" value={name} onChange={e => setName(e.target.value)} /></div>}
          <div><label className="label" htmlFor="auth-email">البريد الإلكتروني</label><input id="auth-email" required type="email" autoComplete="email" className="input" value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div><div className="form-label-row"><label className="label" htmlFor="auth-password">كلمة المرور</label>{mode === 'login' && <Link className="form-link" to="/forgot-password">نسيت كلمة المرور؟</Link>}</div><PasswordField value={password} onChange={setPassword} mode={mode}/></div>
          {error && <div className="error" role="alert">{error}</div>}{msg && <div className="notice" role="status">{msg}</div>}
          <button className="btn btn-primary auth-submit" disabled={busy} type="submit">{busy ? 'جاري التنفيذ...' : mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}</button>
          <div className="muted auth-switch">{mode === 'login' ? <>ليس لديك حساب؟ <Link to="/signup" className="form-link">أنشئ حسابًا</Link></> : <>لديك حساب؟ <Link to="/login" className="form-link">سجل الدخول</Link></>}</div>
        </form>
      </div>
    </div>
  </section>;
}

export function ProfileSetup() {
  const nav = useNavigate();
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const sitePromise = getSiteSettings().catch(() => defaultSiteSettings);
        if (!supabase) { if (active) { setSettings(await sitePromise); setLoading(false); } return; }
        const { data } = await supabase.auth.getUser();
        if (!data.user) { nav('/login'); return; }
        const [site, currentProfile] = await Promise.all([sitePromise, getProfile(data.user.id)]);
        if (!active) return;
        setSettings(site);
        setEmail(data.user.email || '');
        setProfile(currentProfile);
        setName(currentProfile?.full_name || '');
        setPhone(currentProfile?.phone || '');
        setAge(currentProfile?.age != null ? String(currentProfile.age) : '');
        setAvatarUrl(currentProfile?.avatar_url || null);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'تعذر تحميل معلومات حسابك.');
      } finally { if (active) setLoading(false); }
    }
    load();
    return () => { active = false; };
  }, [nav]);

  async function uploadAvatar(file?: File) {
    if (!file || !supabase || !profile) return;
    setError(''); setMsg(''); setUploading(true);
    try {
      const url = await uploadProfileAvatar(profile.id, file);
      setAvatarUrl(url);
      setMsg('تم رفع الصورة. اضغط حفظ والمتابعة لتثبيتها على حسابك.');
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر رفع الصورة.'); }
    finally { setUploading(false); }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setMsg('');
    if (!supabase || !profile) { nav('/account'); return; }
    setSaving(true);
    try {
      const parsedAge = age.trim() ? Number(age) : null;
      if (parsedAge !== null && (!Number.isInteger(parsedAge) || parsedAge < 5 || parsedAge > 100)) {
        setError('العمر يجب أن يكون رقمًا صحيحًا بين 5 و100 سنة.');
        setSaving(false);
        return;
      }
      const updated = await updateProfileDetails(profile.id, name, avatarUrl, phone, parsedAge);
      setProfile(updated);
      setMsg('تم حفظ معلوماتك بنجاح.');
      window.setTimeout(() => nav('/account'), 450);
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر حفظ معلوماتك.'); }
    finally { setSaving(false); }
  }

  function skip() { if (!saving && !uploading) nav('/account'); }

  const initials = (name || 'م').trim().charAt(0).toUpperCase() || 'م';

  return <section className="immersive-auth-page profile-setup-page">
    <AuthTopbar settings={settings} mode="profile" />
    <div className="immersive-auth-background" aria-hidden="true" />
    <div className="profile-setup-wrap">
      {loading ? <div className="profile-setup-card surface"><div className="loading-skeleton" style={{height:220}} aria-label="جاري تحميل المعلومات" /></div> : <form className="profile-setup-card surface" onSubmit={save}>
        <div className="profile-setup-heading"><span className="tag">خطوة اختيارية</span><h1>معلوماتك</h1><p className="muted">أضف معلوماتك الآن لتخصيص حسابك. يمكنك تخطي هذه الخطوة والعودة إليها لاحقًا من حسابك.</p></div>
        <div className="profile-setup-grid">
          <div className="profile-setup-avatar-column">
            <label className="profile-setup-avatar" title="إضافة صورة شخصية">
              {avatarUrl ? <img src={avatarUrl} alt="صورتك الشخصية"/> : <span>{initials}</span>}
              <input className="sr-only" type="file" accept="image/*" disabled={uploading || saving} onChange={e => uploadAvatar(e.target.files?.[0])}/>
              <span className="profile-setup-avatar-badge" aria-hidden="true"><ImagePlus size={17}/></span>
            </label>
            <span className="small muted">الصورة الشخصية اختيارية</span>
          </div>
          <div className="form-grid">
            <div><label className="label" htmlFor="profile-name">الاسم الكامل</label><input id="profile-name" className="input" autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="اكتب اسمك الكامل" /></div>
            <div className="profile-setup-two-col">
              <div><label className="label" htmlFor="profile-phone">رقم الهاتف</label><input id="profile-phone" className="input" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="01xxxxxxxxx" /></div>
              <div><label className="label" htmlFor="profile-age">العمر</label><input id="profile-age" className="input" type="number" inputMode="numeric" min="5" max="100" value={age} onChange={e => setAge(e.target.value)} placeholder="مثال: 20" /></div>
            </div>
            <div><label className="label" htmlFor="profile-email">البريد الإلكتروني</label><input id="profile-email" className="input" value={email} readOnly aria-describedby="profile-email-note" /><span id="profile-email-note" className="small muted">البريد مرتبط بحسابك ولا يتم تغييره من هذه الخطوة.</span></div>
          </div>
        </div>
        {error && <div className="error" role="alert">{error}</div>}
        {msg && <div className="notice" role="status">{msg}</div>}
        <div className="profile-setup-actions">
          <button className="btn btn-primary" type="submit" disabled={saving || uploading}>{saving ? 'جاري الحفظ...' : 'حفظ والمتابعة'}</button>
          <button className="profile-skip" type="button" onClick={skip} disabled={saving || uploading}>تخطي <ArrowLeft size={16}/></button>
        </div>
      </form>}
    </div>
  </section>;
}

export function VerifyEmail() {
  const nav = useNavigate(); const location = useLocation();
  const queryEmail = new URLSearchParams(location.search).get('email')?.trim() || '';
  const [email, setEmail] = useState(() => queryEmail || sessionStorage.getItem('eng_osama_pending_email') || '');
  const [error, setError] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false); const [seconds, setSeconds] = useState(0);
  async function resend() { setError(''); setMsg(''); if (!supabase) { setError('Supabase غير مربوط بعد.'); return; } const cleanEmail=email.trim(); if(!cleanEmail){setError('اكتب البريد الإلكتروني أولًا.');return;} if(seconds>0||busy)return; setBusy(true); try{const {error}=await supabase.auth.resend({type:'signup',email:cleanEmail,options:{emailRedirectTo:`${window.location.origin}/login?confirmed=1`}});if(error)throw error;sessionStorage.setItem('eng_osama_pending_email',cleanEmail);setMsg('تمت إعادة إرسال رسالة التفعيل. راجع بريدك الإلكتروني ومجلد البريد غير المرغوب فيه.');setSeconds(60);const interval=window.setInterval(()=>setSeconds(current=>{if(current<=1){window.clearInterval(interval);return 0;}return current-1;}),1000);}catch(e){setError(friendlyAuthError(e));}finally{setBusy(false);} }
  return <section className="section"><div style={{maxWidth:520,margin:'auto'}}><div className="verify-card surface"><div className="verify-icon" aria-hidden="true">✉</div><span className="tag">تفعيل الحساب</span><h1 style={{fontSize:32,marginBottom:8}}>راجع بريدك الإلكتروني</h1><p className="muted verify-lead">أرسلنا رسالة تفعيل إلى البريد التالي. افتح الرسالة واضغط على رابط التأكيد لإكمال إنشاء حسابك.</p><div className="verify-email-box"><span className="small muted">البريد المستخدم في التسجيل</span><strong>{email||'لم يتم تحديد البريد'}</strong></div><div className="verify-help"><strong>لم تجد الرسالة؟</strong><p className="muted">راجع مجلد <b>البريد غير المرغوب فيه (Spam)</b> و<strong>العروض (Promotions)</strong>، ثم ابحث عن رسالة من ENG OSAMA.</p></div>{error&&<div className="error" role="alert">{error}</div>}{msg&&<div className="notice" role="status">{msg}</div>}{!email&&<div><label className="label">البريد الإلكتروني</label><input className="input" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com"/></div>}<div className="verify-actions"><button className="btn btn-primary" type="button" disabled={busy||seconds>0||!email.trim()} onClick={resend}>{busy?'جاري إعادة الإرسال...':seconds>0?`إعادة الإرسال بعد ${seconds}ث`:'إعادة إرسال رسالة التفعيل'}</button><Link className="btn btn-ghost" to="/login">العودة لتسجيل الدخول</Link></div><p className="small muted" style={{margin:0}}>بعد الضغط على رابط التفعيل، ستنتقل لإضافة معلوماتك الشخصية أو يمكنك تخطيها.</p></div></div></section>;
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
