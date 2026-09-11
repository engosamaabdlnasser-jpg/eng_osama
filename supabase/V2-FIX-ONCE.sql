-- ENG OSAMA V2: one-time production database repair / upgrade
-- Safe to run more than once.

create table if not exists public.site_settings (
  id text primary key,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;
drop policy if exists "public read site settings" on public.site_settings;
create policy "public read site settings" on public.site_settings for select using (true);
drop policy if exists "admin manage site settings" on public.site_settings;
create policy "admin manage site settings" on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.site_settings(id, settings)
values ('default', jsonb_build_object(
  'brand_name','ENG OSAMA','logo_url','/logo.png','hero_badge','منصة تعليمية مجانية',
  'hero_title','اتعلم مهارات جديدة بخطوات واضحة.',
  'hero_description','كورسات مرتبة، دروس عملية، وتجربة تعلم هادئة تساعدك تبدأ وتكمل بدون تعقيد.',
  'primary_cta_label','استكشف الكورسات','secondary_cta_label','تصفح التصنيفات',
  'featured_title','أحدث الكورسات','featured_description','محتوى مرتب لتبدأ مباشرة.',
  'categories_title','التصنيفات','categories_description','اختر المجال الذي تريد تطويره.',
  'footer_text','تعلم مجانًا، بخطوات واضحة.','announcement','',
  'show_categories',true,'show_featured',true,'extra_sections','[]'::jsonb
)) on conflict(id) do nothing;

insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "public read site assets" on storage.objects;
create policy "public read site assets" on storage.objects for select using (bucket_id = 'site-assets');
drop policy if exists "admin upload site assets" on storage.objects;
create policy "admin upload site assets" on storage.objects for insert to authenticated with check (bucket_id = 'site-assets' and public.is_admin());
drop policy if exists "admin update site assets" on storage.objects;
create policy "admin update site assets" on storage.objects for update to authenticated using (bucket_id = 'site-assets' and public.is_admin()) with check (bucket_id = 'site-assets' and public.is_admin());
drop policy if exists "admin delete site assets" on storage.objects;
create policy "admin delete site assets" on storage.objects for delete to authenticated using (bucket_id = 'site-assets' and public.is_admin());

alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles enable row level security;
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() = old.id and not public.is_admin() and new.role is distinct from old.role then
    raise exception 'غير مسموح بتغيير صلاحية الحساب';
  end if;
  return new;
end;
$$;
drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role before update on public.profiles for each row execute function public.protect_profile_role();

drop policy if exists "authenticated upload own avatar" on storage.objects;
create policy "authenticated upload own avatar" on storage.objects for insert to authenticated
with check (bucket_id='site-assets' and name like 'avatars/' || auth.uid()::text || '-%');
drop policy if exists "authenticated update own avatar" on storage.objects;
create policy "authenticated update own avatar" on storage.objects for update to authenticated
using (bucket_id='site-assets' and name like 'avatars/' || auth.uid()::text || '-%')
with check (bucket_id='site-assets' and name like 'avatars/' || auth.uid()::text || '-%');
drop policy if exists "authenticated delete own avatar" on storage.objects;
create policy "authenticated delete own avatar" on storage.objects for delete to authenticated
using (bucket_id='site-assets' and name like 'avatars/' || auth.uid()::text || '-%');

create or replace function public.admin_student_monitor()
returns table (
  user_id uuid, full_name text, role text, created_at timestamptz,
  completed_lessons bigint, last_completed_at timestamptz,
  started_courses bigint, completion_percent numeric
)
language sql stable security definer set search_path=public as $$
  select p.id, p.full_name, p.role, p.created_at,
    count(distinct pr.lesson_id), max(pr.completed_at),
    count(distinct l.course_id) filter (where pr.lesson_id is not null),
    case
      when coalesce((select count(*) from public.lessons l2 join public.courses c2 on c2.id=l2.course_id where c2.published=true),0)=0 then 0
      else round((count(distinct pr.lesson_id)::numeric / (select count(*) from public.lessons l2 join public.courses c2 on c2.id=l2.course_id where c2.published=true)::numeric)*100,0)
    end
  from public.profiles p
  left join public.progress pr on pr.user_id=p.id
  left join public.lessons l on l.id=pr.lesson_id
  where p.role='student' and public.is_admin()
  group by p.id,p.full_name,p.role,p.created_at
  order by p.created_at desc;
$$;
revoke all on function public.admin_student_monitor() from public;
grant execute on function public.admin_student_monitor() to authenticated;


-- Protect the educational catalog from anonymous visitors. Marketing/site settings remain public.
drop policy if exists "public read categories" on public.categories;
create policy "authenticated read categories" on public.categories
for select to authenticated using (true);

drop policy if exists "public read published courses" on public.courses;
create policy "authenticated read published courses" on public.courses
for select to authenticated using (published=true or public.is_admin());

drop policy if exists "public read published lessons" on public.lessons;
create policy "authenticated read published lessons" on public.lessons
for select to authenticated using (exists(select 1 from public.courses c where c.id=course_id and (c.published=true or public.is_admin())));
