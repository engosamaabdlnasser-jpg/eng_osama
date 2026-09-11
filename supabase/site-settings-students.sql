-- ENG OSAMA: site settings + logo storage + student monitoring
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
  'brand_name','ENG OSAMA',
  'logo_url','/logo.png',
  'hero_badge','منصة تعليمية مجانية',
  'hero_title','اتعلم مهارات جديدة بخطوات واضحة.',
  'hero_description','كورسات مرتبة، دروس عملية، وتجربة تعلم هادئة تساعدك تبدأ وتكمل بدون تعقيد.',
  'primary_cta_label','استكشف الكورسات',
  'secondary_cta_label','تصفح التصنيفات',
  'featured_title','أحدث الكورسات',
  'featured_description','محتوى مرتب لتبدأ مباشرة.',
  'categories_title','التصنيفات',
  'categories_description','اختر المجال الذي تريد تطويره.',
  'footer_text','تعلم مجانًا، بخطوات واضحة.',
  'announcement','',
  'show_categories',true,
  'show_featured',true,
  'extra_sections','[]'::jsonb
))
on conflict(id) do nothing;

-- Storage bucket for admin-uploaded site assets.
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

create or replace function public.admin_student_monitor()
returns table (
  user_id uuid,
  full_name text,
  role text,
  created_at timestamptz,
  completed_lessons bigint,
  last_completed_at timestamptz,
  started_courses bigint,
  completion_percent numeric
)
language sql
stable
security definer
set search_path=public
as $$
  select
    p.id as user_id,
    p.full_name,
    p.role,
    p.created_at,
    count(distinct pr.lesson_id) as completed_lessons,
    max(pr.completed_at) as last_completed_at,
    count(distinct l.course_id) filter (where pr.lesson_id is not null) as started_courses,
    case
      when coalesce((select count(*) from public.lessons),0) = 0 then 0
      else round((count(distinct pr.lesson_id)::numeric / (select count(*) from public.lessons)::numeric) * 100, 0)
    end as completion_percent
  from public.profiles p
  left join public.progress pr on pr.user_id = p.id
  left join public.lessons l on l.id = pr.lesson_id
  where public.is_admin()
  group by p.id, p.full_name, p.role, p.created_at
  order by p.created_at desc;
$$;

revoke all on function public.admin_student_monitor() from public;
grant execute on function public.admin_student_monitor() to authenticated;
