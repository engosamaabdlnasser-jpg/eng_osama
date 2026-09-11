-- ENG OSAMA V8
-- Admin can view student profiles, but cannot directly edit student profile data.
-- Role changes remain available through a dedicated admin-only RPC.

alter table public.profiles add column if not exists bio text;

-- Only the account owner can update their own profile fields.
drop policy if exists "profiles self update" on public.profiles;
drop policy if exists "admin profiles manage" on public.profiles;
create policy "profiles self update" on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create or replace function public.admin_set_user_role(target_user_id uuid, new_role text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles;
begin
  if not public.is_admin() then
    raise exception 'غير مسموح';
  end if;
  if new_role not in ('student','admin') then
    raise exception 'صلاحية غير صالحة';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'لا يمكن تغيير صلاحية حسابك من هنا';
  end if;
  update public.profiles
  set role = new_role
  where id = target_user_id
  returning * into updated_profile;
  if updated_profile.id is null then
    raise exception 'المستخدم غير موجود';
  end if;
  return updated_profile;
end;
$$;

revoke all on function public.admin_set_user_role(uuid,text) from public;
grant execute on function public.admin_set_user_role(uuid,text) to authenticated;

-- Refresh the admin profile reader so it includes the optional bio.
create or replace function public.admin_student_profile(target_user_id uuid)
returns table (
  user_id uuid,
  email text,
  full_name text,
  phone text,
  age smallint,
  bio text,
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
    p.bio,
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
