import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});

Deno.serve(async req=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:cors});
  try{
    const auth=req.headers.get('Authorization'); if(!auth) return json({error:'Unauthorized'},401);
    const supabase=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:auth}}});
    const {data:{user}}=await supabase.auth.getUser(); if(!user) return json({error:'Unauthorized'},401);
    const body=await req.json(); const messages=Array.isArray(body.messages)?body.messages:[]; const locale=body.locale==='en'?'en':'ar'; const path=String(body.path||'/');
    const [{data:profile},{data:progress},{data:courses}]=await Promise.all([
      supabase.from('profiles').select('id,full_name,role').eq('id',user.id).maybeSingle(),
      supabase.from('progress').select('lesson_id,completed_at').eq('user_id',user.id).order('completed_at',{ascending:false}).limit(200),
      supabase.from('courses').select('id,title,title_ar,title_en,description,description_ar,description_en,instructor_name,lessons(id,title,title_ar,title_en,description,description_ar,description_en,sort_order)').eq('published',true).order('created_at',{ascending:false}).limit(30)
    ]);
    const system=locale==='en'
      ? `You are ENG OSAMA's in-platform educational assistant. Be natural, concise, helpful and professional. Answer primarily from the supplied platform context; do not invent platform facts. You may explain educational concepts generally, but clearly separate general knowledge from platform-specific facts. You cannot delete, grade, change passwords, or modify important data. If a technical/account issue needs a human, recommend support. Current user: ${profile?.full_name||'Student'}. Current route: ${path}.`
      : `أنت المساعد التعليمي داخل منصة ENG OSAMA. تحدث بالعربية الطبيعية وبأسلوب ودود واحترافي ومختصر. اعتمد أولًا على سياق المنصة المرفق ولا تخترع معلومات عن المنصة. يمكنك شرح المفاهيم التعليمية العامة، لكن فرّق بوضوح بينها وبين معلومات المنصة. لا تحذف بيانات ولا تعدل الدرجات أو كلمات المرور أو البيانات الحساسة. إذا كانت المشكلة تحتاج إنسانًا، وجّه الطالب للدعم. المستخدم الحالي: ${profile?.full_name||'طالب'}. الصفحة الحالية: ${path}.`;
    const context=JSON.stringify({profile,progress,courses},null,2).slice(0,50000);
    const key=Deno.env.get('GEMINI_API_KEY'); if(!key) return json({error:'AI is not configured. Add GEMINI_API_KEY to Supabase Edge Function secrets.'},503);
    const contents=messages.slice(-12).map((m:{role:string,content:string})=>({role:m.role==='assistant'?'model':'user',parts:[{text:String(m.content)}]}));
    const resp=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key='+encodeURIComponent(key),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({systemInstruction:{parts:[{text:system+'\n\nPLATFORM CONTEXT:\n'+context}]},contents,generationConfig:{temperature:.35,maxOutputTokens:700}})});
    const data=await resp.json(); if(!resp.ok) return json({error:data?.error?.message||'Gemini request failed'},resp.status);
    const answer=data?.candidates?.[0]?.content?.parts?.map((p:{text?:string})=>p.text||'').join('').trim(); if(!answer) return json({error:'No AI response'},502);
    return json({answer});
  }catch(e){return json({error:e instanceof Error?e.message:'Unexpected error'},500)}
});
