-- ENG OSAMA V7: profile onboarding + admin read-only student details
-- Run once in Supabase SQL Editor.

alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists age smallint;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists profile_setup_completed boolean not null default false;

-- Existing accounts created before this onboarding flow should not be interrupted.
-- New accounts keep the default false and will see the optional setup once.
update public.profiles
set profile_setup_completed = true
where profile_setup_completed = false
  and created_at < now();

alter table public.profiles drop constraint if exists profiles_age_check;
alter table public.profiles add constraint profiles_age_check
  check (age is null or (age between 5 and 100));

alter table public.profiles enable row level security;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
for update to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

-- Admin-only read of a student's profile + Auth email + learning summary.
-- Passwords are intentionally never selected or returned.
create or replace function public.admin_student_profile(target_user_id uuid)
returns table (
  user_id uuid,
  email text,
  full_name text,
  phone text,
  age smallint,
  avatar_url text,
  role text,
  created_at timestamptz,
  completed_lessons bigint,
  started_courses bigint,
  completion_percent numeric,
  last_completed_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  total_lessons bigint;
begin
  if not public.is_admin() then
    raise exception 'غير مسموح';
  end if;

  select count(*) into total_lessons
  from public.lessons l
  join public.courses c on c.id = l.course_id
  where c.published = true;

  return query
  select
    p.id,
    u.email::text,
    p.full_name,
    p.phone,
    p.age,
    p.avatar_url,
    p.role,
    p.created_at,
    (select count(*) from public.progress pr where pr.user_id = p.id),
    (select count(distinct l.course_id)
       from public.progress pr
       join public.lessons l on l.id = pr.lesson_id
       where pr.user_id = p.id),
    case
      when total_lessons = 0 then 0::numeric
      else round(((select count(*) from public.progress pr where pr.user_id = p.id)::numeric / total_lessons::numeric) * 100, 0)
    end,
    (select max(pr.completed_at) from public.progress pr where pr.user_id = p.id)
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = target_user_id;
end;
$$;

revoke all on function public.admin_student_profile(uuid) from public;
grant execute on function public.admin_student_profile(uuid) to authenticated;

insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "public read site assets" on storage.objects;
create policy "public read site assets" on storage.objects
for select using (bucket_id = 'site-assets');

-- Ensure the existing avatar upload rule remains compatible with the current path.
drop policy if exists "authenticated upload own avatar" on storage.objects;
create policy "authenticated upload own avatar" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'site-assets'
  and name like 'avatars/' || auth.uid()::text || '-%'
);
