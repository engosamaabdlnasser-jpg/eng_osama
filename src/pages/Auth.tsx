import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function Login() { return <AuthForm mode="login" />; }
export function Signup() { return <AuthForm mode="signup" />; }

function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const nav = useNavigate();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [name, setName] = useState('');
  const [msg, setMsg] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setMsg('');
    if (!supabase) { setError('Supabase غير مربوط بعد. أضف قيم .env لتفعيل الحسابات الحقيقية.'); return; }
    setBusy(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        nav('/account');
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: name.trim() || null } } });
        if (error) throw error;
        if (data.session) nav('/account');
        else setMsg('تم إنشاء الحساب. تحقق من بريدك الإلكتروني إذا كان تأكيد البريد مفعلًا ثم سجل الدخول.');
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'حدث خطأ غير متوقع'); }
    finally { setBusy(false); }
  };

  return <section className="section"><div style={{ maxWidth: 480, margin: 'auto' }}>
    <div style={{ marginBottom: 24 }}><span className="tag">ENG OSAMA</span><h1 style={{ fontSize: 32 }}>{mode === 'login' ? 'مرحبًا بعودتك' : 'أنشئ حسابك'}</h1><p className="muted">{mode === 'login' ? 'سجل دخولك لمتابعة تعلمك.' : 'ابدأ رحلة التعلم مجانًا.'}</p></div>
    <form className="surface form-grid" style={{ padding: 24 }} onSubmit={submit}>
      {mode === 'signup' && <div><label className="label">الاسم</label><input className="input" autoComplete="name" value={name} onChange={e => setName(e.target.value)} /></div>}
      <div><label className="label">البريد الإلكتروني</label><input required type="email" autoComplete="email" className="input" value={email} onChange={e => setEmail(e.target.value)} /></div>
      <div><label className="label">كلمة المرور</label><input required minLength={6} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="input" value={password} onChange={e => setPassword(e.target.value)} /></div>
      {error && <div className="error">{error}</div>}{msg && <div className="notice">{msg}</div>}
      <button className="btn btn-primary" disabled={busy} type="submit">{busy ? 'جاري التنفيذ...' : mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}</button>
      <div className="muted" style={{ textAlign: 'center' }}>{mode === 'login' ? <>ليس لديك حساب؟ <Link to="/signup" style={{ color: '#0f766e', fontWeight: 700 }}>أنشئ حسابًا</Link></> : <>لديك حساب؟ <Link to="/login" style={{ color: '#0f766e', fontWeight: 700 }}>سجل الدخول</Link></>}</div>
    </form>
  </div></section>;
}
