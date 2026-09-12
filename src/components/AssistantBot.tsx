import { useEffect, useRef, useState } from 'react';
import { Bot, LifeBuoy, Send, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { askAssistantAI, getProfile, recordAssistantMessage } from '../services/data';
import type { Profile } from '../types';
import { useI18n } from '../i18n';

type Message = { id: string; from: 'bot'|'user'; text: string };
const quickKeys=['assistant.start','assistant.courseIssue','assistant.contact'];
function localAnswer(text:string, locale:'ar'|'en'){
 const t=text.toLowerCase();
 if(locale==='en'){
  if(t.includes('start')) return 'Open Courses, choose a course, and follow the lessons in order. I can help you decide what to do next.';
  if(t.includes('video')||t.includes('not working')||t.includes('course')) return 'Try refreshing the page and checking your connection. If the issue continues, I can send the details to support.';
  if(t.includes('support')||t.includes('problem')) return 'Sure. I can create a support request and include the current page and your account details.';
  return 'I’m the ENG OSAMA assistant. I can help with courses, lessons, navigation, and support requests.';
 }
 if(t.includes('ابدأ')||t.includes('ابدء')) return 'افتح صفحة الكورسات، اختار الكورس المناسب، وامشِ بالترتيب. أقدر أساعدك تحدد الخطوة التالية.';
 if(t.includes('فيديو')||t.includes('مش شغال')||t.includes('لا يعمل')||t.includes('كورس')) return 'جرّب تحديث الصفحة والتأكد من الاتصال بالإنترنت. لو المشكلة مستمرة، أقدر أرسل تفاصيلها للدعم.';
 if(t.includes('دعم')||t.includes('مشكلة')) return 'أكيد. أقدر أعمل طلب دعم وأرفق بيانات حسابك والصفحة الحالية وتفاصيل المشكلة.';
 return 'أنا مساعد ENG OSAMA داخل المنصة. أقدر أساعدك في الكورسات والدروس والتنقل أو تسجيل مشكلة للدعم.';
}
export default function AssistantBot(){
 const {t,locale}=useI18n(); const [enabled,setEnabled]=useState(true); const [aiEnabled,setAiEnabled]=useState(true); const [supportEnabled,setSupportEnabled]=useState(true); const [open,setOpen]=useState(false); const [supportOpen,setSupportOpen]=useState(false); const [input,setInput]=useState(''); const [supportText,setSupportText]=useState(''); const [sending,setSending]=useState(false); const [sent,setSent]=useState(false); const [profile,setProfile]=useState<Profile|null>(null);
 const [messages,setMessages]=useState<Message[]>([{id:'welcome',from:'bot',text:t('assistant.welcome')}]); const scrollRef=useRef<HTMLDivElement>(null);
 useEffect(()=>setMessages(m=>m.length===1&&m[0].id==='welcome'?[{...m[0],text:t('assistant.welcome')}]:m),[locale,t]);
 useEffect(()=>{getSiteSettings().then(site=>{setEnabled(site.assistant_enabled!==false);setAiEnabled(site.assistant_ai_enabled!==false);setSupportEnabled(site.assistant_support_enabled!==false)}).catch(()=>{}); supabase?.auth.getUser().then(async ({data})=>{if(data.user){try{setProfile(await getProfile(data.user.id))}catch{}}})},[]);
 useEffect(()=>scrollRef.current?.scrollTo({top:scrollRef.current.scrollHeight,behavior:'smooth'}),[messages,open,supportOpen]);
 const sendMessage=async(value=input)=>{const text=value.trim();if(!text)return; const now=Date.now(); const next=[...messages,{id:`u-${now}`,from:'user' as const,text}]; setMessages(next); setInput(''); let reply=localAnswer(text,locale); if(profile?.id && aiEnabled){ try{const ai=await askAssistantAI(profile.id,next.map(m=>({role:m.from==='user'?'user':'assistant',content:m.text})),locale,window.location.pathname); if(ai) reply=ai;}catch{} } if(profile?.id){ await recordAssistantMessage(profile.id,'user',text); await recordAssistantMessage(profile.id,'assistant',reply); } setMessages(m=>[...m,{id:`b-${now+1}`,from:'bot',text:reply}]); };
 const sendSupport=async()=>{if(!supportText.trim()||!supabase)return;setSending(true);setSent(false);try{const {data}=await supabase.auth.getUser(); if(!data.user) throw new Error(locale==='en'?'Please sign in first.':'سجّل الدخول أولًا.'); const transcript=messages.map(m=>`${m.from==='user'?(locale==='en'?'Student':'الطالب'):(locale==='en'?'Assistant':'المساعد')}: ${m.text}`).join('\n'); let summary=supportText.trim(); if(profile?.id && aiEnabled){try{const ai=await askAssistantAI(profile.id,[...messages.map(m=>({role:m.from==='user'?'user' as const:'assistant' as const,content:m.text})),{role:'user',content:locale==='en'?'Summarize this conversation for a human support agent in 3-5 concise bullet points.':'لخص هذه المحادثة لفريق الدعم البشري في 3 إلى 5 نقاط مختصرة.'}],locale,window.location.pathname); if(ai)summary=ai}catch{}} const {error}=await supabase.from('support_requests').insert({user_id:data.user.id,name:profile?.full_name||null,email:data.user.email||null,message:`${supportText.trim()}\n\n--- AI Summary ---\n${summary}\n\n--- Conversation ---\n${transcript}`,source:'assistant',page_path:window.location.pathname}); if(error)throw error;setSent(true);setSupportText('')}catch(e){setMessages(m=>[...m,{id:`err-${Date.now()}`,from:'bot',text:e instanceof Error?e.message:t('assistant.needHelp')}])}finally{setSending(false)}};
 if(!enabled)return null; return <><button className={`assistant-fab ${open?'active':''}`} onClick={()=>setOpen(!open)} aria-label={t('assistant.title')}><Bot size={18}/><span>{t('assistant.title')}</span>{open?<X size={16}/>:null}</button>{open&&<section className="assistant-panel" aria-label={t('assistant.title')}>
  <header className="assistant-head"><div className="assistant-title"><span className="assistant-avatar"><Bot size={20}/></span><div><strong>{t('assistant.title')}</strong><small>{t('assistant.online')}</small></div></div><button className="icon-btn" onClick={()=>setOpen(false)} aria-label={t('common.cancel')}><X size={18}/></button></header>
  <div className="assistant-body" ref={scrollRef}>{messages.map(m=><div key={m.id} className={`assistant-message ${m.from}`}>{m.text}</div>)}<div className="assistant-quick">{quickKeys.map(k=><button key={k} onClick={()=>sendMessage(t(k))}>{t(k)}</button>)}</div>{supportEnabled&&supportOpen&&<div className="assistant-support-box"><div className="assistant-support-title"><LifeBuoy size={17}/>{t('assistant.supportTitle')}</div><textarea rows={5} value={supportText} onChange={e=>setSupportText(e.target.value)} placeholder={t('assistant.supportPlaceholder')}/><div className="assistant-support-actions"><button className="btn btn-primary" onClick={sendSupport} disabled={sending}>{sending?t('common.saving'):t('assistant.send')} <Send size={15}/></button><button className="btn btn-ghost" onClick={()=>setSupportOpen(false)}>{t('common.cancel')}</button></div>{sent&&<span className="assistant-success">{t('assistant.sent')}</span>}</div>}</div>
  {supportEnabled&&!supportOpen&&<button className="assistant-support-link" onClick={()=>setSupportOpen(true)}><LifeBuoy size={16}/>{t('assistant.support')}</button>}
  <form className="assistant-composer" onSubmit={e=>{e.preventDefault();sendMessage()}}><input value={input} onChange={e=>setInput(e.target.value)} placeholder={locale==='en'?'Type your question...':'اكتب سؤالك...'} aria-label={t('common.search')}/><button type="submit" disabled={!input.trim()} aria-label={t('assistant.send')}><Send size={17}/></button></form>
 </section>}</>
}
