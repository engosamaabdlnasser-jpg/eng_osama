import { useEffect, useRef, useState } from 'react';
import { Bot, ChevronDown, LifeBuoy, MessageCircle, Send, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { createStudentSupportConversation, getProfile, getStudentSupportConversation } from '../services/data';
import { useI18n } from '../i18n';
import type { Conversation, ConversationMessage, Profile } from '../types';

type LocalMessage = { id: string; from: 'bot' | 'user'; text: string };

function answer(text: string, t: (key: import('../i18n').TranslationKey) => string) {
  const normalized = text.trim().toLowerCase();
  if (normalized.includes('ابدأ') || normalized.includes('ابدء') || normalized.includes('start')) return t('assistant.startHelp');
  if (normalized.includes('مش شغال') || normalized.includes('لا يعمل') || normalized.includes('الفيديو') || normalized.includes('فيديو') || normalized.includes('video')) return t('assistant.videoHelp');
  if (normalized.includes('دعم') || normalized.includes('مشكلة') || normalized.includes('مشكل') || normalized.includes('support')) return t('assistant.supportIntro');
  if (normalized.includes('حساب') || normalized.includes('تسجيل') || normalized.includes('account') || normalized.includes('login')) return t('assistant.accountHelp');
  if (normalized.includes('كورس') || normalized.includes('درس') || normalized.includes('course') || normalized.includes('lesson')) return t('assistant.courseHelp');
  return t('assistant.help');
}

export default function AssistantBot() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [input, setInput] = useState('');
  const [supportText, setSupportText] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [supportMessages, setSupportMessages] = useState<ConversationMessage[]>([]);
  const [messages, setMessages] = useState<LocalMessage[]>([{ id: 'welcome', from: 'bot', text: t('assistant.welcome') }]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const humanActive = Boolean(conversation && ['WAITING_FOR_HUMAN', 'ASSIGNED', 'HUMAN_ACTIVE', 'WAITING_FOR_STUDENT', 'REOPENED'].includes(conversation.status));

  useEffect(() => {
    setMessages(prev => prev.length === 1 && prev[0].id === 'welcome' ? [{ id: 'welcome', from: 'bot', text: t('assistant.welcome') }] : prev);
  }, [t]);

  useEffect(() => {
    let active = true;
    supabase?.auth.getUser().then(async ({ data }) => {
      if (!data.user || !active) return;
      try {
        const p = await getProfile(data.user.id);
        if (active) setProfile(p);
      } catch {
        // Profile data is optional for the assistant.
      }
    });
    return () => { active = false; };
  }, []);

  const loadSupport = async () => {
    if (!supabase) return;
    try {
      const result = await getStudentSupportConversation();
      setConversation(result.conversation);
      setSupportMessages(result.messages);
    } catch {
      // Keep the assistant usable even when support storage is temporarily unavailable.
    }
  };

  useEffect(() => {
    if (!supportOpen) return;
    void loadSupport();
  }, [supportOpen]);

  useEffect(() => {
    if (!supabase || !conversation?.id) return;
    const channel = supabase.channel(`student-support-${conversation.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_messages', filter: `conversation_id=eq.${conversation.id}` }, payload => {
        const incoming = payload.new as ConversationMessage;
        setSupportMessages(prev => prev.some(message => message.id === incoming.id) ? prev : [...prev, incoming]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `id=eq.${conversation.id}` }, payload => {
        setConversation(payload.new as Conversation);
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [conversation?.id]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, supportMessages, open, supportOpen]);

  const sendMessage = (value = input) => {
    const text = value.trim();
    if (!text) return;
    if (humanActive) {
      setSupportOpen(true);
      setSupportText(text);
      setInput('');
      return;
    }
    const stamp = Date.now().toString();
    setMessages(prev => [...prev, { id: `${stamp}-u`, from: 'user', text }, { id: `${stamp}-b`, from: 'bot', text: answer(text, t) }]);
    setInput('');
  };

  const sendSupport = async () => {
    const text = supportText.trim();
    if (!text || !supabase) return;
    setSending(true);
    setSent(false);
    try {
      const conversationId = await createStudentSupportConversation(text, window.location.pathname);
      setSupportText('');
      setSent(true);
      await loadSupport();
      setMessages(prev => [...prev, { id: `support-${Date.now()}`, from: 'bot', text: t('assistant.supportSuccess') }]);
      if (!conversationId) throw new Error('Conversation was not created');
    } catch {
      setMessages(prev => [...prev, { id: `support-error-${Date.now()}`, from: 'bot', text: t('assistant.supportError') }]);
    } finally {
      setSending(false);
    }
  };

  const supportStatus = conversation?.status === 'HUMAN_ACTIVE' || conversation?.status === 'ASSIGNED'
    ? 'support.active'
    : conversation?.status === 'WAITING_FOR_HUMAN' || conversation?.status === 'REOPENED'
      ? 'support.waiting'
      : null;

  return <>
    {open && <section className="assistant-panel" aria-label={t('assistant.title')}>
      <div className="assistant-head">
        <div className="assistant-title"><span className="assistant-avatar"><Bot size={19}/></span><div><strong>{t('assistant.title')}</strong><small>{t('assistant.subtitle')}</small></div></div>
        <button className="icon-btn" onClick={() => setOpen(false)} aria-label={t('assistant.close')}><X size={18}/></button>
      </div>
      <div className="assistant-body" ref={scrollRef}>
        {supportOpen ? <>
          {supportMessages.map(message => <div key={message.id} className={`assistant-message ${message.sender_role === 'student' ? 'user' : 'bot'}`}>{message.body}</div>)}
          {supportStatus && <div className="assistant-support-status">{t(supportStatus)}</div>}
          {!conversation && <div className="assistant-support-box"><div className="assistant-support-title"><LifeBuoy size={17}/>{t('assistant.supportTitle')}</div><textarea value={supportText} onChange={e => setSupportText(e.target.value)} placeholder={t('assistant.supportPlaceholder')} rows={4}/><div className="assistant-support-actions"><button className="btn btn-ghost" onClick={() => setSupportOpen(false)}>{t('assistant.back')}</button><button className="btn btn-primary" disabled={sending || !supportText.trim()} onClick={sendSupport}>{sending ? t('assistant.sending') : t('assistant.sendRequest')}</button></div>{sent && <small className="assistant-success">{t('assistant.sent')}</small>}</div>}
          {conversation && <div className="assistant-support-box"><div className="assistant-support-title"><LifeBuoy size={17}/>{t('assistant.supportTitle')}</div><textarea value={supportText} onChange={e => setSupportText(e.target.value)} placeholder={t('assistant.supportPlaceholder')} rows={3}/><div className="assistant-support-actions"><button className="btn btn-ghost" onClick={() => setSupportOpen(false)}>{t('assistant.back')}</button><button className="btn btn-primary" disabled={sending || !supportText.trim()} onClick={sendSupport}>{sending ? t('assistant.sending') : t('common.send')}</button></div></div>}
        </> : <>
          {messages.map(message => <div key={message.id} className={`assistant-message ${message.from}`}>{message.text}</div>)}
          <div className="assistant-quick">
            <button onClick={() => sendMessage(t('assistant.start'))}>{t('assistant.start')}</button>
            <button onClick={() => sendMessage(t('assistant.course'))}>{t('assistant.course')}</button>
            <button onClick={() => setSupportOpen(true)}>{t('assistant.supportShort')}</button>
          </div>
        </>}
      </div>
      {!supportOpen && <div className="assistant-composer"><input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }} placeholder={t('assistant.placeholder')} aria-label={t('assistant.message')}/><button onClick={() => sendMessage()} disabled={!input.trim()} aria-label={t('assistant.send')}><Send size={17}/></button></div>}
      {!supportOpen && <button className="assistant-support-link" onClick={() => setSupportOpen(true)}><LifeBuoy size={16}/> {t('assistant.support')}</button>}
    </section>}
    <button className={`assistant-fab ${open ? 'active' : ''}`} onClick={() => setOpen(v => !v)} aria-label={open ? t('assistant.close') : t('assistant.open')}>{open ? <ChevronDown size={24}/> : <MessageCircle size={25}/>}<span>{t('assistant.title').split(' ')[0]}</span></button>
  </>;
}
