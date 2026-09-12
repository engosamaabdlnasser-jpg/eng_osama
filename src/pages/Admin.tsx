import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Settings, UsersRound, X, UserRound, Mail, Phone, CalendarDays, ShieldCheck, BookOpenCheck, Images, Trash2, Upload, RefreshCw, HardDrive, MessageCircle, CheckCircle2, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useI18n } from '../i18n';
import { createCategory, defaultSiteSettings, deleteCategory, getAdminProfiles, getAdminStudentDetails, getAllCourses, getCategories, getProfile, getSiteSettings, getStudentMonitorData, renameCategory, saveSiteSettings, setUserRole, uploadSiteLogo, uploadSiteInstructorImage, uploadSiteAsset, getManagedSiteAssets, deleteManagedSiteAsset, uploadManagedAsset, getAdminSupportConversations, getConversationMessages, acceptSupportConversation, sendAdminConversationMessage, updateSupportConversationStatus } from '../services/data';
import type { AdminStudentDetails, Category, Course, HomeExtraSection, Profile, SiteSettings, StudentMonitorRow, Conversation, ConversationMessage } from '../types';
import type { ManagedSiteAsset } from '../services/data';

const emptyExtra: HomeExtraSection = { enabled: false, title: '', description: '', button_label: '', button_url: '' };

export default function Admin() {
  const { t } = useI18n();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [students, setStudents] = useState<StudentMonitorRow[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings);
  const [newCat, setNewCat] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState<'overview'|'content'|'visual'|'assets'|'students'|'support'>('overview');
  const [supportConversations, setSupportConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [conversationMessages, setConversationMessages] = useState<ConversationMessage[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportReply, setSupportReply] = useState('');
  const [supportActionLoading, setSupportActionLoading] = useState(false);
  const [visualTarget, setVisualTarget] = useState('header');
  const [componentTarget, setComponentTarget] = useState('home.hero');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingInstructor, setUploadingInstructor] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savedAt, setSavedAt] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<AdminStudentDetails | null>(null);
  const [studentDetailsLoading, setStudentDetailsLoading] = useState(false);
  const [assets, setAssets] = useState<ManagedSiteAsset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [assetUploading, setAssetUploading] = useState(false);
  const nav = useNavigate();

  async function loadSupportInbox() {
    if (!supabase) return;
    setSupportLoading(true);
    try {
      const rows = await getAdminSupportConversations();
      setSupportConversations(rows);
      if (selectedConversation) {
        const fresh = rows.find(row => row.id === selectedConversation.id) ?? null;
        setSelectedConversation(fresh);
        if (fresh) setConversationMessages(await getConversationMessages(fresh.id));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل محادثات الدعم.');
    } finally { setSupportLoading(false); }
  }

  async function openSupportConversation(conversation: Conversation) {
    setSelectedConversation(conversation);
    try { setConversationMessages(await getConversationMessages(conversation.id)); }
    catch (e) { setError(e instanceof Error ? e.message : 'تعذر تحميل الرسائل.'); }
  }

  async function acceptConversation(conversation: Conversation) {
    setSupportActionLoading(true);
    try {
      const updated = await acceptSupportConversation(conversation.id);
      setSelectedConversation(updated);
      setSupportConversations(prev => prev.map(row => row.id === updated.id ? updated : row));
      setConversationMessages(await getConversationMessages(updated.id));
      setMsg(t('support.accepted'));
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر قبول المحادثة. قد تكون أُخذت بالفعل.'); await loadSupportInbox(); }
    finally { setSupportActionLoading(false); }
  }

  async function replyToConversation() {
    if (!selectedConversation || !supportReply.trim()) return;
    setSupportActionLoading(true);
    try {
      const message = await sendAdminConversationMessage(selectedConversation.id, supportReply);
      setConversationMessages(prev => [...prev, message]);
      setSupportReply('');
      setSupportConversations(prev => prev.map(row => row.id === selectedConversation.id ? { ...row, last_message_at: message.created_at, updated_at: message.created_at, admin_replied_at: row.admin_replied_at ?? message.created_at, status: 'HUMAN_ACTIVE' } : row));
      setSelectedConversation(prev => prev ? { ...prev, last_message_at: message.created_at, updated_at: message.created_at, admin_replied_at: prev.admin_replied_at ?? message.created_at, status: 'HUMAN_ACTIVE' } : prev);
    } catch (e) { setError(e instanceof Error ? e.message : t('support.replyError')); }
    finally { setSupportActionLoading(false); }
  }

  async function toggleRetentionExempt(conversation: Conversation) {
    const client = supabase;
    if (!client) return;
    setSupportActionLoading(true);
    try {
      const { data, error } = await client.from('conversations').update({ retention_exempt: !conversation.retention_exempt }).eq('id', conversation.id).select('*').single();
      if (error) throw error;
      const updated = data as Conversation;
      setSelectedConversation(updated);
      setSupportConversations(prev => prev.map(row => row.id === updated.id ? updated : row));
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر تغيير سياسة الاحتفاظ.'); }
    finally { setSupportActionLoading(false); }
  }

  async function changeConversationStatus(status: Conversation['status']) {
    if (!selectedConversation) return;
    setSupportActionLoading(true);
    try {
      const updated = await updateSupportConversationStatus(selectedConversation.id, status);
      setSelectedConversation(updated);
      setSupportConversations(prev => prev.map(row => row.id === updated.id ? updated : row));
      setMsg(status === 'RESOLVED' ? t('support.resolved') : t('support.updated'));
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر تحديث حالة المحادثة.'); }
    finally { setSupportActionLoading(false); }
  }

  async function load() {
    if (!supabase) { setError('Supabase غير مربوط. اربط المشروع بقاعدة البيانات لتفعيل لوحة الإدارة.'); return; }
    const { data } = await supabase.auth.getUser();
    if (!data.user) { nav('/login'); return; }
    const p = await getProfile(data.user.id);
    if (p?.role !== 'admin') { nav('/'); return; }
    setProfile(p);

    const results = await Promise.allSettled([
      getAllCourses(),
      getCategories(),
      getAdminProfiles(),
      getStudentMonitorData(),
      getSiteSettings(),
    ]);
    const messages: string[] = [];
    if (results[0].status === 'fulfilled') setCourses(results[0].value); else messages.push('تعذر تحميل الكورسات.');
    if (results[1].status === 'fulfilled') setCats(results[1].value); else messages.push('تعذر تحميل التصنيفات.');
    if (results[2].status === 'fulfilled') setUsers(results[2].value); else messages.push('تعذر تحميل المستخدمين.');
    if (results[3].status === 'fulfilled') setStudents(results[3].value.filter(x=>x.role==='student')); else messages.push('تعذر تحميل مراقبة الطلاب. شغّل ملف قاعدة البيانات الجديد مرة واحدة.');
    if (results[4].status === 'fulfilled') setSettings(results[4].value); else messages.push('تعذر تحميل إعدادات الموقع. شغّل ملف قاعدة البيانات الجديد مرة واحدة.');
    if (messages.length) setError(messages.join(' '));
  }

  useEffect(() => { load().catch(e => setError(e instanceof Error ? e.message : 'حدث خطأ')); }, [nav]);
  useEffect(() => {
    const client = supabase;
    if (!client || tab !== 'support') return;
    const channel = client.channel('admin-support-inbox')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => { void loadSupportInbox(); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_messages' }, () => {
        if (selectedConversation) getConversationMessages(selectedConversation.id).then(setConversationMessages).catch(() => {});
        void loadSupportInbox();
      })
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [tab, selectedConversation?.id]);


  async function togglePublished(course: Course) { if (!supabase) return; setError(''); setMsg(''); const { error } = await supabase.from('courses').update({ published: !course.published }).eq('id', course.id); if (error) setError(error.message); else { setMsg(course.published ? 'تم إخفاء الكورس.' : 'تم نشر الكورس.'); setCourses(xs => xs.map(x => x.id === course.id ? { ...x, published: !x.published } : x)); } }
  async function removeCourse(course: Course) { if (!supabase || !confirm(`حذف الكورس «${course.title}»؟ سيتم حذف دروسه أيضًا.`)) return; const { error } = await supabase.from('courses').delete().eq('id', course.id); if (error) setError(error.message); else { setMsg('تم حذف الكورس.'); setCourses(xs => xs.filter(x => x.id !== course.id)); } }
  async function addCategory(e: React.FormEvent) { e.preventDefault(); if (!newCat.trim()) return; try { const c = await createCategory(newCat); setCats(xs => [...xs, c].sort((a,b)=>a.name.localeCompare(b.name,'ar'))); setNewCat(''); setMsg('تمت إضافة التصنيف.'); } catch (e) { setError(e instanceof Error ? e.message : 'تعذر إضافة التصنيف'); } }
  async function editCategory(c: Category) { const name = prompt('اسم التصنيف الجديد:', c.name)?.trim(); if (!name || name===c.name) return; try { const updated=await renameCategory(c.id,name);setCats(xs=>xs.map(x=>x.id===c.id?updated:x));setMsg('تم تعديل التصنيف.'); } catch(e){setError(e instanceof Error?e.message:'تعذر تعديل التصنيف');} }
  async function removeCategory(c: Category) { if(!confirm(`حذف التصنيف «${c.name}»؟`))return; try{await deleteCategory(c.id);setCats(x=>x.filter(item=>item.id!==c.id));setMsg('تم حذف التصنيف.')}catch(e){setError(e instanceof Error?e.message:'تعذر حذف التصنيف')} }
  async function changeRole(u: Profile) { if(!supabase||!profile||u.id===profile.id){setError('لا يمكن تغيير صلاحية حسابك من هنا.');return;} const next=u.role==='admin'?'student':'admin'; if(!confirm(`تغيير صلاحية ${u.full_name||'هذا المستخدم'} إلى ${next==='admin'?'مدير':'طالب'}؟`))return; try{const updated=await setUserRole(u.id,next);setUsers(xs=>xs.map(x=>x.id===u.id?updated:x));setMsg('تم تحديث الصلاحية.');}catch(e){setError(e instanceof Error?e.message:'تعذر تحديث الصلاحية');} }
  async function saveSettings(e: React.FormEvent){e.preventDefault();if(savingSettings)return;setError('');setMsg('');setSavingSettings(true);try{const saved=await saveSiteSettings(settings);const next={...settings, ...(saved?.settings||{})} as SiteSettings;setSettings(next);window.dispatchEvent(new CustomEvent('eng-osama:site-settings-updated',{detail:next}));const now=new Date();setSavedAt(now.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}));setMsg('تم الحفظ بنجاح — التغييرات اتطبقت فورًا.');}catch(e){setError(e instanceof Error?e.message:'تعذر حفظ الإعدادات');}finally{setSavingSettings(false);}}
  async function handleLogoUpload(e: ChangeEvent<HTMLInputElement>){ const file=e.target.files?.[0]; if(!file) return; if(!file.type.startsWith('image/')){setError('اختر ملف صورة فقط.');return;} if(file.size>4*1024*1024){setError('حجم اللوجو يجب ألا يتجاوز 4MB.');return;} setUploadingLogo(true); setError(''); setMsg(''); try{const url=await uploadSiteLogo(file);setSettings(x=>({...x,logo_url:url}));setMsg('تم رفع اللوجو. اضغط حفظ إعدادات الموقع لتفعيله.');}catch(e){setError(e instanceof Error?e.message:'تعذر رفع اللوجو. تأكد من إعداد Storage في Supabase.');}finally{setUploadingLogo(false);}}
  async function handleInstructorUpload(e: ChangeEvent<HTMLInputElement>){ const file=e.target.files?.[0]; if(!file) return; if(!file.type.startsWith('image/')){setError('اختر ملف صورة فقط.');return;} if(file.size>4*1024*1024){setError('حجم الصورة يجب ألا يتجاوز 4MB.');return;} setUploadingInstructor(true); setError(''); setMsg(''); try{const url=await uploadSiteInstructorImage(file);setSettings(x=>({...x,instructor_image_url:url}));setMsg('تم رفع الصورة الشخصية لصاحب المنصة. اضغط حفظ إعدادات الموقع لتفعيلها.');}catch(e){setError(e instanceof Error?e.message:'تعذر رفع الصورة. تأكد من إعداد Storage في Supabase.');}finally{setUploadingInstructor(false);}}
  function updateExtra(index:number, patch:Partial<HomeExtraSection>){setSettings(s=>({...s,extra_sections:s.extra_sections.map((x,i)=>i===index?{...x,...patch}:x)}));}
  function addExtra(){setSettings(s=>({...s,extra_sections:[...s.extra_sections,{...emptyExtra}]}));}
  function removeExtra(index:number){setSettings(s=>({...s,extra_sections:s.extra_sections.filter((_,i)=>i!==index)}));}
  async function handleDesignAsset(e: ChangeEvent<HTMLInputElement>, key: 'auth_background_image'|'auth_visual_image'|'auth_logo_light'|'auth_logo_dark') {
    const file=e.target.files?.[0]; if(!file)return; setError(''); setMsg('');
    try { const url=await uploadSiteAsset(file,key); setSettings(x=>({...x,[key]:url})); setMsg('تم رفع الملف. اضغط حفظ لتثبيت التغيير.'); }
    catch(e){setError(e instanceof Error?e.message:'تعذر رفع الملف.');} finally { e.target.value=''; }
  }
  async function openStudentDetails(userId:string) {
    setError(''); setStudentDetailsLoading(true);
    try {
      const details = await getAdminStudentDetails(userId);
      setSelectedStudent(details);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل ملف الطالب. تأكد من تشغيل V7-PROFILE-ONBOARDING-ADMIN.sql.');
    } finally { setStudentDetailsLoading(false); }
  }

  async function loadAssets() {
    setAssetsLoading(true); setError('');
    try { setAssets(await getManagedSiteAssets()); }
    catch (e) { setError(e instanceof Error ? e.message : 'تعذر تحميل الملفات. تأكد من صلاحيات Storage للـAdmin.'); }
    finally { setAssetsLoading(false); }
  }

  async function handleManagedAssetUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setAssetUploading(true); setError(''); setMsg('');
    try { await uploadManagedAsset(file, 'library'); setMsg('تم رفع الملف بنجاح.'); await loadAssets(); }
    catch (e) { setError(e instanceof Error ? e.message : 'تعذر رفع الملف.'); }
    finally { setAssetUploading(false); e.target.value = ''; }
  }

  async function handleAssetDelete(asset: ManagedSiteAsset) {
    const currentUrls = [settings.logo_url, settings.instructor_image_url, settings.auth_background_image, settings.auth_visual_image, settings.auth_logo_light, settings.auth_logo_dark];
    if (currentUrls.includes(asset.url)) { setError('هذا الملف مستخدم حاليًا في تصميم المنصة. غيّره من الإعدادات أولًا ثم احذفه.'); return; }
    if (!confirm(`حذف الملف «${asset.name}» نهائيًا؟`)) return;
    setError(''); setMsg('');
    try { await deleteManagedSiteAsset(asset.path); setAssets(xs => xs.filter(x => x.path !== asset.path)); setMsg('تم حذف الملف وتحرير مساحته.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'تعذر حذف الملف.'); }
  }

  function formatBytes(bytes:number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024*1024) return `${(bytes/1024).toFixed(1)} KB`;
    return `${(bytes/(1024*1024)).toFixed(2)} MB`;
  }

  const componentOptions = [
    ['home.hero','الرئيسية / القسم الرئيسي','العنوان والوصف والأزرار'],
    ['home.categories','الرئيسية / التصنيفات','شبكة التصنيفات'],
    ['home.featured','الرئيسية / أحدث الكورسات','شبكة الكورسات'],
    ['categories.header','التصنيفات / العنوان','عنوان صفحة التصنيفات'],
    ['categories.grid','التصنيفات / الشبكة','بطاقات التصنيفات'],
    ['global.header','عام / الهيدر','الهيدر والتنقل'],
    ['global.footer','عام / الفوتر','الفوتر'],
  ] as const;
  function updateComponent(key:string, patch:Partial<import('../types').ComponentStyle>){
    setSettings(s=>({ ...s, component_editor: { ...s.component_editor, [key]: { ...s.component_editor[key], ...patch } } }));
  }
  function resetComponent(key:string){
    if(!confirm('إرجاع إعدادات هذا العنصر للوضع الافتراضي؟')) return;
    setSettings(s=>({ ...s, component_editor: { ...s.component_editor, [key]: { ...defaultSiteSettings.component_editor[key] } } }));
  }

  function resetDesign(){ if(!confirm('إرجاع إعدادات الألوان والخط والشكل للقيم الافتراضية؟'))return; setSettings(s=>({...s,font_family:defaultSiteSettings.font_family,light_bg:defaultSiteSettings.light_bg,light_surface:defaultSiteSettings.light_surface,light_text:defaultSiteSettings.light_text,light_muted:defaultSiteSettings.light_muted,light_border:defaultSiteSettings.light_border,light_accent:defaultSiteSettings.light_accent,light_accent_soft:defaultSiteSettings.light_accent_soft,dark_bg:defaultSiteSettings.dark_bg,dark_surface:defaultSiteSettings.dark_surface,dark_text:defaultSiteSettings.dark_text,dark_muted:defaultSiteSettings.dark_muted,dark_border:defaultSiteSettings.dark_border,dark_accent:defaultSiteSettings.dark_accent,dark_accent_soft:defaultSiteSettings.dark_accent_soft,ui_radius:defaultSiteSettings.ui_radius,ui_shadow:defaultSiteSettings.ui_shadow,ui_controls:defaultSiteSettings.ui_controls,custom_css:''})); setMsg('تم تجهيز القيم الافتراضية. اضغط حفظ لتطبيقها.'); }


  const lessonsCount = useMemo(()=>courses.reduce((n,c)=>n+(c.lessons?.length??0),0),[courses]);
  const averageCompletion = useMemo(()=>students.length?Math.round(students.reduce((n,s)=>n+s.completion_percent,0)/students.length):0,[students]);
  const activeStudents = useMemo(()=>students.filter(s=>s.completed_lessons>0).length,[students]);

  if (error && !profile) return <div className="container section"><div className="surface empty"><h1>لوحة الإدارة</h1><p className="error">{error}</p><Link className="btn btn-primary" to="/">العودة للرئيسية</Link></div></div>;

  return <section className="section"><div className="container">
    <div className="section-head"><div><span className="tag">Admin</span><h1 className="section-title">لوحة التحكم</h1><p className="muted">مرحبًا {profile?.full_name||'Admin'} — إدارة المنصة من مكان واحد.</p></div><Link className="btn btn-primary" to="/admin/courses/new">إضافة كورس</Link></div>
    <div className="admin-tabs" role="tablist" aria-label="أقسام لوحة الإدارة">
      <button type="button" role="tab" aria-selected={tab==='overview'} className={tab==='overview'?'active':''} onClick={()=>setTab('overview')}><LayoutDashboard size={17}/> نظرة عامة</button>
      <button type="button" role="tab" aria-selected={tab==='content'} className={tab==='content'?'active':''} onClick={()=>setTab('content')}><Settings size={17}/> إعدادات الموقع</button>
      <button type="button" role="tab" aria-selected={tab==='visual'} className={tab==='visual'?'active':''} onClick={()=>setTab('visual')}><Settings size={17}/> المحرر البصري</button>
      <button type="button" role="tab" aria-selected={tab==='assets'} className={tab==='assets'?'active':''} onClick={()=>{setTab('assets');loadAssets();}}><Images size={17}/> مدير الملفات</button>
      <button type="button" role="tab" aria-selected={tab==='students'} className={tab==='students'?'active':''} onClick={()=>setTab('students')}><UsersRound size={17}/> مراقبة الطلاب</button>
      <button type="button" role="tab" aria-selected={tab==='support'} className={tab==='support'?'active':''} onClick={()=>{setTab('support');loadSupportInbox();}}><MessageCircle size={17}/> دعم الطلاب</button>
    </div>
    {error&&<div className="error" style={{marginBottom:12}}>{error}</div>}{msg&&<div className="notice" style={{marginBottom:12}}>{msg}</div>}

    {tab==='overview'&&<>
      <div className="grid admin-stats"><div className="surface stat"><span className="muted">الطلاب المسجلون</span><strong>{students.length}</strong></div><div className="surface stat"><span className="muted">الكورسات</span><strong>{courses.length}</strong></div><div className="surface stat"><span className="muted">الدروس</span><strong>{lessonsCount}</strong></div><div className="surface stat"><span className="muted">متوسط تقدم الطلاب</span><strong>{averageCompletion}%</strong></div></div>
      <div className="admin-columns"><div className="surface table-wrap"><div className="admin-panel-head"><div><h2>الكورسات</h2><p className="muted">إضافة، تعديل، نشر أو إخفاء وحذف.</p></div></div><table className="table"><thead><tr><th>الكورس</th><th>الحالة</th><th>الدروس</th><th>إجراء</th></tr></thead><tbody>{courses.map(c=><tr key={c.id}><td><strong>{c.title}</strong><div className="muted small">{c.category?.name||'بدون تصنيف'}</div></td><td><button className="status-button" onClick={()=>togglePublished(c)}>{c.published?'منشور':'مخفي'}</button></td><td>{c.lessons?.length??0}</td><td><div className="rtl-row"><Link className="btn btn-ghost" to={`/admin/courses/${c.id}/edit`}>تعديل</Link><button className="btn btn-danger" onClick={()=>removeCourse(c)}>حذف</button></div></td></tr>)}</tbody></table>{!courses.length&&<div className="empty">لا توجد كورسات بعد.</div>}</div>
        <div className="grid" style={{gap:18}}><div className="surface admin-panel"><div className="admin-panel-head"><div><h2>التصنيفات</h2><p className="muted">تحكم سريع في المجالات.</p></div></div><form className="rtl-row" onSubmit={addCategory}><input className="input" value={newCat} onChange={e=>setNewCat(e.target.value)} placeholder="اسم التصنيف" required/><button className="btn btn-primary">إضافة</button></form><div className="admin-list">{cats.map(c=><div className="admin-list-row" key={c.id}><strong>{c.name}</strong><div className="rtl-row"><button className="btn btn-ghost" onClick={()=>editCategory(c)}>تعديل</button><button className="btn btn-danger" onClick={()=>removeCategory(c)}>حذف</button></div></div>)}</div></div>
          <div className="surface admin-panel"><div className="admin-panel-head"><div><h2>المستخدمون</h2><p className="muted">الحسابات المسجلة وصلاحياتها. الطلاب فقط: {students.length}</p></div></div><div className="admin-list">{users.slice(0,12).map(u=><div className="admin-list-row" key={u.id}><div><strong>{u.full_name||'بدون اسم'}</strong><div className="muted small">{u.role==='admin'?'مدير':'طالب'}</div></div><div className="rtl-row"><span className="tag">{u.role}</span><button type="button" className="btn btn-ghost" onClick={()=>openStudentDetails(u.id)} disabled={studentDetailsLoading}>عرض الملف</button>{u.id!==profile?.id&&<button className="btn btn-ghost" onClick={()=>changeRole(u)}>{u.role==='admin'?'جعله طالبًا':'جعله مديرًا'}</button>}</div></div>)}</div>{users.length>12&&<p className="muted small">عرض أول 12 مستخدمًا.</p>}</div>
        </div></div>
    </>}

    {tab==='visual'&&<form className="surface form-grid visual-editor" style={{padding:24}} onSubmit={saveSettings}>
      <div className="component-editor">
        <div className="visual-editor-head"><div><span className="tag">V11 • Page / Component Editor</span><h2>محرر الصفحات والعناصر</h2><p className="muted">اختر الصفحة والعنصر ثم عدّل مكانه وحجمه وشكله. هذه التعديلات تخص واجهة المنصة وتُحفظ مع إعدادات الموقع.</p></div><div className="visual-editor-badge">Admin only</div></div>
        <div className="component-editor-layout">
          <aside className="visual-targets" aria-label="الصفحات والعناصر">{componentOptions.map(([key,title,desc])=><button type="button" key={key} className={`visual-target ${componentTarget===key?'active':''}`} onClick={()=>setComponentTarget(key)}><strong>{title}</strong><span>{desc}</span></button>)}</aside>
          <div className="visual-editor-panel">
            <h3>{componentOptions.find(x=>x[0]===componentTarget)?.[1] || 'العنصر'}</h3>
            <p className="muted small">التحكم يتم على العنصر نفسه، وليس على الكود. اترك القيمة كما هي إذا لم تكن تريد تغييرها.</p>
            {(() => { const c=settings.component_editor?.[componentTarget] || defaultSiteSettings.component_editor[componentTarget]; return <><label className="check"><input type="checkbox" checked={c.visible!==false} onChange={e=>updateComponent(componentTarget,{visible:e.target.checked})}/> إظهار العنصر</label>
              <div className="two-col">
                {[['offset_x','تحريك أفقي'],['offset_y','تحريك رأسي'],['width','العرض'],['height','الارتفاع'],['scale','الحجم / Scale'],['font_size','حجم الخط'],['icon_size','حجم الأيقونة'],['gap','المسافة بين العناصر'],['padding','الحشو الداخلي'],['border_radius','نصف قطر الحواف'],['shadow','الظل']].map(([key,label])=><div key={key}><label className="label">{label}</label><input className="input" value={(c as any)[key] ?? ''} onChange={e=>updateComponent(componentTarget,{[key]:e.target.value} as any)} placeholder={String((defaultSiteSettings.component_editor[componentTarget] as any)?.[key] ?? '')}/></div>)}
              </div>
              <div className="component-editor-actions"><button type="button" className="btn btn-ghost" onClick={()=>resetComponent(componentTarget)}>إرجاع هذا العنصر</button><span className="muted small">المعاينة الحية تتأثر بعد الحفظ وإعادة تحميل الصفحة.</span></div>
            </> })()}
          </div>
        </div>
      </div>

      <div className="visual-editor-head"><div><span className="tag">V9 • Admin only</span><h2>المحرر البصري</h2><p className="muted">غيّر شكل العناصر الأساسية من لوحة الإدارة بدون تعديل الكود. التغييرات تُحفظ داخل إعدادات الموقع وتظهر على المنصة.</p></div><div className="visual-editor-badge">Design System</div></div>
      <div className="visual-editor-layout">
        <aside className="visual-targets" aria-label="العناصر القابلة للتعديل">
          {[
            ['header','الهيدر','اللوجو والقائمة وأدوات المظهر'],
            ['hero','القسم الرئيسي','العنوان والوصف ومساحة البداية'],
            ['cards','الكروت','الحجم والحركة ونصف القطر'],
            ['categories','التصنيفات','الأيقونة والحشو والحركة'],
            ['buttons','الأزرار','الارتفاع ونصف القطر وحجم الأيقونة'],
            ['footer','الفوتر','المسافات وارتفاع المساحة'],
          ].map(([key,title,desc])=><button type="button" key={key} className={`visual-target ${visualTarget===key?'active':''}`} onClick={()=>setVisualTarget(key)}><strong>{title}</strong><span>{desc}</span></button>)}
        </aside>
        <div className="visual-editor-panel">
          {visualTarget==='header'&&<>
            <h3>الهيدر</h3><p className="muted small">تحكم في الحجم والمسافات ومكان اللوجو وأدوات الهيدر.</p>
            <div className="two-col">{[
              ['header_height','ارتفاع الهيدر'],['header_logo_size','حجم اللوجو'],['header_gap','المسافة بين عناصر الهيدر'],['nav_gap','المسافة بين روابط القائمة'],['header_logo_offset_x','تحريك اللوجو أفقيًا'],['header_actions_offset_x','تحريك أدوات الهيدر أفقيًا']
            ].map(([key,label])=><div key={key}><label className="label">{label}</label><input className="input" value={(settings.ui_controls as any)[key]??''} onChange={e=>setSettings({...settings,ui_controls:{...settings.ui_controls,[key]:e.target.value}})} /></div>)}</div>
          </>}
          {visualTarget==='hero'&&<><h3>القسم الرئيسي</h3><p className="muted small">تعديل حجم العنوان والوصف ومكان القسم.</p><div className="two-col">{[['hero_title_size','حجم العنوان'],['hero_description_size','حجم الوصف'],['hero_offset_y','تحريك القسم رأسيًا'],['section_padding','مسافات القسم']].map(([key,label])=><div key={key}><label className="label">{label}</label><input className="input" value={(settings.ui_controls as any)[key]??''} onChange={e=>setSettings({...settings,ui_controls:{...settings.ui_controls,[key]:e.target.value}})} /></div>)}</div></>}
          {visualTarget==='cards'&&<><h3>الكروت</h3><p className="muted small">تحكم في شكل الكروت وحجمها ومكانها بدون تغيير محتوى الكورس.</p><div className="two-col">{[['card_radius','نصف قطر الكارت'],['card_padding','حشو الكارت'],['card_offset_x','تحريك الكروت أفقيًا'],['cards_offset_y','تحريك الكروت رأسيًا'],['card_scale','تكبير/تصغير الكارت'],['section_gap','المسافة بين الكروت']].map(([key,label])=><div key={key}><label className="label">{label}</label><input className="input" value={(settings.ui_controls as any)[key]??''} onChange={e=>setSettings({...settings,ui_controls:{...settings.ui_controls,[key]:e.target.value}})} /></div>)}</div></>}
          {visualTarget==='categories'&&<><h3>التصنيفات</h3><p className="muted small">تحكم في أيقونات التصنيفات وحشو البطاقات ومكان الأيقونة.</p><div className="two-col">{[['category_icon_size','حجم الأيقونة'],['category_icon_offset_x','تحريك الأيقونة أفقيًا'],['category_icon_offset_y','تحريك الأيقونة رأسيًا'],['category_card_padding','حشو بطاقة التصنيف']].map(([key,label])=><div key={key}><label className="label">{label}</label><input className="input" value={(settings.ui_controls as any)[key]??''} onChange={e=>setSettings({...settings,ui_controls:{...settings.ui_controls,[key]:e.target.value}})} /></div>)}</div></>}
          {visualTarget==='buttons'&&<><h3>الأزرار</h3><p className="muted small">نظام موحّد للأزرار الأساسية وأيقوناتها.</p><div className="two-col">{[['button_height','ارتفاع الزر'],['button_radius','نصف قطر الزر'],['button_icon_size','حجم أيقونة الزر'],['icon_size','حجم الأيقونات العامة']].map(([key,label])=><div key={key}><label className="label">{label}</label><input className="input" value={(settings.ui_controls as any)[key]??''} onChange={e=>setSettings({...settings,ui_controls:{...settings.ui_controls,[key]:e.target.value}})} /></div>)}</div></>}
          {visualTarget==='footer'&&<><h3>الفوتر</h3><p className="muted small">تحكم في المسافات والمساحة حول الفوتر.</p><div className="two-col">{[['footer_padding','حشو الفوتر'],['footer_margin_top','المسافة قبل الفوتر']].map(([key,label])=><div key={key}><label className="label">{label}</label><input className="input" value={(settings.ui_controls as any)[key]??''} onChange={e=>setSettings({...settings,ui_controls:{...settings.ui_controls,[key]:e.target.value}})} /></div>)}</div></>}
          <div className="visual-preview"><div><strong>معاينة سريعة</strong><span className="muted small">التغيير يطبق مباشرة على الواجهة بعد الحفظ أو عند تحديث الإعدادات.</span></div><div className="visual-preview-row"><div className="preview-logo"></div><div className="preview-lines"><i></i><i></i><i></i></div><button type="button" className="btn btn-primary">زر</button></div></div>
        </div>
      </div>
      <div className="settings-actions"><button className="btn btn-primary save-settings-btn" disabled={savingSettings}>{savingSettings ? 'جاري الحفظ...' : 'حفظ تعديلات المحرر'}</button><button type="button" className="btn btn-ghost" onClick={resetDesign} disabled={savingSettings}>إرجاع الافتراضي</button>{savedAt&&<span className="save-confirm" role="status">✓ تم الحفظ الساعة {savedAt}</span>}</div>
    </form>}

    {tab==='content'&&<form className="surface form-grid" style={{padding:24}} onSubmit={saveSettings}>
      <div className="admin-form-note"><strong>إدارة كاملة للمظهر والمحتوى الظاهر للزائر</strong><span className="muted">غير اللوجو والنصوص والأقسام من هنا، بدون تعديل الكود.</span></div>
      <div className="settings-block"><h2>الهوية</h2><div className="two-col"><div><label className="label">اسم المنصة</label><input className="input" value={settings.brand_name} onChange={e=>setSettings({...settings,brand_name:e.target.value})}/></div><div><label className="label">رفع اللوجو من جهازك</label><input className="input" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogoUpload} disabled={uploadingLogo}/><div className="muted small" style={{marginTop:6}}>{uploadingLogo?'جاري رفع اللوجو...':'حتى 4MB — ثم اضغط حفظ'}</div></div></div><div className="logo-preview-row"><div className="logo-preview-box">{settings.logo_url?<img src={settings.logo_url} alt="معاينة اللوجو"/>:<span>لا يوجد لوجو</span>}</div><div><div className="muted small">رابط اللوجو الحالي</div><div className="small" style={{wordBreak:'break-all'}}>{settings.logo_url||'—'}</div></div></div></div>
      <div className="settings-block"><h2>الهيدر والشريط العلوي</h2><div className="two-col"><div><label className="label">نص الشريط العلوي</label><input className="input" value={settings.announcement} onChange={e=>setSettings({...settings,announcement:e.target.value})} placeholder="اتركه فارغًا لإخفائه"/></div><div className="check-row"><label className="check"><input type="checkbox" checked={settings.show_categories} onChange={e=>setSettings({...settings,show_categories:e.target.checked})}/> عرض التصنيفات في الرئيسية</label><label className="check"><input type="checkbox" checked={settings.show_featured} onChange={e=>setSettings({...settings,show_featured:e.target.checked})}/> عرض أحدث الكورسات</label></div></div></div>
      <div className="settings-block"><h2>القسم الرئيسي</h2><div><label className="label">عنوان البطل</label><input className="input" value={settings.hero_badge} onChange={e=>setSettings({...settings,hero_badge:e.target.value})}/></div><div><label className="label">العنوان الرئيسي</label><textarea className="input" rows={3} value={settings.hero_title} onChange={e=>setSettings({...settings,hero_title:e.target.value})}/></div><div><label className="label">وصف الصفحة الرئيسية</label><textarea className="input" rows={4} value={settings.hero_description} onChange={e=>setSettings({...settings,hero_description:e.target.value})}/></div><div className="two-col"><div><label className="label">زر أساسي</label><input className="input" value={settings.primary_cta_label} onChange={e=>setSettings({...settings,primary_cta_label:e.target.value})}/></div><div><label className="label">زر ثانوي</label><input className="input" value={settings.secondary_cta_label} onChange={e=>setSettings({...settings,secondary_cta_label:e.target.value})}/></div></div></div>
      <div className="settings-block"><h2>شاشة الزائر وتسجيل الدخول</h2><p className="muted" style={{margin:0}}>الزائر غير المسجل لن يرى أسماء الكورسات أو الدروس. هنا تتحكم في الجزء التعريفي والدعم الظاهر بجانب تسجيل الدخول.</p><div className="two-col"><div><label className="label">عنوان شاشة الدخول</label><input className="input" value={settings.public_welcome_title} onChange={e=>setSettings({...settings,public_welcome_title:e.target.value})}/></div><div><label className="label">اسم صاحب المنصة</label><input className="input" value={settings.instructor_name} onChange={e=>setSettings({...settings,instructor_name:e.target.value})}/></div></div><div className="two-col"><div><label className="label">وصف شاشة الدخول</label><textarea className="input" rows={3} value={settings.public_welcome_description} onChange={e=>setSettings({...settings,public_welcome_description:e.target.value})}/></div><div><label className="label">صفة صاحب المنصة</label><input className="input" value={settings.instructor_role} onChange={e=>setSettings({...settings,instructor_role:e.target.value})}/></div></div><div><label className="label">الصورة الشخصية لصاحب المنصة</label><input className="input" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleInstructorUpload} disabled={uploadingInstructor}/><div className="muted small" style={{marginTop:6}}>{uploadingInstructor?'جاري رفع الصورة...':'حتى 4MB — الصورة اختيارية ويمكن تغييرها لاحقًا'}</div>{settings.instructor_image_url&&<img className="admin-image-preview" src={settings.instructor_image_url} alt="معاينة الصورة الشخصية لصاحب المنصة"/>}</div><div className="two-col"><div><label className="label">عنوان الدعم</label><input className="input" value={settings.support_title} onChange={e=>setSettings({...settings,support_title:e.target.value})}/></div><div><label className="label">مواعيد الدعم</label><input className="input" value={settings.support_hours} onChange={e=>setSettings({...settings,support_hours:e.target.value})}/></div></div><div className="two-col"><div><label className="label">رقم الهاتف</label><input className="input" value={settings.support_phone} onChange={e=>setSettings({...settings,support_phone:e.target.value})} placeholder="اختياري"/></div><div><label className="label">رقم واتساب</label><input className="input" value={settings.support_whatsapp} onChange={e=>setSettings({...settings,support_whatsapp:e.target.value})} placeholder="مثال: 2010..."/></div></div><div><label className="label">بريد خدمة العملاء</label><input className="input" type="email" value={settings.support_email} onChange={e=>setSettings({...settings,support_email:e.target.value})} placeholder="اختياري"/></div></div>
      <div className="settings-block" style={{marginTop:16}}><h3 style={{marginTop:0}}>Retention للدعم</h3><p className="muted small">العداد يبدأ عند Resolve/Close، وليس عند آخر رسالة من الأدمن. القيمة 0 تعني عدم الحذف التلقائي.</p><div className="two-col"><div><label className="label">مدة الاحتفاظ بمحادثات الدعم (بالساعات)</label><select className="input" value={settings.support_retention_human_hours} onChange={e=>setSettings({...settings,support_retention_human_hours:Number(e.target.value)})}><option value={24}>24 ساعة</option><option value={48}>48 ساعة</option><option value={72}>72 ساعة</option><option value={168}>7 أيام</option><option value={336}>14 يومًا</option><option value={720}>30 يومًا</option><option value={0}>Never</option></select></div><div><label className="label">مدة احتفاظ محادثات AI (للمرحلة التالية)</label><select className="input" value={settings.support_retention_ai_hours} onChange={e=>setSettings({...settings,support_retention_ai_hours:Number(e.target.value)})}><option value={24}>24 ساعة</option><option value={48}>48 ساعة</option><option value={72}>72 ساعة</option><option value={168}>7 أيام</option><option value={336}>14 يومًا</option><option value={720}>30 يومًا</option><option value={0}>Never</option></select></div></div></div>
      <div className="settings-block"><h2>التصنيفات والكورسات</h2><div className="two-col"><div><label className="label">عنوان التصنيفات</label><input className="input" value={settings.categories_title} onChange={e=>setSettings({...settings,categories_title:e.target.value})}/></div><div><label className="label">وصف التصنيفات</label><input className="input" value={settings.categories_description} onChange={e=>setSettings({...settings,categories_description:e.target.value})}/></div></div><div className="two-col"><div><label className="label">عنوان أحدث الكورسات</label><input className="input" value={settings.featured_title} onChange={e=>setSettings({...settings,featured_title:e.target.value})}/></div><div><label className="label">وصف أحدث الكورسات</label><input className="input" value={settings.featured_description} onChange={e=>setSettings({...settings,featured_description:e.target.value})}/></div></div><div><label className="label">نص الفوتر</label><input className="input" value={settings.footer_text} onChange={e=>setSettings({...settings,footer_text:e.target.value})}/></div></div>
      <div className="settings-block design-control-center"><div className="section-head" style={{marginBottom:12}}><div><h2 style={{margin:0}}>مركز التحكم في المظهر</h2><p className="muted" style={{margin:'4px 0 0'}}>تحكم في الألوان والخط والصور وشكل الواجهة من غير كود.</p></div><button type="button" className="btn btn-ghost" onClick={resetDesign}>إرجاع الافتراضي</button></div><div className="settings-subtitle">ألوان المظهر الفاتح</div><div className="color-grid">{[['light_bg','الخلفية'],['light_surface','الأسطح'],['light_text','النص'],['light_muted','النص الثانوي'],['light_border','الحدود'],['light_accent','اللون الأساسي'],['light_accent_soft','خلفية اللون الأساسي']].map(([key,label])=><label className="color-control" key={key}><span>{label}</span><input type="color" value={(settings as any)[key]} onChange={e=>setSettings({...settings,[key]:e.target.value})}/><code>{(settings as any)[key]}</code></label>)}</div><div className="settings-subtitle">ألوان المظهر الداكن</div><div className="color-grid">{[['dark_bg','الخلفية'],['dark_surface','الأسطح'],['dark_text','النص'],['dark_muted','النص الثانوي'],['dark_border','الحدود'],['dark_accent','اللون الأساسي'],['dark_accent_soft','خلفية اللون الأساسي']].map(([key,label])=><label className="color-control" key={key}><span>{label}</span><input type="color" value={(settings as any)[key]} onChange={e=>setSettings({...settings,[key]:e.target.value})}/><code>{(settings as any)[key]}</code></label>)}</div><div className="two-col"><div><label className="label">الخط العام</label><select className="input" value={settings.font_family} onChange={e=>setSettings({...settings,font_family:e.target.value})}><option>Cairo</option><option>Tajawal</option><option>Noto Kufi Arabic</option><option>IBM Plex Sans Arabic</option><option>Readex Pro</option></select></div><div><label className="label">استدارة العناصر</label><input className="input" value={settings.ui_radius} onChange={e=>setSettings({...settings,ui_radius:e.target.value})} placeholder="20px"/></div></div><div><label className="label">الظل العام</label><input className="input" value={settings.ui_shadow} onChange={e=>setSettings({...settings,ui_shadow:e.target.value})} placeholder="0 18px 50px rgba(15,23,42,.12)"/></div>
      <div className="settings-subtitle">تحكم بصري متقدم — بدون كتابة CSS</div>
      <div className="ui-control-grid">
        {[
          ['container_width','أقصى عرض للمحتوى','مثال: 1120px'],
          ['header_height','ارتفاع الهيدر','مثال: 72px'],
          ['section_padding','مسافات الأقسام','مثال: 72px 0'],
          ['section_gap','المسافة بين العناصر','مثال: 18px'],
          ['card_padding','حشو الكروت','مثال: 20px'],
          ['button_height','ارتفاع الأزرار','مثال: 44px'],
          ['icon_size','الحجم العام للأيقونات','مثال: 20px'],
          ['button_icon_size','أيقونات الأزرار','مثال: 18px'],
          ['header_logo_size','حجم لوجو الهيدر','مثال: 36px'],
          ['header_gap','المسافة في الهيدر','مثال: 18px'],
          ['header_logo_offset_x','تحريك اللوجو أفقيًا','مثال: 0px أو 10px'],
          ['header_actions_offset_x','تحريك أدوات الهيدر','مثال: 0px أو -10px'],
          ['cards_offset_y','تحريك الكروت رأسيًا','مثال: 0px أو 8px'],
          ['category_icon_size','حجم أيقونة التصنيف','مثال: 28px'],
          ['footer_padding','مسافات الفوتر','مثال: 30px 0'],
        ].map(([key,label,placeholder])=><div key={key}><label className="label">{label}</label><input className="input" value={(settings.ui_controls as any)[key]} placeholder={placeholder} onChange={e=>setSettings({...settings,ui_controls:{...settings.ui_controls,[key]:e.target.value}})}/></div>)}
      </div>
      <p className="muted small">هذه الإعدادات تطبق مباشرة على العناصر الأساسية في المنصة. وللتعديلات غير القياسية يظل CSS المخصص متاحًا كطبقة متقدمة.</p>
      <div className="settings-subtitle">صور ولوجوهات شاشة الدخول</div><div className="asset-control-grid">{[['auth_background_image','صورة خلفية الشاشة'],['auth_visual_image','صورة المشهد / الكتب'],['auth_logo_light','لوجو المظهر الفاتح'],['auth_logo_dark','لوجو المظهر الداكن']].map(([key,label])=><div className="asset-control" key={key}><strong>{label}</strong><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={e=>handleDesignAsset(e,key as any)}/><span className="small muted">حتى 8MB</span>{(settings as any)[key]&&<div className="asset-preview-row"><img src={(settings as any)[key]} alt=""/><button type="button" className="btn btn-danger" onClick={()=>setSettings({...settings,[key]:''})}>إزالة</button></div>}</div>)}</div><div><label className="label">CSS مخصص — تحكم كامل متقدم</label><textarea className="input custom-css-editor" rows={9} dir="ltr" spellCheck={false} value={settings.custom_css} onChange={e=>setSettings({...settings,custom_css:e.target.value})} placeholder="/* مثال: .auth-side { ... } */"/><p className="muted small" style={{margin:'6px 0 0'}}>أي CSS تكتبه هنا يُطبق على المنصة بعد الحفظ.</p></div></div>
      <div className="settings-block"><div className="section-head" style={{marginBottom:12}}><div><h2 style={{margin:0}}>إضافاتك للصفحة الرئيسية</h2><p className="muted" style={{margin:'4px 0 0'}}>أنشئ أقسامًا إضافية بدون كود.</p></div><button type="button" className="btn btn-ghost" onClick={addExtra}>+ إضافة قسم</button></div>{settings.extra_sections.length===0&&<div className="empty compact">لا توجد أقسام إضافية. اضغط «إضافة قسم» لإنشاء قسم جديد.</div>}{settings.extra_sections.map((x,i)=><div className="extra-editor" key={i}><div className="rtl-row" style={{justifyContent:'space-between'}}><label className="check"><input type="checkbox" checked={x.enabled} onChange={e=>updateExtra(i,{enabled:e.target.checked})}/> عرض هذا القسم</label><button type="button" className="btn btn-danger" onClick={()=>removeExtra(i)}>حذف القسم</button></div><div className="two-col"><div><label className="label">عنوان القسم</label><input className="input" value={x.title} onChange={e=>updateExtra(i,{title:e.target.value})}/></div><div><label className="label">نص الزر</label><input className="input" value={x.button_label} onChange={e=>updateExtra(i,{button_label:e.target.value})}/></div></div><div><label className="label">الوصف</label><textarea className="input" rows={3} value={x.description} onChange={e=>updateExtra(i,{description:e.target.value})}/></div><div><label className="label">رابط الزر</label><input className="input" value={x.button_url} onChange={e=>updateExtra(i,{button_url:e.target.value})} placeholder="مثال: /courses أو https://..."/></div></div>)}</div>
      <div className="settings-actions"><button className="btn btn-primary save-settings-btn" disabled={uploadingLogo || uploadingInstructor || savingSettings}>{savingSettings ? 'جاري الحفظ...' : 'حفظ كل إعدادات الموقع'}</button>{savedAt&&<span className="save-confirm" role="status">✓ تم الحفظ الساعة {savedAt}</span>}<span className="muted small">التغييرات تُطبّق فورًا على الواجهة الحالية، وتُحفظ في قاعدة البيانات.</span></div>
    </form>}

    {tab==='assets'&&<div className="surface asset-manager" style={{padding:24}}>
      <div className="visual-editor-head">
        <div><span className="tag">V10 • Admin only</span><h2>مدير الملفات</h2><p className="muted">إدارة صور المنصة من مكان واحد. الملفات تُحفظ في Supabase Storage ولا تحتاج إلى رفع ملفات المشروع إلى GitHub.</p></div>
        <div className="visual-editor-badge"><HardDrive size={17}/> Storage</div>
      </div>
      <div className="asset-manager-toolbar">
        <label className="btn btn-primary"><Upload size={17}/> {assetUploading?'جاري الرفع...':'رفع صورة'}<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleManagedAssetUpload} disabled={assetUploading} hidden /></label>
        <button type="button" className="btn btn-ghost" onClick={loadAssets} disabled={assetsLoading}><RefreshCw size={17}/> {t('support.refresh')}</button>
        <div className="storage-summary"><HardDrive size={18}/><div><strong>{formatBytes(assets.reduce((n,a)=>n+a.size,0))}</strong><span className="muted"> إجمالي الملفات المحمّلة حاليًا</span></div><small className="muted">هذا تقدير للملفات الظاهرة في Storage وليس حد الخطة.</small></div>
      </div>
      {assetsLoading&&<div className="empty">جاري تحميل الملفات...</div>}
      {!assetsLoading&&!assets.length&&<div className="empty">لا توجد صور قابلة للإدارة حاليًا.</div>}
      {!assetsLoading&&assets.length>0&&<div className="asset-manager-grid">{assets.map(asset=>{const current=[settings.logo_url,settings.instructor_image_url,settings.auth_background_image,settings.auth_visual_image,settings.auth_logo_light,settings.auth_logo_dark].includes(asset.url);return <article className="asset-card" key={asset.path}>
        <div className="asset-card-media"><img src={asset.url} alt={asset.name}/>{current&&<span className="asset-current">مستخدم حاليًا</span>}</div>
        <div className="asset-card-body"><strong title={asset.name}>{asset.name}</strong><span className="muted small">{asset.folder} • {formatBytes(asset.size)}</span><span className="muted small">{asset.created_at?new Date(asset.created_at).toLocaleDateString('ar-EG'):'—'}</span></div>
        <div className="asset-card-actions"><a className="btn btn-ghost btn-small" href={asset.url} target="_blank" rel="noreferrer">فتح</a><button type="button" className="btn btn-danger btn-small" onClick={()=>handleAssetDelete(asset)} disabled={current}><Trash2 size={15}/> حذف</button></div>
      </article>})}</div>}
      <div className="notice" style={{marginTop:16}}>💡 حذف الملفات القديمة غير المستخدمة يساعدك على عدم استهلاك مساحة Storage بلا داعٍ. الملفات المستخدمة حاليًا محمية من الحذف حتى تغيّرها أولًا.</div>
    </div>}

    {tab==='support'&&<div className="support-inbox-grid">
      <div className="surface support-inbox-list">
        <div className="admin-panel-head"><div><h2>{t('support.inbox')}</h2><p className="muted">{t('support.inboxDesc')}</p></div><button type="button" className="btn btn-ghost btn-small" onClick={loadSupportInbox} disabled={supportLoading}><RefreshCw size={15}/> {t('support.refresh')}</button></div>
        {supportLoading&&<div className="empty compact">{t('support.loading')}</div>}
        {!supportLoading&&!supportConversations.length&&<div className="empty compact">{t('support.empty')}</div>}
        {!supportLoading&&supportConversations.map(conversation=>{const student=users.find(user=>user.id===conversation.student_id);return <button type="button" className={`support-conversation-row ${selectedConversation?.id===conversation.id?'active':''}`} key={conversation.id} onClick={()=>openSupportConversation(conversation)}><div><strong>{student?.full_name||t('support.student')}</strong><span className="muted small">{conversation.priority} • {conversation.status}</span></div><div className="small muted">{conversation.last_message_at?new Date(conversation.last_message_at).toLocaleString('ar-EG'):'—'}</div></button>})}
      </div>
      <div className="surface support-conversation-view">
        {!selectedConversation?<div className="empty"><MessageCircle size={30}/><h3>{t('support.select')}</h3><p className="muted">{t('support.selectDesc')}</p></div>:<>
          <div className="support-view-head"><div><span className="tag">{selectedConversation.status}</span><h2>{users.find(user=>user.id===selectedConversation.student_id)?.full_name||t('support.student')}</h2><p className="muted">{selectedConversation.priority} • {t('support.created')}: {new Date(selectedConversation.created_at).toLocaleString('ar-EG')}</p></div><div className="rtl-row">{selectedConversation.status==='WAITING_FOR_HUMAN'&&<button type="button" className="btn btn-primary" onClick={()=>acceptConversation(selectedConversation)} disabled={supportActionLoading}><CheckCircle2 size={16}/> {t('support.accept')}</button>}{!['RESOLVED','CLOSED'].includes(selectedConversation.status)&&<button type="button" className="btn btn-ghost" onClick={()=>changeConversationStatus('RESOLVED')} disabled={supportActionLoading}>{t('support.resolve')}</button>}{selectedConversation.status==='RESOLVED'&&<button type="button" className="btn btn-ghost" onClick={()=>changeConversationStatus('CLOSED')} disabled={supportActionLoading}>{t('support.close')}</button>}{['RESOLVED','RETENTION_PENDING','CLOSED'].includes(selectedConversation.status)&&<button type="button" className="btn btn-ghost" onClick={()=>toggleRetentionExempt(selectedConversation)} disabled={supportActionLoading}>{selectedConversation.retention_exempt?t('support.unkeep'):t('support.keep')}</button>}</div></div>
          <div className="support-message-list">{conversationMessages.map(message=><div key={message.id} className={`support-message ${message.sender_role}` }><div className="support-message-meta">{message.sender_role} • {new Date(message.created_at).toLocaleString('ar-EG')}</div><div>{message.body}</div></div>)}{!conversationMessages.length&&<div className="empty compact">{t('support.noMessages')}</div>}</div>
          {!['RESOLVED','CLOSED'].includes(selectedConversation.status)&&<div className="support-reply-box"><textarea value={supportReply} onChange={e=>setSupportReply(e.target.value)} rows={3} placeholder={t('support.replyPlaceholder')}/><button type="button" className="btn btn-primary" onClick={replyToConversation} disabled={supportActionLoading||!supportReply.trim()}><Send size={16}/> {t('common.send')}</button></div>}
          {selectedConversation.auto_delete_at&&<div className="notice small">{t('support.retention').replace('{date}', new Date(selectedConversation.auto_delete_at).toLocaleString('ar-EG')).replace('{exempt}', selectedConversation.retention_exempt ? t('common.yes') : t('common.no'))}</div>}
        </>}
      </div>
    </div>}

    {tab==='students'&&<>
      <div className="grid admin-stats"><div className="surface stat"><span className="muted">إجمالي الطلاب</span><strong>{students.length}</strong></div><div className="surface stat"><span className="muted">طلاب بدأوا التعلم</span><strong>{activeStudents}</strong></div><div className="surface stat"><span className="muted">متوسط التقدم</span><strong>{averageCompletion}%</strong></div><div className="surface stat"><span className="muted">إجمالي المستخدمين</span><strong>{users.length}</strong></div></div>
      <div className="surface table-wrap"><div className="admin-panel-head"><div><h2>لوحة مراقبة الطلاب</h2><p className="muted">متابعة النشاط والتقدم وآخر إنجاز لكل طالب.</p></div></div><table className="table"><thead><tr><th>الطالب</th><th>تاريخ التسجيل</th><th>الدروس المكتملة</th><th>الكورسات التي بدأها</th><th>التقدم</th><th>آخر نشاط</th></tr></thead><tbody>{students.map(s=><tr key={s.user_id}><td><div className="student-name-cell"><strong>{s.full_name||'بدون اسم'}</strong><button type="button" className="btn btn-ghost btn-small" onClick={()=>openStudentDetails(s.user_id)} disabled={studentDetailsLoading}>عرض الملف</button></div></td><td>{new Date(s.created_at).toLocaleDateString('ar-EG')}</td><td>{s.completed_lessons}</td><td>{s.started_courses}</td><td><div className="progress-cell"><div className="progress-bar"><span style={{width:`${Math.min(100,Math.max(0,s.completion_percent))}%`}}/></div><strong>{s.completion_percent}%</strong></div></td><td>{s.last_completed_at?new Date(s.last_completed_at).toLocaleString('ar-EG'):'لم يبدأ بعد'}</td></tr>)}</tbody></table>{!students.length&&<div className="empty">لا يوجد طلاب مسجلون بعد.</div>}</div>
    </>}
    {selectedStudent && <div className="admin-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.currentTarget===e.target)setSelectedStudent(null);}}>
      <div className="admin-modal surface" role="dialog" aria-modal="true" aria-labelledby="student-profile-title">
        <div className="admin-modal-head">
          <div><span className="tag">ملف الطالب</span><h2 id="student-profile-title">{selectedStudent.full_name || 'بدون اسم'}</h2><p className="muted">عرض فقط — لا يمكن تعديل بيانات الطالب من هذه النافذة.</p></div>
          <button type="button" className="theme-toggle" onClick={()=>setSelectedStudent(null)} aria-label="إغلاق"><X size={19}/></button>
        </div>
        <div className="admin-student-profile-grid">
          <div className="admin-student-avatar">{selectedStudent.avatar_url ? <img src={selectedStudent.avatar_url} alt="" /> : <UserRound size={42}/>}</div>
          <div className="admin-student-fields">
            <div><span><Mail size={16}/> البريد الإلكتروني</span><strong>{selectedStudent.email || 'غير متاح'}</strong></div>
            <div><span><Phone size={16}/> رقم الهاتف</span><strong>{selectedStudent.phone || 'لم تتم إضافته'}</strong></div>
            <div><span><CalendarDays size={16}/> العمر</span><strong>{selectedStudent.age != null ? `${selectedStudent.age} سنة` : 'لم تتم إضافته'}</strong></div><div><span>📝 النبذة</span><strong>{selectedStudent.bio || 'لم تتم إضافتها'}</strong></div>
            <div><span><ShieldCheck size={16}/> الصلاحية</span><strong>{selectedStudent.role === 'admin' ? 'مدير' : 'طالب'}</strong></div>
            <div><span>تاريخ التسجيل</span><strong>{new Date(selectedStudent.created_at).toLocaleString('ar-EG')}</strong></div>
            <div><span><BookOpenCheck size={16}/> الدروس المكتملة</span><strong>{selectedStudent.completed_lessons}</strong></div>
            <div><span>الكورسات التي بدأها</span><strong>{selectedStudent.started_courses}</strong></div>
            <div><span>نسبة التقدم</span><strong>{selectedStudent.completion_percent}%</strong></div>
            <div><span>آخر نشاط</span><strong>{selectedStudent.last_completed_at ? new Date(selectedStudent.last_completed_at).toLocaleString('ar-EG') : 'لم يبدأ بعد'}</strong></div>
          </div>
        </div>
        <div className="admin-modal-note">🔒 كلمة المرور لا تظهر هنا ولا يتم جلبها أصلًا من قاعدة البيانات.</div>
      </div>
    </div>}
  </div></section>;
}
