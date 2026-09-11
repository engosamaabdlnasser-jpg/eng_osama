import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

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

function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMsg('');
    if (!supabase) {
      setError('Supabase غير مربوط بعد. أضف قيم البيئة لتفعيل الحسابات الحقيقية.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        nav('/account');
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim() || null } },
        });
        if (error) throw error;
        if (data.session) nav('/account');
        else setMsg('تم إنشاء الحساب. افتح بريدك الإلكتروني واضغط رابط التأكيد، ثم سجل الدخول.');
      }
    } catch (e) {
      setError(friendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  return <section className="section"><div style={{ maxWidth: 480, margin: 'auto' }}>
    <div style={{ marginBottom: 24 }}>
      <span className="tag">ENG OSAMA</span>
      <h1 style={{ fontSize: 32 }}>{mode === 'login' ? 'مرحبًا بعودتك' : 'أنشئ حسابك'}</h1>
      <p className="muted">{mode === 'login' ? 'سجل دخولك لمتابعة تعلمك.' : 'ابدأ رحلة التعلم مجانًا.'}</p>
    </div>

    <form className="surface form-grid" style={{ padding: 24 }} onSubmit={submit}>
      {mode === 'signup' && <div>
        <label className="label">الاسم</label>
        <input className="input" autoComplete="name" value={name} onChange={e => setName(e.target.value)} />
      </div>}
      <div>
        <label className="label">البريد الإلكتروني</label>
        <input required type="email" autoComplete="email" className="input" value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <div>
        <div className="form-label-row">
          <label className="label">كلمة المرور</label>
          {mode === 'login' && <Link className="form-link" to="/forgot-password">نسيت كلمة المرور؟</Link>}
        </div>
        <input required minLength={6} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="input" value={password} onChange={e => setPassword(e.target.value)} />
      </div>
      {error && <div className="error">{error}</div>}
      {msg && <div className="notice">{msg}</div>}
      <button className="btn btn-primary" disabled={busy} type="submit">
        {busy ? 'جاري التنفيذ...' : mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}
      </button>
      <div className="muted" style={{ textAlign: 'center' }}>
        {mode === 'login' ? <>ليس لديك حساب؟ <Link to="/signup" className="form-link">أنشئ حسابًا</Link></> : <>لديك حساب؟ <Link to="/login" className="form-link">سجل الدخول</Link></>}
      </div>
    </form>
  </div></section>;
}

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMsg('');
    if (!supabase) {
      setError('Supabase غير مربوط بعد.');
      return;
    }
    setBusy(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) throw error;
      setMsg('تم إرسال رابط إعادة تعيين كلمة المرور. راجع بريدك الإلكتروني.');
    } catch (e) {
      setError(friendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  }

  return <section className="section"><div style={{ maxWidth: 480, margin: 'auto' }}>
    <div style={{ marginBottom: 24 }}>
      <span className="tag">استعادة الحساب</span>
      <h1 style={{ fontSize: 32 }}>نسيت كلمة المرور؟</h1>
      <p className="muted">أدخل بريدك وسنرسل لك رابطًا آمنًا لتعيين كلمة مرور جديدة.</p>
    </div>
    <form className="surface form-grid" style={{ padding: 24 }} onSubmit={submit}>
      <div><label className="label">البريد الإلكتروني</label><input required type="email" autoComplete="email" className="input" value={email} onChange={e => setEmail(e.target.value)} /></div>
      {error && <div className="error">{error}</div>}
      {msg && <div className="notice">{msg}</div>}
      <button className="btn btn-primary" disabled={busy}>{busy ? 'جاري الإرسال...' : 'إرسال رابط الاستعادة'}</button>
      <Link className="btn btn-ghost" to="/login">العودة لتسجيل الدخول</Link>
    </form>
  </div></section>;
}

export function ResetPassword() {
  const nav = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMsg('');
    if (!supabase) { setError('Supabase غير مربوط بعد.'); return; }
    if (password.length < 6) { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل.'); return; }
    if (password !== confirmPassword) { setError('تأكيد كلمة المرور غير مطابق.'); return; }

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMsg('تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.');
      setTimeout(() => nav('/account'), 900);
    } catch (e) {
      setError(friendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  }

  return <section className="section"><div style={{ maxWidth: 480, margin: 'auto' }}>
    <div style={{ marginBottom: 24 }}>
      <span className="tag">أمان الحساب</span>
      <h1 style={{ fontSize: 32 }}>تعيين كلمة مرور جديدة</h1>
      <p className="muted">اختر كلمة مرور قوية لا تقل عن 6 أحرف.</p>
    </div>
    <form className="surface form-grid" style={{ padding: 24 }} onSubmit={submit}>
      <div><label className="label">كلمة المرور الجديدة</label><input required minLength={6} type="password" autoComplete="new-password" className="input" value={password} onChange={e => setPassword(e.target.value)} /></div>
      <div><label className="label">تأكيد كلمة المرور</label><input required minLength={6} type="password" autoComplete="new-password" className="input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /></div>
      {error && <div className="error">{error}</div>}
      {msg && <div className="notice">{msg}</div>}
      <button className="btn btn-primary" disabled={busy}>{busy ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}</button>
    </form>
  </div></section>;
}
