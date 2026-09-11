import { supabase } from '../lib/supabase';
import type { Category, Course, Lesson, Profile, SiteSettings, StudentMonitorRow, AdminStudentDetails } from '../types';
import { DEMO_MODE } from '../utils/app';

export const demoCategories: Category[] = [
  { id: '1', name: 'برمجة' }, { id: '2', name: 'ذكاء اصطناعي' },
  { id: '3', name: 'تصميم' }, { id: '4', name: 'مونتاج' }, { id: '5', name: 'تسويق' },
];

export const demoCourses: Course[] = [
  { id: 'demo-1', title: 'أساسيات البرمجة للمبتدئين', description: 'ابدأ من الصفر وتعلم التفكير البرمجي بطريقة عملية ومنظمة.', image_url: null, category_id: '1', instructor_name: 'ENG OSAMA', published: true, lessons: [{ id: 'l1', course_id: 'demo-1', title: 'مقدمة في البرمجة', description: 'نظرة عامة على المفاهيم الأساسية.', youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', sort_order: 1 }] },
  { id: 'demo-2', title: 'مدخل إلى الذكاء الاصطناعي', description: 'فهم مبسط للمفاهيم التي تقف خلف أدوات الذكاء الاصطناعي الحديثة.', image_url: null, category_id: '2', instructor_name: 'ENG OSAMA', published: true, lessons: [] },
];

export const defaultSiteSettings: SiteSettings = {
  brand_name: 'ENG OSAMA',
  logo_url: '/logo.png',
  hero_badge: 'منصة تعليمية مجانية',
  hero_title: 'اتعلم مهارات جديدة بخطوات واضحة.',
  hero_description: 'كورسات مرتبة، دروس عملية، وتجربة تعلم هادئة تساعدك تبدأ وتكمل بدون تعقيد.',
  primary_cta_label: 'استكشف الكورسات',
  secondary_cta_label: 'تصفح التصنيفات',
  featured_title: 'أحدث الكورسات',
  featured_description: 'محتوى مرتب لتبدأ مباشرة.',
  categories_title: 'التصنيفات',
  categories_description: 'اختر المجال الذي تريد تطويره.',
  footer_text: 'تعلم مجانًا، بخطوات واضحة.',
  announcement: '',
  show_categories: true,
  show_featured: true,
  extra_sections: [],
  public_welcome_title: 'أهلاً بيك في منصتك التعليمية',
  public_welcome_description: 'سجّل دخولك للوصول إلى الكورسات والدروس ومتابعة تقدمك خطوة بخطوة.',
  instructor_name: 'ENG OSAMA',
  instructor_role: 'منصة تعليمية',
  instructor_image_url: '',
  support_title: 'خدمة العملاء',
  support_phone: '',
  support_whatsapp: '',
  support_email: '',
  support_hours: 'متاحون لمساعدتك عند الحاجة',
  auth_background_image: '',
  auth_visual_image: '',
  auth_logo_light: '/eng-osama-logo-light.png',
  auth_logo_dark: '/eng-osama-logo-dark.png',
  font_family: 'Cairo',
  light_bg: '#f8fafc',
  light_surface: '#ffffff',
  light_text: '#0f172a',
  light_muted: '#64748b',
  light_border: '#e2e8f0',
  light_accent: '#0f766e',
  light_accent_soft: '#f0fdfa',
  dark_bg: '#0b1120',
  dark_surface: '#111827',
  dark_text: '#e5e7eb',
  dark_muted: '#94a3b8',
  dark_border: '#253246',
  dark_accent: '#d2a146',
  dark_accent_soft: '#2a2113',
  ui_radius: '20px',
  ui_shadow: '0 18px 50px rgba(15,23,42,.12)',
  ui_controls: {
    container_width: '1120px',
    header_height: '72px',
    section_padding: '72px 0',
    section_gap: '18px',
    card_padding: '20px',
    button_height: '44px',
    icon_size: '20px',
    button_icon_size: '18px',
    header_logo_size: '36px',
    header_gap: '18px',
    header_logo_offset_x: '0px',
    header_actions_offset_x: '0px',
    cards_offset_y: '0px',
    category_icon_size: '28px',
    footer_padding: '30px 0',
    hero_title_size: 'clamp(40px,7vw,72px)',
    hero_offset_y: '0px',
    hero_description_size: '18px',
    button_radius: '12px',
    card_radius: '20px',
    card_offset_x: '0px',
    card_scale: '1',
    category_icon_offset_x: '0px',
    category_icon_offset_y: '0px',
    category_card_padding: '20px',
    nav_gap: '18px',
    footer_margin_top: '40px',
    announcement_height: 'auto',
  },
  custom_css: '',
};

export async function getCourses(): Promise<Course[]> { if (!supabase) { if (DEMO_MODE) return demoCourses; throw new Error('قاعدة البيانات غير متصلة. تأكد من إعداد متغيرات Supabase.'); } const { data,error }=await supabase.from('courses').select('*,category:categories(*),lessons(*)').eq('published',true).order('created_at',{ascending:false}); if(error)throw error; return(data??[]) as Course[]; }
export async function getAllCourses(): Promise<Course[]> { if (!supabase) { if (DEMO_MODE) return demoCourses; throw new Error('قاعدة البيانات غير متصلة. تأكد من إعداد متغيرات Supabase.'); } const {data,error}=await supabase.from('courses').select('*,category:categories(*),lessons(*)').order('created_at',{ascending:false}); if(error)throw error; return(data??[]) as Course[]; }
export async function getCourse(id:string):Promise<Course|null>{ if(!supabase){if(DEMO_MODE)return demoCourses.find(c=>c.id===id)??null;throw new Error('قاعدة البيانات غير متصلة.');} const {data,error}=await supabase.from('courses').select('*,category:categories(*),lessons(*)').eq('id',id).maybeSingle();if(error)throw error;return data as Course|null; }
export async function getCategories():Promise<Category[]>{ if(!supabase){if(DEMO_MODE)return demoCategories;throw new Error('قاعدة البيانات غير متصلة.');}const {data,error}=await supabase.from('categories').select('*').order('name');if(error)throw error;return data??[]; }
export async function getProfile(id:string):Promise<Profile|null>{ if(!supabase){if(DEMO_MODE)return null;throw new Error('قاعدة البيانات غير متصلة.');}const {data,error}=await supabase.from('profiles').select('*').eq('id',id).maybeSingle();if(error)throw error;return data as Profile|null; }
export async function updateProfile(id:string,fullName:string){if(!supabase)throw new Error('Supabase غير مربوط.');const {data,error}=await supabase.from('profiles').update({full_name:fullName.trim()||null}).eq('id',id).select().single();if(error)throw error;return data as Profile;}
export async function getUserProgress(userId:string){if(!supabase)return {completedIds:new Set<string>(),completedAt:{} as Record<string,string>,lastCompletedAt:null as string|null};const {data,error}=await supabase.from('progress').select('lesson_id,completed_at').eq('user_id',userId).order('completed_at',{ascending:false});if(error)throw error;const completedIds=new Set<string>();const completedAt:Record<string,string>={};for(const row of data??[]){completedIds.add(row.lesson_id);if(row.completed_at)completedAt[row.lesson_id]=row.completed_at;}return {completedIds,completedAt,lastCompletedAt:data?.[0]?.completed_at??null};}
export async function getAdminProfiles():Promise<Profile[]>{ if(!supabase)return [];const {data,error}=await supabase.from('profiles').select('*').order('created_at',{ascending:false});if(error)throw error;return(data??[]) as Profile[]; }
export async function createCategory(name:string){if(!supabase)throw new Error('Supabase غير مربوط.');const {data,error}=await supabase.from('categories').insert({name:name.trim()}).select().single();if(error)throw error;return data as Category;}
export async function renameCategory(id:string,name:string){if(!supabase)throw new Error('Supabase غير مربوط.');const {data,error}=await supabase.from('categories').update({name:name.trim()}).eq('id',id).select().single();if(error)throw error;return data as Category;}
export async function setUserRole(id:string,role:'student'|'admin'){if(!supabase)throw new Error('Supabase غير مربوط.');const {data,error}=await supabase.rpc('admin_set_user_role',{target_user_id:id,new_role:role});if(error)throw error;const row=Array.isArray(data)?data[0]:data;if(!row)throw new Error('تعذر تحديث الصلاحية.');return row as Profile;}
export async function deleteCategory(id:string){if(!supabase)throw new Error('Supabase غير مربوط.');const {error}=await supabase.from('categories').delete().eq('id',id);if(error)throw error;}
export async function markLessonComplete(userId:string,lessonId:string){if(!supabase)return;const {error}=await supabase.from('progress').upsert({user_id:userId,lesson_id:lessonId},{onConflict:'user_id,lesson_id'});if(error)throw error;}
export async function getCompleted(userId:string){if(!supabase)return new Set<string>();const {data,error}=await supabase.from('progress').select('lesson_id').eq('user_id',userId);if(error)throw error;return new Set((data??[]).map(x=>x.lesson_id));}

export async function getSiteSettings(): Promise<SiteSettings> {
  if (!supabase) { if (DEMO_MODE) return defaultSiteSettings; throw new Error('قاعدة البيانات غير متصلة.'); }
  const { data, error } = await supabase.from('site_settings').select('settings').eq('id', 'default').maybeSingle();
  if (error) throw error;
  const raw = data?.settings ?? {};
  return {
    ...defaultSiteSettings,
    ...raw,
    extra_sections: Array.isArray(raw.extra_sections) ? raw.extra_sections : defaultSiteSettings.extra_sections,
    ui_controls: { ...defaultSiteSettings.ui_controls, ...(raw.ui_controls || {}) },
  } as SiteSettings;
}

export async function saveSiteSettings(settings: SiteSettings) {
  if (!supabase) throw new Error('Supabase غير مربوط.');
  const { data, error } = await supabase.from('site_settings').upsert({ id: 'default', settings, updated_at: new Date().toISOString() }, { onConflict: 'id' }).select().single();
  if (error) throw error;
  return data;
}

export async function uploadSiteAsset(file: File, slot: string) {
  if (!supabase) throw new Error('Supabase غير مربوط.');
  if (!file.type.startsWith('image/')) throw new Error('اختر ملف صورة فقط.');
  if (file.size > 8 * 1024 * 1024) throw new Error('حجم الصورة يجب ألا يتجاوز 8MB.');
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const safeSlot = slot.replace(/[^a-z0-9_-]/gi, '-');
  const path = `brand/${safeSlot}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('site-assets').upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type });
  if (error) throw error;
  return supabase.storage.from('site-assets').getPublicUrl(path).data.publicUrl;
}

export async function uploadSiteLogo(file: File) {
  if (!supabase) throw new Error('Supabase غير مربوط.');
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `brand/logo-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('site-assets').upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type || undefined });
  if (error) throw error;
  const { data } = supabase.storage.from('site-assets').getPublicUrl(path);
  return data.publicUrl;
}

export async function updateProfileDetails(id: string, fullName: string, avatarUrl: string | null, phone: string | null = null, age: number | null = null, profileSetupCompleted = true, bio: string | null = null) {
  if (!supabase) throw new Error('Supabase غير مربوط.');
  const normalizedPhone = phone?.trim() || null;
  const normalizedAge = age === null || age === undefined || Number.isNaN(age) ? null : age;
  const normalizedBio = bio?.trim() || null;
  const { data, error } = await supabase.from('profiles').update({ full_name: fullName.trim() || null, avatar_url: avatarUrl, phone: normalizedPhone, age: normalizedAge, bio: normalizedBio, profile_setup_completed: profileSetupCompleted }).eq('id', id).select().single();
  if (error) throw error;
  return data as Profile;
}


export async function uploadSiteInstructorImage(file: File) {
  if (!supabase) throw new Error('Supabase غير مربوط.');
  if (!file.type.startsWith('image/')) throw new Error('اختر ملف صورة فقط.');
  if (file.size > 4 * 1024 * 1024) throw new Error('حجم الصورة يجب ألا يتجاوز 4MB.');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `brand/instructor-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('site-assets').upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type });
  if (error) throw error;
  return supabase.storage.from('site-assets').getPublicUrl(path).data.publicUrl;
}

export async function uploadProfileAvatar(userId: string, file: File) {
  if (!supabase) throw new Error('Supabase غير مربوط.');
  if (!file.type.startsWith('image/')) throw new Error('اختار صورة فقط.');
  if (file.size > 2 * 1024 * 1024) throw new Error('حجم الصورة يجب ألا يتجاوز 2MB.');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `avatars/${userId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('site-assets').upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type });
  if (error) throw error;
  return supabase.storage.from('site-assets').getPublicUrl(path).data.publicUrl;
}

export async function uploadCourseImage(file: File) {
  if (!supabase) throw new Error('Supabase غير مربوط.');
  if (!file.type.startsWith('image/')) throw new Error('اختار صورة فقط.');
  if (file.size > 3 * 1024 * 1024) throw new Error('حجم صورة الكورس يجب ألا يتجاوز 3MB.');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `courses/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('site-assets').upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type });
  if (error) throw error;
  return supabase.storage.from('site-assets').getPublicUrl(path).data.publicUrl;
}

export async function getStudentMonitorData(): Promise<StudentMonitorRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('admin_student_monitor');
  if (error) throw error;
  return (data ?? []) as StudentMonitorRow[];
}

export async function getAdminStudentDetails(userId: string): Promise<AdminStudentDetails> {
  if (!supabase) throw new Error('Supabase غير مربوط.');
  const { data, error } = await supabase.rpc('admin_student_profile', { target_user_id: userId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('لم يتم العثور على بيانات الطالب.');
  return row as AdminStudentDetails;
}
