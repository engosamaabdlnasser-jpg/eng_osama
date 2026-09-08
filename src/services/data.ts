import { supabase } from '../lib/supabase';
import type { Category, Course, Lesson, Profile } from '../types';

export const demoCategories: Category[] = [
  { id: '1', name: 'برمجة' }, { id: '2', name: 'ذكاء اصطناعي' },
  { id: '3', name: 'تصميم' }, { id: '4', name: 'مونتاج' }, { id: '5', name: 'تسويق' },
];

export const demoCourses: Course[] = [
  { id: 'demo-1', title: 'أساسيات البرمجة للمبتدئين', description: 'ابدأ من الصفر وتعلم التفكير البرمجي بطريقة عملية ومنظمة.', image_url: null, category_id: '1', instructor_name: 'ENG OSAMA', published: true, lessons: [{ id: 'l1', course_id: 'demo-1', title: 'مقدمة في البرمجة', description: 'نظرة عامة على المفاهيم الأساسية.', youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', sort_order: 1 }] },
  { id: 'demo-2', title: 'مدخل إلى الذكاء الاصطناعي', description: 'فهم مبسط للمفاهيم التي تقف خلف أدوات الذكاء الاصطناعي الحديثة.', image_url: null, category_id: '2', instructor_name: 'ENG OSAMA', published: true, lessons: [] },
];

export async function getCourses(): Promise<Course[]> {
  if (!supabase) return demoCourses;
  const { data, error } = await supabase.from('courses').select('*,category:categories(*),lessons(*)').eq('published', true).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Course[];
}

export async function getAllCourses(): Promise<Course[]> {
  if (!supabase) return demoCourses;
  const { data, error } = await supabase.from('courses').select('*,category:categories(*),lessons(*)').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Course[];
}

export async function getCourse(id: string): Promise<Course | null> {
  if (!supabase) return demoCourses.find(c => c.id === id) ?? null;
  const { data, error } = await supabase.from('courses').select('*,category:categories(*),lessons(*)').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Course | null;
}

export async function getCategories(): Promise<Category[]> {
  if (!supabase) return demoCategories;
  const { data, error } = await supabase.from('categories').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getProfile(id: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function getAdminProfiles(): Promise<Profile[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function createCategory(name: string) {
  if (!supabase) throw new Error('Supabase غير مربوط.');
  const { data, error } = await supabase.from('categories').insert({ name: name.trim() }).select().single();
  if (error) throw error;
  return data as Category;
}

export async function renameCategory(id: string, name: string) {
  if (!supabase) throw new Error('Supabase غير مربوط.');
  const { data, error } = await supabase.from('categories').update({ name: name.trim() }).eq('id', id).select().single();
  if (error) throw error;
  return data as Category;
}

export async function setUserRole(id: string, role: 'student' | 'admin') {
  if (!supabase) throw new Error('Supabase غير مربوط.');
  const { data, error } = await supabase.from('profiles').update({ role }).eq('id', id).select().single();
  if (error) throw error;
  return data as Profile;
}

export async function deleteCategory(id: string) {
  if (!supabase) throw new Error('Supabase غير مربوط.');
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

export async function markLessonComplete(userId: string, lessonId: string) {
  if (!supabase) return;
  const { error } = await supabase.from('progress').upsert({ user_id: userId, lesson_id: lessonId }, { onConflict: 'user_id,lesson_id' });
  if (error) throw error;
}

export async function getCompleted(userId: string) {
  if (!supabase) return new Set<string>();
  const { data, error } = await supabase.from('progress').select('lesson_id').eq('user_id', userId);
  if (error) throw error;
  return new Set((data ?? []).map(x => x.lesson_id));
}
