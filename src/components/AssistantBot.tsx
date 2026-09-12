import { useEffect, useRef, useState } from 'react';
import { Bot, ChevronDown, LifeBuoy, MessageCircle, Send, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getProfile } from '../services/data';
import type { Profile } from '../types';

type Message = { id: number; from: 'bot' | 'user'; text: string };

const quickReplies = [
  'مش عارف أبدأ منين',
  'الكورس مش شغال',
  'عايز أكلم الدعم',
];

function answer(text: string) {
  const t = text.trim().toLowerCase();
  if (t.includes('ابدأ') || t.includes('ابدء') || t.includes('أبدأ')) return 'ابدأ من صفحة الكورسات، واختار الكورس المناسب لك. حاول تمشي بالترتيب درسًا بعد درس، وكل درس تقدر تعلّمه كمكتمل بعد الانتهاء منه.';
  if (t.includes('مش شغال') || t.includes('لا يعمل') || t.includes('الفيديو') || t.includes('فيديو')) return 'لو الدرس أو الفيديو مش شغال، جرّب تحديث الصفحة والتأكد من اتصال الإنترنت. لو المشكلة مستمرة، ابعتلي تفاصيل المشكلة من زر «إرسال للدعم» وأنا أجهز طلب للدعم.';
  if (t.includes('دعم') || t.includes('مشكلة') || t.includes('مشكل')) return 'أكيد. أقدر أسجل لك طلب دعم داخل المنصة، وبعدها فريق الدعم يراجعه. اضغط «إرسال للدعم» واكتب المشكلة بالتفصيل.';
  if (t.includes('حساب') || t.includes('تسجيل')) return 'لو المشكلة في تسجيل الدخول أو الحساب، استخدم صفحة تسجيل الدخول أو استعادة كلمة المرور. ولو ما اتحلتش، أرسل طلب للدعم وسنراجع المشكلة.';
  if (t.includes('كورس') || t.includes('درس')) return 'تقدر تشوف الكورسات من قسم «الكورسات»، وتفتح أي كورس للوصول إلى الدروس ومتابعة تقدمك.';
  return 'أنا مساعد ENG OSAMA داخل المنصة. أقدر أساعدك في التنقل، الكورسات والدروس، أو تسجيل مشكلة للدعم. لو سؤالك يحتاج تدخل من فريق الدعم اضغط «إرسال للدعم».';
}

export default function AssistantBot() {
  const [open, setOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [input, setInput] = useState('');
  const [supportText, setSupportText] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, from: 'bot', text: 'أهلاً بيك 👋 أنا مساعد ENG OSAMA. قولّي محتاج إيه وأنا أساعدك.' },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    supabase?.auth.getUser().then(async ({ data }) => {
      if (!data.user || !active) return;
      try { const p = await getProfile(data.user.id); if (active) setProfile(p); } catch {}
    });
    return () => { active = false; };
  }, []);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, open, supportOpen]);

  const sendMessage = (value = input) => {
    const text = value.trim();
    if (!text) return;
    setMessages(prev => [...prev, { id: Date.now(), from: 'user', text }, { id: Date.now() + 1, from: 'bot', text: answer(text) }]);
    setInput('');
  };

  const sendSupport = async () => {
    if (!supportText.trim() || !supabase) return;
    setSending(true); setSent(false);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from('support_requests').insert({
        user_id: userData.user?.id ?? null,
        name: profile?.full_name ?? userData.user?.user_metadata?.full_name ?? null,
        email: userData.user?.email ?? null,
        message: supportText.trim(),
        source: 'assistant',
        page_path: window.location.pathname,
      });
      if (error) throw error;
      setSent(true); setSupportText('');
      setMessages(prev => [...prev, { id: Date.now(), from: 'bot', text: 'تم إرسال طلبك للدعم بنجاح ✅ فريق الدعم سيراجعه.' }]);
    } catch {
      setMessages(prev => [...prev, { id: Date.now(), from: 'bot', text: 'تعذر إرسال الطلب حاليًا. تأكد من الاتصال وحاول مرة أخرى.' }]);
    } finally { setSending(false); }
  };

  return <>
    {open && <section className="assistant-panel" aria-label="مساعد ENG OSAMA">
      <div className="assistant-head">
        <div className="assistant-title"><span className="assistant-avatar"><Bot size={19}/></span><div><strong>مساعد ENG OSAMA</strong><small>مساعدة داخل المنصة</small></div></div>
        <button className="icon-btn" onClick={() => setOpen(false)} aria-label="إغلاق"><X size={18}/></button>
      </div>
      <div className="assistant-body" ref={scrollRef}>
        {messages.map(m => <div key={m.id} className={`assistant-message ${m.from}`}>{m.text}</div>)}
        {!supportOpen && <div className="assistant-quick">{quickReplies.map(q => <button key={q} onClick={() => q === 'عايز أكلم الدعم' ? setSupportOpen(true) : sendMessage(q)}>{q}</button>)}</div>}
        {supportOpen && <div className="assistant-support-box"><div className="assistant-support-title"><LifeBuoy size={17}/> إرسال للدعم</div><textarea value={supportText} onChange={e => setSupportText(e.target.value)} placeholder="اكتب المشكلة بالتفصيل..." rows={4}/><div className="assistant-support-actions"><button className="btn btn-ghost" onClick={() => setSupportOpen(false)}>رجوع</button><button className="btn btn-primary" disabled={sending || !supportText.trim()} onClick={sendSupport}>{sending ? 'جارٍ الإرسال...' : 'إرسال الطلب'}</button></div>{sent && <small className="assistant-success">تم الإرسال.</small>}</div>}
      </div>
      {!supportOpen && <div className="assistant-composer"><input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }} placeholder="اكتب رسالتك..." aria-label="رسالتك"/><button onClick={() => sendMessage()} disabled={!input.trim()} aria-label="إرسال"><Send size={17}/></button></div>}
      {!supportOpen && <button className="assistant-support-link" onClick={() => setSupportOpen(true)}><LifeBuoy size={16}/> محتاج تتواصل مع الدعم؟</button>}
    </section>}
    <button className={`assistant-fab ${open ? 'active' : ''}`} onClick={() => setOpen(v => !v)} aria-label={open ? 'إغلاق المساعد' : 'فتح المساعد'}>{open ? <ChevronDown size={24}/> : <MessageCircle size={25}/>}<span>مساعد</span></button>
  </>;
}
